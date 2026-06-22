import express from 'express';
import clubgame from '../models/clubgame.js';

const router = express.Router();

const maybeStart = (g) => {
  if (g.status === 'lobby' && g.players.length >= g.required) {
    g.status = 'playing';
    g.seed = Math.floor(Math.random() * 1e9);
    g.startat = new Date(Date.now() + 3200);   // shared 3s countdown
  }
};

// POST /api/clubgame/invite { clubcode, game, hostemail, hostname, players } — host opens a lobby
router.post('/invite', async (req, res) => {
  const { clubcode, game, hostemail, hostname, players } = req.body;
  if (!clubcode || !hostemail || !players) return res.status(400).json({ error: 'missing fields' });
  try {
    const lc = clubcode.toLowerCase();
    // drop any stale open lobby this host already has in this club
    await clubgame.deleteMany({ clubcode: lc, hostemail: hostemail.toLowerCase(), status: 'lobby' });
    const g = await clubgame.create({
      clubcode: lc, game: game || 'racer', hostemail: hostemail.toLowerCase(),
      required: Math.max(2, Math.min(5, Number(players))),
      players: [{ email: hostemail.toLowerCase(), name: hostname || '' }],
    });
    res.status(201).json({ session: g });
  } catch (err) {
    res.status(500).json({ error: 'failed to create session' });
  }
});

// POST /api/clubgame/join { sessionid, email, name }
router.post('/join', async (req, res) => {
  const { sessionid, email, name } = req.body;
  if (!sessionid || !email) return res.status(400).json({ error: 'missing fields' });
  try {
    const g = await clubgame.findById(sessionid);
    if (!g) return res.status(404).json({ error: 'session not found' });
    const em = email.toLowerCase();
    if (!g.players.some(p => p.email === em)) {
      if (g.status !== 'lobby') return res.status(403).json({ error: 'game already started' });
      if (g.players.length >= g.required) return res.status(403).json({ error: 'lobby full' });
      g.players.push({ email: em, name: name || '' });
      maybeStart(g);
      await g.save();
    }
    res.status(200).json({ session: g });
  } catch (err) {
    res.status(500).json({ error: 'failed to join' });
  }
});

// POST /api/clubgame/score { sessionid, email, score }
router.post('/score', async (req, res) => {
  const { sessionid, email, score } = req.body;
  if (!sessionid || !email) return res.status(400).json({ error: 'missing fields' });
  try {
    const g = await clubgame.findById(sessionid);
    if (!g) return res.status(404).json({ error: 'not found' });
    const p = g.players.find(p => p.email === email.toLowerCase());
    if (p) { p.score = Number(score) || 0; p.done = true; g.markModified('players'); }
    if (g.players.every(pl => pl.done)) g.status = 'done';
    await g.save();
    res.status(200).json({ session: g });
  } catch (err) {
    res.status(500).json({ error: 'failed to score' });
  }
});

// POST /api/clubgame/state { sessionid, state, scoremap, turnindex, status } — turn-based games
router.post('/state', async (req, res) => {
  const { sessionid, state, scoremap, turnindex, status } = req.body;
  if (!sessionid) return res.status(400).json({ error: 'missing fields' });
  try {
    const g = await clubgame.findById(sessionid);
    if (!g) return res.status(404).json({ error: 'not found' });
    if (state !== undefined) { g.state = state; g.markModified('state'); }
    if (scoremap !== undefined) { g.scoremap = scoremap; g.markModified('scoremap'); }
    if (typeof turnindex === 'number') g.turnindex = turnindex;
    if (status) g.status = status;
    await g.save();
    res.status(200).json({ session: g });
  } catch (err) {
    res.status(500).json({ error: 'failed to update state' });
  }
});

// GET /api/clubgame/active/:clubcode — open lobbies for this club (for the inbox)
router.get('/active/:clubcode', async (req, res) => {
  const lc = (req.params.clubcode || '').toLowerCase();
  try {
    const since = new Date(Date.now() - 10 * 60 * 1000);   // ignore lobbies older than 10m
    const sessions = await clubgame.find({ clubcode: lc, status: 'lobby', createdat: { $gt: since } }).sort({ createdat: -1 }).lean();
    res.status(200).json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'failed to load' });
  }
});

// GET /api/clubgame/:id — session state (poll)
router.get('/:id', async (req, res) => {
  try {
    const g = await clubgame.findById(req.params.id).lean();
    if (!g) return res.status(404).json({ error: 'not found' });
    res.status(200).json({ session: g });
  } catch (err) {
    res.status(500).json({ error: 'failed to load' });
  }
});

// POST /api/clubgame/cancel { sessionid }
router.post('/cancel', async (req, res) => {
  try { await clubgame.findByIdAndDelete(req.body.sessionid); res.status(200).json({ ok: true }); }
  catch (err) { res.status(500).json({ error: 'failed' }); }
});

export default router;
