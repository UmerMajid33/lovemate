// screens/UserHome.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Animated, StatusBar, SafeAreaView, ScrollView, TextInput,
  Clipboard, Easing, ActivityIndicator, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle, Ellipse, RadialGradient, Stop, Defs,
  Path, LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import { getHomes, saveHome, removeHome, MAX_HOMES, getUser, setLoggedIn } from '../utils/storage';
import { API_BASE } from '../utils/api';
import { colors as TC, fonts as TF } from '../theme/theme.js';
import SpaceBackground from '../theme/SpaceBackground.js';

const { width, height } = Dimensions.get('window');

// ─── Floating orb ─────────────────────────────────────────────────────────────
function FloatingOrb({ x, y, size, delay, color = '#E0506E' }) {
  const floatY  = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    ]).start(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(floatY, { toValue: -12, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 4,   duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: 0.15, duration: 1800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4,  duration: 1800, useNativeDriver: true }),
      ])).start();
    });
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity,
      transform: [{ translateY: floatY }, { scale }],
      shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: size,
    }} />
  );
}

// ─── Castle SVG ───────────────────────────────────────────────────────────────
function CastleSvg({ animate }) {
  const glow   = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.loop(Animated.sequence([
      Animated.timing(floatY, { toValue: -6, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(floatY, { toValue:  0, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1500, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 1500, useNativeDriver: false }),
    ])).start();
  }, [animate]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] });

  return (
    <Animated.View style={{ transform: [{ translateY: floatY }], alignItems: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 160, height: 160, borderRadius: 80,
        backgroundColor: '#E0506E', opacity: glowOpacity,
        top: 20, alignSelf: 'center',
        shadowColor: '#E0506E', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40,
      }} />
      <Svg width={180} height={160} viewBox="0 0 180 160">
        <Defs>
          <SvgLinearGradient id="castleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%"   stopColor="#ff758f" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#c9184a" stopOpacity="0.7" />
          </SvgLinearGradient>
          <SvgLinearGradient id="towerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%"   stopColor="#E0506E" stopOpacity="1" />
            <Stop offset="100%" stopColor="#a4133c" stopOpacity="0.8" />
          </SvgLinearGradient>
          <RadialGradient id="windowGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%"   stopColor="#ffd6e0" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#E0506E" stopOpacity="0.3" />
          </RadialGradient>
        </Defs>
        <Path d="M30,130 L30,75 L150,75 L150,130 Z" fill="url(#castleGrad)" />
        {[35, 52, 69, 86, 103, 120, 137].map((x, i) => (
          <Path key={i} d={`M${x},75 L${x},62 L${x+9},62 L${x+9},75`} fill="url(#castleGrad)" />
        ))}
        <Path d="M18,130 L18,55 L52,55 L52,130 Z" fill="url(#towerGrad)" />
        {[20, 30, 40].map((x, i) => (
          <Path key={i} d={`M${x},55 L${x},42 L${x+8},42 L${x+8},55`} fill="url(#towerGrad)" />
        ))}
        <Path d="M128,130 L128,55 L162,55 L162,130 Z" fill="url(#towerGrad)" />
        {[130, 140, 150].map((x, i) => (
          <Path key={i} d={`M${x},55 L${x},42 L${x+8},42 L${x+8},55`} fill="url(#towerGrad)" />
        ))}
        <Path d="M72,130 L72,40 L108,40 L108,130 Z" fill="#E0506E" opacity="0.95" />
        {[74, 84, 96].map((x, i) => (
          <Path key={i} d={`M${x},40 L${x},26 L${x+8},26 L${x+8},40`} fill="#E0506E" />
        ))}
        <Path d="M90,10 L78,30 L102,30 Z" fill="#ff758f" />
        <Path d="M78,130 L78,100 Q90,88 102,100 L102,130 Z" fill="#0a0a0a" opacity="0.7" />
        <Circle cx="35"  cy="95"  r="7" fill="url(#windowGlow)" opacity="0.8" />
        <Circle cx="145" cy="95"  r="7" fill="url(#windowGlow)" opacity="0.8" />
        <Circle cx="90"  cy="68"  r="6" fill="url(#windowGlow)" opacity="0.9" />
        <Circle cx="30"  cy="80"  r="4" fill="url(#windowGlow)" opacity="0.6" />
        <Circle cx="150" cy="80"  r="4" fill="url(#windowGlow)" opacity="0.6" />
        <Path d="M90,10 L92,6 Q95,2 98,5 Q101,8 98,12 L90,18 L82,12 Q79,8 82,5 Q85,2 88,6 Z"
          fill="#E0506E" opacity="0.9" />
        <Path d="M10,130 L170,130" stroke="rgba(224,80,110,0.2)" strokeWidth="1.5" />
      </Svg>
    </Animated.View>
  );
}

// ─── Heartbeat ring ───────────────────────────────────────────────────────────
function HeartbeatRing() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (anim, delay) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 600,  useNativeDriver: true }),
      Animated.delay(1400),
    ])).start();
    pulse(ring1, 0);
    pulse(ring2, 500);
  }, []);

  return (
    <View style={{ position: 'absolute', width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      {[ring1, ring2].map((r, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: 220, height: 220, borderRadius: 110,
          borderWidth: 1, borderColor: '#E0506E',
          opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        }} />
      ))}
    </View>
  );
}

// ─── Step bar ─────────────────────────────────────────────────────────────────
function StepBar({ step, total }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{
          height: 3, flex: i === step ? 2 : 1, borderRadius: 2,
          backgroundColor: i <= step ? '#E0506E' : 'rgba(255,255,255,0.12)',
        }} />
      ))}
    </View>
  );
}

