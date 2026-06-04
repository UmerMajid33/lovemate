// components/games3d/GoalRush3D.js
// 3D penalty shootout vs a LIVE moving keeper (Three.js + expo-gl). The keeper
// slides across the goal; pick a lane to shoot — score if the keeper isn't there.
// 10 shots. Solo.
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { colors, fonts } from '../../theme/theme.js';

const { height } = Dimensions.get('window');
const SHOTS = 10;
const LANES = { left: -1.7, center: 0, right: 1.7 };
const GOAL_Z = -4.2;
const SAVE_DIST = 0.95;     // keeper within this of the shot lane = save

export default function GoalRush3D({ onComplete, onScore }) {
  const [goals, setGoals] = useState(0);
  const [shot, setShot]   = useState(0);
  const [feedback, setFb] = useState('');     // 'goal' | 'saved'
  const [countdown, setCnt] = useState(3);

  const goalsRef = useRef(0);
  const shotRef  = useRef(0);
  const runRef   = useRef(false);
  const endedRef = useRef(false);
  const phase    = useRef('aim');             // aim | flying | reveal
  const laneX    = useRef(0);
  const ballT    = useRef(0);
  const keeperX  = useRef(0);
  const keeperDir= useRef(1);
  const keeperSpd= useRef(3.6);   // fast keeper

  const end = () => {
    if (endedRef.current) return;
    endedRef.current = true; runRef.current = false;
    setTimeout(() => onComplete?.(goalsRef.current * 100), 700);
  };

  useEffect(() => {
    let c = 3;
    const cd = setInterval(() => { c--; setCnt(c); if (c <= 0) { clearInterval(cd); runRef.current = true; } }, 800);
    return () => { clearInterval(cd); runRef.current = false; };
  }, []);

  const shoot = (lane) => {
    if (!runRef.current || phase.current !== 'aim' || endedRef.current) return;
    laneX.current = LANES[lane];
    ballT.current = 0;
    phase.current = 'flying';
  };

  const onContextCreate = (gl) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x020912, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    camera.position.set(0, 1.4, 5.2); camera.lookAt(0, 0.6, GOAL_Z);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 1.0); dl.position.set(2, 6, 4); scene.add(dl);

    // pitch
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), new THREE.MeshStandardMaterial({ color: 0x0c4a2e, roughness: 1 }));
    pitch.rotation.x = -Math.PI / 2; pitch.position.set(0, -0.6, -2); scene.add(pitch);

    // goal frame (posts + crossbar)
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222 });
    const post = (x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 12), postMat); m.position.set(x, 0.6, GOAL_Z); scene.add(m); };
    post(-2.4); post(2.4);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.96, 12), postMat);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.8, GOAL_Z); scene.add(bar);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.4), new THREE.MeshBasicMaterial({ color: 0x9ca3af, wireframe: true, transparent: true, opacity: 0.25 }));
    net.position.set(0, 0.6, GOAL_Z - 0.1); scene.add(net);
    // goal celebration flash
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.4), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0 }));
    flash.position.set(0, 0.6, GOAL_Z - 0.05); scene.add(flash);
    let flashV = 0;

    // keeper
    const keeper = new THREE.Group();
    const kbody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x0b2a5e }));
    kbody.position.y = 0.4; keeper.add(kbody);
    const khead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
    khead.position.y = 1.2; keeper.add(khead);
    keeper.position.set(0, 0, GOAL_Z + 0.3); scene.add(keeper);

    // ball
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
    const resetBall = () => ball.position.set(0, 0.0, 3.4);
    resetBall(); scene.add(ball);

    let last = Date.now(), revealUntil = 0;
    const render = () => {
      requestAnimationFrame(render);
      if (endedRef.current) { renderer.render(scene, camera); gl.endFrameEXP(); return; }
      const now = Date.now(); const dt = Math.min((now - last) / 1000, 0.04); last = now;

      // keeper slides across the mouth
      keeperX.current += keeperDir.current * keeperSpd.current * dt;
      if (keeperX.current > 2.0) { keeperX.current = 2.0; keeperDir.current = -1; }
      if (keeperX.current < -2.0) { keeperX.current = -2.0; keeperDir.current = 1; }
      keeper.position.x = keeperX.current;

      if (phase.current === 'flying') {
        ballT.current += dt / 0.5;
        const t = Math.min(1, ballT.current);
        ball.position.x = laneX.current * t;
        ball.position.z = 3.4 + (GOAL_Z + 0.3 - 3.4) * t;
        ball.position.y = Math.sin(t * Math.PI) * 0.8;     // arc
        ball.rotation.x += dt * 14; ball.rotation.z += dt * 9; // spin
        if (t >= 1) {
          const saved = Math.abs(keeperX.current - laneX.current) < SAVE_DIST;
          if (!saved) { goalsRef.current += 1; setGoals(goalsRef.current); onScore?.(goalsRef.current * 100); flashV = 1; }
          else { keeper.position.x += (laneX.current - keeper.position.x) * 0.6; } // lunge/dive to the save
          setFb(saved ? 'saved' : 'goal');
          phase.current = 'reveal'; revealUntil = now + 850;
        }
      } else if (phase.current === 'reveal' && now > revealUntil) {
        setFb('');
        shotRef.current += 1; setShot(shotRef.current);
        resetBall();
        keeperSpd.current = 3.6 + shotRef.current * 0.4;    // keeper speeds up fast
        if (shotRef.current >= SHOTS) end();
        else phase.current = 'aim';
      }

      flashV = Math.max(0, flashV - dt * 1.6);
      flash.material.opacity = flashV * 0.5;

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  const fbColor = feedback === 'goal' ? '#86efac' : '#fca5a5';

  return (
    <View style={{ flex: 1, backgroundColor: '#020912' }}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />

      <View style={s.hud} pointerEvents="none">
        <Text style={s.hudVal}>{goals} ⚽</Text>
        <Text style={s.shots}>shot {Math.min(shot + 1, SHOTS)}/{SHOTS}</Text>
      </View>

      {feedback ? <Text style={[s.fb, { color: fbColor }]} pointerEvents="none">{feedback === 'goal' ? 'goal! ⚽' : 'saved! 🧤'}</Text> : null}

      {/* lane buttons */}
      {countdown <= 0 && (
        <View style={s.lanes}>
          {['left', 'center', 'right'].map(l => (
            <TouchableOpacity key={l} activeOpacity={0.8} style={s.laneBtn} onPress={() => shoot(l)}>
              <Text style={s.laneTxt}>{l === 'left' ? '◄ left' : l === 'right' ? 'right ►' : '▲ center'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {countdown > 0 && (
        <View style={s.cd} pointerEvents="none">
          <Text style={s.cdNum}>{countdown}</Text>
          <Text style={s.cdSub}>beat the keeper — pick a lane</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hud: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 38, left: 0, right: 0, alignItems: 'center' },
  hudVal: { fontFamily: fonts.serif, fontSize: 36, color: '#fff' },
  shots: { fontSize: 11, color: 'rgba(242,237,228,0.5)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 },
  fb: { position: 'absolute', alignSelf: 'center', top: height * 0.4, fontFamily: fonts.serif, fontSize: 34 },
  lanes: { position: 'absolute', bottom: 48, left: 16, right: 16, flexDirection: 'row', gap: 10 },
  laneBtn: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(147,197,253,0.4)', backgroundColor: 'rgba(59,130,246,0.12)', alignItems: 'center', justifyContent: 'center' },
  laneTxt: { color: '#bfdbfe', fontWeight: '800', textTransform: 'lowercase', fontSize: 14 },
  cd: { position: 'absolute', alignSelf: 'center', top: height * 0.4, alignItems: 'center' },
  cdNum: { fontFamily: fonts.serif, fontSize: 70, color: '#fff' },
  cdSub: { fontSize: 12, color: 'rgba(242,237,228,0.6)', textTransform: 'lowercase', letterSpacing: 1, marginTop: 6 },
});
