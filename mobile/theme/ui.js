// theme/ui.js — shared primitive components built on the design tokens.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, type, spacing, radius, shadow } from './theme.js';
import SpaceBackground from './SpaceBackground.js';

// Full-screen container with the space backdrop + safe area.
export function Screen({ children, style, space = true }) {
  return (
    <SafeAreaView style={[s.screen, style]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {space && <SpaceBackground />}
      {children}
    </SafeAreaView>
  );
}

// Elevated surface card with hairline border.
export function Card({ children, style, onPress, accent }) {
  const Comp = onPress ? TouchableOpacity : View;
  return (
    <Comp activeOpacity={0.85} onPress={onPress}
      style={[s.card, accent && { borderColor: colors.accentLine }, style]}>
      {children}
    </Comp>
  );
}

// Serif display heading.
export function Display({ children, style }) {
  return <Text style={[type.display, style]}>{children}</Text>;
}
export function Title({ children, style }) {
  return <Text style={[type.title, style]}>{children}</Text>;
}
export function Heading({ children, style }) {
  return <Text style={[type.heading, style]}>{children}</Text>;
}
export function Kicker({ children, style }) {
  return <Text style={[type.kicker, style]}>{children}</Text>;
}
export function Body({ children, style, numberOfLines }) {
  return <Text numberOfLines={numberOfLines} style={[type.body, style]}>{children}</Text>;
}

// Section label: a kicker with a hairline rule beside it.
export function SectionTitle({ children, right }) {
  return (
    <View style={s.sectionRow}>
      <Text style={type.kicker}>{children}</Text>
      <View style={s.rule} />
      {right}
    </View>
  );
}

// Primary filled button (accent) + ghost variant.
export function Button({ label, onPress, variant = 'primary', disabled, style }) {
  if (variant === 'ghost') {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={disabled}
        style={[s.ghost, disabled && { opacity: 0.5 }, style]}>
        <Text style={s.ghostTxt}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} disabled={disabled}
      style={[s.btnWrap, disabled && { opacity: 0.5 }, style]}>
      <LinearGradient colors={['#D06A7D', colors.accent, '#9E4456']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
        <Text style={s.btnTxt}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Circular icon back button (top-left nav).
export function IconButton({ symbol = '←', onPress, style }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[s.iconBtn, style]}>
      <Text style={s.iconTxt}>{symbol}</Text>
    </TouchableOpacity>
  );
}

// Small pill/chip.
export function Chip({ label, tone = 'default', style }) {
  const t = tone === 'accent'
    ? { bg: colors.accentDim, bc: colors.accentLine, fg: colors.accentSoft }
    : { bg: 'rgba(245,241,234,0.05)', bc: colors.hairline, fg: colors.textSoft };
  return (
    <View style={[s.chip, { backgroundColor: t.bg, borderColor: t.bc }, style]}>
      <Text style={[s.chipTxt, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.hairline, padding: spacing.xl,
    ...shadow.soft,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  rule: { flex: 1, height: 1, backgroundColor: colors.hairline },

  btnWrap: { borderRadius: radius.lg, overflow: 'hidden', ...shadow.accent },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  ghost: { height: 56, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline2, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { fontSize: 15, fontWeight: '600', color: colors.text, letterSpacing: 0.3 },

  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { color: colors.text, fontSize: 19, fontWeight: '600', marginTop: -1 },

  chip: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1 },
  chipTxt: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});

export default { Screen, Card, Display, Title, Heading, Kicker, Body, SectionTitle, Button, IconButton, Chip };
