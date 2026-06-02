// screens/Castle.js  — Enhanced Edition with Inbox
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Animated, StatusBar, SafeAreaView, ScrollView, TextInput,
  Easing, Modal, KeyboardAvoidingView, Platform, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle, Ellipse, Path, Rect, Defs, G,
  RadialGradient as SvgRadialGradient, Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import { API_BASE } from '../utils/api.js';
import { colors as TC, fonts as TF } from '../theme/theme.js';
import SpaceBackground from '../theme/SpaceBackground.js';

const { width, height } = Dimensions.get('window');

// Shop item id → emoji, for the home collection showcase.
const ITEM_EMOJI = {
  gift_rose: '🌹', gift_chocolate: '🍫', gift_star: '⭐', gift_balloon: '🎈',
  gift_teddy: '🧸', gift_diamond: '💎', badge_flame: '🔥', badge_crown: '👑',
  badge_lucky: '🦋', stamp_love: '❤️',
};

// ─── Presence API ─────────────────────────────────────────────────────────────
const HEARTBEAT_INTERVAL = 30000;
const PRESENCE_POLL      = 12000;

async function postPresence(linkCode, role, name) {
  try {
    await fetch(`${API_BASE}/api/home/presence`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ linkcode: linkCode, role, name }),
    });
  } catch (_) {}
}

async function fetchPresence(linkCode, myRole) {
  try {
    const res  = await fetch(`${API_BASE}/api/home/presence/${linkCode}`);
    if (!res.ok) return null;
    const data = await res.json();
    const partnerRole = myRole === 'creator' ? 'joiner' : 'creator';
    return data[partnerRole] || null; // { name, lastseen } or null
  } catch (_) { return null; }
}

function getStatusInfo(lastSeen) {
  if (!lastSeen) return { label: 'not yet joined', color: 'rgba(255,255,255,0.18)', online: false };
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 90000)  return { label: 'online now', color: '#22c55e', online: true };
  if (diff < 600000) return { label: `${Math.floor(diff / 60000)}m ago`, color: '#94a3b8', online: false };
  return { label: 'away', color: 'rgba(255,255,255,0.2)', online: false };
}

// ─── SVG Icon library (replaces flat emojis inside Icon3D spheres) ────────────
function SvgIcon({ symbol, size }) {
  const s = size * 0.52;
  const stroke = '#ffffff';
  switch (symbol) {
    case '💌': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Rect x="2.5" y="5" width="19" height="14" rx="2" fill="none" stroke={stroke} strokeWidth="1.6"/>
        <Path d="M2.5 7l9.5 7 9.5-7" stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        <Path d="M12 15v4" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      </Svg>
    );
    case '🏰': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Rect x="4" y="11" width="16" height="10" rx="0.5" fill="none" stroke={stroke} strokeWidth="1.4"/>
        <Rect x="4" y="7" width="3" height="5" fill="none" stroke={stroke} strokeWidth="1.4"/>
        <Rect x="10.5" y="6" width="3" height="6" fill="none" stroke={stroke} strokeWidth="1.4"/>
        <Rect x="17" y="7" width="3" height="5" fill="none" stroke={stroke} strokeWidth="1.4"/>
        <Path d="M4 7V4.5M5.5 7V4.5M7 7V4.5M10.5 6V3.5M12 6V3.5M13.5 6V3.5M17 7V4.5M18.5 7V4.5M20 7V4.5" stroke={stroke} strokeWidth="1.3" strokeLinecap="round"/>
        <Rect x="9.5" y="15" width="5" height="6" rx="0.5" fill="none" stroke={stroke} strokeWidth="1.3"/>
      </Svg>
    );
    case '📬': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Rect x="2.5" y="8" width="17" height="13" rx="1.5" fill="none" stroke={stroke} strokeWidth="1.6"/>
        <Path d="M2.5 10.5l8.5 5 8.5-5" stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <Path d="M16 4h5.5M19 1.5v5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round"/>
      </Svg>
    );
    case '🧠': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M12 5C9 5 6.5 7.2 6.5 10c0 1.5.6 2.8 1.5 3.7-.9 1-2 2.3-2 3.8A2.5 2.5 0 008.5 20H12" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
        <Path d="M12 5c3 0 5.5 2.2 5.5 5 0 1.5-.6 2.8-1.5 3.7.9 1 2 2.3 2 3.8A2.5 2.5 0 0115.5 20H12" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
        <Path d="M12 5v15" stroke={stroke} strokeWidth="1" strokeDasharray="2 2"/>
      </Svg>
    );
    case '🔥': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M12 2c0 4.5-5 5.5-5 10a5 5 0 0010 0c0-2.5-1.5-3.5-1.5-3.5s-.5 2.5-2 2.5c-1 0-2-1-2-2.5 0-2.5 3.5-4.5 3.5-8z" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
      </Svg>
    );
    case '🪙': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="none" stroke={stroke} strokeWidth="1.6"/>
        <Circle cx="12" cy="12" r="6" fill="none" stroke={stroke} strokeWidth="1" opacity="0.5"/>
        <Path d="M12 8v8M9 11h6M9 13h6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      </Svg>
    );
    case '🌈': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M3 17a9 9 0 0118 0" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
        <Path d="M6 17a6 6 0 0112 0" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" opacity="0.7"/>
        <Path d="M9 17a3 3 0 016 0" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.45"/>
      </Svg>
    );
    case '🫙': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Rect x="7" y="4" width="10" height="2.5" rx="1.2" fill="none" stroke={stroke} strokeWidth="1.4"/>
        <Path d="M7.5 6.5h9l1 12.5A2 2 0 0115.5 21h-7a2 2 0 01-2-2z" fill="none" stroke={stroke} strokeWidth="1.4"/>
        <Path d="M9.5 11.5c1 1 2 1 3 0s2-1 3 0" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      </Svg>
    );
    case '📌': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M12 2l2.5 6.5H19l-3.5 4 1.2 6.5L12 16l-4.7 3 1.2-6.5L5 8.5h4.5z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
        <Path d="M12 19v3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      </Svg>
    );
    case '⏳': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M6 2h12M6 22h12" stroke={stroke} strokeWidth="1.8" strokeLinecap="round"/>
        <Path d="M8 2v3.5l4 4.5-4 4.5V22" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
        <Path d="M16 2v3.5l-4 4.5 4 4.5V22" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
      </Svg>
    );
    case '🏆': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M7 4h10v5a5 5 0 01-10 0z" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
        <Path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
        <Path d="M10 14h4v3h-4zM8 20h8M9 17v3M15 17v3" stroke={stroke} strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
      </Svg>
    );
    case '💛':
    case '♥': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill={stroke}/>
      </Svg>
    );
    case '😅': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="none" stroke={stroke} strokeWidth="1.5"/>
        <Path d="M8 10c.5-.5 1.5-.5 2 0M14 10c.5-.5 1.5-.5 2 0" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <Path d="M8 15c1 1.5 2.5 2 4 2s3-.5 4-2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      </Svg>
    );
    case '✦':
    case '🃏': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
      </Svg>
    );
    case '🕊️': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M4 14c2 0 4-1 5-3 1 3 4 5 7 5 2 0 3-1 3-2 0-1.5-2-2-3-1 0-2-1-4-3-4-2 0-3 1-4 2-2 0-4 1-5 3z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
      </Svg>
    );
    case '🥰': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="none" stroke={stroke} strokeWidth="1.5"/>
        <Path d="M8 14c1 1.5 2.5 2 4 2s3-.5 4-2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
        <Circle cx="9" cy="11" r="0.8" fill={stroke}/>
        <Circle cx="15" cy="11" r="0.8" fill={stroke}/>
      </Svg>
    );
    case '😌': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="none" stroke={stroke} strokeWidth="1.5"/>
        <Path d="M7.5 10.5c1-1 2.5-1 3.5 0M13 10.5c1-1 2.5-1 3.5 0" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <Path d="M9 15c1 1 2 1 3 1s2 0 3-1" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      </Svg>
    );
    case '🥺': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="none" stroke={stroke} strokeWidth="1.5"/>
        <Circle cx="9" cy="11" r="1.5" fill="none" stroke={stroke} strokeWidth="1.2"/>
        <Circle cx="15" cy="11" r="1.5" fill="none" stroke={stroke} strokeWidth="1.2"/>
        <Path d="M9 16c1-.5 2-.8 3-.8s2 .3 3 .8" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      </Svg>
    );
    case '😘': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="none" stroke={stroke} strokeWidth="1.5"/>
        <Path d="M7 10c1 0 2 0 3 1" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
        <Circle cx="15" cy="11" r="0.9" fill={stroke}/>
        <Path d="M11 16c1 0 2-.3 2.5-1c.5.7 1.5 1 2.5 1" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
      </Svg>
    );
    case '🌙': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M20 14A8 8 0 0110 4a8 8 0 1010 10z" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round"/>
      </Svg>
    );
    case '😭': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="none" stroke={stroke} strokeWidth="1.5"/>
        <Path d="M7.5 10l3 1.5M16.5 10l-3 1.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
        <Path d="M9 17c0-2 1.5-3 3-3s3 1 3 3" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
        <Path d="M7 12v3M17 12v3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      </Svg>
    );
    case '🦋': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M12 12c-2-4-6-5-7-2s1 6 4 7c1-2 2-3 3-3.5z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
        <Path d="M12 12c2-4 6-5 7-2s-1 6-4 7c-1-2-2-3-3-3.5z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
        <Path d="M12 8v10" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
      </Svg>
    );
    case '🎭': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M5 4h7v8a3.5 3.5 0 01-7 0z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
        <Path d="M12 8h7v8a3.5 3.5 0 01-7 0z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
      </Svg>
    );
    case '💞': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M8 15s-4-2.5-4-6c0-2 1.5-3 3-3 1 0 1.5.5 2 1 .5-.5 1-1 2-1 1.5 0 3 1 3 3 0 3.5-4 6-4 6z" fill={stroke}/>
        <Path d="M15 19s-4-2.5-4-6c0-2 1.5-3 3-3 1 0 1.5.5 2 1 .5-.5 1-1 2-1 1.5 0 3 1 3 3 0 3.5-4 6-4 6z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
      </Svg>
    );
    case '🎮': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M6 8h12a3 3 0 013 3v4a3 3 0 01-3 3c-1.5 0-2-1-3-2h-6c-1 1-1.5 2-3 2a3 3 0 01-3-3v-4a3 3 0 013-3z" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
        <Path d="M7 12h3M8.5 10.5v3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
        <Circle cx="15.5" cy="11.5" r="0.9" fill={stroke}/>
        <Circle cx="17" cy="13" r="0.9" fill={stroke}/>
      </Svg>
    );
    case '🪺': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M3 14c0-4 4-7 9-7s9 3 9 7c0 1-1 2-2 2H5c-1 0-2-1-2-2z" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
        <Ellipse cx="10" cy="13" rx="1.5" ry="1.2" fill={stroke}/>
        <Ellipse cx="13.5" cy="13.5" rx="1.5" ry="1.2" fill={stroke}/>
      </Svg>
    );
    case '🦅': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M3 10c4-3 6-3 9-1 3-2 5-2 9 1-3 1-5 1-9 0-4 1-6 1-9 0z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
        <Path d="M12 9v8M10 17h4" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
      </Svg>
    );
    case '↺': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M4 12a8 8 0 1014.5-4.5" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round"/>
        <Path d="M19 3v5h-5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </Svg>
    );
    case '🔒': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke={stroke} strokeWidth="1.5"/>
        <Path d="M8 11V7a4 4 0 018 0v4" fill="none" stroke={stroke} strokeWidth="1.5"/>
      </Svg>
    );
    case '💬': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
        <Path d="M8 10h8M8 14h5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
      </Svg>
    );
    case '→': return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M4 12h16M14 6l6 6-6 6" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </Svg>
    );
    default: return (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="none" stroke={stroke} strokeWidth="1.5"/>
        <Path d="M12 8v5l3 2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      </Svg>
    );
  }
}

