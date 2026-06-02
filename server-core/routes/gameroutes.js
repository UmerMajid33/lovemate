import express from 'express';
import gamesession from '../models/gamesession.js';
import gamelobby from '../models/gamelobby.js';
import racesession from '../models/racesession.js';
import goalsession from '../models/goalsession.js';
import duelsession from '../models/duelsession.js';
import wallet from '../models/wallet.js';

const router = express.Router();

const RACE_MS = 20000;       // race length
const RACE_COUNTDOWN = 3000; // countdown once both partners are in
const FC_WIN = 150, FC_LOSE = 50, FC_TIE = 100;

// FC reward for finishing one mini-game (base + small skill bonus, capped)
function fcForGame(score) {
  return 40 + Math.min(Math.round((Number(score) || 0) / 4), 110); // 40–150 FC
}

async function creditWallet(linkcode, role, name, amount, description) {
  try {
    await wallet.findOneAndUpdate(
      { linkcode, role },
      { $inc: { balance: amount }, $set: { name }, $push: { transactions: { type: 'earn', amount, description } } },
      { upsert: true }
    );
  } catch (_) {}
}

// POST /api/games/challenge
// Challenger has already played — creates session + records their score in one call
router.post('/challenge', async (req, res) => {
  const { linkcode, gametype, challengerrole, challengername, opponentname, score } = req.body;
  if (!linkcode || !gametype || !challengerrole || score === undefined) {
    return res.status(400).json({ error: 'missing fields' });
  }
  try {
    const session = await gamesession.create({
      linkcode: linkcode.toLowerCase(), gametype,
      challengerrole, challengername, opponentname,
      challengerscore: score, status: 'waiting',
    });
    res.status(201).json({ sessionid: session._id });
  } catch (err) {
    res.status(500).json({ error: 'failed to create challenge' });
  }
});

// POST /api/games/respond
// Opponent accepts the challenge and submits their score → completes session
router.post('/respond', async (req, res) => {
  const { sessionid, opponentrole, opponentname, score } = req.body;
  if (!sessionid || !opponentrole || score === undefined) {
    return res.status(400).json({ error: 'missing fields' });
  }
  try {
    const session = await gamesession.findById(sessionid);
    if (!session)                      return res.status(404).json({ error: 'session not found' });
    if (session.status === 'completed') return res.status(200).json({ session });

    session.opponentscore = score;
    session.opponentname  = opponentname || session.opponentname;
    session.status        = 'completed';
    session.completedat   = new Date();

    const cs = session.challengerscore;
    if (cs > score)      { session.winner = 'challenger'; session.fcearnedchallenger = FC_WIN; session.fcearnedopponent = FC_LOSE; }
    else if (score > cs) { session.winner = 'opponent';   session.fcearnedchallenger = FC_LOSE; session.fcearnedopponent = FC_WIN; }
    else                 { session.winner = 'tie';         session.fcearnedchallenger = FC_TIE; session.fcearnedopponent = FC_TIE; }

    const opponentRole = session.challengerrole === 'creator' ? 'joiner' : 'creator';
    const gameLabel    = `${session.gametype} game`;
    await creditWallet(session.linkcode, session.challengerrole, session.challengername, session.fcearnedchallenger, gameLabel);
    await creditWallet(session.linkcode, opponentRole, session.opponentname, session.fcearnedopponent, gameLabel);

    await session.save();
    res.status(200).json({ session });
  } catch (err) {
    res.status(500).json({ error: 'failed to respond' });
  }
});

// GET /api/games/waiting/:linkcode — sessions waiting for the opponent to play
router.get('/waiting/:linkcode', async (req, res) => {
  try {
    const sessions = await gamesession.find({
      linkcode: req.params.linkcode.toLowerCase(), status: 'waiting',
    }).sort({ createdat: -1 }).lean();
    res.status(200).json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch' });
  }
});

