// components/games3d/BounceBlitz3D.js
// 3D bounce game (Three.js + expo-gl). A glowing orb falls under gravity; tap to
// bounce it back up. Walls bounce it sideways. Let it fall below the floor → over.
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { colors, fonts } from '../../theme/theme.js';

const { height } = Dimensions.get('window');
const G = 14;            // gravity
const UP = 8.5;          // bounce impulse
const WALL = 2.7;        // side walls (x)
const FLOOR = -3.4;      // below this = game over
const R = 0.5;           // ball radius

export default function BounceBlitz3D({ onComplete, onScore }) {
  const [score, setScore]   = useState(0);
  const [countdown, setCnt] = useState(3);

  const scoreRef = useRef(0);
  const runRef = useRef(false);
  const endedRef = useRef(false);
  const tapRef = useRef(false);
  const pos = useRef({ x: 0, y: 1.5 });
  const vel = useRef({ x: 0, y: 0 });

  const end = () => {
    if (endedRef.current) return;
    endedRef.current = true; runRef.current = false;
    setTimeout(() => onComplete?.(scoreRef.current), 600);
  };

  useEffect(() => {
    let c = 3;
    const cd = setInterval(() => { c--; setCnt(c); if (c <= 0) { clearInterval(cd); runRef.current = true; vel.current = { x: 0, y: 2 }; } }, 800);
    return () => { clearInterval(cd); runRef.current = false; };
  }, []);

  const onContextCreate = (gl) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x0d0008, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pl = new THREE.PointLight(0xE0506E, 1.6); pl.position.set(2, 3, 5); scene.add(pl);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(R, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xE0506E, emissive: 0xE0506E, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.3 })
    );
    scene.add(ball);

    // floor danger line
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6 })
    );
    floor.position.y = FLOOR; scene.add(floor);

    // side walls (thin)
    [-WALL - R, WALL + R].forEach((x) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 9), new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.25 }));
      w.position.set(x, 0, 0); scene.add(w);
    });

    // stars
    const N = 90, g2 = new THREE.BufferGeometry(), p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i*3]=(Math.random()-0.5)*14; p[i*3+1]=(Math.random()-0.5)*14; p[i*3+2]=-2-Math.random()*8; }
    g2.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const stars = new THREE.Points(g2, new THREE.PointsMaterial({ color: 0xF2EDE4, size: 0.05 }));
    scene.add(stars);

    let last = Date.now(), sinceScore = 0, flash = 0;
    const render = () => {
      requestAnimationFrame(render);
      const now = Date.now(); const dt = Math.min((now - last) / 1000, 0.04); last = now;

      if (runRef.current && !endedRef.current) {
        if (tapRef.current) {
          tapRef.current = false;
          vel.current.y = UP;
          vel.current.x += (pos.current.x > 0 ? -1 : 1) * (0.6 + Math.random() * 1.4); // nudge toward center
          flash = 1;
          scoreRef.current += 1; setScore(scoreRef.current); onScore?.(scoreRef.current);
        }
        vel.current.y -= G * dt;
        pos.current.x += vel.current.x * dt;
        pos.current.y += vel.current.y * dt;
        // walls
        if (pos.current.x < -WALL) { pos.current.x = -WALL; vel.current.x = Math.abs(vel.current.x) * 0.8; }
        if (pos.current.x >  WALL) { pos.current.x =  WALL; vel.current.x = -Math.abs(vel.current.x) * 0.8; }
        // survival score (slow trickle)
        sinceScore += dt; if (sinceScore > 0.5) { sinceScore = 0; scoreRef.current += 1; setScore(scoreRef.current); onScore?.(scoreRef.current); }
        // fell
        if (pos.current.y < FLOOR + R) { ball.position.set(pos.current.x, FLOOR + R, 0); end(); }
      }

      ball.position.set(pos.current.x, pos.current.y, 0);
      flash = Math.max(0, flash - dt * 3);
      ball.material.emissiveIntensity = 0.55 + flash * 1.2;
      const sc = 1 + flash * 0.25; ball.scale.set(sc, sc, sc);
      ball.rotation.x += dt * 2; ball.rotation.y += dt * 1.5;
      stars.rotation.z += dt * 0.03;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0008' }}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
      <Pressable style={StyleSheet.absoluteFill} onPressIn={() => { if (runRef.current) tapRef.current = true; }} />
      <View style={s.hud} pointerEvents="none"><Text style={s.hudVal}>{score}</Text></View>
      {countdown > 0 && (
        <View style={s.cd} pointerEvents="none">
          <Text style={s.cdNum}>{countdown}</Text>
          <Text style={s.cdSub}>tap to keep it bouncing</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hud: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 38, left: 0, right: 0, alignItems: 'center' },
  hudVal: { fontFamily: fonts.serif, fontSize: 40, color: '#fff' },
  cd: { position: 'absolute', alignSelf: 'center', top: height * 0.4, alignItems: 'center' },
  cdNum: { fontFamily: fonts.serif, fontSize: 70, color: '#fff' },
  cdSub: { fontSize: 12, color: 'rgba(242,237,228,0.6)', textTransform: 'lowercase', letterSpacing: 1, marginTop: 6 },
});
