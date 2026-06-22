// screens/chat.js — couples messaging. Dark romantic theme: starfield + moon +
// rose wallpaper, gradient speech bubbles, glowing input bar. Polls the backend.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle, Ellipse, Path, Polyline, G } from 'react-native-svg';
import { API_BASE } from '../utils/api.js';
import { colors as TC, fonts as TF } from '../theme/theme.js';

const initial = (n) => (n || '?').trim().charAt(0).toUpperCase() || '?';

function statusText(lastseen) {
  if (!lastseen) return 'offline';
  const diff = Date.now() - new Date(lastseen).getTime();
  if (diff < 70_000) return 'online now';
  const m = Math.floor(diff / 60000);
  if (m < 60) return `active ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `active ${h}h ago`;
  return 'offline';
}

// ── Romantic SVG wallpaper (moon, stars, sparkles, constellations, roses) ──
function Wallpaper() {
  const stars = [
    [42, 28, 0.9, 1], [120, 55, 1.1, 0.7], [200, 18, 0.8, 1], [310, 40, 1.3, 0.6],
    [390, 12, 0.8, 1], [460, 68, 0.9, 0.7], [550, 22, 1.1, 1], [640, 50, 0.8, 0.6],
    [730, 15, 1.0, 1], [780, 90, 0.8, 1], [70, 155, 0.9, 0.6], [190, 180, 1.2, 0.7],
    [280, 130, 0.7, 1], [420, 160, 1.0, 0.5], [30, 300, 0.9, 0.6], [350, 400, 0.9, 0.6],
    [720, 420, 0.8, 0.7], [620, 510, 1.0, 0.5], [490, 280, 1.0, 0.7], [670, 260, 0.8, 0.6],
  ];
  const petals = [
    [55, 220, 9, 16, -30, '#ff4d94', 0.5], [72, 208, 7, 13, 15, '#ff80b3', 0.4],
    [44, 240, 8, 14, -60, '#c2185b', 0.35], [30, 370, 10, 17, 20, '#ff3d8a', 0.4],
    [740, 185, 9, 15, 40, '#ff4d94', 0.4], [760, 198, 7, 12, -20, '#e91e7a', 0.35],
    [735, 390, 11, 18, -35, '#ff3d8a', 0.45], [380, 560, 10, 16, -10, '#ff4d94', 0.35],
  ];
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <RadialGradient id="cbg" cx="30%" cy="20%" r="70%">
          <Stop offset="0%" stopColor="#2a0535" />
          <Stop offset="100%" stopColor="#060010" />
        </RadialGradient>
        <RadialGradient id="orbA" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#ff2d78" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#ff2d78" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="orbB" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#8b1fff" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#8b1fff" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="moonG" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#fff0f8" stopOpacity="0.9" />
          <Stop offset="40%" stopColor="#ffd6ee" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#ff80c0" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="800" height="600" fill="url(#cbg)" />
      <Ellipse cx="160" cy="130" rx="260" ry="230" fill="url(#orbA)" />
      <Ellipse cx="680" cy="480" rx="280" ry="240" fill="url(#orbB)" />
      <Ellipse cx="100" cy="530" rx="200" ry="160" fill="url(#orbB)" />
      <G opacity={0.65}>
        {stars.map(([x, y, r, o], i) => (
          <Circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity={o} />
        ))}
      </G>
      <G stroke="rgba(255,140,200,0.15)" strokeWidth={0.8} fill="none">
        <Polyline points="120,55 200,18 310,40 390,12" />
        <Polyline points="550,22 640,50 730,15 780,90" />
        <Polyline points="70,155 190,180 280,130 420,160" />
      </G>
      {/* moon */}
      <Circle cx="650" cy="105" r="46" fill="url(#moonG)" />
      <Circle cx="650" cy="105" r="34" fill="#fff0f8" opacity="0.85" />
      <Circle cx="662" cy="100" r="28" fill="#140620" opacity="0.5" />
      {/* rose petals */}
      <G>
        {petals.map(([cx, cy, rx, ry, rot, fill, o], i) => (
          <Ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} opacity={o} transform={`rotate(${rot} ${cx} ${cy})`} />
        ))}
      </G>
    </Svg>
  );
}

const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const dayLabel = (ts) => {
  const d = new Date(ts); const now = new Date();
  const k = dayKey(ts);
  if (k === dayKey(now)) return 'today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (k === dayKey(y)) return 'yesterday';
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const mons = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const base = `${days[d.getDay()]}, ${mons[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base}, ${d.getFullYear()}`;
};

function DayChip({ label }) {
  return (
    <View style={s.dayChipWrap}>
      <View style={s.dayChip}><Text style={s.dayChipTxt}>{label}</Text></View>
    </View>
  );
}

const fmtTime = (ts) => {
  try {
    const d = new Date(ts);
    let h = d.getHours(); const m = d.getMinutes();
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m < 10 ? '0' + m : m} ${ap}`;
  } catch { return ''; }
};

