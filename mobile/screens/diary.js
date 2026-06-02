import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions, TextInput,
  Animated, StatusBar, SafeAreaView, ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { API_BASE } from '../utils/api.js';
import { colors as TC, fonts as TF } from '../theme/theme.js';
import SpaceBackground from '../theme/SpaceBackground.js';

// Pick an image, shrink + compress it to a small JPEG data-URL so it stores
// cheaply in the diary and survives forever.
async function pickDiaryImage() {
  try {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1, allowsEditing: false,
    });
    if (res.canceled || !res.assets?.length) return null;
    const a = res.assets[0];
    const out = await ImageManipulator.manipulateAsync(
      a.uri,
      [{ resize: { width: 1000 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return out.base64 ? `data:image/jpeg;base64,${out.base64}` : null;
  } catch (_) { return null; }
}

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
  const [image, setImage] = useState(null);
  const [picking, setPicking] = useState(false);
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(80)).current;

  const addImage = async () => {
    setPicking(true);
    const img = await pickDiaryImage();
    if (img) setImage(img);
    setPicking(false);
  };

  useEffect(() => {
    if (visible) {
      setMood('📖'); setTitle(''); setText(''); setImage(null);
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
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

            <Text style={d.fieldLbl}>photo <Text style={{ color: 'rgba(255,255,255,0.25)' }}>(optional)</Text></Text>
            {image ? (
              <View style={d.imgWrap}>
                <Image source={{ uri: image }} style={d.imgPreview} resizeMode="cover" />
                <TouchableOpacity onPress={() => setImage(null)} style={d.imgRemove}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={addImage} disabled={picking} style={d.attachBtn} activeOpacity={0.8}>
                <Text style={d.attachTxt}>{picking ? 'attaching…' : '🖼  attach a photo'}</Text>
              </TouchableOpacity>
            )}

            <View style={{ gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => ready && onSave({ mood, title: title.trim(), text: text.trim(), image })} disabled={!ready || saving}
                style={[d.saveBtn, (!ready || saving) && { opacity: 0.4 }]}>
                <LinearGradient colors={['#F08FA0', '#E0506E', '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={d.saveGrad}>
                  <Text style={d.saveTxt}>{saving ? 'saving…' : 'save forever'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={d.cancelBtn}>
                <Text style={d.cancelTxt}>cancel</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Memory card (compact list row) ───────────────────────────────────────────
function MemoryCard({ entry, mine, partnerName, index, onView }) {
  const slide = useRef(new Animated.Value(24)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 320, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 320, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);
  const who = mine ? 'you' : (entry.authorname || partnerName || 'partner');
  const accent = mine ? '#E0506E' : '#9B8BC4';

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flexDirection: 'row', gap: 12 }}>
      {/* timeline rail */}
      <View style={{ alignItems: 'center', width: 24 }}>
        <View style={[d.node, { backgroundColor: accent, shadowColor: accent }]}><Text style={{ fontSize: 12 }}>{entry.mood || '📖'}</Text></View>
        <View style={d.rail} />
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={() => onView(entry)} style={[d.card, { borderColor: `${accent}33`, shadowColor: accent }]}>
        <View style={[d.cardStrip, { backgroundColor: accent }]} />
        <LinearGradient colors={[`${accent}18`, 'rgba(13,12,24,0.97)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={d.cardGrad}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {entry.image ? (
              <Image source={{ uri: entry.image }} style={[d.thumb, { borderColor: `${accent}40` }]} resizeMode="cover" />
            ) : (
              <View style={[d.thumb, d.thumbEmpty, { borderColor: `${accent}30` }]}>
                <Text style={{ fontSize: 22 }}>{entry.mood || '📖'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={d.cardTitle} numberOfLines={1}>{entry.title || 'untitled memory'}</Text>
              <Text style={d.cardExcerpt} numberOfLines={1}>{entry.text}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }}>
                <View style={[d.whoChip, { backgroundColor: `${accent}1f`, borderColor: `${accent}45` }]}>
                  <Text style={[d.whoChipTxt, { color: accent }]}>{who}</Text>
                </View>
                <Text style={d.cardDate}>{fmtDate(entry.createdat)}</Text>
              </View>
            </View>
            <View style={[d.arrowChip, { borderColor: `${accent}55` }]}>
              <Text style={[d.arrowTxt, { color: accent }]}>→</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Full memory detail (opens on "view") ─────────────────────────────────────
function MemoryDetail({ entry, mine, partnerName, onClose }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;
  useEffect(() => {
    if (entry) {
      fade.setValue(0); slide.setValue(40);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [entry]);
  if (!entry) return null;
  const who = mine ? 'you' : (entry.authorname || partnerName || 'partner');
  const accent = mine ? '#E0506E' : '#9B8BC4';

  return (
    <Modal visible={!!entry} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[d.detailOverlay, { opacity: fade }]}>
        <SpaceBackground />
        <Animated.View style={[d.detailSheet, { transform: [{ translateY: slide }], borderColor: `${accent}45` }]}>
          {/* gradient header band */}
          <LinearGradient colors={[`${accent}3a`, `${accent}12`, 'rgba(14,12,26,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={d.detailBand} />

          <TouchableOpacity onPress={onClose} style={d.detailClose}><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '800' }}>✕</Text></TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 26 }}>
            {/* mood + author */}
            <View style={d.detailHead}>
              <View style={[d.detailMood, { backgroundColor: `${accent}26`, borderColor: `${accent}66`, shadowColor: accent }]}>
                <Text style={{ fontSize: 28 }}>{entry.mood || '📖'}</Text>
              </View>
              <View style={{ marginLeft: 13 }}>
                <Text style={d.detailKicker}>a memory by</Text>
                <Text style={[d.detailWho, { color: accent }]}>{who}</Text>
              </View>
            </View>

            {/* title */}
            <Text style={d.detailTitle}>{entry.title || 'untitled memory'}</Text>

            {/* date chip */}
            <View style={[d.dateChip, { borderColor: `${accent}33` }]}>
              <Text style={[d.dateChipTxt, { color: accent }]}>🗓  {fmtDate(entry.createdat)}</Text>
              <Text style={d.stampDot}>·</Text>
              <Text style={[d.dateChipTxt, { color: accent }]}>🕐  {fmtTime(entry.createdat)}</Text>
            </View>

            {/* image — framed, contained */}
            {!!entry.image && (
              <View style={[d.detailImgFrame, { borderColor: `${accent}40` }]}>
                <Image source={{ uri: entry.image }} style={d.detailImg} resizeMode="cover" />
              </View>
            )}

            {/* story — accent quote bar */}
            <Text style={d.storyLabel}>the story</Text>
            <View style={d.storyRow}>
              <View style={[d.storyBar, { backgroundColor: accent }]} />
              <Text style={d.detailBody}>{entry.text}</Text>
            </View>

            <View style={d.detailFooter}>
              <View style={[d.footLine, { backgroundColor: `${accent}40` }]} />
              <Text style={d.footTxt}>✦ kept forever ✦</Text>
              <View style={[d.footLine, { backgroundColor: `${accent}40` }]} />
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
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
  const [viewing, setViewing] = useState(null);

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

  const save = async ({ mood, title, text, image }) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/diary/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkcode: linkCode, author: role, authorname: user?.name || '', mood, title, text, image: image || '' }),
      });
      const data = await res.json();
      if (res.ok && data.entry) setEntries(prev => [data.entry, ...prev]);
    } catch (_) {}
    setSaving(false);
    setWriting(false);
  };

  return (
    <SafeAreaView style={d.safe}>
      <StatusBar barStyle="light-content" backgroundColor={TC.bg} />
      <SpaceBackground />

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
              <MemoryCard key={e._id || i} entry={e} mine={e.author === role} partnerName={partnerName} index={i} onView={setViewing} />
            ))}
            <View style={{ height: 90 }} />
          </View>
        )}
      </ScrollView>

      {/* Floating write button */}
      <TouchableOpacity onPress={() => setWriting(true)} activeOpacity={0.9} style={d.fab}>
        <LinearGradient colors={['#F08FA0', '#E0506E', '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={d.fabGrad}>
          <Text style={d.fabPlus}>＋</Text>
          <Text style={d.fabTxt}>write a memory</Text>
        </LinearGradient>
      </TouchableOpacity>

      <WriteModal visible={writing} onClose={() => setWriting(false)} onSave={save} saving={saving} />
      <MemoryDetail entry={viewing} mine={viewing?.author === role} partnerName={partnerName} onClose={() => setViewing(null)} />
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: TC.bg },
  blob:  { position: 'absolute', width: 230, height: 230, borderRadius: 115, opacity: 0.12 },
  scroll:{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 200 },

  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 19, color: '#fff', fontWeight: '800', marginTop: -2 },
  title2:  { fontFamily: TF.serif, fontSize: 24, color: '#fff', letterSpacing: -0.4 },
  sub:     { fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', marginTop: 2 },

  muted:   { fontSize: 13, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', textAlign: 'center' },

  node:    { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 5 },
  rail:    { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 2 },

  card:    { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, marginBottom: 13, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 5 },
  cardStrip:{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, zIndex: 2 },
  cardGrad:{ paddingVertical: 13, paddingLeft: 16, paddingRight: 13 },
  thumb:   { width: 56, height: 56, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardTitle:{ fontFamily: TF.serif, fontSize: 17, color: '#fff', letterSpacing: -0.2 },
  cardExcerpt: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  cardDate: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase' },
  author:  { fontSize: 11, fontWeight: '900', textTransform: 'lowercase', letterSpacing: 0.3 },
  whoChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, borderWidth: 1 },
  whoChipTxt: { fontSize: 10, fontWeight: '800', textTransform: 'lowercase', letterSpacing: 0.3 },
  stampDot:{ fontSize: 11, color: 'rgba(255,255,255,0.25)' },
  arrowChip:{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  arrowTxt: { fontSize: 16, fontWeight: '900' },

  // detail view
  detailOverlay: { flex: 1, backgroundColor: 'rgba(4,4,10,0.92)', justifyContent: 'center', padding: 18 },
  detailSheet:   { borderRadius: 28, borderWidth: 1.5, overflow: 'hidden', maxHeight: height * 0.86, backgroundColor: 'rgba(14,12,26,0.98)', shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.55, shadowRadius: 34, elevation: 18 },
  detailBand:    { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
  detailClose:   { position: 'absolute', top: 14, right: 14, zIndex: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  detailHead:    { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  detailMood:    { width: 54, height: 54, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10 },
  detailKicker:  { fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: '700' },
  detailWho:     { fontSize: 18, fontWeight: '900', textTransform: 'lowercase', letterSpacing: -0.2, marginTop: 3 },
  detailTitle:   { fontFamily: TF.serif, fontSize: 28, color: '#fff', letterSpacing: -0.5, lineHeight: 34 },
  dateChip:      { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 13, marginBottom: 20, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1 },
  dateChipTxt:   { fontSize: 11, fontWeight: '700', textTransform: 'lowercase' },

  detailImgFrame:{ borderRadius: 18, borderWidth: 1, padding: 5, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 22, alignSelf: 'center', width: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14 },
  detailImg:     { width: '100%', height: 190, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.04)' },

  storyLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 3, fontWeight: '700', marginBottom: 10 },
  storyRow:      { flexDirection: 'row', gap: 14 },
  storyBar:      { width: 3, borderRadius: 2, opacity: 0.7 },
  detailBody:    { flex: 1, fontSize: 16, color: 'rgba(255,255,255,0.9)', lineHeight: 26 },

  detailFooter:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26 },
  footLine:      { flex: 1, height: 1 },
  footTxt:       { fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'lowercase', letterSpacing: 1 },

  fab:     { position: 'absolute', bottom: 96, alignSelf: 'center', borderRadius: 100, overflow: 'hidden', shadowColor: '#E0506E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  fabGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, height: 52 },
  fabPlus: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: -2 },
  fabTxt:  { color: '#fff', fontSize: 14, fontWeight: '900', textTransform: 'lowercase', letterSpacing: 0.3 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#0e0c1a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 36, borderTopWidth: 1.5, borderColor: 'rgba(224,80,110,0.25)', maxHeight: height * 0.9 },
  grabber:      { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 20, fontWeight: '900', color: '#fff', textTransform: 'lowercase', marginBottom: 16, letterSpacing: -0.3 },
  fieldLbl:     { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: 1, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  moodChip:     { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  moodChipOn:   { backgroundColor: 'rgba(224,80,110,0.18)', borderColor: 'rgba(224,80,110,0.6)' },
  titleInput:   { height: 56, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 18, color: '#fff', fontSize: 16, fontWeight: '600', outlineStyle: 'none', outlineWidth: 0 },
  textInput:    { minHeight: 140, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, color: '#fff', fontSize: 15, lineHeight: 23, outlineStyle: 'none', outlineWidth: 0 },
  attachBtn:    { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(224,80,110,0.35)', backgroundColor: 'rgba(224,80,110,0.08)', alignItems: 'center', justifyContent: 'center' },
  attachTxt:    { color: '#F08FA0', fontSize: 14, fontWeight: '700', textTransform: 'lowercase', letterSpacing: 0.3 },
  imgWrap:      { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  imgPreview:   { width: 130, height: 130, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)' },
  imgRemove:    { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  saveBtn:      { borderRadius: 16, overflow: 'hidden' },
  saveGrad:     { height: 54, alignItems: 'center', justifyContent: 'center' },
  saveTxt:      { color: '#fff', fontSize: 15, fontWeight: '900', textTransform: 'lowercase', letterSpacing: 0.4 },
  cancelBtn:    { height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  cancelTxt:    { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '700', textTransform: 'lowercase' },
});
