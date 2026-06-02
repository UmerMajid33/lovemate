// screens/explore.js — discovery hub (editorial). Every page is "coming soon".
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { Screen, Kicker, Display, Body, SectionTitle } from '../theme/ui.js';
import { colors, spacing, radius, type, shadow } from '../theme/theme.js';

const PAGES = [
  { emoji: '🎬', title: 'reels',     desc: 'short clips & moments from the community.' },
  { emoji: '📸', title: 'moments',   desc: 'share photos & stories with everyone on lovemate.' },
  { emoji: '🔥', title: 'trending',  desc: 'what couples around the world are loving now.' },
  { emoji: '🎵', title: 'sounds',    desc: 'trending audio to add to your reels.' },
  { emoji: '👀', title: 'for you',   desc: 'a personalized feed picked just for you.' },
  { emoji: '💬', title: 'community', desc: 'conversations, tips & love stories.' },
];

function PageRow({ page, index }) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, delay: index * 70, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 420, delay: index * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
      <View style={styles.row}>
        <View style={styles.icon}><Text style={{ fontSize: 22 }}>{page.emoji}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{page.title}</Text>
          <Text style={styles.rowDesc} numberOfLines={1}>{page.desc}</Text>
        </View>
        <Text style={styles.soon}>soon</Text>
      </View>
    </Animated.View>
  );
}

export default function Explore() {
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, paddingBottom: 150 }}>
        <Kicker>discover</Kicker>
        <Display style={{ marginTop: spacing.sm }}>Explore</Display>
        <Body style={{ marginTop: spacing.sm, maxWidth: 280 }}>
          Reels, moments and more from the lovemate community — arriving soon.
        </Body>

        <View style={{ marginTop: spacing.huge }}>
          <SectionTitle>on the way</SectionTitle>
          <View style={styles.list}>
            {PAGES.map((p, i) => <PageRow key={p.title} page={p} index={i} />)}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden', ...shadow.soft,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xl,
    borderBottomWidth: 1, borderBottomColor: colors.hairline,
  },
  icon: {
    width: 46, height: 46, borderRadius: radius.md,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { ...type.heading, fontSize: 17 },
  rowDesc: { ...type.caption, marginTop: 2 },
  soon: {
    fontFamily: type.kicker.fontFamily, fontSize: 10, color: colors.gold,
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5,
    borderWidth: 1, borderColor: 'rgba(201,168,106,0.3)', borderRadius: radius.pill,
    paddingHorizontal: 9, paddingVertical: 4,
  },
});
