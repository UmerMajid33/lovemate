// screens/profile.js — single-user account page (editorial).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Screen, Kicker, Display, SectionTitle } from '../theme/ui.js';
import { colors, spacing, radius, type, shadow } from '../theme/theme.js';
import { getUser, getHomes, setLoggedIn } from '../utils/storage.js';

export default function Profile({ onNavigate, user: userProp = {} }) {
  const [user,  setUser]  = useState(userProp);
  const [homes, setHomes] = useState([]);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    (async () => {
      try { const u = await getUser(); if (u) setUser(prev => ({ ...prev, ...u })); } catch (_) {}
      try { setHomes(await getHomes()); } catch (_) {}
    })();
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const initial = (user.name || 'm').trim().charAt(0).toUpperCase();

  const handleLogout = async () => {
    try { await setLoggedIn(false); } catch (_) {}
    onNavigate?.('landing');
  };

  const Row = ({ label, value, last }) => (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, paddingBottom: 150 }}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          {/* header */}
          <Kicker>account</Kicker>
          <View style={styles.header}>
            <View style={styles.avatar}><Text style={styles.avatarTxt}>{initial}</Text></View>
            <View style={{ flex: 1 }}>
              <Display style={{ fontSize: 30 }} numberOfLines={1}>{user.name || 'mate'}</Display>
              {!!user.email && <Text style={styles.email} numberOfLines={1}>{user.email}</Text>}
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaNum}>{homes.length}</Text>
              <Text style={styles.metaLbl}>{homes.length === 1 ? 'home' : 'homes'}</Text>
            </View>
          </View>

          {/* details */}
          <View style={{ marginTop: spacing.huge }}>
            <SectionTitle>details</SectionTitle>
            <View style={styles.card}>
              <Row label="name"   value={user.name} />
              <Row label="email"  value={user.email} />
              <Row label="gender" value={user.gender} last />
            </View>
          </View>

          {/* homes */}
          <View style={{ marginTop: spacing.xxxl }}>
            <SectionTitle>your homes</SectionTitle>
            <View style={styles.card}>
              {homes.length === 0 ? (
                <Text style={styles.empty}>No homes yet — create or join one from the home tab.</Text>
              ) : homes.map((h, i) => (
                <TouchableOpacity key={h.linkCode || i} activeOpacity={0.7}
                  style={[styles.homeRow, i === homes.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => onNavigate?.('castle', { ...h, user })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.homeName} numberOfLines={1}>{h.homeName || 'our sanctuary'}</Text>
                    <Text style={styles.homeMeta}>{h.role} · {h.linkCode}</Text>
                  </View>
                  <Text style={styles.chevron}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* logout */}
          <TouchableOpacity style={styles.logout} activeOpacity={0.85} onPress={handleLogout}>
            <Svg width={17} height={17} viewBox="0 0 24 24">
              <Path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={colors.accent} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.logoutTxt}>Log out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentDim,
    borderWidth: 1, borderColor: colors.accentLine, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontFamily: type.title.fontFamily, fontSize: 28, color: colors.accentSoft },
  email: { ...type.caption, marginTop: 4 },

  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  metaPill: { flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  metaNum: { ...type.heading, fontSize: 16, color: colors.text },
  metaLbl: { ...type.caption, textTransform: 'uppercase', letterSpacing: 1 },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.hairline, paddingHorizontal: spacing.xl, ...shadow.soft },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowLabel: { ...type.caption, textTransform: 'uppercase', letterSpacing: 1 },
  rowValue: { ...type.label, maxWidth: 200 },

  empty: { ...type.body, paddingVertical: spacing.xl, textAlign: 'center' },
  homeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  homeName: { ...type.heading, fontSize: 16 },
  homeMeta: { ...type.caption, marginTop: 2 },
  chevron: { fontSize: 17, color: colors.accentSoft, fontWeight: '700' },

  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: spacing.xxxl, height: 54, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.accentLine, backgroundColor: colors.accentDim },
  logoutTxt: { fontSize: 15, color: colors.accentSoft, fontWeight: '600', letterSpacing: 0.3 },
});
