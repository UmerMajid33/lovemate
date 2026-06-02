import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Animated, StatusBar, SafeAreaView, ScrollView, Modal, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path, Circle, Rect, Polygon, Defs, RadialGradient,
  LinearGradient as SvgLG, Stop, G, Ellipse
} from 'react-native-svg';
import { API_BASE } from '../utils/api.js';

const { width } = Dimensions.get('window');

// ─── Local Catalog (mirrors server price metrics) ────────────────────────────
const CATALOG = [
  { id: 'gift_rose',      name: 'rose bouquet',  price: 3000,  cat: 'gift',  desc: 'a classic — always the right choice' },
  { id: 'gift_chocolate', name: 'chocolate box', price: 1500,  cat: 'gift',  desc: 'sweet, just like them' },
  { id: 'gift_star',      name: 'shooting star', price: 6000,  cat: 'gift',  desc: 'make a wish together' },
  { id: 'gift_balloon',   name: 'heart balloon', price: 4000,  cat: 'gift',  desc: 'light, fun, and full of love' },
  { id: 'gift_teddy',     name: 'teddy bear',    price: 12000, cat: 'gift',  desc: 'something to hold when far apart' },
  { id: 'gift_diamond',   name: 'diamond gem',   price: 50000, cat: 'gift',  desc: 'the rarest gift — for the rarest person' },
  { id: 'badge_flame',    name: 'flame badge',   price: 8000,  cat: 'badge', desc: 'wear it on your profile' },
  { id: 'badge_crown',    name: 'crown badge',   price: 25000, cat: 'badge', desc: 'you were always royalty' },
  { id: 'badge_lucky',    name: 'lucky charm',   price: 2000,  cat: 'badge', desc: 'good things happen when you\'re together' },
  { id: 'stamp_love',     name: 'love stamp',    price: 1000,  cat: 'stamp', desc: 'seal every letter with this' },
];

const CAT_COLORS = { gift: '#ff4d6d', badge: '#a855f7', stamp: '#0ea5e9' };

// Rarity tier drivers for cards & border glows
function rarityOf(price) {
  if (price >= 20000) return { key: 'legendary', color: '#fbbf24', glow: 'rgba(251,191,36,0.22)' };
  if (price >= 6000)  return { key: 'epic',      color: '#c084fc', glow: 'rgba(192,132,252,0.18)' };
  if (price >= 2500)  return { key: 'rare',       color: '#22d3ee', glow: 'rgba(34,211,238,0.16)' };
  return                     { key: 'common',    color: '#94a3b8', glow: 'rgba(148,163,184,0.12)' };
}

const fmt = (n) => n.toLocaleString();

