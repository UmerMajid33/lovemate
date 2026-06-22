// components/carrom.js — smooth 2D carrom (pass & play, 2 players).
// Custom physics: elastic coin collisions, friction, corner pockets, slingshot
// striker. Substepped integration keeps fast shots from tunnelling = smooth.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const BOARD = Math.min(width - 28, 350);
const RC = BOARD * 0.027;            // coin radius
const RS = RC * 1.55;               // striker radius
const RP = BOARD * 0.057;           // pocket radius
const PK = RP * 0.95;               // pocket centre inset — hole sits IN the corner
const PIN = BOARD * 0.085;          // baseline rail inset from the walls
const BASE_Y = BOARD - BOARD * 0.16; // striker baseline
const FRICTION = 0.98;
const STOP = 0.1;
const MAXPULL = BOARD * 0.42;
const MAXSPEED = BOARD * 0.052;
const SUBSTEPS = 6;

const POCKETS = [
  { x: PK, y: PK }, { x: BOARD - PK, y: PK },
  { x: PK, y: BOARD - PK }, { x: BOARD - PK, y: BOARD - PK },
];

const COIN_COLORS = { white: '#f5e9cf', black: '#3a2a1c', queen: '#c0392b' };

function buildCoins() {
  const cx = BOARD / 2, cy = BOARD / 2;
  const coins = [{ x: cx, y: cy, r: RC, vx: 0, vy: 0, type: 'queen', live: true }];
  let toggle = 0;
  const ring = (radius, count, startA) => {
    for (let i = 0; i < count; i++) {
      const a = startA + (i / count) * Math.PI * 2;
      coins.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, r: RC, vx: 0, vy: 0, type: toggle++ % 2 ? 'white' : 'black', live: true });
    }
  };
  ring(RC * 2.35, 6, 0);
  ring(RC * 4.7, 12, Math.PI / 12);
  return coins;
}

export function initialCarromState() {
  const cs = buildCoins();
  return { coins: cs.map(co => ({ x: co.x, y: co.y, type: co.type, live: true })), striker: { x: BOARD / 2, y: BASE_Y, live: true } };
}