// ─── 3D Icon Component ────────────────────────────────────────────────────────
// ─── 3D Specular Spherical Icon Component ─────────────────────────────────────
function Icon3D({ symbol, size = 52, colors, shadowColor, style }) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const swayAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 3D pulse breathing sequence
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.07, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1,    duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Subtle 3D angular sway
    Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, { toValue: 3,  duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(swayAnim, { toValue: -3, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotY = swayAnim.interpolate({ inputRange: [-3, 3], outputRange: ['-12deg', '12deg'] });

  return (
    <Animated.View style={[{
      width: size, height: size, borderRadius: size / 2,
      alignItems: 'center', justifyContent: 'center',
      transform: [{ scale: pulseScale }, { rotateY: rotY }],
      shadowColor: shadowColor || colors[1] || colors[0],
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.75, shadowRadius: 16,
      elevation: 12,
    }, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }}
        style={{
          width: size, height: size, borderRadius: size / 2,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1.6, borderColor: 'rgba(255,255,255,0.28)',
          overflow: 'hidden',
        }}
      >
        {/* Specular Radial Spotlight Glow Overlay */}
        <View style={{
          position: 'absolute', top: size * 0.08, left: size * 0.14,
          width: size * 0.38, height: size * 0.24, borderRadius: size * 0.12,
          backgroundColor: 'rgba(255,255,255,0.42)',
          transform: [{ rotate: '-18deg' }],
        }} />

        {/* 3D Base Ambient Shadow Layer */}
        <View style={{
          position: 'absolute', bottom: 0, width: size, height: size * 0.3,
          backgroundColor: 'rgba(0,0,0,0.25)', borderBottomLeftRadius: size / 2, borderBottomRightRadius: size / 2
        }} />

        <View style={{ zIndex: 1 }}>
          <SvgIcon symbol={symbol} size={size} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Glowing Floating Ambient Particles ───────────────────────────────────────
function Particle({ x, y, size, delay, color = '#E0506E' }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.5)).current;
  const floatY  = useRef(new Animated.Value(0)).current;
  const floatX  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 0.28, duration: 900, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(Animated.parallel([
        Animated.sequence([
          Animated.timing(floatY, { toValue: -20, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floatY, { toValue: 4,   duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(floatX, { toValue: 8,  duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floatX, { toValue: -8, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])).start();

      Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: 0.08, duration: 2400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.28, duration: 2400, useNativeDriver: true }),
      ])).start();
    });
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y, width: size, height: size,
      borderRadius: size / 2, backgroundColor: color, opacity,
      transform: [{ translateY: floatY }, { translateX: floatX }],
      shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: size * 0.6,
    }} />
  );
}

// ─── 3D Star Sparkle Vector ───────────────────────────────────────────────────
function Sparkle({ x, y, delay }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale,   { toValue: 1.1, duration: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.95, duration: 250, useNativeDriver: true }),
        Animated.timing(rotate,  { toValue: 1, duration: 1100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scale,   { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]),
      Animated.delay(1800 + Math.random() * 2500),
    ])).start();
  }, []);

  const rot = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y,
      width: 14, height: 14,
      opacity, transform: [{ scale }, { rotate: rot }],
    }}>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" fill="#C9A86A"/>
      </Svg>
    </Animated.View>
  );
}

// ─── Active Pulsing Heartbeat Rings ───────────────────────────────────────────
function HeartbeatRing({ size = 100, color = '#E0506E' }) {
  const rings = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    rings.forEach((r, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 450),
        Animated.timing(r, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(r, { toValue: 0, duration: 350,  useNativeDriver: true }),
        Animated.delay(1600),
      ])).start();
    });
  }, []);

  return (
    <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {rings.map((r, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 1.5, borderColor: color,
          opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.12] }) }],
        }} />
      ))}
    </View>
  );
}

// ─── Shimmer-sweep Primary CTA Button ─────────────────────────────────────────
function PrimaryButton({ label, onPress, disabled, icon }) {
  const shimmer   = useRef(new Animated.Value(-1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(2200),
      Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  const shimX = shimmer.interpolate({ inputRange: [-1, 1], outputRange: [-width, width] });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true }).start()}
      activeOpacity={1} disabled={disabled}
      style={[{ width: '100%', borderRadius: 18, overflow: 'hidden' }, disabled && { opacity: 0.35 }]}
    >
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <LinearGradient
          colors={['#F08FA0', '#E0506E', '#B23E54']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexDirection: 'row', gap: 8 }}
        >
          {icon && <View><SvgIcon symbol={icon} size={36} /></View>}
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.6, textTransform: 'lowercase' }}>{label}</Text>
          <Animated.View style={{
            position: 'absolute', top: 0, bottom: 0, width: 100,
            backgroundColor: 'rgba(255,255,255,0.25)', transform: [{ translateX: shimX }, { skewX: '-20deg' }],
          }} />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Border-lit Glassmorphic Ghost Button ────────────────────────────────────
function GhostButton({ label, onPress, color = '#E0506E' }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={{ height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: `${color}40`, backgroundColor: `${color}0c`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 14, color, fontWeight: '800', textTransform: 'lowercase', letterSpacing: 0.4 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Premium Glassmorphism Card Wrapper ───────────────────────────────────────
function GlassCard({ children, style, accent = false, onPress }) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const Wrap = onPress ? TouchableOpacity : View;

  return (
    <Wrap
      onPress={onPress} activeOpacity={1}
      onPressIn={onPress ? () => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true }).start() : undefined}
      onPressOut={onPress ? () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true }).start() : undefined}
    >
      <Animated.View style={[{
        borderRadius: 24, overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: accent ? 'rgba(224,80,110,0.32)' : 'rgba(255,255,255,0.08)',
        shadowColor: accent ? '#E0506E' : '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: accent ? 0.22 : 0.16,
        shadowRadius: 20, elevation: 10,
        transform: [{ scale: pressScale }],
      }, style]}>
        <LinearGradient
          colors={accent
            ? ['rgba(224,80,110,0.16)', 'rgba(224,80,110,0.04)', 'rgba(12,12,22,0.96)']
            : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'rgba(12,12,22,0.98)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: 18 }}
        >
          {children}
        </LinearGradient>
      </Animated.View>
    </Wrap>
  );
}