// ─── FC Coin Icon ─────────────────────────────────────────────────────────────
function Coin({ size = 14 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <RadialGradient id="coinGrad" cx="38%" cy="32%" r="70%">
          <Stop offset="0" stopColor="#fff7d6" />
          <Stop offset="0.5" stopColor="#fcd34d" />
          <Stop offset="1" stopColor="#b45309" />
        </RadialGradient>
      </Defs>
      <Circle cx="12" cy="12" r="10" fill="url(#coinGrad)" stroke="#fde68a" strokeWidth="0.8" />
      <Path d="M12 7v10M9 10h6M9 13h6" stroke="#7c2d12" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

// ─── 3D Specular SVG Illustrations (Real Product Simulation) ──────────────────
function ProductImage({ itemId, color, size = 90 }) {
  // Common radial definitions to avoid duplicate tags
  const renderRose = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="petalGlow" cx="35%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#ff758f" />
          <Stop offset="55%" stopColor="#ff4d6d" />
          <Stop offset="100%" stopColor="#800020" />
        </RadialGradient>
        <SvgLG id="stemGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#4ade80" />
          <Stop offset="100%" stopColor="#166534" />
        </SvgLG>
      </Defs>
      {/* 3D stem */}
      <Path d="M 50,55 L 50,88 C 50,92 53,92 53,88" stroke="url(#stemGrad)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <Path d="M 50,68 C 38,68 34,60 42,56" fill="url(#stemGrad)" />
      <Path d="M 50,75 C 62,75 66,67 58,63" fill="url(#stemGrad)" />
      {/* Overlapping rose petals */}
      <Circle cx="50" cy="40" r="22" fill="url(#petalGlow)" />
      <Ellipse cx="50" cy="46" rx="20" ry="14" fill="#c9184a" opacity="0.9" />
      <Path d="M 32,32 C 40,20 60,20 68,32 C 72,42 62,54 50,54 C 38,54 28,42 32,32 Z" fill="url(#petalGlow)" />
      <Ellipse cx="50" cy="36" rx="12" ry="8" fill="#ff758f" opacity="0.95" />
      <Circle cx="50" cy="34" r="5" fill="#ffffff" opacity="0.85" />
      {/* Sparkles */}
      <Circle cx="72" cy="24" r="1.5" fill="#fff" opacity="0.9" />
      <Circle cx="26" cy="56" r="1" fill="#fff" opacity="0.8" />
    </Svg>
  );

  const renderChocolate = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="boxGrad" cx="35%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#7c2d12" />
          <Stop offset="100%" stopColor="#3b0764" />
        </RadialGradient>
        <RadialGradient id="chocSph" cx="40%" cy="35%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#ea580c" />
          <Stop offset="60%" stopColor="#7c2d12" />
          <Stop offset="100%" stopColor="#431407" />
        </RadialGradient>
        <SvgLG id="goldFoil" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#fef3c7" />
          <Stop offset="50%" stopColor="#d97706" />
          <Stop offset="100%" stopColor="#78350f" />
        </SvgLG>
      </Defs>
      {/* 3D Open chocolate box */}
      <Rect x="20" y="24" width="60" height="52" rx="10" fill="url(#boxGrad)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <Rect x="22" y="26" width="56" height="48" rx="8" fill="#1e1b4b" />
      {/* Individual premium chocolates inside foil cups */}
      {/* Praline 1 */}
      <Path d="M 30,46 Q 30,34 42,34 Q 54,34 54,46 Z" fill="url(#goldFoil)" />
      <Circle cx="42" cy="42" r="7" fill="url(#chocSph)" />
      <Path d="M 40,39 A 2 2 0 0 1 44 39" stroke="#fff" strokeWidth="1" opacity="0.5" />
      {/* Praline 2 */}
      <Path d="M 46,62 Q 46,50 58,50 Q 70,50 70,62 Z" fill="url(#goldFoil)" />
      <Circle cx="58" cy="58" r="7" fill="url(#chocSph)" />
      <Path d="M 56,55 A 2 2 0 0 1 60 55" stroke="#fff" strokeWidth="1" opacity="0.5" />
      {/* Praline 3 */}
      <Path d="M 32,60 M 34,58 M 38,58" fill="none" />
      {/* Elegant lid behind the box */}
      <Rect x="35" y="12" width="52" height="44" rx="8" fill="url(#boxGrad)" opacity="0.8" transform="rotate(8, 35, 12)" />
    </Svg>
  );

  const renderStar = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="starGlow" cx="45%" cy="40%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="45%" stopColor="#fbbf24" />
          <Stop offset="100%" stopColor="#d97706" />
        </RadialGradient>
        <SvgLG id="starTail" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor="rgba(251,191,36,0)" />
          <Stop offset="65%" stopColor="rgba(251,191,36,0.3)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0.9)" />
        </SvgLG>
      </Defs>
      {/* 3D Sweeping tail light paths */}
      <Path d="M 12,88 Q 42,76 60,54 L 46,44 Q 30,68 12,88 Z" fill="url(#starTail)" />
      <Path d="M 18,92 Q 46,78 68,48 L 52,38 Q 32,72 18,92 Z" fill="url(#starTail)" opacity="0.6" />
      {/* Specular Shooting Star Faceted Geometry */}
      <G transform="translate(48, 22) scale(1.15)">
        <Polygon points="16,2 21,12 32,13.5 24,21 26,32 16,26.5 6,32 8,21 0,13.5 11,12" fill="url(#starGlow)" />
        {/* Specular facets */}
        <Polygon points="16,2 16,26.5 21,12" fill="rgba(255,255,255,0.4)" />
        <Polygon points="16,2 16,26.5 11,12" fill="rgba(0,0,0,0.15)" />
        <Polygon points="32,13.5 16,26.5 24,21" fill="rgba(255,255,255,0.3)" />
        <Polygon points="0,13.5 16,26.5 8,21" fill="rgba(0,0,0,0.2)" />
        <Polygon points="26,32 16,26.5 24,21" fill="rgba(255,255,255,0.2)" />
      </G>
    </Svg>
  );

  const renderBalloon = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="balloonSph" cx="30%" cy="30%" rx="65%" ry="65%">
          <Stop offset="0%" stopColor="#ff85a1" stopOpacity="0.95" />
          <Stop offset="55%" stopColor="#ff4d6d" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#a4133c" stopOpacity="0.9" />
        </RadialGradient>
        <RadialGradient id="glareGrad" cx="30%" cy="30%" rx="30%" ry="30%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Dangling string path */}
      <Path d="M 50,68 C 45,78 55,84 48,92" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" fill="none" />
      {/* 3D Heart Balloon Core */}
      <G transform="translate(18, 14) scale(2.8)">
        <Path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="url(#balloonSph)"
        />
        {/* Specular glare */}
        <Ellipse cx="7.5" cy="7" rx="3.5" ry="2.2" fill="url(#glareGrad)" transform="rotate(-30, 7.5, 7)" />
      </G>
      {/* Knot */}
      <Polygon points="46,65 54,65 50,58" fill="#a4133c" />
    </Svg>
  );

  const renderTeddy = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="teddyPlush" cx="35%" cy="35%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#d2b48c" />
          <Stop offset="65%" stopColor="#8b5a2b" />
          <Stop offset="100%" stopColor="#5c3a21" />
        </RadialGradient>
        <RadialGradient id="teddyLight" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#ffeedd" />
          <Stop offset="100%" stopColor="#d2b48c" />
        </RadialGradient>
      </Defs>
      {/* Ears */}
      <Circle cx="32" cy="28" r="10" fill="url(#teddyPlush)" />
      <Circle cx="32" cy="28" r="6" fill="url(#teddyLight)" />
      <Circle cx="68" cy="28" r="10" fill="url(#teddyPlush)" />
      <Circle cx="68" cy="28" r="6" fill="url(#teddyLight)" />
      {/* Head */}
      <Circle cx="50" cy="38" r="22" fill="url(#teddyPlush)" />
      {/* Muzzle */}
      <Ellipse cx="50" cy="44" rx="9" ry="7" fill="url(#teddyLight)" />
      <Polygon points="47,40 53,40 50,44" fill="#000" />
      <Path d="M 50,44 L 50,47" stroke="#000" strokeWidth="1" />
      {/* Eyes */}
      <Circle cx="42" cy="35" r="2.8" fill="#000" />
      <Circle cx="41" cy="34" r="0.8" fill="#fff" />
      <Circle cx="58" cy="35" r="2.8" fill="#000" />
      <Circle cx="57" cy="34" r="0.8" fill="#fff" />
      {/* Body */}
      <Ellipse cx="50" cy="68" rx="20" ry="18" fill="url(#teddyPlush)" />
      {/* Stitching Line / Heart Badge on Chest */}
      <G transform="translate(42, 60) scale(0.68)">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ff4d6d" />
        <Ellipse cx="7.5" cy="7" rx="3.5" ry="2.2" fill="rgba(255,255,255,0.4)" transform="rotate(-30, 7.5, 7)" />
      </G>
    </Svg>
  );

  const renderDiamond = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="diaSpot" cx="40%" cy="35%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <Stop offset="45%" stopColor="#67e8f9" stopOpacity="0.9" />
          <Stop offset="75%" stopColor="#0ea5e9" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
        </RadialGradient>
      </Defs>
      {/* Outer 3D Geometric Facets */}
      <Polygon points="50,86 16,36 28,14 72,14 84,36" fill="url(#diaSpot)" />
      {/* Crown reflections */}
      <Polygon points="28,14 50,14 50,36 16,36" fill="rgba(255,255,255,0.35)" />
      <Polygon points="72,14 50,14 50,36 84,36" fill="rgba(255,255,255,0.15)" />
      {/* Table reflections */}
      <Polygon points="36,22 64,22 72,14 28,14" fill="rgba(255,255,255,0.45)" />
      {/* Pavilion facets */}
      <Polygon points="50,86 50,36 16,36" fill="rgba(0,0,0,0.18)" />
      <Polygon points="50,86 50,36 84,36" fill="rgba(255,255,255,0.2)" />
      {/* Sparkles */}
      <Polygon points="72,28 75,34 81,34 76,37 78,43 72,39 66,43 68,37 63,34 69,34" fill="#ffffff" opacity="0.9" />
    </Svg>
  );

  const renderFlame = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="flameInner" cx="50%" cy="60%" rx="40%" ry="45%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="40%" stopColor="#fef08a" />
          <Stop offset="70%" stopColor="#f97316" />
          <Stop offset="100%" stopColor="#b91c1c" />
        </RadialGradient>
      </Defs>
      {/* 3D Multi-Layered Flame Vector */}
      <Path
        d="M 50,12 C 50,12 66,32 66,54 C 66,68 58,78 50,78 C 42,78 34,68 34,54 C 34,32 50,12 50,12 Z"
        fill="url(#flameInner)"
      />
      <Path
        d="M 50,32 C 50,32 60,45 60,60 C 60,70 55,76 50,76 C 45,76 40,70 40,60 C 40,45 50,32 50,32 Z"
        fill="#fef08a"
        opacity="0.9"
      />
      <Path d="M 50,44 Q 53,52 50,66 Q 47,52 50,44 Z" fill="#ffffff" />
      {/* Coals under flame */}
      <Rect x="30" y="74" width="40" height="8" rx="4" fill="rgba(0,0,0,0.5)" />
    </Svg>
  );

  const renderCrown = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="goldGlint" cx="35%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#ffd700" />
          <Stop offset="70%" stopColor="#b8860b" />
          <Stop offset="100%" stopColor="#8b6508" />
        </RadialGradient>
        <RadialGradient id="rubyGlow" cx="40%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#ff758f" />
          <Stop offset="100%" stopColor="#c9184a" />
        </RadialGradient>
      </Defs>
      {/* Crown base */}
      <Path d="M 22,72 L 78,72 L 82,58 L 68,64 L 50,36 L 32,64 L 18,58 Z" fill="url(#goldGlint)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <Rect x="25" y="68" width="50" height="8" rx="2" fill="#8b6508" />
      {/* Jewel highlights */}
      <Circle cx="32" cy="62" r="3.2" fill="url(#rubyGlow)" />
      <Circle cx="50" cy="58" r="3.5" fill="#22d3ee" />
      <Circle cx="68" cy="62" r="3.2" fill="url(#rubyGlow)" />
      {/* Tips circles */}
      <Circle cx="18" cy="58" r="3" fill="#ffffff" />
      <Circle cx="50" cy="36" r="4.5" fill="url(#rubyGlow)" />
      <Circle cx="82" cy="58" r="3" fill="#ffffff" />
    </Svg>
  );

  const renderLucky = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="leafGrad" cx="35%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#4ade80" />
          <Stop offset="70%" stopColor="#15803d" />
          <Stop offset="100%" stopColor="#064e3b" />
        </RadialGradient>
      </Defs>
      {/* Stem */}
      <Path d="M 50,56 C 52,68 62,82 58,86 C 55,89 48,82 48,72" stroke="#15803d" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* Four Heart Leaves */}
      {/* Top leaf */}
      <G transform="translate(50, 42) rotate(0) translate(-12, -12) scale(1)">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#leafGrad)" />
      </G>
      {/* Right leaf */}
      <G transform="translate(62, 52) rotate(90) translate(-12, -12) scale(1)">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#leafGrad)" />
      </G>
      {/* Bottom leaf */}
      <G transform="translate(50, 62) rotate(180) translate(-12, -12) scale(1)">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#leafGrad)" />
      </G>
      {/* Left leaf */}
      <G transform="translate(38, 52) rotate(270) translate(-12, -12) scale(1)">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#leafGrad)" />
      </G>
    </Svg>
  );

  const renderStamp = () => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="stampGlow" cx="40%" cy="35%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#e0f2fe" />
          <Stop offset="100%" stopColor="#bae6fd" />
        </RadialGradient>
        <RadialGradient id="waxSeal" cx="40%" cy="40%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#ff758f" />
          <Stop offset="100%" stopColor="#c9184a" />
        </RadialGradient>
      </Defs>
      {/* Stamped edge frame card */}
      <Rect x="20" y="20" width="60" height="60" rx="3" fill="url(#stampGlow)" stroke="#0ea5e9" strokeWidth="3" strokeDasharray="4 4" />
      {/* Inner wax seal circle */}
      <Circle cx="50" cy="50" r="16" fill="url(#waxSeal)" />
      <G transform="translate(42, 42) scale(0.66)">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ffffff" />
      </G>
    </Svg>
  );

  const renders = {
    gift_rose: renderRose,
    gift_chocolate: renderChocolate,
    gift_star: renderStar,
    gift_balloon: renderBalloon,
    gift_teddy: renderTeddy,
    gift_diamond: renderDiamond,
    badge_flame: renderFlame,
    badge_crown: renderCrown,
    badge_lucky: renderLucky,
    stamp_love: renderStamp,
  };

  const Render = renders[itemId];
  return (
    <View style={st.pedestalCanvasInner}>
      <LinearGradient colors={[`${color}28`, `${color}06`]} style={st.imgFrameShadow}>
        {Render ? Render() : (
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="30" fill="rgba(255,255,255,0.06)" />
          </Svg>
        )}
      </LinearGradient>
    </View>
  );
}