// read receipt: faint single = sending, grey single = sent, grey double = delivered
// (partner online), pink double = read (partner opened the chat after this message)
function Ticks({ pending, online, read }) {
  if (pending) return <Text style={[s.tick, { color: 'rgba(255,255,255,0.45)' }]}>✓</Text>;
  const color = read ? '#ff6eb5' : 'rgba(255,255,255,0.8)';
  return <Text style={[s.tick, { color }]}>{(read || online) ? '✓✓' : '✓'}</Text>;
}

// message bubble: pop-in + inline time & ticks at the trailing edge (like the ref)
function Bubble({ mine, text, time, online, partnerReadAt, pending }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start();
  }, []);
  const style = {
    opacity: a,
    transform: [
      { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
      { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
    ],
  };
  const read = !!partnerReadAt && new Date(time).getTime() <= partnerReadAt;
  // text + time + tick share a line; meta wraps below only when the text is long
  const content = (
    <View style={s.row}>
      <Text style={mine ? s.bubbleTxtMine : s.bubbleTxtTheirs}>{text}</Text>
      <View style={s.metaInline}>
        <Text style={[s.metaTime, mine ? { color: 'rgba(255,255,255,0.7)' } : { color: 'rgba(200,170,235,0.6)' }]}>{fmtTime(time)}</Text>
        {mine && <Ticks pending={pending} online={online} read={read} />}
      </View>
    </View>
  );
  return (
    <Animated.View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs, style]}>
      {mine
        ? <LinearGradient colors={['#c4005e', '#7b2fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bubbleFill}>{content}</LinearGradient>
        : <View style={s.bubbleTheirsFill}>{content}</View>}
    </Animated.View>
  );
}

// three bouncing dots — partner is typing
function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: -5, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay((2 - i) * 150),
      ]))
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={[s.bubble, s.bubbleTheirs]}>
      <View style={[s.bubbleTheirsFill, { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 12 }]}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#c494ff', transform: [{ translateY: d }] }} />
        ))}
      </View>
    </View>
  );
}