// GET /api/games/history/:linkcode — last 30 completed sessions
router.get('/history/:linkcode', async (req, res) => {
  try {
    const sessions = await gamesession.find({
      linkcode: req.params.linkcode.toLowerCase(), status: 'completed',
    }).sort({ completedat: -1 }).limit(30).lean();
    res.status(200).json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch' });
  }
});

// GET /api/games/stats/:linkcode/:role — wallet balance + win stats for the header
router.get('/stats/:linkcode/:role', async (req, res) => {
  const lc   = (req.params.linkcode || '').toLowerCase();
  const role = req.params.role;
  try {
    const w = await wallet.findOne({ linkcode: lc, role }).lean();
    const balance = w ? w.balance : 0;

    const sessions = await gamesession.find({ linkcode: lc, status: 'completed' })
      .sort({ completedat: -1 }).limit(100).lean();

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const didWin = (s) =>
      (s.winner === 'challenger' && s.challengerrole === role) ||
      (s.winner === 'opponent'   && s.challengerrole !== role);

    let winsToday = 0, streak = 0, streakOpen = true;
    for (const s of sessions) {
      const won = didWin(s);
      if (won && s.completedat && new Date(s.completedat) >= startOfDay) winsToday++;
      if (streakOpen) { if (won) streak++; else streakOpen = false; }
    }
    res.status(200).json({ balance, winsToday, streak });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch stats' });
  }
});

// ─── GAME LOBBY (invite / accept gate) ────────────────────────────────────────

// POST /api/games/lobby/invite — one partner invites the other (optionally to a specific game)
router.post('/lobby/invite', async (req, res) => {
  const { linkcode, fromrole, fromname, game } = req.body;
  if (!linkcode || !fromrole) return res.status(400).json({ error: 'missing fields' });
  try {
    const lobby = await gamelobby.findOneAndUpdate(
      { linkcode: linkcode.toLowerCase() },
      { $set: { status: 'pending', fromrole, fromname: fromname || '', game: game || '', updatedat: new Date() } },
      { upsert: true, new: true }
    );
    res.status(200).json({ lobby });
  } catch (err) {
    res.status(500).json({ error: 'failed to send invite' });
  }
});

// GET /api/games/lobby/:linkcode — current lobby state (for polling)
router.get('/lobby/:linkcode', async (req, res) => {
  try {
    const lobby = await gamelobby.findOne({ linkcode: req.params.linkcode.toLowerCase() }).lean();
    res.status(200).json({ lobby: lobby || { status: 'idle', fromrole: null, fromname: '' } });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch lobby' });
  }
});

// POST /api/games/lobby/accept — the invited partner accepts → arena goes live
router.post('/lobby/accept', async (req, res) => {
  const { linkcode } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'missing fields' });
  try {
    const lobby = await gamelobby.findOneAndUpdate(
      { linkcode: linkcode.toLowerCase() },
      { $set: { status: 'active', updatedat: new Date() } },
      { new: true }
    );
    res.status(200).json({ lobby });
  } catch (err) {
    res.status(500).json({ error: 'failed to accept' });
  }
});

// POST /api/games/lobby/leave — reset lobby to idle when someone exits
router.post('/lobby/leave', async (req, res) => {
  const { linkcode } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'missing fields' });
  try {
    await gamelobby.findOneAndUpdate(
      { linkcode: linkcode.toLowerCase() },
      { $set: { status: 'idle', fromrole: null, fromname: '', game: '', updatedat: new Date() } },
      { upsert: true }
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to leave' });
  }
});

