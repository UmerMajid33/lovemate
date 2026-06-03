// screens/GamesScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Animated, StatusBar, Easing, Platform, ActivityIndicator, Pressable, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, Ellipse, G, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import Matter from 'matter-js';
import { API_BASE } from '../utils/api.js';
import { colors as TC, fonts as TF } from '../theme/theme.js';
import SpaceBackground from '../theme/SpaceBackground.js';
import ReactionRush3D from '../components/games3d/ReactionRush3D.js';

const { width, height } = Dimensions.get('window');

const LOBBY_POLL = 4000; // ms between lobby state checks

async function gPost(path, body) {
  try {
    const r = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.ok ? await r.json() : null;
  } catch (_) { return null; }
}
async function gGet(path) {
  try { const r = await fetch(`${API_BASE}${path}`); return r.ok ? await r.json() : null; }
  catch (_) { return null; }
}

// ─── Game catalog ─────────────────────────────────────────────────────────────
const GAMES = [
  { id: 'reaction', label: 'reaction rush',  time: '30 sec',   desc: 'tap every heart before it vanishes',    color: '#ff4d6d', dark: '#7b0020', bg: ['#0d0005','#1a000a','#0d0005'], grad: ['#ff9ec7','#ff4d6d','#a30030'] },
  { id: 'racer',    label: 'tap racer',      time: '20 sec',   desc: 'mash the gas — whoever taps more wins', color: '#22c55e', dark: '#064e1e', bg: ['#020d04','#041508','#020d04'], grad: ['#4ade80','#22c55e','#15803d'] },
  { id: 'goal',     label: 'goal rush',      time: '10 shots', desc: 'pick your zone and beat the keeper',    color: '#3b82f6', dark: '#0c2a6b', bg: ['#020810','#040f25','#020810'], grad: ['#93c5fd','#3b82f6','#1d4ed8'] },
  { id: 'balloon',  label: 'balloon pop',    time: '25 sec',   desc: 'pop every balloon before it escapes',   color: '#f472b6', dark: '#7b1460', bg: ['#120208','#1e0410','#120208'], grad: ['#fbb6e8','#f472b6','#be185d'] },
  { id: 'memory',   label: 'memory match',   time: '2 min',    desc: 'flip cards and find every love pair',   color: '#a78bfa', dark: '#3b0764', bg: ['#06031a','#0e0730','#06031a'], grad: ['#c4b5fd','#a78bfa','#6d28d9'] },
  { id: 'pattern',  label: 'pattern master', time: '∞ levels', desc: 'watch, remember, repeat — then beat',   color: '#fbbf24', dark: '#7c4b00', bg: ['#0e0a00','#1c1200','#0e0a00'], grad: ['#fde68a','#fbbf24','#b45309'] },
  { id: 'bounce',   label: 'bounce blitz',   time: '40 sec',   desc: 'real physics — tap to keep the heart up', color: '#ff4d6d', dark: '#7b0020', bg: ['#160009','#2d0012','#160009'], grad: ['#ff9ec7','#ff4d6d','#a30030'] },
];

// ─── Memory symbols ───────────────────────────────────────────────────────────
const MEM_SYMS = ['💌','🌹','💍','🦋','🌙','⭐','🎀','💞'];
function makeBoard() {
  const p = [...MEM_SYMS, ...MEM_SYMS];
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p.map((s, i) => ({ id: i, sym: s, flipped: false, matched: false }));
}

// ─── FC reward chip (shown on every game's result) ───────────────────────────
function FcChip({ amount }) {
  if (!amount) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1.5, borderColor: 'rgba(251,191,36,0.3)', borderRadius: 100, paddingHorizontal: 22, paddingVertical: 11 }}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
        <Path d="M12 8v8M9 11h6M9 13h6" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
      <Text style={{ fontSize: 16, color: '#fbbf24', fontWeight: '900', textTransform: 'lowercase' }}>+{amount} fc earned</Text>
    </View>
  );
}

// ─── HUD bar ──────────────────────────────────────────────────────────────────
function GameHud({ left, mid, right, timeLeft, totalTime, timeColor = '#22c55e' }) {
  return (
    <>
      <LinearGradient colors={['rgba(0,0,0,0.85)','rgba(0,0,0,0)']} style={st.hudGrad} pointerEvents="none"/>
      <View style={st.gameHud}>
        <View style={st.hudLeft}>
          <Text style={[st.hudLabel, { color: left.color }]}>{left.label}</Text>
          <Text style={[st.hudVal, { color: left.color }]}>{left.value}</Text>
        </View>
        {mid && (
          <View style={st.hudMid}>
            <Text style={st.hudLabel}>beat</Text>
            <Text style={[st.hudVal, { color: left.value >= mid ? '#22c55e' : '#fff', fontSize: 18 }]}>{mid}</Text>
          </View>
        )}
        <View style={st.hudRight}>
          <Text style={[st.hudLabel, { color: timeColor }]}>{right.label}</Text>
          <Text style={[st.hudVal, { color: timeColor }]}>{right.value}</Text>
        </View>
      </View>
      {totalTime && (
        <View style={st.timerBg}>
          <Animated.View style={[st.timerFill, {
            width: `${(timeLeft / totalTime) * 100}%`,
            backgroundColor: timeColor,
            shadowColor: timeColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
          }]} />
        </View>
      )}
    </>
  );
}

// ─── 3D heart target ──────────────────────────────────────────────────────────
function Heart3D({ size = 60, onPress, color = '#ff4d6d' }) {
  const sc = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(sc, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }).start();
  }, []);
  const press = () => {
    Animated.sequence([
      Animated.timing(sc, { toValue: 1.35, duration: 70, useNativeDriver: true }),
      Animated.timing(sc, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <TouchableOpacity onPress={press} activeOpacity={1}>
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          shadowColor: color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.9, shadowRadius: 16,
          elevation: 16,
        }}>
          <LinearGradient colors={[lighten(color), color, darken(color)]} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', top: size * 0.1, left: size * 0.2, width: size * 0.3, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
            <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
              <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill="#fff" />
            </Svg>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 80);
  const g = Math.min(255, ((n >> 8)  & 0xff) + 80);
  const b = Math.min(255, (n & 0xff) + 80);
  return `rgb(${r},${g},${b})`;
}
function darken(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 60);
  const g = Math.max(0, ((n >> 8)  & 0xff) - 60);
  const b = Math.max(0, (n & 0xff) - 60);
  return `rgb(${r},${g},${b})`;
}

// ─── GAME 1: Reaction Rush ────────────────────────────────────────────────────
function ReactionRush({ targetScore, onComplete, onScore }) {
  const [score, setScore]   = useState(0);
  const [timeLeft, setTime] = useState(30);
  const [targets, setTgts]  = useState([]);
  const ref = useRef(0); const timerRef = useRef(); const spawnRef = useRef();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let c = 3;
    const cd = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(cd);
        startGame();
      }
    }, 1000);
    return () => { clearInterval(cd); clearInterval(timerRef.current); clearInterval(spawnRef.current); };
  }, []);

  const startGame = () => {
    timerRef.current = setInterval(() => setTime(t => {
      if (t <= 1) {
        clearInterval(timerRef.current);
        clearInterval(spawnRef.current);
        setTimeout(() => onComplete(ref.current), 300);
        return 0;
      }
      return t - 1;
    }), 1000);
    spawnRef.current = setInterval(() => {
      const id = Date.now() + Math.random();
      const x = 28 + Math.random() * (width - 110);
      const y = 100 + Math.random() * (height * 0.5);
      setTgts(p => [...p.slice(-14), { id, x, y }]);
      setTimeout(() => setTgts(p => p.filter(t => t.id !== id)), 1400);
    }, 380);
  };

  const tap = (id) => {
    setTgts(p => p.filter(t => t.id !== id));
    ref.current++;
    setScore(ref.current);
    onScore?.(ref.current);
  };

  const timeColor = timeLeft > 10 ? '#22c55e' : '#ef4444';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#0d0005','#1a000a','#0d0005']} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', bottom: 0, alignSelf: 'center', width: width * 1.2, height: 300, borderRadius: 150, backgroundColor: '#ff4d6d', opacity: 0.05 }} />
      <GameHud
        left={{ label: 'score', value: score, color: '#ff9ec7' }}
        mid={targetScore}
        right={{ label: 'time', value: `${timeLeft}s`, color: timeColor }}
        timeLeft={timeLeft} totalTime={30} timeColor={timeColor}
      />
      {countdown > 0 && (
        <View style={st.countdownOverlay}>
          <Text style={st.countdownNum}>{countdown}</Text>
          <Text style={st.countdownSub}>get ready</Text>
        </View>
      )}
      {countdown <= 0 && targets.map(t => (
        <View key={t.id} style={{ position: 'absolute', left: t.x, top: t.y }}>
          <Heart3D size={62} onPress={() => tap(t.id)} color="#ff4d6d" />
        </View>
      ))}
    </View>
  );
}

// ─── GAME 2: Tap Racer ────────────────────────────────────────────────────────
// A single race car (parametric colour). idKey keeps SVG gradient ids unique.
function RaceCar({ idKey, c1, c2, c3, glass }) {
  return (
    <Svg width={46} height={70} viewBox="0 0 54 80">
      <Defs>
        <SvgLinearGradient id={`body${idKey}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={c3} /><Stop offset="40%" stopColor={c2} /><Stop offset="100%" stopColor={c1} />
        </SvgLinearGradient>
        <SvgLinearGradient id={`glass${idKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={glass} stopOpacity="0.95" /><Stop offset="100%" stopColor={c2} stopOpacity="0.4" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="6" y="20" width="42" height="52" fill={`url(#body${idKey})`} rx="7" />
      <Rect x="12" y="8" width="30" height="22" fill={`url(#body${idKey})`} rx="5" />
      <Rect x="15" y="11" width="24" height="16" fill={`url(#glass${idKey})`} rx="3" />
      <Rect x="9" y="24" width="6" height="44" fill="rgba(255,255,255,0.12)" rx="3" />
      <Ellipse cx="14" cy="68" rx="5" ry="3" fill="#fde68a" opacity="0.95" />
      <Ellipse cx="40" cy="68" rx="5" ry="3" fill="#fde68a" opacity="0.95" />
      <Ellipse cx="4"  cy="32" rx="5" ry="6" fill="#0f172a" /><Ellipse cx="50" cy="32" rx="5" ry="6" fill="#0f172a" />
      <Ellipse cx="4"  cy="58" rx="5" ry="6" fill="#0f172a" /><Ellipse cx="50" cy="58" rx="5" ry="6" fill="#0f172a" />
    </Svg>
  );
}

// One scrolling lane with a car that rises with progress (0..1).
function RaceLane({ label, labelColor, progressAnim, scrollY, car, leading }) {
  const RISE = height * 0.34; // how far up the track the car travels
  const carY = progressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -RISE], extrapolate: 'clamp' });
  return (
    <View style={st.lane}>
      <Text style={[st.laneLabel, { color: labelColor }]} numberOfLines={1}>{label}{leading ? '  ▲' : ''}</Text>
      <View style={st.laneTrack}>
        {/* scrolling dashes = road moving */}
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: -40, bottom: -40, transform: [{ translateY: scrollY }] }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={i} style={{ position: 'absolute', top: i * 36, alignSelf: 'center', width: 5, height: 18, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' }} />
          ))}
        </Animated.View>
        {/* finish line */}
        <View style={st.finishLine}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? '#fff' : '#111' }} />
          ))}
        </View>
        {/* car */}
        <Animated.View style={{ position: 'absolute', bottom: 6, alignSelf: 'center', transform: [{ translateY: carY }] }}>
          <RaceCar {...car} />
        </Animated.View>
      </View>
    </View>
  );
}