// ─── Primary button ───────────────────────────────────────────────────────────
function PrimaryButton({ label, onPress, disabled, icon }) {
  const shimmer   = useRef(new Animated.Value(-1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(2200),
      Animated.timing(shimmer, { toValue: 1,  duration: 800, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: -1, duration: 0,   useNativeDriver: true }),
    ])).start();
  }, []);

  const shimX = shimmer.interpolate({ inputRange: [-1, 1], outputRange: [-width, width] });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={()  => Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressAnim, { toValue: 1,    useNativeDriver: true }).start()}
      activeOpacity={1} disabled={disabled}
      style={[{ width: '100%', borderRadius: 18, overflow: 'hidden' }, disabled && { opacity: 0.38 }]}
    >
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <LinearGradient colors={['#EC7186', TC.accent, '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            shadowColor: TC.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5, textTransform: 'lowercase' }}>
            {icon ? `${icon}  ` : ''}{label}
          </Text>
          <Animated.View style={{
            position: 'absolute', top: 0, bottom: 0, width: 90,
            backgroundColor: 'rgba(255,255,255,0.28)', transform: [{ translateX: shimX }, { skewX: '-18deg' }],
          }} />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Code badge ───────────────────────────────────────────────────────────────
function CodeBadge({ code, onCopy, copied }) {
  const pulse  = useRef(new Animated.Value(1)).current;
  const border = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!code) return;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 180, useNativeDriver: true }),
      Animated.spring(pulse,  { toValue: 1,   useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(border, { toValue: 1, duration: 1200, useNativeDriver: false }),
      Animated.timing(border, { toValue: 0, duration: 1200, useNativeDriver: false }),
    ])).start();
  }, [code]);

  if (!code) return null;

  const borderColor = border.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(224,80,110,0.25)', 'rgba(224,80,110,0.7)'],
  });

  return (
    <Animated.View style={[styles.codeBadge, { borderColor, transform: [{ scale: pulse }] }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.codeLabel}>bond code</Text>
        <Text style={styles.codeValue}>{code}</Text>
      </View>
      <TouchableOpacity onPress={onCopy} style={[styles.copyBtn, copied && styles.copyBtnDone]} activeOpacity={0.75}>
        <Text style={[styles.copyBtnText, copied && { color: '#E0506E' }]}>
          {copied ? '✓ copied' : 'copy'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Avatar mark ──────────────────────────────────────────────────────────────
function AvatarMark({ gender }) {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: -5, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(bounce, { toValue:  2, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])).start();
  }, []);

  const g = (gender || '').toLowerCase();
  const emoji = g === 'male' || g === 'm' ? '👑'
              : g === 'female' || g === 'f' ? '🎀'
              : '✨';

  return (
    <Animated.View style={[styles.avatarWrap, { transform: [{ translateY: bounce }] }]}>
      <LinearGradient colors={[TC.accentDim, 'rgba(224,80,110,0.03)']} style={styles.avatarGrad}>
        <Text style={styles.avatarEmoji}>{emoji}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Existing Home Card ───────────────────────────────────────────────────────
function ExistingHomeCard({ home, onEnter, leaveState, onRequestLeave, onCancelLeave }) {
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;
  const pulse   = useRef(new Animated.Value(1)).current;
  const [copied, setCopied] = useState(false);

  // mutual-leave state for this home: { mineRequested, partnerRequested }
  const mine    = leaveState?.mineRequested;
  const partner = leaveState?.partnerRequested;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // Subtle heartbeat on card
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.008, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,     duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);

  const handleCopy = () => {
    Clipboard.setString(home.linkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const roleIcon  = home.role === 'creator' ? '🏰' : '🔑';
  const roleName  = home.role === 'creator' ? 'founder' : 'partner';
  const createdAt = home.createdAt ? new Date(home.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null;

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideIn }, { scale: pulse }], width: '100%', marginTop: 8, marginBottom: 8 }}>
      <TouchableOpacity onPress={() => onEnter(home)} activeOpacity={0.88} style={styles.homeCard}>
        <LinearGradient
          colors={['rgba(224,80,110,0.10)', 'rgba(224,80,110,0.03)', TC.surface]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.homeCardGrad}
        >
          {/* Top row */}
          <View style={styles.homeCardTop}>
            <View style={styles.homeCardIconWrap}>
              <LinearGradient colors={[TC.accentDim, 'rgba(224,80,110,0.04)']} style={styles.homeCardIcon}>
                <Text style={{ fontSize: 28 }}>{roleIcon}</Text>
              </LinearGradient>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.homeCardName} numberOfLines={1}>{home.homeName || 'our sanctuary'}</Text>
              <View style={styles.homeCardMeta}>
                <View style={styles.homeRolePill}>
                  <Text style={styles.homeRolePillText}>{roleName}</Text>
                </View>
                {createdAt && <Text style={styles.homeCardDate}>created {createdAt}</Text>}
              </View>
            </View>
            {/* Live dot */}
            <View style={styles.liveDotWrap}>
              <View style={styles.liveDot} />
              <Text style={styles.liveDotText}>active</Text>
            </View>
          </View>

          {/* Bond code */}
          {home.linkCode && (
            <View style={styles.homeCodeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.homeCodeLabel}>bond code</Text>
                <Text style={styles.homeCodeValue}>{home.linkCode}</Text>
              </View>
              <TouchableOpacity onPress={handleCopy} style={[styles.copyBtn, copied && styles.copyBtnDone]} activeOpacity={0.75}>
                <Text style={[styles.copyBtnText, copied && { color: '#E0506E' }]}>
                  {copied ? '✓ copied' : 'copy'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Enter button */}
          <TouchableOpacity onPress={() => onEnter(home)} style={styles.enterBtn} activeOpacity={0.8}>
            <LinearGradient colors={[TC.accentDim, 'rgba(224,80,110,0.04)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.enterBtnGrad}>
              <Text style={styles.enterBtnText}>enter sanctuary  →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>

      {/* Mutual-leave control — a home only dissolves when both partners agree */}
      {partner && !mine ? (
        // Partner has asked to leave — I can agree to leave together
        <TouchableOpacity onPress={() => onRequestLeave(home)} style={styles.leavePromptRow} activeOpacity={0.8}>
          <Text style={styles.leavePromptText}>
            your partner wants to leave 💔  ·  <Text style={{ color: '#F08FA0', fontWeight: '800' }}>tap to agree & leave</Text>
          </Text>
        </TouchableOpacity>
      ) : mine ? (
        // I've asked to leave — waiting for partner to agree
        <TouchableOpacity onPress={() => onCancelLeave(home)} style={styles.leaveWaitingRow} activeOpacity={0.7}>
          <Text style={styles.leaveWaitingText}>leave requested — waiting for partner to agree</Text>
          <Text style={styles.leaveCancelText}>tap to cancel</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => onRequestLeave(home)} style={styles.dissolveRow} activeOpacity={0.65}>
          <Text style={styles.dissolveText}>request to leave this sanctuary</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Daily love quote card ────────────────────────────────────────────────────
const LOVE_QUOTES = [
  { q: 'in all the world, there is no heart for me like yours.', a: 'maya angelou' },
  { q: 'whatever our souls are made of, his and mine are the same.', a: 'emily brontë' },
  { q: 'i have found the one whom my soul loves.', a: 'song of solomon' },
  { q: 'you are my today and all of my tomorrows.', a: 'leo christopher' },
  { q: 'i love you not only for what you are, but for what i am when i am with you.', a: 'roy croft' },
  { q: 'we loved with a love that was more than love.', a: 'edgar allan poe' },
  { q: 'to love and be loved is to feel the sun from both sides.', a: 'david viscott' },
  { q: 'you are the finest, loveliest, tenderest person i have ever known.', a: 'f. scott fitzgerald' },
  { q: 'i would rather spend one lifetime with you than face all the ages of this world alone.', a: 'tolkien' },
  { q: 'each day i love you more — today more than yesterday, less than tomorrow.', a: 'rosemonde gérard' },
];

function DailyLoveCard() {
  // Seeded by the day so it's stable across the day, then shuffle on tap
  const dayIndex = Math.floor(Date.now() / 86400000) % LOVE_QUOTES.length;
  const [idx, setIdx] = useState(dayIndex);
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 600, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.delay(2600),
      Animated.timing(shimmer, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  const shuffle = () => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    setIdx(i => (i + 1 + Math.floor(Math.random() * (LOVE_QUOTES.length - 1))) % LOVE_QUOTES.length);
  };

  const quote = LOVE_QUOTES[idx];
  const shimX = shimmer.interpolate({ inputRange: [-1, 1], outputRange: [-width, width] });

  return (
    <Animated.View style={{ width: '100%', marginTop: 18, opacity: fade, transform: [{ translateY: slide }] }}>
      <View style={styles.quoteSectionRow}>
        <View style={styles.quoteSectionLine} />
        <Text style={styles.quoteSectionLabel}>✦ today's whisper</Text>
        <View style={styles.quoteSectionLine} />
      </View>
      <TouchableOpacity activeOpacity={0.9} onPress={shuffle}>
        <LinearGradient
          colors={['rgba(224,80,110,0.16)', 'rgba(224,80,110,0.05)', 'rgba(10,10,20,0.96)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.quoteCard}
        >
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.quoteText}>{quote.q}</Text>
          <Text style={styles.quoteAuthor}>— {quote.a}</Text>
          <Text style={styles.quoteTapHint}>tap for another ✦</Text>
          {/* shimmer sweep */}
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', top: 0, bottom: 0, width: 80,
            backgroundColor: 'rgba(255,255,255,0.07)',
            transform: [{ translateX: shimX }, { skewX: '-18deg' }],
          }} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Connection vibe ring ─────────────────────────────────────────────────────
function VibeRing({ linked }) {
  const spin  = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const color = linked ? '#22c55e' : '#E0506E';
  const pct   = linked ? 100 : 50;

  return (
    <Animated.View style={{ alignItems: 'center', justifyContent: 'center', width: 110, height: 110, transform: [{ scale: pulse }] }}>
      <Animated.View style={{ position: 'absolute', transform: [{ rotate: rot }] }}>
        <Svg width={110} height={110} viewBox="0 0 110 110">
          <Circle cx="55" cy="55" r="48" fill="none" stroke={`${color}33`} strokeWidth="3" strokeDasharray="4 8" />
        </Svg>
      </Animated.View>
      <Svg width={92} height={92} viewBox="0 0 92 92" style={{ position: 'absolute' }}>
        <Circle cx="46" cy="46" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <Circle cx="46" cy="46" r="40" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${(pct/100) * 251} 251`} transform="rotate(-90 46 46)" />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill={color} />
        </Svg>
        <Text style={{ fontSize: 11, color, fontWeight: '900', marginTop: 2 }}>{pct}%</Text>
      </View>
    </Animated.View>
  );
}

// ─── Hamburger icon ───────────────────────────────────────────────────────────
function HamburgerIcon({ size = 22, color = 'rgba(255,255,255,0.7)' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 6h18M3 12h18M3 18h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Slide-in side menu (holds the logout button) ─────────────────────────────
function SideMenu({ visible, onClose, user, email, homeCount, onLogout }) {
  const slide = useRef(new Animated.Value(width)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(width); fade.setValue(0);
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: width, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const g = (user.gender || '').toLowerCase();
  const emoji = g === 'male' || g === 'm' ? '👑' : g === 'female' || g === 'f' ? '🎀' : '✨';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.menuOverlay, { opacity: fade }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
        <Animated.View style={[styles.menuPanel, { transform: [{ translateX: slide }] }]}>
          <LinearGradient
            colors={['rgba(20,12,20,0.99)', 'rgba(10,8,16,0.99)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Profile header */}
          <View style={styles.menuProfile}>
            <LinearGradient colors={['rgba(224,80,110,0.25)', 'rgba(224,80,110,0.06)']} style={styles.menuAvatar}>
              <Text style={{ fontSize: 26 }}>{emoji}</Text>
            </LinearGradient>
            <Text style={styles.menuName} numberOfLines={1}>{user.name || 'mate'}</Text>
            {!!email && <Text style={styles.menuEmail} numberOfLines={1}>{email}</Text>}
            <View style={styles.menuHomePill}>
              <Text style={styles.menuHomePillText}>{homeCount} {homeCount === 1 ? 'home' : 'homes'} linked</Text>
            </View>
          </View>

          <View style={styles.menuDivider} />

          {/* Menu items */}
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={close}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M3 11l9-8 9 8M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" stroke="rgba(255,255,255,0.6)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.menuRowText}>my homes</Text>
            </TouchableOpacity>
          </View>

          {/* Logout pinned at the bottom */}
          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={onLogout}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#F08FA0" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.logoutText}>log out</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function UserHome({ onNavigate, user = { name: 'mate', gender: 'unknown' } }) {
  const [mode,          setMode]          = useState('selection'); // selection | build | join
  const [homes,         setHomes]         = useState([]);          // all homes (max MAX_HOMES)
  const [leaveStates,   setLeaveStates]   = useState({});          // linkCode -> { mineRequested, partnerRequested }
  const [loadingHome,   setLoadingHome]   = useState(true);        // initial storage read
  const [menuOpen,      setMenuOpen]      = useState(false);       // hamburger side menu
  const [userEmail,     setUserEmail]     = useState('');          // shown in the menu
  const [homeName,      setHomeName]      = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [inviteCode,    setInviteCode]    = useState('');
  const [copied,        setCopied]        = useState(false);
  const [homeNameFocus, setHomeNameFocus] = useState(false);
  const [joinFocus,     setJoinFocus]     = useState(false);
  const [creatingAnim,  setCreatingAnim]  = useState(false);
  const [joining,       setJoining]       = useState(false);
  const [joinError,     setJoinError]     = useState('');

  // bond codes the user actually tapped "leave" on this session — guards the
  // poll so a stale server leave-flag can never silently remove a home.
  const myLeaveRef = useRef(new Set());

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // ── Load all stored homes on mount ─────────────────────────────────────────
  const refreshHomes = useCallback(async () => {
    try {
      let list = await getHomes();
      // Pull the homes this account belongs to from the server, so a home shows up
      // for BOTH partners on any device — even after a cleared cache or fresh login.
      try {
        const u = await getUser();
        const email = (u?.email || '').toLowerCase();
        if (email) {
          const res = await fetch(`${API_BASE}/api/home/mine/${encodeURIComponent(email)}`);
          if (res.ok) {
            const data = await res.json();
            for (const sh of (data.homes || [])) {
              const exists = list.find(h => (h.linkCode || '').toLowerCase() === (sh.linkCode || '').toLowerCase());
              if (!exists)      await saveHome(sh);                     // missing locally → add it
              else if (exists.homeName !== sh.homeName || exists.role !== sh.role)
                                await saveHome({ ...exists, ...sh });   // keep name/role fresh
            }
            list = await getHomes();
          }
        }
      } catch (_) {}
      setHomes(list);
      return list;
    } catch (_) { return []; }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshHomes();
      try { const u = await getUser(); if (u?.email) setUserEmail(u.email); } catch (_) {}
      setLoadingHome(false);
    })();
  }, []);

  // ── Logout: end the session (keeps the account) and return to landing ──────
  const handleLogout = async () => {
    try { await setLoggedIn(false); } catch (_) {}
    setMenuOpen(false);
    onNavigate('landing');
  };

  // ── Poll each home's mutual-leave status. When both agree, the home leaves. ─
  useEffect(() => {
    if (homes.length === 0) return;

    const check = async () => {
      for (const home of homes) {
        if (!home.linkCode || home.linkCode === '---') continue;
        try {
          const res = await fetch(`${API_BASE}/api/home/leave-status/${home.linkCode}`);
          if (!res.ok) continue;
          const data = await res.json(); // { creator, joiner, bothAgreed }
          // Only dissolve if BOTH agreed AND I actually requested to leave this
          // home in this session — never trust a lingering server flag alone.
          if (data.bothAgreed && myLeaveRef.current.has(home.linkCode)) {
            myLeaveRef.current.delete(home.linkCode);
            try { await fetch(`${API_BASE}/api/home/leave-reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkcode: home.linkCode }) }); } catch (_) {}
            // drop our membership server-side so the home can't resurrect via sync
            try {
              const u = await getUser();
              await fetch(`${API_BASE}/api/home/leave-finalize`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linkcode: home.linkCode, role: home.role, email: u?.email || userEmail || '' }),
              });
            } catch (_) {}
            const next = await removeHome(home.linkCode);
            setHomes(next);
            setLeaveStates(prev => { const n = { ...prev }; delete n[home.linkCode]; return n; });
          } else {
            const mineRequested    = home.role === 'creator' ? data.creator : data.joiner;
            const partnerRequested = home.role === 'creator' ? data.joiner  : data.creator;
            setLeaveStates(prev => ({ ...prev, [home.linkCode]: { mineRequested, partnerRequested } }));
          }
        } catch (_) {}
      }
    };
    check();
    const id = setInterval(check, 8000);
    return () => clearInterval(id);
  }, [homes]);

  // ── Entrance animation on mode change ─────────────────────────────────────
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [mode]);

  // ── Generate invite code ───────────────────────────────────────────────────
  const handleGenerateCode = () => {
    const adj  = ['ROSE', 'STAR', 'MOON', 'SOUL', 'FIRE', 'BLISS', 'BOND', 'DAWN'];
    const noun = ['GATE', 'KEEP', 'LOCK', 'LINK', 'BRIDGE', 'NEST', 'HAVEN'];
    const code = `${adj[Math.floor(Math.random() * adj.length)]}-${noun[Math.floor(Math.random() * noun.length)]}-${Math.random().toString(36).substring(2,5).toUpperCase()}`;
    setGeneratedCode(code);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!generatedCode) return;
    Clipboard.setString(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const canCreateMore = homes.length < MAX_HOMES;

  // ── Create home ────────────────────────────────────────────────────────────
  const handleCreateHome = async () => {
    if (!homeName.trim() || !generatedCode) return;
    if (!canCreateMore) { setMode('selection'); return; }
    setCreatingAnim(true);
    const homeData = {
      role: 'creator',
      homeName: homeName.trim(),
      linkCode: generatedCode,
      createdAt: Date.now(),
    };
    try { await saveHome(homeData); } catch (_) {}
    // Register the home on the server so a partner can actually find + join it.
    // The creator's email claims the first of the home's two member slots.
    try {
      const u = await getUser();
      const myEmail = u?.email || user?.email || userEmail || '';
      await fetch(`${API_BASE}/api/home/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: homeData.linkCode, homename: homeData.homeName, name: user?.name || '', email: myEmail }),
      });
    } catch (_) {}
    // fresh home starts with a clean leave agreement
    try { await fetch(`${API_BASE}/api/home/leave-reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkcode: homeData.linkCode }) }); } catch (_) {}
    myLeaveRef.current.delete(homeData.linkCode);
    await refreshHomes();
    setTimeout(() => {
      setCreatingAnim(false);
      setHomeName(''); setGeneratedCode('');
      setMode('selection');
      onNavigate('castle', { ...homeData, user });
    }, 1000);
  };

  // ── Join home — must match a real home created by a partner ─────────────────
  const handleJoinHome = async () => {
    if (!inviteCode.trim()) return;
    if (!canCreateMore) { setMode('selection'); return; }
    const code = inviteCode.trim().toUpperCase();

    // Block joining your own home
    if (homes.some(h => h.linkCode === code)) {
      setJoinError("you're already in this home");
      return;
    }

    setJoining(true);
    setJoinError('');
    let serverHome = null;
    try {
      const u = await getUser();
      const myEmail = u?.email || user?.email || userEmail || '';
      const res = await fetch(`${API_BASE}/api/home/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: code, name: user?.name || '', email: myEmail }),
      });
      if (res.status === 404) {
        setJoining(false);
        setJoinError('no home found with that bond code — double-check it with your partner');
        return;
      }
      if (res.status === 403) {
        // Home already has its two people — never displace an existing member.
        setJoining(false);
        const d = await res.json().catch(() => ({}));
        setJoinError(d.error || 'this home is already full — it belongs to two people');
        return;
      }
      if (!res.ok) {
        setJoining(false);
        setJoinError('could not reach the server — try again');
        return;
      }
      const data = await res.json();
      serverHome = data.home;
    } catch (_) {
      setJoining(false);
      setJoinError('could not reach the server — is it running?');
      return;
    }

    const homeData = {
      role: 'joiner',
      homeName: serverHome?.homename || 'our sanctuary', // real name from the creator
      linkCode: code,
      createdAt: Date.now(),
    };
    try { await saveHome(homeData); } catch (_) {}
    myLeaveRef.current.delete(homeData.linkCode);
    await refreshHomes();
    setJoining(false);
    setInviteCode('');
    setMode('selection');
    onNavigate('castle', { ...homeData, user });
  };

  // ── Enter a specific home ──────────────────────────────────────────────────
  const handleEnterExisting = (home) => {
    if (!home) return;
    onNavigate('castle', { ...home, user });
  };

  // ── Request to leave (mutual) — home only dissolves once both agree ────────
  const handleRequestLeave = async (home) => {
    myLeaveRef.current.add(home.linkCode); // mark that I've chosen to leave this home

    // Solo home (partner slot empty) can never complete a mutual handshake, so
    // dissolve it right away — otherwise the server keeps our membership and the
    // /mine sync keeps resurrecting it as a phantom home.
    try {
      const info = await fetch(`${API_BASE}/api/home/info/${home.linkCode}`);
      if (info.ok) {
        const { home: h } = await info.json();
        const partnerEmail = home.role === 'creator' ? (h?.joineremail || '') : (h?.creatoremail || '');
        const memberCount  = (h?.members || []).filter(Boolean).length;
        if (h && (!partnerEmail || memberCount <= 1)) {
          const u = await getUser();
          await fetch(`${API_BASE}/api/home/leave-finalize`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkcode: home.linkCode, role: home.role, email: u?.email || userEmail || '' }),
          });
          try { await fetch(`${API_BASE}/api/home/leave-reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkcode: home.linkCode }) }); } catch (_) {}
          myLeaveRef.current.delete(home.linkCode);
          const next = await removeHome(home.linkCode);
          setHomes(next);
          setLeaveStates(prev => { const n = { ...prev }; delete n[home.linkCode]; return n; });
          return;
        }
      }
    } catch (_) {}

    try {
      const res = await fetch(`${API_BASE}/api/home/leave-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: home.linkCode, role: home.role }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.bothAgreed) {
        myLeaveRef.current.delete(home.linkCode);
        try { await fetch(`${API_BASE}/api/home/leave-reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkcode: home.linkCode }) }); } catch (_) {}
        const next = await removeHome(home.linkCode);
        setHomes(next);
        setLeaveStates(prev => { const n = { ...prev }; delete n[home.linkCode]; return n; });
      } else {
        setLeaveStates(prev => ({ ...prev, [home.linkCode]: { mineRequested: true, partnerRequested: data ? (home.role === 'creator' ? data.joiner : data.creator) : false } }));
      }
    } catch (_) {
      // Offline fallback: still mark my request locally
      setLeaveStates(prev => ({ ...prev, [home.linkCode]: { ...(prev[home.linkCode] || {}), mineRequested: true } }));
    }
  };

  // ── Cancel my leave request ────────────────────────────────────────────────
  const handleCancelLeave = async (home) => {
    myLeaveRef.current.delete(home.linkCode);
    try {
      await fetch(`${API_BASE}/api/home/leave-cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: home.linkCode, role: home.role }),
      });
    } catch (_) {}
    setLeaveStates(prev => ({ ...prev, [home.linkCode]: { ...(prev[home.linkCode] || {}), mineRequested: false } }));
  };

  const orbs = [
    { x: -20,         y: height * 0.08,  size: 90, delay: 0,   color: '#E0506E' },
    { x: width - 60,  y: height * 0.14,  size: 70, delay: 400, color: '#ff758f' },
    { x: width * 0.4, y: height * 0.72,  size: 50, delay: 800, color: '#c9184a' },
    { x: -30,         y: height * 0.55,  size: 60, delay: 200, color: '#E0506E' },
    { x: width - 40,  y: height * 0.62,  size: 45, delay: 600, color: '#ff758f' },
  ];

  // Loading state
  if (loadingHome) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#E0506E" size="large" />
          <Text style={{ color: 'rgba(255,255,255,0.2)', marginTop: 16, fontSize: 12, textTransform: 'lowercase', letterSpacing: 1 }}>
            loading your sanctuary...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={TC.bg} />

      {/* Space background */}
      <SpaceBackground />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
        keyboardShouldPersistTaps="handled"
      >

        {/* ── SELECTION ──────────────────────────────────────────────────── */}
        {mode === 'selection' && (
          <Animated.View style={{ width: '100%', alignItems: 'center', opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>

            {/* Header */}
            <View style={styles.selectionHeader}>
              <View style={styles.headerTop}>
                <AvatarMark gender={user.gender} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.welcomeSmall}>welcome back,</Text>
                  {/* ── Uses registered name from storage ── */}
                  <Text style={styles.welcomeName} numberOfLines={1}>{user.name || 'mate'}</Text>
                </View>
                <View style={[styles.statusPill, homes.length > 0 && styles.statusPillLinked]}>
                  <View style={[styles.statusDot, homes.length > 0 && styles.statusDotLinked]} />
                  <Text style={[styles.statusTxt, homes.length > 0 && styles.statusTxtLinked]}>
                    {homes.length > 0 ? 'linked' : 'unlinked'}
                  </Text>
                </View>
              </View>

              {/* Castle hero — only if no home yet */}
              {homes.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
                  <HeartbeatRing />
                  <CastleSvg animate />
                  <Text style={styles.heroTagline}>your sanctuary awaits</Text>
                  <Text style={styles.heroSub}>build a shared home or step into one</Text>
                </View>
              )}

              {/* Connection vibe widget — when linked */}
              {homes.length > 0 && (
                <View style={styles.vibeRow}>
                  <VibeRing linked={true} />
                  <View style={{ flex: 1, marginLeft: 18 }}>
                    <Text style={styles.vibeTitle}>connection strong</Text>
                    <Text style={styles.vibeDesc}>your bond is active and beating. keep showing up for each other every day.</Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── Existing homes — always shown until both partners leave ── */}
            {homes.length > 0 && (
              <>
                <View style={styles.sectionLabelRow}>
                  <View style={styles.sectionLabelLine} />
                  <Text style={styles.sectionLabel}>{homes.length > 1 ? 'your sanctuaries' : 'your sanctuary'}</Text>
                  <View style={styles.sectionLabelLine} />
                </View>
                {homes.map(h => (
                  <ExistingHomeCard
                    key={h.linkCode}
                    home={h}
                    leaveState={leaveStates[h.linkCode]}
                    onEnter={handleEnterExisting}
                    onRequestLeave={handleRequestLeave}
                    onCancelLeave={handleCancelLeave}
                  />
                ))}
              </>
            )}

            {/* ── Daily love quote (always shown) ───────────────────────── */}
            <DailyLoveCard />

            {/* ── Add a home — only while under the limit ─────────────────── */}
            {canCreateMore ? (
              <View style={{ width: '100%', gap: 14, marginTop: 8 }}>

                {homes.length > 0 && (
                  <View style={styles.sectionLabelRow}>
                    <View style={styles.sectionLabelLine} />
                    <Text style={styles.sectionLabel}>add one more home</Text>
                    <View style={styles.sectionLabelLine} />
                  </View>
                )}

                {/* BUILD */}
                <TouchableOpacity onPress={() => setMode('build')} activeOpacity={0.88} style={styles.bigCard}>
                  <LinearGradient
                    colors={['rgba(224,80,110,0.10)', 'rgba(224,80,110,0.03)', TC.surface]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.bigCardGrad}
                  >
                    <View style={styles.bigCardIconWrap}>
                      <LinearGradient colors={[TC.accentDim, 'rgba(224,80,110,0.04)']} style={styles.bigCardIcon}>
                        <Text style={{ fontSize: 30 }}>🏰</Text>
                      </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bigCardTitle}>build a new home</Text>
                      <Text style={styles.bigCardDesc}>name your sanctuary, generate a secret bond code, invite your partner in.</Text>
                      <View style={styles.bigCardTag}>
                        <Text style={styles.bigCardTagText}>creator</Text>
                      </View>
                    </View>
                    <View style={styles.arrowCircle}>
                      <Text style={styles.arrowText}>→</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* JOIN */}
                <TouchableOpacity onPress={() => setMode('join')} activeOpacity={0.88} style={styles.bigCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)', 'rgba(0,0,0,0)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.bigCardGrad}
                  >
                    <View style={styles.bigCardIconWrap}>
                      <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.04)']} style={styles.bigCardIcon}>
                        <Text style={{ fontSize: 30 }}>🔑</Text>
                      </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bigCardTitle}>enter a home</Text>
                      <Text style={styles.bigCardDesc}>got a bond code from your partner? unlock the shared sanctuary instantly.</Text>
                      <View style={[styles.bigCardTag, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }]}>
                        <Text style={[styles.bigCardTagText, { color: 'rgba(255,255,255,0.4)' }]}>partner</Text>
                      </View>
                    </View>
                    <View style={[styles.arrowCircle, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                      <Text style={[styles.arrowText, { color: 'rgba(255,255,255,0.3)' }]}>→</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Solo garden teaser — only on a fresh start */}
                {homes.length === 0 && (
                  <View style={styles.soloRow}>
                    <View style={styles.soloIconWrap}><Text style={{ fontSize: 16 }}>🌱</Text></View>
                    <Text style={styles.soloText}>
                      sketching ideas while you wait?{' '}
                      <Text style={styles.soloLink}>explore your solo garden →</Text>
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.limitStrip}>
                <Text style={styles.limitIcon}>🏡</Text>
                <Text style={styles.limitText}>
                  you've reached your limit of {MAX_HOMES} homes. leave one (both partners must agree) to make room for another.
                </Text>
              </View>
            )}

          </Animated.View>
        )}

        {/* ── BUILD ──────────────────────────────────────────────────────── */}
        {mode === 'build' && (
          <Animated.View style={{ width: '100%', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            <View style={styles.modeNav}>
              <TouchableOpacity onPress={() => { setMode('selection'); setGeneratedCode(''); setHomeName(''); }} style={styles.backBtn}>
                <Text style={styles.backBtnText}>←</Text>
              </TouchableOpacity>
              <StepBar step={generatedCode ? (homeName.trim() ? 2 : 1) : 0} total={3} />
              <View style={{ width: 40 }} />
            </View>

            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <CastleSvg animate={false} />
              <Text style={styles.modeTitle}>found your sanctuary</Text>
              <Text style={styles.modeSub}>name it, lock it, invite your partner in</Text>
            </View>

            {/* Step 1: Name */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumRow}>
                <View style={[styles.stepNum, homeName.trim() && styles.stepNumDone]}>
                  <Text style={styles.stepNumText}>{homeName.trim() ? '✓' : '1'}</Text>
                </View>
                <Text style={styles.stepTitle}>name your home</Text>
              </View>
              <Animated.View style={[styles.inputWrap, homeNameFocus && styles.inputWrapFocused]}>
                <Text style={styles.inputIcon}>🏰</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. our little haven..."
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  value={homeName}
                  onChangeText={setHomeName}
                  autoCapitalize="words"
                  onFocus={() => setHomeNameFocus(true)}
                  onBlur={() => setHomeNameFocus(false)}
                  maxLength={30}
                />
                {homeName.trim().length > 0 && (
                  <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>
                )}
              </Animated.View>
            </View>

            {/* Step 2: Bond code */}
            <View style={[styles.stepCard, { marginTop: 12 }]}>
              <View style={styles.stepNumRow}>
                <View style={[styles.stepNum, generatedCode && styles.stepNumDone]}>
                  <Text style={styles.stepNumText}>{generatedCode ? '✓' : '2'}</Text>
                </View>
                <Text style={styles.stepTitle}>generate bond code</Text>
              </View>
              <Text style={styles.stepDesc}>
                this is the secret key your partner uses to enter your home. share it privately.
              </Text>

              <CodeBadge code={generatedCode} onCopy={handleCopy} copied={copied} />

              <TouchableOpacity onPress={handleGenerateCode} style={styles.ghostBtn} activeOpacity={0.75}>
                <Text style={styles.ghostBtnText}>
                  {generatedCode ? '↺  regenerate code' : '✦  generate my bond code'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step 3: Create */}
            <View style={{ marginTop: 20 }}>
              <PrimaryButton
                label={creatingAnim ? 'founding sanctuary...' : 'create home  🏰'}
                onPress={handleCreateHome}
                disabled={!homeName.trim() || !generatedCode || creatingAnim}
              />
            </View>

            {(!homeName.trim() || !generatedCode) && (
              <Text style={styles.hintText}>
                {!homeName.trim() ? 'enter a name for your home first' : 'generate a bond code to continue'}
              </Text>
            )}
          </Animated.View>
        )}

        {/* ── JOIN ───────────────────────────────────────────────────────── */}
        {mode === 'join' && (
          <Animated.View style={{ width: '100%', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            <View style={styles.modeNav}>
              <TouchableOpacity onPress={() => { setMode('selection'); setJoinError(''); setInviteCode(''); }} style={styles.backBtn}>
                <Text style={styles.backBtnText}>←</Text>
              </TouchableOpacity>
              <StepBar step={inviteCode.trim() ? 1 : 0} total={2} />
              <View style={{ width: 40 }} />
            </View>

            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={styles.keyIllustration}>
                <HeartbeatRing />
                <Text style={{ fontSize: 72, position: 'absolute' }}>🔑</Text>
              </View>
              <Text style={styles.modeTitle}>enter the gateway</Text>
              <Text style={styles.modeSub}>paste the bond code your partner shared with you</Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumRow}>
                <View style={[styles.stepNum, inviteCode.trim() && styles.stepNumDone]}>
                  <Text style={styles.stepNumText}>{inviteCode.trim() ? '✓' : '1'}</Text>
                </View>
                <Text style={styles.stepTitle}>enter bond code</Text>
              </View>
              <Animated.View style={[styles.inputWrap, joinFocus && styles.inputWrapFocused, { marginTop: 12 }]}>
                <Text style={styles.inputIcon}>💌</Text>
                <TextInput
                  style={[styles.inputField, { letterSpacing: 1.5, fontWeight: '700' }]}
                  placeholder="MOON-HAVEN-X3A..."
                  placeholderTextColor="rgba(255,255,255,0.15)"
                  value={inviteCode}
                  onChangeText={(t) => { setInviteCode(t); if (joinError) setJoinError(''); }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onFocus={() => setJoinFocus(true)}
                  onBlur={() => setJoinFocus(false)}
                />
                {inviteCode.trim().length > 0 && (
                  <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>
                )}
              </Animated.View>
              <Text style={styles.codeHint}>format: WORD-WORD-XXX (case insensitive)</Text>
            </View>

            <View style={styles.infoStrip}>
              <Text style={styles.infoIcon}>🔒</Text>
              <Text style={styles.infoText}>
                the bond code connects you directly to your partner's sanctuary. each code works once.
              </Text>
            </View>

            {!!joinError && (
              <View style={styles.joinErrorBox}>
                <Text style={styles.joinErrorText}>⚠  {joinError}</Text>
              </View>
            )}

            <View style={{ marginTop: 20 }}>
              <PrimaryButton
                label={joining ? 'connecting...' : 'unlock sanctuary  🔑'}
                onPress={handleJoinHome}
                disabled={!inviteCode.trim() || joining}
              />
            </View>

            {!inviteCode.trim() && !joinError && (
              <Text style={styles.hintText}>enter the bond code to unlock the shared home</Text>
            )}
          </Animated.View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: TC.bg },
  scroll: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },

  // Selection
  selectionHeader: { width: '100%', marginBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', width: '100%' },

  avatarWrap: { width: 56, height: 56 },
  avatarGrad: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: TC.accentLine, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 24 },

  welcomeSmall: { fontSize: 11, color: TC.textMuted, textTransform: 'uppercase', letterSpacing: 2 },
  welcomeName:  { fontFamily: TF.serif, fontSize: 28, color: TC.text, letterSpacing: -0.3 },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: TC.surface, borderWidth: 1, borderColor: TC.hairline, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  statusPillLinked: { backgroundColor: 'rgba(127,169,140,0.08)', borderColor: 'rgba(127,169,140,0.3)' },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: TC.textMuted },
  statusDotLinked: { backgroundColor: TC.sage },
  statusTxt: { fontSize: 10, color: TC.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: '600' },
  statusTxtLinked: { color: TC.sage },

  heroTagline: { fontFamily: TF.serif, fontSize: 22, color: TC.text, letterSpacing: -0.3, marginTop: 8 },
  heroSub:     { fontSize: 12, color: TC.textMuted, marginTop: 6 },

  // Existing home card
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 14, gap: 12 },
  sectionLabelLine: { flex: 1, height: 1, backgroundColor: TC.hairline },
  sectionLabel: { fontSize: 10, color: TC.textMuted, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: '600' },

  homeCard: { width: '100%', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: TC.hairline },
  homeCardGrad: { padding: 20, gap: 16 },

  homeCardTop: { flexDirection: 'row', alignItems: 'center' },
  homeCardIconWrap: {},
  homeCardIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: TC.accentLine },
  homeCardName: { fontFamily: TF.serif, fontSize: 21, color: TC.text, letterSpacing: -0.2 },
  homeCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  homeRolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, backgroundColor: TC.accentDim, borderWidth: 1, borderColor: TC.accentLine },
  homeRolePillText: { fontSize: 10, color: TC.accentSoft, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  homeCardDate: { fontSize: 10, color: TC.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },

  liveDotWrap: { alignItems: 'center', gap: 3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 },
  liveDotText: { fontSize: 8, color: '#22c55e', textTransform: 'lowercase', letterSpacing: 0.5, fontWeight: '600' },

  homeCodeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: TC.bgElev, borderWidth: 1, borderColor: TC.hairline, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  homeCodeLabel: { fontSize: 9, color: TC.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  homeCodeValue: { fontSize: 16, fontWeight: '700', color: TC.accentSoft, letterSpacing: 1.2 },

  enterBtn: { borderRadius: 14, overflow: 'hidden' },
  enterBtnGrad: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: TC.accentLine },
  enterBtnText: { fontSize: 14, fontWeight: '600', color: TC.accentSoft, textTransform: 'lowercase', letterSpacing: 0.5 },

  dissolveRow: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  dissolveText: { fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'lowercase', letterSpacing: 0.3 },

  // Mutual-leave states
  leaveWaitingRow:  { alignItems: 'center', paddingVertical: 12, marginTop: 4, gap: 2 },
  leaveWaitingText: { fontSize: 11, color: 'rgba(255,193,7,0.7)', textTransform: 'lowercase', letterSpacing: 0.3 },
  leaveCancelText:  { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 0.3 },
  leavePromptRow:   { alignItems: 'center', paddingVertical: 12, marginTop: 4, backgroundColor: 'rgba(224,80,110,0.07)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(224,80,110,0.2)' },
  leavePromptText:  { fontSize: 12, color: 'rgba(255,255,255,0.55)', textTransform: 'lowercase', letterSpacing: 0.2 },

  // Home limit strip
  limitStrip: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 },
  limitIcon:  { fontSize: 22 },
  limitText:  { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', lineHeight: 17 },

  // Hamburger + side menu
  hamburgerBtn: { width: 40, height: 40, borderRadius: 20, marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  menuOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', justifyContent: 'flex-end' },
  menuPanel:    { width: width * 0.78, maxWidth: 320, height: '100%', borderLeftWidth: 1, borderLeftColor: 'rgba(224,80,110,0.18)', paddingTop: 64, paddingHorizontal: 22, paddingBottom: 40, overflow: 'hidden' },
  menuProfile:  { alignItems: 'center', paddingBottom: 22 },
  menuAvatar:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(224,80,110,0.35)', marginBottom: 12 },
  menuName:     { fontSize: 20, fontWeight: '800', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.3 },
  menuEmail:    { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 },
  menuHomePill: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)' },
  menuHomePillText: { fontSize: 10, color: '#22c55e', textTransform: 'lowercase', fontWeight: '700', letterSpacing: 0.5 },
  menuDivider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  menuRow:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 6 },
  menuRowText:  { fontSize: 15, color: 'rgba(255,255,255,0.75)', textTransform: 'lowercase', fontWeight: '600' },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 16, backgroundColor: 'rgba(224,80,110,0.1)', borderWidth: 1.5, borderColor: 'rgba(224,80,110,0.3)' },
  logoutText:   { fontSize: 15, color: '#F08FA0', fontWeight: '800', textTransform: 'lowercase', letterSpacing: 0.5 },

  // Secondary actions (when home exists)
  secondaryActionsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', height: 48 },
  secondaryBtn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.28)', textTransform: 'lowercase', fontWeight: '600' },
  secondaryDivider: { width: 1, height: '50%', backgroundColor: 'rgba(255,255,255,0.07)' },

  // Big cards
  bigCard: { width: '100%', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: TC.hairline },
  bigCardGrad: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 14 },
  bigCardIconWrap: {},
  bigCardIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: TC.accentLine },
  bigCardTitle: { fontFamily: TF.serif, fontSize: 18, color: TC.text, letterSpacing: -0.2, marginBottom: 4 },
  bigCardDesc:  { fontSize: 12, color: TC.textMuted, lineHeight: 17 },
  bigCardTag:   { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, backgroundColor: TC.accentDim, borderWidth: 1, borderColor: TC.accentLine },
  bigCardTagText: { fontSize: 10, color: TC.accentSoft, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  arrowCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: TC.accentLine, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 14, color: TC.accentSoft },

  soloRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginTop: 8 },
  soloIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  soloText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.22)', textTransform: 'lowercase', lineHeight: 17 },
  soloLink: { color: 'rgba(224,80,110,0.7)', fontWeight: '600' },

  // Mode nav
  modeNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 16, color: 'rgba(255,255,255,0.55)' },

  modeTitle: { fontFamily: TF.serif, fontSize: 28, color: TC.text, letterSpacing: -0.3, marginTop: 6 },
  modeSub:   { fontSize: 12, color: TC.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 17 },

  // Step cards
  stepCard: { width: '100%', backgroundColor: TC.surface, borderWidth: 1, borderColor: TC.hairline, borderRadius: 20, padding: 18 },
  stepNumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: TC.surface2, borderWidth: 1, borderColor: TC.hairline2, alignItems: 'center', justifyContent: 'center' },
  stepNumDone: { backgroundColor: TC.accentDim, borderColor: TC.accent },
  stepNumText: { fontSize: 11, fontWeight: '700', color: TC.textSoft },
  stepTitle: { fontSize: 14, fontWeight: '600', color: TC.text, letterSpacing: 0.2 },
  stepDesc:  { fontSize: 12, color: TC.textMuted, lineHeight: 17, marginBottom: 14 },

  // Input
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 60, backgroundColor: TC.bgElev, borderWidth: 1, borderColor: TC.hairline2, borderRadius: 16, paddingHorizontal: 18 },
  inputWrapFocused: { borderColor: TC.accentLine, backgroundColor: TC.accentDim },
  inputIcon: { fontSize: 17, opacity: 0.85 },
  inputField: { flex: 1, fontSize: 16, color: TC.text, fontWeight: '400', paddingVertical: 0, letterSpacing: 0.2, outlineStyle: 'none', outlineWidth: 0 },
  checkBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: TC.accentDim, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 11, color: TC.accentSoft, fontWeight: '700' },

  // Code badge
  codeBadge: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: TC.bgElev, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  codeLabel: { fontSize: 9, color: TC.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 },
  codeValue: { fontSize: 20, fontWeight: '700', color: TC.accentSoft, letterSpacing: 1.5 },
  copyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: TC.surface2, borderWidth: 1, borderColor: TC.hairline },
  copyBtnDone: { backgroundColor: TC.accentDim, borderColor: TC.accentLine },
  copyBtnText: { fontSize: 12, color: TC.textSoft, fontWeight: '600', textTransform: 'lowercase' },

  // Ghost button
  ghostBtn: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: TC.accentLine, backgroundColor: TC.accentDim, alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { fontSize: 13, color: TC.accentSoft, fontWeight: '600', textTransform: 'lowercase', letterSpacing: 0.4 },

  // Join
  keyIllustration: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  codeHint: { fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'lowercase', letterSpacing: 0.3, marginTop: 8 },
  infoStrip: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 },
  infoIcon: { fontSize: 16, marginTop: 1 },
  infoText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.28)', lineHeight: 17, textTransform: 'lowercase' },

  hintText: { fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 12, textTransform: 'lowercase' },
  joinErrorBox:  { marginTop: 14, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 12 },
  joinErrorText: { color: '#ef4444', fontSize: 12, textTransform: 'lowercase', textAlign: 'center' },

  // Vibe widget
  vibeRow:   { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 22, backgroundColor: 'rgba(34,197,94,0.06)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.18)', borderRadius: 20, padding: 16 },
  vibeTitle: { fontSize: 16, fontWeight: '800', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.2, marginBottom: 5 },
  vibeDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.32)', textTransform: 'lowercase', lineHeight: 17 },

  // Daily love quote
  quoteSectionRow:   { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 12, gap: 10 },
  quoteSectionLine:  { flex: 1, height: 1, backgroundColor: 'rgba(224,80,110,0.15)' },
  quoteSectionLabel: { fontSize: 10, color: 'rgba(224,147,159,0.6)', letterSpacing: 2, textTransform: 'lowercase', fontWeight: '700' },
  quoteCard:    { width: '100%', borderRadius: 22, padding: 22, borderWidth: 1.5, borderColor: 'rgba(224,80,110,0.22)', overflow: 'hidden' },
  quoteMark:    { position: 'absolute', top: 4, left: 14, fontSize: 64, color: 'rgba(224,147,159,0.18)', fontWeight: '900' },
  quoteText:    { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', textTransform: 'lowercase', lineHeight: 24, marginTop: 14, marginLeft: 8 },
  quoteAuthor:  { fontSize: 12, color: '#F08FA0', textTransform: 'lowercase', marginTop: 12, textAlign: 'right', fontWeight: '600' },
  quoteTapHint: { fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'lowercase', letterSpacing: 1.5, marginTop: 8, textAlign: 'center' },
});