// ─── Glowing Pedestal Display for Confirm Modal ──────────────────────────────
function Pedestal({ id, color, size = 78 }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ width: size, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
      {/* 3D spinning orbit background */}
      <Animated.View style={{ position: 'absolute', transform: [{ rotate: rot }] }}>
        <Svg width={size + 24} height={size + 24} viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r="50" fill="none" stroke={`${color}30`} strokeWidth="1" strokeDasharray="4 8" />
        </Svg>
      </Animated.View>

      {/* soft glowing pedestal backdrop */}
      <View style={[st.pedestalBackdrop, { backgroundColor: color }]} />
      <LinearGradient colors={[`${color}45`, 'rgba(255,255,255,0.02)']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={[st.pedestalGlowFrame, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2, borderColor: `${color}55` }]}>
        
        {/* specular spotlight reflection */}
        <View style={[st.pedestalHighlight, { left: size * 0.22, width: size * 0.32, height: size * 0.16 }]} />
        <ProductImage itemId={id} color={color} size={size * 0.8} />
      </LinearGradient>
      {/* stars */}
      <Text style={[st.pedestalStar, { top: -2, right: 4 }]}>✦</Text>
      <Text style={[st.pedestalStar, { bottom: 6, left: 2, opacity: 0.5 }]}>✦</Text>
    </View>
  );
}

