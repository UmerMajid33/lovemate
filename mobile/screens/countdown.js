import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Animated, StatusBar, SafeAreaView, ScrollView, TextInput, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle } from 'react-native-svg';
import { API_BASE } from '../utils/api.js';

const { width, height } = Dimensions.get('window');
// Per-home local cache key — never share one date across different homes.
const annivKey = (linkCode) => `lovemate:anniversary:${(linkCode || 'none').toLowerCase()}`;

// ─── Date math ────────────────────────────────────────────────────────────────
function getStats(startDate) {
  const start = new Date(startDate);
  const now   = new Date();
  if (isNaN(start.getTime()) || start > now) return null;

  const totalDays = Math.floor((now - start) / 86400000);

  let years  = now.getFullYear() - start.getFullYear();
  let months = now.getMonth()    - start.getMonth();
  let days   = now.getDate()     - start.getDate();

  if (days < 0) {
    months--;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) { years--; months += 12; }

  // Next anniversary (same month/day, nearest future year)
  let next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
  if (next <= now) next = new Date(now.getFullYear() + 1, start.getMonth(), start.getDate());
  const daysToAnniv = Math.ceil((next - now) / 86400000);
  const yearCount   = next.getFullYear() - start.getFullYear();

  // Next monthly (same day each month)
  let nextMonthly = new Date(now.getFullYear(), now.getMonth(), start.getDate());
  if (nextMonthly <= now) nextMonthly = new Date(now.getFullYear(), now.getMonth() + 1, start.getDate());
  const daysToMonthly = Math.ceil((nextMonthly - now) / 86400000);
  const monthCount    = years * 12 + months + (days > 0 ? 1 : 0);

  return { totalDays, years, months, days, daysToAnniv, yearCount, daysToMonthly, monthCount };
}

function fmt(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
}

// ─── Animated number counter ──────────────────────────────────────────────────
function CountNum({ value, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const displayed = useRef(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const prev = displayed.current;
    anim.setValue(prev);
    displayed.current = value;
    Animated.timing(anim, { toValue: value, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{shown.toLocaleString()}</Text>;
}

// ─── Pulsing ring ─────────────────────────────────────────────────────────────
function PulseRing({ size, delay, color = '#ff4d6d' }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 400,  useNativeDriver: true }),
      Animated.delay(2000),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.5, borderColor: color,
      opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.1] }) }],
    }} />
  );
}