export default function Carrom({ onExit, net }) {
  const [, tick] = useState(0);
  const [turn, setTurn] = useState(0);            // 0 or 1
  const [scores, setScores] = useState([0, 0]);
  const [msg, setMsg] = useState('player 1 — your shot');
  const [winner, setWinner] = useState(null);
  const [aiming, setAiming] = useState(false);

  const coins = useRef(buildCoins()).current;
  const striker = useRef({ x: BOARD / 2, y: BASE_Y, r: RS, vx: 0, vy: 0, live: true }).current;
  const aim = useRef({ active: false, dirx: 0, diry: 0, power: 0 }).current;
  const shooting = useRef(false);
  const shotPocketed = useRef(0);
  const strikerFoul = useRef(false);
  const turnRef = useRef(0);
  const scoresRef = useRef([0, 0]);
  const rafRef = useRef(null);
  const gripping = useRef(false);
  const phaseRef = useRef('idle');           // 'idle' | 'move' | 'aim'
  const originRef = useRef({ x: 0, y: 0 });  // board top-left in page coords (track off-board)
  const frozenX = useRef(BOARD / 2);         // striker X locked once aiming begins

  const online = !!net;
  const isMyTurn = online ? !!net.isMyTurn : true;

  // LIVE turn-gate refs — PanResponder is built once (useRef) so its handlers
  // close over the first render. Read these refs (mutated every render) instead
  // of the captured isMyTurn/winner, or the gate goes stale and both players move.
  const myTurnRef = useRef(isMyTurn);
  const winnerRef = useRef(null);
  const netRef = useRef(net);     // live net — loop/resolveTurn captured first render only
  myTurnRef.current = isMyTurn;
  winnerRef.current = winner;
  netRef.current = net;

  // anti-ghosting: when it's NOT my turn, snap the striker to baseline centre and
  // freeze it (clear any half-finished grip/aim) until the server hands me the turn.
  useEffect(() => {
    if (online && !isMyTurn) {
      gripping.current = false; phaseRef.current = 'idle';
      aim.active = false; aim.power = 0; setAiming(false);
    }
  }, [isMyTurn, online]);

  const serialize = () => ({
    coins: coins.map(co => ({ x: co.x, y: co.y, type: co.type, live: co.live })),
    striker: { x: striker.x, y: striker.y, live: true },
  });
  const applyBoard = (b) => {
    if (!b) return;
    coins.length = 0;
    (b.coins || []).forEach(co => coins.push({ x: co.x, y: co.y, r: RC, vx: 0, vy: 0, type: co.type, live: co.live !== false }));
    striker.x = b.striker?.x ?? BOARD / 2; striker.y = b.striker?.y ?? BASE_Y;
    striker.vx = 0; striker.vy = 0; striker.live = true;
  };
  // online: sync the board the shooter posted (when I'm not mid-shot)
  useEffect(() => {
    if (online && net.board && !shooting.current) { applyBoard(net.board); tick(t => (t + 1) & 0xffff); }
  }, [online ? JSON.stringify(net.board) : 'x']);

  const anyMoving = () => Math.hypot(striker.vx, striker.vy) > STOP || coins.some(c => c.live && (Math.hypot(c.vx, c.vy) > STOP));

  // floating "+1 / foul" toasts at the pocket where the piece sank
  const flashes = useRef([]);
  const addFlash = (x, y, text, color) => {
    flashes.current.push({
      x: Math.min(Math.max(x, 36), BOARD - 36),
      y: Math.min(Math.max(y, 30), BOARD - 30),
      text, color, until: Date.now() + 900, key: Math.random(),
    });
    setTimeout(() => tick(t => (t + 1) & 0xffff), 950);  // re-render to clear it
  };

  // ── physics ──
  const collide = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    let d = Math.hypot(dx, dy);
    if (d === 0) { d = 0.01; }
    const min = a.r + b.r;
    if (d >= min) return;
    const nx = dx / d, ny = dy / d;
    const ma = a.r * a.r, mb = b.r * b.r;
    // separate
    const overlap = min - d;
    const totM = ma + mb;
    a.x -= nx * overlap * (mb / totM); a.y -= ny * overlap * (mb / totM);
    b.x += nx * overlap * (ma / totM); b.y += ny * overlap * (ma / totM);
    // impulse
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
    const rel = rvx * nx + rvy * ny;
    if (rel > 0) return;
    const e = 0.82;   // restitution — softer so pieces don't rocket off a light touch
    const imp = -(1 + e) * rel / (1 / ma + 1 / mb);
    a.vx -= (imp / ma) * nx; a.vy -= (imp / ma) * ny;
    b.vx += (imp / mb) * nx; b.vy += (imp / mb) * ny;
  };

  // sink when the centre is inside the hole, or rolling slowly over the lip
  const pocketed = (c) => POCKETS.some(p => {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    return d <= RP * 0.78 || (d <= RP && Math.hypot(c.vx, c.vy) < 1.4);
  });
  // corner pockets mean a fast piece can fly past the wall gap — off the board = sunk
  const offBoard = (b) => b.x < -b.r || b.x > BOARD + b.r || b.y < -b.r || b.y > BOARD + b.r;
  // pocket gravity — pieces near the lip get drawn in, sinks feel natural
  const suck = (b) => {
    for (const p of POCKETS) {
      const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
      if (d < RP * 1.5 && d > 0.5) {
        const g = 0.26 * (1 - d / (RP * 1.5));
        b.vx += (dx / d) * g; b.vy += (dy / d) * g;
      }
    }
  };

  const step = () => {
    const bodies = [striker, ...coins].filter(b => b.live);
    for (let s = 0; s < SUBSTEPS; s++) {
      for (const b of bodies) { b.x += b.vx / SUBSTEPS; b.y += b.vy / SUBSTEPS; }
      // walls — but DON'T clamp a body that's over a pocket, so it can drop in
      for (const b of bodies) {
        const overHole = POCKETS.some(p => Math.hypot(b.x - p.x, b.y - p.y) < RP * 1.15);
        if (overHole) continue;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.55; }
        if (b.x > BOARD - b.r) { b.x = BOARD - b.r; b.vx = -Math.abs(b.vx) * 0.55; }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.55; }
        if (b.y > BOARD - b.r) { b.y = BOARD - b.r; b.vy = -Math.abs(b.vy) * 0.55; }
      }
      // collisions
      for (let i = 0; i < bodies.length; i++)
        for (let j = i + 1; j < bodies.length; j++)
          collide(bodies[i], bodies[j]);
    }
    // friction (board damping) + pockets — applied once per frame (~60fps)
    const damp = (b) => {
      b.vx *= FRICTION; b.vy *= FRICTION;
      if (Math.abs(b.vx) < 0.1) b.vx = 0;          // kill micro-slide
      if (Math.abs(b.vy) < 0.1) b.vy = 0;
    };
    damp(striker); if (striker.live) suck(striker);
    if (striker.live && (pocketed(striker) || offBoard(striker))) {
      striker.live = false; strikerFoul.current = true;
      addFlash(striker.x, striker.y, 'foul! 😬', '#fca5a5');
    }
    for (const c of coins) {
      if (!c.live) continue;
      damp(c); suck(c);
      if (pocketed(c) || offBoard(c)) {
        c.live = false; shotPocketed.current += c.type === 'queen' ? 3 : 1;
        addFlash(c.x, c.y, c.type === 'queen' ? '+3 👑' : '+1', '#fde68a');
      }
    }
  };

  const resolveTurn = () => {
    const gained = shotPocketed.current;
    const foul = strikerFoul.current;

    if (online) {
      const n = netRef.current;   // LIVE net (captured-first-render net is stale)
      // striker back to baseline, then hand the authoritative board to the server
      striker.live = true; striker.vx = 0; striker.vy = 0; striker.x = BOARD / 2; striker.y = BASE_Y;
      const remaining = coins.filter(c => c.live).length;
      const done = remaining === 0;
      const sc = { ...(n.scores || {}) };
      const scored = gained > 0 && !foul;
      if (scored) sc[n.me] = (sc[n.me] || 0) + gained;
      // play-again rule: scored & no foul → SAME player; else hand to next
      const next = scored ? n.turnindex : (n.turnindex + 1) % n.playerCount;
      shotPocketed.current = 0; strikerFoul.current = false;
      n.onShot(serialize(), sc, next, done);
      return;
    }

    const ns = [...scoresRef.current];
    if (gained > 0 && !foul) ns[turnRef.current] += gained;
    scoresRef.current = ns; setScores(ns);

    const remaining = coins.filter(c => c.live).length;
    if (remaining === 0) {
      const w = ns[0] === ns[1] ? -1 : (ns[0] > ns[1] ? 0 : 1);
      setWinner(w); setMsg(w === -1 ? "it's a tie!" : `player ${w + 1} wins! 🎉`);
      return;
    }
    // striker back to baseline
    striker.live = true; striker.vx = 0; striker.vy = 0; striker.x = BOARD / 2; striker.y = BASE_Y;
    let nextTurn = turnRef.current;
    if (foul || gained === 0) nextTurn = turnRef.current === 0 ? 1 : 0;
    turnRef.current = nextTurn; setTurn(nextTurn);
    setMsg(foul ? `foul! player ${nextTurn + 1}'s turn` : gained > 0 ? `nice! player ${nextTurn + 1} again` : `player ${nextTurn + 1} — your shot`);
    shotPocketed.current = 0; strikerFoul.current = false;
  };

  useEffect(() => {
    const loop = () => {
      if (shooting.current) {
        step();
        if (!anyMoving()) { shooting.current = false; resolveTurn(); }
        tick(t => (t + 1) & 0xffff);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── gesture: two phases from one drag ──────────────────────────────────────
  // Phase 1 (move): grab striker / baseline, slide horizontally → reposition X (clamped).
  // Phase 2 (aim) : pull DOWN past a threshold → freeze X, slingshot, flick opposite.
  // Tracks via pageX/pageY - boardOrigin so it keeps working when the finger drags
  // far BELOW the board frame. Capture + terminationRequest:false stop scroll hijack.
  // turn gate reads LIVE refs (not captured state) — false when not my turn
  const canPlay = () => !shooting.current && winnerRef.current === null && myTurnRef.current;
  const clampX = (x) => Math.max(RS + PIN, Math.min(BOARD - RS - PIN, x));
  const AIM_TRIGGER = RS * 0.7;   // downward pull (px) needed to switch into aiming

  const pan = useRef(PanResponder.create({
    // don't even claim the responder if it's not this player's turn
    onStartShouldSetPanResponder: () => canPlay(),
    onStartShouldSetPanResponderCapture: () => canPlay(),
    onMoveShouldSetPanResponder: () => canPlay(),
    onMoveShouldSetPanResponderCapture: () => canPlay(),
    onPanResponderTerminationRequest: () => false,   // never yield the touch
    onShouldBlockNativeResponder: () => true,         // block native scroll/back gestures
    onPanResponderGrant: (e) => {
      e.stopPropagation?.();
      if (!canPlay()) { gripping.current = false; return; }
      const { pageX, pageY, locationX, locationY } = e.nativeEvent;
      originRef.current = { x: pageX - locationX, y: pageY - locationY };   // board top-left in page space
      const onStriker  = Math.hypot(locationX - striker.x, locationY - striker.y) < RS * 2.6;
      const nearBase   = Math.abs(locationY - BASE_Y) < RS * 2.6;
      if (!onStriker && !nearBase) { gripping.current = false; return; }
      gripping.current = true;
      phaseRef.current = 'idle';
      if (!onStriker) {                       // grabbed the rail → start repositioning now
        phaseRef.current = 'move';
        striker.x = clampX(locationX); striker.y = BASE_Y;
        tick(t => (t + 1) & 0xffff);
      }
    },
    onPanResponderMove: (e) => {
      if (!gripping.current || !canPlay()) return;
      e.stopPropagation?.();
      const o = originRef.current;
      const x = e.nativeEvent.pageX - o.x;     // board-space coords, valid even off-board
      const y = e.nativeEvent.pageY - o.y;

      // decide phase: pulling down past threshold locks aim & freezes X
      if (phaseRef.current !== 'aim' && (y - striker.y) > AIM_TRIGGER) {
        phaseRef.current = 'aim';
        frozenX.current = striker.x;
        aim.active = true; setAiming(true);
      }

      if (phaseRef.current === 'aim') {
        striker.x = frozenX.current; striker.y = BASE_Y;          // X frozen during aim
        const pullx = x - frozenX.current, pully = y - BASE_Y;
        const mag = Math.hypot(pullx, pully) || 1;
        aim.dirx = -pullx / mag; aim.diry = -pully / mag;         // flick opposite the pull
        aim.power = Math.min(mag, MAXPULL) / MAXPULL;
      } else {
        phaseRef.current = 'move';                                // horizontal slide
        striker.x = clampX(x); striker.y = BASE_Y;
      }
      tick(t => (t + 1) & 0xffff);
    },
    onPanResponderRelease: () => {
      const wasAim = phaseRef.current === 'aim';
      gripping.current = false; phaseRef.current = 'idle';
      if (wasAim && aim.power > 0.06 && canPlay()) {
        striker.vx = aim.dirx * aim.power * MAXSPEED;
        striker.vy = aim.diry * aim.power * MAXSPEED;
        shotPocketed.current = 0; strikerFoul.current = false;
        shooting.current = true;
      }
      aim.active = false; aim.power = 0; setAiming(false);
    },
    onPanResponderTerminate: () => {
      gripping.current = false; phaseRef.current = 'idle';
      aim.active = false; aim.power = 0; setAiming(false);
    },
  })).current;

  const restart = () => {
    const fresh = buildCoins();
    coins.length = 0; fresh.forEach(c => coins.push(c));
    striker.x = BOARD / 2; striker.y = BASE_Y; striker.vx = 0; striker.vy = 0; striker.live = true;
    scoresRef.current = [0, 0]; setScores([0, 0]);
    turnRef.current = 0; setTurn(0); setWinner(null); setMsg('player 1 — your shot');
    shotPocketed.current = 0; strikerFoul.current = false; shooting.current = false;
    flashes.current = [];
    tick(t => (t + 1) & 0xffff);
  };

  // aim guide dots
  const guide = [];
  if (aiming && aim.power > 0.06) {
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      guide.push({ x: striker.x + aim.dirx * aim.power * MAXPULL * t, y: striker.y + aim.diry * aim.power * MAXPULL * t, o: 1 - t * 0.7 });
    }
  }

  return (
    <View style={c.shell}>
      <View style={c.bar}>
        <TouchableOpacity onPress={onExit} style={c.back}><Text style={c.backTxt}>←</Text></TouchableOpacity>
        <Text style={c.title}>carrom</Text>
        {online ? <View style={{ width: 34 }} /> : <TouchableOpacity onPress={restart} style={c.back}><Text style={[c.backTxt, { fontSize: 18 }]}>↻</Text></TouchableOpacity>}
      </View>

      {online ? (
        <View>
          <View style={c.netScores}>
            {net.players.map((p, i) => (
              <View key={i} style={[c.netPill, i === net.turnindex && c.sActive]}>
                <Text style={c.netName} numberOfLines={1}>{(p.name || 'p' + (i + 1))}{p.email === net.me ? ' (you)' : ''}</Text>
                <Text style={c.sNum}>{(net.scores || {})[p.email] || 0}</Text>
              </View>
            ))}
          </View>
          <Text style={[c.msg, { marginTop: 6 }]}>{isMyTurn ? 'your shot — aim & flick' : `waiting for ${net.turnName || 'player'}…`}</Text>
        </View>
      ) : (
        <View style={c.scoreRow}>
          <View style={[c.sPill, turn === 0 && c.sActive]}><Text style={c.sTxt}>P1</Text><Text style={c.sNum}>{scores[0]}</Text></View>
          <Text style={c.msg}>{msg}</Text>
          <View style={[c.sPill, turn === 1 && c.sActive]}><Text style={c.sTxt}>P2</Text><Text style={c.sNum}>{scores[1]}</Text></View>
        </View>
      )}

      <Text style={c.tip}>slide along the line to position · pull the striker down to aim</Text>

      {/* power meter — fills while pulling back */}
      <View style={c.powerWrap}>
        {aiming && aim.power > 0.02 && (
          <View style={[c.powerFill, {
            width: `${Math.max(4, Math.round(aim.power * 100))}%`,
            backgroundColor: aim.power > 0.75 ? '#ef4444' : aim.power > 0.4 ? '#fbbf24' : '#34d399',
          }]} />
        )}
      </View>

      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <View style={c.board} {...pan.panHandlers}>
          <LinearGradient colors={['#caa15a', '#b5863d', '#9c6f2e']} style={StyleSheet.absoluteFill} />
          <View style={c.frame} pointerEvents="none" />
          {/* center decoration */}
          <View pointerEvents="none" style={[c.centerRing, { left: BOARD / 2 - BOARD * 0.13, top: BOARD / 2 - BOARD * 0.13, width: BOARD * 0.26, height: BOARD * 0.26, borderRadius: BOARD * 0.13 }]} />
          {/* pockets */}
          {POCKETS.map((p, i) => (
            <View key={i} pointerEvents="none" style={{ position: 'absolute', left: p.x - RP, top: p.y - RP, width: RP * 2, height: RP * 2, borderRadius: RP, backgroundColor: '#150d06', borderWidth: 2.5, borderColor: 'rgba(245,233,207,0.28)' }} />
          ))}
          {/* baseline rail — the striker slides along this line */}
          <View pointerEvents="none" style={{ position: 'absolute', left: PIN, right: PIN, top: BASE_Y - 1.5, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.55)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: PIN, width: 10, height: 10, borderRadius: 5, top: BASE_Y - 5, backgroundColor: 'rgba(255,255,255,0.5)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', right: PIN, width: 10, height: 10, borderRadius: 5, top: BASE_Y - 5, backgroundColor: 'rgba(255,255,255,0.5)' }} />
          {/* aim guide */}
          {guide.map((g, i) => (
            <View key={i} pointerEvents="none" style={{ position: 'absolute', left: g.x - 3, top: g.y - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', opacity: g.o }} />
          ))}
          {/* coins — queen gets a gold ring */}
          {coins.map((co, i) => co.live && (
            <View key={i} pointerEvents="none" style={{
              position: 'absolute', left: co.x - co.r, top: co.y - co.r, width: co.r * 2, height: co.r * 2, borderRadius: co.r,
              backgroundColor: COIN_COLORS[co.type],
              borderWidth: co.type === 'queen' ? 2 : 1,
              borderColor: co.type === 'queen' ? 'rgba(255,215,130,0.95)' : 'rgba(0,0,0,0.25)',
            }} />
          ))}
          {/* striker — ring + centre dot like the real piece */}
          {striker.live && (
            <>
              <View pointerEvents="none" style={{
                position: 'absolute', left: striker.x - RS, top: striker.y - RS, width: RS * 2, height: RS * 2, borderRadius: RS,
                backgroundColor: '#e8eef2', borderWidth: 2.5, borderColor: '#2563eb',
              }} />
              <View pointerEvents="none" style={{
                position: 'absolute', left: striker.x - RS * 0.32, top: striker.y - RS * 0.32,
                width: RS * 0.64, height: RS * 0.64, borderRadius: RS * 0.32, backgroundColor: '#2563eb', opacity: 0.85,
              }} />
            </>
          )}
          {/* sink toasts */}
          {flashes.current.filter(f => f.until > Date.now()).map(f => (
            <Text key={f.key} pointerEvents="none" style={{
              position: 'absolute', left: f.x - 36, top: f.y - 28, width: 72, textAlign: 'center',
              color: f.color, fontWeight: '900', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4,
            }}>{f.text}</Text>
          ))}
        </View>

        {/* pieces left */}
        <View style={c.leftRow}>
          <View style={c.leftChip}><View style={[c.dot, { backgroundColor: COIN_COLORS.white }]} /><Text style={c.leftTxt}>{coins.filter(x => x.live && x.type === 'white').length}</Text></View>
          <View style={c.leftChip}><View style={[c.dot, { backgroundColor: COIN_COLORS.black, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }]} /><Text style={c.leftTxt}>{coins.filter(x => x.live && x.type === 'black').length}</Text></View>
          {coins.some(x => x.live && x.type === 'queen') && <View style={c.leftChip}><View style={[c.dot, { backgroundColor: COIN_COLORS.queen }]} /><Text style={c.leftTxt}>👑</Text></View>}
        </View>
      </View>

      {/* dead space below the board — room to pull the striker down to aim */}
      <View style={{ flex: 1, minHeight: BOARD * 0.45 }} pointerEvents="none" />

      {!online && winner !== null && (
        <View style={c.overlay} pointerEvents="box-none">
          <View style={c.overCard}>
            <Text style={c.overTitle}>{msg}</Text>
            <Text style={c.overScore}>{scores[0]} — {scores[1]}</Text>
            <TouchableOpacity onPress={restart} activeOpacity={0.85} style={{ borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
              <LinearGradient colors={['#10b981', '#34d399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={c.overBtn}><Text style={c.overBtnTxt}>play again</Text></LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const c = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0e1a15' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(16,185,129,0.18)' },
  back: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 20 },
  title: { fontSize: 17, fontWeight: '800', color: '#eafff2' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 14 },
  sPill: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  sActive: { borderColor: '#34d399', backgroundColor: 'rgba(16,185,129,0.12)' },
  sTxt: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '800', letterSpacing: 1 },
  sNum: { fontSize: 20, color: '#fff', fontWeight: '900' },
  msg: { flex: 1, textAlign: 'center', color: '#fde68a', fontWeight: '700', fontSize: 13 },
  netScores: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 16, marginTop: 14 },
  netPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  netName: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '700', maxWidth: 90 },
  board: { width: BOARD, height: BOARD, borderRadius: 14, overflow: 'hidden', borderWidth: 6, borderColor: '#5a3d18' },
  frame: { position: 'absolute', left: 10, top: 10, right: 10, bottom: 10, borderWidth: 2, borderColor: 'rgba(90,55,20,0.5)', borderRadius: 6 },
  centerRing: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(120,70,20,0.45)' },
  tip: { textAlign: 'center', color: 'rgba(255,255,255,0.32)', fontSize: 10.5, marginTop: 6, paddingHorizontal: 30, lineHeight: 15 },
  powerWrap: { height: 6, marginTop: 8, marginHorizontal: 44, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  powerFill: { height: '100%', borderRadius: 3 },
  leftRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  leftChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  leftTxt: { color: 'rgba(255,255,255,0.75)', fontWeight: '800', fontSize: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  overCard: { backgroundColor: '#0f1a16', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 20, padding: 26, alignItems: 'center' },
  overTitle: { fontSize: 20, fontWeight: '900', color: '#eafff2' },
  overScore: { fontSize: 34, fontWeight: '900', color: '#fde68a', marginTop: 6 },
  overBtn: { paddingHorizontal: 28, height: 48, alignItems: 'center', justifyContent: 'center' },
  overBtnTxt: { color: '#04220f', fontWeight: '900', fontSize: 15 },
});
