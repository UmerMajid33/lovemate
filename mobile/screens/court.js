// screens/court.js — AI Justice Court ⚖️  (real-time synced, premium cinematic UI)
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../utils/api.js';

const GOLD = '#D4AF37', GOLD2 = '#F2D479', INK = '#0b0913', PURPLE = '#7c3aed';
const fmtTime = (ts) => { try { const d = new Date(ts); let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${m < 10 ? '0' + m : m} ${ap}`; } catch { return ''; } };

async function jGet(p) { try { const r = await fetch(`${API_BASE}${p}`); return r.ok ? await r.json() : null; } catch { return null; } }
async function jPost(p, b) { try { const r = await fetch(`${API_BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { ok: r.ok, data: r.ok ? await r.json() : await r.json().catch(() => ({})) }; } catch { return { ok: false, data: {} }; } }

// ── animated message (fade + scale drift-in) ──
function MsgBubble({ item, myRole }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }).start(); }, []);
  const anim = { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };

  if (item.sender === 'JUDGE') {
    return (
      <Animated.View style={[s.judgeWrap, anim]}>
        <LinearGradient colors={['#1c1810', '#121017', '#0d0b12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.judgeBox}>
          <View style={s.judgeHead}>
            <Text style={s.judgeBadge}>⚖️</Text>
            <Text style={s.judgeName}>JUDGE GAVELTRON</Text>
            <Text style={s.judgeBadge}>👨‍⚖️</Text>
          </View>
          <View style={s.judgeRule} />
          <Text style={s.judgeTxt}>{item.text}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  const mine = item.sender === myRole;
  const label = mine ? 'You' : (item.name || 'partner');
  return (
    <Animated.View style={[s.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }, anim]}>
      {mine ? (
        <LinearGradient colors={['#8b5cf6', '#6d28d9', '#4c1d95']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.bubble, s.mine]}>
          <Text style={[s.meta, { textAlign: 'right' }]}>{label} · {fmtTime(item.createdat)}</Text>
          <Text style={s.bubbleTxt}>{item.text}</Text>
        </LinearGradient>
      ) : (
        <View style={[s.bubble, s.theirs]}>
          <Text style={s.meta}>{label} · {fmtTime(item.createdat)}</Text>
          <Text style={s.bubbleTxt}>{item.text}</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function Court({ onNavigate, params = {} }) {
  const { role, linkCode, user } = params;
  const caseId = linkCode;
  const myRole = role === 'creator' ? 'PLAINTIFF' : 'DEFENDANT';

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [judging, setJudging] = useState(false);
  const listRef = useRef(null);
  const aliveRef = useRef(true);
  const atBottomRef = useRef(true);   // only autoscroll when user is already at the bottom

  const toEnd = useCallback(() => requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true })), []);
  const onScroll = useCallback((e) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    atBottomRef.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < 80;
  }, []);
  const keyOf = (m, i) => m._id || `${m.sender}-${m.createdat}-${i}`;

  // ── gavel pounding animation while the judge deliberates ──
  const gavelRot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop;
    if (judging) {
      loop = Animated.loop(Animated.sequence([
        Animated.timing(gavelRot, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(gavelRot, { toValue: -1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]));
      loop.start();
    } else { gavelRot.stopAnimation(() => gavelRot.setValue(0)); }
    return () => loop && loop.stop();
  }, [judging]);
  const gavelTilt = gavelRot.interpolate({ inputRange: [-1, 1], outputRange: ['-22deg', '22deg'] });

  // send-button tactile press
  const sendScale = useRef(new Animated.Value(1)).current;

  // ── live sync ──
  useEffect(() => {
    aliveRef.current = true;
    const pull = async () => {
      const d = await jGet(`/api/justice-court/sync/${caseId}`);
      if (d && aliveRef.current) {
        setMessages(prev => {
          if (d.messages?.length !== prev.length) { if (atBottomRef.current) toEnd(); return d.messages || []; }
          return prev;
        });
      }
    };
    pull();
    const id = setInterval(pull, 1500);
    return () => { aliveRef.current = false; clearInterval(id); };
  }, [caseId]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    atBottomRef.current = true;
    setMessages(prev => [...prev, { _id: `tmp${Date.now()}`, sender: myRole, name: user?.name || 'You', text, createdat: new Date().toISOString() }]);
    toEnd();
    const res = await jPost('/api/justice-court/submit-message', { linkcode: caseId, sender: myRole, name: user?.name || '', text });
    if (res.ok && res.data?.messages) setMessages(res.data.messages);
  };

  const bangGavel = async () => {
    if (judging) return;
    atBottomRef.current = true;
    setJudging(true);
    const res = await jPost('/api/justice-court/summon-judge', { linkcode: caseId, by: user?.name || '' });
    if (res.ok && res.data?.messages) setMessages(res.data.messages);
    setJudging(false); toEnd();
  };

  const newCase = async () => { await jPost('/api/justice-court/reset', { linkcode: caseId }); setMessages([]); };

  const data = judging ? [...messages, { _id: 'thinking', sender: 'JUDGE', text: '🔨 the court deliberates…' }] : messages;

  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <LinearGradient colors={['#1a1030', '#120a22', '#0b0913']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => onNavigate?.('castle', params)} style={s.iconBtn}><Text style={s.back}>←</Text></TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.title}>⚖ JUSTICE COURT</Text>
            <Text style={s.sub}>{judging ? 'deliberating…' : 'the honourable court is in session'}</Text>
          </View>
          <TouchableOpacity onPress={bangGavel} disabled={judging} activeOpacity={0.85} style={s.gavelBtn}>
            <LinearGradient colors={[GOLD2, GOLD, '#a07d1a']} style={s.gavelGrad}>
              <Animated.Text style={{ fontSize: 19, transform: [{ rotate: gavelTilt }] }}>🔨</Animated.Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        {/* gold accent glow under header */}
        <LinearGradient colors={['transparent', GOLD, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.headerGlow} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={keyOf}
            renderItem={({ item }) => <MsgBubble item={item} myRole={myRole} />}
            ListEmptyComponent={<Text style={s.empty}>state your case, then strike the 🔨 for judgement</Text>}
            contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 20, flexGrow: 1 }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => { if (atBottomRef.current) toEnd(); }}
            showsVerticalScrollIndicator={true}
          />

          {/* modern chat bar */}
          <View style={s.inputBar}>
            <TouchableOpacity onPress={newCase} style={s.newBtn} activeOpacity={0.7}><Text style={{ fontSize: 16 }}>🧹</Text></TouchableOpacity>
            <View style={s.inputPill}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={myRole === 'PLAINTIFF' ? 'say your piece…' : 'defend your actions…'}
                placeholderTextColor="rgba(210,200,235,0.35)"
                style={s.input}
                onSubmitEditing={send}
                returnKeyType="send"
              />
            </View>
            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <TouchableOpacity
                onPress={send} disabled={!draft.trim()} activeOpacity={0.9}
                onPressIn={() => Animated.spring(sendScale, { toValue: 0.88, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(sendScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
              >
                <LinearGradient colors={[GOLD2, GOLD]} style={[s.sendBtn, !draft.trim() && { opacity: 0.4 }]}><Text style={{ fontSize: 17, color: '#2a2008' }}>▶</Text></LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
  headerGlow: { height: 1.5, marginHorizontal: 24, borderRadius: 1, opacity: 0.55, shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  back: { color: 'rgba(255,255,255,0.85)', fontSize: 20 },
  title: { fontSize: 18, fontWeight: '900', color: GOLD2, letterSpacing: 2.5, textShadowColor: 'rgba(212,175,55,0.5)', textShadowRadius: 12 },
  sub: { fontSize: 10, color: 'rgba(230,220,245,0.4)', letterSpacing: 0.5, marginTop: 2, fontStyle: 'italic' },
  gavelBtn: { borderRadius: 20, overflow: 'hidden', shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 6 },
  gavelGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  empty: { color: 'rgba(230,220,245,0.4)', textAlign: 'center', marginTop: 50, paddingHorizontal: 36, lineHeight: 21, fontStyle: 'italic' },

  row: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  mine: { borderBottomRightRadius: 5, shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  theirs: { backgroundColor: '#23202c', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderBottomLeftRadius: 5 },
  meta: { fontSize: 10, color: 'rgba(200,195,215,0.55)', marginBottom: 3, fontWeight: '600' },
  bubbleTxt: { color: '#fff', fontSize: 14.5, lineHeight: 21 },

  judgeWrap: { alignItems: 'center', paddingVertical: 2 },
  judgeBox: {
    maxWidth: '96%', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18,
    borderWidth: 1.5, borderColor: GOLD,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8,
  },
  judgeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  judgeBadge: { fontSize: 16 },
  judgeName: { fontSize: 12.5, fontWeight: '900', color: GOLD2, letterSpacing: 2, textShadowColor: 'rgba(212,175,55,0.5)', textShadowRadius: 10 },
  judgeRule: { height: 1, backgroundColor: 'rgba(212,175,55,0.3)', marginVertical: 9, marginHorizontal: 6 },
  judgeTxt: { color: '#f3e9c8', fontSize: 14.5, lineHeight: 22, textAlign: 'center' },

  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  newBtn: { width: 42, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  inputPill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(212,175,55,0.28)', paddingHorizontal: 18, justifyContent: 'center', minHeight: 46 },
  input: { color: '#fff', fontSize: 14.5, paddingVertical: 10, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', shadowColor: GOLD, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5 },
});
