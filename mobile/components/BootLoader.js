// components/BootLoader.js — full-screen boot/wake screen.
// Shown while the app pings the backend (a cold Render instance can take ~30-60s
// to spin up). Space-warp background + orbiting heart + cycling status lines.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import SpaceBackground from '../theme/SpaceBackground.js';
import { colors, fonts, spacing } from '../theme/theme.js';

const MESSAGES = [
  'waking the stars…',
  'warming the engines…',
  'aligning the constellations…',
  'charting your sanctuary…',
  'almost there…',
];

export default function BootLoader({ slow }) {
  const spin  = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(-1)).current;
  const [msg, setMsg] = useState(0);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.14, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })).start();
    const id = setInterval(() => setMsg(m => (m + 1) % MESSAGES.length), 2200);
    return () => clearInterval(id);
  }, []);

  const rot   = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const shimX = shimmer.interpolate({ inputRange: [-1, 1], outputRange: [-120, 120] });

  return (
    <View style={s.wrap}>
      <SpaceBackground />
      <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
        {/* orbiting ring + pulsing heart */}
        <View style={s.orbitBox}>
          <Animated.View style={[s.orbit, { transform: [{ rotate: rot }] }]}>
            <View style={[s.orbitDot, { top: -3 }]} />
            <View style={[s.orbitDot, { bottom: -3 }]} />
          </Animated.View>
          <Animated.Text style={[s.heart, { transform: [{ scale: pulse }] }]}>♥</Animated.Text>
        </View>

        <Text style={s.brand}>LoveMate</Text>
        <Text style={s.msg}>{MESSAGES[msg]}</Text>

        {/* indeterminate shimmer bar */}
        <View style={s.track}>
          <Animated.View style={[s.fill, { transform: [{ translateX: shimX }] }]} />
        </View>

        {slow && <Text style={s.note}>first launch can take up to a minute</Text>}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  orbitBox: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxl },
  orbit: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 1, borderColor: colors.accentLine,
  },
  orbitDot: {
    position: 'absolute', alignSelf: 'center', width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
  heart: { fontSize: 44, color: colors.accentSoft },
  brand: { fontFamily: fonts.serif, fontSize: 34, color: colors.text, letterSpacing: -0.5 },
  msg: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, textTransform: 'lowercase', letterSpacing: 0.5, marginTop: spacing.sm },
  track: { width: 160, height: 3, borderRadius: 2, backgroundColor: colors.hairline, overflow: 'hidden', marginTop: spacing.xxl },
  fill: { width: 60, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  note: { fontFamily: fonts.sans, fontSize: 11, color: colors.textFaint, textTransform: 'lowercase', marginTop: spacing.lg },
});
