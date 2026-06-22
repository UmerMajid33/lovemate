// components/BottomNav.js
// Floating bottom tab bar (footer) shared across the main hub screens.
// Tabs: Home (castle) · Explore (coming-soon pages) · Profile (home profile).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme/theme.js';

// Simple vector icons so the bar stays crisp at any size.
function TabIcon({ name, color }) {
  if (name === 'home') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M3 10.5 12 3l9 7.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5 9.5V20h14V9.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M10 20v-5h4v5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (name === 'explore') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={11} cy={11} r={7.5} stroke={color} strokeWidth={2} />
        <Path d="m16.5 16.5 4 4" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Path d="M11 7.5 12.4 10l2.6 1-2.6 1L11 14.5 9.6 12 7 11l2.6-1z" fill={color} />
      </Svg>
    );
  }
  if (name === 'chat') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M4 5.5h16v11H8.5L4 20z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M8 10.5h8M8 13.5h5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  // profile
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
      <Path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const TABS = [
  { id: 'userhome', icon: 'home',    label: 'home' },
  { id: 'explore',  icon: 'explore', label: 'explore' },
  { id: 'profile',  icon: 'profile', label: 'profile' },
];

// Couple chat lives only inside the home (castle), where the linkCode/partner exist.
const CHAT_TAB = { id: 'chat', icon: 'chat', label: 'chat' };

export default function BottomNav({ current, onNavigate, unreadChat = 0 }) {
  const tabs = current === 'castle' ? [...TABS, CHAT_TAB] : TABS;
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        {tabs.map(tab => {
          const active = current === tab.id;
          const color  = active ? colors.accentSoft : colors.textMuted;
          const badge  = tab.id === 'chat' && unreadChat > 0;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.8}
              style={styles.tab}
              onPress={() => { if (!active) onNavigate?.(tab.id); }}
            >
              <View>
                <TabIcon name={tab.icon} color={badge ? colors.accent : color} />
                {badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>{unreadChat > 99 ? '99+' : unreadChat}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color: badge ? colors.accentSoft : color }]}>{tab.label}</Text>
              {active && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 18 : 10,
    paddingHorizontal: 22,
  },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    width: '100%', maxWidth: 420, borderRadius: 22,
    paddingVertical: 9, paddingHorizontal: 6,
    backgroundColor: colors.bgElev,
    borderWidth: 1, borderColor: colors.hairline,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 14,
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 4, position: 'relative',
  },
  activeDot: { position: 'absolute', bottom: -3, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  badge: {
    position: 'absolute', top: -6, right: -10,
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.bgElev,
  },
  badgeTxt: { fontSize: 9, color: '#fff', fontWeight: '900' },
  label: { fontSize: 9.5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.2 },
});