// ─── Banner Marquee ───────────────────────────────────────────────────────────
function HomeNameBanner({ name }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const text = `  ✦  ${name}  ✦  ${name}  ✦  ${name}  ✦  ${name}  `;

  useEffect(() => {
    Animated.loop(
      Animated.timing(scrollX, { toValue: -width * 1.5, duration: 11000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  return (
    <View style={{ overflow: 'hidden', width: '100%', marginVertical: 6 }}>
      <Animated.Text style={{
        fontSize: 11, color: TC.textFaint, textTransform: 'uppercase',
        letterSpacing: 3, fontWeight: '600',
        transform: [{ translateX: scrollX }],
      }} numberOfLines={1}>{text}</Animated.Text>
    </View>
  );
}

// ─── Premium Specular Title Marquee ──────────────────────────────────────────
function HomeTitle({ name }) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2500, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 2500, useNativeDriver: false }),
    ])).start();
  }, []);

  return (
    <View style={{ alignItems: 'center', marginVertical: 8, width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, width: '90%' }}>
        <LinearGradient colors={['transparent', 'rgba(224,147,159,0.4)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, height: 1 }} />
        <Text style={{ fontSize: 10, color: 'rgba(224,147,159,0.6)', letterSpacing: 4 }}>✦ ✦ ✦</Text>
        <LinearGradient colors={['transparent', 'rgba(224,147,159,0.4)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, height: 1 }} />
      </View>
      <Text style={{
        fontFamily: TF.serif, fontSize: 36, color: TC.text, letterSpacing: -0.5, textAlign: 'center',
      }}>{name || 'our sanctuary'}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, width: '90%' }}>
        <LinearGradient colors={['transparent', 'rgba(224,147,159,0.4)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, height: 1 }} />
        <Text style={{ fontSize: 10, color: 'rgba(224,147,159,0.6)', letterSpacing: 4 }}>✦ ✦ ✦</Text>
        <LinearGradient colors={['transparent', 'rgba(224,147,159,0.4)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, height: 1 }} />
      </View>
    </View>
  );
}

// ─── Premium Glassmorphic Feature Card ────────────────────────────────────────
function FeatureCard({ icon3dSymbol, iconColors, iconShadow, title, desc, tag, onPress, accent = false, comingSoon = false }) {
  const pressScale = useRef(new Animated.Value(1)).current;

  return (
    <TouchableOpacity
      onPress={!comingSoon ? onPress : undefined}
      activeOpacity={1}
      onPressIn={() => !comingSoon && Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => !comingSoon && Animated.spring(pressScale, { toValue: 1, useNativeDriver: true }).start()}
    >
      <Animated.View style={[styles.featureCard, {
        transform: [{ scale: pressScale }],
        borderColor: accent ? TC.accentLine : TC.hairline,
        opacity: comingSoon ? 0.65 : 1,
      }]}>
        <LinearGradient
          colors={accent
            ? ['rgba(224,80,110,0.10)', 'rgba(224,80,110,0.02)', TC.surface]
            : [TC.surface, TC.surface, TC.bgElev]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.featureCardInner}
        >
          <Icon3D symbol={icon3dSymbol} size={60} colors={iconColors} shadowColor={iconShadow} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDesc}>{desc}</Text>
            {tag && (
              <View style={[styles.featureTag, accent && styles.featureTagAccent]}>
                <Text style={[styles.featureTagText, accent && { color: '#F08FA0' }]}>{tag}</Text>
              </View>
            )}
          </View>
          <LinearGradient
            colors={comingSoon
              ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']
              : accent
                ? ['rgba(224,80,110,0.28)', 'rgba(224,80,110,0.08)']
                : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
            style={styles.featureArrow}
          >
            <SvgIcon symbol={comingSoon ? '🔒' : '→'} size={30} />
          </LinearGradient>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── INBOX MODAL — reads live messages from props ─────────────────────────────
function InboxModal({ visible, onClose, partnerName, messages, onMarkAllRead, onAcceptGame, onVerifyFeed, myRole }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (visible) {
      onMarkAllRead?.();
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0); slideAnim.setValue(80);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }], maxHeight: height * 0.88 }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon3D symbol="📬" size={44} colors={['#F08FA0', '#E0506E', '#B23E54']} shadowColor="#E0506E" />
              <View>
                <Text style={styles.modalTitle}>shared inbox</Text>
                <Text style={styles.modalSub}>your & {partnerName || "partner"}'s messages</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'messages', value: messages.length, color: '#F08FA0' },
              { label: 'letters',  value: messages.filter(m => m.type === 'letter').length, color: '#b48be8' },
              { label: 'moods',    value: messages.filter(m => m.type === 'mood').length,   color: '#fbbf24' },
            ].map(s => (
              <LinearGradient key={s.label}
                colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']}
                style={{ flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <Text style={{ fontSize: 22, fontWeight: '900', color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 1 }}>{s.label}</Text>
              </LinearGradient>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.5 }}>
            <View style={{ gap: 12 }}>
              {messages.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Icon3D symbol="🕊️" size={60} colors={['#94a3b8', '#64748b', '#334155']} shadowColor="#64748b" />
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', marginTop: 16, fontWeight: '700' }}>no messages yet</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', marginTop: 6, textAlign: 'center', maxWidth: 240 }}>
                    write a letter or send a mood — they'll appear right here
                  </Text>
                </View>
              ) : (
                messages.map((msg, i) => (
                  <InboxItem key={msg.id} msg={msg} index={i} onAccept={onAcceptGame} onVerifyFeed={onVerifyFeed} myRole={myRole} />
                ))
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function InboxItem({ msg, index, onAccept, onVerifyFeed, myRole }) {
  const slide = useRef(new Animated.Value(30)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 350, delay: index * 70, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 350, delay: index * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const isLetter    = msg.type === 'letter';
  const isGame      = msg.type === 'game' || msg.type === 'quiz';
  const isQuiz      = msg.type === 'quiz';
  const isComplaint = msg.type === 'complaint';
  const isFeed      = msg.type === 'feed';
  const isFromMe = msg.from === 'you';
  // Partner asked me to verify their challenge → I can approve/reject it.
  const canVerifyFeed = isFeed && !isFromMe && msg.meta?.challengeid;

  const theme = isFeed
    ? {
        grad:          ['rgba(236,72,153,0.18)', 'rgba(157,23,77,0.09)', 'rgba(12,12,22,0.97)'],
        strip:         ['#fbcfe8', '#ec4899'],
        border:        'rgba(236,72,153,0.3)',
        iconColors:    ['#fce7f3', '#f472b6', '#be185d'],
        iconShadow:    '#ec4899',
        accent:        '#f9a8d4',
        contentBg:     'rgba(236,72,153,0.08)',
        contentBorder: 'rgba(236,72,153,0.18)',
      }
    : isComplaint
    ? {
        grad:          ['rgba(245,158,11,0.18)', 'rgba(180,83,9,0.09)', 'rgba(12,12,22,0.97)'],
        strip:         ['#fde68a', '#f59e0b'],
        border:        'rgba(245,158,11,0.3)',
        iconColors:    ['#fef3c7', '#fbbf24', '#b45309'],
        iconShadow:    '#f59e0b',
        accent:        '#fcd34d',
        contentBg:     'rgba(245,158,11,0.08)',
        contentBorder: 'rgba(245,158,11,0.18)',
      }
    : isGame
    ? {
        grad:          ['rgba(34,197,94,0.18)', 'rgba(21,128,61,0.09)', 'rgba(12,12,22,0.97)'],
        strip:         ['#bbf7d0', '#22c55e'],
        border:        'rgba(34,197,94,0.3)',
        iconColors:    ['#dcfce7', '#4ade80', '#15803d'],
        iconShadow:    '#22c55e',
        accent:        '#86efac',
        contentBg:     'rgba(34,197,94,0.08)',
        contentBorder: 'rgba(34,197,94,0.18)',
      }
    : isLetter
    ? {
        grad:          ['rgba(167,139,250,0.18)', 'rgba(109,40,217,0.09)', 'rgba(12,12,22,0.97)'],
        strip:         ['#ddd6fe', '#7c3aed'],
        border:        'rgba(167,139,250,0.3)',
        iconColors:    ['#ede9fe', '#a78bfa', '#6d28d9'],
        iconShadow:    '#7c3aed',
        accent:        '#c4b5fd',
        contentBg:     'rgba(167,139,250,0.08)',
        contentBorder: 'rgba(167,139,250,0.18)',
      }
    : {
        grad:          ['rgba(224,147,159,0.18)', 'rgba(201,24,74,0.09)', 'rgba(12,12,22,0.97)'],
        strip:         ['#ffc2d4', '#E0506E'],
        border:        'rgba(224,147,159,0.3)',
        iconColors:    ['#ffc2d4', '#E0506E', '#7A2738'],
        iconShadow:    '#E0506E',
        accent:        '#F08FA0',
        contentBg:     'rgba(224,147,159,0.08)',
        contentBorder: 'rgba(224,147,159,0.18)',
      };

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      <View style={{
        borderRadius: 22, overflow: 'hidden',
        borderWidth: 1.5, borderColor: theme.border,
        shadowColor: theme.iconShadow,
        shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
      }}>
        {/* Coloured accent strip across the top */}
        <LinearGradient
          colors={theme.strip}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 3 }}
        />

        <LinearGradient
          colors={theme.grad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: 18 }}
        >
          {/* Header row: icon + from + type tag + time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Icon3D
              symbol={isLetter ? '💌' : (msg.emoji || (isComplaint ? '📮' : '🎮'))}
              size={54}
              colors={theme.iconColors}
              shadowColor={theme.iconShadow}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isFromMe ? '#ffffff' : theme.accent, textTransform: 'lowercase', letterSpacing: 0.2 }}>
                  {isFromMe ? 'from you' : `from ${msg.fromName || 'partner'}`}
                </Text>
                <View style={{
                  paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100,
                  backgroundColor: `${theme.accent}28`,
                  borderWidth: 1, borderColor: `${theme.accent}55`,
                }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: theme.accent, textTransform: 'lowercase', letterSpacing: 1.2 }}>
                    {isLetter ? 'letter' : isGame ? 'invite' : isComplaint ? 'complaint' : isFeed ? 'challenge' : 'mood'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'lowercase' }}>
                {getRelativeTime(msg.timestamp)}
              </Text>
            </View>
          </View>

          {/* Content panel */}
          <View style={{
            backgroundColor: theme.contentBg, borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: theme.contentBorder,
          }}>
            {isFeed ? (
              <>
                <Text style={{
                  fontSize: 9, color: theme.accent, textTransform: 'lowercase',
                  letterSpacing: 2.5, marginBottom: 10, opacity: 0.8,
                }}>
                  ✦  challenge check
                </Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22, textTransform: 'lowercase' }}>
                  {isFromMe ? 'you' : (msg.fromName || 'partner')} {msg.content}
                </Text>
                {canVerifyFeed ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity onPress={() => onVerifyFeed?.(msg, true)} activeOpacity={0.85} style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}>
                      <LinearGradient colors={['#4ade80', '#22c55e', '#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#04210f', fontWeight: '900', textTransform: 'lowercase', letterSpacing: 0.3 }}>verified ✓ +10</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onVerifyFeed?.(msg, false)} activeOpacity={0.85} style={{ paddingHorizontal: 16, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>not yet</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textTransform: 'lowercase', marginTop: 10 }}>
                    waiting for partner to verify…
                  </Text>
                )}
              </>
            ) : isGame ? (
              <>
                <Text style={{
                  fontSize: 9, color: theme.accent, textTransform: 'lowercase',
                  letterSpacing: 2.5, marginBottom: 10, opacity: 0.8,
                }}>
                  ✦  game invite
                </Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22, textTransform: 'lowercase' }}>
                  {isFromMe ? 'you invited' : `${msg.fromName || 'partner'} invites you`} to play
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#ffffff', textTransform: 'lowercase', letterSpacing: -0.5, marginTop: 4 }}>
                  {msg.content}
                </Text>
                {!isFromMe ? (
                  <TouchableOpacity onPress={() => onAccept?.(msg)} activeOpacity={0.85} style={{ marginTop: 14, borderRadius: 14, overflow: 'hidden' }}>
                    <LinearGradient colors={['#4ade80', '#22c55e', '#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#04210f', fontWeight: '900', textTransform: 'lowercase', letterSpacing: 0.3 }}>accept & play →</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textTransform: 'lowercase', marginTop: 10 }}>
                    waiting for partner to accept…
                  </Text>
                )}
              </>
            ) : isLetter ? (
              <>
                <Text style={{
                  fontSize: 9, color: theme.accent, textTransform: 'lowercase',
                  letterSpacing: 2.5, marginBottom: 10, opacity: 0.8,
                }}>
                  ✦  {isFromMe ? 'your words' : `${msg.fromName || 'their'}'s words`}
                </Text>
                <Text style={{
                  fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 23,
                  fontStyle: 'italic', textTransform: 'lowercase',
                }}>
                  "{msg.content}"
                </Text>
                <Text style={{
                  fontSize: 11, color: theme.accent, fontStyle: 'italic',
                  marginTop: 12, textAlign: 'right', textTransform: 'lowercase', opacity: 0.6,
                }}>
                  — always yours  ♥
                </Text>
              </>
            ) : isComplaint ? (
              <>
                <Text style={{
                  fontSize: 9, color: theme.accent, textTransform: 'lowercase',
                  letterSpacing: 2.5, marginBottom: 10, opacity: 0.8,
                }}>
                  {msg.emoji || '📮'}  a gentle complaint
                </Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 23 }}>
                  {msg.content}
                </Text>
                <Text style={{
                  fontSize: 11, color: theme.accent, marginTop: 12, textTransform: 'lowercase', opacity: 0.7,
                }}>
                  {isFromMe ? 'sort it out together →' : 'hear them out — same team 🤍'}
                </Text>
              </>
            ) : (
              <>
                <Text style={{
                  fontSize: 9, color: theme.accent, textTransform: 'lowercase',
                  letterSpacing: 2.5, marginBottom: 10, opacity: 0.8,
                }}>
                  ✦  feeling
                </Text>
                <Text style={{
                  fontSize: 24, fontWeight: '900', color: '#ffffff',
                  textTransform: 'lowercase', letterSpacing: -0.5,
                }}>
                  {msg.content}
                </Text>
                <Text style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.28)',
                  textTransform: 'lowercase', marginTop: 8,
                }}>
                  shared with love
                </Text>
              </>
            )}
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

