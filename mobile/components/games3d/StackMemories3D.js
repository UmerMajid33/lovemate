// components/games3d/StackMemories3D.js
// 3D brick-stacking tower (Three.js + expo-gl). A brick slides side-to-side;
// tap to drop. Overlap is kept, the overhang is sliced off (next brick is
// narrower). Miss entirely = game over. Camera rises with the tower.
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { colors, fonts } from '../../theme/theme.js';

const { height } = Dimensions.get('window');
const BH = 0.55;                 // brick height (world units)
const BD = 2.2;                  // brick depth
const BASE_W = 3.0;              // starting brick width
const BRICKS = [0xb5532f, 0xc8643a, 0x9c4527, 0xd17a4a]; // terracotta tones

export default function StackMemories3D({ onComplete, onScore }) {
  const [score, setScore]   = useState(0);
  const [combo, setCombo]   = useState(1);
  const [countdown, setCnt] = useState(3);

  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const perfectRef = useRef(0);
  const runRef = useRef(false);
  const endedRef = useRef(false);

  // tower model (world space). y of brick i = i*BH. x/w vary.
  const stack = useRef([{ x: 0, w: BASE_W }]);
  const moving = useRef({ x: -3, w: BASE_W, dir: 1, speed: 2.4 });
  const dropReq = useRef(false);     // tap → request a drop, consumed by loop
  const meshes = useRef([]);         // three meshes for placed bricks
  const movingMesh = useRef(null);
  const sceneRef = useRef(null);
  const camRef = useRef(null);

  const end = () => {
    if (endedRef.current) return;
    endedRef.current = true; runRef.current = false;
    setTimeout(() => onComplete?.(scoreRef.current), 600);
  };

  useEffect(() => {
    let c = 3;
    const cd = setInterval(() => { c--; setCnt(c); if (c <= 0) { clearInterval(cd); runRef.current = true; } }, 800);
    return () => { clearInterval(cd); runRef.current = false; };
  }, []);

  const makeBrick = (x, w, i, scene) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, BH, BD),
      new THREE.MeshStandardMaterial({ color: BRICKS[i % BRICKS.length], roughness: 0.75, metalness: 0.05 })
    );
    m.position.set(x, i * BH, 0);
    scene.add(m);
    return m;
  };

  // perform a drop (called from the GL loop on tap)
  const doDrop = (scene) => {
    const top = stack.current[stack.current.length - 1];
    const mv = moving.current;
    const left = Math.max(mv.x - mv.w / 2, top.x - top.w / 2);
    const right = Math.min(mv.x + mv.w / 2, top.x + top.w / 2);
    const newW = right - left;
    if (newW <= 0.12) { end(); return; }
    const perfect = Math.abs(mv.x - top.x) < 0.12;
    perfectRef.current = perfect ? perfectRef.current + 1 : 0;
    const placedX = perfect ? top.x : (left + right) / 2;
    const placedW = perfect ? top.w : newW;
    const i = stack.current.length;
    stack.current.push({ x: placedX, w: placedW });
    meshes.current.push(makeBrick(placedX, placedW, i, scene));

    if (perfectRef.current >= 3) { comboRef.current = Math.min(5, comboRef.current + 1); setCombo(comboRef.current); perfectRef.current = 0; }
    scoreRef.current += Math.round(10 * comboRef.current);
    if (i % 10 === 0) scoreRef.current += 150;
    setScore(scoreRef.current); onScore?.(scoreRef.current);

    // next moving brick — alternate side, a touch faster
    moving.current = { x: (i % 2 ? 3.2 : -3.2), w: placedW, dir: i % 2 ? -1 : 1, speed: 2.4 + i * 0.06 };
  };

  const onContextCreate = (gl) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x07060f, 1);
    const scene = new THREE.Scene(); sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(55, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    camera.position.set(5, 4, 7); camRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(5, 10, 7); scene.add(key);
    const rose = new THREE.PointLight(0xE0506E, 0.8); rose.position.set(-5, 3, 4); scene.add(rose);

    // base brick
    meshes.current = [makeBrick(0, BASE_W, 0, scene)];
    movingMesh.current = new THREE.Mesh(
      new THREE.BoxGeometry(BASE_W, BH, BD),
      new THREE.MeshStandardMaterial({ color: 0xf0a060, emissive: 0x3a1a0a, roughness: 0.6 })
    );
    scene.add(movingMesh.current);

    let last = Date.now();
    const render = () => {
      if (endedRef.current) { renderer.render(scene, camera); gl.endFrameEXP(); return; }
      requestAnimationFrame(render);
      const now = Date.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const topI = stack.current.length;       // moving brick sits one above top
      const mv = moving.current;

      if (runRef.current) {
        mv.x += mv.dir * mv.speed * dt;
        if (mv.x > 3.4) { mv.x = 3.4; mv.dir = -1; }
        if (mv.x < -3.4) { mv.x = -3.4; mv.dir = 1; }
        if (dropReq.current) { dropReq.current = false; doDrop(scene); }
      }
      // position moving brick
      const top = stack.current[stack.current.length - 1];
      movingMesh.current.geometry.dispose();
      movingMesh.current.geometry = new THREE.BoxGeometry(top.w, BH, BD);
      movingMesh.current.position.set(mv.x, topI * BH, 0);
      movingMesh.current.visible = runRef.current && !endedRef.current;

      // camera follows tower height, orbits gently
      const towerY = topI * BH;
      const targetCamY = towerY + 3;
      camera.position.y += (targetCamY - camera.position.y) * Math.min(1, dt * 3);
      const a = now / 4000;
      camera.position.x = Math.cos(a) * 6.5;
      camera.position.z = Math.sin(a) * 6.5;
      camera.lookAt(0, towerY - 1.2, 0);

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#07060f' }}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
      <Pressable style={StyleSheet.absoluteFill} onPressIn={() => { if (runRef.current) dropReq.current = true; }} />

      <View style={s.hud} pointerEvents="none">
        <Text style={s.hudVal}>{score}</Text>
        {combo > 1 && <Text style={s.combo}>{combo}× combo</Text>}
        <Text style={s.tower}>tower {stack.current.length - 1}</Text>
      </View>

      {countdown > 0 && (
        <View style={s.cd} pointerEvents="none">
          <Text style={s.cdNum}>{countdown}</Text>
          <Text style={s.cdSub}>tap to drop — stack them straight</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hud: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 38, left: 0, right: 0, alignItems: 'center' },
  hudVal: { fontFamily: fonts.serif, fontSize: 40, color: '#fff' },
  combo: { fontSize: 13, color: colors.gold, fontWeight: '800', textTransform: 'lowercase', marginTop: 2 },
  tower: { fontSize: 11, color: 'rgba(242,237,228,0.5)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 },
  cd: { position: 'absolute', alignSelf: 'center', top: height * 0.4, alignItems: 'center' },
  cdNum: { fontFamily: fonts.serif, fontSize: 70, color: '#fff' },
  cdSub: { fontSize: 12, color: 'rgba(242,237,228,0.6)', textTransform: 'lowercase', letterSpacing: 1, marginTop: 6 },
});