// POST /api/games/bet — stake FC before a wager game (deducts from wallet)
router.post('/bet', async (req, res) => {
  const { linkcode, role, name, amount } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const amt = Math.max(0, Math.floor(amount || 0));
  if (amt === 0) return res.status(200).json({ ok: true, balance: null });
  try {
    const w = await wallet.findOne({ linkcode: linkcode.toLowerCase(), role });
    const bal = w ? w.balance : 0;
    if (bal < amt) return res.status(400).json({ error: 'not enough fc', balance: bal });
    await wallet.findOneAndUpdate(
      { linkcode: linkcode.toLowerCase(), role },
      { $inc: { balance: -amt }, $set: { name: name || (w ? w.name : '') }, $push: { transactions: { type: 'spend', amount: amt, description: 'game bet' } } },
      { upsert: true }
    );
    res.status(200).json({ ok: true, balance: bal - amt });
  } catch (err) {
    res.status(500).json({ error: 'failed to place bet' });
  }
});

// POST /api/games/cashout — credit an exact FC payout (e.g. bet × multiplier)
router.post('/cashout', async (req, res) => {
  const { linkcode, role, name, amount, description } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const amt = Math.max(0, Math.round(amount || 0));
  try {
    await creditWallet(linkcode.toLowerCase(), role, name || '', amt, description || 'cashout');
    const w = await wallet.findOne({ linkcode: linkcode.toLowerCase(), role }).lean();
    res.status(200).json({ ok: true, paid: amt, balance: w ? w.balance : amt });
  } catch (err) {
    res.status(500).json({ error: 'failed to cash out' });
  }
});

// ─── LIVE MULTIPLAYER RACE ────────────────────────────────────────────────────

// POST /api/games/race/join — enter the shared race. Start fires once BOTH are in.
router.post('/race/join', async (req, res) => {
  const { linkcode, role } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  const now = Date.now();
  try {
    let race = await racesession.findOne({ linkcode: lc });
    const over = race && race.startat && now > new Date(race.startat).getTime() + RACE_MS;

    if (!race || race.status === 'finished' || over) {
      // start a fresh race, this player waiting for the partner
      race = await racesession.findOneAndUpdate(
        { linkcode: lc },
        { $set: { status: 'waiting', joined: [role], startat: null, creatortaps: 0, joinertaps: 0, updatedat: new Date() } },
        { upsert: true, new: true }
      );
    } else {
      if (!race.joined.includes(role)) race.joined.push(role);
      if (race.joined.length >= 2 && !race.startat) {
        race.startat = new Date(now + RACE_COUNTDOWN); // both in → countdown begins
        race.status  = 'racing';
      }
      race.updatedat = new Date();
      await race.save();
    }

    res.status(200).json({
      status: race.status,
      startat: race.startat,
      serverNow: now,
      creatortaps: race.creatortaps,
      joinertaps: race.joinertaps,
    });
  } catch (err) {
    res.status(500).json({ error: 'failed to join race' });
  }
});

// POST /api/games/race/tap — report my running tap count (monotonic)
router.post('/race/tap', async (req, res) => {
  const { linkcode, role, taps } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  const field = role === 'creator' ? 'creatortaps' : 'joinertaps';
  try {
    const race = await racesession.findOne({ linkcode: lc });
    if (!race) return res.status(404).json({ error: 'no race' });
    if ((race[field] || 0) < taps) { race[field] = taps; race.updatedat = new Date(); await race.save(); }
    res.status(200).json({ creatortaps: race.creatortaps, joinertaps: race.joinertaps });
  } catch (err) {
    res.status(500).json({ error: 'failed to record tap' });
  }
});

// GET /api/games/race/:linkcode — current shared race state (for live polling)
router.get('/race/:linkcode', async (req, res) => {
  try {
    const race = await racesession.findOne({ linkcode: req.params.linkcode.toLowerCase() }).lean();
    res.status(200).json({ race: race || null, serverNow: Date.now() });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch race' });
  }
});

// ─── LIVE PENALTY SHOOTOUT (shooter vs keeper) ────────────────────────────────
function goalState(s) {
  return {
    status: s.status, shooterrole: s.shooterrole, round: s.round, totalrounds: s.totalrounds,
    shooterpicked: s.shooterpick != null, keeperpicked: s.keeperpick != null,
    shootergoals: s.shootergoals,
    lastround: s.lastround, lastshoot: s.lastshoot, lastkeep: s.lastkeep, lastgoal: s.lastgoal,
  };
}

