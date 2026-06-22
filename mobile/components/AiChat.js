// components/AiChat.js — floating AI assistant (Groq / Llama via backend gateway).
// Drop <AiChat /> anywhere; it renders a floating bubble that opens a full modal.
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { API_BASE } from '../utils/api.js';
import { colors as TC } from '../theme/theme.js';

let _id = 0;
const uid = () => `m${Date.now()}_${_id++}`;

// three bouncing dots = "Grok is thinking…"
function Typing() {
  const d = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  React.useEffect(() => {
    const ls = d.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 140),
      Animated.timing(v, { toValue: -4, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay((2 - i) * 140),
    ])));
    ls.forEach(l => l.start()); return () => ls.forEach(l => l.stop());
  }, []);
  return (
    <View style={[s.bubble, s.aiBubble, { flexDirection: 'row', gap: 5, alignItems: 'center' }]}>
      {d.map((v, i) => <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: TC.accentSoft, transform: [{ translateY: v }] }} />)}
    </View>
  );
}

const fmtTime = (ts) => { try { const d = new Date(ts); let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${m < 10 ? '0' + m : m} ${ap}`; } catch { return ''; } };

// message with pop-in; Sophie's messages carry her mini avatar
function MsgBubble({ item }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start(); }, []);
  const st = { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] };
  if (item.sender === 'user') {
    return (
      <Animated.View style={[s.bubble, s.userBubble, st]}>
        <Text style={s.userTxt}>{item.text}</Text>
        <Text style={s.timeMine}>{fmtTime(item.timestamp)}</Text>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 7, alignSelf: 'flex-start', maxWidth: '88%' }, st]}>
      <LinearGradient colors={['#ff8fb1', '#ff4d8d']} style={s.miniAv}><Text style={{ fontSize: 12, fontWeight: '900', color: '#fff' }}>S</Text></LinearGradient>
      <View style={[s.bubble, s.aiBubble, { flexShrink: 1 }]}>
        <Text style={s.aiTxt}>{item.text}</Text>
        <Text style={s.timeAi}>{fmtTime(item.timestamp)}</Text>
      </View>
    </Animated.View>
  );
}

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: uid(), text: "hey bub 🥺💕 it's sophie ✦ *trips over air* ...anyway hi!! talk to me cutie 😚", sender: 'ai', timestamp: Date.now() },
  ]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);

  const toEnd = useCallback(() => requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true })), []);

  // POST the user text to our Express gateway, append the AI reply
  const sendMessageToGrokAPI = async (userMessage) => {
    setTyping(true);
    try {
      const r = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: messages.slice(-16) }),
      });
      const data = await r.json().catch(() => ({}));
      const text = r.ok ? (data.reply || '…') : (data.error || 'something went wrong — try again');
      setMessages(prev => [...prev, { id: uid(), text, sender: 'ai', timestamp: Date.now() }]);
    } catch (_) {
      setMessages(prev => [...prev, { id: uid(), text: "couldn't reach the assistant — check your connection", sender: 'ai', timestamp: Date.now() }]);
    } finally {
      setTyping(false); toEnd();
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text || typing) return;
    setDraft('');
    setMessages(prev => [...prev, { id: uid(), text, sender: 'user', timestamp: Date.now() }]);
    toEnd();
    sendMessageToGrokAPI(text);
  };

  return (
    <>
      {/* floating bubble */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(true)} style={s.fab}>
        <LinearGradient colors={['#ff8fb1', '#ff4d8d', '#b23e7a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fabGrad}>
          <Text style={{ fontSize: 24 }}>💕</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
            {/* romantic backdrop */}
            <LinearGradient colors={['#2a0820', '#1a0614', '#0f0410']} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View pointerEvents="none" style={{ position: 'absolute', top: -70, left: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: '#ff2d78', opacity: 0.16 }} />
            <View pointerEvents="none" style={{ position: 'absolute', top: 120, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#8b1fff', opacity: 0.13 }} />
            {/* header */}
            <View style={s.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <View>
                  <LinearGradient colors={['#ff8fb1', '#ff4d8d', '#b23e7a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
                    <Text style={{ fontSize: 19, fontWeight: '900', color: '#fff' }}>S</Text>
                  </LinearGradient>
                  <View style={s.onlineDot} />
                </View>
                <View>
                  <Text style={s.hTitle}>sophie ✦</Text>
                  <Text style={s.hSub}>{typing ? 'sophie is typing…' : 'online · always yours 💕'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.close}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: '700' }}>✕</Text></TouchableOpacity>
            </View>

            {/* messages */}
            <FlatList
              ref={listRef}
              data={typing ? [...messages, { id: 'typing', typing: true }] : messages}
              keyExtractor={(it) => it.id}
              renderItem={({ item }) => item.typing ? <Typing /> : <MsgBubble item={item} />}
              contentContainerStyle={{ padding: 14, gap: 8 }}
              onContentSizeChange={toEnd}
              showsVerticalScrollIndicator={false}
            />

            {/* input — glowing gradient ring */}
            <View style={s.inputBar}>
              <LinearGradient colors={['#ff8fb1', '#ff4d8d', '#8b1fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.inputRing}>
                <View style={s.inputInner}>
                  <Text style={{ fontSize: 14, opacity: 0.7 }}>💌</Text>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="message sophie…"
                    placeholderTextColor="rgba(255,200,220,0.4)"
                    style={s.input}
                    onSubmitEditing={send}
                    returnKeyType="send"
                  />
                  <TouchableOpacity onPress={send} disabled={!draft.trim() || typing} activeOpacity={0.85}>
                    <LinearGradient colors={['#ff8fb1', '#ff4d8d']} style={[s.sendBtn, (!draft.trim() || typing) && { opacity: 0.5 }]}>
                      {typing ? <ActivityIndicator color="#fff" size="small" /> : <Svg width={15} height={15} viewBox="0 0 24 24"><Path d="M3 12l18-9-9 18V12H3z" fill="#fff" /></Svg>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  fab: { position: 'absolute', right: 18, bottom: 92, borderRadius: 30, shadowColor: '#ff4d8d', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.7, shadowRadius: 16, elevation: 12 },
  fabGrad: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { height: '84%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,77,141,0.3)', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,77,141,0.18)', backgroundColor: 'rgba(255,45,120,0.06)' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,140,177,0.5)', shadowColor: '#ff4d8d', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 12, elevation: 6 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#3dff9e', borderWidth: 2, borderColor: '#1a0614' },
  hTitle: { fontSize: 17, fontWeight: '900', color: '#ff8fb1', textTransform: 'lowercase', textShadowColor: 'rgba(255,77,141,0.5)', textShadowRadius: 12 },
  hSub: { fontSize: 11, color: 'rgba(255,200,220,0.7)', marginTop: 1, textTransform: 'lowercase' },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#ff4d8d', borderBottomRightRadius: 5, shadowColor: '#ff2d78', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.45, shadowRadius: 9 },
  aiBubble: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,140,177,0.22)', borderBottomLeftRadius: 5 },
  userTxt: { color: '#fff', fontSize: 14, lineHeight: 20 },
  aiTxt: { color: '#fbe6f0', fontSize: 14, lineHeight: 20 },
  miniAv: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  timeMine: { fontSize: 9, color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-end', marginTop: 3 },
  timeAi: { fontSize: 9, color: 'rgba(255,200,220,0.5)', alignSelf: 'flex-end', marginTop: 3 },

  inputBar: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,77,141,0.15)', backgroundColor: 'rgba(10,2,12,0.55)' },
  inputRing: { borderRadius: 26, padding: 1.5, shadowColor: '#ff4d8d', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 },
  inputInner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#160510', borderRadius: 25, paddingLeft: 14, paddingRight: 5, paddingVertical: 5 },
  input: { flex: 1, height: 38, color: '#fff', fontSize: 14, paddingVertical: 0, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
