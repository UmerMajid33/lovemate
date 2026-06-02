import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, Text, Platform, LogBox, Animated } from 'react-native';

// Web has no native animation module. Rather than hide the warning, force every
// animation to JS-driven on web (so `useNativeDriver: true` is overridden to false
// at the source). Native phones are untouched and keep the performant native driver.
if (Platform.OS === 'web') {
  ['timing', 'spring', 'decay'].forEach((fn) => {
    const orig = Animated[fn];
    if (typeof orig === 'function') {
      Animated[fn] = (value, config = {}) => orig(value, { ...config, useNativeDriver: false });
    }
  });

  // react-native-web emits dev-only deprecation warnings for style props that are
  // still the correct cross-platform RN props on iOS/Android (shadow*, textShadow*,
  // pointerEvents). They don't affect behavior or production. Silence just these.
  if (typeof console !== 'undefined') {
    const NOISE = ['useNativeDriver', '"textShadow', '"shadow', 'pointerEvents is deprecated', 'props.pointerEvents'];
    const wrap = (orig) => (...args) => {
      if (typeof args[0] === 'string' && NOISE.some((n) => args[0].includes(n))) return;
      return orig.apply(console, args);
    };
    if (console.warn)  console.warn  = wrap(console.warn);
    if (console.error) console.error = wrap(console.error);
  }
}
try { LogBox.ignoreLogs(['useNativeDriver', 'textShadow', 'shadow', 'pointerEvents']); } catch (_) {}
import Landing from './screens/landing.js';
import Login from './screens/login.js';
import Register from './screens/register.js';
import UserHome from './screens/userhome.js';
import Castle from './screens/castle.js';
import Feed        from './screens/feed.js';
import Games       from './screens/games.js';
import Shop        from './screens/shop.js';
import HomeProfile from './screens/homeprofile.js';
import { getHome, getUser, isLoggedIn } from './utils/storage.js';
import { API_BASE } from './utils/api.js';
import BootLoader from './components/BootLoader.js';
import Countdown from './screens/countdown.js';
import Diary from './screens/diary.js';
import Explore from './screens/explore.js';
import Profile from './screens/profile.js';
import Quiz from './screens/quiz.js';
import BottomNav from './components/BottomNav.js';

export default function App() {
  // Simple state router: can be 'loading', 'landing', 'login', 'register', 'userhome', or 'castle'
  const [currentScreen, setCurrentScreen] = useState('loading');

  // Clean initialization of our user profile session layer
  const [sessionUser, setSessionUser] = useState({
    name: '',
    gender: '',
    email: '',
  });

  // Castle params — role, homeName, linkCode passed from UserHome on navigate
  const [castleParams, setCastleParams] = useState({});

  // Boot-time backend wake (cold Render instances take ~30-60s to spin up).
  const [slowBoot, setSlowBoot] = useState(false);

  // Ping the health endpoint until the backend answers (or we give up).
  async function warmUp() {
    const start = Date.now();
    const slowTimer = setTimeout(() => setSlowBoot(true), 6000);
    while (Date.now() - start < 90000) {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(`${API_BASE}/api/health`, { signal: ctrl.signal });
        clearTimeout(to);
        if (res.ok) break;
      } catch (_) {}
      await new Promise(r => setTimeout(r, 2500));
    }
    clearTimeout(slowTimer);
  }

  // ── Auto-login: only restore a session when the user is still logged in ───
  useEffect(() => {
    async function restoreSession() {
      try {
        await warmUp(); // hold on the boot loader until the server is awake
        const loggedIn = await isLoggedIn();
        if (!loggedIn) { setCurrentScreen('landing'); return; }

        const [savedHome, savedUser] = await Promise.all([getHome(), getUser()]);
        const user = savedUser
          ? { name: savedUser.name || '', gender: savedUser.gender || '', email: savedUser.email || '' }
          : { name: '', gender: '', email: '' };
        setSessionUser(user);

        if (savedHome) {
          setCastleParams({ ...savedHome, user });
          setCurrentScreen('castle');
        } else {
          // Logged in but no home yet → land in the home setup screen
          setCurrentScreen('userhome');
        }
      } catch (_) {
        setCurrentScreen('landing');
      }
    }
    restoreSession();
  }, []);

  const CASTLE_ROOTED = ['castle', 'feed', 'games', 'shop', 'homeprofile', 'countdown', 'diary', 'quiz'];
  // Footer (home · explore · profile) shows on the single-user shell AND on the
  // in-home pages — but NOT on games (it has its own bottom mode bar).
  const TABBED = ['userhome', 'explore', 'profile', 'castle', 'feed', 'shop', 'homeprofile', 'countdown', 'diary'];
  const handleNavigate = (targetScreen, userData = null) => {
    if (CASTLE_ROOTED.includes(targetScreen) && userData) {
      setCastleParams(userData);
    } else if (userData) {
      setSessionUser({
        name: userData.name || '',
        gender: userData.gender || '',
        email: userData.email || '',
      });
    }
    setCurrentScreen(targetScreen);
  };

  // Boot screen while we wake the backend + restore the session.
  if (currentScreen === 'loading') {
    return <BootLoader slow={slowBoot} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {currentScreen === 'landing'  && <Landing  onNavigate={handleNavigate} />}
      {currentScreen === 'login'    && <Login    onNavigate={handleNavigate} />}
      {currentScreen === 'register' && <Register onNavigate={handleNavigate} />}

      {/* 🏰 Protected sanctuary cockpit rendering with fully loaded dynamic profile */}
      {currentScreen === 'userhome' && (
        <UserHome onNavigate={handleNavigate} user={sessionUser} />
      )}

      {currentScreen === 'castle' && (
        <Castle onNavigate={handleNavigate} params={castleParams} />
      )}

      {currentScreen === 'feed' && (
        <Feed onNavigate={handleNavigate} params={castleParams} />
      )}
      {currentScreen === 'games' && (
        <Games onNavigate={handleNavigate} params={castleParams} />
      )}
      {currentScreen === 'shop' && (
        <Shop onNavigate={handleNavigate} params={castleParams} />
      )}
      {currentScreen === 'homeprofile' && (
        <HomeProfile onNavigate={handleNavigate} params={castleParams} />
      )}
      {currentScreen === 'countdown' && (
        <Countdown onNavigate={handleNavigate} params={castleParams} />
      )}
      {currentScreen === 'diary' && (
        <Diary onNavigate={handleNavigate} params={castleParams} />
      )}
      {currentScreen === 'explore' && (
        <Explore onNavigate={handleNavigate} user={sessionUser} />
      )}
      {currentScreen === 'profile' && (
        <Profile onNavigate={handleNavigate} user={sessionUser} />
      )}
      {currentScreen === 'quiz' && (
        <Quiz onNavigate={handleNavigate} params={castleParams} />
      )}

      {/* Single-user footer tab bar: home · explore · profile */}
      {TABBED.includes(currentScreen) && (
        <BottomNav current={currentScreen} onNavigate={handleNavigate} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});