const rndShooter = () => (Math.random() < 0.5 ? 'creator' : 'joiner');

// POST /api/games/goal/join — enter the shootout; starts once both are in.
// Roles are assigned randomly when a fresh match is created.
router.post('/goal/join', async (req, res) => {
  const { linkcode, role } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  try {
    // 1) If a previous match is finished, the first arriver atomically resets it.
    let s = await goalsession.findOneAndUpdate(
      { linkcode: lc, status: 'finished' },
      { $set: {
          status: 'waiting', joined: [role], shooterrole: rndShooter(),
          round: 0, shooterpick: null, keeperpick: null, shootergoals: 0,
          lastround: -1, lastshoot: null, lastkeep: null, lastgoal: false, updatedat: new Date(),
        } },
      { new: true }
    );

    // 2) Otherwise add me to the existing (or brand-new) waiting session.
    if (!s) {
      s = await goalsession.findOneAndUpdate(
        { linkcode: lc },
        {
          $addToSet: { joined: role },
          $set: { updatedat: new Date() },
          $setOnInsert: { status: 'waiting', shooterrole: rndShooter(), round: 0, totalrounds: 5, shootergoals: 0, lastround: -1 },
        },
        { upsert: true, new: true }
      );
      // 3) Both in → start playing.
      if (s.joined.length >= 2 && s.status === 'waiting') {
        s = await goalsession.findOneAndUpdate({ linkcode: lc }, { $set: { status: 'playing' } }, { new: true });
      }
    }
    res.status(200).json(goalState(s));
  } catch (err) {
    res.status(500).json({ error: 'failed to join shootout' });
  }
});

// POST /api/games/goal/pick — shooter or keeper locks their zone for this round
router.post('/goal/pick', async (req, res) => {
  const { linkcode, role, zone } = req.body;
  if (!linkcode || !role || !zone) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  try {
    const s = await goalsession.findOne({ linkcode: lc });
    if (!s || s.status !== 'playing') return res.status(400).json({ error: 'not in play' });

    const iShoot = role === s.shooterrole;
    if (iShoot) { if (s.shooterpick == null) s.shooterpick = zone; }
    else        { if (s.keeperpick  == null) s.keeperpick  = zone; }

    // both locked → resolve the round
    if (s.shooterpick != null && s.keeperpick != null) {
      const goal = s.shooterpick !== s.keeperpick;
      if (goal) s.shootergoals += 1;
      s.lastround = s.round;
      s.lastshoot = s.shooterpick;
      s.lastkeep  = s.keeperpick;
      s.lastgoal  = goal;
      s.round    += 1;
      s.shooterpick = null;
      s.keeperpick  = null;
      if (s.round >= s.totalrounds) s.status = 'finished';
    }
    s.updatedat = new Date();
    await s.save();
    res.status(200).json(goalState(s));
  } catch (err) {
    res.status(500).json({ error: 'failed to pick' });
  }
});

// GET /api/games/goal/:linkcode — current shootout state
router.get('/goal/:linkcode', async (req, res) => {
  try {
    const s = await goalsession.findOne({ linkcode: req.params.linkcode.toLowerCase() }).lean();
    res.status(200).json(s ? goalState(s) : { status: 'none' });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch' });
  }
});

// POST /api/games/goal/rematch — reset + swap who shoots
router.post('/goal/rematch', async (req, res) => {
  const { linkcode } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  try {
    const s = await goalsession.findOne({ linkcode: lc });
    if (!s) return res.status(404).json({ error: 'no session' });
    s.shooterrole = rndShooter(); // random roles each match
    s.round = 0; s.shootergoals = 0; s.shooterpick = null; s.keeperpick = null;
    s.lastround = -1; s.lastshoot = null; s.lastkeep = null; s.lastgoal = false;
    s.status = 'playing';
    s.updatedat = new Date();
    await s.save();
    res.status(200).json(goalState(s));
  } catch (err) {
    res.status(500).json({ error: 'failed to rematch' });
  }
});

