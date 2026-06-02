// screens/Login.js
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Animated, StatusBar, SafeAreaView, ScrollView,
  KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path, Circle, Defs, RadialGradient, Stop,
  LinearGradient as SvgLinearGradient, Ellipse,
  G,
} from 'react-native-svg';
import { getUser, setLoggedIn } from '../utils/storage';
import { useGoogleAuth, GOOGLE_READY, completeGoogleProfile } from '../utils/googleAuth';
import GoogleProfileSetup from './GoogleProfileSetup';

const { width, height } = Dimensions.get('window');

// ─── Official Google "G" logo vector ──────────────────────────────────────────
function GoogleLogo({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </Svg>
  );
}

// ─── 3D Glowing Ambient Particles ─────────────────────────────────────────────
function FloatingParticle({ x, y, size, delay, duration }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.5)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.6, duration: duration * 0.3, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.2, duration: duration * 0.3, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -30, duration: duration, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: duration * 0.7, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.3, duration: duration * 0.7, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ scale }, { translateY }],
        },
      ]}
    />
  );
}

// ─── Multi-Layered Rotating 3D Wave Logo Core ──────────────────────────────────
function MiniWaveMark() {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.15, duration: 250, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 0.98, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(1000),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 18000, useNativeDriver: true })
    ).start();
  }, []);

  const rotateCW = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const floatY   = floatAnim;

  return (
    <View style={styles.waveMarkWrap}>
      {/* Speckular Ambient Core */}
      <View style={styles.waveGlow3D} />

      {/* Orbit Dash Ring */}
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', transform: [{ rotate: rotateCW }] }]}>
        <Svg height={130} width={130} viewBox="0 0 130 130">
          <Circle
            cx="65" cy="65" r="56"
            fill="none"
            stroke="rgba(255, 77, 109, 0.18)"
            strokeWidth="1.2"
            strokeDasharray="4 8"
          />
        </Svg>
      </Animated.View>

      {/* Primary SVG Vector Core */}
      <Animated.View style={{ transform: [{ translateY: floatY }, { scale: pulseScale }] }}>
        <Svg height={90} width={90} viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="miniWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.3" />
              <Stop offset="50%" stopColor="#ff758f" stopOpacity="1" />
              <Stop offset="100%" stopColor="#c9184a" stopOpacity="0.3" />
            </SvgLinearGradient>
            <RadialGradient id="miniSphereGlow" cx="45%" cy="40%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <Stop offset="50%" stopColor="#ff4d6d" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#a4133c" stopOpacity="1" />
            </RadialGradient>
          </Defs>

          <Path
            d="M 15,50 Q 32,25 50,50 T 85,50"
            fill="none"
            stroke="url(#miniWaveGrad)"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <Path
            d="M 15,57 Q 32,80 50,57 T 85,57"
            fill="none"
            stroke="#ff758f"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            strokeLinecap="round"
            opacity="0.4"
          />

          <Circle cx="15" cy="50" r="2.5" fill="#ff4d6d" opacity="0.5" />
          <Circle cx="85" cy="50" r="2.5" fill="#c9184a" opacity="0.5" />

          {/* Floating Heart Core */}
          <G transform="translate(38, 38) scale(0.24)">
            <Path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="url(#miniSphereGlow)"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Eye Vector (Show/Hide Password) ──────────────────────────────────────────
function EyeIcon({ open, size = 20, color = 'rgba(255,255,255,0.45)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="1.6" />
      {!open && <Path d="M3 3l18 18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />}
    </Svg>
  );
}

// ─── 3D Specular Interactive Input Field ──────────────────────────────────────
function FocusInput({ icon, label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, delay = 0, error }) {
  const [hidden, setHidden] = useState(true);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const labelAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const fadeIn     = useRef(new Animated.Value(0)).current;
  const slideIn    = useRef(new Animated.Value(16)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(errorShake, { toValue: 8,  duration: 50, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: 4,  duration: 50, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: 0,  duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  const onFocus = () => {
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(labelAnim,  { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.spring(scaleAnim,  { toValue: 1.015, friction: 6, useNativeDriver: true }),
    ]).start();
  };

  const onBlur = () => {
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(labelAnim,  { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.spring(scaleAnim,  { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)',
      error ? 'rgba(239,68,68,0.7)' : 'rgba(255,77,109,0.5)',
    ],
  });
  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.3)', error ? '#ef4444' : '#ff4d6d'],
  });

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideIn }, { translateX: errorShake }, { scale: scaleAnim }], marginBottom: error ? 4 : 16 }}>
      <Animated.Text style={[styles.fieldLabel, { color: labelColor }]}>{label}</Animated.Text>
      <Animated.View style={[styles.inputRow, { borderColor }]}>
        <Text style={styles.inputIcon}>{icon}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.18)"
          secureTextEntry={secureTextEntry ? hidden : false}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          autoCorrect={false}
          spellCheck={false}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setHidden(h => !h)} style={styles.eyeBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <EyeIcon open={!hidden} color={error ? '#ef4444' : 'rgba(255,255,255,0.45)'} />
          </TouchableOpacity>
        ) : value.length > 0 && !error ? (
          <View style={styles.checkBadge}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        ) : error ? (
          <View style={[styles.checkBadge, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
            <Text style={[styles.checkMark, { color: '#ef4444' }]}>!</Text>
          </View>
        ) : null}
      </Animated.View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </Animated.View>
  );
}

