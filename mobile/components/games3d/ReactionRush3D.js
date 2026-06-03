// components/games3d/ReactionRush3D.js
// 3D timing game (Three.js + expo-gl). An incoming ring shrinks toward a fixed
// target ring around a glowing core — tap the instant they align. 6 rounds.
// Perfect = tight window, good = looser, miss = too early/late.
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { colors, fonts } from '../../theme/theme.js';

const { width, height } = Dimensions.get('window');
const ROUNDS = 6;
const ACCENT = 0xE0506E;

export default function ReactionRush3D({ onComplete, onScore }) {
  const [round, setRound]   = useState(0);
  const [score, setScore]   = useState(0);
  const [judge, setJudge]   = useState('');     // 'perfect' | 'good' | 'miss'
  const [countdown, setCnt] = useState(3);

  const scoreRef = useRef(0);
  const roundRef = useRef(0);
  const runRef   = useRef(false);
  const endedRef = useRef(false);
  const tapRef   = useRef(false);

  // ring state (shared with GL loop)
  const ringScale = useRef(3.0);   // current incoming-ring scale (target = 1.0)
  const speedRef  = useRef(1.6);   // scale units / sec
  const liveRef   = useRef(false); // a ring is currently closing
  const flashRef  = useRef(0);     // >0 = recent hit flash (perfect)

  const finish = () => {
    if (endedRef.current) return;
    endedRef.current = true; runRef.current = false;
    setTimeout(() => onComplete?.(scoreRef.current), 600);
  };

  const nextRound = () => {
    if (roundRef.current >= ROUNDS) { finish(); return; }
    roundRef.current += 1;
    setRound(roundRef.current);
    ringScale.current = 2.6 + Math.random() * 1.0;        // start wide
    speedRef.current  = 1.3 + roundRef.current * 0.12 + Math.random() * 0.5; // faster each round
    tapRef.current = false;
    liveRef.current = true;
  };

  const judgeTap = () => {
    if (!liveRef.current || tapRef.current) return;
    tapRef.current = true;
    liveRef.current = false;
    const diff = Math.abs(ringScale.current - 1.0);
    let pts = 0, label = 'miss';
    if (diff < 0.16)      { pts = 100; label = 'perfect'; flashRef.current = 1; }
    else if (diff < 0.42) { pts = 50;  label = 'good'; }
    scoreRef.current += pts;
    setScore(scoreRef.current);
    onScore?.(scoreRef.current);
    setJudge(label);
    setTimeout(() => setJudge(''), 700);
    setTimeout(nextRound, 650);
  };

  useEffect(() => {
    let c = 3;
    const cd = setInterval(() => {
      c--; setCnt(c);
      if (c <= 0) { clearInterval(cd); runRef.current = true; nextRound(); }
    }, 1000);
    return () => { clearInterval(cd); runRef.current = false; };
  }, []);

  const onContextCreate = (gl) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x0a0510, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    camera.position.z = 5;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.PointLight(0xffffff, 1.2); key.position.set(4, 5, 6); scene.add(key);
    const rim = new THREE.PointLight(ACCENT, 1.4); rim.position.set(-4, -2, 3); scene.add(rim);

    // glowing core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 32, 32),
      new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.2 })
    );
    scene.add(core);

    // fixed target ring (radius the incoming ring must match)
    const target = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.045, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0xF2EDE4 })
    );
    scene.add(target);

    // incoming ring (scales down toward target)
    const incoming = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.06, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0xF08FA0 })
    );
    scene.add(incoming);

    // starfield
    const starGeo = new THREE.BufferGeometry();
    const starN = 140, pos = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) { pos[i*3]= (Math.random()-0.5)*18; pos[i*3+1]=(Math.random()-0.5)*18; pos[i*3+2]=-2-Math.random()*10; }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xF2EDE4, size: 0.05 }));
    scene.add(stars);

    let last = Date.now();
    const render = () => {
      if (endedRef.current) return;
      requestAnimationFrame(render);
      const now = Date.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now;

      if (liveRef.current) {
        ringScale.current -= speedRef.current * dt;
        if (ringScale.current <= 0.55) {        // shrank past the target → miss
          liveRef.current = false;
          if (!tapRef.current) { setJudge('miss'); setTimeout(() => setJudge(''), 600); setTimeout(nextRound, 500); }
        }
      }
      const s = Math.max(0.001, ringScale.current);
      incoming.scale.set(s, s, s);
      const close = 1 - Math.min(1, Math.abs(s - 1));    // 1 when aligned
      incoming.material.color.setRGB(0.94, 0.56 + close * 0.3, 0.63);

      // core pulse + hit flash
      flashRef.current = Math.max(0, flashRef.current - dt * 2);
      const pulse = 1 + Math.sin(now / 300) * 0.05 + flashRef.current * 0.6;
      core.scale.set(pulse, pulse, pulse);
      core.material.emissiveIntensity = 0.5 + flashRef.current * 1.5;
      core.rotation.y += dt * 0.6;

      stars.rotation.z += dt * 0.02;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  const jColor = judge === 'perfect' ? '#86efac' : judge === 'good' ? colors.gold : '#fca5a5';

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0510' }}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
      <Pressable style={StyleSheet.absoluteFill} onPressIn={judgeTap} />

      {/* HUD */}
      <View style={s.hud} pointerEvents="none">
        <Text style={s.hudItem}>round {Math.min(round, ROUNDS)}/{ROUNDS}</Text>
        <Text style={[s.hudItem, { color: colors.accentSoft }]}>{score}</Text>
      </View>

      {judge ? <Text style={[s.judge, { color: jColor }]} pointerEvents="none">{judge}!</Text> : null}

      {countdown > 0 && (
        <View style={s.cd} pointerEvents="none">
          <Text style={s.cdNum}>{countdown}</Text>
          <Text style={s.cdSub}>tap when the rings align</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hud: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 38, left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between' },
  hudItem: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  judge: { position: 'absolute', alignSelf: 'center', top: height * 0.62, fontFamily: fonts.serif, fontSize: 32, letterSpacing: 0.5 },
  cd: { position: 'absolute', alignSelf: 'center', top: height * 0.42, alignItems: 'center' },
  cdNum: { fontFamily: fonts.serif, fontSize: 70, color: '#fff' },
  cdSub: { fontSize: 12, color: 'rgba(242,237,228,0.6)', textTransform: 'lowercase', letterSpacing: 1, marginTop: 6 },
});
