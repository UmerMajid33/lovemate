import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Animated, StatusBar, FlatList, Easing, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../utils/api.js';
import { colors, spacing, radius, type, shadow, fonts } from '../theme/theme.js';
import SpaceBackground from '../theme/SpaceBackground.js';

const { width, height } = Dimensions.get('window');
const POLL_MS = 10000;

// ─── Single challenge card ────────────────────────────────────────────────────
function ChallengeCard({ task, index, total, onAccept, busy, currentIndex }) {
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (index !== currentIndex) return;
    fadeIn.setValue(0); slideIn.setValue(30);
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 460, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 440, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [currentIndex]);

  const st = task.status;
  return (
    <View style={{ width, height }}>
      <Animated.View style={[styles.cardOuter, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>
        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <Text style={styles.kicker}>challenge {index + 1} of {total}</Text>
            <View style={styles.dotline}>
              {Array.from({ length: total }).map((_, i) => (
                <View key={i} style={[styles.miniDot, i === index && { backgroundColor: colors.accent, width: 16 }]} />
              ))}
            </View>
          </View>

          <View style={styles.textArea}>
            <Text style={styles.emoji} allowFontScaling={false}>{task.emoji}</Text>
            <Text style={styles.cardText}>{task.text}</Text>
          </View>

          {st === 'todo' || st === 'rejected' ? (
            <TouchableOpacity onPress={() => onAccept(task)} activeOpacity={0.88} disabled={busy} style={styles.btnWrap}>
              <LinearGradient colors={['#EC7186', colors.accent, '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                <Text style={styles.btnTxt}>{st === 'rejected' ? 'Redo this' : "I'll do this"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : st === 'accepted' ? (
            <View style={[styles.statusPill, { borderColor: 'rgba(201,168,106,0.35)' }]}>
              <Text style={[styles.statusTxt, { color: colors.gold }]}>Sent · awaiting your partner</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, { borderColor: 'rgba(127,169,140,0.4)', backgroundColor: 'rgba(127,169,140,0.1)' }]}>
              <Text style={[styles.statusTxt, { color: colors.sage }]}>Verified · +{task.points || 10}</Text>
            </View>
          )}

          {st === 'rejected' && <Text style={styles.rejectNote}>Your partner marked this not done yet.</Text>}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Main feed screen ─────────────────────────────────────────────────────────
export default function FeedScreen({ onNavigate, params = {} }) {
  const { linkCode = '', role = 'creator', user = {} } = params;
  const canSync = linkCode && linkCode !== '---' && role;

  const [tasks, setTasks]   = useState([]);
  const [board, setBoard]   = useState({ creator: { points: 0, count: 0 }, joiner: { points: 0, count: 0 } });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    if (!canSync) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/api/feed/today/${linkCode}/${role}`);
      if (res.ok) {
        const data = await res.json();
        setTasks((data.tasks || []).slice(0, 3));
        if (data.leaderboard) setBoard(data.leaderboard);
      }
    } catch (_) {}
    setLoading(false);
  }, [canSync, linkCode, role]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!canSync) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [canSync, load]);

  const handleAccept = useCallback(async (task) => {
    setBusyId(task.challengeid);
    setTasks(prev => prev.map(t => t.challengeid === task.challengeid ? { ...t, status: 'accepted' } : t));
    try {
      await fetch(`${API_BASE}/api/feed/accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: linkCode, role, challengeid: task.challengeid, name: user?.name || '' }),
      });
    } catch (_) {}
    setBusyId(null);
    if (currentIndex < tasks.length - 1) {
      setTimeout(() => listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true }), 700);
    }
  }, [linkCode, role, user, currentIndex, tasks.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  });
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 55 });

  const myPoints      = board[role]?.points || 0;
  const partnerRole   = role === 'creator' ? 'joiner' : 'creator';
  const partnerPoints = board[partnerRole]?.points || 0;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingTxt}>Loading today's challenges…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <SpaceBackground />

      <FlatList
        ref={listRef}
        data={tasks}
        keyExtractor={item => item.challengeid}
        renderItem={({ item, index }) => (
          <ChallengeCard task={item} index={index} total={tasks.length}
            onAccept={handleAccept} busy={busyId === item.challengeid} currentIndex={currentIndex} />
        )}
        pagingEnabled={Platform.OS === 'ios'}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        ListEmptyComponent={
          <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...type.body }}>No challenges today — check back tomorrow.</Text>
          </View>
        }
      />

      {/* Floating header */}
      <View style={styles.floatHeader} pointerEvents="box-none">
        <View style={styles.scorePill}>
          <Text style={styles.scoreYou}>You {myPoints}</Text>
          <Text style={styles.scoreVs}>·</Text>
          <Text style={styles.scoreThem}>Them {partnerPoints}</Text>
        </View>
        <TouchableOpacity onPress={() => onNavigate('castle', params)} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingTxt: { ...type.caption, marginTop: 14, letterSpacing: 1 },

  cardOuter: {
    position: 'absolute', top: 96, left: spacing.xl, right: spacing.xl, bottom: 52,
    borderRadius: radius.xl, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.hairline, ...shadow.card,
  },
  cardBody: { flex: 1, padding: spacing.xxl },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { ...type.kicker },
  dotline: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  miniDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.hairline2 },

  textArea: { flex: 1, justifyContent: 'center' },
  emoji: { fontSize: 60, marginBottom: spacing.xl },
  cardText: { fontFamily: fonts.serif, fontSize: 30, color: colors.text, lineHeight: 40, letterSpacing: -0.5 },

  btnWrap: { borderRadius: radius.lg, overflow: 'hidden', ...shadow.accent },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  statusPill: { height: 56, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,168,106,0.08)' },
  statusTxt: { fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  rejectNote: { ...type.caption, textAlign: 'center', marginTop: spacing.md },

  floatHeader: { position: 'absolute', top: 48, left: spacing.xl, right: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.hairline, paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.pill },
  scoreYou: { fontSize: 12, color: colors.accentSoft, fontWeight: '700' },
  scoreVs: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  scoreThem: { fontSize: 12, color: colors.textSoft, fontWeight: '700' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: colors.textSoft, fontSize: 15, fontWeight: '600' },
});