// ─── Spring Interactive Interactive Button Wrapper ───────────────────────────
function SpringButton({ onPress, style, children, disabled }) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const onIn = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: 0.96,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const onOut = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      activeOpacity={1}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: pressScale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Login Screen Component ─────────────────────────────────────────────
export default function Login({ onNavigate }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleSetup, setGoogleSetup] = useState(null);
  const [errors,   setErrors]   = useState({});

  // Google SSO Handler
  const { promptAsync: googlePrompt } = useGoogleAuth(
    (gUser) => {
      setGoogleBusy(false);
      if (gUser.needsSetup) setGoogleSetup({ name: gUser.name, email: gUser.email });
      else onNavigate('userhome', { name: gUser.name, gender: gUser.gender, email: gUser.email });
    },
    (msg)   => { setGoogleBusy(false); setErrors({ general: msg }); }
  );

  const handleGoogle = () => {
    if (!GOOGLE_READY) {
      setErrors({ general: 'google sign-in not configured yet — add your client ids in utils/googleAuth.js' });
      return;
    }
    setErrors({});
    setGoogleBusy(true);
    googlePrompt();
  };

  const handleGoogleComplete = async (chosenName, chosenGender, birthday) => {
    const merged = await completeGoogleProfile(chosenName, chosenGender, birthday);
    setGoogleSetup(null);
    onNavigate('userhome', { name: chosenName, gender: chosenGender, email: merged?.email || googleSetup?.email || '' });
  };

  // Entrance animations configuration
  const fadeHeader  = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-16)).current;
  const fadeCard    = useRef(new Animated.Value(0)).current;
  const slideCard   = useRef(new Animated.Value(24)).current;
  const fadeFooter  = useRef(new Animated.Value(0)).current;
  const shimmer     = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.stagger(110, [
      Animated.parallel([
        Animated.timing(fadeHeader,  { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(slideHeader, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeCard,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideCard, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(fadeFooter, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.delay(2000),
      Animated.timing(shimmer, { toValue: 1,  duration: 1000, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: -1, duration: 0,   useNativeDriver: true }),
    ])).start();
  }, []);

  const shimmerX = shimmer.interpolate({ inputRange: [-1, 1], outputRange: [-width, width] });
  const isReady  = email.includes('@') && password.length >= 6;
  const clearError = (field) => setErrors(prev => ({ ...prev, [field]: undefined, general: undefined }));

  const handleLogin = async () => {
    if (!isReady) return;
    setLoading(true);
    setErrors({});

    try {
      const user = await getUser();

      if (!user) {
        setErrors({ general: 'no account found. please register first.' });
        setLoading(false);
        return;
      }

      if (user.email !== email.toLowerCase().trim()) {
        setErrors({ email: 'no account found with this email' });
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setErrors({ password: 'incorrect password' });
        setLoading(false);
        return;
      }

      await setLoggedIn(true);
      setTimeout(() => {
        setLoading(false);
        onNavigate('userhome', { name: user.name, gender: user.gender, email: user.email });
      }, 400);

    } catch (err) {
      setLoading(false);
      setErrors({ general: 'something went wrong. please try again.' });
    }
  };

  const particleSpecs = [
    { x: 30, y: height * 0.1, size: 4, delay: 0, duration: 2800 },
    { x: width - 44, y: height * 0.16, size: 5, delay: 500, duration: 2400 },
    { x: 55, y: height * 0.72, size: 3, delay: 1000, duration: 3200 },
    { x: width - 40, y: height * 0.62, size: 4, delay: 200, duration: 2600 },
    { x: width * 0.48, y: height * 0.08, size: 3, delay: 700, duration: 3000 },
    { x: 20, y: height * 0.42, size: 3, delay: 1400, duration: 2200 },
    { x: width - 30, y: height * 0.38, size: 4, delay: 100, duration: 3400 },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Layered Deep Ambient Radial Glows */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg height={height} width={width} style={styles.ambientCanvas}>
          <Defs>
            <RadialGradient id="loginRoseGlow3D" cx="50%" cy="26%" rx="55%" ry="55%">
              <Stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.12" />
              <Stop offset="60%" stopColor="#c9184a" stopOpacity="0.02" />
              <Stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={width / 2} cy={height * 0.24} r={width * 0.85} fill="url(#loginRoseGlow3D)" />
        </Svg>
      </View>

      {/* Dynamic Floating Sparkles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particleSpecs.map((p, i) => <FloatingParticle key={i} {...p} />)}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Navigation Row */}
          <Animated.View style={[styles.topRow, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
            <TouchableOpacity onPress={() => onNavigate('landing')} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.topWordmark}>lovemate</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Hero Section */}
          <Animated.View style={[styles.heroBlock, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
            <MiniWaveMark />
            <Text style={styles.titleText}>welcome{'\n'}<Text style={styles.titleAccent}>back</Text></Text>
            <Text style={styles.subtitleText}>sign in to your shared sanctuary</Text>
          </Animated.View>

          {/* 3D Glassmorphic Form Card */}
          <Animated.View style={[styles.glassCard, { opacity: fadeCard, transform: [{ translateY: slideCard }] }]}>

            {/* General error banner */}
            {errors.general && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠  {errors.general}</Text>
                {errors.general.includes('register') && (
                  <TouchableOpacity onPress={() => onNavigate('register')} style={styles.errorBannerAction}>
                    <Text style={styles.errorBannerActionText}>register now →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <FocusInput
              icon="✉️" label="email address" value={email}
              onChangeText={(t) => { setEmail(t); clearError('email'); }}
              placeholder="your@email.com" keyboardType="email-address"
              autoCapitalize="none" delay={180} error={errors.email}
            />
            <FocusInput
              icon="🔒" label="password" value={password}
              onChangeText={(t) => { setPassword(t); clearError('password'); }}
              placeholder="your password" secureTextEntry
              delay={280} error={errors.password}
            />

            <TouchableOpacity style={styles.forgotRow} activeOpacity={0.6}>
              <Text style={styles.forgotText}>forgot password?</Text>
            </TouchableOpacity>

            <SpringButton
              onPress={handleLogin}
              disabled={!isReady || loading}
              style={[styles.loginBtnOuter, (!isReady || loading) && { opacity: 0.45 }]}
            >
              <LinearGradient colors={['#ffffff', '#f2f2f2', '#e6e6e6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtnInner}>
                {loading ? (
                  <Text style={styles.loginBtnText}>signing in...</Text>
                ) : (
                  <Text style={styles.loginBtnText}>sign in</Text>
                )}
                <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />
              </LinearGradient>
            </SpringButton>

            {Platform.OS !== 'ios' && (
              <>
                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>or continue with</Text>
                  <View style={styles.orLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleBtn}
                  activeOpacity={0.85}
                  onPress={handleGoogle}
                  disabled={googleBusy}
                >
                  <GoogleLogo size={20} />
                  <Text style={styles.googleBtnText}>
                    {googleBusy ? 'signing in…' : 'continue with google'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* Account Register Action Link */}
          <Animated.View style={[styles.registerLinkRow, { opacity: fadeFooter }]}>
            <Text style={styles.registerLinkText}>don't have an account? </Text>
            <TouchableOpacity onPress={() => onNavigate('register')} activeOpacity={0.7}>
              <Text style={styles.registerLinkAction}>create one →</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Elegant Footer Details */}
          <Animated.View style={[styles.footerBlock, { opacity: fadeFooter }]}>
            <View style={styles.footerLine} />
            <Text style={styles.footerLabel}>designed for two</Text>
            <View style={styles.footerLine} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Sign-in Multi-step Setup Profile Modal */}
      <GoogleProfileSetup
        visible={!!googleSetup}
        defaultName={googleSetup?.name || ''}
        onComplete={handleGoogleComplete}
        onCancel={() => setGoogleSetup(null)}
      />
    </SafeAreaView>
  );
}

// ─── Harmonized Design System & Styles ────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 40,
  },
  ambientCanvas: {
    position: 'absolute',
    top: 0,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#ff4d6d',
    shadowColor: '#ff4d6d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },

  // ── Navigation Header Row
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  backArrow: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
  },
  topWordmark: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 3.5,
    textTransform: 'lowercase',
  },

  // ── Brand Core / Wave Mark
  heroBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  waveMarkWrap: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  waveGlow3D: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff4d6d',
    opacity: 0.07,
    shadowColor: '#ff4d6d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
  },
  titleText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.2,
    textTransform: 'lowercase',
    lineHeight: 44,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 77, 109, 0.22)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
    marginBottom: 8,
  },
  titleAccent: { color: '#ff4d6d' },
  subtitleText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.32)',
    letterSpacing: 1.2,
    textTransform: 'lowercase',
    fontStyle: 'italic',
  },

  // ── 3D Glassmorphism Card
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },

  // ── Specular Input Fields
  fieldLabel: {
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'lowercase',
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  inputIcon: {
    fontSize: 17,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    fontSize: 16.5,
    color: '#ffffff',
    fontWeight: '400',
    paddingVertical: 0,
    letterSpacing: 0.2,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 77, 109, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 12,
    color: '#ff4d6d',
    fontWeight: '700',
  },
  eyeBtn: { padding: 4 },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.3,
  },

  // ── Custom Banners & Links
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  errorBannerAction: { alignSelf: 'flex-start' },
  errorBannerActionText: {
    fontSize: 12,
    color: '#ff4d6d',
    fontWeight: '700',
    textTransform: 'lowercase',
  },

  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 12,
    color: 'rgba(255, 77, 109, 0.75)',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
    fontWeight: '600',
  },

  // ── elevated CTA buttons
  loginBtnOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#ff4d6d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  loginBtnInner: {
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  loginBtnText: {
    color: '#0a0a0a',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    transform: [{ skewX: '-22deg' }],
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  orText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.22)',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
    fontWeight: '600',
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  googleBtnText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '700',
    textTransform: 'lowercase',
    letterSpacing: 0.3,
  },

  registerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  registerLinkText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.35)',
    textTransform: 'lowercase',
    fontWeight: '600',
  },
  registerLinkAction: {
    fontSize: 13,
    color: '#ff4d6d',
    fontWeight: '800',
    textTransform: 'lowercase',
  },

  // ── Footer
  footerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLine: {
    width: 24,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginHorizontal: 12,
  },
  footerLabel: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'lowercase',
    fontWeight: '600',
  },
});