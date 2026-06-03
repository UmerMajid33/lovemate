// theme/SpaceBackground.js — 3D space-warp backdrop.
// Each star flies along a radial ray from a center vanishing point (z: far→near),
// streaking as it nears. Driven by Animated (web-safe; no setNativeProps, no SVG).
import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const CX = width / 2;
const CY = height / 2;

const NUM    = 38;   // light enough that the looping star animations don't jank scrolling on phones
const DEPTH  = 900;
const FOCAL  = 320;
const SPREAD = 1.5;
const SAMPLES = 10;

function rnd(min, max) { return min + Math.random() * (max - min); }

// Precompute one star's projected path (center→edge) as interpolation samples.
function makeStar(seed) {
  const x = rnd(-width, width) * SPREAD;
  const y = rnd(-height, height) * SPREAD;
  const ang = (Math.atan2(y, x) * 180) / Math.PI;

  const R_MIN = 90;                        // empty zone around the center
  const input = [], tx = [], ty = [], sx = [], op = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1);
    input.push(t);
    const z = DEPTH - t * (DEPTH - 1);     // far → near
    const k = FOCAL / z;
    const px = x * k, py = y * k;
    tx.push(px);
    ty.push(py);
    const depth = 1 - z / DEPTH;           // 0 far → 1 near
    sx.push(1 + depth * depth * 26);       // streak length grows near
    const r = Math.hypot(px, py);          // distance from center
    // hidden inside the center hole; fade just before recycle
    op.push((r < R_MIN || t > 0.9) ? 0.0 : Math.min(0.85, 0.1 + depth * 0.8));
  }
  return { ang, input, tx, ty, sx, op, dur: rnd(2600, 5200), delay: rnd(0, 4000) };
}

function Star({ s }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: s.dur, easing: Easing.linear, useNativeDriver: true })
    );
    const id = setTimeout(() => loop.start(), s.delay);
    return () => { clearTimeout(id); loop.stop(); };
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: CX, top: CY, width: 1, height: 1,
      marginLeft: -0.5, marginTop: -0.5, borderRadius: 0.5, backgroundColor: '#EDE8DC',
      opacity: t.interpolate({ inputRange: s.input, outputRange: s.op }),
      transform: [
        { translateX: t.interpolate({ inputRange: s.input, outputRange: s.tx }) },
        { translateY: t.interpolate({ inputRange: s.input, outputRange: s.ty }) },
        { rotate: `${s.ang}deg` },
        { scaleX: t.interpolate({ inputRange: s.input, outputRange: s.sx }) },
      ],
    }} />
  );
}

export default function SpaceBackground() {
  const stars = useMemo(() => Array.from({ length: NUM }, (_, i) => makeStar(i)), []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#04050B', '#090912', '#05060E']} style={StyleSheet.absoluteFill} />
      {stars.map((s, i) => <Star key={i} s={s} />)}
    </View>
  );
}
