import express from 'express';
import clubscore from '../models/clubscore.js';

const router = express.Router();

// POST /api/clubscore { clubcode, email, name, game, score } — keep the best per game
router.post('/', async (req, res) => {
  const { clubcode, email, name, game, score } = req.body;
  if (!clubcode || !email || !game) return res.status(400).json({ error: 'missing fields' });
  const lc = clubcode.toLowerCase(), em = email.toLowerCase();
  const sc = Number(score) || 0;
  try {
    const row = await clubscore.findOne({ clubcode: lc, email: em, game });
    if (!row) {
      await clubscore.create({ clubcode: lc, email: em, name: name || '', game, best: sc });
    } else if (sc > row.best) {
      row.best = sc; row.name = name || row.name; row.updatedat = new Date(); await row.save();
    } else if (name && row.name !== name) {
      row.name = name; await row.save();
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to save score' });
  }
});

// GET /api/clubscore/:clubcode — leaderboard: each member's total of best scores
router.get('/:clubcode', async (req, res) => {
  const lc = (req.params.clubcode || '').toLowerCase();
  try {
    const rows = await clubscore.find({ clubcode: lc }).lean();
    const byEmail = {};
    for (const r of rows) {
      if (!byEmail[r.email]) byEmail[r.email] = { email: r.email, name: r.name, points: 0, games: 0 };
      byEmail[r.email].points += r.best;
      byEmail[r.email].games += 1;
      if (r.name) byEmail[r.email].name = r.name;
    }
    const board = Object.values(byEmail).sort((a, b) => b.points - a.points);
    res.status(200).json({ board });
  } catch (err) {
    res.status(500).json({ error: 'failed to load leaderboard' });
  }
});

export default router;
