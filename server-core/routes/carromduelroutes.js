import express from 'express';
import carromduel from '../models/carromduel.js';

const router = express.Router();

// GET /api/carromduel/:linkcode — current duel (creates a fresh one if none)
router.get('/:linkcode', async (req, res) => {
  const lc = (req.params.linkcode || '').toLowerCase();
  try {
    let d = await carromduel.findOne({ linkcode: lc });
    if (!d) d = await carromduel.create({ linkcode: lc });
    res.status(200).json({ duel: d });
  } catch (err) {
    res.status(500).json({ error: 'failed to load duel' });
  }
});

// POST /api/carromduel/state { linkcode, state, turn, scoremap, status }
router.post('/state', async (req, res) => {
  const { linkcode, state, turn, scoremap, status } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  try {
    const set = { updatedat: new Date() };
    if (state !== undefined) set.state = state;
    if (typeof turn === 'number') set.turn = turn;
    if (scoremap !== undefined) set.scoremap = scoremap;
    if (status) set.status = status;
    const d = await carromduel.findOneAndUpdate({ linkcode: lc }, { $set: set }, { upsert: true, returnDocument: 'after' });
    res.status(200).json({ duel: d });
  } catch (err) {
    res.status(500).json({ error: 'failed to update' });
  }
});

// POST /api/carromduel/reset { linkcode } — new round
router.post('/reset', async (req, res) => {
  const lc = (req.body.linkcode || '').toLowerCase();
  try {
    const d = await carromduel.findOneAndUpdate(
      { linkcode: lc },
      { $set: { state: null, turn: 0, scoremap: {}, status: 'playing', updatedat: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );
    res.status(200).json({ duel: d });
  } catch (err) {
    res.status(500).json({ error: 'failed to reset' });
  }
});

export default router;