// ─── Letter Modal — calls onSend to push into real inbox ──────────────────────
function LetterModal({ visible, onClose, partnerName, onSend }) {
  const [letter, setLetter]   = useState('');
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  const PROMPTS = [
    'what made me smile thinking of you today...',
    'one thing i love about us is...',
    'i\'m grateful for you because...',
    'if i could hold your hand right now...',
    'my favourite memory of us is...',
  ];
  const [prompt] = useState(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  useEffect(() => {
    if (visible) {
      setSent(false); setLetter('');
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else { fadeAnim.setValue(0); slideAnim.setValue(80); }
  }, [visible]);

  const handleSend = () => {
    if (!letter.trim()) return;
    setSending(true);
    setTimeout(() => {
      onSend?.({
        id: Date.now().toString(), type: 'letter', from: 'you', fromName: 'you',
        emoji: '💌', content: letter, timestamp: new Date(), read: false,
      });
      setSending(false); setSent(true);
    }, 1400);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon3D symbol="💌" size={44} colors={['#F08FA0', '#E0506E', '#7A2738']} shadowColor="#E0506E" />
                <View>
                  <Text style={styles.modalTitle}>write a letter</Text>
                  <Text style={styles.modalSub}>to {partnerName || 'your person'}, with love</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {!sent ? (
              <>
                <View style={styles.promptChip}>
                  <Text style={{ fontSize: 10, color: 'rgba(224,147,159,0.5)', letterSpacing: 2, textTransform: 'lowercase' }}>✦  inspiration</Text>
                  <Text style={styles.promptText}>{prompt}</Text>
                </View>
                <LinearGradient
                  colors={['rgba(224,80,110,0.06)', 'rgba(14,14,24,0.95)']}
                  style={styles.paperWrap}
                >
                  {Array.from({ length: 9 }).map((_, i) => (
                    <View key={i} style={[styles.ruledLine, { top: 52 + i * 30 }]} />
                  ))}
                  <Text style={styles.paperDear}>dear {partnerName || 'my love'},</Text>
                  <TextInput
                    style={styles.paperInput}
                    placeholder="pour your heart out here..."
                    placeholderTextColor="rgba(255,255,255,0.1)"
                    value={letter} onChangeText={setLetter}
                    multiline textAlignVertical="top" autoFocus
                  />
                  <Text style={styles.paperSign}>— always yours  ♥</Text>
                </LinearGradient>
                <View style={{ gap: 10, marginTop: 16 }}>
                  <PrimaryButton label={sending ? 'sealing with love...' : 'send letter'} icon={sending ? undefined : '💌'} onPress={handleSend} disabled={!letter.trim() || sending} />
                  <GhostButton label="save as draft" onPress={onClose} />
                </View>
              </>
            ) : (
              <View style={styles.sentWrap}>
                <HeartbeatRing size={130} />
                <Icon3D symbol="💌" size={80} colors={['#F08FA0', '#E0506E', '#7A2738']} shadowColor="#E0506E" />
                <Text style={styles.sentTitle}>letter sent ✦</Text>
                <Text style={styles.sentSub}>your words have flown to {partnerName || 'your person'}'s heart. check the shared inbox.</Text>
                <View style={{ marginTop: 24, width: '100%', gap: 10 }}>
                  <PrimaryButton label="write another" icon="✦" onPress={() => { setSent(false); setLetter(''); }} />
                  <GhostButton label="close" onPress={onClose} />
                </View>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Coin Modal ───────────────────────────────────────────────────────────────
function CoinModal({ visible, onClose }) {
  const [choice, setChoice]     = useState(null);
  const [result, setResult]     = useState(null);
  const [flipping, setFlipping] = useState(false);
  const [score, setScore]       = useState({ wins: 0, losses: 0 });
  const flipAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setChoice(null); setResult(null);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else { fadeAnim.setValue(0); slideAnim.setValue(80); }
  }, [visible]);

  const handleFlip = () => {
    if (!choice || flipping) return;
    setFlipping(true); setResult(null); bounceAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -40, duration: 200, useNativeDriver: true }),
      Animated.loop(
        Animated.timing(flipAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        { iterations: 7 }
      ),
      Animated.timing(bounceAnim, { toValue: 0, duration: 400, easing: Easing.bounce, useNativeDriver: true }),
    ]).start(() => {
      flipAnim.setValue(0);
      const outcome = Math.random() > 0.5 ? 'heads' : 'tails';
      setResult(outcome);
      setScore(s => outcome === choice ? { ...s, wins: s.wins + 1 } : { ...s, losses: s.losses + 1 });
      setFlipping(false);
    });
  };

  const coinRotateY = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '0deg'] });
  const won = result && result === choice;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon3D symbol="🪙" size={44} colors={['#C9A86A', '#f59e0b', '#92400e']} shadowColor="#C9A86A" />
              <View>
                <Text style={styles.modalTitle}>flip a coin</Text>
                <Text style={styles.modalSub}>let fate decide</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
            {[{ l: 'wins', v: score.wins, c: '#22c55e' }, { l: 'losses', v: score.losses, c: '#ef4444' }].map(s => (
              <LinearGradient key={s.l} colors={[`${s.c}20`, `${s.c}08`]}
                style={{ alignItems: 'center', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: `${s.c}30` }}>
                <Text style={{ fontSize: 32, fontWeight: '900', color: s.c }}>{s.v}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 1 }}>{s.l}</Text>
              </LinearGradient>
            ))}
          </View>

          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Animated.View style={{ transform: [{ rotateY: coinRotateY }, { translateY: bounceAnim }] }}>
              <LinearGradient
                colors={result === 'tails' ? ['#c0c0c0', '#a0a0a0', '#808080'] : ['#C9A86A', '#f59e0b', '#d97706']}
                style={{
                  width: 120, height: 120, borderRadius: 60,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)',
                  shadowColor: result === 'tails' ? '#c0c0c0' : '#C9A86A',
                  shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 24,
                }}>
                <View style={{ position: 'absolute', top: 14, left: 22, width: 45, height: 25, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ rotate: '-20deg' }] }} />
                <View style={{ zIndex: 1 }}>
                  <SvgIcon symbol={result === 'tails' ? '🦅' : '♥'} size={100} />
                </View>
              </LinearGradient>
            </Animated.View>
            {result && (
              <LinearGradient
                colors={won ? ['rgba(34,197,94,0.2)', 'rgba(34,197,94,0.05)'] : ['rgba(239,68,68,0.2)', 'rgba(239,68,68,0.05)']}
                style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: won ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '900', color: won ? '#22c55e' : '#ef4444', textTransform: 'lowercase' }}>
                  {result}! {won ? 'you win' : 'you lose'}
                </Text>
              </LinearGradient>
            )}
          </View>

          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'lowercase', letterSpacing: 1.5, textAlign: 'center', marginBottom: 12 }}>pick your side</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
            {['heads', 'tails'].map(side => (
              <TouchableOpacity key={side} onPress={() => setChoice(side)} activeOpacity={0.8} style={{ flex: 1 }}>
                <LinearGradient
                  colors={choice === side ? ['rgba(224,147,159,0.25)', 'rgba(224,80,110,0.1)'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                  style={{
                    padding: 16, borderRadius: 18, alignItems: 'center', gap: 8,
                    borderWidth: 2, borderColor: choice === side ? '#F08FA0' : 'rgba(255,255,255,0.09)',
                  }}>
                  <SvgIcon symbol={side === 'heads' ? '♥' : '🦅'} size={50} />
                  <Text style={[{ fontSize: 13, fontWeight: '800', textTransform: 'lowercase', color: choice === side ? '#F08FA0' : 'rgba(255,255,255,0.4)' }]}>{side}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
          <PrimaryButton label={flipping ? 'flipping...' : 'flip!'} icon={flipping ? undefined : '🪙'} onPress={handleFlip} disabled={!choice || flipping} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Truth or Dare Modal ──────────────────────────────────────────────────────
const TRUTHS = [
  'what\'s the most romantic thing you\'ve secretly planned for us?',
  'what\'s the first thing you noticed about me?',
  'what\'s a dream you\'ve never told anyone?',
  'when did you realise you were falling for me?',
  'what\'s a small thing i do that makes you melt?',
  'what\'s your favourite memory of us so far?',
  'what\'s something you wish i knew about you?',
];
const DARES = [
  'send me a voice note saying "i love you" in 3 different accents',
  'describe me using only symbols (at least 10)',
  'tell me something you\'ve been wanting to say but never did',
  'write me a 2-line poem right now',
  'send a selfie making the silliest face you can',
  'list 5 things you love about us',
  'recreate our first conversation opener, but more dramatic',
];

function TruthDareModal({ visible, onClose }) {
  const [mode, setMode] = useState(null);
  const [card, setCard] = useState(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;
  const cardFlip  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMode(null); setCard(null);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else { fadeAnim.setValue(0); slideAnim.setValue(80); }
  }, [visible]);

  const draw = (m) => {
    setMode(m); cardFlip.setValue(0);
    const pool = m === 'truth' ? TRUTHS : DARES;
    setCard(pool[Math.floor(Math.random() * pool.length)]);
    Animated.spring(cardFlip, { toValue: 1, useNativeDriver: true }).start();
  };

  const cardScale   = cardFlip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.75, 1.06, 1] });
  const cardOpacity = cardFlip.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon3D symbol="🔥" size={44} colors={['#ff9500', '#ff6b00', '#bf4600']} shadowColor="#ff6b00" />
              <View>
                <Text style={styles.modalTitle}>truth or dare</Text>
                <Text style={styles.modalSub}>couples edition — no skipping</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 22 }}>
            {[
              { m: 'truth', symbol: '💬', colors: ['rgba(224,80,110,0.25)', 'rgba(224,80,110,0.08)'], active: 'rgba(224,80,110,0.5)', label: 'truth' },
              { m: 'dare',  symbol: '🔥', colors: ['rgba(255,149,0,0.25)', 'rgba(255,149,0,0.08)'],  active: 'rgba(255,149,0,0.5)',  label: 'dare' },
            ].map(btn => (
              <TouchableOpacity key={btn.m} onPress={() => draw(btn.m)} activeOpacity={0.8} style={{ flex: 1 }}>
                <LinearGradient
                  colors={mode === btn.m ? btn.colors : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                  style={{
                    borderRadius: 18, padding: 18, alignItems: 'center', gap: 8,
                    borderWidth: 2, borderColor: mode === btn.m ? btn.active : 'rgba(255,255,255,0.09)',
                  }}>
                  <SvgIcon symbol={btn.symbol} size={54} />
                  <Text style={{ fontSize: 15, fontWeight: '900', textTransform: 'lowercase', color: mode === btn.m ? '#fff' : 'rgba(255,255,255,0.35)' }}>{btn.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {card ? (
            <Animated.View style={{ opacity: cardOpacity, transform: [{ scale: cardScale }] }}>
              <LinearGradient
                colors={mode === 'truth'
                  ? ['rgba(224,80,110,0.15)', 'rgba(224,80,110,0.05)', 'rgba(14,14,24,0.98)']
                  : ['rgba(255,149,0,0.15)', 'rgba(255,149,0,0.05)', 'rgba(14,14,24,0.98)']}
                style={{
                  borderRadius: 24, padding: 28, alignItems: 'center',
                  borderWidth: 1.5, borderColor: mode === 'truth' ? 'rgba(224,80,110,0.4)' : 'rgba(255,149,0,0.4)',
                  shadowColor: mode === 'truth' ? '#E0506E' : '#ff9500',
                  shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20,
                }}>
                <View style={{ marginBottom: 16 }}>
                  <SvgIcon symbol={mode === 'truth' ? '💬' : '🔥'} size={80} />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', textTransform: 'lowercase', textAlign: 'center', lineHeight: 26 }}>{card}</Text>
                <TouchableOpacity onPress={() => draw(mode)} style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: mode === 'truth' ? 'rgba(224,80,110,0.4)' : 'rgba(255,149,0,0.4)' }} activeOpacity={0.7}>
                  <Text style={{ fontSize: 13, fontWeight: '700', textTransform: 'lowercase', color: mode === 'truth' ? '#F08FA0' : '#ff9500' }}>draw another →</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          ) : (
            <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
              style={{ borderRadius: 24, padding: 36, alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed' }}>
              <SvgIcon symbol="🃏" size={90} />
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)', textTransform: 'lowercase', textAlign: 'center' }}>
                pick truth or dare to draw your card
              </Text>
            </LinearGradient>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Mood Modal — calls onSend to push into real inbox ────────────────────────
const MOODS = [
  { e: '🥰', l: 'head over heels' },
  { e: '😌', l: 'peacefully yours' },
  { e: '🥺', l: 'missing you tons' },
  { e: '😘', l: 'sending kisses' },
  { e: '🔥', l: 'absolutely feral' },
  { e: '🌙', l: 'dreaming of us' },
  { e: '😭', l: 'emotionally spiral' },
  { e: '🦋', l: 'butterflies still' },
];

function MoodModal({ visible, onClose, onSend }) {
  const [selected, setSelected] = useState(null);
  const [sent, setSent]         = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (visible) {
      setSelected(null); setSent(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else { fadeAnim.setValue(0); slideAnim.setValue(80); }
  }, [visible]);

  const handleSend = () => {
    if (selected === null) return;
    onSend?.({
      id: Date.now().toString(), type: 'mood', from: 'you', fromName: 'you',
      emoji: MOODS[selected].e, content: MOODS[selected].l, timestamp: new Date(), read: false,
    });
    setSent(true);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon3D symbol="🌈" size={44} colors={['#f472b6', '#a855f7', '#6366f1']} shadowColor="#a855f7" />
              <View>
                <Text style={styles.modalTitle}>send your mood</Text>
                <Text style={styles.modalSub}>let them feel exactly what you feel</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {!sent ? (
            <>
              <ScrollView style={{ maxHeight: height * 0.5 }} contentContainerStyle={styles.moodGrid} showsVerticalScrollIndicator={false}>
                {MOODS.map((m, i) => (
                  <TouchableOpacity key={i} onPress={() => setSelected(i)} activeOpacity={0.8} style={{ width: '48%' }}>
                    <LinearGradient
                      colors={selected === i
                        ? ['rgba(224,80,110,0.22)', 'rgba(224,80,110,0.08)']
                        : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                      style={[styles.moodCard, {
                        borderColor: selected === i ? '#F08FA0' : 'rgba(255,255,255,0.08)',
                        borderWidth: selected === i ? 2 : 1,
                        shadowColor: selected === i ? '#E0506E' : 'transparent',
                        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
                      }]}>
                      <SvgIcon symbol={m.e} size={70} />
                      <Text style={[styles.moodLabel, selected === i && { color: '#F08FA0', fontWeight: '800' }]}>{m.l}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ marginTop: 18 }}>
                <PrimaryButton label="send mood" icon="✦" onPress={handleSend} disabled={selected === null} />
              </View>
            </>
          ) : (
            <View style={styles.sentWrap}>
              <HeartbeatRing size={130} />
              <Icon3D symbol={MOODS[selected]?.e || '🌈'} size={80}
                colors={['#f472b6', '#a855f7', '#6366f1']} shadowColor="#a855f7" />
              <Text style={styles.sentTitle}>mood sent!</Text>
              <Text style={styles.sentSub}>they'll feel "{MOODS[selected]?.l}" from you. check your shared inbox.</Text>
              <View style={{ marginTop: 24, width: '100%' }}>
                <GhostButton label="close" onPress={onClose} />
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Complaint box → lands in the shared inbox ────────────────────────────────
const COMPLAINT_TONES = [
  { e: '🌤️', l: 'just a nudge' },
  { e: '⛅',  l: 'bugging me' },
  { e: '🌧️', l: 'really upset' },
];
function ComplaintModal({ visible, onClose, partnerName, onSend }) {
  const [text, setText] = useState('');
  const [tone, setTone] = useState(0);
  const [sent, setSent] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (visible) {
      setText(''); setTone(0); setSent(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else { fadeAnim.setValue(0); slideAnim.setValue(80); }
  }, [visible]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend?.({
      id: Date.now().toString(), type: 'complaint', from: 'you', fromName: 'you',
      emoji: COMPLAINT_TONES[tone].e, content: text.trim(), timestamp: new Date(), read: false,
    });
    setSent(true);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }], borderColor: 'rgba(245,158,11,0.3)' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon3D symbol="📮" size={44} colors={['#fde68a', '#f59e0b', '#b45309']} shadowColor="#f59e0b" />
                <View>
                  <Text style={styles.modalTitle}>complaint box</Text>
                  <Text style={styles.modalSub}>say it gently to {partnerName || 'your person'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {!sent ? (
              <>
                {/* tone */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {COMPLAINT_TONES.map((t, i) => (
                    <TouchableOpacity key={i} onPress={() => setTone(i)} activeOpacity={0.85}
                      style={{
                        flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14,
                        backgroundColor: tone === i ? 'rgba(245,158,11,0.16)' : 'rgba(255,255,255,0.04)',
                        borderWidth: tone === i ? 2 : 1, borderColor: tone === i ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                      }}>
                      <Text style={{ fontSize: 24 }}>{t.e}</Text>
                      <Text style={{ fontSize: 10, color: tone === i ? '#fbbf24' : 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'lowercase', marginTop: 5 }}>{t.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.complaintInput}
                  value={text} onChangeText={setText}
                  placeholder="what's on your mind? keep it kind — you're on the same team."
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline textAlignVertical="top" maxLength={1000}
                />

                <View style={{ marginTop: 16 }}>
                  <PrimaryButton label="drop in the box" icon="📮" onPress={handleSend} disabled={!text.trim()} />
                </View>
              </>
            ) : (
              <View style={styles.sentWrap}>
                <HeartbeatRing size={130} color="#f59e0b" />
                <Icon3D symbol="📮" size={80} colors={['#fde68a', '#f59e0b', '#b45309']} shadowColor="#f59e0b" />
                <Text style={styles.sentTitle}>dropped in the box</Text>
                <Text style={styles.sentSub}>it's in your shared inbox now. talk it through together. 🤍</Text>
                <View style={{ marginTop: 24, width: '100%' }}>
                  <GhostButton label="close" onPress={onClose} />
                </View>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Partner card ─────────────────────────────────────────────────────────────
function PartnerCard({ myName, myRole, partnerPresence }) {
  const status     = getStatusInfo(partnerPresence?.lastseen);
  const hasPartner = !!partnerPresence;

  const fadeIn     = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const waitPulse  = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, delay: 400, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.18, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1,    duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (hasPartner) return;
    Animated.loop(Animated.sequence([
      Animated.timing(waitPulse, { toValue: 0.9, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(waitPulse, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [hasPartner]);

  const initial = (name) => ((name || '?')[0] || '?').toUpperCase();

  const myAvatarColors    = ['rgba(224,80,110,0.35)', 'rgba(224,80,110,0.12)'];
  const activeAvatarColors = status.online
    ? ['rgba(34,197,94,0.28)', 'rgba(34,197,94,0.08)']
    : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.03)'];
  const activeAvatarBorder = status.online ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.14)';

  return (
    <Animated.View style={{ width: '100%', marginBottom: 22, opacity: fadeIn }}>
      <LinearGradient
        colors={['rgba(224,80,110,0.13)', 'rgba(224,80,110,0.04)', 'rgba(10,10,22,0.97)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 26, padding: 22, flexDirection: 'row', alignItems: 'center',
          borderWidth: 1.5, borderColor: 'rgba(224,80,110,0.22)',
          shadowColor: '#E0506E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 8,
        }}
      >
        {/* ── Me ── */}
        <View style={{ flex: 1, alignItems: 'center', gap: 9 }}>
          <LinearGradient colors={myAvatarColors}
            style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(224,80,110,0.45)' }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>{initial(myName)}</Text>
          </LinearGradient>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.3 }} numberOfLines={1}>
            {myName || 'you'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e',
              shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 }} />
            <Text style={{ fontSize: 9, color: '#22c55e', textTransform: 'lowercase', fontWeight: '700', letterSpacing: 0.6 }}>you</Text>
          </View>
        </View>

        {/* ── Beating heart ── */}
        <Animated.View style={{ paddingHorizontal: 6, transform: [{ scale: heartScale }] }}>
          <Svg width={34} height={34} viewBox="0 0 24 24">
            <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z"
              fill="#E0506E" fillOpacity="0.9"/>
          </Svg>
        </Animated.View>

        {/* ── Partner ── */}
        <View style={{ flex: 1, alignItems: 'center', gap: 9 }}>
          {!hasPartner ? (
            <>
              <Animated.View style={{ opacity: waitPulse,
                width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <Svg width={24} height={24} viewBox="0 0 24 24">
                  <Path d="M9 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="rgba(255,255,255,0.28)" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
                  <Circle cx="12" cy="17" r="1" fill="rgba(255,255,255,0.28)"/>
                  <Circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4"/>
                </Svg>
              </Animated.View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.22)', textTransform: 'lowercase' }}>waiting...</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', textTransform: 'lowercase', letterSpacing: 0.5, textAlign: 'center' }}>not yet joined</Text>
            </>
          ) : (
            <>
              <LinearGradient colors={activeAvatarColors}
                style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: activeAvatarBorder }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>{initial(partnerPresence.name)}</Text>
              </LinearGradient>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.3 }} numberOfLines={1}>
                {partnerPresence.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: status.color,
                  shadowColor: status.online ? '#22c55e' : 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 }} />
                <Text style={{ fontSize: 9, color: status.color, textTransform: 'lowercase', fontWeight: '700', letterSpacing: 0.5 }}>
                  {status.label}
                </Text>
              </View>
            </>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── MAIN CASTLE SCREEN ───────────────────────────────────────────────────────
export default function Castle({ onNavigate, params = {} }) {
  const {
    role     = 'creator',
    homeName = 'our sanctuary',
    linkCode = '---',
    user     = { name: 'you', gender: 'unknown' },
  } = params;

  const [messages,        setMessages]        = useState([]);
  const [activeModal,     setActiveModal]     = useState(null);
  const [partnerPresence, setPartnerPresence] = useState(null);
  const [inventory,       setInventory]       = useState([]);
  const [feedBoard,       setFeedBoard]       = useState({ creator: { points: 0, count: 0 }, joiner: { points: 0, count: 0 } });

  // Transform server message → local format the InboxItem component expects
  const toLocal = (msg) => ({
    id:        msg._id || msg.id,
    type:      msg.type,
    from:      msg.from === role ? 'you' : msg.from,
    fromName:  msg.from === role ? 'you' : (msg.fromname || msg.fromName || msg.from),
    emoji:     msg.emoji,
    game:      msg.game,
    meta:      msg.meta || null,
    content:   msg.content,
    timestamp: new Date(msg.createdat || msg.timestamp),
    read:      msg.readby ? msg.readby.includes(role) : msg.read,
  });

  // ── Fetch inbox from server ────────────────────────────────────────────────
  const loadInbox = useCallback(async () => {
    if (!linkCode || linkCode === '---') return;
    try {
      const res = await fetch(`${API_BASE}/api/inbox/${linkCode}`);
      if (res.ok) {
        const data = await res.json();
        setMessages((data.messages || []).map(toLocal));
      }
    } catch (_) {}
  }, [linkCode, role]);

  // ── Send a message: optimistic local add + persist to server ──────────────
  const addMessage = useCallback(async (msg) => {
    setMessages(prev => [msg, ...prev]);
    if (!linkCode || linkCode === '---') return;
    try {
      await fetch(`${API_BASE}/api/inbox/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          linkcode: linkCode, from: role,
          fromname: user?.name || role,
          type: msg.type, emoji: msg.emoji, content: msg.content,
        }),
      });
    } catch (_) {}
  }, [linkCode, role, user]);

  // ── Mark all read: local state + server ───────────────────────────────────
  const markAllRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
    if (!linkCode || linkCode === '---') return;
    fetch(`${API_BASE}/api/inbox/read`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ linkcode: linkCode, role }),
    }).catch(() => {});
  }, [linkCode, role]);

  const unreadCount = messages.filter(m => !m.read).length;
  const letterCount = messages.filter(m => m.type === 'letter').length;
  const moodCount   = messages.filter(m => m.type === 'mood').length;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Inbox: load on mount + poll every 20 s for partner messages ───────────
  useEffect(() => {
    loadInbox();
    const poll = setInterval(loadInbox, 20000);
    return () => clearInterval(poll);
  }, [loadInbox]);

  // ── Presence: heartbeat + partner polling ─────────────────────────────────
  useEffect(() => {
    if (!linkCode || linkCode === '---') return;

    const sync = () => {
      postPresence(linkCode, role, user?.name || 'partner');
      fetchPresence(linkCode, role).then(p => { if (p) setPartnerPresence(p); });
    };
    sync();
    const heartbeat = setInterval(() => postPresence(linkCode, role, user?.name || 'partner'), HEARTBEAT_INTERVAL);
    const poll      = setInterval(() => fetchPresence(linkCode, role).then(p => { if (p) setPartnerPresence(p); }), PRESENCE_POLL);
    return () => { clearInterval(heartbeat); clearInterval(poll); };
  }, [linkCode, role]);

  // ── Load inventory (shop items bought) ──────────────────────────────────────
  useEffect(() => {
    if (!linkCode || linkCode === '---') return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/shop/inventory/${linkCode}/${role}`);
        if (res.ok) { const data = await res.json(); setInventory(data.items || []); }
      } catch (_) {}
    })();
  }, [linkCode, role]);

  // ── Feed challenge leaderboard ──────────────────────────────────────────────
  const loadFeedBoard = useCallback(async () => {
    if (!linkCode || linkCode === '---') return;
    try {
      const res = await fetch(`${API_BASE}/api/feed/leaderboard/${linkCode}`);
      if (res.ok) { const d = await res.json(); if (d.leaderboard) setFeedBoard(d.leaderboard); }
    } catch (_) {}
  }, [linkCode]);

  useEffect(() => {
    loadFeedBoard();
    const t = setInterval(loadFeedBoard, 20000);
    return () => clearInterval(t);
  }, [loadFeedBoard]);

  // ── Verify a partner's feed challenge from the inbox ────────────────────────
  const verifyFeed = useCallback(async (msg, approved) => {
    const m = msg?.meta;
    if (!m?.challengeid) return;
    // optimistic: drop the message
    setMessages(prev => prev.filter(x => x.id !== msg.id));
    try {
      await fetch(`${API_BASE}/api/feed/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: linkCode, doerrole: m.doerrole, challengeid: m.challengeid, date: m.date, approved }),
      });
    } catch (_) {}
    loadFeedBoard();
    loadInbox();
  }, [linkCode, loadFeedBoard, loadInbox]);

  const partnerName = partnerPresence?.name || (role === 'creator' ? 'your partner' : 'your love');

  const sparkles = [
    { x: 30,         y: height * 0.08, delay: 800 },
    { x: width - 50, y: height * 0.14, delay: 1400 },
    { x: width * 0.5,y: height * 0.22, delay: 2000 },
    { x: 60,         y: height * 0.38, delay: 600 },
    { x: width - 30, y: height * 0.45, delay: 2800 },
    { x: width * 0.2,y: height * 0.62, delay: 1800 },
    { x: width - 70, y: height * 0.7,  delay: 3200 },
  ];

  const particles = [
    { x: -20,        y: height * 0.06, size: 90,  delay: 0,   color: '#E0506E' },
    { x: width - 65, y: height * 0.2,  size: 60,  delay: 400, color: '#E0506E' },
    { x: width * 0.4,y: height * 0.7,  size: 45,  delay: 700, color: '#B23E54' },
    { x: -25,        y: height * 0.5,  size: 55,  delay: 200, color: '#E0506E' },
    { x: width - 40, y: height * 0.62, size: 40,  delay: 550, color: '#F08FA0' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={TC.bg} />

      {/* Space background */}
      <SpaceBackground />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Vignette - darkens the edges for editorial depth */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
          locations={[0, 0.2, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {sparkles.map((s, i) => <Sparkle key={i} {...s} />)}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces>
        <Animated.View style={{ width: '100%', alignItems: 'center', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Top nav */}
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => onNavigate?.('userhome')} style={styles.homeNavBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['rgba(224,80,110,0.22)', 'rgba(224,80,110,0.08)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.homeNavGrad}
              >
                <SvgIcon symbol="🏰" size={30} />
                <Text style={styles.homeNavText}>home</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
                <Text style={[styles.statusTxt, { color: '#22c55e' }]}>linked</Text>
              </View>
              <View style={styles.rolePill}>
                <Text style={styles.roleTxt}>{role}</Text>
              </View>
            </View>
          </View>

          <HomeNameBanner name={homeName} />

          {/* Hero section */}
          <View style={styles.heroSection}>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative', width: 200, height: 200 }}>
              <HeartbeatRing size={200} color="#E0506E" />
              <HeartbeatRing size={160} color="#E0506E" />
              <Icon3D
                symbol="🏰"
                size={110}
                colors={['#F08FA0', '#E0506E', '#7A2738', '#5A1C28']}
                shadowColor="#E0506E"
              />
            </View>
            <HomeTitle name={homeName} />
            <Text style={styles.heroTagline}>your shared sanctuary is alive and beating</Text>
            <View style={styles.bondPill}>
              <Text style={styles.bondLabel}>bond code</Text>
              <Text style={{ color: 'rgba(224,147,159,0.3)', marginHorizontal: 4 }}>|</Text>
              <Text style={styles.bondCode}>{linkCode}</Text>
            </View>

            {/* SHOWCASE — items bought from the shop, on display in the home */}
            {inventory.length > 0 && (
              <View style={styles.showcase}>
                <View style={styles.showcaseHead}>
                  <Text style={styles.showcaseTitle}>✨ your collection</Text>
                  <View style={styles.showcaseCount}>
                    <Text style={styles.showcaseCountTxt}>{inventory.length}</Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingHorizontal: 4, paddingVertical: 6 }}
                >
                  {inventory.slice(0, 12).map((item, i) => {
                    const cat   = (item.itemid || '').split('_')[0];
                    const color = cat === 'gift' ? '#E0506E' : cat === 'badge' ? '#a855f7' : '#0ea5e9';
                    const emoji = ITEM_EMOJI[item.itemid] || '🎁';
                    return (
                      <View key={i} style={{ alignItems: 'center', width: 78 }}>
                        <LinearGradient
                          colors={[`${color}33`, `${color}11`, 'rgba(10,10,20,0.95)']}
                          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                          style={[styles.showcaseItem, { borderColor: `${color}55`, shadowColor: color }]}
                        >
                          <Text style={{ fontSize: 36 }}>{emoji}</Text>
                          {item.source === 'gifted' && (
                            <View style={[styles.giftedTag, { backgroundColor: color }]}>
                              <Text style={styles.giftedTagTxt}>♥</Text>
                            </View>
                          )}
                        </LinearGradient>
                        <Text style={styles.showcaseName} numberOfLines={1}>
                          {item.itemname || cat}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* CHALLENGE LEADERBOARD — feed challenge scores for both partners */}
            {(() => {
              const partnerRole = role === 'creator' ? 'joiner' : 'creator';
              const myPts   = feedBoard[role]?.points || 0;
              const myCnt   = feedBoard[role]?.count || 0;
              const pPts    = feedBoard[partnerRole]?.points || 0;
              const pCnt    = feedBoard[partnerRole]?.count || 0;
              const iLead   = myPts >= pPts;
              return (
                <TouchableOpacity activeOpacity={0.85} onPress={() => onNavigate?.('feed', params)} style={styles.lbCard}>
                  <Text style={styles.lbTitle}>🏆</Text>
                  <View style={styles.lbScore}>
                    <Text style={[styles.lbName, iLead && { color: '#F08FA0' }]} numberOfLines={1}>{user?.name || 'you'}</Text>
                    <Text style={[styles.lbPts, { color: '#F08FA0' }]}>{myPts}</Text>
                  </View>
                  <Text style={styles.lbVs}>vs</Text>
                  <View style={styles.lbScore}>
                    <Text style={[styles.lbPts, { color: '#c4b5fd' }]}>{pPts}</Text>
                    <Text style={[styles.lbName, (!iLead && pPts > 0) && { color: '#c4b5fd' }]} numberOfLines={1}>{partnerName}</Text>
                  </View>
                  <Text style={styles.lbGo}>→</Text>
                </TouchableOpacity>
              );
            })()}
          </View>

          {/* Partner card — shows both names + online status */}
          <PartnerCard
            myName={user?.name}
            myRole={role}
            partnerPresence={partnerPresence}
          />

          {/* INBOX BUTTON */}
          <View style={{ width: '100%', marginBottom: 28, marginTop: 4 }}>
            <TouchableOpacity
              onPress={() => setActiveModal('inbox')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(224,80,110,0.12)', 'rgba(224,80,110,0.03)', TC.surface]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center',
                  borderWidth: 1, borderColor: TC.accentLine,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18,
                }}>
                <View style={{ position: 'relative' }}>
                  <Icon3D symbol="📬" size={56} colors={['#F08FA0', '#E0506E', '#7A2738']} shadowColor="#E0506E" />
                  {unreadCount > 0 && (
                    <View style={{
                      position: 'absolute', top: -4, right: -4,
                      minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
                      backgroundColor: '#E0506E', alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2.5, borderColor: '#080810',
                      shadowColor: '#E0506E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 6,
                    }}>
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: '900' }}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', textTransform: 'lowercase', letterSpacing: 0.2, marginBottom: 3 }}>shared inbox</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', lineHeight: 17 }}>
                    {messages.length === 0
                      ? 'send a letter or mood to start filling it'
                      : unreadCount > 0
                        ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''} waiting`
                        : 'all your letters & moods live here'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    {[{ label: `${letterCount} letter${letterCount === 1 ? '' : 's'}`, color: '#b48be8' },
                      { label: `${moodCount} mood${moodCount === 1 ? '' : 's'}`,       color: '#fbbf24' }].map(t => (
                      <View key={t.label} style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, backgroundColor: `${t.color}18`, borderWidth: 1, borderColor: `${t.color}40` }}>
                        <Text style={{ fontSize: 10, color: t.color, fontWeight: '700', textTransform: 'lowercase' }}>{t.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <LinearGradient colors={['rgba(224,80,110,0.35)', 'rgba(224,80,110,0.15)']} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(224,80,110,0.4)' }}>
                  <SvgIcon symbol="→" size={30} />
                </LinearGradient>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Section: connect */}
          <SectionLabel icon="💞" text="your bond" />

          <View style={{ width: '100%', gap: 14, marginBottom: 8 }}>
            <FeatureCard
              icon3dSymbol="💌"
              iconColors={['#F08FA0', '#E0506E', '#7A2738']}
              iconShadow="#E0506E"
              title="write a letter"
              desc="pour your heart out. send a handwritten-style note sealed with love."
              tag="most romantic"
              accent
              onPress={() => setActiveModal('letter')}
            />
            <FeatureCard
              icon3dSymbol="🌈"
              iconColors={['#f472b6', '#a855f7', '#6366f1']}
              iconShadow="#a855f7"
              title="send your mood"
              desc="no words needed. tell them exactly how you feel right now with one tap."
              tag="daily ritual"
              accent
              onPress={() => setActiveModal('mood')}
            />
            <FeatureCard
              icon3dSymbol="📮"
              iconColors={['#fde68a', '#f59e0b', '#b45309']}
              iconShadow="#f59e0b"
              title="complaint box"
              desc="something bothering you? drop it here gently. it lands in your shared inbox so you can sort it out together."
              tag="clear the air"
              onPress={() => setActiveModal('complaint')}
            />
          </View>

          {/* Section: play */}
          <SectionLabel icon="🎮" text="play together" />

          <View style={{ width: '100%', gap: 14, marginBottom: 8 }}>
            <FeatureCard
              icon3dSymbol="🃏"
              iconColors={['#C9A86A', '#f59e0b', '#92400e']}
              iconShadow="#f59e0b"
              title="today's feed"
              desc="10 daily cards — dares, deep questions, trivia, and challenges. swipe through together."
              tag="daily"
              accent
              onPress={() => onNavigate?.('feed', { role, homeName, linkCode, user })}
            />
            <FeatureCard
              icon3dSymbol="🧠"
              iconColors={['#a78bfa', '#7c3aed', '#4c1d95']}
              iconShadow="#7c3aed"
              title="general knowledge quiz"
              desc="invite your partner. both answer, then the truth reveals. correct answers score points."
              tag="head to head"
              accent
              onPress={() => onNavigate?.('quiz', { role, homeName, linkCode, user })}
            />
            <FeatureCard
              icon3dSymbol="🎮"
              iconColors={['#a78bfa', '#7c3aed', '#4c1d95']}
              iconShadow="#7c3aed"
              title="game center"
              desc="pick any game — play solo or invite your partner. includes crash & clutch betting."
              tag="pick & play"
              accent
              onPress={() => onNavigate?.('games', { role, homeName, linkCode, user, menu: true })}
            />
            <FeatureCard
              icon3dSymbol="🎮"
              iconColors={['#34d399', '#10b981', '#065f46']}
              iconShadow="#10b981"
              title="game arena"
              desc="jump into back-to-back live games with your partner — auto-shuffled."
              tag="earn FC"
              onPress={() => onNavigate?.('games', { role, homeName, linkCode, user })}
            />
            <FeatureCard
              icon3dSymbol="🃏"
              iconColors={['#38bdf8', '#0ea5e9', '#0369a1']}
              iconShadow="#0ea5e9"
              title="solo games"
              desc="no partner needed — play the mini-games on your own and still earn fantasy cash."
              tag="solo · earn FC"
              onPress={() => onNavigate?.('games', { role, homeName, linkCode, user, solo: true })}
            />
            <FeatureCard
              icon3dSymbol="🔥"
              iconColors={['#ff9500', '#ff6b00', '#bf4600']}
              iconShadow="#ff6b00"
              title="truth or dare"
              desc="the couples edition. real questions, real dares. no skipping allowed."
              tag="spicy"
              onPress={() => setActiveModal('truth')}
            />
            <FeatureCard
              icon3dSymbol="🪙"
              iconColors={['#C9A86A', '#f59e0b', '#92400e']}
              iconShadow="#C9A86A"
              title="flip a coin"
              desc="can't decide who picks the movie? let fate weigh in. best of 3."
              tag="settle it"
              onPress={() => setActiveModal('coin')}
            />
          </View>

          {/* Section: nest */}
          <SectionLabel icon="🪺" text="your nest" />

          <View style={{ width: '100%', gap: 14, marginBottom: 50 }}>
            <FeatureCard
              icon3dSymbol="📖"
              iconColors={['#fbcfe8', '#ec4899', '#9d174d']}
              iconShadow="#ec4899"
              title="couple diary"
              desc="write down your memories together — first dates, little moments, inside jokes. kept in your home forever."
              tag="forever"
              accent
              onPress={() => onNavigate?.('diary', { role, homeName, linkCode, user })}
            />
            <FeatureCard
              icon3dSymbol="🫙"
              iconColors={['#fde68a', '#f59e0b', '#92400e']}
              iconShadow="#f59e0b"
              title="gift shop"
              desc="spend your fantasy cash on virtual gifts, badges, and surprises for your partner."
              tag="spend FC"
              accent
              onPress={() => onNavigate?.('shop', { role, homeName, linkCode, user })}
            />
            <FeatureCard
              icon3dSymbol="🏆"
              iconColors={['#c4b5fd', '#7c3aed', '#4c1d95']}
              iconShadow="#7c3aed"
              title="home profile"
              desc="your FC balance, game record, owned items, and everything you've gifted each other."
              tag="your story"
              onPress={() => onNavigate?.('homeprofile', { role, homeName, linkCode, user })}
            />
            <FeatureCard
              icon3dSymbol="⏳"
              iconColors={['#93c5fd', '#3b82f6', '#1d4ed8']}
              iconShadow="#3b82f6"
              title="countdown to us"
              desc="set your anniversary date and watch the days, months and years you've built together."
              tag="your story"
              onPress={() => onNavigate?.('countdown', { role, homeName, linkCode, user })}
            />
          </View>

        </Animated.View>
      </ScrollView>

      {/* Modals — wired to live state */}
      <InboxModal
        visible={activeModal === 'inbox'}
        onClose={() => setActiveModal(null)}
        partnerName={partnerName}
        messages={messages}
        onMarkAllRead={markAllRead}
        onVerifyFeed={verifyFeed}
        myRole={role}
        onAcceptGame={(msg) => {
          setActiveModal(null);
          if (msg.type === 'quiz') {
            // Quiz invite → accept and start the shared quiz.
            onNavigate?.('quiz', { role, homeName, linkCode, user, autoAccept: true });
          } else if (msg.game) {
            // Specific game picked in the game centre → jump into that game.
            onNavigate?.('games', { role, homeName, linkCode, user, menu: true, autoAccept: true, game: msg.game });
          } else {
            // Generic arena invite → drop into the auto-alternating arena lobby.
            onNavigate?.('games', { role, homeName, linkCode, user, autoAccept: true });
          }
        }}
      />
      <LetterModal
        visible={activeModal === 'letter'}
        onClose={() => setActiveModal(null)}
        partnerName={partnerName}
        onSend={addMessage}
      />
      <CoinModal      visible={activeModal === 'coin'}   onClose={() => setActiveModal(null)} />
      <TruthDareModal visible={activeModal === 'truth'}  onClose={() => setActiveModal(null)} />
      <MoodModal
        visible={activeModal === 'mood'}
        onClose={() => setActiveModal(null)}
        onSend={addMessage}
      />
      <ComplaintModal
        visible={activeModal === 'complaint'}
        onClose={() => setActiveModal(null)}
        partnerName={partnerName}
        onSend={addMessage}
      />
    </SafeAreaView>
  );
}

// ─── Section label component ──────────────────────────────────────────────────
function SectionLabel({ icon, text }) {
  return (
    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 12 }}>
      <Text style={{ fontSize: 11, color: TC.textMuted, textTransform: 'uppercase', letterSpacing: 3, fontWeight: '700' }}>
        {text}
      </Text>
      <View style={{ height: 1, flex: 1, backgroundColor: TC.hairline }} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: TC.bg },
  scroll: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },

  topNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', marginBottom: 10,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  backBtnText: { fontSize: 17, color: 'rgba(255,255,255,0.6)' },
  homeNavBtn: { borderRadius: 100, overflow: 'hidden' },
  homeNavGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 8, paddingRight: 14, height: 42, borderRadius: 100,
    borderWidth: 1, borderColor: TC.accentLine,
  },
  homeNavText: { fontSize: 12, color: TC.accentSoft, fontWeight: '600', textTransform: 'lowercase', letterSpacing: 0.5 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(127,169,140,0.08)',
    borderWidth: 1, borderColor: 'rgba(127,169,140,0.25)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '600' },
  rolePill: {
    backgroundColor: TC.surface,
    borderWidth: 1, borderColor: TC.hairline,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
  },
  roleTxt: { fontSize: 11, color: TC.textSoft, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },

  heroSection: { width: '100%', alignItems: 'center', paddingVertical: 8 },
  heroTagline: {
    fontSize: 13, color: TC.textMuted,
    textAlign: 'center', marginTop: 8, letterSpacing: 0.3, lineHeight: 19,
  },
  bondPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
    backgroundColor: TC.surface,
    borderWidth: 1, borderColor: TC.hairline,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100,
  },
  bondLabel: { fontSize: 10, color: TC.textMuted, textTransform: 'uppercase', letterSpacing: 1.8 },
  bondCode: { fontSize: 15, color: TC.accentSoft, fontWeight: '700', letterSpacing: 2 },

  // home collection showcase (hero)
  showcase: {
    width: '100%', marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22, paddingVertical: 14, paddingHorizontal: 12,
  },
  showcaseHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 4, marginBottom: 8,
  },
  showcaseTitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '800', textTransform: 'lowercase', letterSpacing: 0.5 },
  showcaseCount: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7,
    backgroundColor: 'rgba(224,80,110,0.2)', borderWidth: 1, borderColor: 'rgba(224,80,110,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  showcaseCountTxt: { fontSize: 11, color: '#F08FA0', fontWeight: '900' },
  showcaseItem: {
    width: 70, height: 70, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  giftedTag: {
    position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#080810',
  },
  giftedTagTxt: { fontSize: 9, color: '#fff', fontWeight: '900' },
  showcaseName: {
    fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600',
    textTransform: 'lowercase', textAlign: 'center', marginTop: 6, maxWidth: 76,
  },

  // challenge leaderboard (hero) — compact strip
  lbCard: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8,
    marginTop: 14, paddingVertical: 7, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1, borderColor: 'rgba(224,147,159,0.18)', borderRadius: 100,
  },
  lbTitle: { fontSize: 13 },
  lbScore: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lbName: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '700', textTransform: 'lowercase', maxWidth: 60 },
  lbPts: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  lbVs: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '900', textTransform: 'uppercase' },
  lbGo: { fontSize: 13, color: '#F08FA0', fontWeight: '900', marginLeft: 2 },

  // feature card
  featureCard: {
    width: '100%', borderRadius: 24, overflow: 'hidden',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 8,
  },
  featureCardInner: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  featureTitle: {
    fontFamily: TF.serif, fontSize: 18, color: TC.text,
    letterSpacing: -0.2, marginBottom: 4,
  },
  featureDesc: { fontSize: 12, color: TC.textMuted, lineHeight: 17 },
  featureTag: {
    marginTop: 8, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  featureTagAccent: { backgroundColor: 'rgba(224,80,110,0.12)', borderColor: 'rgba(224,80,110,0.32)' },
  featureTagText: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', fontWeight: '800', letterSpacing: 0.8 },
  featureArrow: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  featureArrowText: { fontSize: 15, color: 'rgba(255,255,255,0.3)' },

  // modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0e0e1a',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 26, paddingBottom: 44,
    borderTopWidth: 1.5, borderColor: 'rgba(224,80,110,0.18)',
    maxHeight: height * 0.92,
    shadowColor: '#E0506E', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 22,
  },
  modalTitle: { fontSize: 21, fontWeight: '900', color: '#ffffff', textTransform: 'lowercase', letterSpacing: 0.2 },
  modalSub: { fontSize: 12, color: 'rgba(255,255,255,0.28)', textTransform: 'lowercase', marginTop: 3 },
  modalClose: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  // letter
  promptChip: {
    backgroundColor: 'rgba(224,80,110,0.08)',
    borderWidth: 1, borderColor: 'rgba(224,80,110,0.2)',
    borderRadius: 16, padding: 14, marginBottom: 14, gap: 4,
  },
  promptText: { fontSize: 13, color: 'rgba(224,147,159,0.75)', textTransform: 'lowercase', fontStyle: 'italic', lineHeight: 18 },
  paperWrap: {
    borderWidth: 1.5, borderColor: 'rgba(224,80,110,0.15)',
    borderRadius: 22, padding: 20, minHeight: 240,
    position: 'relative', overflow: 'hidden',
  },
  ruledLine: {
    position: 'absolute', left: 20, right: 20,
    height: 1, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  paperDear: { fontSize: 14, color: 'rgba(224,147,159,0.65)', fontStyle: 'italic', marginBottom: 10, textTransform: 'lowercase' },
  paperInput: { fontSize: 15, color: '#ffffff', lineHeight: 30, flex: 1, minHeight: 160, fontWeight: '400', outlineStyle: 'none', outlineWidth: 0 },
  complaintInput: { minHeight: 130, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.25)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 15, lineHeight: 22, outlineStyle: 'none', outlineWidth: 0 },
  paperSign: { fontSize: 12, color: 'rgba(224,147,159,0.5)', fontStyle: 'italic', textAlign: 'right', marginTop: 8, textTransform: 'lowercase' },

  // sent state
  sentWrap: { alignItems: 'center', paddingVertical: 22, position: 'relative', justifyContent: 'center', gap: 0 },
  sentTitle: {
    fontSize: 28, fontWeight: '900', color: '#ffffff',
    textTransform: 'lowercase', letterSpacing: -0.5, marginTop: 16,
  },
  sentSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.35)', textTransform: 'lowercase',
    textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 270,
  },

  // mood
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  moodCard: { borderRadius: 20, padding: 16, alignItems: 'center', gap: 8, overflow: 'hidden' },
  moodLabel: { fontSize: 11, color: 'rgba(255,255,255,0.38)', textTransform: 'lowercase', fontWeight: '600', textAlign: 'center' },
});

