// screens/GoogleProfileSetup.js
// Modal shown after a NEW google account signs in — collects name + gender + birthday.
// Keyboard-aware + scrollable so it stays usable on small phone screens.
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Modal, Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const GENDER_OPTIONS = [
  { value: 'male',   label: 'male',   icon: '♂' },
  { value: 'female', label: 'female', icon: '♀' },
  { value: 'other',  label: 'other',  icon: '⚧' },
];

export default function GoogleProfileSetup({ visible, defaultName = '', onComplete, onCancel }) {
  const [name,   setName]   = useState(defaultName);
  const [gender, setGender] = useState('');
  const [bDay,   setBDay]   = useState('');
  const [bMonth, setBMonth] = useState('');
  const [bYear,  setBYear]  = useState('');
  const [bError, setBError] = useState('');
  const dayRef   = useRef(null);
  const monthRef = useRef(null);
  const yearRef  = useRef(null);
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (visible) {
      setName(defaultName); setGender('');
      setBDay(''); setBMonth(''); setBYear(''); setBError('');
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      fade.setValue(0); slide.setValue(60);
    }
  }, [visible]);

  const validBirthday = () => {
    const d = parseInt(bDay), m = parseInt(bMonth), y = parseInt(bYear);
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) return null;
    const date = new Date(y, m - 1, d);
    if (date > new Date()) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const ready = name.trim().length > 0 && gender.length > 0 && !!validBirthday();

  const submit = () => {
    const bday = validBirthday();
    if (!bday) { setBError('enter a valid birthday'); return; }
    onComplete(name.trim(), gender, bday);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[s.overlay, { opacity: fade }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kav}>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slide }] }]}>
        <ScrollView contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
          {/* Header */}
          <View style={s.iconWrap}>
            <LinearGradient colors={['#ff9ec7', '#ff4d6d', '#a30030']} style={s.iconCircle}>
              <Text style={{ fontSize: 30 }}>✨</Text>
            </LinearGradient>
          </View>
          <Text style={s.title}>welcome! finish your profile</Text>
          <Text style={s.sub}>a few quick things to set up your account</Text>

          {/* Name */}
          <Text style={s.label}>your name</Text>
          <View style={s.inputRow}>
            <Text style={s.inputIcon}>👤</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="first name"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="words"
            />
          </View>

          {/* Gender */}
          <Text style={[s.label, { marginTop: 16 }]}>gender</Text>
          <View style={s.genderRow}>
            {GENDER_OPTIONS.map(opt => {
              const sel = gender === opt.value;
              return (
                <TouchableOpacity key={opt.value} onPress={() => setGender(opt.value)} activeOpacity={0.85}
                  style={[s.genderChip, sel && s.genderChipActive]}>
                  <Text style={[s.genderIcon, sel && { color: '#ff4d6d' }]}>{opt.icon}</Text>
                  <Text style={[s.genderLabel, sel && { color: '#ff4d6d' }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Birthday */}
          <Text style={[s.label, { marginTop: 16 }]}>birthday</Text>
          <View style={s.dateRow}>
            {[
              { val: bDay,   set: setBDay,   ph: 'DD',   len: 2, max: 31, ref: dayRef,   next: monthRef, flex: 1, sub: 'day' },
              { val: bMonth, set: setBMonth, ph: 'MM',   len: 2, max: 12, ref: monthRef, next: yearRef,  flex: 1, sub: 'month' },
              { val: bYear,  set: setBYear,  ph: 'YYYY', len: 4, max: new Date().getFullYear(), ref: yearRef, next: null, flex: 1.5, sub: 'year' },
            ].map((f, i) => (
              <View key={i} style={{ flex: f.flex }}>
                <TextInput
                  ref={f.ref}
                  style={s.dateInput}
                  value={f.val}
                  onChangeText={(t) => {
                    let num = t.replace(/\D/g, '').slice(0, f.len);
                    if (num !== '' && parseInt(num, 10) > f.max) num = String(f.max);
                    f.set(num); setBError('');
                    if (num.length === f.len && f.next?.current) f.next.current.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={f.len}
                  placeholder={f.ph}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  textAlign="center"
                />
                <Text style={s.dateSub}>{f.sub}</Text>
              </View>
            ))}
          </View>
          {!!bError && <Text style={s.bError}>{bError}</Text>}

          {/* Continue */}
          <TouchableOpacity
            onPress={submit}
            disabled={!ready}
            activeOpacity={0.85}
            style={[s.cta, !ready && { opacity: 0.4 }]}
          >
            <LinearGradient colors={['#ff6b8a', '#ff4d6d', '#c9184a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
              <Text style={s.ctaText}>continue  →</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onCancel} style={{ alignItems: 'center', paddingVertical: 10 }} activeOpacity={0.7}>
            <Text style={s.cancel}>cancel</Text>
          </TouchableOpacity>
        </ScrollView>
        </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  kav:     { width: '100%' },
  sheet:   { backgroundColor: '#0e0e1a', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1.5, borderColor: 'rgba(255,77,109,0.18)', maxHeight: height * 0.92, overflow: 'hidden' },
  sheetContent: { padding: 28, paddingBottom: 36 },
  iconWrap:   { alignItems: 'center', marginBottom: 14 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textTransform: 'lowercase', textAlign: 'center', letterSpacing: -0.5 },
  sub:   { fontSize: 13, color: 'rgba(255,255,255,0.35)', textTransform: 'lowercase', textAlign: 'center', marginTop: 6, marginBottom: 22 },
  label: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: 1.2, marginBottom: 8 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 14 },
  inputIcon: { fontSize: 16 },
  input:     { flex: 1, fontSize: 15, color: '#fff', fontWeight: '400', outlineStyle: 'none', outlineWidth: 0 },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderChip: { flex: 1, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14 },
  genderChipActive: { backgroundColor: 'rgba(255,77,109,0.1)', borderColor: 'rgba(255,77,109,0.55)' },
  genderIcon:  { fontSize: 15, color: 'rgba(255,255,255,0.3)' },
  genderLabel: { fontSize: 13, fontWeight: '500', textTransform: 'lowercase', color: 'rgba(255,255,255,0.3)' },
  dateRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dateInput: { height: 54, width: '100%', paddingVertical: 0, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, textAlign: 'center', textAlignVertical: 'center', color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 1, outlineStyle: 'none', outlineWidth: 0 },
  dateSub:   { fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', textTransform: 'lowercase', letterSpacing: 1.5, marginTop: 5 },
  bError:    { fontSize: 11, color: '#ef4444', marginTop: 6, marginLeft: 2 },
  cta:     { borderRadius: 16, overflow: 'hidden', marginTop: 24 },
  ctaGrad: { height: 56, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', textTransform: 'lowercase', letterSpacing: 0.5 },
  cancel:  { fontSize: 13, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', marginTop: 6 },
});
