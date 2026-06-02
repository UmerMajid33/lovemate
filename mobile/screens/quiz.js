// screens/quiz.js — couple general-knowledge quiz (invite → both answer → reveal).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../utils/api.js';
import { colors, spacing, radius, type, shadow, fonts } from '../theme/theme.js';
import SpaceBackground from '../theme/SpaceBackground.js';

const POLL = 2500;

async function qGet(p)        { try { const r = await fetch(`${API_BASE}${p}`); return r.ok ? r.json() : null; } catch { return null; } }
async function qPost(p, body) { try { const r = await fetch(`${API_BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.ok ? r.json() : null; } catch { return null; } }

export default function Quiz({ onNavigate, params = {} }) {
  const { linkCode = '', role = 'creator', user = {}, autoAccept = false } = params;
  const partnerRole = role === 'creator' ? 'joiner' : 'creator';

  const [quiz, setQuiz]   = useState(null);
  const [pick, setPick]   = useState(null);   // my local selection (pre-submit)
  const [busy, setBusy]   = useState(false);
  const startedRef = useRef(false);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    const d = await qGet(`/api/quiz/${linkCode}`);
    if (d) setQuiz(d.quiz);
  }, [linkCode]);

  // kick off: inviter sends invite, accepter accepts
  useEffect(() => {
    (async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      if (autoAccept) await qPost('/api/quiz/accept', { linkcode: linkCode });
      else            await qPost('/api/quiz/invite', { linkcode: linkCode, fromrole: role, fromname: user?.name || 'partner' });
      refresh();
    })();
    pollRef.current = setInterval(refresh, POLL);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  // reset my pick whenever the question advances
  const curIdx = quiz?.current;
  useEffect(() => { setPick(null); }, [curIdx]);

  const iAnswered = quiz?.myAnswered?.[role];
  const reveal    = quiz?.bothAnswered;

  const submit = async () => {
    if (pick === null || iAnswered) return;
    setBusy(true);
    const d = await qPost('/api/quiz/answer', { linkcode: linkCode, role, qindex: quiz.current, option: pick });
    if (d) setQuiz(d.quiz);
    setBusy(false);
  };
  const next = async () => {
    setBusy(true);
    const d = await qPost('/api/quiz/next', { linkcode: linkCode });
    if (d) setQuiz(d.quiz);
    setBusy(false);
  };
  const leave = () => { qPost('/api/quiz/leave', { linkcode: linkCode }); onNavigate?.('castle', params); };

  const myScore = quiz?.scores?.[role] || 0;
  const pScore  = quiz?.scores?.[partnerRole] || 0;

  // ── header ──
  const Header = () => (
    <View style={s.header}>
      <TouchableOpacity onPress={leave} style={s.iconBtn}><Text style={s.iconTxt}>←</Text></TouchableOpacity>
      <Text style={s.kicker}>quiz</Text>
      <View style={s.scorePill}>
        <Text style={s.scoreYou}>you {myScore}</Text>
        <Text style={s.scoreVs}>·</Text>
        <Text style={s.scoreThem}>them {pScore}</Text>
      </View>
    </View>
  );

  const Shell = ({ children }) => (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <SpaceBackground />
      <Header />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xxl }}>{children}</View>
    </View>
  );

  if (!quiz) return <Shell><ActivityIndicator color={colors.accent} size="large" /></Shell>;

  // ── lobby (waiting for accept) ──
  if (quiz.status === 'pending') {
    return (
      <Shell>
        <View style={{ alignItems: 'center', gap: spacing.lg }}>
          <Text style={{ fontSize: 50 }}>🧠</Text>
          <Text style={s.title}>general knowledge</Text>
          <Text style={s.sub}>invite sent — waiting for your partner to accept…</Text>
          <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
        </View>
      </Shell>
    );
  }

  // ── done ──
  if (quiz.status === 'done') {
    const win = myScore === pScore ? 'a perfect tie' : myScore > pScore ? 'you lead' : 'your partner leads';
    return (
      <Shell>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <Text style={{ fontSize: 50 }}>🏆</Text>
          <Text style={s.title}>quiz complete</Text>
          <Text style={s.bigScore}>{myScore}  ·  {pScore}</Text>
          <Text style={s.sub}>{win}</Text>
          <TouchableOpacity onPress={leave} style={s.btnWrap} activeOpacity={0.9}>
            <LinearGradient colors={['#EC7186', colors.accent, '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
              <Text style={s.btnTxt}>back home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Shell>
    );
  }

  // ── active question ──
  const q = quiz.question;
  return (
    <Shell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.xl }}>
        <Text style={s.qcount}>question {quiz.current + 1} of {quiz.total}</Text>
        <Text style={s.question}>{q?.q}</Text>

        <View style={{ gap: 12, marginTop: spacing.xxl }}>
          {q?.options.map((opt, i) => {
            const selected = (iAnswered ? quiz.picks?.[role] : pick) === i;
            let bc = colors.hairline2, bg = colors.surface, fg = colors.text;
            if (reveal) {
              if (i === q.answer)                 { bc = colors.sage;   bg = 'rgba(127,169,140,0.14)'; fg = '#cdebd6'; }
              else if (selected)                  { bc = colors.danger; bg = 'rgba(194,97,91,0.14)';  fg = '#f0c0bc'; }
            } else if (selected)                  { bc = colors.accent; bg = colors.accentDim; }
            return (
              <TouchableOpacity key={i} activeOpacity={0.85}
                disabled={iAnswered || reveal}
                onPress={() => setPick(i)}
                style={[s.opt, { borderColor: bc, backgroundColor: bg }]}>
                <Text style={[s.optLetter, { color: fg }]}>{String.fromCharCode(65 + i)}</Text>
                <Text style={[s.optText, { color: fg }]}>{opt}</Text>
                {reveal && i === q.answer && <Text style={s.tick}>✓</Text>}
                {reveal && quiz.picks?.[partnerRole] === i && <Text style={s.partnerTag}>them</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.xxl }}>
          {reveal ? (
            <TouchableOpacity onPress={next} disabled={busy} style={s.btnWrap} activeOpacity={0.9}>
              <LinearGradient colors={['#EC7186', colors.accent, '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                <Text style={s.btnTxt}>{quiz.current + 1 >= quiz.total ? 'see results' : 'next question'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : iAnswered ? (
            <View style={s.waitBox}><Text style={s.waitTxt}>answer locked — waiting for your partner…</Text></View>
          ) : (
            <TouchableOpacity onPress={submit} disabled={pick === null || busy} style={[s.btnWrap, (pick === null) && { opacity: 0.4 }]} activeOpacity={0.9}>
              <LinearGradient colors={['#EC7186', colors.accent, '#B23E54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                <Text style={s.btnTxt}>submit answer</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </Shell>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { color: colors.text, fontSize: 19, fontWeight: '600' },
  kicker: { fontSize: 12, color: colors.textSoft, textTransform: 'uppercase', letterSpacing: 5 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.hairline, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  scoreYou: { fontSize: 11, color: colors.accentSoft, fontWeight: '700' },
  scoreVs: { fontSize: 11, color: colors.textMuted },
  scoreThem: { fontSize: 11, color: colors.textSoft, fontWeight: '700' },

  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.text, letterSpacing: -0.3, textAlign: 'center' },
  sub: { ...type.body, textAlign: 'center', maxWidth: 280 },
  bigScore: { fontFamily: fonts.serif, fontSize: 44, color: colors.accentSoft, letterSpacing: -1, marginVertical: 6 },

  qcount: { ...type.kicker, textAlign: 'center' },
  question: { fontFamily: fonts.serif, fontSize: 26, color: colors.text, lineHeight: 34, textAlign: 'center', marginTop: spacing.md },

  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, borderWidth: 1.5 },
  optLetter: { fontSize: 13, fontWeight: '800', width: 18 },
  optText: { flex: 1, fontSize: 15, fontWeight: '500' },
  tick: { color: colors.sage, fontSize: 16, fontWeight: '900' },
  partnerTag: { fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, borderWidth: 1, borderColor: colors.hairline2, borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },

  btnWrap: { borderRadius: radius.lg, overflow: 'hidden', ...shadow.accent },
  btn: { height: 54, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  waitBox: { height: 54, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(201,168,106,0.35)', backgroundColor: 'rgba(201,168,106,0.08)', alignItems: 'center', justifyContent: 'center' },
  waitTxt: { fontSize: 13, color: colors.gold, fontWeight: '600' },
});
