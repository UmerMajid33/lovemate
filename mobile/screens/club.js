// screens/club.js — Friend Clubs (up to 5 members). Refined, mature look.
// Fully separate data from couple "homes". Lobby (create/join/my clubs) +
// inside view with its own footer: Crew · Chat (group chat = home-chat features).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, ActivityIndicator, Platform, Clipboard,
  Animated, Easing, KeyboardAvoidingView, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { API_BASE } from '../utils/api.js';
import { getUser, getClubs, saveClub, removeClub, MAX_CLUBS } from '../utils/storage.js';
import { CLUB_GAMES, SoloPlayer } from '../components/clubgames.js';
import MultiRace from '../components/clubrace.js';
import { SOLO_GAMES, RACE_GAME } from './games.js';

// ── refined palette (friendly, but grown-up) ──
const EM = '#10b981', EM2 = '#34d399', GOLD = '#d4a857', TEAL = '#2dd4bf', INK = '#0c1512';
const FACE_EMOJI  = ['😎', '🤪', '🥳', '🤠', '👻', '🤖', '👽', '🤡', '🥸', '😈', '🤓', '🦸', '🦹', '🧙', '🤩', '🫡'];
const FACE_COLORS = [EM, GOLD, '#fb923c', TEAL, '#a78bfa', '#f472b6', '#38bdf8', '#fb7185', EM2, '#c084fc'];
const initial  = (s) => (s || '?').trim().charAt(0).toUpperCase() || '?';
const hashStr  = (s) => { let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const faceFor  = (e) => FACE_EMOJI[hashStr((e || '').toLowerCase()) % FACE_EMOJI.length];
const colorFor = (e) => FACE_COLORS[hashStr((e || '').toLowerCase()) % FACE_COLORS.length];

const fmtTime = (ts) => { try { const d = new Date(ts); let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${m < 10 ? '0' + m : m} ${ap}`; } catch { return ''; } };
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const dayLabel = (ts) => {
  const d = new Date(ts), now = new Date(), k = dayKey(ts);
  if (k === dayKey(now)) return 'today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (k === dayKey(y)) return 'yesterday';
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const mons = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  return `${days[d.getDay()]}, ${mons[d.getMonth()]} ${d.getDate()}`;
};

// club games grouped by how many players they need (1–5)
const GAME_CATS = [
  { players: 1, label: 'play solo', games: SOLO_GAMES.map(s => ({ e: s.emoji, n: s.name, kind: 'solo', solo: s })) },
  { players: 2, label: 'play 2',    games: [{ e: '🏎️', n: 'tap racer', kind: 'mp', game: 'racer' }, { e: '🔴', n: 'carrom', kind: 'mp', game: 'carrom' }, { e: '❌', n: 'tic-tac-toe', kind: 'pass' }] },
  { players: 3, label: 'play 3',    games: [{ e: '🏎️', n: 'tap racer', kind: 'mp', game: 'racer' }, { e: '🔴', n: 'carrom', kind: 'mp', game: 'carrom' }] },
  { players: 4, label: 'play 4',    games: [{ e: '🏎️', n: 'tap racer', kind: 'mp', game: 'racer' }, { e: '🔴', n: 'carrom', kind: 'mp', game: 'carrom' }] },
  { players: 5, label: 'play 5',    games: [{ e: '🕵️', n: 'mafia', kind: 'soon' }, { e: '🎭', n: 'charades', kind: 'soon' }] },
];

async function cGet(path)        { try { const r = await fetch(`${API_BASE}${path}`); return r.ok ? await r.json() : null; } catch { return null; } }
async function cPost(path, body) { try { const r = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { ok: r.ok, status: r.status, data: r.ok ? await r.json() : await r.json().catch(() => ({})) }; } catch { return { ok: false, status: 0, data: {} }; } }

// subtle, mature backdrop
function ClubBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#0e1a15', '#0c1512', '#0a0f0d']} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', top: -100, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: EM, opacity: 0.08 }} />
      <View style={{ position: 'absolute', bottom: -80, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: GOLD, opacity: 0.06 }} />
    </View>
  );
}

// ───────────────────────── group chat ─────────────────────────
function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const ls = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 140),
      Animated.timing(d, { toValue: -4, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(d, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay((2 - i) * 140),
    ])));
    ls.forEach(l => l.start());
    return () => ls.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {dots.map((d, i) => <Animated.View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: EM2, transform: [{ translateY: d }] }} />)}
    </View>
  );
}

function ClubChat({ clubCode, myEmail, myName }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [typingNames, setTypingNames] = useState([]);
  const scrollRef = useRef(null);
  const lastTime = useRef(null);
  const seen = useRef(new Set());
  const alive = useRef(true);
  const lastTypingSent = useRef(0);

  const toEnd = useCallback(() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true })), []);

  const merge = useCallback((incoming) => {
    if (!incoming?.length) return;
    setMessages(prev => {
      const next = [...prev];
      for (const m of incoming) { if (seen.current.has(m._id)) continue; seen.current.add(m._id); next.push(m); }
      return next;
    });
    const last = incoming[incoming.length - 1];
    if (last?.createdat) lastTime.current = last.createdat;
    toEnd();
  }, [toEnd]);

  useEffect(() => {
    alive.current = true;
    (async () => { const d = await cGet(`/api/clubchat/${clubCode}`); if (alive.current && d) merge(d.messages || []); })();
    return () => { alive.current = false; };
  }, [clubCode, merge]);

  // poll messages
  useEffect(() => {
    const id = setInterval(async () => {
      const since = lastTime.current ? `?since=${encodeURIComponent(lastTime.current)}` : '';
      const d = await cGet(`/api/clubchat/${clubCode}${since}`);
      if (d && alive.current) merge(d.messages || []);
    }, 2500);
    return () => clearInterval(id);
  }, [clubCode, merge]);

  // poll who is typing
  useEffect(() => {
    const id = setInterval(async () => {
      const d = await cGet(`/api/clubchat/${clubCode}/typing?email=${encodeURIComponent(myEmail)}`);
      if (d && alive.current) { setTypingNames(d.typingNames || []); if ((d.typingNames || []).length) toEnd(); }
    }, 1500);
    return () => clearInterval(id);
  }, [clubCode, myEmail, toEnd]);

  const onType = (t) => {
    setDraft(t);
    const now = Date.now();
    if (t.trim() && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      cPost('/api/clubchat/typing', { clubcode: clubCode, email: myEmail, name: myName });
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const tmp = { _id: `tmp-${Date.now()}`, email: myEmail, name: myName, text, createdat: new Date().toISOString() };
    seen.current.add(tmp._id);
    setMessages(prev => [...prev, tmp]); toEnd();
    const res = await cPost('/api/clubchat/send', { clubcode: clubCode, email: myEmail, name: myName, text });
    if (res.ok && res.data?.message?._id) {
      const real = res.data.message; seen.current.add(real._id);
      if (real.createdat) lastTime.current = real.createdat;
      setMessages(prev => prev.map(m => (m._id === tmp._id ? real : m)));
    }
  };

  const typingLabel = typingNames.length === 1 ? `${typingNames[0]} is typing` : typingNames.length > 1 ? `${typingNames.length} people typing` : '';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 8, flexGrow: 1, justifyContent: 'flex-end' }} onContentSizeChange={toEnd} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
            <Text style={{ fontSize: 26 }}>💬</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>say hi to the crew</Text>
          </View>
        ) : (
          (() => {
            const out = []; let lastDay = null; let lastSender = null;
            messages.forEach((m, idx) => {
              const k = dayKey(m.createdat);
              if (k !== lastDay) { out.push(<View key={`d${m._id}`} style={ch.dayWrap}><View style={ch.dayChip}><Text style={ch.dayTxt}>{dayLabel(m.createdat)}</Text></View></View>); lastDay = k; lastSender = null; }
              const mine = (m.email || '').toLowerCase() === (myEmail || '').toLowerCase();
              const showName = !mine && m.email !== lastSender;
              out.push(<ChatBubble key={m._id} mine={mine} text={m.text} time={m.createdat} name={m.name || initial(m.email)} email={m.email} showName={showName} />);
              lastSender = m.email;
            });
            return out;
          })()
        )}
        {typingLabel ? (
          <View style={ch.typingRow}><TypingDots /><Text style={ch.typingTxt}>{typingLabel}…</Text></View>
        ) : null}
      </ScrollView>

      <View style={ch.inputBar}>
        <LinearGradient colors={[EM + '99', TEAL + '99', GOLD + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ch.ring}>
          <View style={ch.inner}>
            <TextInput value={draft} onChangeText={onType} placeholder="message the crew…" placeholderTextColor="rgba(255,255,255,0.3)" style={ch.input} onSubmitEditing={send} returnKeyType="send" />
            <TouchableOpacity onPress={send} disabled={!draft.trim()} activeOpacity={0.85}>
              <LinearGradient colors={[EM, EM2]} style={[ch.sendBtn, !draft.trim() && { opacity: 0.5 }]}>
                <Svg width={15} height={15} viewBox="0 0 24 24"><Path d="M3 12l18-9-9 18V12H3z" fill="#04220f" /></Svg>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChatBubble({ mine, text, time, name, email, showName }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start(); }, []);
  const st = { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] };
  const meta = (
    <View style={ch.meta}>
      <Text style={[ch.metaTime, { color: mine ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }]}>{fmtTime(time)}</Text>
    </View>
  );
  if (mine) {
    return (
      <Animated.View style={[ch.bubble, { alignSelf: 'flex-end' }, st]}>
        <LinearGradient colors={[EM, '#0f766e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ch.fillMine}>
          <View style={ch.row}><Text style={ch.txtMine}>{text}</Text>{meta}</View>
        </LinearGradient>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 7, alignSelf: 'flex-start', maxWidth: '84%' }, st]}>
      <View style={[ch.avatar, { backgroundColor: colorFor(email) }]}><Text style={{ fontSize: 16 }}>{faceFor(email)}</Text></View>
      <View style={{ flexShrink: 1 }}>
        {showName && <Text style={[ch.sender, { color: colorFor(email) }]}>{name}</Text>}
        <View style={ch.fillTheirs}><View style={ch.row}><Text style={ch.txtTheirs}>{text}</Text>{meta}</View></View>
      </View>
    </Animated.View>
  );
}

// ───────────────────────── footer ─────────────────────────
function ClubFooter({ tab, onTab, inboxCount = 0 }) {
  const TABS = [
    { id: 'crew', label: 'crew', icon: 'M16 19c0-2.2-1.8-3.5-4-3.5S8 16.8 8 19M12 12.5a3 3 0 100-6 3 3 0 000 6M19 19c0-1.6-1-2.7-2.5-3.1M5 19c0-1.6 1-2.7 2.5-3.1' },
    { id: 'chat', label: 'chat', icon: 'M4 5.5h16v11H8.5L4 20z' },
    { id: 'games', label: 'games', icon: 'M8 12h4M10 10v4M16 11.5h.01M18 13.5h.01M9 7.5h6a4.5 4.5 0 014.5 4.5 4.5 4.5 0 01-7.6 3.3 2 2 0 00-2.8 0A4.5 4.5 0 014.5 12 4.5 4.5 0 019 7.5z' },
    { id: 'inbox', label: 'inbox', icon: 'M4 13h4l2 3h4l2-3h4M4 13l2.5-7h11L20 13v5a1 1 0 01-1 1H5a1 1 0 01-1-1z' },
    { id: 'settings', label: 'settings', icon: 'M19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' },
  ];
  return (
    <View style={cf.wrap} pointerEvents="box-none">
      <View style={cf.bar}>
        {TABS.map(t => {
          const active = tab === t.id;
          const color = active ? EM2 : 'rgba(255,255,255,0.4)';
          const badge = t.id === 'inbox' && inboxCount > 0;
          return (
            <TouchableOpacity key={t.id} activeOpacity={0.8} style={cf.tab} onPress={() => onTab(t.id)}>
              <View>
                <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
                  <Path d={t.icon} stroke={badge ? '#fb7185' : color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                {badge && <View style={cf.badge}><Text style={cf.badgeTxt}>{inboxCount}</Text></View>}
              </View>
              <Text style={[cf.label, { color: badge ? '#fb7185' : color }]}>{t.label}</Text>
              {active && <View style={cf.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ───────────────────────── main ─────────────────────────
export default function Club({ onNavigate, params = {} }) {
  const user = params?.user || { name: 'you' };
  const [email, setEmail] = useState((user?.email || '').toLowerCase());
  const [clubs, setClubs] = useState([]);
  const [active, setActive] = useState(null);
  const [tab, setTab] = useState('crew');
  const [members, setMembers] = useState([]);
  const [founderEmail, setFounderEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [renameInput, setRenameInput] = useState('');
  const [renameSaved, setRenameSaved] = useState(false);
  const [gameNote, setGameNote] = useState('');
  const [playing, setPlaying] = useState(null);   // { kind:'solo'|'pass', solo?, name? }
  const [board, setBoard] = useState([]);         // leaderboard rows
  const [raceSession, setRaceSession] = useState(null);  // active multiplayer session id
  const [invites, setInvites] = useState([]);     // open game lobbies I can join
  const [inboxOpen, setInboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const aliveRef = useRef(true);

  const refresh = useCallback(async (mail) => {
    const e = mail || email;
    let list = await getClubs();
    if (e) {
      const d = await cGet(`/api/club/mine/${encodeURIComponent(e)}`);
      if (d?.clubs) {
        for (const sc of d.clubs) {
          const exists = list.find(c => (c.clubCode || '').toLowerCase() === (sc.clubcode || '').toLowerCase());
          const founder = (sc.founderemail || '') === e;
          if (!exists) await saveClub({ clubCode: sc.clubcode, clubName: sc.clubname, founder });
          else if (exists.clubName !== sc.clubname) await saveClub({ ...exists, clubName: sc.clubname });
        }
        const codes = new Set(d.clubs.map(c => (c.clubcode || '').toLowerCase()));
        for (const c of list) if (!codes.has((c.clubCode || '').toLowerCase())) await removeClub(c.clubCode);
        list = await getClubs();
      }
    }
    if (aliveRef.current) setClubs(list);
    return list;
  }, [email]);

  useEffect(() => {
    aliveRef.current = true;
    (async () => {
      let e = email;
      if (!e) { const u = await getUser(); e = (u?.email || '').toLowerCase(); setEmail(e); }
      await refresh(e);
      if (aliveRef.current) setLoading(false);
    })();
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    if (!active?.clubCode) return;
    const load = async () => { const d = await cGet(`/api/club/${active.clubCode}`); if (d?.club && aliveRef.current) { setMembers(d.club.members || []); setFounderEmail((d.club.founderemail || '').toLowerCase()); } };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [active?.clubCode]);

  const loadBoard = useCallback(async (code) => {
    const cc = code || active?.clubCode;
    if (!cc) return;
    const d = await cGet(`/api/clubscore/${cc}`);
    if (d && aliveRef.current) setBoard(d.board || []);
  }, [active?.clubCode]);

  const recordScore = async (gameId, score) => {
    if (!active) return;
    await cPost('/api/clubscore', { clubcode: active.clubCode, email, name: user?.name || '', game: gameId, score });
    loadBoard(active.clubCode);
  };

  // ── multiplayer game invites ──
  const inviteGame = async (playerCount, game) => {
    if (!active) return;
    const res = await cPost('/api/clubgame/invite', { clubcode: active.clubCode, game: game || 'racer', hostemail: email, hostname: user?.name || '', players: playerCount });
    if (res.ok && res.data?.session?._id) setRaceSession(res.data.session._id);
  };
  const joinRace = async (sessionid) => {
    const res = await cPost('/api/clubgame/join', { sessionid, email, name: user?.name || '' });
    setInboxOpen(false);
    if (res.ok && res.data?.session?._id) setRaceSession(res.data.session._id);
  };

  // poll the club's open lobbies (inbox) — excluding ones I already joined
  useEffect(() => {
    if (!active?.clubCode || raceSession) { return; }
    const tick = async () => {
      const d = await cGet(`/api/clubgame/active/${active.clubCode}`);
      if (d?.sessions && aliveRef.current) {
        setInvites(d.sessions.filter(sx => !(sx.players || []).some(p => (p.email || '').toLowerCase() === email)));
      }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [active?.clubCode, raceSession, email]);

  const openClub = (c) => { setMembers([]); setTab('crew'); setRenameInput(c.clubName || ''); setActive(c); loadBoard(c.clubCode); };

  const renameClub = async () => {
    const nm = renameInput.trim();
    if (!nm || !active || nm === active.clubName) return;
    setBusy(true);
    const res = await cPost('/api/club/rename', { clubcode: active.clubCode, clubname: nm });
    setBusy(false);
    if (res.ok) {
      await saveClub({ clubCode: active.clubCode, clubName: nm });
      setActive(a => ({ ...a, clubName: nm }));
      await refresh();
      setRenameSaved(true); setTimeout(() => setRenameSaved(false), 1800);
    }
  };

  const createClub = async () => {
    const nm = nameInput.trim();
    if (!nm || busy) return;
    if (clubs.length >= MAX_CLUBS) { setErr(`you're in ${MAX_CLUBS} clubs already — leave one first`); return; }
    setBusy(true); setErr('');
    const res = await cPost('/api/club/create', { clubname: nm, name: user?.name || '', email });
    setBusy(false);
    if (!res.ok) { setErr(res.data?.error || 'could not create club'); return; }
    await saveClub({ clubCode: res.data.clubcode, clubName: nm, founder: true });
    setNameInput(''); await refresh();
    openClub({ clubCode: res.data.clubcode, clubName: nm, founder: true });
  };

  const joinClub = async () => {
    const code = codeInput.trim().toLowerCase();
    if (!code || busy) return;
    if (clubs.some(c => (c.clubCode || '').toLowerCase() === code)) { setErr("you're already in this club"); return; }
    if (clubs.length >= MAX_CLUBS) { setErr(`you're in ${MAX_CLUBS} clubs already — leave one first`); return; }
    setBusy(true); setErr('');
    const res = await cPost('/api/club/join', { clubcode: code, name: user?.name || '', email });
    setBusy(false);
    if (res.status === 404) { setErr('no club found with that code'); return; }
    if (res.status === 403) { setErr('that club is full — 5 members max'); return; }
    if (!res.ok) { setErr('could not reach the server'); return; }
    const c = res.data.club;
    await saveClub({ clubCode: c.clubcode, clubName: c.clubname, founder: false });
    setCodeInput(''); await refresh();
    openClub({ clubCode: c.clubcode, clubName: c.clubname, founder: false });
  };

  const removeMember = async (targetEmail) => {
    if (!active || busy) return;
    setBusy(true);
    const res = await cPost('/api/club/remove', { clubcode: active.clubCode, founderemail: email, target: targetEmail });
    setBusy(false);
    if (res.ok && res.data?.club) setMembers(res.data.club.members || []);
  };

  const leaveClub = async (c) => {
    setBusy(true);
    await cPost('/api/club/leave', { clubcode: c.clubCode, email });
    await removeClub(c.clubCode);
    setBusy(false); setActive(null); await refresh();
  };

  const copyCode = (code) => { try { Clipboard?.setString?.(code); } catch (_) {} setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: INK }}>
        <ClubBg />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={EM2} size="large" />
          <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 14, letterSpacing: 1 }}>loading your clubs…</Text>
        </SafeAreaView>
      </View>
    );
  }

  // ── multiplayer race (lobby → play → results) ──
  if (active && raceSession) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0e1a15' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <MultiRace
            sessionId={raceSession}
            me={{ email, name: user?.name || '' }}
            RaceComp={RACE_GAME.Comp}
            gameName="tap racer"
            onExit={() => { setRaceSession(null); loadBoard(); }}
            onRecord={(score) => recordScore('racer', score)}
          />
        </SafeAreaView>
      </View>
    );
  }

  // ── playing a club game (full-screen overlay) ──
  if (active && playing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0e1a15' }}>
        <SafeAreaView style={{ flex: 1 }}>
          {playing.kind === 'solo' ? (
            <SoloPlayer
              title={playing.solo.name}
              Comp={playing.solo.Comp}
              onExit={() => { setPlaying(null); loadBoard(); }}
              onScore={(score) => recordScore(playing.solo.id, score)}
            />
          ) : (() => {
            const GameComp = CLUB_GAMES[playing.name];
            return GameComp ? <GameComp onExit={() => setPlaying(null)} /> : null;
          })()}
        </SafeAreaView>
      </View>
    );
  }

  // ── inside a club ──
  if (active) {
    const seats = Array.from({ length: 5 }, (_, i) => members[i] || null);
    return (
      <View style={{ flex: 1, backgroundColor: INK }}>
        <ClubBg />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.nav}>
            <TouchableOpacity onPress={() => setActive(null)} style={s.backBtn}><Text style={s.backTxt}>←</Text></TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.navTitle} numberOfLines={1}>{active.clubName}</Text>
              <Text style={s.navSub}>{members.length}/5 members</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <View style={{ flex: 1 }}>
            {tab === 'crew' ? (
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                {/* invite code */}
                <View style={s.codeCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.codeLabel}>club code</Text>
                    <Text style={s.codeValue}>{active.clubCode}</Text>
                  </View>
                  <TouchableOpacity onPress={() => copyCode(active.clubCode)} style={s.copyBtn} activeOpacity={0.8}>
                    <Text style={s.copyTxt}>{copied ? '✓ copied' : 'copy'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.inviteHint}>share this code to invite friends · up to 5</Text>

                <Text style={s.sectionHdr}>the crew</Text>
                <View style={s.seatGrid}>
                  {seats.map((m, i) => (
                    <View key={i} style={[s.seat, m ? { borderColor: colorFor(m.email) + '66' } : s.seatEmpty]}>
                      {m ? (
                        <>
                          <View style={[s.seatAvatar, { backgroundColor: colorFor(m.email) }]}><Text style={{ fontSize: 20 }}>{faceFor(m.email)}</Text></View>
                          <Text style={s.seatName} numberOfLines={1}>{m.name || initial(m.email)}</Text>
                          {(m.email || '').toLowerCase() === email && <Text style={s.seatYou}>you</Text>}
                        </>
                      ) : (
                        <>
                          <View style={s.seatEmptyDot}><Text style={{ fontSize: 16, opacity: 0.4 }}>＋</Text></View>
                          <Text style={s.seatOpen}>open seat</Text>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : tab === 'chat' ? (
              <View style={{ flex: 1, paddingBottom: 76 }}>
                <ClubChat clubCode={active.clubCode} myEmail={email} myName={user?.name || ''} />
              </View>
            ) : tab === 'games' ? (
              /* ── games, grouped by player count ── */
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                <Text style={s.lobbyTagline}>game room 🎮</Text>
                <Text style={s.lobbySub}>{members.length} in the club · pick a game by crew size</Text>

                {/* leaderboard */}
                <Text style={s.sectionHdr}>🏆 leaderboard</Text>
                {board.length === 0 ? (
                  <Text style={s.boardEmpty}>no scores yet — play a solo game to get on the board</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {board.map((row, i) => {
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
                      const me = (row.email || '').toLowerCase() === email;
                      return (
                        <View key={row.email} style={[s.boardRow, me && { borderColor: EM + '88' }]}>
                          <Text style={s.boardRank}>{medal}</Text>
                          <View style={[s.boardAvatar, { backgroundColor: colorFor(row.email) }]}><Text style={{ fontSize: 16 }}>{faceFor(row.email)}</Text></View>
                          <Text style={s.boardName} numberOfLines={1}>{row.name || initial(row.email)}{me ? ' (you)' : ''}</Text>
                          <Text style={s.boardPts}>{row.points}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {GAME_CATS.map((cat) => {
                  const enough = members.length >= cat.players;
                  return (
                    <View key={cat.players} style={{ marginTop: 18 }}>
                      <View style={s.catHead}>
                        <Text style={s.catTitle}>{cat.label}</Text>
                        <Text style={[s.catTag, enough ? s.catTagOk : s.catTagLock]}>
                          {cat.players === 1 ? '1 player' : `${cat.players} players`}{enough ? '' : ` · need ${cat.players}`}
                        </Text>
                      </View>
                      <View style={s.gameWrap}>
                        {cat.games.map((g) => {
                          const ready = g.kind === 'solo' || g.kind === 'mp' || (g.kind === 'pass' && !!CLUB_GAMES[g.n]);
                          return (
                            <TouchableOpacity
                              key={g.n}
                              activeOpacity={0.85}
                              disabled={!enough}
                              onPress={() => {
                                if (g.kind === 'solo') setPlaying({ kind: 'solo', solo: g.solo });
                                else if (g.kind === 'mp') inviteGame(cat.players, g.game);
                                else if (ready) setPlaying({ kind: 'pass', name: g.n });
                                else { setGameNote(`${g.n} — coming soon 🚧`); setTimeout(() => setGameNote(''), 1800); }
                              }}
                              style={[s.gameTile, !enough && { opacity: 0.4 }, ready && enough && { borderColor: EM }]}
                            >
                              <Text style={{ fontSize: 26 }}>{g.e}</Text>
                              <Text style={s.gameName} numberOfLines={1}>{g.n}</Text>
                              <Text style={[s.gameSoon, ready && enough && { color: EM2 }]}>{!enough ? 'locked' : ready ? 'play' : 'soon'}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
                {!!gameNote && <Text style={s.gameNote}>{gameNote}</Text>}
              </ScrollView>
            ) : tab === 'inbox' ? (
              /* ── inbox: game invites from the crew ── */
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                <Text style={s.lobbyTagline}>📨 inbox</Text>
                <Text style={s.lobbySub}>game invites from your crew</Text>
                {invites.length === 0 ? (
                  <Text style={[s.boardEmpty, { marginTop: 18, textAlign: 'center' }]}>no invites right now.{'\n'}start a multiplayer game and your crew sees it here.</Text>
                ) : (
                  <View style={{ gap: 10, marginTop: 16 }}>
                    {invites.map((sx) => {
                      const host = (sx.players || []).find(p => p.email === sx.hostemail);
                      return (
                        <View key={sx._id} style={s.inviteRow}>
                          <Text style={{ fontSize: 24 }}>🏎️</Text>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.inviteName}>{sx.game === 'racer' ? 'tap racer' : sx.game}</Text>
                            <Text style={s.inviteMeta}>{host?.name || 'someone'} invited you · {sx.players.length}/{sx.required} joined</Text>
                          </View>
                          <TouchableOpacity onPress={() => joinRace(sx._id)} activeOpacity={0.85} style={{ borderRadius: 10, overflow: 'hidden' }}>
                            <LinearGradient colors={[EM, EM2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.joinBtn}><Text style={s.joinTxt}>join</Text></LinearGradient>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            ) : (
              /* ── settings ── */
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                <Text style={s.sectionHdr}>club name</Text>
                <View style={s.formCard}>
                  <TextInput value={renameInput} onChangeText={(t) => { setRenameInput(t); setRenameSaved(false); }} placeholder="club name" placeholderTextColor="rgba(255,255,255,0.3)" style={s.input} maxLength={40} />
                  <TouchableOpacity onPress={renameClub} disabled={busy || !renameInput.trim() || renameInput.trim() === active.clubName} activeOpacity={0.85}
                    style={[s.cta, (!renameInput.trim() || renameInput.trim() === active.clubName || busy) && { opacity: 0.5 }]}>
                    <LinearGradient colors={[EM, EM2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                      <Text style={s.ctaTxt}>{renameSaved ? '✓ saved' : 'save name'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <Text style={s.sectionHdr}>members · {members.length}/5</Text>
                <View style={{ gap: 8 }}>
                  {members.map((m, i) => {
                    const me = (m.email || '').toLowerCase() === email;
                    const founder = (m.email || '').toLowerCase() === founderEmail;
                    const iAmFounder = email === founderEmail;
                    return (
                      <View key={i} style={s.memberRow}>
                        <View style={[s.memberAvatar, { backgroundColor: colorFor(m.email) }]}><Text style={{ fontSize: 18 }}>{faceFor(m.email)}</Text></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={s.memberName} numberOfLines={1}>{m.name || initial(m.email)}{me ? ' (you)' : ''}</Text>
                          <Text style={s.memberMail} numberOfLines={1}>{m.email}</Text>
                        </View>
                        {founder ? (
                          <Text style={s.memberCrown}>👑</Text>
                        ) : iAmFounder ? (
                          <TouchableOpacity onPress={() => removeMember(m.email)} disabled={busy} style={s.kickBtn} activeOpacity={0.8}>
                            <Text style={s.kickTxt}>remove</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                <Text style={s.sectionHdr}>danger zone</Text>
                <TouchableOpacity onPress={() => leaveClub(active)} disabled={busy} style={s.leaveBtnFull} activeOpacity={0.85}>
                  <Text style={s.leaveTxt}>{busy ? '…' : 'leave this club'}</Text>
                </TouchableOpacity>
                <Text style={s.leaveNote}>you'll need the club code to rejoin.</Text>
              </ScrollView>
            )}
          </View>

          <ClubFooter tab={tab} onTab={setTab} inboxCount={invites.length} />
        </SafeAreaView>
      </View>
    );
  }

  // ── lobby ──
  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <StatusBar barStyle="light-content" />
      <ClubBg />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.nav}>
          <TouchableOpacity onPress={() => onNavigate('userhome')} style={s.backBtn}><Text style={s.backTxt}>←</Text></TouchableOpacity>
          <Text style={s.navTitle}>clubs</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={s.lobbyTagline}>your friend groups</Text>
          <Text style={s.lobbySub}>up to 5 people per club · kept separate from your couple home</Text>

          {clubs.length > 0 && (
            <>
              <Text style={s.sectionHdr}>your clubs</Text>
              {clubs.map((c) => (
                <TouchableOpacity key={c.clubCode} onPress={() => openClub(c)} activeOpacity={0.9} style={s.clubRow}>
                  <LinearGradient colors={['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.03)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.clubRowGrad}>
                    <View style={s.clubRowIcon}><Text style={{ fontSize: 22 }}>{c.founder ? '👑' : '🎈'}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.clubRowName} numberOfLines={1}>{c.clubName}</Text>
                      <Text style={s.clubRowCode}>{c.clubCode}{c.founder ? ' · founder' : ''}</Text>
                    </View>
                    <Text style={s.clubRowArrow}>→</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </>
          )}

          {!!err && <Text style={s.err}>{err}</Text>}

          <Text style={s.sectionHdr}>start a club</Text>
          <View style={s.formCard}>
            <TextInput value={nameInput} onChangeText={(t) => { setNameInput(t); setErr(''); }} placeholder="club name" placeholderTextColor="rgba(255,255,255,0.3)" style={s.input} maxLength={32} />
            <TouchableOpacity onPress={createClub} disabled={busy || !nameInput.trim()} activeOpacity={0.85} style={[s.cta, (!nameInput.trim() || busy) && { opacity: 0.5 }]}>
              <LinearGradient colors={[EM, EM2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}><Text style={s.ctaTxt}>create</Text></LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={s.sectionHdr}>join a club</Text>
          <View style={s.formCard}>
            <TextInput value={codeInput} onChangeText={(t) => { setCodeInput(t); setErr(''); }} placeholder="enter a club code (club-1234)" placeholderTextColor="rgba(255,255,255,0.3)" autoCapitalize="none" style={s.input} />
            <TouchableOpacity onPress={joinClub} disabled={busy || !codeInput.trim()} activeOpacity={0.85} style={[s.cta, (!codeInput.trim() || busy) && { opacity: 0.5 }]}>
              <LinearGradient colors={[GOLD, '#e8c170']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}><Text style={[s.ctaTxt, { color: '#2a1d00' }]}>join</Text></LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 20 },
  navTitle: { fontSize: 19, fontWeight: '800', color: '#eafff2', letterSpacing: 0.3 },
  navSub: { fontSize: 11, color: '#86efac', marginTop: 1, letterSpacing: 0.5 },

  lobbyTagline: { fontSize: 26, fontWeight: '800', color: '#eafff2', textAlign: 'center', marginTop: 6, letterSpacing: 0.3 },
  lobbySub: { fontSize: 12.5, color: 'rgba(255,255,255,0.42)', textAlign: 'center', marginTop: 7, marginBottom: 4, lineHeight: 18 },

  sectionHdr: { fontSize: 11, color: '#6ee7b7', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.6, marginTop: 24, marginBottom: 12 },

  clubRow: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  clubRowGrad: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)', borderRadius: 16 },
  clubRowIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,185,129,0.12)' },
  clubRowName: { fontSize: 16, fontWeight: '700', color: '#fff', marginLeft: 14 },
  clubRowCode: { fontSize: 12, color: 'rgba(255,255,255,0.42)', marginLeft: 14, marginTop: 2 },
  clubRowArrow: { fontSize: 19, color: EM2, fontWeight: '700' },

  formCard: { backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 12, gap: 10 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, paddingHorizontal: 14, height: 48, color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : null),
  },
  cta: { borderRadius: 12, overflow: 'hidden' },
  ctaGrad: { height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  ctaTxt: { color: '#04220f', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  err: { color: '#fca5a5', fontSize: 13, marginTop: 14, textAlign: 'center', fontWeight: '600' },

  codeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.28)', borderRadius: 16, padding: 14 },
  codeLabel: { fontSize: 10, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 1.6, fontWeight: '800' },
  codeValue: { fontSize: 22, color: '#fff', fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  copyBtn: { paddingHorizontal: 16, height: 40, borderRadius: 12, backgroundColor: EM, alignItems: 'center', justifyContent: 'center' },
  copyTxt: { color: '#04220f', fontWeight: '800' },
  inviteHint: { fontSize: 12, color: 'rgba(255,255,255,0.42)', textAlign: 'center', marginTop: 8 },

  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  seat: { width: '31%', alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.03)' },
  seatEmpty: { borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.14)' },
  seatAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  seatName: { fontSize: 12.5, color: '#fff', fontWeight: '700', marginTop: 7, maxWidth: '92%' },
  seatYou: { fontSize: 9.5, color: '#6ee7b7', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 1 },
  seatEmptyDot: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderStyle: 'dashed' },
  seatOpen: { fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 7 },

  leaveBtn: { marginTop: 26, alignSelf: 'center', paddingHorizontal: 22, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.4)', alignItems: 'center', justifyContent: 'center' },
  leaveBtnFull: { width: '100%', height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.4)', backgroundColor: 'rgba(248,113,113,0.06)', alignItems: 'center', justifyContent: 'center' },
  leaveTxt: { color: '#fca5a5', fontWeight: '700' },
  leaveNote: { fontSize: 11.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 8 },

  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 14, color: '#fff', fontWeight: '700' },
  memberMail: { fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  memberCrown: { fontSize: 16, marginLeft: 8 },
  kickBtn: { paddingHorizontal: 12, height: 30, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  kickTxt: { color: '#fca5a5', fontSize: 11.5, fontWeight: '700' },

  catHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  catTitle: { fontSize: 16, fontWeight: '800', color: '#eafff2', letterSpacing: 0.3 },
  catTag: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, overflow: 'hidden' },
  catTagOk: { color: '#6ee7b7', backgroundColor: 'rgba(16,185,129,0.14)' },
  catTagLock: { color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.06)' },
  gameWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gameTile: { width: '31%', alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)', gap: 4 },
  gameName: { fontSize: 12.5, color: '#fff', fontWeight: '700', marginTop: 4, maxWidth: '92%' },
  gameSoon: { fontSize: 9, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '800' },
  gameNote: { marginTop: 18, textAlign: 'center', color: GOLD, fontWeight: '700', fontSize: 13 },

  boardEmpty: { fontSize: 12.5, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  boardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  boardRank: { width: 26, fontSize: 15, fontWeight: '900', color: '#eafff2', textAlign: 'center' },
  boardAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  boardName: { flex: 1, marginLeft: 10, fontSize: 14, color: '#fff', fontWeight: '700' },
  boardPts: { fontSize: 15, color: GOLD, fontWeight: '900' },

  inboxBadge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: '#fb7185', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: INK },
  inboxBadgeTxt: { fontSize: 9, color: '#fff', fontWeight: '900' },
  inboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  inboxSheet: { width: '100%', maxWidth: 400, backgroundColor: '#0f1a16', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', borderRadius: 22, padding: 20 },
  inboxTitle: { fontSize: 18, fontWeight: '800', color: '#eafff2' },
  inboxSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  inboxEmpty: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 16, lineHeight: 19 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 },
  inviteName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  inviteMeta: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  joinBtn: { paddingHorizontal: 18, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  joinTxt: { color: '#04220f', fontWeight: '900' },
  inboxClose: { marginTop: 18, alignSelf: 'center' },
  inboxCloseTxt: { color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'lowercase' },
});

const cf = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 18 : 10, paddingHorizontal: 22 },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    width: '100%', maxWidth: 420, borderRadius: 22, paddingVertical: 9, paddingHorizontal: 6,
    backgroundColor: 'rgba(12,21,18,0.96)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 14,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, position: 'relative' },
  label: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  dot: { position: 'absolute', bottom: -3, width: 4, height: 4, borderRadius: 2, backgroundColor: EM },
  badge: { position: 'absolute', top: -5, right: -9, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3.5, backgroundColor: '#fb7185', alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontSize: 8.5, color: '#fff', fontWeight: '900' },
});

const ch = StyleSheet.create({
  dayWrap: { alignItems: 'center', marginVertical: 6 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  dayTxt: { fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: '700', letterSpacing: 0.5 },

  bubble: { maxWidth: '84%' },
  fillMine: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, borderBottomRightRadius: 5 },
  fillTheirs: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, borderBottomLeftRadius: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' },
  txtMine: { color: '#eafff2', fontSize: 14, lineHeight: 20, flexShrink: 1 },
  txtTheirs: { color: '#e8eef0', fontSize: 14, lineHeight: 20, flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginBottom: 1 },
  metaTime: { fontSize: 9.5 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sender: { fontSize: 11, fontWeight: '800', marginBottom: 3, marginLeft: 2 },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4 },
  typingTxt: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' },

  inputBar: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  ring: { borderRadius: 26, padding: 1.5 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(8,14,11,0.96)', borderRadius: 25, paddingLeft: 16, paddingRight: 5, paddingVertical: 5 },
  input: { flex: 1, color: '#eafff2', fontSize: 14, height: 38, paddingVertical: 0, ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : null) },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