function TapRacer({ onComplete, solo = false, partnerName, onScore }) {
  const DURATION = 20;
  const RACE_TAPS = 60; // taps to drive your car to the finish line (gradual)
  const [taps, setTaps]     = useState(0);
  const [timeLeft, setTime] = useState(DURATION);
  const [countdown, setCountdown] = useState(3);
  const tapsRef  = useRef(0);
  const timerRef = useRef();
  const rivalRef = useRef(0);
  const rivalIntRef = useRef();
  const aliveRef = useRef(true);
  const endedRef = useRef(false);

  const youProg   = useRef(new Animated.Value(0)).current;
  const rivalProg = useRef(new Animated.Value(0)).current;
  const [rivalP, setRivalP] = useState(0);
  const scrollY      = useRef(new Animated.Value(0)).current;
  const roadIntRef   = useRef(null);
  const roadSpeedRef = useRef(8);   // px/frame — surges on each tap, decays when idle
  const scrollPosRef = useRef(0);

  // rival finishes the track in a random, competitive time
  const rivalSecs = useRef(15 + Math.random() * 9).current; // 15–24s

  useEffect(() => {
    let c = 3;
    const cd = setInterval(() => {
      c--; setCountdown(c);
      if (c <= 0) { clearInterval(cd); startRace(); }
    }, 1000);
    return () => {
      aliveRef.current = false;
      clearInterval(cd); clearInterval(timerRef.current);
      clearInterval(rivalIntRef.current); clearInterval(roadIntRef.current);
    };
  }, []);

  const finish = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(timerRef.current); clearInterval(rivalIntRef.current); clearInterval(roadIntRef.current);
    setTimeout(() => onComplete?.(tapsRef.current), 600);
  };

  const startRace = () => {
    // Road scrolls fast right after a tap, eases down to a slow idle when you stop —
    // so tapping clearly = speed, idle = the road slows.
    roadIntRef.current = setInterval(() => {
      if (!aliveRef.current) return;
      roadSpeedRef.current = Math.max(2, roadSpeedRef.current - 2.2);
      scrollPosRef.current = (scrollPosRef.current + roadSpeedRef.current) % 36;
      scrollY.setValue(scrollPosRef.current);
    }, 33);

    timerRef.current = setInterval(() => {
      if (!aliveRef.current) return;
      setTime(t => {
        if (t <= 1) { finish(); return 0; }
        return t - 1;
      });
    }, 1000);

    // rival car advances steadily
    const step = 1 / (rivalSecs * 10); // updates 10×/sec
    rivalIntRef.current = setInterval(() => {
      if (!aliveRef.current) return;
      rivalRef.current = Math.min(1, rivalRef.current + step);
      setRivalP(rivalRef.current);
      Animated.timing(rivalProg, { toValue: rivalRef.current, duration: 100, useNativeDriver: true }).start();
    }, 100);
  };

  const handleGas = () => {
    if (countdown > 0 || endedRef.current) return;
    tapsRef.current++; setTaps(tapsRef.current); onScore?.(tapsRef.current);
    const p = Math.min(1, tapsRef.current / RACE_TAPS);
    // smooth glide forward (never overshoots past the finish)
    Animated.timing(youProg, { toValue: p, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    roadSpeedRef.current = Math.min(54, roadSpeedRef.current + 10);
    if (tapsRef.current >= RACE_TAPS) finish(); // crossed the finish line → win
  };

  const timeColor = timeLeft > 7 ? '#22c55e' : '#ef4444';
  const youP = Math.min(1, taps / RACE_TAPS);
  const youLeading = youP >= rivalP;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#020d04','#041508','#020d04']} style={StyleSheet.absoluteFill} />

      <GameHud
        left={{ label: 'taps', value: taps, color: '#4ade80' }}
        right={{ label: 'time', value: `${timeLeft}s`, color: timeColor }}
        timeLeft={timeLeft} totalTime={DURATION} timeColor={timeColor}
      />

      {/* Two-lane race track */}
      <View style={st.raceArea}>
        <RaceLane
          label="you"
          labelColor="#4ade80"
          progressAnim={youProg}
          scrollY={scrollY}
          leading={youLeading}
          car={{ idKey: 'you', c1: '#14532d', c2: '#22c55e', c3: '#166534', glass: '#86efac' }}
        />
        <View style={st.laneDivider} />
        <RaceLane
          label={solo ? 'rival' : (partnerName || 'partner')}
          labelColor="#f472b6"
          progressAnim={rivalProg}
          scrollY={scrollY}
          leading={!youLeading}
          car={{ idKey: 'rival', c1: '#9d174d', c2: '#f472b6', c3: '#be185d', glass: '#fbb6e8' }}
        />
      </View>

      {/* GAS button */}
      <TouchableOpacity onPress={handleGas} activeOpacity={0.8} style={{ position: 'absolute', bottom: 50, alignSelf: 'center' }}>
        <View style={{ shadowColor: '#22c55e', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.9, shadowRadius: 28, elevation: 20 }}>
          <LinearGradient colors={['#86efac','#22c55e','#15803d','#052e16']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
            style={{ width: 124, height: 124, borderRadius: 62, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(134,239,172,0.4)' }}>
            <View style={{ position: 'absolute', top: 12, left: 22, width: 48, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <Text style={{ fontSize: countdown > 0 ? 32 : 24, fontWeight: '900', color: '#fff', textTransform: 'lowercase' }}>
              {countdown > 0 ? countdown : '⚡'}
            </Text>
            {countdown <= 0 && <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, letterSpacing: 1 }}>tap!</Text>}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── GAME 3: Goal Rush ────────────────────────────────────────────────────────
const GOAL_SHOTS = 10;
function GoalRush({ targetScore, onComplete, onScore }) {
  const [goals, setGoals]  = useState(0);
  const [shot, setShot]    = useState(0);
  const [phase, setPhase]  = useState('aim');
  const [selected, setSel] = useState(null);
  const [isGoal, setIsGoal]= useState(null);
  const [countdown, setCountdown] = useState(3);
  const ballX   = useRef(new Animated.Value(0)).current;
  const ballY   = useRef(new Animated.Value(0)).current;
  const ballSc  = useRef(new Animated.Value(1)).current;
  const keeperX = useRef(new Animated.Value(0)).current;
  const feedbackSc = useRef(new Animated.Value(0)).current;
  const goalsRef = useRef(0);

  useEffect(() => {
    let c = 3;
    const cd = setInterval(() => { c--; setCountdown(c); if (c <= 0) clearInterval(cd); }, 1000);
    return () => clearInterval(cd);
  }, []);

  const shoot = (zone) => {
    if (phase !== 'aim' || countdown > 0) return;
    setSel(zone);
    setPhase('flying');
    const kz = ['left','center','right'][Math.floor(Math.random() * 3)];
    const tx = zone === 'left' ? -width / 3.5 : zone === 'right' ? width / 3.5 : 0;
    const kx = kz === 'left' ? -60 : kz === 'right' ? 60 : 0;
    Animated.parallel([
      Animated.timing(ballX,   { toValue: tx,           duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(ballY,   { toValue: -height * 0.38, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(ballSc,  { toValue: 0.45,          duration: 500, useNativeDriver: true }),
      Animated.timing(keeperX, { toValue: kx,            duration: 280, useNativeDriver: true }),
    ]).start(() => {
      const scored = zone !== kz;
      if (scored) { goalsRef.current++; setGoals(goalsRef.current); onScore?.(goalsRef.current * 100); }
      setIsGoal(scored);
      feedbackSc.setValue(0);
      Animated.spring(feedbackSc, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }).start();
      setPhase('result');
      setTimeout(() => {
        const next = shot + 1;
        if (next >= GOAL_SHOTS) { onComplete(goalsRef.current * 100); return; }
        setShot(next); setSel(null); setIsGoal(null); setPhase('aim');
        ballX.setValue(0); ballY.setValue(0); ballSc.setValue(1); keeperX.setValue(0);
        feedbackSc.setValue(0);
      }, 950);
    });
  };

  const ZONES = [
    { id: 'left',   label: '← left',   x: -1 },
    { id: 'center', label: 'center',   x: 0 },
    { id: 'right',  label: 'right →',  x: 1 },
  ];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#020810','#040f25','#020810']} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', top: 50, alignSelf: 'center', width: width * 1.2, height: 300, borderRadius: 150, backgroundColor: '#1d4ed8', opacity: 0.06 }} />
      <GameHud
        left={{ label: 'goals', value: `${goals}/${GOAL_SHOTS}`, color: '#93c5fd' }}
        mid={targetScore ? targetScore / 100 : null}
        right={{ label: 'shots', value: `${shot}/${GOAL_SHOTS}`, color: '#fff' }}
      />
      <View style={{ position: 'absolute', top: 88, left: 20, right: 20, height: height * 0.32, alignItems: 'center', justifyContent: 'flex-start' }}>
        <LinearGradient colors={['rgba(59,130,246,0.08)','rgba(59,130,246,0.03)']} style={{ position: 'absolute', top: 0, left: 16, right: 16, bottom: 0, borderRadius: 8 }} />
        <View style={{ position: 'absolute', left: 16, top: 0, width: 6, height: '80%', backgroundColor: '#e2e8f0', borderRadius: 3, shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8 }} />
        <View style={{ position: 'absolute', right: 16, top: 0, width: 6, height: '80%', backgroundColor: '#e2e8f0', borderRadius: 3, shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8 }} />
        <View style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8 }} />
        {[0.2, 0.4, 0.6, 0.8].map(pct => (
          <View key={pct} style={{ position: 'absolute', top: `${pct * 80}%`, left: 20, right: 20, height: 1, backgroundColor: 'rgba(59,130,246,0.2)' }} />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map(pct => (
          <View key={pct} style={{ position: 'absolute', left: `${pct * 100}%`, top: 0, width: 1, height: '80%', backgroundColor: 'rgba(59,130,246,0.15)' }} />
        ))}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%', borderRadius: 8 }}>
          <LinearGradient colors={['#14532d','#166534','#15803d']} style={StyleSheet.absoluteFill} />
          {[0.15, 0.35, 0.55, 0.75, 0.95].map(x => (
            <View key={x} style={{ position: 'absolute', left: `${x * 100}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} />
          ))}
          <View style={{ position: 'absolute', bottom: '30%', alignSelf: 'center', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' }} />
        </View>
        <Animated.View style={{ position: 'absolute', top: '8%', alignSelf: 'center', transform: [{ translateX: keeperX }] }}>
          <View style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.8, shadowRadius: 12 }}>
            <Svg width={46} height={68} viewBox="0 0 46 68">
              <Defs>
                <SvgLinearGradient id="keeperBody" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#1d4ed8" />
                  <Stop offset="50%" stopColor="#3b82f6" />
                  <Stop offset="100%" stopColor="#1e40af" />
                </SvgLinearGradient>
              </Defs>
              <Circle cx="23" cy="11" r="10" fill="#fbbf24" />
              <Circle cx="19" cy="9"  r="3" fill="rgba(255,255,255,0.2)" />
              <Rect x="8" y="20" width="30" height="34" fill="url(#keeperBody)" rx="6" />
              <Ellipse cx="3"  cy="28" rx="5" ry="7" fill="#22c55e" />
              <Ellipse cx="43" cy="28" rx="5" ry="7" fill="#22c55e" />
              <Rect x="10" y="50" width="10" height="18" fill="#1e3a5f" rx="3" />
              <Rect x="26" y="50" width="10" height="18" fill="#1e3a5f" rx="3" />
              <Ellipse cx="15" cy="68" rx="8" ry="4" fill="#111" />
              <Ellipse cx="31" cy="68" rx="8" ry="4" fill="#111" />
              <Rect x="10" y="22" width="5" height="28" fill="rgba(255,255,255,0.12)" rx="3" />
            </Svg>
          </View>
        </Animated.View>
        <Animated.View style={{ position: 'absolute', bottom: '22%', alignSelf: 'center', transform: [{ translateX: ballX }, { translateY: ballY }, { scale: ballSc }] }}>
          <View style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.7, shadowRadius: 14 }}>
            <Svg width={36} height={36} viewBox="0 0 36 36">
              <Defs>
                <RadialGradient id="ballGrad" cx="35%" cy="30%" rx="65%" ry="65%">
                  <Stop offset="0%" stopColor="#ffffff" />
                  <Stop offset="60%" stopColor="#e5e7eb" />
                  <Stop offset="100%" stopColor="#9ca3af" />
                </RadialGradient>
              </Defs>
              <Circle cx="18" cy="18" r="17" fill="url(#ballGrad)" />
              <Path d="M18 4l5 7h-10zM4 18l7-5v10zM32 18l-7-5v10zM13 30l5-7 5 7z" fill="#1f2937" opacity="0.7" />
              <Ellipse cx="13" cy="10" rx="5" ry="3" fill="rgba(255,255,255,0.6)" transform="rotate(-25 13 10)" />
            </Svg>
          </View>
        </Animated.View>
        {isGoal !== null && (
          <Animated.View style={{ position: 'absolute', top: '35%', alignItems: 'center', transform: [{ scale: feedbackSc }] }}>
            <Text style={{ fontSize: 42, fontWeight: '900', color: isGoal ? '#22c55e' : '#ef4444', textShadowColor: isGoal ? '#22c55e' : '#ef4444', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20, textTransform: 'lowercase' }}>
              {isGoal ? '⚽ goal!' : '✋ saved!'}
            </Text>
          </Animated.View>
        )}
      </View>
      <View style={{ position: 'absolute', bottom: 44, left: 16, right: 16, flexDirection: 'row', gap: 10 }}>
        {ZONES.map(z => {
          const isSelected = selected === z.id;
          return (
            <TouchableOpacity key={z.id} onPress={() => shoot(z.id)} disabled={phase !== 'aim' || countdown > 0} activeOpacity={0.75} style={{ flex: 1 }}>
              <View style={{ shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isSelected ? 0.7 : 0, shadowRadius: 14 }}>
                <LinearGradient
                  colors={isSelected ? ['rgba(59,130,246,0.5)','rgba(29,78,216,0.3)'] : ['rgba(255,255,255,0.07)','rgba(255,255,255,0.02)']}
                  style={[st.zoneBtn, { borderColor: isSelected ? '#3b82f6' : 'rgba(255,255,255,0.12)', opacity: phase === 'aim' && countdown <= 0 ? 1 : 0.45 }]}>
                  <Text style={{ fontSize: 13, color: isSelected ? '#93c5fd' : 'rgba(255,255,255,0.55)', fontWeight: '800', textTransform: 'lowercase' }}>{z.label}</Text>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {countdown > 0 && (
        <View style={st.countdownOverlay}>
          <Text style={st.countdownNum}>{countdown}</Text>
          <Text style={st.countdownSub}>choose your zone</Text>
        </View>
      )}
    </View>
  );
}

// ─── GAME 4: Balloon Pop ──────────────────────────────────────────────────────
const BALLOON_COLORS = [
  { fill: '#ff4d6d', dark: '#a30030', light: '#ff9ec7' },
  { fill: '#f59e0b', dark: '#92400e', light: '#fde68a' },
  { fill: '#3b82f6', dark: '#1d4ed8', light: '#93c5fd' },
  { fill: '#22c55e', dark: '#15803d', light: '#86efac' },
  { fill: '#a78bfa', dark: '#5b21b6', light: '#ddd6fe' },
  { fill: '#f472b6', dark: '#9d174d', light: '#fbb6e8' },
];

function Balloon3D({ id, x, color, onPop }) {
  const floatY  = useRef(new Animated.Value(height + 80)).current;
  const sway    = useRef(new Animated.Value(0)).current;
  const sc      = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const popped  = useRef(false);

  useEffect(() => {
    const dur = 5200 + Math.random() * 2200;   // slower, tappable rise (~5-7s)
    Animated.timing(floatY, { toValue: -160, duration: dur, useNativeDriver: true }).start(({ finished }) => {
      if (finished && !popped.current) onPop(id, false);
    });
    Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 8 + Math.random() * 10, duration: 800 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(sway, { toValue: -(8 + Math.random() * 10), duration: 800 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  const pop = () => {
    if (popped.current) return;
    popped.current = true;
    Animated.parallel([
      Animated.spring(sc,      { toValue: 1.8, tension: 300, friction: 3, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onPop(id, true));
  };

  return (
    <Animated.View style={{ position: 'absolute', left: x, transform: [{ translateY: floatY }, { translateX: sway }, { scale: sc }], opacity }}>
      <TouchableOpacity onPress={pop} onPressIn={pop} activeOpacity={1} hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}>
        <View style={{ borderRadius: 32, shadowColor: color.fill, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.7, shadowRadius: 16, elevation: 12 }}>
          <Svg width={58} height={80} viewBox="0 0 58 80">
            <Defs>
              <RadialGradient id={`bg${id}`} cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor={color.light} stopOpacity="0.95" />
                <Stop offset="60%" stopColor={color.fill} stopOpacity="0.95" />
                <Stop offset="100%" stopColor={color.dark} stopOpacity="0.9" />
              </RadialGradient>
            </Defs>
            <Ellipse cx="29" cy="28" rx="24" ry="27" fill={`url(#bg${id})`} />
            <Ellipse cx="20" cy="16" rx="8" ry="5" fill="rgba(255,255,255,0.45)" transform="rotate(-25 20 16)" />
            <Ellipse cx="24" cy="11" rx="4" ry="2.5" fill="rgba(255,255,255,0.6)" transform="rotate(-20 24 11)" />
            <Ellipse cx="29" cy="55" rx="4" ry="3" fill={color.dark} />
            <Path d="M29 58 Q32 64 27 70 Q24 76 29 80" stroke={color.fill} strokeWidth="1.5" fill="none" opacity="0.6" />
          </Svg>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function BalloonPop({ targetScore, onComplete, onScore }) {
  const [balloons, setBalloons] = useState([]);
  const [score, setScore]  = useState(0);
  const [timeLeft, setTime] = useState(25);
  const [countdown, setCountdown] = useState(3);
  const ref = useRef(0); const timerRef = useRef(); const spawnRef = useRef();

  useEffect(() => {
    let c = 3;
    const cd = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(cd);
        timerRef.current = setInterval(() => setTime(t => {
          if (t <= 1) { clearInterval(timerRef.current); clearInterval(spawnRef.current); setTimeout(() => onComplete(ref.current * 10), 300); return 0; }
          return t - 1;
        }), 1000);
        spawnRef.current = setInterval(() => {
          const id = Date.now() + Math.random();
          const x  = 12 + Math.random() * (width - 80);
          const col = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
          setBalloons(p => [...p.slice(-20), { id, x, color: col }]);
        }, 500);
      }
    }, 1000);
    return () => { clearInterval(cd); clearInterval(timerRef.current); clearInterval(spawnRef.current); };
  }, []);

  const pop = (id, scored) => {
    setBalloons(p => p.filter(b => b.id !== id));
    if (scored) { ref.current++; setScore(ref.current); onScore?.(ref.current); }
  };

  const timeColor = timeLeft > 8 ? '#f472b6' : '#ef4444';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#120208','#1e0410','#0a0206']} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(244,114,182,0.08)','transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }} />
      <GameHud
        left={{ label: 'popped', value: score, color: '#fbb6e8' }}
        mid={targetScore ? targetScore / 10 : null}
        right={{ label: 'time', value: `${timeLeft}s`, color: timeColor }}
        timeLeft={timeLeft} totalTime={25} timeColor={timeColor}
      />
      {countdown <= 0 && balloons.map(b => <Balloon3D key={b.id} {...b} onPop={pop} />)}
      {countdown > 0 && (
        <View style={st.countdownOverlay}>
          <Text style={st.countdownNum}>{countdown}</Text>
          <Text style={st.countdownSub}>pop all the balloons</Text>
        </View>
      )}
    </View>
  );
}

// ─── GAME 5: Memory Match ─────────────────────────────────────────────────────
function MemoryMatch({ targetScore, onComplete, onScore }) {
  const [board, setBoard]   = useState(() => makeBoard());
  const [flipped, setFlip]  = useState([]);
  const [moves, setMoves]   = useState(0);
  const [startMs, setStart] = useState(null);
  const [elapsed, setEl]    = useState(0);
  const tick = useRef(null);

  const startTimer = () => {
    const t = Date.now(); setStart(t);
    tick.current = setInterval(() => setEl(Date.now() - t), 500);
  };
  useEffect(() => () => clearInterval(tick.current), []);
  const calcScore = (ms) => Math.max(100, Math.round(10000 - ms / 80));

  const tap = (idx) => {
    const card = board[idx];
    if (card.matched || card.flipped || flipped.length >= 2) return;
    if (!startMs) startTimer();
    const newBoard = board.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    const nf = [...flipped, idx];
    setBoard(newBoard); setFlip(nf); setMoves(m => m + 1);
    if (nf.length === 2) {
      const [a, b] = nf;
      if (newBoard[a].sym === newBoard[b].sym) {
        const matched = newBoard.map((c, i) => (i === a || i === b) ? { ...c, matched: true } : c);
        onScore?.(matched.filter(c => c.matched).length / 2 * 250);
        setBoard(matched); setFlip([]);
        if (matched.every(c => c.matched)) { clearInterval(tick.current); setTimeout(() => onComplete(calcScore(Date.now() - startMs)), 600); }
      } else {
        setTimeout(() => { setBoard(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, flipped: false } : c)); setFlip([]); }, 900);
      }
    }
  };
  const mm = Math.floor(elapsed / 60000);
  const ss = Math.floor((elapsed % 60000) / 1000);

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <LinearGradient colors={['#06031a','#0e0730','#06031a']} style={StyleSheet.absoluteFill} />
      <GameHud
        left={{ label: 'moves', value: moves, color: '#c4b5fd' }}
        right={{ label: 'time', value: `${mm}:${ss.toString().padStart(2, '0')}`, color: '#fff' }}
      />
      <View style={st.memGrid}>
        {board.map((card, idx) => {
          const isFlipped = card.flipped || card.matched;
          return (
            <TouchableOpacity key={card.id} onPress={() => tap(idx)} activeOpacity={0.85} style={st.memCell}>
              <View style={{
                flex: 1, borderRadius: 14, overflow: 'hidden',
                shadowColor: card.matched ? '#22c55e' : card.flipped ? '#a78bfa' : '#000',
                shadowOffset: { width: 0, height: card.flipped || card.matched ? 8 : 4 },
                shadowOpacity: card.flipped || card.matched ? 0.7 : 0.4,
                shadowRadius: card.flipped || card.matched ? 14 : 6,
                elevation: card.flipped || card.matched ? 12 : 4,
              }}>
                <LinearGradient
                  colors={card.matched
                    ? ['rgba(34,197,94,0.35)', 'rgba(21,128,61,0.2)']
                    : card.flipped
                    ? ['rgba(196,181,253,0.4)', 'rgba(109,28,209,0.25)']
                    : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                  }
                  style={[st.memCardInner, {
                    borderColor: card.matched ? '#22c55e' : card.flipped ? '#a78bfa' : 'rgba(255,255,255,0.1)',
                    borderWidth: card.flipped || card.matched ? 1.5 : 1,
                  }]}>
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
                  {isFlipped
                    ? <Text style={{ fontSize: 28 }}>{card.sym}</Text>
                    : (
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' }}>
                        <Text style={{ fontSize: 14 }}>💜</Text>
                      </View>
                    )
                  }
                </LinearGradient>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── GAME 6: Pattern Master ───────────────────────────────────────────────────
const PAT_COLORS = [
  { fill: '#ff4d6d', glow: '#ff4d6d', light: '#ff9ec7', dark: '#7b0020' },
  { fill: '#3b82f6', glow: '#3b82f6', light: '#93c5fd', dark: '#1d4ed8' },
  { fill: '#22c55e', glow: '#22c55e', light: '#86efac', dark: '#15803d' },
  { fill: '#fbbf24', glow: '#fbbf24', light: '#fde68a', dark: '#92400e' },
];

function PatternMatch({ targetScore, onComplete, onScore }) {
  const [sequence, setSeq]  = useState([]);
  const [input, setInput]   = useState([]);
  const [active, setActive] = useState(-1);
  const [phase, setPhase]   = useState('watch');
  const [level, setLevel]   = useState(0);
  const anims = useRef(PAT_COLORS.map(() => new Animated.Value(0))).current;

  const flashBtn = (idx) => {
    Animated.sequence([
      Animated.timing(anims[idx], { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(anims[idx], { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  };

  const showSeq = (seq) => {
    setPhase('watch'); setInput([]);
    seq.forEach((c, i) => {
      setTimeout(() => { setActive(c); flashBtn(c); setTimeout(() => setActive(-1), 450); }, i * 750 + 200);
    });
    setTimeout(() => setPhase('input'), seq.length * 750 + 500);
  };

  useEffect(() => {
    const s = [Math.floor(Math.random() * 4)];
    setSeq(s); setLevel(1);
    setTimeout(() => showSeq(s), 800);
  }, []);

  const press = (c) => {
    if (phase !== 'input') return;
    flashBtn(c);
    const ni = [...input, c];
    if (ni[ni.length - 1] !== sequence[ni.length - 1]) {
      setPhase('fail');
      setTimeout(() => onComplete(Math.max(0, (level - 1) * 100)), 700);
      return;
    }
    if (ni.length === sequence.length) {
      const ns = level + 1; setLevel(ns); onScore?.(level * 100);
      const newSeq = [...sequence, Math.floor(Math.random() * 4)];
      setSeq(newSeq); setInput([]);
      setTimeout(() => showSeq(newSeq), 700);
    } else { setInput(ni); }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={['#0e0a00','#1c1200','#0e0a00']} style={StyleSheet.absoluteFill} />
      <GameHud
        left={{ label: 'level', value: level, color: '#fde68a' }}
        right={{ label: phase === 'watch' ? 'watch...' : phase === 'input' ? 'your turn!' : 'wrong!', value: '', color: phase === 'input' ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}
      />
      <View style={{ marginBottom: 32, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: phase === 'input' ? '#fde68a' : 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 2 }}>
          {phase === 'watch' ? '👁  memorise the sequence' : phase === 'input' ? '👆  tap the pattern' : '💥  wrong order!'}
        </Text>
      </View>
      <View style={st.patternGrid}>
        {PAT_COLORS.map((col, i) => {
          const isLit = active === i;
          return (
            <TouchableOpacity key={i} onPress={() => press(i)} disabled={phase !== 'input'} activeOpacity={0.8}>
              <Animated.View style={[st.patBtn, {
                shadowColor: col.glow,
                shadowOffset: { width: 0, height: isLit ? 16 : 4 },
                shadowOpacity: isLit ? 1 : 0.3,
                shadowRadius: isLit ? 24 : 8,
                elevation: isLit ? 20 : 4,
              }]}>
                <LinearGradient
                  colors={isLit ? [col.light, col.fill, col.dark] : [`${col.fill}55`, `${col.fill}30`, `${col.dark}44`]}
                  start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                  style={[st.patBtnInner, { borderColor: isLit ? col.light : `${col.fill}55` }]}>
                  <View style={{ position: 'absolute', top: 8, left: 8, width: 40, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)' }} />
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12, backgroundColor: isLit ? col.dark : 'rgba(0,0,0,0.3)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }} />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 32 }}>
        {sequence.map((c, i) => (
          <View key={i} style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: i < input.length ? PAT_COLORS[sequence[i]].fill : 'rgba(255,255,255,0.15)',
            shadowColor: i < input.length ? PAT_COLORS[sequence[i]].fill : 'transparent',
            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
          }} />
        ))}
      </View>
    </View>
  );
}

// ─── GAME: Bounce Blitz — real physics (matter-js) heart juggle ───────────────
// Drives matter-js with a manual requestAnimationFrame loop (no game-engine dep).
const BB_R = 30;                 // ball radius
const BB_FLOOR = height - 150;   // danger line — drop below this = game over

function BounceBlitz({ onComplete, onScore }) {
  const W = width;
  const DURATION = 40;
  const [score, setScore]   = useState(0);
  const [timeLeft, setTime] = useState(DURATION);
  const [countdown, setCnt] = useState(3);
  const scoreRef   = useRef(0);
  const endedRef   = useRef(false);
  const runningRef = useRef(false);
  const engineRef  = useRef(null);
  const ballRef    = useRef(null);
  const timerRef   = useRef();
  const cdRef      = useRef();
  const rafRef     = useRef();
  const ballPos    = useRef(new Animated.ValueXY({ x: W / 2 - BB_R, y: 150 - BB_R })).current;

  // Build the physics world once per mount
  if (!engineRef.current) {
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.y = 1.1;
    const ball  = Matter.Bodies.circle(W / 2, 150, BB_R, { restitution: 0.72, frictionAir: 0.008 });
    const left  = Matter.Bodies.rectangle(-22, height / 2, 40, height * 2, { isStatic: true, restitution: 1 });
    const right = Matter.Bodies.rectangle(W + 22, height / 2, 40, height * 2, { isStatic: true, restitution: 1 });
    const top   = Matter.Bodies.rectangle(W / 2, -22, W * 2, 40, { isStatic: true, restitution: 0.6 });
    Matter.World.add(engine.world, [ball, left, right, top]);
    engineRef.current = engine;
    ballRef.current   = ball;
  }

  const endGame = () => {
    if (endedRef.current) return;
    endedRef.current = true; runningRef.current = false;
    clearInterval(timerRef.current); cancelAnimationFrame(rafRef.current);
    setTimeout(() => onComplete?.(scoreRef.current), 500);
  };

  useEffect(() => {
    // physics frame loop
    let last = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt  = Math.min(now - last, 32); last = now;
      if (runningRef.current && !endedRef.current) {
        Matter.Engine.update(engineRef.current, dt);
        const b = ballRef.current.position;
        ballPos.setValue({ x: b.x - BB_R, y: b.y - BB_R });
        if (b.y - BB_R > BB_FLOOR) endGame();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // 3-2-1 countdown → start
    let c = 3;
    cdRef.current = setInterval(() => {
      c--; setCnt(c);
      if (c <= 0) {
        clearInterval(cdRef.current);
        runningRef.current = true;
        timerRef.current = setInterval(() => setTime(t => { if (t <= 1) { endGame(); return 0; } return t - 1; }), 1000);
      }
    }, 1000);

    return () => { cancelAnimationFrame(rafRef.current); clearInterval(cdRef.current); clearInterval(timerRef.current); };
  }, []);

  const bat = (e) => {
    if (!runningRef.current || endedRef.current) return;
    const { locationX, locationY, pageX, pageY } = e.nativeEvent;
    const tx = locationX != null ? locationX : pageX;
    const ty = locationY != null ? locationY : pageY;
    const b = ballRef.current.position;
    const dx = tx - b.x, dy = ty - b.y;
    if (Math.sqrt(dx * dx + dy * dy) < BB_R * 3) {
      Matter.Body.setVelocity(ballRef.current, { x: Math.max(-7, Math.min(7, -dx * 0.12)), y: -13.5 });
      scoreRef.current += 1; setScore(scoreRef.current); onScore?.(scoreRef.current);
    }
  };

  const timeColor = timeLeft > 10 ? '#ff6b8a' : '#ef4444';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#0B0410', '#1A0716', '#0B0410']} style={StyleSheet.absoluteFill} />
      {/* ambient glow + vignette */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="bbGlow" cx="50%" cy="34%" rx="60%" ry="45%">
            <Stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.16" />
            <Stop offset="100%" stopColor="#0B0410" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={height} fill="url(#bbGlow)" />
      </Svg>
      <GameHud
        left={{ label: 'bounces', value: score, color: '#ff9ec7' }}
        right={{ label: 'time', value: `${timeLeft}s`, color: timeColor }}
        timeLeft={timeLeft} totalTime={DURATION} timeColor={timeColor}
      />

      {/* Danger line — soft glowing gradient */}
      <LinearGradient colors={['transparent', 'rgba(239,68,68,0.6)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: BB_FLOOR, left: 0, right: 0, height: 2 }} pointerEvents="none" />
      <Text style={{ position: 'absolute', top: BB_FLOOR + 7, alignSelf: 'center', fontSize: 10, color: 'rgba(239,68,68,0.55)', textTransform: 'lowercase', letterSpacing: 2 }}>don't let it drop</Text>

      {/* The physics heart — round glow (borderRadius on the shadow view kills the square halo) */}
      <Animated.View style={{ position: 'absolute', width: BB_R * 2, height: BB_R * 2, transform: ballPos.getTranslateTransform() }} pointerEvents="none">
        <View style={{ flex: 1, borderRadius: BB_R, shadowColor: '#ff4d6d', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 18, elevation: 14 }}>
          <Svg width={BB_R * 2} height={BB_R * 2} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="bbBall" cx="38%" cy="32%" rx="68%" ry="68%">
                <Stop offset="0%" stopColor="#ffd1dc" />
                <Stop offset="48%" stopColor="#ff4d6d" />
                <Stop offset="100%" stopColor="#a30030" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="48" fill="url(#bbBall)" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
            {/* specular highlight */}
            <Ellipse cx="37" cy="33" rx="13" ry="8" fill="#ffffff" opacity="0.5" />
            {/* heart emblem */}
            <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z"
              fill="#fff" opacity="0.92" transform="translate(50 52) scale(2.0) translate(-12 -12)" />
          </Svg>
        </View>
      </Animated.View>

      {/* Tap layer (bat the heart up) */}
      <Pressable style={StyleSheet.absoluteFill} onPressIn={bat} />

      {countdown > 0 && (
        <View style={st.countdownOverlay} pointerEvents="none">
          <Text style={st.countdownNum}>{countdown}</Text>
          <Text style={st.countdownSub}>tap the heart to keep it up</Text>
        </View>
      )}
    </View>
  );
}

// ─── GAME: Cupid's Arrow - pin every arrow into the spinning heart ────────────
// Tap fires up. Heart spins, changing speed + reversing. Hit a pinned arrow → bow
// breaks. Fast consecutive hits fill the fever meter → 5x "cash rush" for 5s.
function CupidArrow({ onComplete, onScore }) {
  const W = width;
  const cx = W / 2, cy = height * 0.4, R = 76;
  const [, setTick] = useState(0);
  const [score, setScore] = useState(0);
  const [countdown, setCnt] = useState(3);

  const rotRef = useRef(0);          // heart rotation (deg)
  const velRef = useRef(0.09);       // deg/ms
  const changeAtRef = useRef(0);
  const pinnedRef = useRef([]);      // pinned arrow angles, local to the heart
  const arrowsLeftRef = useRef(8);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const feverRef = useRef(0);        // 0..1
  const goldUntilRef = useRef(0);
  const lastLandRef = useRef(0);
  const flyRef = useRef(null);       // { t0 } while an arrow is in flight
  const runRef = useRef(false);
  const endedRef = useRef(false);
  const rafRef = useRef();
  const cdRef = useRef();

  const norm = (a) => { a %= 360; if (a < 0) a += 360; return a; };

  const endGame = () => {
    if (endedRef.current) return;
    endedRef.current = true; runRef.current = false;
    cancelAnimationFrame(rafRef.current); clearInterval(cdRef.current);
    setTimeout(() => onComplete?.(scoreRef.current), 500);
  };

  const pin = (now) => {
    const local = norm(90 - rotRef.current);   // arrow enters at the heart's bottom
    for (const a of pinnedRef.current) {
      let d = Math.abs(local - a); if (d > 180) d = 360 - d;
      if (d < 13) { endGame(); return; }        // struck a pinned arrow → crash
    }
    pinnedRef.current.push(local);
    const gap = now - lastLandRef.current; lastLandRef.current = now;
    feverRef.current = gap < 900 ? Math.min(1, feverRef.current + 0.2) : Math.max(0, feverRef.current - 0.12);
    if (feverRef.current >= 1 && goldUntilRef.current < now) { goldUntilRef.current = now + 5000; feverRef.current = 0; }
    const gold = now < goldUntilRef.current;
    scoreRef.current += gold ? 25 : 5;          // cash rush pays 5x
    setScore(scoreRef.current); onScore?.(scoreRef.current);
    arrowsLeftRef.current -= 1;
    if (arrowsLeftRef.current <= 0) {           // level cleared → fresh heart, faster
      levelRef.current += 1;
      pinnedRef.current = [];
      arrowsLeftRef.current = 6 + levelRef.current;
      scoreRef.current += 30; setScore(scoreRef.current); onScore?.(scoreRef.current);
    }
  };

  useEffect(() => {
    changeAtRef.current = Date.now() + 800;
    let last = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = Math.min(now - last, 34); last = now;
      if (runRef.current && !endedRef.current) {
        rotRef.current = norm(rotRef.current + velRef.current * dt);
        if (now > changeAtRef.current) {        // unpredictable speed + reversals
          const spd = 0.07 + levelRef.current * 0.012 + Math.random() * 0.06;
          velRef.current = (Math.random() < 0.5 ? -1 : 1) * spd;
          changeAtRef.current = now + 500 + Math.random() * 1100;
        }
        if (flyRef.current && now - flyRef.current.t0 >= 110) { flyRef.current = null; pin(now); }
      }
      setTick(t => (t + 1) & 0xffff);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    let c = 3;
    cdRef.current = setInterval(() => { c--; setCnt(c); if (c <= 0) { clearInterval(cdRef.current); runRef.current = true; lastLandRef.current = Date.now(); } }, 700);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(cdRef.current); };
  }, []);

  const fire = () => { if (!runRef.current || endedRef.current || flyRef.current) return; flyRef.current = { t0: Date.now() }; };

  const now = Date.now();
  const gold = now < goldUntilRef.current;
  const rot = rotRef.current;
  const pinned = pinnedRef.current;
  let flyY = null;
  if (flyRef.current) { const p = Math.min(1, (now - flyRef.current.t0) / 110); flyY = (cy + R + 90) + ((cy + R) - (cy + R + 90)) * p; }
  const heartFill = gold ? '#fbbf24' : '#ff4d6d';

  const arrowAt = (angleDeg, rOuter) => {
    const a = angleDeg * Math.PI / 180;
    return { x1: cx + (R - 4) * Math.cos(a), y1: cy + (R - 4) * Math.sin(a), x2: cx + rOuter * Math.cos(a), y2: cy + rOuter * Math.sin(a) };
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#0a0010', '#1a0420', '#0a0010']} style={StyleSheet.absoluteFill} />
      <GameHud left={{ label: 'fc', value: score, color: '#fbbf24' }} right={{ label: 'arrows', value: arrowsLeftRef.current, color: '#ff6b8a' }} />

      <Svg width={W} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="heartG" cx="38%" cy="32%" rx="70%" ry="70%">
            <Stop offset="0%"  stopColor="#ffd1dc" />
            <Stop offset="45%" stopColor="#ff4d6d" />
            <Stop offset="100%" stopColor="#a30030" />
          </RadialGradient>
          <RadialGradient id="heartGold" cx="38%" cy="32%" rx="70%" ry="70%">
            <Stop offset="0%"  stopColor="#fff3c4" />
            <Stop offset="50%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#b45309" />
          </RadialGradient>
          <RadialGradient id="cupAura" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%"  stopColor={gold ? '#fbbf24' : '#ff4d6d'} stopOpacity={gold ? 0.35 : 0.28} />
            <Stop offset="100%" stopColor="#0a0010" stopOpacity="0" />
          </RadialGradient>
          <SvgLinearGradient id="shaftG" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#fde68a" />
            <Stop offset="100%" stopColor="#e9d5ff" />
          </SvgLinearGradient>
        </Defs>

        {/* soft aura */}
        <Ellipse cx={cx} cy={cy} rx={R + 70} ry={R + 70} fill="url(#cupAura)" />

        <G transform={`rotate(${rot} ${cx} ${cy})`}>
          {/* pinned arrows — shaft + fletching + head */}
          {pinned.map((ang, i) => {
            const a = ang * Math.PI / 180;
            const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
            const ix = cx + (R - 2) * dx,  iy = cy + (R - 2) * dy;   // near heart
            const ox = cx + (R + 40) * dx, oy = cy + (R + 40) * dy;  // tip
            const hb = R + 30;                                       // head base
            const hbx = cx + hb * dx, hby = cy + hb * dy;
            const fx = cx + (R + 2) * dx, fy = cy + (R + 2) * dy;    // fletch root
            const tipC = gold ? '#fbbf24' : '#c084fc';
            return (
              <G key={i}>
                <Path d={`M ${ix} ${iy} L ${ox} ${oy}`} stroke="url(#shaftG)" strokeWidth="2.6" strokeLinecap="round" />
                {/* arrowhead */}
                <Path d={`M ${ox} ${oy} L ${hbx + px * 5} ${hby + py * 5} L ${hbx - px * 5} ${hby - py * 5} Z`} fill={tipC} />
                {/* fletching */}
                <Path d={`M ${fx} ${fy} L ${fx + px * 5 - dx * 8} ${fy + py * 5 - dy * 8}`} stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" />
                <Path d={`M ${fx} ${fy} L ${fx - px * 5 - dx * 8} ${fy - py * 5 - dy * 8}`} stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" />
              </G>
            );
          })}

          {/* heart */}
          <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z"
            fill={gold ? 'url(#heartGold)' : 'url(#heartG)'} stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"
            transform={`translate(${cx} ${cy}) scale(${R / 9}) translate(-12 -12)`} />
          {/* specular shine */}
          <Ellipse cx={cx - R * 0.32} cy={cy - R * 0.34} rx={R * 0.22} ry={R * 0.14} fill="#ffffff" opacity={0.45} transform={`rotate(-25 ${cx - R * 0.32} ${cy - R * 0.34})`} />
        </G>

        {/* gold-rush sparkles */}
        {gold && [0, 72, 144, 216, 288].map((d, i) => {
          const a = (d + now / 12) * Math.PI / 180, rr = R + 30;
          const sxp = cx + rr * Math.cos(a), syp = cy + rr * Math.sin(a);
          return <Path key={i} d={`M ${sxp} ${syp - 5} L ${sxp + 1.6} ${syp - 1.6} L ${sxp + 5} ${syp} L ${sxp + 1.6} ${syp + 1.6} L ${sxp} ${syp + 5} L ${sxp - 1.6} ${syp + 1.6} L ${sxp - 5} ${syp} L ${sxp - 1.6} ${syp - 1.6} Z`} fill="#fde68a" opacity={0.9} />;
        })}

        {/* flying / ready arrow (gold-tipped, fletched) */}
        {(() => {
          const baseY = flyY != null ? flyY : (runRef.current ? cy + R + 90 : null);
          if (baseY == null) return null;
          return (
            <G>
              <Path d={`M ${cx} ${baseY} L ${cx} ${baseY + 48}`} stroke="url(#shaftG)" strokeWidth="3" strokeLinecap="round" />
              <Path d={`M ${cx} ${baseY} l -6 12 l 12 0 z`} fill={gold ? '#fbbf24' : '#ff4d6d'} />
              <Path d={`M ${cx} ${baseY + 48} l -6 9 M ${cx} ${baseY + 48} l 6 9`} stroke="#f9a8d4" strokeWidth="2.4" strokeLinecap="round" />
            </G>
          );
        })()}
      </Svg>

      <View style={{ position: 'absolute', bottom: 60, left: 40, right: 40, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }} pointerEvents="none">
        <View style={{ width: `${(gold ? 1 : feverRef.current) * 100}%`, height: '100%', backgroundColor: gold ? '#fbbf24' : '#ff4d6d' }} />
      </View>
      <Text style={{ position: 'absolute', bottom: 74, alignSelf: 'center', fontSize: 10, color: gold ? '#fbbf24' : 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: 1.5 }} pointerEvents="none">
        {gold ? '★ cash rush - 5x fc ★' : 'fever'}
      </Text>

      <Pressable style={StyleSheet.absoluteFill} onPress={fire} />
      {countdown > 0 && (<View style={st.countdownOverlay} pointerEvents="none"><Text style={st.countdownNum}>{countdown}</Text><Text style={st.countdownSub}>tap to fire - don't hit your arrows</Text></View>)}
    </View>
  );
}

// ─── GAME: Stack the Memories - precision tower of keepsakes ──────────────────
// Blocks slide across; tap drops. Misalign slices off the overhang so the next
// block is narrower. 3 perfect drops → combo multiplier; every 10 levels pays a
// mystery FC bonus. Drop a block with zero overlap → game over.
const SK_H = 30;
function StackMemories({ onComplete, onScore }) {
  const W = width;
  const BUILD_Y = height * 0.36;
  const baseW = W * 0.6;
  const [, setTick] = useState(0);
  const [score, setScore] = useState(0);
  const [mult, setMult] = useState(1);
  const [countdown, setCnt] = useState(3);

  const stackRef = useRef([{ x: W / 2 - baseW / 2, w: baseW, color: 0 }]);
  const movingRef = useRef({ x: 0, w: baseW, dir: 1 });
  const scoreRef = useRef(0);
  const multRef = useRef(1);
  const perfectRef = useRef(0);
  const runRef = useRef(false);
  const endedRef = useRef(false);
  const rafRef = useRef();
  const cdRef = useRef();

  const speed = () => 0.16 + stackRef.current.length * 0.011;

  const endGame = () => {
    if (endedRef.current) return;
    endedRef.current = true; runRef.current = false;
    cancelAnimationFrame(rafRef.current); clearInterval(cdRef.current);
    setTimeout(() => onComplete?.(scoreRef.current), 500);
  };

  const drop = () => {
    if (!runRef.current || endedRef.current) return;
    const top = stackRef.current[stackRef.current.length - 1];
    const m = movingRef.current;
    const left = Math.max(m.x, top.x);
    const right = Math.min(m.x + m.w, top.x + top.w);
    const newW = right - left;
    if (newW <= 4) { endGame(); return; }
    const perfect = Math.abs(m.x - top.x) < 7;
    perfectRef.current = perfect ? perfectRef.current + 1 : 0;
    const placedX = perfect ? top.x : left;
    const placedW = perfect ? top.w : newW;
    stackRef.current.push({ x: placedX, w: placedW, color: stackRef.current.length });
    if (perfectRef.current >= 3) { multRef.current = Math.min(5, multRef.current + 1); setMult(multRef.current); perfectRef.current = 0; }
    scoreRef.current += Math.round(10 * multRef.current);
    if (stackRef.current.length % 10 === 0) scoreRef.current += 150;   // mystery tier
    setScore(scoreRef.current); onScore?.(scoreRef.current);
    movingRef.current = { x: 0, w: placedW, dir: 1 };
  };

  useEffect(() => {
    let last = Date.now();
    const loop = () => {
      const now = Date.now(); const dt = Math.min(now - last, 34); last = now;
      if (runRef.current && !endedRef.current) {
        const m = movingRef.current;
        m.x += m.dir * speed() * dt;
        if (m.x + m.w > W) { m.x = W - m.w; m.dir = -1; }
        if (m.x < 0) { m.x = 0; m.dir = 1; }
      }
      setTick(t => (t + 1) & 0xffff);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    let c = 3;
    cdRef.current = setInterval(() => { c--; setCnt(c); if (c <= 0) { clearInterval(cdRef.current); runRef.current = true; } }, 700);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(cdRef.current); };
  }, []);

  const stack = stackRef.current;
  const count = stack.length;
  const COLORS = [['#ff9ec7', '#ff4d6d'], ['#c4b5fd', '#7c3aed'], ['#a7f3d0', '#10b981'], ['#fde68a', '#f59e0b'], ['#93c5fd', '#3b82f6'], ['#f9a8d4', '#db2777']];
  const items = [];
  for (let i = count - 1; i >= 0; i--) {
    const sy = BUILD_Y + (count - 1 - i) * SK_H;
    if (sy > height + SK_H) break;
    items.push({ ...stack[i], sy, ci: stack[i].color % COLORS.length });
  }
  const m = movingRef.current;
  const mci = count % COLORS.length;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#070512', '#0f0a24', '#070512']} style={StyleSheet.absoluteFill} />
      <GameHud left={{ label: 'fc', value: score, color: '#fbbf24' }} right={{ label: 'tower', value: count - 1, color: '#a78bfa' }} />
      {mult > 1 && <Text style={{ position: 'absolute', top: 96, alignSelf: 'center', color: '#fbbf24', fontWeight: '900', textTransform: 'lowercase', letterSpacing: 1 }} pointerEvents="none">{mult}x combo</Text>}

      <Svg width={W} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          {COLORS.map((c, i) => (
            <SvgLinearGradient key={i} id={`stk${i}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={lighten(c[1])} />
              <Stop offset="55%"  stopColor={c[1]} />
              <Stop offset="100%" stopColor={darken(c[1])} />
            </SvgLinearGradient>
          ))}
          <RadialGradient id="stkGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#a78bfa" stopOpacity="0.16" />
            <Stop offset="100%" stopColor="#070512" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ambient glow behind the tower */}
        <Ellipse cx={W / 2} cy={BUILD_Y + SK_H * 2} rx={W * 0.55} ry={height * 0.32} fill="url(#stkGlow)" />

        {/* placed blocks (3D-ish: gradient body + top sheen + grounding shadow) */}
        {items.map((it, k) => {
          const h = SK_H - 4;
          return (
            <G key={k}>
              <Rect x={it.x + 3} y={it.sy + h - 3} width={it.w} height={6} rx={3} fill="#000" opacity={0.28} />
              <Rect x={it.x} y={it.sy} width={it.w} height={h} rx={7} fill={`url(#stk${it.ci})`} />
              <Rect x={it.x + 4} y={it.sy + 3} width={Math.max(0, it.w - 8)} height={h * 0.32} rx={4} fill="#ffffff" opacity={0.22} />
              <Rect x={it.x} y={it.sy} width={it.w} height={h} rx={7} fill="none" stroke={COLORS[it.ci][0]} strokeWidth="1.2" opacity={0.55} />
            </G>
          );
        })}

        {/* moving block — glowing */}
        {runRef.current && (() => {
          const h = SK_H - 4, y = BUILD_Y - SK_H;
          return (
            <G>
              <Rect x={m.x - 4} y={y - 4} width={m.w + 8} height={h + 8} rx={10} fill={COLORS[mci][1]} opacity={0.22} />
              <Rect x={m.x} y={y} width={m.w} height={h} rx={7} fill={`url(#stk${mci})`} />
              <Rect x={m.x + 4} y={y + 3} width={Math.max(0, m.w - 8)} height={h * 0.32} rx={4} fill="#ffffff" opacity={0.28} />
              <Rect x={m.x} y={y} width={m.w} height={h} rx={7} fill="none" stroke={COLORS[mci][0]} strokeWidth="1.6" />
            </G>
          );
        })()}
      </Svg>

      <Pressable style={StyleSheet.absoluteFill} onPress={drop} />
      {countdown > 0 && (<View style={st.countdownOverlay} pointerEvents="none"><Text style={st.countdownNum}>{countdown}</Text><Text style={st.countdownSub}>tap to drop - stack them straight</Text></View>)}
    </View>
  );
}

const GAME_COMPONENTS = {
  reaction: ReactionRush3D, racer: TapRacer, race: TapRacer, goal: GoalRush,
  balloon: BalloonPop, memory: MemoryMatch, pattern: PatternMatch,
  bounce: BounceBlitz, cupid: CupidArrow, stack: StackMemories,
};

// ─── Between-game transition splash (with FC reward) ─────────────────────────
function GameTransition({ game, score, fcEarned, newBalance, onDone }) {
  const sc   = useRef(new Animated.Value(0.6)).current;
  const fd   = useRef(new Animated.Value(0)).current;
  const out  = useRef(new Animated.Value(1)).current;
  const coinSc = useRef(new Animated.Value(0)).current;
  const fcCount = useRef(new Animated.Value(0)).current;
  const [shownFc, setShownFc] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
      Animated.timing(fd, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    // Coin pops in slightly later
    Animated.sequence([
      Animated.delay(450),
      Animated.spring(coinSc, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(out, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onDone());
    }, 2900);
    return () => clearTimeout(t);
  }, []);

  // Count the FC up once the earn call resolves (fcEarned may arrive after mount).
  useEffect(() => {
    if (!(fcEarned > 0)) { setShownFc(0); return; }
    fcCount.setValue(0);
    const id = fcCount.addListener(({ value }) => setShownFc(Math.round(value)));
    Animated.timing(fcCount, { toValue: fcEarned, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => fcCount.removeListener(id);
  }, [fcEarned]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={['#080810','#100818','#080810']} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: game.color, opacity: 0.07 }} />
      <Animated.View style={{ alignItems: 'center', opacity: Animated.multiply(fd, out), transform: [{ scale: sc }] }}>
        {/* Orb */}
        <View style={{ shadowColor: game.color, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.9, shadowRadius: 40 }}>
          <LinearGradient colors={[lighten(game.color), game.color, darken(game.color)]}
            start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
            style={{ width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <View style={{ position: 'absolute', top: 10, left: 16, width: 36, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            <Text style={{ fontSize: 36 }}>
              {game.id === 'reaction' ? '❤️' : game.id === 'racer' ? '🏎️' : game.id === 'goal' ? '⚽' : game.id === 'balloon' ? '🎈' : game.id === 'memory' ? '🃏' : game.id === 'pattern' ? '🎨' : '😎'}
            </Text>
          </LinearGradient>
        </View>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 3, marginBottom: 6 }}>you scored</Text>
        <Text style={{ fontSize: 56, fontWeight: '900', color: '#fff', letterSpacing: -2 }}>{score}</Text>
        <Text style={{ fontSize: 12, color: game.color, textTransform: 'lowercase', letterSpacing: 2, marginTop: 4, opacity: 0.8 }}>{game.label} ✓</Text>

        {/* FC reward chip */}
        <Animated.View style={{ transform: [{ scale: coinSc }], marginTop: 22 }}>
          <View style={{ shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 18 }}>
            <LinearGradient colors={['rgba(251,191,36,0.22)','rgba(251,191,36,0.08)']}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(251,191,36,0.4)' }}>
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Defs>
                  <RadialGradient id="coinG" cx="40%" cy="35%" rx="65%" ry="65%">
                    <Stop offset="0%" stopColor="#fef3c7" /><Stop offset="60%" stopColor="#fbbf24" /><Stop offset="100%" stopColor="#b45309" />
                  </RadialGradient>
                </Defs>
                <Circle cx="12" cy="12" r="10" fill="url(#coinG)" />
                <Path d="M12 7v10M9 9.5h6M9 14.5h6" stroke="#7c4a02" strokeWidth="1.6" strokeLinecap="round" />
              </Svg>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#fde68a' }}>+{shownFc} FC</Text>
            </LinearGradient>
          </View>
        </Animated.View>
        {newBalance != null && (
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 1, marginTop: 10 }}>
            wallet: {newBalance.toLocaleString()} FC
          </Text>
        )}
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'lowercase', letterSpacing: 2, marginTop: 18 }}>next game loading…</Text>
      </Animated.View>
    </View>
  );
}

// ─── Pulsing two-player orb (lobby art) ──────────────────────────────────────
function LobbyOrbs() {
  const beat = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(beat, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(beat, { toValue: 1,    duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(ring, { toValue: 0, duration: 0,    useNativeDriver: true }),
    ])).start();
  }, []);
  const Orb = ({ color, emoji, delay }) => (
    <View style={{ width: 76, height: 76, borderRadius: 38, shadowColor: color, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.9, shadowRadius: 26 }}>
      <LinearGradient colors={[lighten(color), color, darken(color)]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={{ width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 30 }}>{emoji}</Text>
      </LinearGradient>
    </View>
  );
  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, transform: [{ scale: beat }] }}>
      <Orb color={TC.accent} emoji="🎮" />
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill={TC.accentSoft} />
      </Svg>
      <Orb color={TC.slate} emoji="🕹️" />
    </Animated.View>
  );
}

// ─── Invite / Accept lobby (gates the arena) ─────────────────────────────────
// A lobby state is only trusted if it changed within this window — a stale
// 'active'/'pending' from an abandoned session must never let anyone in solo.
const LOBBY_FRESH_MS = 90000;
const isFresh = (lobby) => lobby?.updatedat && (Date.now() - new Date(lobby.updatedat).getTime() < LOBBY_FRESH_MS);

function InviteLobby({ params, onStart, onBack }) {
  const { linkCode = '', role = 'creator', user = {}, autoAccept = false } = params;
  const [lobby, setLobby] = useState({ status: 'idle', fromrole: null, fromname: '' });
  const [busy, setBusy]   = useState(false);
  const invitedRef    = useRef(false); // true once I've sent an invite this session
  const autoAcceptRef = useRef(false); // guard so we auto-accept at most once
  const pollRef       = useRef(null);

  const refresh = useCallback(async () => {
    const d = await gGet(`/api/games/lobby/${linkCode}`);
    if (!d?.lobby) return;
    const lb = d.lobby;

    // Stale 'active' left over from an old session → wipe it, stay in lobby.
    if (lb.status === 'active' && !isFresh(lb)) {
      await gPost('/api/games/lobby/leave', { linkcode: linkCode });
      setLobby({ status: 'idle', fromrole: null, fromname: '' });
      return;
    }
    setLobby(lb);

    // Arrived here by tapping "accept" in the inbox → auto-accept the partner's
    // pending arena invite and drop straight into play, no extra tap needed.
    const partnerPending = lb.status === 'pending' && lb.fromrole && lb.fromrole !== role && isFresh(lb);
    if (autoAccept && partnerPending && !autoAcceptRef.current) {
      autoAcceptRef.current = true;
      await gPost('/api/games/lobby/accept', { linkcode: linkCode });
      gPost('/api/inbox/clear-invites', { linkcode: linkCode });
      onStart();
      return;
    }

    // Begin only on a fresh, real activation (partner accepted).
    if (lb.status === 'active' && isFresh(lb)) onStart();
  }, [linkCode, role, autoAccept]);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, LOBBY_POLL);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const sendInvite = async () => {
    setBusy(true);
    invitedRef.current = true;
    await gPost('/api/games/lobby/invite', { linkcode: linkCode, fromrole: role, fromname: user?.name || 'partner' });
    // Ping the partner's shared inbox as a real game invite, so they can accept
    // straight from there. No `game` field → this is the auto-alternating arena.
    await gPost('/api/inbox/send', {
      linkcode: linkCode, from: role, fromname: user?.name || 'partner',
      type: 'game', emoji: '🎮',
      content: 'the game arena',
    });
    await refresh();
    setBusy(false);
  };

  const acceptInvite = async () => {
    setBusy(true);
    await gPost('/api/games/lobby/accept', { linkcode: linkCode });
    onStart();
  };

  const handleBack = () => {
    // Withdraw my invite so the partner doesn't see a stale ping — both in the
    // lobby and in their inbox, so the "accept & play" card disappears for them.
    if (invitedRef.current) {
      gPost('/api/games/lobby/leave', { linkcode: linkCode });
      gPost('/api/inbox/clear-invites', { linkcode: linkCode });
    }
    onBack();
  };

  const fresh          = isFresh(lobby);
  const iInvited       = lobby.status === 'pending' && lobby.fromrole === role && fresh;
  const partnerInvited = lobby.status === 'pending' && lobby.fromrole && lobby.fromrole !== role && fresh;

  return (
    <View style={{ flex: 1, backgroundColor: TC.bg }}>
      <SpaceBackground />

      {/* Back */}
      <View style={st.floatHeader} pointerEvents="box-none">
        <TouchableOpacity onPress={handleBack} style={st.backBtn}>
          <Text style={st.backBtnText}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={st.lobbyCard}>
          <View style={{ marginBottom: 22 }}><LobbyOrbs /></View>

          <Text style={st.lbKicker}>two-player</Text>
          <Text style={st.lobbyTitle}>game arena</Text>

          {partnerInvited ? (
            <>
              <Text style={st.lobbySub}>{lobby.fromname || 'your partner'} wants to play with you right now.</Text>
              <TouchableOpacity onPress={acceptInvite} disabled={busy} activeOpacity={0.88}
                style={{ width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 24 }}>
                <LinearGradient colors={['#86efac','#5BB37E','#2f7d52']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.lobbyBtn}>
                  <Text style={st.lobbyBtnText}>{busy ? 'starting…' : 'accept & play  →'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : iInvited ? (
            <>
              <Text style={st.lobbySub}>invite sent — waiting for {role === 'creator' ? 'your partner' : 'them'} to accept…</Text>
              <View style={st.waitDots}>{[0,1,2].map(i => <WaitDot key={i} delay={i * 200} />)}</View>
              <TouchableOpacity onPress={sendInvite} activeOpacity={0.7} style={{ marginTop: 18 }}>
                <Text style={st.lobbyResend}>tap to re-send invite</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={st.lobbySub}>games are for two. invite your partner — once they accept, the arena goes live for both of you.</Text>
              <TouchableOpacity onPress={sendInvite} disabled={busy} activeOpacity={0.88}
                style={{ width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 24 }}>
                <LinearGradient colors={['#EC7186', TC.accent, '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.lobbyBtn}>
                  <Text style={st.lobbyBtnText}>{busy ? 'sending…' : 'invite partner to play  →'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={st.lobbyHint}>you'll both earn fantasy cash for every game you finish</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function WaitDot({ delay }) {
  const a = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.3, duration: 400, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TC.accent, opacity: a }} />;
}

// Fisher–Yates shuffle of game indices. `avoidFirst` keeps the new first game
// from repeating the one that just played.
function makeOrder(avoidFirst = -1) {
  const idx = GAMES.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (avoidFirst >= 0 && idx[0] === avoidFirst && idx.length > 1) {
    [idx[0], idx[1]] = [idx[1], idx[0]];
  }
  return idx;
}

// ─── LIVE multiplayer race — both partners race together, in real time ────────
function MultiplayerRace({ linkCode, role, user, partnerName, onExit, onNext }) {
  const RACE_TAPS = 50;
  const RACE_MS   = 20000;
  const partnerRole  = role === 'creator' ? 'joiner' : 'creator';
  const partnerField = partnerRole === 'creator' ? 'creatortaps' : 'joinertaps';

  const [phase, setPhase]   = useState('connecting'); // connecting | countdown | racing | result
  const [countNum, setCnt]  = useState(3);
  const [timeLeft, setTime] = useState(20);
  const [myTaps, setMyTaps] = useState(0);
  const [pTaps, setPTaps]   = useState(0);
  const [fcEarned, setFcEarned] = useState(0);
  const [rematchKey, setRematchKey] = useState(0);

  const myTapsRef = useRef(0);
  const offsetRef = useRef(0);          // serverNow - Date.now()
  const startRef  = useRef(null);       // server start timestamp
  const youProg   = useRef(new Animated.Value(0)).current;
  const pProg     = useRef(new Animated.Value(0)).current;
  const scrollY      = useRef(new Animated.Value(0)).current;
  const roadSpeedRef = useRef(8);
  const scrollPosRef = useRef(0);
  const aliveRef  = useRef(true);
  const timers    = useRef({});

  useEffect(() => {
    aliveRef.current = true;
    // reset everything for a (re)match
    myTapsRef.current = 0; setMyTaps(0); setPTaps(0);
    youProg.setValue(0); pProg.setValue(0);
    setPhase('connecting');

    const join = async () => {
      const d = await gPost('/api/games/race/join', { linkcode: linkCode, role });
      if (!aliveRef.current) return;
      if (!d) { setTimeout(join, 1500); return; }
      offsetRef.current = (d.serverNow || Date.now()) - Date.now();
      if (d.startat) { startRef.current = new Date(d.startat).getTime(); begin(); }
      else { setTimeout(join, 1200); } // still waiting for partner to arrive
    };
    join();

    return () => {
      aliveRef.current = false;
      Object.values(timers.current).forEach(clearInterval);
    };
  }, [rematchKey]);

  const begin = () => {
    // tap-reactive road: surges on each tap, decays when idle
    timers.current.road = setInterval(() => {
      roadSpeedRef.current = Math.max(8, roadSpeedRef.current - 1.6);
      scrollPosRef.current = (scrollPosRef.current + roadSpeedRef.current) % 36;
      scrollY.setValue(scrollPosRef.current);
    }, 33);

    // poll the shared race for the partner's live taps
    timers.current.poll = setInterval(async () => {
      const d = await gGet(`/api/games/race/${linkCode}`);
      if (!aliveRef.current || !d?.race) return;
      const pt = d.race[partnerField] || 0;
      setPTaps(pt);
      Animated.timing(pProg, { toValue: Math.min(1, pt / RACE_TAPS), duration: 450, useNativeDriver: true }).start();
    }, 500);

    // push my taps to the server
    timers.current.push = setInterval(() => {
      gPost('/api/games/race/tap', { linkcode: linkCode, role, taps: myTapsRef.current });
    }, 350);

    // synced clock tick (countdown → race → finish)
    timers.current.tick = setInterval(() => {
      const localStart = startRef.current - offsetRef.current;
      const now = Date.now();
      if (now < localStart) {
        setPhase('countdown');
        setCnt(Math.max(1, Math.ceil((localStart - now) / 1000)));
      } else {
        const elapsed = now - localStart;
        if (elapsed >= RACE_MS) { finish(); }
        else { setPhase('racing'); setTime(Math.max(0, Math.ceil((RACE_MS - elapsed) / 1000))); }
      }
    }, 150);
  };

  const finish = async () => {
    Object.values(timers.current).forEach(clearInterval);
    await gPost('/api/games/race/tap', { linkcode: linkCode, role, taps: myTapsRef.current });
    const d = await gGet(`/api/games/race/${linkCode}`);
    if (d?.race) setPTaps(d.race[partnerField] || 0);
    setPhase('result');
    const er = await gPost('/api/games/earn', { linkcode: linkCode, role, name: user?.name || '', gametype: 'racer', score: myTapsRef.current });
    setFcEarned(er?.fcEarned || 0);
  };

  const handleGas = () => {
    if (phase !== 'racing') return;
    myTapsRef.current++; setMyTaps(myTapsRef.current);
    Animated.spring(youProg, { toValue: Math.min(1, myTapsRef.current / RACE_TAPS), tension: 120, friction: 14, useNativeDriver: true }).start();
    roadSpeedRef.current = Math.min(46, roadSpeedRef.current + 7); // floor it → road blurs faster
  };

  const youLeading = myTaps >= pTaps;
  const pName = partnerName || 'partner';

  // ── Result ──
  if (phase === 'result') {
    const won = myTaps > pTaps, tie = myTaps === pTaps;
    const col = tie ? '#fbbf24' : won ? '#22c55e' : '#ff4d6d';
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={['#020d04','#0a1a0c','#020d04']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 38, fontWeight: '900', color: col, textTransform: 'lowercase', letterSpacing: -1 }}>
          {tie ? "it's a tie!" : won ? 'you won! 🏁' : `${pName} won!`}
        </Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', marginTop: 10 }}>
          you {myTaps}  ·  {pName} {pTaps}
        </Text>
        <FcChip amount={fcEarned} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
          <TouchableOpacity onPress={() => setRematchKey(k => k + 1)} style={{ paddingHorizontal: 20, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>rematch</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNext} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient colors={['#4ade80','#22c55e','#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 26, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', textTransform: 'lowercase' }}>next game →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExit} style={{ paddingHorizontal: 18, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Connecting / waiting for partner ──
  if (phase === 'connecting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={['#020d04','#0a1a0c','#020d04']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color="#22c55e" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 14, textTransform: 'lowercase', letterSpacing: 1 }}>
          waiting for {pName} to line up…
        </Text>
        <TouchableOpacity onPress={onExit} style={{ marginTop: 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textTransform: 'lowercase' }}>cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Countdown + Racing ──
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#020d04','#041508','#020d04']} style={StyleSheet.absoluteFill} />
      <GameHud
        left={{ label: 'you', value: myTaps, color: '#4ade80' }}
        right={{ label: pName, value: pTaps, color: '#f472b6' }}
        timeLeft={timeLeft} totalTime={20} timeColor={timeLeft > 7 ? '#22c55e' : '#ef4444'}
      />

      <View style={st.raceArea}>
        <RaceLane label="you" labelColor="#4ade80" progressAnim={youProg} scrollY={scrollY} leading={youLeading}
          car={{ idKey: 'mpyou', c1: '#14532d', c2: '#22c55e', c3: '#166534', glass: '#86efac' }} />
        <View style={st.laneDivider} />
        <RaceLane label={pName} labelColor="#f472b6" progressAnim={pProg} scrollY={scrollY} leading={!youLeading}
          car={{ idKey: 'mppartner', c1: '#9d174d', c2: '#f472b6', c3: '#be185d', glass: '#fbb6e8' }} />
      </View>

      <TouchableOpacity onPress={handleGas} activeOpacity={0.8} style={{ position: 'absolute', bottom: 50, alignSelf: 'center' }}>
        <View style={{ shadowColor: '#22c55e', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.9, shadowRadius: 28, elevation: 20 }}>
          <LinearGradient colors={['#86efac','#22c55e','#15803d','#052e16']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
            style={{ width: 124, height: 124, borderRadius: 62, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(134,239,172,0.4)' }}>
            <View style={{ position: 'absolute', top: 12, left: 22, width: 48, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <Text style={{ fontSize: phase === 'countdown' ? 32 : 24, fontWeight: '900', color: '#fff', textTransform: 'lowercase' }}>
              {phase === 'countdown' ? countNum : '⚡'}
            </Text>
            {phase === 'racing' && <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, letterSpacing: 1 }}>tap!</Text>}
          </LinearGradient>
        </View>
      </TouchableOpacity>

      {phase === 'countdown' && (
        <View style={st.countdownOverlay} pointerEvents="none">
          <Text style={st.countdownNum}>{countNum}</Text>
          <Text style={st.countdownSub}>racing {pName}…</Text>
        </View>
      )}
    </View>
  );
}

// ─── LIVE penalty shootout — one shoots, one keeps; both pick simultaneously ──
const GOAL_ZONES = [
  { id: 'left',   label: '← left'  },
  { id: 'center', label: 'center'  },
  { id: 'right',  label: 'right →' },
];
const zoneX = (z) => (z === 'left' ? -width * 0.24 : z === 'right' ? width * 0.24 : 0);

function GoalDuel({ linkCode, role, user, partnerName, onExit, onNext }) {
  const [st, setSt]           = useState(null);   // server state
  const [locked, setLocked]   = useState(null);   // my zone pick this round
  const [revealing, setReveal]= useState(false);
  const [fcEarned, setFcEarned] = useState(0);
  const shownRef = useRef(-1);                     // last round we've revealed
  const earnedRef = useRef(false);
  const aliveRef = useRef(true);
  const pollRef  = useRef();
  const ballX = useRef(new Animated.Value(0)).current;
  const ballY = useRef(new Animated.Value(0)).current;
  const keepX = useRef(new Animated.Value(0)).current;
  const fbScale = useRef(new Animated.Value(0)).current;
  const pName = partnerName || 'partner';

  // join handshake + poll
  useEffect(() => {
    aliveRef.current = true;
    const join = async () => {
      const d = await gPost('/api/games/goal/join', { linkcode: linkCode, role });
      if (!aliveRef.current) return;
      if (d) setSt(d);
      if (!d || d.status !== 'playing') { setTimeout(join, 1200); return; }
      pollRef.current = setInterval(poll, 700);
    };
    join();
    return () => { aliveRef.current = false; clearInterval(pollRef.current); };
  }, []);

  const poll = async () => {
    const d = await gGet(`/api/games/goal/${linkCode}`);
    if (aliveRef.current && d && d.status !== 'none') setSt(d);
  };

  // detect a newly resolved round → play the reveal
  useEffect(() => {
    if (!st || st.lastround == null) return;
    if (st.lastround > shownRef.current && st.lastround >= 0) {
      setReveal(true);
      ballX.setValue(0); ballY.setValue(0); keepX.setValue(0); fbScale.setValue(0);
      Animated.parallel([
        Animated.timing(ballX, { toValue: zoneX(st.lastshoot), duration: 450, useNativeDriver: true }),
        Animated.timing(ballY, { toValue: -height * 0.18, duration: 450, useNativeDriver: true }),
        Animated.timing(keepX, { toValue: zoneX(st.lastkeep), duration: 320, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(fbScale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }).start();
      });
      const t = setTimeout(() => {
        shownRef.current = st.lastround;
        setReveal(false); setLocked(null);
        ballX.setValue(0); ballY.setValue(0); keepX.setValue(0); fbScale.setValue(0);
      }, 1700);
      return () => clearTimeout(t);
    }
  }, [st?.lastround]);

  // award FC once when the match finishes (scored by your role's success)
  useEffect(() => {
    if (st && st.status === 'finished' && !earnedRef.current) {
      earnedRef.current = true;
      const iShoot = role === st.shooterrole;
      const myScore = (iShoot ? st.shootergoals : (st.totalrounds - st.shootergoals)) * 100;
      gPost('/api/games/earn', { linkcode: linkCode, role, name: user?.name || '', gametype: 'goal', score: myScore })
        .then(er => setFcEarned(er?.fcEarned || 0));
    }
  }, [st?.status]);

  const pick = async (zone) => {
    if (locked || revealing) return;
    setLocked(zone);
    await gPost('/api/games/goal/pick', { linkcode: linkCode, role, zone });
    poll();
  };

  // ── connecting / waiting ──
  if (!st || st.status === 'waiting' || st.status === 'none') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={['#020810','#040f25','#020810']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 14, textTransform: 'lowercase', letterSpacing: 1 }}>
          waiting for {pName} to step up…
        </Text>
        <TouchableOpacity onPress={onExit} style={{ marginTop: 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textTransform: 'lowercase' }}>cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const iShoot = role === st.shooterrole;
  const goals  = st.shootergoals;
  const saves  = (st.lastround + 1 >= 0 ? Math.max(0, (Math.min(st.round, st.totalrounds)) - goals) : 0);

  // ── result ──
  if (st.status === 'finished' && !revealing && shownRef.current >= st.totalrounds - 1) {
    const shooterWon = goals > (st.totalrounds - goals);
    const tie = goals === st.totalrounds - goals;
    const iWon = tie ? false : (iShoot ? shooterWon : !shooterWon);
    const col = tie ? '#fbbf24' : iWon ? '#22c55e' : '#ff4d6d';
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <LinearGradient colors={['#020810','#04122a','#020810']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 36, fontWeight: '900', color: col, textTransform: 'lowercase', letterSpacing: -1, textAlign: 'center' }}>
          {tie ? "it's a draw!" : iWon ? 'you won! ⚽' : `${pName} won!`}
        </Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', textTransform: 'lowercase', marginTop: 12, textAlign: 'center' }}>
          {goals} goals scored · {st.totalrounds - goals} saves
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', marginTop: 6 }}>
          you were the {iShoot ? 'shooter' : 'keeper'} this match
        </Text>
        <FcChip amount={fcEarned} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
          <TouchableOpacity onPress={async () => { shownRef.current = -1; earnedRef.current = false; setFcEarned(0); setLocked(null); await gPost('/api/games/goal/rematch', { linkcode: linkCode }); poll(); }}
            style={{ paddingHorizontal: 18, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>rematch</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNext} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient colors={['#60a5fa','#3b82f6','#1d4ed8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', textTransform: 'lowercase' }}>next game →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExit} style={{ paddingHorizontal: 16, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const roundNo = Math.min(st.round + 1, st.totalrounds);
  const canPick = !locked && !revealing && st.status === 'playing';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#020810','#040f25','#020810']} style={StyleSheet.absoluteFill} />
      <GameHud
        left={{ label: iShoot ? 'you shoot' : 'you keep', value: `${goals}⚽`, color: '#93c5fd' }}
        right={{ label: 'round', value: `${roundNo}/${st.totalrounds}`, color: '#fff' }}
      />

      {/* Goal + field */}
      <View style={gd.field}>
        {/* goal frame */}
        <View style={gd.goalFrame}>
          {[0,1,2].map(i => <View key={i} style={{ flex: 1, borderRightWidth: i < 2 ? 1 : 0, borderColor: 'rgba(147,197,253,0.18)' }} />)}
        </View>
        {/* keeper */}
        <Animated.View style={{ position: 'absolute', top: 14, alignSelf: 'center', transform: [{ translateX: keepX }] }}>
          <Svg width={42} height={60} viewBox="0 0 46 68">
            <Circle cx="23" cy="11" r="10" fill="#fbbf24" />
            <Rect x="8" y="20" width="30" height="34" fill="#3b82f6" rx="6" />
            <Ellipse cx="3" cy="28" rx="5" ry="7" fill="#22c55e" /><Ellipse cx="43" cy="28" rx="5" ry="7" fill="#22c55e" />
            <Rect x="12" y="50" width="9" height="16" fill="#1e3a5f" rx="3" /><Rect x="25" y="50" width="9" height="16" fill="#1e3a5f" rx="3" />
          </Svg>
        </Animated.View>
        {/* ball */}
        <Animated.View style={{ position: 'absolute', bottom: 8, alignSelf: 'center', transform: [{ translateX: ballX }, { translateY: ballY }] }}>
          <Svg width={28} height={28} viewBox="0 0 28 28">
            <Circle cx="14" cy="14" r="13" fill="#fff" stroke="#333" strokeWidth="1.5" />
            <Path d="M14 4l4 6h-8zM4 14l6-4v8zM24 14l-6-4v8zM10 22l4-6 4 6z" fill="#222" opacity="0.8" />
          </Svg>
        </Animated.View>
        {/* GOAL / SAVE feedback */}
        {revealing && (
          <Animated.View style={{ position: 'absolute', top: '42%', alignSelf: 'center', transform: [{ scale: fbScale }] }}>
            <Text style={{ fontSize: 40, fontWeight: '900', color: st.lastgoal ? '#22c55e' : '#ef4444', textTransform: 'lowercase', textShadowColor: st.lastgoal ? '#22c55e' : '#ef4444', textShadowRadius: 18 }}>
              {st.lastgoal ? 'goal! ⚽' : 'saved! 🧤'}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Prompt + zone buttons */}
      <View style={{ position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={gd.prompt}>
          {revealing ? ' ' : iShoot ? '⚽  pick where to shoot' : '🧤  set your catch position'}
        </Text>
        {locked && !revealing && <Text style={gd.waiting}>locked — waiting for {pName}…</Text>}
      </View>
      <View style={{ position: 'absolute', bottom: 48, left: 16, right: 16, flexDirection: 'row', gap: 10 }}>
        {GOAL_ZONES.map(z => {
          const sel = locked === z.id;
          return (
            <TouchableOpacity key={z.id} onPress={() => pick(z.id)} disabled={!canPick} activeOpacity={0.8} style={{ flex: 1 }}>
              <LinearGradient
                colors={sel ? ['rgba(59,130,246,0.5)','rgba(29,78,216,0.3)'] : ['rgba(255,255,255,0.07)','rgba(255,255,255,0.02)']}
                style={[gd.zoneBtn, { borderColor: sel ? '#3b82f6' : 'rgba(255,255,255,0.12)', opacity: canPick || sel ? 1 : 0.4 }]}>
                <Text style={{ fontSize: 13, color: sel ? '#93c5fd' : 'rgba(255,255,255,0.55)', fontWeight: '800', textTransform: 'lowercase' }}>{z.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── NEW GAME: Tug of War — real-time rope battle (you literally pull vs them) ─
function TugOfWar({ linkCode, role, user, partnerName, onExit, onNext }) {
  const DURATION = 15;
  const WIN_LEAD = 25; // pull the knot this many pulls ahead to win instantly
  const partnerField = role === 'creator' ? 'joinerscore' : 'creatorscore';
  const myField      = role === 'creator' ? 'creatorscore' : 'joinerscore';

  const [phase, setPhase] = useState('connecting'); // connecting | countdown | racing | result
  const [cnt, setCnt]     = useState(3);
  const [timeLeft, setTime] = useState(DURATION);
  const [myPulls, setMy]  = useState(0);
  const [pPulls, setP]    = useState(0);
  const [fcEarned, setFcEarned] = useState(0);
  const myRef = useRef(0);
  const offRef = useRef(0);
  const startRef = useRef(null);
  const alive = useRef(true);
  const timers = useRef({});
  const knot = useRef(new Animated.Value(0)).current; // -1 (partner wins) .. 1 (you win)
  const pName = partnerName || 'partner';
  const endedRef = useRef(false);

  useEffect(() => {
    alive.current = true; endedRef.current = false;
    myRef.current = 0; setMy(0); setP(0); knot.setValue(0); setPhase('connecting');
    const join = async () => {
      const d = await gPost('/api/games/duel/join', { linkcode: linkCode, role, gametype: 'tug', timed: true });
      if (!alive.current) return;
      if (!d) { setTimeout(join, 1500); return; }
      offRef.current = (d.serverNow || Date.now()) - Date.now();
      if (d.startat) { startRef.current = new Date(d.startat).getTime(); begin(); }
      else setTimeout(join, 1100);
    };
    join();
    return () => { alive.current = false; Object.values(timers.current).forEach(clearInterval); };
  }, []);

  const begin = () => {
    timers.current.poll = setInterval(async () => {
      const d = await gGet(`/api/games/duel/${linkCode}`);
      if (!alive.current || !d) return;
      const pv = d[partnerField] || 0;
      setP(pv); updateKnot(myRef.current, pv);
    }, 450);
    timers.current.push = setInterval(() => {
      gPost('/api/games/duel/score', { linkcode: linkCode, role, score: myRef.current });
    }, 300);
    timers.current.tick = setInterval(() => {
      const localStart = startRef.current - offRef.current;
      const now = Date.now();
      if (now < localStart) { setPhase('countdown'); setCnt(Math.max(1, Math.ceil((localStart - now) / 1000))); }
      else {
        const left = Math.max(0, Math.ceil((DURATION * 1000 - (now - localStart)) / 1000));
        setPhase('racing'); setTime(left);
        if (now - localStart >= DURATION * 1000) finish();
      }
    }, 150);
  };

  const updateKnot = (mine, theirs) => {
    const lead = Math.max(-WIN_LEAD, Math.min(WIN_LEAD, mine - theirs));
    Animated.timing(knot, { toValue: lead / WIN_LEAD, duration: 200, useNativeDriver: true }).start();
    if (Math.abs(mine - theirs) >= WIN_LEAD) finish();
  };

  const finish = async () => {
    if (endedRef.current) return; endedRef.current = true;
    Object.values(timers.current).forEach(clearInterval);
    await gPost('/api/games/duel/score', { linkcode: linkCode, role, score: myRef.current, done: true });
    const d = await gGet(`/api/games/duel/${linkCode}`);
    if (d) setP(d[partnerField] || 0);
    setPhase('result');
    const er = await gPost('/api/games/earn', { linkcode: linkCode, role, name: user?.name || '', gametype: 'tug', score: myRef.current });
    setFcEarned(er?.fcEarned || 0);
  };

  const pull = () => {
    if (phase !== 'racing') return;
    myRef.current++; setMy(myRef.current);
    updateKnot(myRef.current, pPulls);
    gPost('/api/games/duel/score', { linkcode: linkCode, role, score: myRef.current });
  };

  if (phase === 'connecting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={['#1a0f02','#2a1705','#1a0f02']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color="#f59e0b" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, textTransform: 'lowercase', letterSpacing: 1 }}>waiting for {pName} to grab the rope…</Text>
        <TouchableOpacity onPress={onExit} style={{ marginTop: 24 }}><Text style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' }}>cancel</Text></TouchableOpacity>
      </View>
    );
  }

  if (phase === 'result') {
    const won = myPulls > pPulls, tie = myPulls === pPulls;
    const col = tie ? '#fbbf24' : won ? '#22c55e' : '#ff4d6d';
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <LinearGradient colors={['#1a0f02','#2a1705','#1a0f02']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 38, fontWeight: '900', color: col, textTransform: 'lowercase', letterSpacing: -1, textAlign: 'center' }}>
          {tie ? "dead even!" : won ? 'you pulled it! 💪' : `${pName} won the pull!`}
        </Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', textTransform: 'lowercase', marginTop: 12 }}>you {myPulls}  ·  {pName} {pPulls}</Text>
        <FcChip amount={fcEarned} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
          <TouchableOpacity onPress={onNext} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient colors={['#fde68a','#f59e0b','#b45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 26, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', textTransform: 'lowercase' }}>next game →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExit} style={{ paddingHorizontal: 18, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // knot horizontal travel
  const knotX = knot.interpolate({ inputRange: [-1, 1], outputRange: [-width * 0.33, width * 0.33] });
  const youLead = myPulls >= pPulls;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#1a0f02','#2a1705','#1a0f02']} style={StyleSheet.absoluteFill} />
      <GameHud
        left={{ label: 'you', value: myPulls, color: '#4ade80' }}
        right={{ label: pName, value: pPulls, color: '#f472b6' }}
        timeLeft={timeLeft} totalTime={DURATION} timeColor={timeLeft > 5 ? '#f59e0b' : '#ef4444'}
      />

      {/* Rope arena */}
      <View style={{ position: 'absolute', top: height * 0.30, left: 0, right: 0, alignItems: 'center' }}>
        {/* side markers */}
        <View style={{ position: 'absolute', left: 18, top: -30, alignItems: 'center' }}>
          <Text style={{ fontSize: 30 }}>💪</Text><Text style={{ fontSize: 10, color: '#4ade80', fontWeight: '800', textTransform: 'lowercase' }}>you</Text>
        </View>
        <View style={{ position: 'absolute', right: 18, top: -30, alignItems: 'center' }}>
          <Text style={{ fontSize: 30 }}>💪</Text><Text style={{ fontSize: 10, color: '#f472b6', fontWeight: '800', textTransform: 'lowercase' }}>{pName}</Text>
        </View>
        {/* center line */}
        <View style={{ position: 'absolute', top: -10, width: 2, height: 60, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        {/* the rope */}
        <View style={{ width: width - 80, height: 8, borderRadius: 4, backgroundColor: '#7c4a02', overflow: 'hidden' }}>
          <LinearGradient colors={['#92400e','#d97706','#92400e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </View>
        {/* the glowing heart knot */}
        <Animated.View style={{ position: 'absolute', top: -16, transform: [{ translateX: knotX }] }}>
          <View style={{ shadowColor: '#ff4d6d', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 16, elevation: 16 }}>
            <LinearGradient colors={['#ff9ec7','#ff4d6d','#a30030']} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
              <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill="#fff" /></Svg>
            </LinearGradient>
          </View>
        </Animated.View>
      </View>

      <Text style={{ position: 'absolute', bottom: 200, alignSelf: 'center', fontSize: 13, color: youLead ? '#4ade80' : '#f472b6', fontWeight: '800', textTransform: 'lowercase' }}>
        {phase === 'racing' ? (youLead ? "you're winning the pull!" : `${pName} is pulling ahead!`) : ' '}
      </Text>

      {/* PULL button */}
      <TouchableOpacity onPress={pull} activeOpacity={0.8} style={{ position: 'absolute', bottom: 50, alignSelf: 'center' }}>
        <View style={{ shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.9, shadowRadius: 28, elevation: 20 }}>
          <LinearGradient colors={['#fde68a','#f59e0b','#b45309','#7c2d12']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
            style={{ width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(253,230,138,0.4)' }}>
            <View style={{ position: 'absolute', top: 14, left: 24, width: 50, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <Text style={{ fontSize: phase === 'countdown' ? 34 : 26, fontWeight: '900', color: '#fff', textTransform: 'lowercase' }}>
              {phase === 'countdown' ? cnt : 'pull!'}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>

      {phase === 'countdown' && (
        <View style={st.countdownOverlay} pointerEvents="none">
          <Text style={st.countdownNum}>{cnt}</Text>
          <Text style={st.countdownSub}>tug of war vs {pName}…</Text>
        </View>
      )}
    </View>
  );
}

// ─── Generic live head-to-head wrapper (turns any score game into 2-player) ───
function LiveScoreMatch({ gameId, GameComp, linkCode, role, user, partnerName, onExit, onNext }) {
  const partnerField = role === 'creator' ? 'joinerscore' : 'creatorscore';
  const partnerDone  = role === 'creator' ? 'joinerdone'  : 'creatordone';
  const pName = partnerName || 'partner';

  const [ready, setReady]   = useState(false);   // both joined → start the game
  const [pScore, setPScore] = useState(0);
  const [myFinal, setMyFinal] = useState(null);
  const [pFinal, setPFinal]   = useState(null);
  const [fcEarned, setFcEarned] = useState(0);
  const [seed, setSeed]     = useState(0);       // shared track seed (identical on both)
  const [phase, setPhase]   = useState('connecting'); // connecting | playing | waiting | result
  const myScoreRef = useRef(0);
  const alive = useRef(true);
  const timers = useRef({});

  useEffect(() => {
    alive.current = true;
    const join = async () => {
      const d = await gPost('/api/games/duel/join', { linkcode: linkCode, role, gametype: gameId, timed: false });
      if (!alive.current) return;
      if (d?.seed) setSeed(d.seed);
      if (d && d.status === 'playing') { setReady(true); setPhase('playing'); startPolling(); }
      else setTimeout(join, 1100);
    };
    join();
    return () => { alive.current = false; Object.values(timers.current).forEach(clearInterval); };
  }, []);

  const startPolling = () => {
    timers.current.poll = setInterval(async () => {
      const d = await gGet(`/api/games/duel/${linkCode}`);
      if (!alive.current || !d) return;
      setPScore(d[partnerField] || 0);
      if (d[partnerDone]) setPFinal(d[partnerField] || 0);
    }, 600);
  };

  const onScore = (s) => {
    myScoreRef.current = s;
    gPost('/api/games/duel/score', { linkcode: linkCode, role, score: s });
  };

  const onComplete = async (final) => {
    await gPost('/api/games/duel/score', { linkcode: linkCode, role, score: final, done: true });
    setMyFinal(final); setPhase('waiting');
    const er = await gPost('/api/games/earn', { linkcode: linkCode, role, name: user?.name || '', gametype: gameId, score: final });
    setFcEarned(er?.fcEarned || 0);
  };

  // both finished → result
  useEffect(() => {
    if (phase === 'waiting' && pFinal != null) { setPhase('result'); Object.values(timers.current).forEach(clearInterval); }
  }, [phase, pFinal]);

  if (phase === 'connecting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080810' }}>
        <ActivityIndicator color="#ff4d6d" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, textTransform: 'lowercase', letterSpacing: 1 }}>waiting for {pName}…</Text>
        <TouchableOpacity onPress={onExit} style={{ marginTop: 24 }}><Text style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' }}>cancel</Text></TouchableOpacity>
      </View>
    );
  }

  if (phase === 'waiting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080810' }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', textTransform: 'lowercase' }}>you scored {myFinal}</Text>
        <ActivityIndicator color="#ff4d6d" size="small" style={{ marginTop: 20 }} />
        <Text style={{ color: 'rgba(255,255,255,0.45)', marginTop: 12, textTransform: 'lowercase' }}>waiting for {pName} to finish…</Text>
        <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 4, textTransform: 'lowercase' }}>{pName}: {pScore} so far</Text>
      </View>
    );
  }

  if (phase === 'result') {
    const won = myFinal > pFinal, tie = myFinal === pFinal;
    const col = tie ? '#fbbf24' : won ? '#22c55e' : '#ff4d6d';
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080810', paddingHorizontal: 30 }}>
        <Text style={{ fontSize: 38, fontWeight: '900', color: col, textTransform: 'lowercase', letterSpacing: -1, textAlign: 'center' }}>
          {tie ? "it's a tie!" : won ? 'you won! ✦' : `${pName} won!`}
        </Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', textTransform: 'lowercase', marginTop: 12 }}>you {myFinal}  ·  {pName} {pFinal}</Text>
        <FcChip amount={fcEarned} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
          <TouchableOpacity onPress={onNext} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient colors={['#ff6b8a','#ff4d6d','#c9184a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 26, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', textTransform: 'lowercase' }}>next game →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExit} style={{ paddingHorizontal: 18, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // playing — render the real game + a live partner-score banner
  return (
    <View style={{ flex: 1 }}>
      <GameComp targetScore={null} solo={false} seed={seed} onScore={onScore} onComplete={onComplete} />
      <View style={st.livePartnerBanner} pointerEvents="none">
        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill="#f472b6" /></Svg>
        <Text style={st.livePartnerText}>{pName}: {pScore}</Text>
      </View>
    </View>
  );
}

// ─── NEW GAME: Crash & Clutch — co-op multiplier, bail before the crash ───────
function CrashClutch({ linkCode, role, user, partnerName, onExit, onNext }) {
  const partnerField = role === 'creator' ? 'joinerscore' : 'creatorscore';
  const partnerDone  = role === 'creator' ? 'joinerdone'  : 'creatordone';
  const pName = partnerName || 'partner';

  const [phase, setPhase] = useState('bet');   // bet | connecting | countdown | flying | result
  const [cnt, setCnt]     = useState(3);
  const [mult, setMult]   = useState(1);
  const [crashed, setCrashed] = useState(false);
  const [myBail, setMyBail]   = useState(0);   // 0 = haven't bailed
  const [pBail, setPBail]     = useState(0);
  const [fcEarned, setFc]     = useState(0);
  const [balance, setBalance] = useState(null);
  const betRef    = useRef(0);
  const startRef  = useRef(null);
  const offRef    = useRef(0);
  const crashAtRef= useRef(8000);
  const myBailRef = useRef(0);
  const alive     = useRef(true);
  const timers    = useRef({});
  const carY = useRef(new Animated.Value(0)).current;

  // multiplier as a function of elapsed ms (accelerating, aviator-style)
  const multAt = (ms) => Math.pow(1.06, ms / 240);

  useEffect(() => {
    alive.current = true;
    gGet(`/api/wallet/${linkCode}/${role}`).then(w => { if (alive.current && w) setBalance(w.balance || 0); });
    return () => { alive.current = false; Object.values(timers.current).forEach(clearInterval); };
  }, []);

  // place the bet (deduct FC), then join the synced round
  const confirmBet = async (amount) => {
    betRef.current = amount;
    if (amount > 0) await gPost('/api/games/bet', { linkcode: linkCode, role, name: user?.name || '', amount });
    setPhase('connecting');
    const join = async () => {
      const d = await gPost('/api/games/duel/join', { linkcode: linkCode, role, gametype: 'crash', timed: true });
      if (!alive.current) return;
      if (!d) { setTimeout(join, 1500); return; }
      offRef.current = (d.serverNow || Date.now()) - Date.now();
      if (d.startat && d.seed) {
        startRef.current = new Date(d.startat).getTime();
        crashAtRef.current = 2600 + (d.seed % 9000); // identical crash time on both devices
        begin();
      } else setTimeout(join, 1000);
    };
    join();
  };

  const begin = () => {
    timers.current.poll = setInterval(async () => {
      const d = await gGet(`/api/games/duel/${linkCode}`);
      if (!alive.current || !d) return;
      setPBail((d[partnerField] || 0) / 100);
    }, 500);

    timers.current.tick = setInterval(() => {
      const localStart = startRef.current - offRef.current;
      const now = Date.now();
      if (now < localStart) { setPhase('countdown'); setCnt(Math.max(1, Math.ceil((localStart - now) / 1000))); return; }
      const elapsed = now - localStart;
      if (elapsed >= crashAtRef.current) {
        // CRASH
        setPhase('flying'); setCrashed(true);
        Object.values(timers.current).forEach(clearInterval);
        Animated.timing(carY, { toValue: 40, duration: 250, useNativeDriver: true }).start();
        finish(myBailRef.current); // lock whatever we had (0 if never bailed)
        return;
      }
      setPhase('flying');
      const m = multAt(elapsed);
      setMult(m);
      Animated.timing(carY, { toValue: -Math.min(elapsed / crashAtRef.current, 1) * (height * 0.32), duration: 120, useNativeDriver: true }).start();
    }, 60);
  };

  const bail = () => {
    if (phase !== 'flying' || crashed || myBailRef.current > 0) return;
    const localStart = startRef.current - offRef.current;
    const m = multAt(Date.now() - localStart);
    myBailRef.current = m; setMyBail(m);
    gPost('/api/games/duel/score', { linkcode: linkCode, role, score: Math.round(m * 100), done: true });
  };

  const finish = async (bailedMult) => {
    setTimeout(async () => {
      const d = await gGet(`/api/games/duel/${linkCode}`);
      if (d) setPBail((d[partnerField] || 0) / 100);
      if (bailedMult > 0) {
        if (betRef.current > 0) {
          // bet payout = stake × multiplier locked
          const payout = Math.round(betRef.current * bailedMult);
          await gPost('/api/games/cashout', { linkcode: linkCode, role, name: user?.name || '', amount: payout, description: `crash bail ${bailedMult.toFixed(2)}×` });
          setFc(payout);
        } else {
          // no bet → modest FC by multiplier
          const er = await gPost('/api/games/earn', { linkcode: linkCode, role, name: user?.name || '', gametype: 'crash', score: Math.round(bailedMult * 120) });
          setFc(er?.fcEarned || 0);
        }
      } else { setFc(0); } // crashed → lost the stake (already deducted)
      setPhase('result');
    }, 600);
  };

  if (phase === 'bet') {
    const opts = [0, 50, 100, 200, 500];
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <LinearGradient colors={['#0a0014','#16012a','#0a0014']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 30 }}>🏎️💨</Text>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.5, marginTop: 10 }}>place your bet</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', textAlign: 'center', marginTop: 8, lineHeight: 19 }}>
          stake fc, then bail before the crash.{'\n'}your stake gets multiplied — crash = you lose it.
        </Text>
        {balance != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}>
            <Svg width={14} height={14} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" fill="none" stroke="#fbbf24" strokeWidth="1.5" /><Path d="M12 8v8M9 11h6M9 13h6" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" /></Svg>
            <Text style={{ fontSize: 13, color: '#fbbf24', fontWeight: '800' }}>{balance} fc available</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 22 }}>
          {opts.map(a => {
            const disabled = a > 0 && balance != null && a > balance;
            return (
              <TouchableOpacity key={a} onPress={() => !disabled && confirmBet(a)} disabled={disabled} activeOpacity={0.85}
                style={{ opacity: disabled ? 0.3 : 1, borderRadius: 16, overflow: 'hidden' }}>
                <LinearGradient colors={a === 0 ? ['rgba(255,255,255,0.08)','rgba(255,255,255,0.03)'] : ['#c4b5fd','#a855f7','#6d28d9']}
                  style={{ paddingHorizontal: 20, height: 56, minWidth: 86, alignItems: 'center', justifyContent: 'center', borderWidth: a === 0 ? 1.5 : 0, borderColor: 'rgba(255,255,255,0.12)' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', textTransform: 'lowercase' }}>{a === 0 ? 'no bet' : `${a} fc`}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity onPress={onExit} style={{ marginTop: 26 }}><Text style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' }}>back</Text></TouchableOpacity>
      </View>
    );
  }

  if (phase === 'connecting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={['#0a0014','#16012a','#0a0014']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color="#a855f7" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, textTransform: 'lowercase', letterSpacing: 1 }}>waiting for {pName} to buckle up…</Text>
        <TouchableOpacity onPress={onExit} style={{ marginTop: 24 }}><Text style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' }}>cancel</Text></TouchableOpacity>
      </View>
    );
  }

  if (phase === 'result') {
    const bailed = myBail > 0;
    const clutch = bailed && pBail > 0 && Math.max(myBail, pBail) >= 4;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <LinearGradient colors={['#0a0014','#16012a','#0a0014']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 34, fontWeight: '900', color: bailed ? '#22c55e' : '#ef4444', textTransform: 'lowercase', letterSpacing: -1, textAlign: 'center' }}>
          {bailed ? `secured ${myBail.toFixed(2)}×!` : 'you crashed! 💥'}
        </Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textTransform: 'lowercase', marginTop: 12, textAlign: 'center' }}>
          {pName} {pBail > 0 ? `bailed at ${pBail.toFixed(2)}×` : 'crashed too 💥'}
        </Text>
        {clutch && <Text style={{ fontSize: 13, color: '#fbbf24', fontWeight: '800', textTransform: 'lowercase', marginTop: 8 }}>⚡ clutch bonus — nerves of steel!</Text>}
        {betRef.current > 0 && (
          <Text style={{ fontSize: 13, color: bailed ? '#22c55e' : '#ef4444', textTransform: 'lowercase', marginTop: 10, fontWeight: '700' }}>
            {bailed ? `staked ${betRef.current} fc → won ${Math.round(betRef.current * myBail)} fc` : `lost your ${betRef.current} fc stake`}
          </Text>
        )}
        <FcChip amount={fcEarned} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
          <TouchableOpacity onPress={onNext} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient colors={['#c4b5fd','#a855f7','#6d28d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 26, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', textTransform: 'lowercase' }}>next game →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExit} style={{ paddingHorizontal: 18, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const multColor = crashed ? '#ef4444' : mult < 2 ? '#fff' : mult < 5 ? '#fbbf24' : '#22c55e';
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#0a0014','#16012a','#0a0014']} style={StyleSheet.absoluteFill} />
      <GameHud
        left={{ label: 'you', value: myBail > 0 ? `${myBail.toFixed(1)}×` : '—', color: '#4ade80' }}
        right={{ label: pName, value: pBail > 0 ? `${pBail.toFixed(1)}×` : '—', color: '#f472b6' }}
      />

      {/* big multiplier */}
      <View style={{ position: 'absolute', top: height * 0.22, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: 64, fontWeight: '900', color: multColor, letterSpacing: -2, textShadowColor: multColor, textShadowRadius: 24 }}>
          {crashed ? 'crash!' : `${mult.toFixed(2)}×`}
        </Text>
      </View>

      {/* climbing rocket-car */}
      <Animated.View style={{ position: 'absolute', bottom: 230, alignSelf: 'center', transform: [{ translateY: carY }, { rotate: crashed ? '40deg' : '-12deg' }] }}>
        <Text style={{ fontSize: 54 }}>{crashed ? '💥' : '🏎️'}</Text>
      </Animated.View>

      {/* bail button */}
      <TouchableOpacity onPress={bail} disabled={myBail > 0 || crashed} activeOpacity={0.85} style={{ position: 'absolute', bottom: 56, alignSelf: 'center' }}>
        <View style={{ shadowColor: '#22c55e', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.9, shadowRadius: 26 }}>
          <LinearGradient colors={myBail > 0 ? ['#334155','#1e293b'] : ['#86efac','#22c55e','#15803d']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
            style={{ width: 150, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#fff', textTransform: 'lowercase' }}>
              {myBail > 0 ? `locked ${myBail.toFixed(2)}×` : 'bail out!'}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>

      {phase === 'countdown' && (
        <View style={st.countdownOverlay} pointerEvents="none">
          <Text style={st.countdownNum}>{cnt}</Text>
          <Text style={st.countdownSub}>bail before it crashes!</Text>
        </View>
      )}
    </View>
  );
}

// ─── NEW GAME: Neon Tug-of-War — tap battle with random multiplier windows ────
function NeonTug({ linkCode, role, user, partnerName, onExit, onNext }) {
  const DURATION = 20;
  const partnerField = role === 'creator' ? 'joinerscore' : 'creatorscore';
  const pName = partnerName || 'partner';

  const [phase, setPhase] = useState('connecting');
  const [cnt, setCnt]     = useState(3);
  const [timeLeft, setTime] = useState(DURATION);
  const [myScore, setMy]  = useState(0);
  const [pScore, setP]    = useState(0);
  const [mult, setMultNow] = useState(1);
  const [fcEarned, setFc] = useState(0);
  const myRef = useRef(0);
  const startRef = useRef(null);
  const offRef = useRef(0);
  const windowsRef = useRef([]);     // [{start,end}] multiplier windows (from shared seed)
  const alive = useRef(true);
  const endedRef = useRef(false);
  const timers = useRef({});
  const marker = useRef(new Animated.Value(0)).current; // -1..1

  useEffect(() => {
    alive.current = true; endedRef.current = false;
    const join = async () => {
      const d = await gPost('/api/games/duel/join', { linkcode: linkCode, role, gametype: 'neon', timed: true });
      if (!alive.current) return;
      if (!d) { setTimeout(join, 1500); return; }
      offRef.current = (d.serverNow || Date.now()) - Date.now();
      if (d.startat && d.seed) {
        startRef.current = new Date(d.startat).getTime();
        // derive 2 multiplier windows deterministically from the shared seed
        const a = 2000 + (d.seed % 4000);
        const b = 10000 + (Math.floor(d.seed / 7) % 5000);
        windowsRef.current = [{ s: a, e: a + 3000 }, { s: b, e: b + 3000 }];
        begin();
      } else setTimeout(join, 1000);
    };
    join();
    return () => { alive.current = false; Object.values(timers.current).forEach(clearInterval); };
  }, []);

  const inWindow = (elapsed) => windowsRef.current.some(w => elapsed >= w.s && elapsed < w.e);

  const begin = () => {
    timers.current.poll = setInterval(async () => {
      const d = await gGet(`/api/games/duel/${linkCode}`);
      if (!alive.current || !d) return;
      const pv = d[partnerField] || 0; setP(pv); updateMarker(myRef.current, pv);
    }, 450);
    timers.current.push = setInterval(() => {
      gPost('/api/games/duel/score', { linkcode: linkCode, role, score: myRef.current });
    }, 300);
    timers.current.tick = setInterval(() => {
      const localStart = startRef.current - offRef.current;
      const now = Date.now();
      if (now < localStart) { setPhase('countdown'); setCnt(Math.max(1, Math.ceil((localStart - now) / 1000))); return; }
      const elapsed = now - localStart;
      setPhase('racing');
      setMultNow(inWindow(elapsed) ? 3 : 1);
      setTime(Math.max(0, Math.ceil((DURATION * 1000 - elapsed) / 1000)));
      if (elapsed >= DURATION * 1000) finish();
    }, 120);
  };

  const updateMarker = (mine, theirs) => {
    const lead = Math.max(-200, Math.min(200, mine - theirs));
    Animated.timing(marker, { toValue: lead / 200, duration: 200, useNativeDriver: true }).start();
  };

  const finish = async () => {
    if (endedRef.current) return; endedRef.current = true;
    Object.values(timers.current).forEach(clearInterval);
    await gPost('/api/games/duel/score', { linkcode: linkCode, role, score: myRef.current, done: true });
    const d = await gGet(`/api/games/duel/${linkCode}`);
    if (d) setP(d[partnerField] || 0);
    setPhase('result');
    const er = await gPost('/api/games/earn', { linkcode: linkCode, role, name: user?.name || '', gametype: 'neon', score: myRef.current });
    setFc(er?.fcEarned || 0);
  };

  const tap = () => {
    if (phase !== 'racing') return;
    const localStart = startRef.current - offRef.current;
    const m = inWindow(Date.now() - localStart) ? 3 : 1;
    myRef.current += m; setMy(myRef.current);
    updateMarker(myRef.current, pScore);
  };

  if (phase === 'connecting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#05010a' }}>
        <ActivityIndicator color="#22d3ee" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, textTransform: 'lowercase', letterSpacing: 1 }}>waiting for {pName}…</Text>
        <TouchableOpacity onPress={onExit} style={{ marginTop: 24 }}><Text style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' }}>cancel</Text></TouchableOpacity>
      </View>
    );
  }

  if (phase === 'result') {
    const won = myScore > pScore, tie = myScore === pScore;
    const col = tie ? '#fbbf24' : won ? '#22c55e' : '#ff4d6d';
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, backgroundColor: '#05010a' }}>
        <Text style={{ fontSize: 38, fontWeight: '900', color: col, textTransform: 'lowercase', letterSpacing: -1, textAlign: 'center' }}>
          {tie ? "dead even!" : won ? 'you dominated! ⚡' : `${pName} won!`}
        </Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', textTransform: 'lowercase', marginTop: 12 }}>you {myScore}  ·  {pName} {pScore}</Text>
        <FcChip amount={fcEarned} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
          <TouchableOpacity onPress={onNext} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient colors={['#67e8f9','#22d3ee','#0891b2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 26, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#003', fontWeight: '900', textTransform: 'lowercase' }}>next game →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExit} style={{ paddingHorizontal: 18, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const markerX = marker.interpolate({ inputRange: [-1, 1], outputRange: [-width * 0.32, width * 0.32] });
  const boosted = mult > 1;
  return (
    <Pressable onPressIn={tap} style={{ flex: 1 }}>
      {/* split neon background */}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: '50%', backgroundColor: boosted ? 'rgba(34,211,238,0.25)' : 'rgba(34,211,238,0.10)' }} />
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', right: 0, backgroundColor: boosted ? 'rgba(236,72,153,0.25)' : 'rgba(236,72,153,0.10)' }} />
      <GameHud
        left={{ label: 'you', value: myScore, color: '#22d3ee' }}
        right={{ label: pName, value: pScore, color: '#f472b6' }}
        timeLeft={timeLeft} totalTime={DURATION} timeColor={timeLeft > 5 ? '#22d3ee' : '#ef4444'}
      />

      {boosted && (
        <Text style={{ position: 'absolute', top: height * 0.2, alignSelf: 'center', fontSize: 22, fontWeight: '900', color: '#fbbf24', textTransform: 'lowercase', letterSpacing: 1, textShadowColor: '#fbbf24', textShadowRadius: 16 }}>
          ⚡ multiplier time ×3 ⚡
        </Text>
      )}

      {/* tug marker */}
      <View style={{ position: 'absolute', top: height * 0.42, left: 0, right: 0, alignItems: 'center' }}>
        <View style={{ width: width - 60, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ position: 'absolute', top: -10, left: '50%', width: 2, height: 26, backgroundColor: 'rgba(255,255,255,0.3)' }} />
        <Animated.View style={{ position: 'absolute', top: -15, transform: [{ translateX: markerX }] }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill="#ff4d6d" /></Svg>
          </View>
        </Animated.View>
      </View>

      <Text style={{ position: 'absolute', bottom: 70, alignSelf: 'center', fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'lowercase' }}>
        {phase === 'countdown' ? cnt : 'tap anywhere — fast!'}
      </Text>

      {phase === 'countdown' && (
        <View style={st.countdownOverlay} pointerEvents="none">
          <Text style={st.countdownNum}>{cnt}</Text>
          <Text style={st.countdownSub}>neon tug — pink vs blue</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Renders the right multiplayer wrapper for a chosen game id ───────────────
function renderMpGame(gameId, common) {
  if (gameId === 'crash') return <CrashClutch {...common} />;
  if (gameId === 'neon')  return <NeonTug {...common} />;
  if (gameId === 'race')  return <MultiplayerRace {...common} />;
  if (gameId === 'tug')   return <TugOfWar {...common} />;
  if (gameId === 'goal')  return <GoalDuel {...common} />;
  return <LiveScoreMatch gameId={gameId} GameComp={GAME_COMPONENTS[gameId]} {...common} />;
}

// ─── Non-scrolling game menu: pick a game → play solo or invite partner ───────
const MENU_GAMES = [
  { id: 'crash',    label: 'crash & clutch',  emoji: '🎰', color: '#a855f7', solo: false, tag: 'bet & bail',   desc: 'bet fantasy cash. cash out before it crashes.', stat: 'live' },
  { id: 'neon',     label: 'neon tug',        emoji: '🎯', color: '#22d3ee', solo: false, tag: 'mash',         desc: 'mash faster than your partner to win.',         stat: '15 sec' },
  { id: 'race',     label: 'tap race',        emoji: '🏁', color: '#22c55e', solo: true,  tag: 'race',         desc: 'tap like crazy and cross the line first.',      stat: '20 sec' },
  { id: 'tug',      label: 'tug of war',      emoji: '💪', color: '#f59e0b', solo: false, tag: 'pull',         desc: 'out-pull your partner across the line.',        stat: 'best of 3' },
  { id: 'goal',     label: 'goal rush',       emoji: '⚽', color: '#3b82f6', solo: true,  tag: 'aim',          desc: 'pick your zone and beat the keeper.',           stat: '10 shots' },
  { id: 'cupid',    label: "cupid's arrow",   emoji: '🏹', color: '#ec4899', solo: true,  tag: 'aim & nerve',  desc: 'steady your aim and hit the heart.',            stat: '5 arrows' },
  { id: 'stack',    label: 'stack memories',  emoji: '🧱', color: '#10b981', solo: true,  tag: 'precision',    desc: 'stack the blocks as high as you can.',          stat: 'endless' },
  { id: 'bounce',   label: 'bounce blitz',    emoji: '❤️', color: '#ff4d6d', solo: true,  tag: 'physics',      desc: 'keep the heart bouncing, don\'t let it drop.',  stat: '60 sec' },
  { id: 'reaction', label: 'reaction rush',   emoji: '💗', color: '#ff6b8a', solo: true,  tag: 'fast',         desc: 'tap the instant it lights up.',                 stat: '5 rounds' },
  { id: 'balloon',  label: 'balloon pop',     emoji: '🎈', color: '#f472b6', solo: true,  tag: 'pop',          desc: 'pop every balloon before it escapes.',          stat: '25 sec' },
  { id: 'memory',   label: 'memory match',    emoji: '🃏', color: '#a78bfa', solo: true,  tag: 'solo',         desc: 'flip cards and find every love pair.',          stat: '2 min' },
  { id: 'pattern',  label: 'pattern master',  emoji: '🎨', color: '#fbbf24', solo: true,  tag: 'solo',         desc: 'watch, remember, repeat — then beat.',          stat: '∞ levels' },
];

function GameMenu({ linkCode, role, user, partnerName, onExit, onArena, autoAccept }) {
  const pName = partnerName || 'partner';
  const [view, setView]   = useState('menu');   // menu | solo | lobby | mp
  const [gameId, setGameId] = useState(null);
  const [invite, setInvite] = useState(null);   // pending invite from partner { game, fromname }
  const [soloResult, setSoloResult] = useState(null); // { score, fc }
  const [mode, setMode]   = useState('arena');   // arena | solo | vs — how a tapped game plays
  const [stats, setStats] = useState({ balance: 0, winsToday: 0, streak: 0 });
  const liveScoreRef = useRef(0);
  const soloEndedRef = useRef(false);
  const autoAcceptedRef = useRef(false);
  const alive = useRef(true);
  const pollRef = useRef();

  // Header stats — fantasy cash + win counts.
  useEffect(() => {
    let on = true;
    (async () => {
      const d = await gGet(`/api/games/stats/${linkCode}/${role}`);
      if (on && d) setStats({ balance: d.balance || 0, winsToday: d.winsToday || 0, streak: d.streak || 0 });
    })();
    return () => { on = false; };
  }, [linkCode, role, view]);

  // poll the lobby for incoming invites (and my own accepted invites)
  useEffect(() => {
    alive.current = true;
    const poll = async () => {
      const d = await gGet(`/api/games/lobby/${linkCode}`);
      if (!alive.current || !d?.lobby) return;
      const lb = d.lobby;
      const fresh = lb.updatedat && (Date.now() - new Date(lb.updatedat).getTime() < 90000);
      const incoming = lb.status === 'pending' && lb.fromrole && lb.fromrole !== role && lb.game && fresh;
      if (view === 'menu' && incoming) {
        setInvite({ game: lb.game, fromname: lb.fromname });
        // arrived here by tapping "accept" in the inbox → jump straight in
        if (autoAccept && !autoAcceptedRef.current) {
          autoAcceptedRef.current = true;
          setGameId(lb.game); setInvite(null);
          await gPost('/api/games/lobby/accept', { linkcode: linkCode });
          gPost('/api/inbox/clear-invites', { linkcode: linkCode });
          if (alive.current) setView('mp');
        }
      } else if (view === 'menu') {
        setInvite(null);
      }
      if (view === 'lobby' && lb.status === 'active') { setView('mp'); }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { alive.current = false; clearInterval(pollRef.current); };
  }, [view, linkCode, role, autoAccept]);

  const backToMenu = () => {
    gPost('/api/games/lobby/leave', { linkcode: linkCode });
    gPost('/api/inbox/clear-invites', { linkcode: linkCode });  // game ended → drop the invite notification
    setGameId(null); setSoloResult(null); soloEndedRef.current = false; liveScoreRef.current = 0;
    setView('menu');
  };

  // Leaving the waiting lobby for the castle: withdraw the invite from both the
  // lobby and the partner's inbox first, so no stale "accept & play" card lingers.
  const exitFromLobby = () => {
    gPost('/api/games/lobby/leave', { linkcode: linkCode });
    gPost('/api/inbox/clear-invites', { linkcode: linkCode });
    onExit?.();
  };

  // ── solo ──
  const startSolo = (id) => { setGameId(id); setSoloResult(null); soloEndedRef.current = false; liveScoreRef.current = 0; setView('solo'); };
  const soloComplete = async (score) => {
    if (soloEndedRef.current) return; soloEndedRef.current = true;
    const er = await gPost('/api/games/earn', { linkcode: linkCode, role, name: user?.name || '', gametype: gameId, score });
    setSoloResult({ score, fc: er?.fcEarned || 0 });
  };

  // ── multiplayer ──
  const invitePartner = async (id) => {
    setGameId(id); setView('lobby');
    await gPost('/api/games/lobby/invite', { linkcode: linkCode, fromrole: role, fromname: user?.name || 'partner', game: id });
    const g = MENU_GAMES.find(x => x.id === id);
    gPost('/api/inbox/send', { linkcode: linkCode, from: role, fromname: user?.name || 'partner', type: 'game', emoji: g?.emoji || '🎮', content: g?.label || 'a game', game: id });
  };
  const acceptInvite = async () => {
    const id = invite.game; setGameId(id); setInvite(null);
    await gPost('/api/games/lobby/accept', { linkcode: linkCode });
    gPost('/api/inbox/clear-invites', { linkcode: linkCode });
    setView('mp');
  };

  // ── MP view ──
  if (view === 'mp' && gameId) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
        {renderMpGame(gameId, { linkCode, role, user, partnerName, onExit: backToMenu, onNext: backToMenu })}
      </View>
    );
  }

  // ── lobby (waiting for partner) ──
  if (view === 'lobby') {
    const g = MENU_GAMES.find(x => x.id === gameId);
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080810' }}>
        <TouchableOpacity onPress={exitFromLobby} style={{ position: 'absolute', top: 28, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.8}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text allowFontScaling={false} style={{ fontSize: 44, lineHeight: 48, height: 48 }}>{g?.emoji}</Text>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', textTransform: 'lowercase', marginTop: 12 }}>{g?.label}</Text>
        <ActivityIndicator color="#ff4d6d" size="large" style={{ marginTop: 20 }} />
        <Text style={{ color: 'rgba(255,255,255,0.45)', marginTop: 14, textTransform: 'lowercase' }}>invite sent — waiting for {pName} to accept…</Text>
        <TouchableOpacity onPress={backToMenu} style={{ marginTop: 24 }}><Text style={{ color: 'rgba(255,255,255,0.35)', textTransform: 'lowercase' }}>cancel</Text></TouchableOpacity>
      </View>
    );
  }

  // ── solo play / result ──
  if (view === 'solo' && gameId) {
    const Comp = GAME_COMPONENTS[gameId];
    if (soloResult) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080810' }}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#fff', textTransform: 'lowercase' }}>you scored {soloResult.score}</Text>
          <FcChip amount={soloResult.fc} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 28 }}>
            <TouchableOpacity onPress={() => startSolo(gameId)} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient colors={['#ff6b8a','#ff4d6d','#c9184a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '900', textTransform: 'lowercase' }}>play again</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={backToMenu} style={{ paddingHorizontal: 20, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'lowercase' }}>games</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
        <Comp key={gameId} targetScore={null} solo={true} onScore={(s) => { liveScoreRef.current = s; }} onComplete={soloComplete} />
        <View style={st.floatHeader} pointerEvents="box-none">
          <TouchableOpacity onPress={backToMenu} style={st.backBtn}><Text style={st.backBtnText}>←</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => soloComplete(liveScoreRef.current)} activeOpacity={0.85} style={{ borderRadius: 100, overflow: 'hidden' }}>
            <LinearGradient colors={['#fde68a', '#fbbf24', '#b45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.endBtn}>
              <Svg width={14} height={14} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="1.6" /><Path d="M12 8v8M9 11h6M9 13h6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /></Svg>
              <Text style={st.endBtnText}>end & collect</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── menu ──
  const featured = MENU_GAMES.find(g => g.id === 'crash') || MENU_GAMES[0];
  const gridGames = MENU_GAMES.filter(g => g.id !== featured.id);
  const couplesPlaying = 8 + (Math.abs(hashStr(linkCode)) % 18); // stable per-home flavor number

  // Dispatch a tapped game by the selected mode.
  const playGame = (g) => {
    if (mode === 'arena')      onArena?.();
    else if (mode === 'solo')  { if (g.solo) startSolo(g.id); else onArena?.(); }
    else                       invitePartner(g.id); // vs partner
  };

  const MODES = [
    { id: 'arena', label: 'arena' },
    { id: 'solo',  label: 'solo' },
    { id: 'vs',    label: 'vs partner' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: TC.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={TC.bg} />
      <SpaceBackground />

      {/* header: back + centered GAMES */}
      <View style={mz.topBar}>
        <TouchableOpacity onPress={onExit} style={mz.iconBtn} activeOpacity={0.8}>
          <Text style={mz.iconBtnTxt}>←</Text>
        </TouchableOpacity>
        <Text style={mz.topTitle}>games</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={mz.list} showsVerticalScrollIndicator={false}>
        {/* hero title */}
        <Text style={mz.kicker}>tonight, let's</Text>
        <Text style={mz.heroTitle}>
          play <Text style={mz.heroAccent}>together.</Text>
        </Text>

        {/* stat cards */}
        <View style={mz.statsRow}>
          <View style={mz.statCard}>
            <Text style={[mz.statNum, { color: '#fbbf24' }]}>{stats.balance.toLocaleString()}</Text>
            <Text style={mz.statLbl}>fantasy cash</Text>
          </View>
          <View style={mz.statCard}>
            <Text style={mz.statNum}>{stats.winsToday}</Text>
            <Text style={mz.statLbl}>wins today</Text>
          </View>
          <View style={mz.statCard}>
            <Text style={[mz.statNum, { color: '#ff6b8a' }]}>{stats.streak}</Text>
            <Text style={mz.statLbl}>win streak</Text>
          </View>
        </View>

        {invite && (
          <TouchableOpacity onPress={acceptInvite} activeOpacity={0.9} style={mz.inviteBanner}>
            <LinearGradient colors={['rgba(34,197,94,0.28)', 'rgba(34,197,94,0.06)']} style={mz.inviteGrad}>
              <View style={mz.inviteDot} />
              <View style={{ flex: 1 }}>
                <Text style={mz.inviteText}>{invite.fromname || pName} invites you to play {MENU_GAMES.find(x => x.id === invite.game)?.label || 'a game'}</Text>
                <Text style={mz.inviteCta}>tap to accept & play →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* featured live card */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => playGame(featured)} style={mz.featWrap}>
          <LinearGradient colors={['rgba(224,80,110,0.22)', 'rgba(224,80,110,0.07)', TC.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mz.featCard}>
            <View style={mz.featTop}>
              <View style={mz.featIcon}>
                <Text allowFontScaling={false} style={{ fontSize: 38, lineHeight: 42, height: 42 }}>{featured.emoji}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={mz.featKicker}>featured · live</Text>
                <Text style={mz.featTitle}>{featured.label}</Text>
                <Text style={mz.featDesc}>{featured.desc}</Text>
              </View>
            </View>
            <View style={mz.featBottom}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M16 11a4 4 0 10-4-4 4 4 0 004 4zm-8 0a3 3 0 10-3-3 3 3 0 003 3zm0 2c-2.7 0-5 1.3-5 3.5V19h6v-2.5c0-1 .4-1.9 1-2.6A8 8 0 008 13zm8 0c-2.7 0-5 1.3-5 3.5V19h10v-2.5c0-2.2-2.3-3.5-5-3.5z" fill="rgba(255,255,255,0.55)" /></Svg>
                <Text style={mz.featCouples}>{couplesPlaying} couples playing</Text>
              </View>
              <View style={mz.joinBtn}>
                <LinearGradient colors={['#EC7186', TC.accent, '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={mz.joinFill}>
                  <Text style={mz.joinTxt}>join</Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* game grid (2-col) */}
        <View style={mz.grid}>
          {gridGames.map(g => {
            const dim = mode === 'solo' && !g.solo;
            return (
              <TouchableOpacity key={g.id} activeOpacity={0.85} disabled={dim} onPress={() => playGame(g)} style={[mz.gridCard, dim && { opacity: 0.4 }]}>
                <LinearGradient colors={[`${g.color}1f`, 'rgba(255,255,255,0.02)', 'rgba(14,12,24,0.9)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mz.gridGrad}>
                  <LinearGradient colors={[g.color, `${g.color}77`]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={[mz.gridIcon, { shadowColor: g.color }]}>
                    <Text allowFontScaling={false} style={{ fontSize: 24, lineHeight: 26, height: 26 }}>{g.emoji}</Text>
                  </LinearGradient>
                  <Text style={mz.gridName}>{g.label}</Text>
                  <Text style={mz.gridDesc} numberOfLines={2}>{g.desc}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
                    <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M5 4h14v3a5 5 0 01-4 4.9V14h2v2H7v-2h2v-2.1A5 5 0 015 7V4zm-2 1h2v2a3 3 0 01-2-2.8V5zm16 0h2v.2A3 3 0 0119 7V5z" fill={g.color} /></Svg>
                    <Text style={[mz.gridStat, { color: g.color }]}>{g.stat}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* mode segmented control (fixed bottom) */}
      <View style={mz.segWrap}>
        <View style={mz.segBar}>
          {MODES.map(m => {
            const active = mode === m.id;
            return (
              <TouchableOpacity key={m.id} style={mz.segItem} activeOpacity={0.85} onPress={() => setMode(m.id)}>
                {active ? (
                  <LinearGradient colors={['#EC7186', TC.accent, '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={mz.segActive}>
                    <Text style={mz.segActiveTxt}>{m.label}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={mz.segTxt}>{m.label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// Small stable string hash for per-home flavor numbers.
function hashStr(s) {
  let h = 0;
  for (const ch of String(s || 'x')) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

// Deterministic shuffle of game ids from the shared bond code, so BOTH partners
// compute the identical random order and always land on the same game together.
const MP_GAMES = ['crash', 'neon', 'race', 'tug', 'goal', 'bounce', 'reaction', 'balloon'];
function seededOrder(linkCode, page) {
  let s = page * 2654435761 >>> 0;
  for (const ch of String(linkCode || 'x')) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const a = [...MP_GAMES];
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Game arena — random order (shared with partner), plays through together ──
function MultiplayerArena({ linkCode, role, user, partnerName, onExit }) {
  const [idx, setIdx] = useState(0);
  const len  = MP_GAMES.length;
  const order = seededOrder(linkCode, Math.floor(idx / len)); // reshuffles each full pass
  const gameId = order[idx % len];
  const next = () => setIdx(i => i + 1);
  const common = { linkCode, role, user, partnerName, onExit, onNext: next };
  const k = `m${idx}-${gameId}`;

  let el;
  if (gameId === 'crash')     el = <CrashClutch    key={k} {...common} />;
  else if (gameId === 'neon') el = <NeonTug        key={k} {...common} />;
  else if (gameId === 'race') el = <MultiplayerRace key={k} {...common} />;
  else if (gameId === 'tug')  el = <TugOfWar        key={k} {...common} />;
  else if (gameId === 'goal') el = <GoalDuel        key={k} {...common} />;
  else el = <LiveScoreMatch key={k} gameId={gameId} GameComp={GAME_COMPONENTS[gameId]} {...common} />;

  return (
    <View style={{ flex: 1 }}>
      {el}
      {/* Floating header: back button */}
      <View style={st.floatHeader} pointerEvents="box-none">
        <TouchableOpacity onPress={onExit} style={st.backBtn} activeOpacity={0.8}>
          <Text style={st.backBtnText}>←</Text>
        </TouchableOpacity>
        <View />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function GamesScreen({ onNavigate, params = {} }) {
  const { role = 'creator', linkCode = '', user = {}, solo = false } = params;

  // Solo mode skips the partner lobby entirely and starts playing immediately.
  const [stage, setStage]         = useState(solo ? 'playing' : 'lobby');
  const [order, setOrder]         = useState(makeOrder); // shuffled play order
  const [gameIndex, setGameIndex] = useState(0);
  const [phase, setPhase]         = useState('playing');
  const [lastScore, setLastScore] = useState(0);
  const [lastFc, setLastFc]       = useState(0);
  const [balance, setBalance]     = useState(null);
  const [gameKey, setGameKey]     = useState(0);
  const liveScoreRef = useRef(0);  // current score, so the player can cash out anytime
  const endedRef     = useRef(false);

  const currentGame = GAMES[order[gameIndex % order.length]];
  const GameComp    = GAME_COMPONENTS[currentGame.id];

  // Credit FC for the finished game, then show the transition splash
  const handleGameComplete = async (score) => {
    if (endedRef.current) return;     // guard against double-fire (timer + end button)
    endedRef.current = true;
    setLastScore(score);
    setLastFc(0);
    setBalance(null);
    setPhase('transition');
    const res = await gPost('/api/games/earn', {
      linkcode: linkCode, role, name: user?.name || '',
      gametype: currentGame.id, score,
    });
    if (res) { setLastFc(res.fcEarned || 0); setBalance(res.balance ?? null); }
  };

  const handleTransitionDone = () => {
    const next = gameIndex + 1;
    if (next >= order.length) {
      // Played through every game — reshuffle for a fresh, non-repeating order
      setOrder(makeOrder(order[order.length - 1]));
      setGameIndex(0);
    } else {
      setGameIndex(next);
    }
    liveScoreRef.current = 0;
    endedRef.current = false;
    setGameKey(k => k + 1);
    setPhase('playing');
  };

  // End the current game right now and collect FC for the score so far
  const endAndCollect = () => handleGameComplete(liveScoreRef.current);

  const leaveArena = () => {
    if (!solo) {
      gPost('/api/games/lobby/leave', { linkcode: linkCode });
      gPost('/api/inbox/clear-invites', { linkcode: linkCode });
    }
    onNavigate?.('castle', params);
  };

  // ── Game center: non-scrolling menu (pick a game → solo or invite) ──
  if (params.menu) {
    return (
      <GameMenu
        linkCode={linkCode}
        role={role}
        user={user}
        partnerName={user?.partnerName}
        autoAccept={!!params.autoAccept}
        onExit={() => onNavigate?.('castle', params)}
        onArena={() => onNavigate?.('games', { ...params, menu: false, autoAccept: false })}
      />
    );
  }

  // ── Lobby gate ──
  if (stage === 'lobby') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
        <InviteLobby params={params} onStart={() => setStage('playing')} onBack={() => onNavigate?.('castle', params)} />
      </View>
    );
  }

  // ── Two-player → live games together (auto-alternating: race ↔ shootout) ──
  if (!solo) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
        <MultiplayerArena
          linkCode={linkCode}
          role={role}
          user={user}
          partnerName={user?.partnerName}
          onExit={leaveArena}
        />
      </View>
    );
  }

  // ── Transition splash with FC reward (solo) ──
  if (phase === 'transition') {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
        <GameTransition game={currentGame} score={lastScore} fcEarned={lastFc} newBalance={balance} onDone={handleTransitionDone} />
      </View>
    );
  }

  // ── Live game (solo shuffle) ──
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <GameComp
        key={gameKey}
        targetScore={null}
        solo={solo}
        partnerName={user?.partnerName}
        onScore={(s) => { liveScoreRef.current = s; }}
        onComplete={handleGameComplete}
      />
      {/* Floating header: exit + end-and-collect */}
      <View style={st.floatHeader} pointerEvents="box-none">
        <TouchableOpacity onPress={leaveArena} style={st.backBtn}>
          <Text style={st.backBtnText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={endAndCollect} activeOpacity={0.85} style={{ borderRadius: 100, overflow: 'hidden' }}>
          <LinearGradient colors={['#fde68a', '#fbbf24', '#b45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.endBtn}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="1.6" />
              <Path d="M12 8v8M9 11h6M9 13h6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            </Svg>
            <Text style={st.endBtnText}>end & collect</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      {/* Dot progress strip — follows the shuffled order */}
      <View style={st.dotsWrap} pointerEvents="none">
        {order.map((gi, i) => {
          const g = GAMES[gi];
          const pos = gameIndex % order.length;
          return (
            <View key={g.id} style={[
              st.dot,
              i === pos
                ? [st.dotCurrent, { backgroundColor: g.color, shadowColor: g.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8 }]
                : i < pos
                ? [st.dot, { backgroundColor: `${g.color}55` }]
                : st.dotPending
            ]} />
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  // HUD
  hudGrad:  { position: 'absolute', top: 0, left: 0, right: 0, height: 120, zIndex: 1 },
  gameHud:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 52 : 36, paddingBottom: 10, zIndex: 2 },
  hudLeft:  { alignItems: 'flex-start', minWidth: 80 },
  hudMid:   { alignItems: 'center' },
  hudRight: { alignItems: 'flex-end', minWidth: 80 },
  hudLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 1.8, marginBottom: 2, fontWeight: '600' },
  hudVal:   { fontSize: 30, fontWeight: '900', color: '#fff' },
  timerBg:  { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 24, borderRadius: 2, marginBottom: 8, zIndex: 2 },
  timerFill:{ height: 3, borderRadius: 2 },

  // Countdown overlay
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  countdownNum: { fontSize: 100, fontWeight: '900', color: '#ffffff', textShadowColor: 'rgba(255,255,255,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 40, textTransform: 'lowercase' },
  countdownSub: { fontSize: 13, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 2, marginTop: -10 },

  // Memory
  memGrid:      { flexDirection: 'row', flexWrap: 'wrap', width: width - 16, justifyContent: 'center', gap: 9, marginTop: 8 },
  memCell:      { width: (width - 16 - 9 * 3) / 4 - 2, aspectRatio: 1 },
  memCardInner: { flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Pattern
  patternGrid:  { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 16, justifyContent: 'center' },
  patBtn:       { borderRadius: 22 },
  patBtnInner:  { width: 112, height: 112, borderRadius: 22, borderWidth: 2, overflow: 'hidden' },

  // Emoji
  emojiOpt:   { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 12, overflow: 'hidden' },
  optLetter:  { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Goal
  zoneBtn: { height: 52, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  // Tap Racer
  raceArea:   { position: 'absolute', top: 120, left: 18, right: 18, bottom: 190, flexDirection: 'row', borderRadius: 14, overflow: 'hidden', backgroundColor: '#0a0f0a', borderWidth: 1, borderColor: 'rgba(34,197,94,0.18)' },
  lane:       { flex: 1 },
  laneLabel:  { fontSize: 11, fontWeight: '800', textTransform: 'lowercase', textAlign: 'center', paddingVertical: 6, letterSpacing: 0.5 },
  laneTrack:  { flex: 1, overflow: 'hidden', backgroundColor: '#141a14' },
  laneDivider:{ width: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  finishLine: { position: 'absolute', top: 6, left: 0, right: 0, height: 10, flexDirection: 'row', opacity: 0.9 },

  // Floating header
  floatHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 44 : 28, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 },
  backBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.75)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  backBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '700' },
  gamePill:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5 },
  gamePillText:{ fontSize: 11, fontWeight: '800', textTransform: 'lowercase', letterSpacing: 1 },
  endBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 100 },
  endBtnText:  { fontSize: 12, fontWeight: '900', color: '#fff', textTransform: 'lowercase', letterSpacing: 0.4 },
  arenaBack:   { position: 'absolute', top: Platform.OS === 'ios' ? 46 : 30, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },

  // Dots (vertical strip on right)
  dotsWrap:   { position: 'absolute', right: 12, top: height * 0.5 - (GAMES.length * 12) / 2, gap: 6, alignItems: 'center' },
  dot:        { width: 5, height: 5, borderRadius: 3 },
  dotCurrent: { width: 5, height: 16, borderRadius: 3 },
  dotPending: { backgroundColor: 'rgba(255,255,255,0.15)' },

  // Lobby
  lobbyCard:   { width: '100%', maxWidth: 380, alignItems: 'center', backgroundColor: TC.surface, borderRadius: 28, borderWidth: 1, borderColor: TC.hairline, paddingVertical: 34, paddingHorizontal: 26, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 28, elevation: 12 },
  lbKicker:    { fontSize: 11, color: TC.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 3 },
  lobbyTitle:  { fontFamily: TF.serif, fontSize: 34, color: TC.text, letterSpacing: -0.5, marginTop: 4, marginBottom: 14 },
  lobbySub:    { fontSize: 14, color: TC.textSoft, textAlign: 'center', lineHeight: 21 },
  lobbyBtn:    { height: 56, alignItems: 'center', justifyContent: 'center' },
  lobbyBtnText:{ color: '#fff', fontSize: 15, fontWeight: '700', textTransform: 'lowercase', letterSpacing: 0.4 },
  lobbyHint:   { fontSize: 11, color: TC.gold, textTransform: 'lowercase', textAlign: 'center', marginTop: 18, letterSpacing: 0.5 },
  lobbyResend: { fontSize: 12, color: TC.accentSoft, textTransform: 'lowercase', letterSpacing: 0.5 },
  waitDots:    { flexDirection: 'row', gap: 8, marginTop: 16 },

  // Live partner score banner (head-to-head overlay)
  livePartnerBanner: { position: 'absolute', top: Platform.OS === 'ios' ? 92 : 76, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, zIndex: 5 },
  livePartnerText:   { fontSize: 12, color: '#f9a8d4', fontWeight: '800', textTransform: 'lowercase' },
});

// ─── Penalty shootout (GoalDuel) styles ──────────────────────────────────────
const gd = StyleSheet.create({
  field:     { position: 'absolute', top: 120, left: 18, right: 18, height: height * 0.40, backgroundColor: '#0a1424', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', overflow: 'hidden' },
  goalFrame: { position: 'absolute', top: 8, left: 16, right: 16, height: height * 0.16, borderWidth: 3, borderColor: '#e2e8f0', borderBottomWidth: 0, flexDirection: 'row', backgroundColor: 'rgba(59,130,246,0.05)' },
  prompt:    { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'lowercase', letterSpacing: 0.4 },
  waiting:   { fontSize: 12, color: '#93c5fd', textTransform: 'lowercase', marginTop: 6 },
  zoneBtn:   { height: 52, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

// ─── Game menu (game center) styles ──────────────────────────────────────────
const GRID_GAP = 14;
const GRID_CARD_W = (width - 36 - GRID_GAP) / 2; // 18px side padding each side
const mz = StyleSheet.create({
  blob:    { position: 'absolute', width: 260, height: 260, borderRadius: 130, opacity: 0.07 },

  // top bar
  topBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 6 },
  topTitle:{ fontSize: 12, fontWeight: '700', color: TC.textSoft, textTransform: 'uppercase', letterSpacing: 5 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: TC.surface, borderWidth: 1, borderColor: TC.hairline, alignItems: 'center', justifyContent: 'center' },
  iconBtnTxt: { color: TC.text, fontSize: 19, fontWeight: '600', marginTop: -1 },

  list:    { paddingHorizontal: 18, paddingBottom: 150 },

  // hero
  kicker:    { fontSize: 11, color: TC.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 3, marginTop: 18 },
  heroTitle: { fontFamily: TF.serif, fontSize: 46, color: TC.text, letterSpacing: -1, marginTop: 6, lineHeight: 50 },
  heroAccent:{ color: TC.accentSoft, fontStyle: 'italic' },

  // stats
  statsRow:  { flexDirection: 'row', gap: 12, marginTop: 26 },
  statCard:  { flex: 1, backgroundColor: TC.surface, borderWidth: 1, borderColor: TC.hairline, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  statNum:   { fontFamily: TF.serif, fontSize: 26, color: TC.text, letterSpacing: -0.5 },
  statLbl:   { fontSize: 9.5, color: TC.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 6, fontWeight: '600' },

  // featured
  featWrap:  { marginTop: 24, borderRadius: 26, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 10 },
  featCard:  { padding: 22, borderRadius: 26, borderWidth: 1, borderColor: TC.accentLine },
  featTop:   { flexDirection: 'row', alignItems: 'flex-start' },
  featIcon:  { width: 68, height: 68, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: TC.hairline2 },
  featKicker:{ fontSize: 10, color: TC.accentSoft, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  featTitle: { fontFamily: TF.serif, fontSize: 26, color: TC.text, letterSpacing: -0.5, marginTop: 5 },
  featDesc:  { fontSize: 13, color: TC.textSoft, marginTop: 6, lineHeight: 18 },
  featBottom:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  featCouples:{ fontSize: 13, color: TC.textMuted, fontWeight: '500' },
  joinBtn:   { borderRadius: 100, overflow: 'hidden', shadowColor: TC.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  joinFill:  { paddingHorizontal: 34, height: 44, alignItems: 'center', justifyContent: 'center' },
  joinTxt:   { fontSize: 15, color: '#fff', fontWeight: '700', letterSpacing: 0.3 },

  // grid
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginTop: 18 },
  gridCard:  { width: GRID_CARD_W, borderRadius: 22, overflow: 'hidden' },
  gridGrad:  { padding: 18, borderRadius: 22, borderWidth: 1, borderColor: TC.hairline, backgroundColor: TC.surface, minHeight: 168 },
  gridIcon:  { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  gridName:  { fontFamily: TF.serif, fontSize: 18, color: TC.text, marginTop: 14 },
  gridDesc:  { fontSize: 12, color: TC.textMuted, marginTop: 5, lineHeight: 16 },
  gridStat:  { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

  // mode segmented control
  segWrap:   { position: 'absolute', left: 18, right: 18, bottom: Platform.OS === 'ios' ? 32 : 20 },
  segBar:    { flexDirection: 'row', backgroundColor: TC.bgElev, borderRadius: 100, padding: 5, borderWidth: 1, borderColor: TC.hairline, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 14 },
  segItem:   { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  segActive: { width: '100%', height: 44, borderRadius: 100, alignItems: 'center', justifyContent: 'center', shadowColor: TC.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  segActiveTxt: { fontSize: 12, color: '#fff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  segTxt:    { fontSize: 12, color: TC.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },

  // invite banner (kept)
  inviteBanner: { marginTop: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(127,169,140,0.4)' },
  inviteGrad:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: 'rgba(127,169,140,0.1)' },
  inviteDot:    { width: 9, height: 9, borderRadius: 5, backgroundColor: TC.sage },
  inviteText:   { fontSize: 13, color: TC.text, fontWeight: '600' },
  inviteCta:    { fontSize: 12, color: TC.sage, fontWeight: '700', marginTop: 3 },
});
