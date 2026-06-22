// components/clubrace.js — club multiplayer flow: lobby (wait for players) →
// everyone plays the same race seed → ranked results. Scores also feed the board.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../utils/api.js';
import Carrom, { initialCarromState } from './carrom.js';

const EM = '#10b981', EM2 = '#34d399', GOLD = '#d4a857';
const FACE = ['😎', '🤪', '🥳', '🤠', '👻', '🤖', '👽', '🤡', '🥸', '😈', '🤓', '🦸', '🦹', '🧙', '🤩', '🫡'];
const COLORS = [EM, GOLD, '#fb923c', '#2dd4bf', '#a78bfa', '#f472b6', '#38bdf8', '#fb7185', EM2, '#c084fc'];
const hashStr = (s) => { let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const faceFor = (e) => FACE[hashStr((e || '').toLowerCase()) % FACE.length];
const colorFor = (e) => COLORS[hashStr((e || '').toLowerCase()) % COLORS.length];
const initial = (s) => (s || '?').trim().charAt(0).toUpperCase() || '?';

async function gGet(p) { try { const r = await fetch(`${API_BASE}${p}`); return r.ok ? await r.json() : null; } catch { return null; } }
async function gPost(p, b) { try { const r = await fetch(`${API_BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return r.ok ? await r.json() : null; } catch { return null; } }

export default function MultiRace({ sessionId, me, RaceComp, gameName = 'tap racer', onExit, onRecord }) {
  const [session, setSession] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const aliveRef = useRef(true);

  // poll session state
  useEffect(() => {
    aliveRef.current = true;
    const tick = async () => { const d = await gGet(`/api/clubgame/${sessionId}`); if (d?.session && aliveRef.current) setSession(d.session); };
    tick();
    const id = setInterval(tick, 1200);
    return () => { aliveRef.current = false; clearInterval(id); };
  }, [sessionId]);

  const submit = async (score) => {
    setSubmitted(true);
    await gPost('/api/clubgame/score', { sessionid: sessionId, email: me.email, score });
    onRecord?.(score);   // also feeds the club leaderboard
  };

  const leave = async () => {
    if (session && session.status === 'lobby' && session.hostemail === me.email) await gPost('/api/clubgame/cancel', { sessionid: sessionId });
    onExit?.();
  };

  // carrom: host seeds the initial board once play starts
  const seededRef = useRef(false);
  useEffect(() => {
    if (session && session.game === 'carrom' && session.status === 'playing' && !session.state && session.hostemail === me.email && !seededRef.current) {
      seededRef.current = true;
      const init = initialCarromState();
      setSession(s => s ? { ...s, state: init, scoremap: {}, turnindex: 0 } : s);   // optimistic — show board now
      gPost('/api/clubgame/state', { sessionid: sessionId, state: init, scoremap: {}, turnindex: 0, status: 'playing' });
    }
  }, [session?.status, session?.state, session?.game]);

  // carrom: shooter posts the resolved board + scores + next turn
  const onCarromShot = (state, scoremap, turnindex, done) => {
    setSession(s => s ? { ...s, state, scoremap, turnindex, status: done ? 'done' : 'playing' } : s);   // optimistic
    gPost('/api/clubgame/state', { sessionid: sessionId, state, scoremap, turnindex, status: done ? 'done' : 'playing' })
      .then(() => { if (done) onRecord?.(Math.max(0, ...Object.values(scoremap || { 0: 0 }))); });
  };

  if (!session) {
    return <Shell title={gameName} onExit={onExit}><View style={r.center}><ActivityIndicator color={EM2} /></View></Shell>;
  }

  const label = session.game === 'carrom' ? 'carrom' : 'tap racer';

  // ── lobby ──
  if (session.status === 'lobby') {
    return (
      <Shell title={label} onExit={leave}>
        <View style={r.center}>
          <Text style={r.big}>{session.players.length}/{session.required}</Text>
          <Text style={r.sub}>waiting for the crew to join…</Text>
          <View style={{ marginTop: 20, gap: 8, width: '100%', maxWidth: 320 }}>
            {session.players.map((p, i) => (
              <View key={i} style={r.pRow}>
                <View style={[r.avatar, { backgroundColor: colorFor(p.email) }]}><Text style={{ fontSize: 16 }}>{faceFor(p.email)}</Text></View>
                <Text style={r.pName}>{p.name || initial(p.email)}{p.email === me.email ? ' (you)' : ''}</Text>
                {p.email === session.hostemail && <Text style={{ fontSize: 14 }}>👑</Text>}
              </View>
            ))}
            {Array.from({ length: Math.max(0, session.required - session.players.length) }).map((_, i) => (
              <View key={`e${i}`} style={[r.pRow, r.pEmpty]}><Text style={r.pWait}>waiting…</Text></View>
            ))}
          </View>
          <Text style={r.hint}>tell your club to open the inbox and join 📨</Text>
          <TouchableOpacity onPress={leave} style={r.cancel}><Text style={r.cancelTxt}>{session.hostemail === me.email ? 'cancel game' : 'leave'}</Text></TouchableOpacity>
        </View>
      </Shell>
    );
  }

  // ── carrom: turn-based shared board ──
  if (session.game === 'carrom' && session.status === 'playing') {
    if (!session.state) {
      return <Shell title="carrom" onExit={onExit}><View style={r.center}><ActivityIndicator color={EM2} /><Text style={r.sub}>setting up the board…</Text></View></Shell>;
    }
    const ti = session.turnindex || 0;
    const net = {
      board: session.state, me: me.email, scores: session.scoremap || {},
      turnindex: ti, playerCount: session.players.length, players: session.players,
      turnName: session.players[ti]?.name, isMyTurn: session.players[ti]?.email === me.email,
      onShot: onCarromShot,
    };
    return <Carrom net={net} onExit={onExit} />;
  }

  // ── racer playing ──
  if (session.status === 'playing' && !submitted) {
    return (
      <Shell title={gameName} onExit={onExit}>
        <RaceComp key={sessionId} solo seed={session.seed} targetScore={null} onScore={() => {}} onComplete={submit} />
      </Shell>
    );
  }
  if (session.status === 'playing' && submitted) {
    const done = session.players.filter(p => p.done).length;
    return (
      <Shell title={label} onExit={onExit}>
        <View style={r.center}>
          <ActivityIndicator color={EM2} />
          <Text style={r.sub}>waiting for others… {done}/{session.players.length} finished</Text>
        </View>
      </Shell>
    );
  }

  // ── done → ranked results ──
  const ranked = session.game === 'carrom'
    ? [...session.players].map(p => ({ ...p, score: (session.scoremap || {})[p.email] || 0 })).sort((a, b) => (b.score || 0) - (a.score || 0))
    : [...session.players].sort((a, b) => (b.score || 0) - (a.score || 0));
  return (
    <Shell title={label} onExit={onExit}>
      <View style={r.center}>
        <Text style={r.winnerLabel}>🏁 results</Text>
        <View style={{ marginTop: 16, gap: 8, width: '100%', maxWidth: 340 }}>
          {ranked.map((p, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
            const me2 = p.email === me.email;
            return (
              <View key={i} style={[r.resRow, i === 0 && { borderColor: GOLD + 'aa', backgroundColor: 'rgba(212,168,87,0.1)' }, me2 && i !== 0 && { borderColor: EM + '88' }]}>
                <Text style={r.rank}>{medal}</Text>
                <View style={[r.avatar, { backgroundColor: colorFor(p.email) }]}><Text style={{ fontSize: 16 }}>{faceFor(p.email)}</Text></View>
                <Text style={r.pName}>{p.name || initial(p.email)}{me2 ? ' (you)' : ''}</Text>
                <Text style={r.score}>{p.score ?? 0}</Text>
              </View>
            );
          })}
        </View>
        <TouchableOpacity onPress={onExit} activeOpacity={0.85} style={{ marginTop: 26, borderRadius: 12, overflow: 'hidden' }}>
          <LinearGradient colors={[EM, EM2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={r.doneBtn}><Text style={r.doneTxt}>back to games</Text></LinearGradient>
        </TouchableOpacity>
      </View>
    </Shell>
  );
}

function Shell({ title, onExit, children }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0e1a15' }}>
      <View style={r.bar}>
        <TouchableOpacity onPress={onExit} style={r.back}><Text style={r.backTxt}>←</Text></TouchableOpacity>
        <Text style={r.title}>{title}</Text>
        <View style={{ width: 34 }} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const r = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(16,185,129,0.18)' },
  back: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 20 },
  title: { fontSize: 17, fontWeight: '800', color: '#eafff2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  big: { fontSize: 56, fontWeight: '900', color: '#eafff2' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8, textAlign: 'center' },
  hint: { fontSize: 12.5, color: 'rgba(255,255,255,0.4)', marginTop: 22, textAlign: 'center' },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  pEmpty: { borderStyle: 'dashed', justifyContent: 'center' },
  pWait: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pName: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  cancel: { marginTop: 24, paddingHorizontal: 20, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.4)', alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { color: '#fca5a5', fontWeight: '700' },
  winnerLabel: { fontSize: 22, fontWeight: '900', color: '#eafff2' },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  rank: { width: 24, fontSize: 15, fontWeight: '900', color: '#eafff2', textAlign: 'center' },
  score: { fontSize: 15, color: GOLD, fontWeight: '900' },
  doneBtn: { paddingHorizontal: 26, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  doneTxt: { color: '#04220f', fontWeight: '900', fontSize: 15 },
});