// ─── Purchase Confirmation Modal ──────────────────────────────────────────────
function ConfirmModal({ item, mode, balance, partnerName, onConfirm, onClose }) {
  const canAfford = balance >= (item?.price || 0);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (!item) return;
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [item]);

  if (!item) return null;
  const accentColor = CAT_COLORS[item.cat] || '#ff4d6d';
  const rar = rarityOf(item.price);

  return (
    <Modal visible={!!item} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[st.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View style={[st.modalSheet, { transform: [{ translateY: slideAnim }], borderColor: `${rar.color}45` }]}>
          <View style={[st.rarPill, { backgroundColor: `${rar.color}18`, borderColor: `${rar.color}45`, alignSelf: 'center', marginBottom: 16 }]}>
            <Text style={[st.rarTxt, { color: rar.color }]}>{rar.key}</Text>
          </View>
          <View style={{ alignSelf: 'center', marginBottom: 20, shadowColor: rar.color, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24 }}>
            <Pedestal id={item.id} color={accentColor} size={110} />
          </View>

          <Text style={st.confirmName}>{item.name}</Text>
          <Text style={st.confirmDesc}>{item.desc}</Text>

          {mode === 'gift' && (
            <View style={st.confirmGiftLabel}>
              <Text style={st.confirmGiftText}>gifting to {partnerName || 'your partner'}</Text>
            </View>
          )}

          <View style={st.confirmPriceRow}>
            <Coin size={18} />
            <Text style={st.confirmPrice}>{fmt(item.price)}</Text>
            <Text style={st.confirmBalance}>· you have {fmt(balance)}</Text>
          </View>

          {!canAfford && (
            <Text style={st.confirmPoor}>not enough FC — play more games to earn!</Text>
          )}

          <View style={{ gap: 10, marginTop: 22, width: '100%' }}>
            <TouchableOpacity onPress={() => canAfford && onConfirm(item, mode)} disabled={!canAfford}
              style={[st.confirmBtn, !canAfford && { opacity: 0.35 }]}>
              <LinearGradient colors={[accentColor, `${accentColor}bb`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={st.confirmBtnGrad}>
                <Text style={st.confirmBtnText}>{mode === 'gift' ? 'send gift' : 'buy for me'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}
              style={{ height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, fontWeight: '700', textTransform: 'lowercase' }}>cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Premium Glassmorphic Emporium Product Card ──────────────────────────────
function ShopItem({ item, onBuy, onGift, affordable }) {
  const ac  = CAT_COLORS[item.cat] || '#ff4d6d';
  const rar = rarityOf(item.price);
  const pressScale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[st.itemCard, { borderColor: `${rar.color}35`, shadowColor: rar.glow, transform: [{ scale: pressScale }] }]}>
      <LinearGradient colors={[`${rar.color}0a`, 'rgba(12,11,22,0.98)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.itemGrad}>
        {/* rarity crown badge */}
        <View style={[st.rarityBadge, { backgroundColor: `${rar.color}1f`, borderColor: rar.color }]}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: rar.color, textTransform: 'uppercase', letterSpacing: 1.2 }}>{rar.key}</Text>
        </View>

        {/* horizontal flex emporium layout */}
        <View style={{ flexDirection: 'row', alignItems: 'stretch', minHeight: 120 }}>
          {/* product 3D specular image */}
          <View style={st.productImage}>
            <ProductImage itemId={item.id} color={ac} size={88} />
          </View>

          {/* details layout */}
          <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
            <View>
              <Text style={st.itemName}>{item.name}</Text>
              <Text style={st.itemDesc} numberOfLines={2}>{item.desc}</Text>
            </View>

            {/* Price tag & Compact glass buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={[st.priceTagHorizontal, { backgroundColor: `${rar.color}12`, borderColor: `${rar.color}45` }]}>
                <Coin size={15} />
                <Text style={[st.itemPrice, { color: rar.color }]}>{fmt(item.price)}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => onBuy(item)} activeOpacity={0.8} style={[st.btnCompact, { borderColor: `${ac}55` }]}>
                  <Text style={[st.btnCompactTxt, { color: ac }]}>own</Text>
                </TouchableOpacity>
                {item.cat === 'gift' && (
                  <TouchableOpacity onPress={() => onGift(item)} activeOpacity={0.85} style={[st.btnCompact, { backgroundColor: ac, borderColor: ac }]}>
                    <Text style={[st.btnCompactTxt, { color: '#fff' }]}>gift</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Main Shop Screen Component ──────────────────────────────────────────────
export default function ShopScreen({ onNavigate, params = {} }) {
  const { linkCode = '', role = 'creator', user = {} } = params;

  const [balance,     setBalance]     = useState(0);
  const [partnerName, setPartnerName] = useState('');
  const [inventory,   setInventory]   = useState([]);
  const [confirmItem, setConfirmItem] = useState(null);
  const [confirmMode, setConfirmMode] = useState('buy');
  const [toast,       setToast]       = useState('');
  const [tab,         setTab]         = useState('shop');

  useEffect(() => {
    (async () => {
      try {
        const [w, presence, inv] = await Promise.all([
          fetch(`${API_BASE}/api/wallet/${linkCode}/${role}`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/api/home/presence/${linkCode}`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/api/shop/inventory/${linkCode}/${role}`).then(r => r.json()).catch(() => null),
        ]);
        if (w)        setBalance(w.balance || 0);
        if (presence) {
          const pr = role === 'creator' ? presence.joiner : presence.creator;
          setPartnerName(pr?.name || '');
        }
        if (inv) setInventory(inv.items || []);
      } catch (_) {}
    })();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleConfirm = async (item, mode) => {
    setConfirmItem(null);
    try {
      const endpoint = mode === 'gift' ? '/api/shop/gift' : '/api/shop/buy';
      const body     = mode === 'gift'
        ? { linkcode: linkCode, fromrole: role, itemid: item.id }
        : { linkcode: linkCode, role, name: user?.name || '', itemid: item.id };

      const res  = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setBalance(data.newbalance);
        showToast(mode === 'gift' ? `gift sent to ${partnerName || 'partner'}!` : `${item.name} added to your collection!`);
        if (mode === 'buy') {
          setInventory(prev => [{ itemid: item.id, itemname: item.name, source: 'purchased', acquiredat: new Date().toISOString() }, ...prev]);
        }
      } else {
        showToast(data.error || 'something went wrong');
      }
    } catch (_) {
      showToast('could not reach server');
    }
  };

  const catFilter = (cat) => CATALOG.filter(i => i.cat === cat);
  const openBuy  = (item) => { setConfirmMode('buy');  setConfirmItem(item); };
  const openGift = (item) => { setConfirmMode('gift'); setConfirmItem(item); };

  const renderItemIcon = (id, size, color) => (
    <View style={[st.pedestalGlowFrame, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderColor: `${color}35` }]}>
      <ProductImage itemId={id} color={color} size={size} />
    </View>
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#07060f" />
      <LinearGradient colors={['#0b0716', '#0e0a1e', '#07060f']} style={StyleSheet.absoluteFill} />
      <View style={[st.blob, { top: -80, right: -60, backgroundColor: '#fbbf24' }]} pointerEvents="none" />
      <View style={[st.blob, { top: 200, left: -90, backgroundColor: '#ff4d6d' }]} pointerEvents="none" />

      {/* Header Row */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => onNavigate('castle', params)} style={st.backBtn} activeOpacity={0.75}>
          <Text style={st.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={st.headerTitle}>gift shop</Text>
          <Text style={st.headerSub}>treat {partnerName || 'your partner'} · or yourself</Text>
        </View>
        <LinearGradient colors={['rgba(251,191,36,0.22)', 'rgba(251,191,36,0.08)']} style={st.fcBadge}>
          <Coin size={15} />
          <Text style={st.fcText}>{fmt(balance)}</Text>
        </LinearGradient>
      </View>

      {/* Premium Tab Selectors */}
      <View style={st.tabs}>
        {['shop', 'inventory'].map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={st.tab} activeOpacity={0.75}>
            <Text style={[st.tabText, tab === t && { color: '#ff4d6d' }]}>{t}</Text>
            {tab === t && <View style={st.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'shop' ? (
          <>
            <View style={st.sectionHead}>
              <Text style={st.sectionLabel}>gifts for {partnerName || 'partner'}</Text>
              <Text style={st.sectionCount}>{catFilter('gift').length}</Text>
            </View>
            <View style={st.list}>
              {catFilter('gift').map(item => (
                <ShopItem key={item.id} item={item} affordable={balance >= item.price} onBuy={openBuy} onGift={openGift} />
              ))}
            </View>

            <View style={[st.sectionHead, { marginTop: 26 }]}>
              <Text style={st.sectionLabel}>for yourself</Text>
              <Text style={st.sectionCount}>{catFilter('badge').length + catFilter('stamp').length}</Text>
            </View>
            <View style={st.list}>
              {[...catFilter('badge'), ...catFilter('stamp')].map(item => (
                <ShopItem key={item.id} item={item} affordable={balance >= item.price} onBuy={openBuy} onGift={openGift} />
              ))}
            </View>
          </>
        ) : (
          /* Inventory Screen Tab */
          <View style={{ width: '100%', paddingBottom: 40 }}>
            {inventory.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', textTransform: 'lowercase' }}>nothing here yet</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', marginTop: 6, textTransform: 'lowercase', textAlign: 'center', maxWidth: 240 }}>
                  play games to earn FC, then spend it in the shop
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {inventory.map((item, i) => {
                  const catalogItem = CATALOG.find(c => c.id === item.itemid);
                  const ac = CAT_COLORS[catalogItem?.cat] || '#ff4d6d';
                  return (
                    <LinearGradient key={i} colors={[`${ac}0e`, 'rgba(10,10,20,0.98)']}
                      style={[st.invRow, { borderColor: `${ac}25` }]}>
                      <View style={[st.invIcon, { backgroundColor: `${ac}0a`, borderColor: `${ac}30` }]}>
                        {renderItemIcon(item.itemid, 24, ac)}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.invName}>{item.itemname}</Text>
                        <Text style={[st.invSource, { color: item.source === 'gifted' ? '#ff9ec7' : 'rgba(255,255,255,0.25)' }]}>
                          {item.source === 'gifted' ? `gifted by partner` : 'purchased'}
                        </Text>
                      </View>
                    </LinearGradient>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Alert toast notifications */}
      {!!toast && (<View style={st.toast}><Text style={st.toastText}>{toast}</Text></View>)}

      <ConfirmModal
        item={confirmItem} mode={confirmMode}
        balance={balance} partnerName={partnerName}
        onConfirm={handleConfirm}
        onClose={() => setConfirmItem(null)}
      />
    </SafeAreaView>
  );
}

// ─── Design System & Styles ───────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07060f' },
  blob: { position: 'absolute', width: 230, height: 230, borderRadius: 115, opacity: 0.12 },
  scroll: { alignItems: 'center', paddingHorizontal: 18, paddingBottom: 120 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', marginTop: 2 },
  backBtn:     { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 19, color: '#fff', fontWeight: '800', marginTop: -2 },
  fcBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.2, borderColor: 'rgba(251,191,36,0.35)', paddingHorizontal: 13, height: 42, borderRadius: 14 },
  fcText:      { fontSize: 14, color: '#fde68a', fontWeight: '900' },

  tabs:     { flexDirection: 'row', paddingHorizontal: 18, marginBottom: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tab:      { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabText:  { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 0.4 },
  tabLine:  { position: 'absolute', bottom: 0, left: 24, right: 24, height: 2.5, backgroundColor: '#ff4d6d', borderRadius: 2 },

  sectionHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 14 },
  sectionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: 1.6, fontWeight: '800' },
  sectionCount: { fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: '800' },

  list: { gap: 12, width: '100%' },

  itemCard:    { width: '100%', borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 7 },
  itemGrad:    { position: 'relative' },
  rarityBadge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, zIndex: 10 },
  productImage:{ width: 120, alignItems: 'center', justifyContent: 'center', paddingLeft: 10, paddingRight: 6 },
  itemName:    { fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'lowercase' },
  itemDesc:    { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'lowercase', marginTop: 4, lineHeight: 15 },
  priceTagHorizontal: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  itemPrice:   { fontSize: 13, fontWeight: '900' },
  btnCompact:  { height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btnCompactTxt: { fontSize: 11, fontWeight: '800', textTransform: 'lowercase' },

  invRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  invIcon:   { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  invName:   { fontSize: 14, fontWeight: '700', color: '#fff', textTransform: 'lowercase', marginBottom: 3 },
  invSource: { fontSize: 10, textTransform: 'lowercase', letterSpacing: 0.5 },

  rarPill:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  rarTxt:    { fontSize: 10, fontWeight: '900', textTransform: 'lowercase', letterSpacing: 1.5 },

  toast:     { position: 'absolute', bottom: 32, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '700', textTransform: 'lowercase' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#0e0c1a', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: 44, borderTopWidth: 1.5, borderColor: 'rgba(255,77,109,0.18)' },
  confirmName:  { fontSize: 22, fontWeight: '900', color: '#fff', textTransform: 'lowercase', textAlign: 'center', letterSpacing: -0.5 },
  confirmDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.35)', textTransform: 'lowercase', textAlign: 'center', marginTop: 6, marginBottom: 16 },
  confirmGiftLabel: { backgroundColor: 'rgba(255,77,109,0.12)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 14, alignSelf: 'center' },
  confirmGiftText:  { fontSize: 12, color: '#ff9ec7', fontWeight: '700', textTransform: 'lowercase' },
  confirmPriceRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  confirmPrice:     { fontSize: 18, color: '#fde68a', fontWeight: '900' },
  confirmBalance:   { fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' },
  confirmPoor:      { fontSize: 12, color: '#ef4444', textTransform: 'lowercase', marginTop: 8, textAlign: 'center' },
  confirmBtn:       { borderRadius: 18, overflow: 'hidden' },
  confirmBtnGrad:   { height: 56, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText:   { color: '#fff', fontSize: 15, fontWeight: '800', textTransform: 'lowercase', letterSpacing: 0.5 },

  // Pedestal display specifications
  pedestalCanvasInner: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  imgFrameShadow: { width: 90, height: 90, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pedestalBackdrop: { position: 'absolute', width: 90, height: 90, borderRadius: 45, opacity: 0.16 },
  pedestalGlowFrame: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, overflow: 'hidden' },
  pedestalHighlight: { position: 'absolute', top: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)' },
  pedestalStar: { position: 'absolute', fontSize: 10, color: '#fff', opacity: 0.7 },
});
