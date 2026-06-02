import express from 'express';
import presence from '../models/presence.js';

const router = express.Router();

// POST /api/home/presence  — heartbeat: upsert name + lastseen for a role
router.post('/presence', async (req, res) => {
  const { linkcode, role, name } = req.body;

  if (!linkcode || !role) {
    return res.status(400).json({ error: 'linkcode and role are required' });
  }

  try {
    await presence.findOneAndUpdate(
      { linkcode: linkcode.toLowerCase(), role },
      { $set: { name: name || '', lastseen: new Date() } },
      { upsert: true, new: true }
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to update presence' });
  }
});

// GET /api/home/presence/:linkcode  — return both partners' name + lastseen
router.get('/presence/:linkcode', async (req, res) => {
  try {
    const records = await presence
      .find({ linkcode: req.params.linkcode.toLowerCase() })
      .select('role name lastseen -_id')
      .lean();

    const result = { creator: null, joiner: null };
    records.forEach(r => { result[r.role] = { name: r.name, lastseen: r.lastseen }; });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch presence' });
  }
});

export default router;
