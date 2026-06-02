import express from 'express';
import inboxmessage from '../models/inboxmessage.js';

const router = express.Router();

// POST /api/inbox/send — save a letter or mood from one partner
router.post('/send', async (req, res) => {
  const { linkcode, from, fromname, type, emoji, content, game } = req.body;

  if (!linkcode || !from || !type || !content) {
    return res.status(400).json({ error: 'missing fields' });
  }

  try {
    const msg = await inboxmessage.create({
      linkcode: linkcode.toLowerCase(), from, fromname, type, emoji, content,
      game: game || '',
      readby: [from],  // sender has already "read" their own message
    });
    res.status(201).json({ id: msg._id });
  } catch (err) {
    res.status(500).json({ error: 'failed to send message' });
  }
});

// POST /api/inbox/clear-invites — remove game-invite notifications for a home
// (called when an invite is accepted or the game ends, so they don't linger)
router.post('/clear-invites', async (req, res) => {
  const { linkcode } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'missing linkcode' });
  try {
    await inboxmessage.deleteMany({ linkcode: linkcode.toLowerCase(), type: 'game' });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to clear invites' });
  }
});

// GET /api/inbox/:linkcode — return all messages for this home, newest first
router.get('/:linkcode', async (req, res) => {
  try {
    const messages = await inboxmessage
      .find({ linkcode: req.params.linkcode.toLowerCase() })
      .sort({ createdat: -1 })
      .limit(100)
      .lean();
    res.status(200).json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch messages' });
  }
});

// POST /api/inbox/read — mark all messages as read for a given role
router.post('/read', async (req, res) => {
  const { linkcode, role } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });

  try {
    await inboxmessage.updateMany(
      { linkcode: linkcode.toLowerCase(), readby: { $ne: role } },
      { $addToSet: { readby: role } }
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to mark read' });
  }
});

export default router;
