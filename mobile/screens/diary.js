import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions, TextInput,
  Animated, StatusBar, SafeAreaView, ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../utils/api.js';

const { width, height } = Dimensions.get('window');

const MOODS = ['📖', '❤️', '😂', '✨', '🌙', '🍩', '🎉', '🥹', '☕', '🌧️', '🏖️', '🎁'];

function relTime(d) {
  const t = new Date(d);
  const diff = (Date.now() - t.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
// full calendar date, e.g. "Mon, 1 Jun 2026"
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
// 12-hour clock time, e.g. "7:04 pm"
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

// ─── Compose modal ────────────────────────────────────────────────────────────
function WriteModal({ visible, onClose, onSave, saving }) {
  const [mood, setMood]   = useState('📖');
  const [title, setTitle] = useState('');
  const [text, setText]   = useState('');
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (visible) {
      setMood('📖'); setTitle(''); setText('');
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else { fade.setValue(0); slide.setValue(80); }
  }, [visible]);

  const ready = text.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={[d.modalOverlay, { opacity: fade }]}>
          <Animated.View style={[d.modalSheet, { transform: [{ translateY: slide }] }]}>
            <View style={d.grabber} />
            <Text style={d.modalTitle}>new memory</Text>

            <Text style={d.fieldLbl}>mood</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {MOODS.map(m => (
                <TouchableOpacity key={m} onPress={() => setMood(m)}
                  style={[d.moodChip, mood === m && d.moodChipOn]}>
                  <Text style={{ fontSize: 20 }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={d.fieldLbl}>title <Text style={{ color: 'rgba(255,255,255,0.25)' }}>(optional)</Text></Text>
            <TextInput
              style={d.titleInput}
              value={title} onChangeText={setTitle}
              placeholder="our first trip…" placeholderTextColor="rgba(255,255,255,0.25)"
              maxLength={60}
            />

            <Text style={d.fieldLbl}>the memory</Text>
            <TextInput
              style={d.textInput}
              value={text} onChangeText={setText}
              placeholder="write what happened, how it felt, why it mattered…"
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline textAlignVertical="top" maxLength={2000}
            />

            <View style={{ gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => ready && onSave({ mood, title: title.trim(), text: text.trim() })} disabled={!ready || saving}
                style={[d.saveBtn, (!ready || saving) && { opacity: 0.4 }]}>
                <LinearGradient colors={['#f9a8d4', '#ec4899', '#9d174d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={d.saveGrad}>
                  <Text style={d.saveTxt}>{saving ? 'saving…' : 'save forever'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={d.cancelBtn}>
                <Text style={d.cancelTxt}>cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Memory card ──────────────────────────────────────────────────────────────
function MemoryCard({ entry, mine, partnerName, index }) {
  const slide = useRef(new Animated.Value(24)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 320, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 320, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  const who = mine ? 'you' : (entry.authorname || partnerName || 'partner');
  const accent = mine ? '#ec4899' : '#a855f7';

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flexDirection: 'row', gap: 12 }}>
      {/* timeline rail */}
      <View style={{ alignItems: 'center', width: 24 }}>
        <View style={[d.node, { backgroundColor: accent, shadowColor: accent }]}><Text style={{ fontSize: 12 }}>{entry.mood || '📖'}</Text></View>
        <View style={d.rail} />
      </View>

      <View style={[d.card, { borderColor: `${accent}33`, shadowColor: accent }]}>
        <LinearGradient colors={[`${accent}14`, 'rgba(12,11,22,0.96)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={d.cardGrad}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={[d.author, { color: accent }]}>{who}</Text>
            <Text style={d.time}>{relTime(entry.createdat)}</Text>
          </View>
          {!!entry.title && <Text style={d.title}>{entry.title}</Text>}
          <Text style={d.body}>{entry.text}</Text>
          {/* auto date + time stamp */}
          <View style={d.stamp}>
            <Text style={d.stampTxt}>🗓  {fmtDate(entry.createdat)}</Text>
            <Text style={d.stampDot}>·</Text>
            <Text style={d.stampTxt}>🕐  {fmtTime(entry.createdat)}</Text>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

// ─── Main diary screen ────────────────────────────────────────────────────────
export default function Diary({ onNavigate, params = {} }) {
  const { linkCode = '', role = 'creator', user = {} } = params;
  const [entries, setEntries] = useState([]);
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    try {
      const [dres, pres] = await Promise.all([
        fetch(`${API_BASE}/api/diary/${linkCode}`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/home/presence/${linkCode}`).then(r => r.json()).catch(() => null),
      ]);
      if (dres) setEntries(dres.entries || []);
      if (pres) { const pr = role === 'creator' ? pres.joiner : pres.creator; setPartnerName(pr?.name || ''); }
    } catch (_) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async ({ mood, title, text }) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/diary/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: linkCode, author: role, authorname: user?.name || '', mood, title, text }),
      });
      const data = await res.json();
      if (res.ok && data.entry) setEntries(prev => [data.entry, ...prev]);
    } catch (_) {}
    setSaving(false);
    setWriting(false);
  };

  return (
    <SafeAreaView style={d.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#07060f" />
      <LinearGradient colors={['#120815', '#0e0a1e', '#07060f']} style={StyleSheet.absoluteFill} />
      <View style={[d.blob, { top: -80, right: -60, backgroundColor: '#ec4899' }]} pointerEvents="none" />
      <View style={[d.blob, { top: 220, left: -90, backgroundColor: '#a855f7' }]} pointerEvents="none" />

      {/* Header */}
      <View style={d.header}>
        <TouchableOpacity onPress={() => onNavigate('castle', params)} style={d.backBtn}>
          <Text style={d.backTxt}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={d.title2}>couple diary</Text>
          <Text style={d.sub}>{entries.length} {entries.length === 1 ? 'memory' : 'memories'} · kept forever</Text>
        </View>
        <Text style={{ fontSize: 26 }}>📖</Text>
      </View>

      <ScrollView contentContainerStyle={d.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={d.muted}>opening your diary…</Text>
        ) : entries.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 70 }}>
            <Text style={{ fontSize: 50 }}>🕯️</Text>
            <Text style={[d.muted, { marginTop: 14, fontSize: 14 }]}>no memories yet</Text>
            <Text style={[d.muted, { marginTop: 6, maxWidth: 250, textAlign: 'center' }]}>
              write your first one — a date, a laugh, a tiny moment worth keeping.
            </Text>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            {entries.map((e, i) => (
              <MemoryCard key={e._id || i} entry={e} mine={e.author === role} partnerName={partnerName} index={i} />
            ))}
            <View style={{ height: 90 }} />
          </View>
        )}
      </ScrollView>

      {/* Floating write button */}
      <TouchableOpacity onPress={() => setWriting(true)} activeOpacity={0.9} style={d.fab}>
        <LinearGradient colors={['#f9a8d4', '#ec4899', '#9d174d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={d.fabGrad}>
          <Text style={d.fabPlus}>＋</Text>
          <Text style={d.fabTxt}>write a memory</Text>
        </LinearGradient>
      </TouchableOpacity>

      <WriteModal visible={writing} onClose={() => setWriting(false)} onSave={save} saving={saving} />
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#07060f' },
  blob:  { position: 'absolute', width: 230, height: 230, borderRadius: 115, opacity: 0.12 },
  scroll:{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 120 },

  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 19, color: '#fff', fontWeight: '800', marginTop: -2 },
  title2:  { fontSize: 22, fontWeight: '900', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.5 },
  sub:     { fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', marginTop: 2 },

  muted:   { fontSize: 13, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', textAlign: 'center' },

  node:    { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 5 },
  rail:    { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 2 },

  card:    { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, marginBottom: 16, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 5 },
  cardGrad:{ padding: 15 },
  author:  { fontSize: 12, fontWeight: '900', textTransform: 'lowercase', letterSpacing: 0.3 },
  time:    { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' },
  title:   { fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'lowercase', marginBottom: 5 },
  body:    { fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 21 },
  stamp:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  stampTxt:{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'lowercase' },
  stampDot:{ fontSize: 11, color: 'rgba(255,255,255,0.25)' },

  fab:     { position: 'absolute', bottom: 26, alignSelf: 'center', borderRadius: 100, overflow: 'hidden', shadowColor: '#ec4899', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  fabGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, height: 52 },
  fabPlus: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: -2 },
  fabTxt:  { color: '#fff', fontSize: 14, fontWeight: '900', textTransform: 'lowercase', letterSpacing: 0.3 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#0e0c1a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 36, borderTopWidth: 1.5, borderColor: 'rgba(236,72,153,0.25)', maxHeight: height * 0.9 },
  grabber:      { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 20, fontWeight: '900', color: '#fff', textTransform: 'lowercase', marginBottom: 16, letterSpacing: -0.3 },
  fieldLbl:     { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: 1, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  moodChip:     { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  moodChipOn:   { backgroundColor: 'rgba(236,72,153,0.18)', borderColor: 'rgba(236,72,153,0.6)' },
  titleInput:   { height: 56, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 18, color: '#fff', fontSize: 16, fontWeight: '600', outlineStyle: 'none', outlineWidth: 0 },
  textInput:    { minHeight: 140, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, color: '#fff', fontSize: 15, lineHeight: 23, outlineStyle: 'none', outlineWidth: 0 },
  saveBtn:      { borderRadius: 16, overflow: 'hidden' },
  saveGrad:     { height: 54, alignItems: 'center', justifyContent: 'center' },
  saveTxt:      { color: '#fff', fontSize: 15, fontWeight: '900', textTransform: 'lowercase', letterSpacing: 0.4 },
  cancelBtn:    { height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  cancelTxt:    { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '700', textTransform: 'lowercase' },
});
