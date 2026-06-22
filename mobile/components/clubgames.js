// components/clubgames.js — playable club mini-games (self-contained, no server).
// Pass-and-play style: the club is hanging out around one device.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Carrom from './carrom.js';

const EM = '#10b981', EM2 = '#34d399', GOLD = '#d4a857';

// ── shell: title bar + back, shared by every game ──
function GameShell({ title, onExit, children }) {
  return (
    <View style={g.shell}>
      <View style={g.bar}>
        <TouchableOpacity onPress={onExit} style={g.back}><Text style={g.backTxt}>←</Text></TouchableOpacity>
        <Text style={g.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 34 }} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// ── plays a solo game from games.js and reports the score to the club leaderboard ──
export function SoloPlayer({ title, Comp, onExit, onScore }) {
  const [k, setK] = useState(0);
  const [result, setResult] = useState(null);   // final score, or null while playing
  const scoreRef = useRef(0);

  const finish = (score) => {
    const s = typeof score === 'number' ? score : scoreRef.current;
    setResult(s);
    onScore?.(s);   // record to leaderboard
  };

  return (
    <GameShell title={title} onExit={onExit}>
      {result == null ? (
        <Comp
          key={k}
          solo
          targetScore={null}
          onScore={(s) => { scoreRef.current = s; }}
          onComplete={finish}
        />
      ) : (
        <View style={g.full}>
          <Text style={g.resultLabel}>you scored</Text>
          <Text style={g.resultScore}>{result}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 26 }}>
            <TouchableOpacity onPress={() => { setResult(null); scoreRef.current = 0; setK(k + 1); }} activeOpacity={0.85} style={{ borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient colors={[EM, EM2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={g.againBtn}><Text style={g.againTxt}>play again</Text></LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={onExit} activeOpacity={0.85} style={g.exitBtn}><Text style={g.exitTxt}>back to games</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </GameShell>
  );
}

// ───────────────────────── Tic-Tac-Toe (2 players, pass & play) ─────────────────────────
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function TicTacToe({ onExit }) {
  const [board, setBoard] = useState(Array(9).fill(''));
  const [turn, setTurn] = useState('X');
  const [winner, setWinner] = useState(null);   // 'X' | 'O' | 'draw' | null
  const [line, setLine] = useState([]);
  const [wins, setWins] = useState({ X: 0, O: 0 });

  const evalBoard = (b) => {
    for (const ln of LINES) { const [a, c, d] = ln; if (b[a] && b[a] === b[c] && b[a] === b[d]) return { w: b[a], ln }; }
    if (b.every(Boolean)) return { w: 'draw', ln: [] };
    return { w: null, ln: [] };
  };

  const place = (i) => {
    if (winner || board[i]) return;
    const b = [...board]; b[i] = turn;
    const { w, ln } = evalBoard(b);
    setBoard(b);
    if (w === 'draw') setWinner('draw');
    else if (w) { setWinner(w); setLine(ln); setWins(s => ({ ...s, [w]: s[w] + 1 })); }
    else setTurn(turn === 'X' ? 'O' : 'X');
  };

  const reset = (starter) => { setBoard(Array(9).fill('')); setTurn(starter || (turn === 'X' ? 'O' : 'X')); setWinner(null); setLine([]); };

  const status = winner === 'draw' ? "it's a draw 🤝" : winner ? `${winner} wins! 🎉` : `${turn}'s turn`;
  const statusColor = winner === 'X' ? '#60a5fa' : winner === 'O' ? '#fb7185' : winner === 'draw' ? GOLD : (turn === 'X' ? '#60a5fa' : '#fb7185');

  return (
    <GameShell title="tic-tac-toe" onExit={onExit}>
      <View style={g.ttWrap}>
        <View style={g.scoreRow}>
          <View style={[g.scorePill, { borderColor: '#60a5fa55' }]}><Text style={[g.scoreX, { color: '#60a5fa' }]}>X  {wins.X}</Text></View>
          <Text style={[g.ttStatus, { color: statusColor }]}>{status}</Text>
          <View style={[g.scorePill, { borderColor: '#fb718555' }]}><Text style={[g.scoreX, { color: '#fb7185' }]}>O  {wins.O}</Text></View>
        </View>

        <View style={g.board}>
          {board.map((c, i) => {
            const winCell = line.includes(i);
            return (
              <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => place(i)} style={[g.cell, winCell && { backgroundColor: 'rgba(16,185,129,0.25)', borderColor: EM }]}>
                <Text style={[g.mark, { color: c === 'X' ? '#60a5fa' : '#fb7185' }]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {winner && (
          <TouchableOpacity onPress={() => reset()} activeOpacity={0.85} style={{ marginTop: 22, borderRadius: 12, overflow: 'hidden' }}>
            <LinearGradient colors={[EM, EM2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={g.againBtn}><Text style={g.againTxt}>play again</Text></LinearGradient>
          </TouchableOpacity>
        )}
        <Text style={g.ttHint}>pass the phone — X and O take turns</Text>
      </View>
    </GameShell>
  );
}

// pass-and-play games (one device). Solo games come from games.js via SoloPlayer.
export const CLUB_GAMES = {
  'tic-tac-toe': TicTacToe,
  'carrom': Carrom,
};

const g = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0e1a15' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(16,185,129,0.18)' },
  back: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 20 },
  title: { fontSize: 17, fontWeight: '800', color: '#eafff2', letterSpacing: 0.3 },

  full: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0e1a15' },
  resultLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textTransform: 'lowercase', letterSpacing: 1 },
  resultScore: { fontSize: 64, fontWeight: '900', color: '#eafff2', marginTop: 4 },
  exitBtn: { paddingHorizontal: 18, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  exitTxt: { color: 'rgba(255,255,255,0.6)', fontWeight: '700' },

  ttWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 340, marginBottom: 18 },
  scorePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1.5 },
  scoreX: { fontSize: 14, fontWeight: '900' },
  ttStatus: { fontSize: 16, fontWeight: '800' },
  board: { width: 300, height: 300, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: 94, height: 94, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: 48, fontWeight: '900' },
  againBtn: { paddingHorizontal: 26, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  againTxt: { color: '#04220f', fontWeight: '900', fontSize: 15 },
  ttHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 16 },
});