export default function Chat({ onNavigate, params = {} }) {
  const { linkCode, role, user, homeName } = params;
  const myName = user?.name || 'you';
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [partner, setPartner] = useState(null);     // { name, lastseen }
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerReadAt, setPartnerReadAt] = useState(0);

  const scrollRef = useRef(null);
  const lastTimeRef = useRef(null);
  const aliveRef = useRef(true);
  const seenIds = useRef(new Set());
  const lastTypingSent = useRef(0);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const mergeMessages = useCallback((incoming) => {
    if (!incoming?.length) return;
    setMessages(prev => {
      const next = [...prev];
      for (const m of incoming) {
        if (seenIds.current.has(m._id)) continue;
        seenIds.current.add(m._id);
        next.push(m);
      }
      return next;
    });
    const last = incoming[incoming.length - 1];
    if (last?.createdat) lastTimeRef.current = last.createdat;
    scrollToEnd();
  }, [scrollToEnd]);

  // initial load + partner presence
  useEffect(() => {
    aliveRef.current = true;
    (async () => {
      try {
        const [mRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/chat/${linkCode}`),
          fetch(`${API_BASE}/api/home/presence/${linkCode}`),
        ]);
        if (!aliveRef.current) return;
        if (mRes.ok) { const d = await mRes.json(); mergeMessages(d.messages || []); }
        if (pRes.ok) {
          const pd = await pRes.json();
          const pr = role === 'creator' ? 'joiner' : 'creator';
          setPartner(pd[pr] || null);
        }
      } catch (_) {}
      if (aliveRef.current) setLoading(false);
    })();
    return () => { aliveRef.current = false; };
  }, [linkCode, role, mergeMessages]);

  // poll for new messages + presence
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const since = lastTimeRef.current ? `?since=${encodeURIComponent(lastTimeRef.current)}` : '';
        const r = await fetch(`${API_BASE}/api/chat/${linkCode}${since}`);
        if (r.ok && aliveRef.current) { const d = await r.json(); mergeMessages(d.messages || []); }
        const pr2 = await fetch(`${API_BASE}/api/home/presence/${linkCode}`);
        if (pr2.ok && aliveRef.current) {
          const pd = await pr2.json();
          const pr = role === 'creator' ? 'joiner' : 'creator';
          setPartner(pd[pr] || null);
        }
      } catch (_) {}
    }, 2500);
    return () => clearInterval(poll);
  }, [linkCode, role, mergeMessages]);

  // typing heartbeat — throttled to once / 2s while composing
  const onDraftChange = (t) => {
    setDraft(t);
    const now = Date.now();
    if (t.trim() && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      fetch(`${API_BASE}/api/chat/typing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: linkCode, role }),
      }).catch(() => {});
    }
  };

  // presence heartbeat so the partner sees me "online" while we're chatting
  useEffect(() => {
    const beat = () => {
      fetch(`${API_BASE}/api/home/presence`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: linkCode, role, name: myName }),
      }).catch(() => {});
    };
    beat();
    const id = setInterval(beat, 20000);
    return () => clearInterval(id);
  }, [linkCode, role, myName]);

  // tell the server I have the chat open (drives the partner's read receipts)
  const reportRead = useCallback(() => {
    fetch(`${API_BASE}/api/chat/read`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkcode: linkCode, role }),
    }).catch(() => {});
  }, [linkCode, role]);

  useEffect(() => { reportRead(); }, [reportRead, messages.length]);

  // poll partner typing + partner read-time (faster than the message poll)
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/chat/${linkCode}/typing?role=${role}`);
        if (r.ok && aliveRef.current) {
          const d = await r.json();
          setPartnerTyping(!!d.typing);
          setPartnerReadAt(d.partnerReadAt || 0);
          if (d.typing) scrollToEnd();
        }
      } catch (_) {}
      reportRead();   // keep my "read" fresh while the chat is open
    }, 1500);
    return () => clearInterval(id);
  }, [linkCode, role, scrollToEnd, reportRead]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setSending(true);
    // optimistic bubble
    const optimistic = { _id: `tmp-${Date.now()}`, role, name: myName, text, createdat: new Date().toISOString(), pending: true };
    seenIds.current.add(optimistic._id);
    setMessages(prev => [...prev, optimistic]);
    scrollToEnd();
    try {
      const r = await fetch(`${API_BASE}/api/chat/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: linkCode, role, name: myName, text }),
      });
      if (r.ok) {
        const d = await r.json();
        const real = d.message;
        if (real?._id) {
          seenIds.current.add(real._id);
          if (real.createdat) lastTimeRef.current = real.createdat;
          setMessages(prev => prev.map(m => (m._id === optimistic._id ? real : m)));
        }
      }
    } catch (_) {}
    if (aliveRef.current) setSending(false);
  };

  const partnerName = partner?.name || 'your person';
  const online = partner?.lastseen && (Date.now() - new Date(partner.lastseen).getTime() < 70_000);

  return (
    <View style={{ flex: 1, backgroundColor: '#060010' }}>
      <Wallpaper />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => onNavigate?.('castle', params)} style={s.backBtn}>
              <Text style={s.backTxt}>←</Text>
            </TouchableOpacity>
            <View style={s.avatarWrap}>
              <LinearGradient colors={['#ff3d8a', '#9b4dff']} style={s.avatar}>
                <Text style={s.avatarTxt}>{initial(partnerName)}</Text>
              </LinearGradient>
              {online && <View style={s.onlineDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pName}>{partnerName}</Text>
              <Text style={s.pStatus}>{statusText(partner?.lastseen)}</Text>
            </View>
            <View style={s.moodBadge}><Text style={s.moodTxt}>{online ? 'here 💞' : 'away 🌙'}</Text></View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 14, gap: 10, flexGrow: 1, justifyContent: 'flex-end' }}
            onContentSizeChange={scrollToEnd}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator color="#ff6eb5" />
              </View>
            ) : messages.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
                <Text style={{ fontSize: 30 }}>💌</Text>
                <Text style={{ color: '#c494ff', textTransform: 'lowercase', fontSize: 13 }}>say something sweet to {partnerName}</Text>
              </View>
            ) : (
              (() => {
                const out = [];
                let lastDay = null;
                for (const m of messages) {
                  const k = dayKey(m.createdat);
                  if (k !== lastDay) { out.push(<DayChip key={`day-${m._id}`} label={dayLabel(m.createdat)} />); lastDay = k; }
                  out.push(<Bubble key={m._id} mine={m.role === role} text={m.text} time={m.createdat} online={online} partnerReadAt={partnerReadAt} pending={m.pending} />);
                }
                return out;
              })()
            )}
            {partnerTyping && <TypingDots />}
          </ScrollView>

          {/* Input bar */}
          <View style={s.inputBar}>
            <LinearGradient colors={['rgba(255,60,140,0.55)', 'rgba(155,77,255,0.55)', 'rgba(255,60,140,0.3)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.inputRing}>
              <View style={s.inputInner}>
                <Text style={{ fontSize: 15, opacity: 0.6 }}>💬</Text>
                <TextInput
                  value={draft}
                  onChangeText={onDraftChange}
                  placeholder={`message ${partnerName}…`}
                  placeholderTextColor="rgba(180,140,220,0.45)"
                  style={s.input}
                  onSubmitEditing={send}
                  returnKeyType="send"
                  textAlignVertical="center"
                />
                <TouchableOpacity onPress={send} disabled={!draft.trim() || sending} activeOpacity={0.85}>
                  <LinearGradient colors={['#ff3d8a', '#9b4dff']} style={[s.sendBtn, (!draft.trim() || sending) && { opacity: 0.5 }]}>
                    <Svg width={15} height={15} viewBox="0 0 24 24"><Path d="M3 12l18-9-9 18V12H3z" fill="white" /></Svg>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
            <Text style={s.hint}>✦ {homeName ? `${homeName} · ` : ''}just between you two</Text>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,60,140,0.16)',
    backgroundColor: 'rgba(18,7,28,0.94)',                      // opaque nav bar over wallpaper
    shadowColor: '#ff2d78', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 20 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,90,160,0.45)',
    shadowColor: '#ff2d78', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 14, elevation: 6,
  },
  avatarTxt: { fontFamily: TF.serif, fontSize: 20, color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#3dff9e', borderWidth: 2, borderColor: '#0e0518',
    shadowColor: '#3dff9e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
  pName: { fontFamily: TF.serif, fontSize: 18, color: '#ff6eb5', textShadowColor: 'rgba(255,80,160,0.55)', textShadowRadius: 18 },
  pStatus: { fontSize: 11, color: '#9b70cc', marginTop: 1, textTransform: 'lowercase' },
  moodBadge: {
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(155,77,255,0.14)', borderWidth: 1, borderColor: 'rgba(155,77,255,0.28)',
  },
  moodTxt: { fontSize: 11, color: '#c494ff', textTransform: 'lowercase' },

  bubble: { maxWidth: '80%' },
  bubbleMine: { alignSelf: 'flex-end' },
  bubbleTheirs: { alignSelf: 'flex-start' },
  bubbleFill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomRightRadius: 5 },
  bubbleTheirsFill: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomLeftRadius: 5,
    backgroundColor: 'rgba(36,12,60,0.9)', borderWidth: 1, borderColor: 'rgba(155,77,255,0.28)',
  },
  bubbleTxtMine: { color: '#fff', fontSize: 14, lineHeight: 20, flexShrink: 1 },
  bubbleTxtTheirs: { color: '#f2dfff', fontSize: 14, lineHeight: 20, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' },
  metaInline: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8, marginBottom: 1 },
  metaTime: { fontSize: 10 },
  tick: { fontSize: 8.5, fontWeight: '700', letterSpacing: -1.5 },
  dayChipWrap: { alignItems: 'center', marginVertical: 6 },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100,
    backgroundColor: 'rgba(20,8,30,0.7)', borderWidth: 1, borderColor: 'rgba(155,77,255,0.22)',
  },
  dayChipTxt: { fontSize: 10.5, color: '#b48be8', fontWeight: '700', textTransform: 'lowercase', letterSpacing: 0.5 },

  inputBar: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,60,140,0.12)',
    backgroundColor: 'rgba(10,2,20,0.94)',                      // opaque type bar over wallpaper
  },
  inputRing: {
    width: '100%', maxWidth: 460, alignSelf: 'center',
    borderRadius: 26, padding: 1.5,
    shadowColor: '#ff3c8c', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6,
  },
  inputInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(10,3,22,0.96)', borderRadius: 25, paddingLeft: 18, paddingRight: 5, paddingVertical: 5,
  },
  input: {
    flex: 1, color: '#f0dfff', fontSize: 14, height: 38, paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : null),   // kill browser focus box
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#c80064', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 5,
  },
  hint: { textAlign: 'center', fontSize: 11, color: 'rgba(155,80,200,0.45)', marginTop: 8, textTransform: 'lowercase' },
});
