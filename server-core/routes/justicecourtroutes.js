// routes/justicecourtroutes.js — isolated AI Justice Court API (separate from /api/ai).
import express from 'express';
import courtcase from '../models/courtcase.js';

const router = express.Router();

// dedicated court key (falls back to the main Groq key so it works out of the box)
const COURT_URL = process.env.GROQ_COURT_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const COURT_MODEL = process.env.GROQ_COURT_MODEL || 'llama-3.1-8b-instant';   // llama3-8b-8192 retired on Groq
const courtKey = () => process.env.GROQ_COURT_API_KEY || process.env.GROK_API_KEY || process.env.GROQ_API_KEY;

const buildJudgeSystem = (u1, u2) =>
`You are JUDGE GAVELTRON, a brilliantly witty, theatrical, and sharp-tongued Supreme Relationship Judge. You are reviewing a live argument between ${u1} and ${u2}.

CRITICAL TEXT ARCHITECTURE RULES:
- Write with absolute linguistic precision. Avoid circular logic, lazy writing, or repeating the same word twice in a sentence (e.g., NEVER say 'an excuse as flimsy as an excuse').
- Address them DIRECTLY by name (${u1} and ${u2}). NEVER use the words 'Plaintiff' or 'Defendant'.
- Break your verdict into two distinct, highly readable phases: The Roast (the observation) and The Sentence (the punishment).
- Tone: sharp celebrity-roast comic meets royal high-court magistrate. Highly dramatic, slightly petty, but incredibly smart. Keep it PG-13 and never cruel.

Strictly format your response EXACTLY like this template (raw text, no markdown, no code blocks):

⚖️ JUDGE GAVELTRON'S VERDICT ⚖️

THE ROAST:
[1-2 brilliant, razor-sharp sentences tearing down the logic of the at-fault partner, calling them out directly by name.]

THE SENTENCE:
[A highly specific, hilariously creative, actionable punishment using their names, ending with "Case closed!"]`;

// POST /api/justice-court/submit-message { linkcode, sender, name, text }
router.post('/submit-message', async (req, res) => {
  const { linkcode, sender, name, text } = req.body;
  if (!linkcode || !sender || !text || !text.trim()) return res.status(400).json({ error: 'missing fields' });
  if (!['PLAINTIFF', 'DEFENDANT'].includes(sender)) return res.status(400).json({ error: 'bad sender' });
  try {
    const lc = linkcode.toLowerCase();
    const c = await courtcase.findOneAndUpdate(
      { linkcode: lc },
      { $push: { messages: { sender, name: name || '', text: text.trim().slice(0, 2000) } }, $set: { updatedat: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );
    res.status(201).json({ ok: true, messages: c.messages });
  } catch (err) {
    res.status(500).json({ error: 'failed to submit' });
  }
});

// GET /api/justice-court/sync/:caseId — full synced log (caseId = linkcode)
router.get('/sync/:caseId', async (req, res) => {
  const lc = (req.params.caseId || '').toLowerCase();
  try {
    const c = await courtcase.findOne({ linkcode: lc }).lean();
    res.status(200).json({ messages: c ? c.messages.slice(-100) : [] });
  } catch (err) {
    res.status(500).json({ error: 'failed to sync' });
  }
});

// POST /api/justice-court/summon-judge { linkcode } — bang the gavel → AI verdict
router.post('/summon-judge', async (req, res) => {
  const lc = (req.body.linkcode || '').toLowerCase();
  const by = (req.body.by || '').trim();   // name of whoever banged the gavel (localUser)
  if (!lc) return res.status(400).json({ error: 'missing linkcode' });
  const KEY = courtKey();
  if (!KEY) return res.status(500).json({ error: 'court AI not configured' });
  try {
    const c = await courtcase.findOne({ linkcode: lc });
    if (!c || !c.messages.length) return res.status(400).json({ error: 'no case to judge yet' });

    // real first names per side (fall back gracefully)
    const nameFor = (side, fb) => (c.messages.find(m => m.sender === side && m.name)?.name) || fb;
    const a = nameFor('PLAINTIFF', 'Partner 1');
    const b = nameFor('DEFENDANT', 'Partner 2');
    // localUser = the one who banged the gavel; partnerUser = the other
    const localUser = by || a;
    const partnerUser = (by && by.toLowerCase() === b.toLowerCase()) ? a : b;

    const transcript = c.messages.slice(-20).filter(m => m.sender !== 'JUDGE')
      .map(m => `${m.name || (m.sender === 'PLAINTIFF' ? a : b)}: ${m.text}`).join('\n');

    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch(COURT_URL, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: COURT_MODEL, temperature: 0.7, max_tokens: 320,
        messages: [{ role: 'system', content: buildJudgeSystem(localUser, partnerUser) }, { role: 'user', content: `The transcript:\n${transcript}\n\nDeliver your verdict in the exact required format, Your Honor.` }],
      }),
    });
    clearTimeout(to);
    if (r.status === 429) return res.status(429).json({ error: 'the court is in recess (rate limit) — try again' });
    if (!r.ok) return res.status(502).json({ error: 'judge unavailable' });
    const data = await r.json();
    const verdict = data?.choices?.[0]?.message?.content?.trim() || '*BANG* CASE DISMISSED for absurdity!';

    c.messages.push({ sender: 'JUDGE', name: 'JUDGE GAVELTRON', text: verdict });
    c.updatedat = new Date();
    await c.save();
    res.status(200).json({ verdict, messages: c.messages.slice(-100) });
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'the judge fell asleep — try again' });
    res.status(500).json({ error: 'failed to summon judge' });
  }
});

// POST /api/justice-court/reset { linkcode } — start a fresh case
router.post('/reset', async (req, res) => {
  const lc = (req.body.linkcode || '').toLowerCase();
  try {
    await courtcase.findOneAndUpdate({ linkcode: lc }, { $set: { messages: [], updatedat: new Date() } }, { upsert: true });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to reset' });
  }
});

export default router;
