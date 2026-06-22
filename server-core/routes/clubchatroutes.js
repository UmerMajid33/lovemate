import express from 'express';
import clubmessage from '../models/clubmessage.js';

const router = express.Router();

// in-memory "is typing": clubcode -> { email: { name, ts } }
const typingMap = new Map();
const TTL = 4000;

// GET /api/clubchat/:clubcode/typing?email=<me> — who else is typing right now
router.get('/:clubcode/typing', (req, res) => {
  const lc = (req.params.clubcode || '').toLowerCase();
  const me = (req.query.email || '').toLowerCase();
  const e = typingMap.get(lc) || {};
  const now = Date.now();
  const names = Object.entries(e)
    .filter(([email, v]) => email !== me && now - v.ts < TTL)
    .map(([, v]) => v.name || 'someone');
  res.status(200).json({ typingNames: names });
});

// GET /api/clubchat/:clubcode?since=<ISO> — messages (optionally newer than since)
router.get('/:clubcode', async (req, res) => {
  const lc = (req.params.clubcode || '').toLowerCase();
  const { since } = req.query;
  try {
    const q = { clubcode: lc };
    if (since) { const d = new Date(since); if (!isNaN(d)) q.createdat = { $gt: d }; }
    const docs = await clubmessage.find(q).sort({ createdat: -1 }).limit(200).lean();
    res.status(200).json({ messages: docs.reverse() });
  } catch (err) {
    res.status(500).json({ error: 'failed to load messages' });
  }
});

// POST /api/clubchat/typing { clubcode, email, name }
router.post('/typing', (req, res) => {
  const { clubcode, email, name } = req.body;
  if (!clubcode || !email) return res.status(400).json({ error: 'missing fields' });
  const lc = clubcode.toLowerCase();
  const e = typingMap.get(lc) || {};
  e[email.toLowerCase()] = { name: name || '', ts: Date.now() };
  typingMap.set(lc, e);
  res.status(200).json({ ok: true });
});

// POST /api/clubchat/send { clubcode, email, name, text }
router.post('/send', async (req, res) => {
  const { clubcode, email, name, text } = req.body;
  if (!clubcode || !email || !text || !text.trim()) return res.status(400).json({ error: 'missing fields' });
  try {
    const lc = clubcode.toLowerCase();
    const msg = await clubmessage.create({ clubcode: lc, email: email.toLowerCase(), name: name || '', text: text.trim().slice(0, 2000) });
    const e = typingMap.get(lc); if (e && e[email.toLowerCase()]) e[email.toLowerCase()].ts = 0;
    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: 'failed to send' });
  }
});

export default router;