// ─── Floating heart particle ──────────────────────────────────────────────────
function FloatHeart({ x, y, delay }) {
  const floatY  = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 0.35, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(Animated.parallel([
        Animated.sequence([
          Animated.timing(floatY, { toValue: -20, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floatY, { toValue: 4,   duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.loop(Animated.sequence([
          Animated.timing(opacity, { toValue: 0.12, duration: 2200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.38, duration: 2200, useNativeDriver: true }),
        ])),
      ])).start();
    });
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: y, opacity, transform: [{ translateY: floatY }] }}>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill="#ff4d6d"/>
      </Svg>
    </Animated.View>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, sublabel, color = '#ff4d6d' }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slide  = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slide,  { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slide }] }}>
      <LinearGradient colors={[`${color}18`, `${color}06`, 'rgba(10,10,22,0.97)']}
        style={[c.statCard, { borderColor: `${color}2a` }]}>
        <Text style={[c.statValue, { color }]}>{value.toLocaleString()}</Text>
        <Text style={c.statLabel}>{label}</Text>
        {sublabel && <Text style={c.statSublabel}>{sublabel}</Text>}
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Upcoming card ────────────────────────────────────────────────────────────
function UpcomingCard({ icon, title, days, desc, color }) {
  return (
    <LinearGradient colors={[`${color}14`, 'rgba(10,10,22,0.97)']}
      style={[c.upCard, { borderColor: `${color}2e` }]}>
      <View style={[c.upIconWrap, { backgroundColor: `${color}18`, borderColor: `${color}35` }]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          {icon === 'heart' ? (
            <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill={color}/>
          ) : (
            <Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
          )}
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[c.upTitle, { color }]}>{title}</Text>
        <Text style={c.upDesc}>{desc}</Text>
      </View>
      <View style={[c.upDaysBadge, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
        <Text style={[c.upDays, { color }]}>{days}</Text>
        <Text style={[c.upDaysLabel, { color: `${color}88` }]}>days</Text>
      </View>
    </LinearGradient>
  );
}

// ─── Date input screen ────────────────────────────────────────────────────────
function DateSetup({ homeName, onSave }) {
  const [day,   setDay]   = useState('');
  const [month, setMonth] = useState('');
  const [year,  setYear]  = useState('');
  const [error, setError] = useState('');

  const monthRef = useRef(null);
  const yearRef  = useRef(null);

  const handleSave = () => {
    const d = parseInt(day), m = parseInt(month), y = parseInt(year);
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
      setError('please enter a valid date'); return;
    }
    const date = new Date(y, m - 1, d);
    if (date > new Date()) { setError('that date is in the future'); return; }
    onSave(date.toISOString());
  };

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slide  = useRef(new Animated.Value(40)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slide,  { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ alignItems: 'center', opacity: fadeIn, transform: [{ translateY: slide }], paddingHorizontal: 32 }}>
      {/* Heart icon */}
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
        <PulseRing size={120} delay={0} />
        <PulseRing size={120} delay={700} />
        <LinearGradient colors={['rgba(255,77,109,0.22)', 'rgba(255,77,109,0.07)']}
          style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,77,109,0.35)' }}>
          <Svg width={40} height={40} viewBox="0 0 24 24">
            <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill="#ff4d6d"/>
          </Svg>
        </LinearGradient>
      </View>

      <Text style={c.setupTitle}>when did your story begin?</Text>
      <Text style={c.setupSub}>
        enter the date you became official.{'\n'}
        {homeName ? `${homeName} will remember it forever.` : 'your sanctuary will remember it forever.'}
      </Text>

      {/* DD / MM / YYYY inputs */}
      <View style={c.dateRow}>
        {[
          { val: day,   set: setDay,   ph: 'DD',   len: 2, max: 31, ref: null,     next: monthRef, label: 'day'   },
          { val: month, set: setMonth, ph: 'MM',   len: 2, max: 12, ref: monthRef, next: yearRef,  label: 'month' },
          { val: year,  set: setYear,  ph: 'YYYY', len: 4, max: new Date().getFullYear(), ref: yearRef, next: null, label: 'year' },
        ].map((f) => (
          <View key={f.label} style={{ alignItems: 'center', flex: f.label === 'year' ? 2 : 1 }}>
            <Text style={c.dateLabel}>{f.label}</Text>
            <TextInput
              ref={f.ref}
              style={c.dateInput}
              value={f.val}
              onChangeText={(t) => {
                let num = t.replace(/\D/g, '').slice(0, f.len);
                if (num !== '' && parseInt(num, 10) > f.max) num = String(f.max);
                f.set(num);
                if (num.length === f.len && f.next?.current) f.next.current.focus();
              }}
              keyboardType="number-pad"
              maxLength={f.len}
              placeholder={f.ph}
              placeholderTextColor="rgba(255,255,255,0.18)"
              textAlign="center"
            />
          </View>
        ))}
      </View>

      {error ? <Text style={c.errorText}>{error}</Text> : null}

      <TouchableOpacity onPress={handleSave} style={{ width: '100%', marginTop: 24, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={['#ff6b8a', '#ff4d6d', '#c9184a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', textTransform: 'lowercase', letterSpacing: 0.5 }}>
            start the counter  ♥
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main countdown screen ───────────────────────────────────────────────────
export default function CountdownScreen({ onNavigate, params = {} }) {
  const { homeName = 'our sanctuary', linkCode = '', role = 'creator' } = params;

  const [startDate, setStartDate] = useState(null);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);

  // Ticker — update every minute so days stay accurate
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Load this home's anniversary — server first (shared with partner), then local cache
  useEffect(() => {
    (async () => {
      let iso = null;
      if (linkCode) {
        try {
          const res = await fetch(`${API_BASE}/api/home/anniversary/${linkCode}`);
          if (res.ok) { const d = await res.json(); if (d.anniversary) iso = d.anniversary; }
        } catch (_) {}
      }
      if (!iso) { try { iso = await AsyncStorage.getItem(annivKey(linkCode)); } catch (_) {} }
      if (iso) { setStartDate(iso); setStats(getStats(iso)); await AsyncStorage.setItem(annivKey(linkCode), iso).catch(() => {}); }
      setLoading(false);
    })();
  }, [linkCode]);

  // Recalculate when now ticks
  useEffect(() => {
    if (startDate) setStats(getStats(startDate));
  }, [now, startDate]);

  const handleSaveDate = async (isoDate) => {
    await AsyncStorage.setItem(annivKey(linkCode), isoDate).catch(() => {});
    if (linkCode) {
      try {
        await fetch(`${API_BASE}/api/home/anniversary`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkcode: linkCode, date: isoDate }),
        });
      } catch (_) {}
    }
    setStartDate(isoDate);
    setStats(getStats(isoDate));
    setEditing(false);
  };

  const heartScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1,    duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  const hearts = [
    { x: 22,          y: height * 0.08, delay: 0 },
    { x: width - 42,  y: height * 0.12, delay: 800 },
    { x: 40,          y: height * 0.55, delay: 400 },
    { x: width - 30,  y: height * 0.62, delay: 1200 },
    { x: width * 0.5, y: height * 0.04, delay: 600 },
    { x: 15,          y: height * 0.34, delay: 1600 },
    { x: width - 55,  y: height * 0.4,  delay: 2000 },
  ];

  return (
    <SafeAreaView style={c.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
      <LinearGradient colors={['#080810', '#0e0818', '#080810']} style={StyleSheet.absoluteFill} />

      {/* Ambient hearts */}
      {hearts.map((h, i) => <FloatHeart key={i} {...h} />)}

      {/* Header */}
      <View style={c.header}>
        <TouchableOpacity onPress={() => onNavigate('castle', params)} style={c.backBtn}>
          <Text style={c.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={c.headerTitle}>countdown to us</Text>
        {stats && !editing && (
          <TouchableOpacity onPress={() => setEditing(true)} style={c.editBtn}>
            <Text style={c.editBtnText}>edit</Text>
          </TouchableOpacity>
        )}
        {(!stats || editing) && <View style={{ width: 40 }} />}
      </View>

      <ScrollView contentContainerStyle={c.scroll} showsVerticalScrollIndicator={false}>

        {/* ── No date set or editing ── */}
        {(!stats || editing) && !loading && (
          <DateSetup homeName={homeName} onSave={handleSaveDate} />
        )}

        {/* ── Counter display ── */}
        {stats && !editing && (
          <>
            {/* Big days counter */}
            <View style={c.heroWrap}>
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 220, height: 220 }}>
                <PulseRing size={220} delay={0}   color="#ff4d6d" />
                <PulseRing size={220} delay={600}  color="#ff758f" />
                <PulseRing size={220} delay={1200} color="#c9184a" />
                <LinearGradient
                  colors={['rgba(255,77,109,0.2)', 'rgba(255,77,109,0.06)']}
                  style={{ width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,77,109,0.3)' }}>
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Svg width={64} height={64} viewBox="0 0 24 24">
                      <Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill="#ff4d6d"/>
                    </Svg>
                  </Animated.View>
                </LinearGradient>
              </View>

              <CountNum value={stats.totalDays} style={c.bigDays} />
              <Text style={c.bigDaysLabel}>days together</Text>
              <Text style={c.sinceText}>since {fmt(startDate)}</Text>
            </View>

            {/* Years / months / days breakdown */}
            <Text style={c.sectionLabel}>your time together</Text>
            <View style={c.statsGrid}>
              <StatCard value={stats.years}  label="years"  sublabel={stats.years === 1 ? 'one beautiful year' : 'beautiful years'} color="#ff4d6d" />
              <StatCard value={stats.months} label="months" sublabel="this year"   color="#a78bfa" />
              <StatCard value={stats.days}   label="days"   sublabel="this month"  color="#34d399" />
            </View>

            {/* Upcoming milestones */}
            <Text style={[c.sectionLabel, { marginTop: 28 }]}>coming up</Text>
            <View style={{ width: '100%', gap: 12, marginBottom: 40 }}>
              <UpcomingCard
                icon="heart"
                title={`year ${stats.yearCount} anniversary`}
                days={stats.daysToAnniv}
                desc={stats.daysToAnniv === 0 ? 'it\'s your anniversary today!' : `in ${stats.daysToAnniv} day${stats.daysToAnniv === 1 ? '' : 's'}`}
                color="#ff4d6d"
              />
              <UpcomingCard
                icon="calendar"
                title={`month ${stats.monthCount} together`}
                days={stats.daysToMonthly}
                desc={stats.daysToMonthly === 0 ? 'it\'s your mensiversary today!' : `in ${stats.daysToMonthly} day${stats.daysToMonthly === 1 ? '' : 's'}`}
                color="#a78bfa"
              />
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const c = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#080810' },
  scroll: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 120 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.3 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 17, color: 'rgba(255,255,255,0.6)' },
  editBtn:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,77,109,0.35)', backgroundColor: 'rgba(255,77,109,0.08)' },
  editBtnText: { fontSize: 11, color: '#ff9ec7', fontWeight: '700', textTransform: 'lowercase' },

  heroWrap:     { alignItems: 'center', paddingVertical: 24, width: '100%' },
  bigDays:      { fontSize: 80, fontWeight: '900', color: '#fff', letterSpacing: -4, lineHeight: 86, marginTop: 8 },
  bigDaysLabel: { fontSize: 16, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: 3, fontWeight: '600' },
  sinceText:    { fontSize: 12, color: 'rgba(255,107,138,0.6)', textTransform: 'lowercase', marginTop: 8, letterSpacing: 0.5 },

  sectionLabel: { alignSelf: 'flex-start', fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'lowercase', letterSpacing: 2, fontWeight: '700', marginBottom: 12 },

  statsGrid: { flexDirection: 'row', gap: 10, width: '100%' },
  statCard:  { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1.5 },
  statValue: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 1 },
  statSublabel: { fontSize: 9, color: 'rgba(255,255,255,0.18)', textTransform: 'lowercase', textAlign: 'center', marginTop: 3 },

  upCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 18, borderWidth: 1.5 },
  upIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  upTitle:    { fontSize: 14, fontWeight: '800', textTransform: 'lowercase', marginBottom: 3 },
  upDesc:     { fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' },
  upDaysBadge: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  upDays:      { fontSize: 22, fontWeight: '900' },
  upDaysLabel: { fontSize: 8, fontWeight: '700', textTransform: 'lowercase', letterSpacing: 1 },

  setupTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.5, textAlign: 'center', marginBottom: 12 },
  setupSub:   { fontSize: 14, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', textAlign: 'center', lineHeight: 21, marginBottom: 32 },

  dateRow:   { flexDirection: 'row', gap: 10, width: '100%' },
  dateLabel: { fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'lowercase', letterSpacing: 1.5, marginBottom: 6 },
  dateInput: { height: 56, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,77,109,0.3)', borderRadius: 16, textAlign: 'center', color: '#fff', fontSize: 20, fontWeight: '800', width: '100%', paddingVertical: 0, outlineStyle: 'none', outlineWidth: 0 },
  errorText: { fontSize: 12, color: '#ef4444', textTransform: 'lowercase', marginTop: 10 },
});
