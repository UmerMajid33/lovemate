// screens/ForgotPassword.js — email → OTP → new password reset flow (modal).
import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../utils/api.js';
import { colors, fonts, spacing, radius, type, shadow } from '../theme/theme.js';

export default function ForgotPassword({ visible, onClose, initialEmail = '' }) {
  const [step, setStep]   = useState('email');   // email | reset | done
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode]   = useState('');
  const [pw, setPw]       = useState('');
  const [pw2, setPw2]     = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  const reset = () => { setStep('email'); setCode(''); setPw(''); setPw2(''); setDevCode(''); setErr(''); setBusy(false); };
  const close = () => { reset(); onClose?.(); };

  const sendCode = async () => {
    if (!email.includes('@')) { setErr('enter a valid email'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch(`${API_BASE}/api/user/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'could not send code'); setBusy(false); return; }
      setDevCode(data.devCode || '');
      setStep('reset'); setBusy(false);
    } catch (_) { setErr('could not reach the server'); setBusy(false); }
  };

  const doReset = async () => {
    if (code.trim().length < 6) { setErr('enter the 6-digit code'); return; }
    if (pw.length < 6)          { setErr('password must be at least 6 characters'); return; }
    if (pw !== pw2)             { setErr('passwords do not match'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch(`${API_BASE}/api/user/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), code: code.trim(), password: pw }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'could not reset password'); setBusy(false); return; }
      setStep('done'); setBusy(false);
    } catch (_) { setErr('could not reach the server'); setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <TouchableOpacity onPress={close} style={s.x}><Text style={s.xTxt}>✕</Text></TouchableOpacity>

          {step === 'email' && (
            <>
              <Text style={s.title}>reset password</Text>
              <Text style={s.sub}>enter your email — we'll send a 6-digit code.</Text>
              <View style={s.field}>
                <TextInput
                  style={s.input} placeholder="email" placeholderTextColor={colors.textMuted}
                  value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
                />
              </View>
              {!!err && <Text style={s.err}>{err}</Text>}
              <Btn label={busy ? 'sending…' : 'send code'} onPress={sendCode} disabled={busy} />
            </>
          )}

          {step === 'reset' && (
            <>
              <Text style={s.title}>new password</Text>
              <Text style={s.sub}>code sent to {email}</Text>
              {!!devCode && (
                <View style={s.devBox}>
                  <Text style={s.devLbl}>email off — your code is</Text>
                  <Text style={s.devCode}>{devCode}</Text>
                </View>
              )}
              <View style={s.field}>
                <TextInput style={[s.input, { letterSpacing: 8, textAlign: 'center' }]} placeholder="······" placeholderTextColor={colors.textMuted}
                  value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
              </View>
              <View style={s.field}>
                <TextInput style={s.input} placeholder="new password" placeholderTextColor={colors.textMuted}
                  value={pw} onChangeText={setPw} secureTextEntry />
              </View>
              <View style={s.field}>
                <TextInput style={s.input} placeholder="confirm password" placeholderTextColor={colors.textMuted}
                  value={pw2} onChangeText={setPw2} secureTextEntry />
              </View>
              {!!err && <Text style={s.err}>{err}</Text>}
              <Btn label={busy ? 'saving…' : 'reset password'} onPress={doReset} disabled={busy} />
              <TouchableOpacity onPress={sendCode} style={{ alignItems: 'center', marginTop: 12 }}>
                <Text style={s.link}>resend code</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 44 }}>✅</Text>
              <Text style={[s.title, { marginTop: 8 }]}>password updated</Text>
              <Text style={s.sub}>sign in with your new password.</Text>
              <Btn label="back to sign in" onPress={close} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Btn({ label, onPress, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.88} style={[s.btnWrap, disabled && { opacity: 0.5 }]}>
      <LinearGradient colors={['#EC7186', colors.accent, '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
        <Text style={s.btnTxt}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { width: '100%', maxWidth: 400, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.hairline, padding: spacing.xxl, ...shadow.card },
  x: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  xTxt: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.text, letterSpacing: -0.3 },
  sub: { ...type.body, marginTop: 6, marginBottom: spacing.lg },
  field: { height: 56, backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.hairline2, borderRadius: radius.md, paddingHorizontal: 16, justifyContent: 'center', marginBottom: 12 },
  input: { fontSize: 15, color: colors.text, outlineStyle: 'none', outlineWidth: 0 },
  err: { color: colors.danger, fontSize: 13, marginBottom: 10 },
  link: { color: colors.accentSoft, fontSize: 13, fontWeight: '600' },
  devBox: { backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.md, padding: 12, marginBottom: 12, alignItems: 'center' },
  devLbl: { ...type.caption, marginBottom: 2 },
  devCode: { fontFamily: fonts.serif, fontSize: 24, color: colors.accentSoft, letterSpacing: 6 },
  btnWrap: { borderRadius: radius.lg, overflow: 'hidden', marginTop: 6, ...shadow.accent },
  btn: { height: 54, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});
