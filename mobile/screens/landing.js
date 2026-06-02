// screens/Landing.js
import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path, Circle, Defs,
  RadialGradient, Stop,
  LinearGradient as SvgLinearGradient,
  Ellipse,
  G,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// ─── 3D Multi-Layered Floating SVG Logo Mark ──────────────────────────────────
function LogoMark() {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateReverseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 3D Heartbeat pulse sequence
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.12, duration: 250, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 0.98, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(1200),
      ])
    ).start();

    // Smooth floating oscillation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -14, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 2, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Clockwise slow rotation for primary outer ring
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 16000, useNativeDriver: true })
    ).start();

    // Counter-clockwise rotation for secondary dash ring
    Animated.loop(
      Animated.timing(rotateReverseAnim, { toValue: 1, duration: 10000, useNativeDriver: true })
    ).start();
  }, []);

  const rotateCW  = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotateCCW = rotateReverseAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const floatY    = floatAnim;

  return (
    <View style={styles.logoMarkWrap}>
      {/* 3D Depth Specular Glow Overlay */}
      <View style={styles.glowRing3D} />

      {/* Layer 1: Outer Slow-Rotating Dashed Orbit Ring */}
      <Animated.View style={[styles.orbitRingOuter, { transform: [{ rotate: rotateCW }] }]}>
        <Svg height={200} width={200} viewBox="0 0 200 200">
          <Circle
            cx="100" cy="100" r="88"
            fill="none"
            stroke="rgba(255, 77, 109, 0.16)"
            strokeWidth="1.5"
            strokeDasharray="6 12"
          />
        </Svg>
      </Animated.View>

      {/* Layer 2: Inner Counter-Rotating Orbit Ring */}
      <Animated.View style={[styles.orbitRingInner, { transform: [{ rotate: rotateCCW }] }]}>
        <Svg height={160} width={160} viewBox="0 0 160 160">
          <Circle
            cx="80" cy="80" r="68"
            fill="none"
            stroke="rgba(255, 117, 143, 0.22)"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
        </Svg>
      </Animated.View>

      {/* Layer 3: Central Wave Paths & 3D Floating Heart Sphere */}
      <Animated.View style={{ transform: [{ translateY: floatY }, { scale: pulseScale }] }}>
        <Svg height={140} width={140} viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="premiumWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.2" />
              <Stop offset="50%" stopColor="#ff758f" stopOpacity="1" />
              <Stop offset="100%" stopColor="#c9184a" stopOpacity="0.2" />
            </SvgLinearGradient>
            <RadialGradient id="sphericalHeartGlow" cx="45%" cy="40%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <Stop offset="40%" stopColor="#ff4d6d" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#a4133c" stopOpacity="1" />
            </RadialGradient>
          </Defs>

          {/* Connected Wave Guide Paths */}
          <Path
            d="M 15,50 Q 32,25 50,50 T 85,50"
            fill="none"
            stroke="url(#premiumWaveGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Path
            d="M 15,55 Q 32,78 50,55 T 85,55"
            fill="none"
            stroke="#ff758f"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            strokeLinecap="round"
            opacity="0.4"
          />

          {/* Orbit Node Anchors */}
          <Circle cx="15" cy="50" r="3.5" fill="#ff4d6d" opacity="0.6" />
          <Circle cx="85" cy="50" r="3.5" fill="#c9184a" opacity="0.6" />

          {/* 3D Sacred Heart Vector Inside Core */}
          <G transform="translate(38, 38) scale(0.24)">
            <Path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="url(#sphericalHeartGlow)"
              shadowColor="#ff4d6d"
              shadowOffset={{ width: 0, height: 10 }}
              shadowOpacity="0.8"
              shadowRadius="20"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Glowing Floating Ambient Particles ───────────────────────────────────────
function FloatingParticle({ x, y, size, delay, duration }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.5)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.65, duration: duration * 0.3, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.2, duration: duration * 0.3, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -35, duration: duration, useNativeDriver: true }),
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

