import express from 'express';
import chatmessage from '../models/chatmessage.js';

const router = express.Router();

// Ephemeral "is typing" state, kept in memory: linkcode -> { creator: ts, joiner: ts }
const typingMap = new Map();
const TYPING_TTL = 4000;
// Last time each role had the chat open (for read receipts): linkcode -> { creator: ts, joiner: ts }
const readMap = new Map();

// GET /api/chat/:linkcode?since=<ISO>  — messages (optionally only newer than `since`)
router.get('/:linkcode', async (req, res) => {
  const lc = (req.params.linkcode || '').toLowerCase();
  const { since } = req.query;
  try {
    const q = { linkcode: lc };
    if (since) {
      const d = new Date(since);
      if (!isNaN(d)) q.createdat = { $gt: d };
    }
    // newest 200, returned oldest-first
    const docs = await chatmessage.find(q).sort({ createdat: -1 }).limit(200).lean();
    res.status(200).json({ messages: docs.reverse() });
  } catch (err) {
    res.status(500).json({ error: 'failed to load messages' });
  }
});

// GET /api/chat/:linkcode/unread?role=<myrole>&since=<ISO> — count partner msgs unseen
router.get('/:linkcode/unread', async (req, res) => {
  const lc = (req.params.linkcode || '').toLowerCase();
  const { role, since } = req.query;
  try {
    const q = { linkcode: lc };
    if (role) q.role = role === 'creator' ? 'joiner' : 'creator';   // the partner's messages
    if (since) { const d = new Date(since); if (!isNaN(d)) q.createdat = { $gt: d }; }
    const count = await chatmessage.countDocuments(q);
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ error: 'failed to count' });
  }
});

// POST /api/chat/typing { linkcode, role } — heartbeat while composing
router.post('/typing', (req, res) => {
  const { linkcode, role } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  const e = typingMap.get(lc) || {};
  e[role] = Date.now();
  typingMap.set(lc, e);
  res.status(200).json({ ok: true });
});

// POST /api/chat/read { linkcode, role } — I currently have the chat open / just read
router.post('/read', (req, res) => {
  const { linkcode, role } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  const e = readMap.get(lc) || {};
  e[role] = Date.now();
  readMap.set(lc, e);
  res.status(200).json({ ok: true });
});

// GET /api/chat/:linkcode/typing?role=<myrole> — partner typing? + partner's last-read time
router.get('/:linkcode/typing', (req, res) => {
  const lc = (req.params.linkcode || '').toLowerCase();
  const partner = req.query.role === 'creator' ? 'joiner' : 'creator';
  const te = typingMap.get(lc) || {};
  const re = readMap.get(lc) || {};
  res.status(200).json({
    typing: Date.now() - (te[partner] || 0) < TYPING_TTL,
    partnerReadAt: re[partner] || 0,
  });
});

// POST /api/chat/send { linkcode, role, name, text }
router.post('/send', async (req, res) => {
  const { linkcode, role, name, text } = req.body;
  if (!linkcode || !role || !text || !text.trim()) return res.status(400).json({ error: 'missing fields' });
  try {
    const lc = linkcode.toLowerCase();
    const msg = await chatmessage.create({
      linkcode: lc,
      role,
      name: name || '',
      text: text.trim().slice(0, 2000),
    });
    const e = typingMap.get(lc); if (e) { e[role] = 0; }   // stop showing me as typing
    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: 'failed to send' });
  }
});

export default router;