// ─── GENERIC HEAD-TO-HEAD DUEL (live score for any 2-player game) ─────────────
function duelState(s) {
  return {
    status: s.status, gametype: s.gametype, startat: s.startat, seed: s.seed, serverNow: Date.now(),
    creatorscore: s.creatorscore, joinerscore: s.joinerscore,
    creatordone: s.creatordone, joinerdone: s.joinerdone,
  };
}

// POST /api/games/duel/join { linkcode, role, gametype, timed }
router.post('/duel/join', async (req, res) => {
  const { linkcode, role, gametype, timed } = req.body;
  if (!linkcode || !role || !gametype) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  const now = Date.now();
  try {
    let s = await duelsession.findOne({ linkcode: lc });
    const stale = !s || s.gametype !== gametype || (s.creatordone && s.joinerdone);

    if (stale) {
      s = await duelsession.findOneAndUpdate(
        { linkcode: lc },
        { $set: {
            gametype, status: 'waiting', joined: [role], startat: null, seed: 0,
            creatorscore: 0, joinerscore: 0, creatordone: false, joinerdone: false, updatedat: new Date(),
          } },
        { upsert: true, new: true }
      );
    } else {
      s = await duelsession.findOneAndUpdate(
        { linkcode: lc },
        { $addToSet: { joined: role }, $set: { updatedat: new Date() } },
        { new: true }
      );
      if (s.joined.length >= 2 && s.status === 'waiting') {
        const set = { status: 'playing' };
        if (timed && !s.startat) set.startat = new Date(now + 3000);
        if (!s.seed) set.seed = Math.floor(Math.random() * 1e9); // shared randomness for both clients
        s = await duelsession.findOneAndUpdate({ linkcode: lc }, { $set: set }, { new: true });
      }
    }
    res.status(200).json(duelState(s));
  } catch (err) {
    res.status(500).json({ error: 'failed to join duel' });
  }
});

// POST /api/games/duel/score { linkcode, role, score, done }
router.post('/duel/score', async (req, res) => {
  const { linkcode, role, score, done } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  const sf = role === 'creator' ? 'creatorscore' : 'joinerscore';
  const df = role === 'creator' ? 'creatordone'  : 'joinerdone';
  try {
    const s = await duelsession.findOne({ linkcode: lc });
    if (!s) return res.status(404).json({ error: 'no duel' });
    if (typeof score === 'number' && (s[sf] || 0) < score) s[sf] = score;
    if (done) s[df] = true;
    s.updatedat = new Date();
    await s.save();
    res.status(200).json(duelState(s));
  } catch (err) {
    res.status(500).json({ error: 'failed to score' });
  }
});

// GET /api/games/duel/:linkcode
router.get('/duel/:linkcode', async (req, res) => {
  try {
    const s = await duelsession.findOne({ linkcode: req.params.linkcode.toLowerCase() }).lean();
    res.status(200).json(s ? duelState(s) : { status: 'none', serverNow: Date.now() });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch duel' });
  }
});

// POST /api/games/earn — credit FC to one partner for finishing a mini-game
router.post('/earn', async (req, res) => {
  const { linkcode, role, name, gametype, score } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  try {
    const fc = fcForGame(score);
    await creditWallet(linkcode.toLowerCase(), role, name || '', fc, `${gametype || 'mini'} game`);
    const w = await wallet.findOne({ linkcode: linkcode.toLowerCase(), role }).lean();
    res.status(200).json({ fcEarned: fc, balance: w ? w.balance : fc });
  } catch (err) {
    res.status(500).json({ error: 'failed to credit fc' });
  }
});

export default router;