// ─── Spring Interactive Button Wrapper ───────────────────────────────────────
function SpringButton({ onPress, style, children }) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.95,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
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
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[style, { transform: [{ scale: pressScale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Landing Screen Component ───────────────────────────────────────────
export default function Landing({ onNavigate }) {
  const fadeTitle  = useRef(new Animated.Value(0)).current;
  const slideTitle = useRef(new Animated.Value(24)).current;
  const fadeBadge  = useRef(new Animated.Value(0)).current;
  const slideBadge = useRef(new Animated.Value(16)).current;
  const fadeBtns   = useRef(new Animated.Value(0)).current;
  const slideBtns  = useRef(new Animated.Value(20)).current;
  const fadeFooter = useRef(new Animated.Value(0)).current;
  const shimmer    = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeTitle, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideTitle, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeBadge, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideBadge, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeBtns, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideBtns, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(fadeFooter, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(shimmer, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const shimmerX = shimmer.interpolate({ inputRange: [-1, 1], outputRange: [-width, width] });

  const particleSpecs = [
    { x: 35, y: height * 0.1, size: 4, delay: 0, duration: 2800 },
    { x: width - 50, y: height * 0.16, size: 5, delay: 400, duration: 2400 },
    { x: 55, y: height * 0.72, size: 3, delay: 1000, duration: 3200 },
    { x: width - 45, y: height * 0.62, size: 4, delay: 200, duration: 2600 },
    { x: width * 0.48, y: height * 0.08, size: 3, delay: 700, duration: 3000 },
    { x: 25, y: height * 0.42, size: 3, delay: 1400, duration: 2200 },
    { x: width - 35, y: height * 0.38, size: 4, delay: 100, duration: 3400 },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Layered Deep Ambient Radial Glows */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg height={height} width={width} style={styles.ambientCanvas}>
          <Defs>
            <RadialGradient id="coreRoseGlow3D" cx="50%" cy="30%" rx="60%" ry="60%">
              <Stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.14" />
              <Stop offset="60%" stopColor="#c9184a" stopOpacity="0.03" />
              <Stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={width / 2} cy={height * 0.28} r={width * 0.9} fill="url(#coreRoseGlow3D)" />
        </Svg>
        <View style={styles.bottomLuminousPool} />
      </View>

      {/* Dynamic Floating Sparkles */}
      {particleSpecs.map((p, i) => <FloatingParticle key={i} {...p} />)}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Brand Showcase Section */}
        <Animated.View
          style={[
            styles.brandBlock,
            {
              opacity: fadeTitle,
              transform: [{ translateY: slideTitle }],
            },
          ]}
        >
          <LogoMark />

          <Text style={styles.titleText}>lovemate</Text>

          {/* Premium Glassmorphic Badge */}
          <Animated.View
            style={[
              styles.glassBadge,
              {
                opacity: fadeBadge,
                transform: [{ translateY: slideBadge }],
              },
            ]}
          >
            <View style={styles.badgeIndicator} />
            <Text style={styles.badgeLabel}>shared digital sanctuary</Text>
          </Animated.View>

          <Animated.Text style={[styles.brandTagline, { opacity: fadeBadge }]}>
            where two hearts live in one place
          </Animated.Text>
        </Animated.View>

        {/* Dynamic Glassmorphism Feature Chips */}
        <Animated.View style={[styles.featureRow, { opacity: fadeBadge }]}>
          {[
            { icon: '📍', label: 'date spots' },
            { icon: '📷', label: 'memories' },
            { icon: '💌', label: 'love notes' },
          ].map((f) => (
            <View key={f.label} style={styles.glassFeatureChip}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Premium Button Suite */}
        <Animated.View
          style={[
            styles.ctaBlock,
            {
              opacity: fadeBtns,
              transform: [{ translateY: slideBtns }],
            },
          ]}
        >
          {/* Primary Action Button: Elevated Glassmorphic Log In */}
          <SpringButton onPress={() => onNavigate('login')} style={styles.primaryButtonOuter}>
            <LinearGradient
              colors={['#ffffff', '#f2f2f2', '#e6e6e6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonInner}
            >
              <Text style={styles.primaryButtonText}>log in</Text>
              <Animated.View style={[styles.buttonShimmer, { transform: [{ translateX: shimmerX }] }]} />
            </LinearGradient>
          </SpringButton>

          {/* Secondary Action Button: Border-lit Glassmorphic Register */}
          <SpringButton onPress={() => onNavigate('register')} style={styles.secondaryButtonOuter}>
            <View style={styles.secondaryButtonInner}>
              <Text style={styles.secondaryButtonText}>create account</Text>
              <Text style={styles.secondaryArrowText}>→</Text>
            </View>
          </SpringButton>
        </Animated.View>

        {/* Elegant Footer Details */}
        <Animated.View style={[styles.footerBlock, { opacity: fadeFooter }]}>
          <View style={styles.footerLine} />
          <Text style={styles.footerLabel}>designed for two</Text>
          <View style={styles.footerLine} />
        </Animated.View>

        <Animated.Text style={[styles.disclaimerText, { opacity: fadeFooter }]}>
          by continuing you agree to our terms & privacy policy
        </Animated.Text>
      </ScrollView>
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
    paddingBottom: 36,
  },
  ambientCanvas: {
    position: 'absolute',
    top: 0,
  },
  bottomLuminousPool: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    width: '60%',
    height: 160,
    backgroundColor: '#ff4d6d',
    opacity: 0.05,
    borderRadius: 9999,
  },

  // ── Floating particles
  particle: {
    position: 'absolute',
    backgroundColor: '#ff4d6d',
    shadowColor: '#ff4d6d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  // ── Specular Glow Circle behind the Logo Core
  glowRing3D: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ff4d6d',
    opacity: 0.08,
    shadowColor: '#ff4d6d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
  },

  // ── Logo Mark Geometry
  logoMarkWrap: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  orbitRingOuter: {
    position: 'absolute',
  },
  orbitRingInner: {
    position: 'absolute',
  },

  // ── Brand Typography Block
  brandBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  titleText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 6,
    textTransform: 'lowercase',
    textShadowColor: 'rgba(255, 77, 109, 0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
    marginBottom: 12,
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 100,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  badgeIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ff4d6d',
    opacity: 0.9,
    shadowColor: '#ff4d6d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  badgeLabel: {
    fontSize: 10.5,
    color: '#a3a3a3',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    fontWeight: '600',
  },
  brandTagline: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.32)',
    letterSpacing: 1.2,
    textTransform: 'lowercase',
    fontStyle: 'italic',
  },

  // ── Feature Row Chips
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
    justifyContent: 'center',
  },
  glassFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 100,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  featureIcon: { fontSize: 13 },
  featureLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.6,
    textTransform: 'lowercase',
    fontWeight: '600',
  },

  // ── Actions Suite
  ctaBlock: {
    width: '100%',
    gap: 14,
    marginBottom: 32,
  },
  primaryButtonOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#ff4d6d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButtonInner: {
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  primaryButtonText: {
    color: '#0a0a0a',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'lowercase',
  },
  buttonShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    transform: [{ skewX: '-22deg' }],
  },
  secondaryButtonOuter: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  secondaryButtonInner: {
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'lowercase',
  },
  secondaryArrowText: {
    color: '#ff4d6d',
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Footer
  footerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  disclaimerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.16)',
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
    lineHeight: 16,
  },
});