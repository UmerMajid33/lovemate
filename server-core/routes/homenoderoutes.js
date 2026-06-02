import express from 'express';
import homenode from '../models/homenode.js';

const router = express.Router();

// POST /api/home/register — creator registers their home so partners can find it
router.post('/register', async (req, res) => {
  const { linkcode, homename, name, email } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'linkcode is required' });
  const lc = linkcode.trim().toLowerCase();
  const em = (email || '').trim().toLowerCase();
  try {
    let home = await homenode.findOne({ linkcode: lc });
    if (!home) {
      home = await homenode.create({
        linkcode: lc,
        homename: homename || 'our sanctuary',
        creatorname: name || '',
        creatoremail: em,
        members: em ? [em] : [],
      });
    } else {
      // keep the creator's chosen name fresh
      if (homename) home.homename = homename;
      if (name)     home.creatorname = name;
      if (em) {
        home.creatoremail = em;
        if (!home.members.includes(em)) home.members.push(em);
      }
      await home.save();
    }
    res.status(200).json({ home });
  } catch (err) {
    res.status(500).json({ error: 'failed to register home' });
  }
});

// POST /api/home/join — partner enters a bond code.
// Succeeds only if the home exists AND either (a) this email is already a
// member, or (b) there is a free slot. A full home (2 members) rejects others.
router.post('/join', async (req, res) => {
  const { linkcode, name, email } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'linkcode is required' });
  const lc = linkcode.trim().toLowerCase();
  const em = (email || '').trim().toLowerCase();
  try {
    const home = await homenode.findOne({ linkcode: lc });
    if (!home) return res.status(404).json({ error: 'no home found with this bond code' });

    // Self-heal: fold any emails stored only in the creator/joiner slots back into
    // `members`, so `members` is the single source of truth for occupancy. This
    // repairs homes written by older code that set the slot but not the array.
    const slotEmails = [home.creatoremail, home.joineremail].map(e => (e || '').trim().toLowerCase()).filter(Boolean);
    let healed = false;
    for (const e of slotEmails) {
      if (!home.members.includes(e)) { home.members.push(e); healed = true; }
    }
    if (healed) await home.save();

    const members = home.members || [];
    const alreadyMember = em && members.includes(em);

    // Home full and this person isn't one of the two → block, never displace.
    if (!alreadyMember && members.length >= 2) {
      return res.status(403).json({ error: 'this home is already full — it belongs to two people' });
    }

    if (em && !alreadyMember) {
      // Atomically claim the free slot; the members.1 guard re-checks size so a
      // race with a simultaneous joiner can never push the home past two.
      // First free slot becomes the creator's if that slot is still unclaimed,
      // otherwise the joiner's.
      const fillCreator = !home.creatoremail;
      const update = fillCreator
        ? { $addToSet: { members: em }, $set: { creatoremail: em, creatorname: name || home.creatorname } }
        : { $addToSet: { members: em }, $set: { joineremail: em,  joinername:  name || home.joinername  } };
      const claimed = await homenode.findOneAndUpdate(
        { linkcode: lc, members: { $ne: em }, 'members.1': { $exists: false } },
        update,
        { new: true }
      );
      if (!claimed) {
        return res.status(403).json({ error: 'this home is already full — it belongs to two people' });
      }
      return res.status(200).json({ home: claimed });
    }

    // Existing member re-entering (keep the right slot's name fresh). Only a
    // matching email may update a slot — an email-less request never overwrites
    // an existing member's name, so it can't quietly displace a partner.
    if (name && em) {
      if      (em === home.creatoremail) home.creatorname = name;
      else if (em === home.joineremail)  home.joinername  = name;
      await home.save();
    }
    res.status(200).json({ home });
  } catch (err) {
    res.status(500).json({ error: 'failed to join home' });
  }
});

// GET /api/home/mine/:email — every home this account belongs to (cross-device,
// survives a cleared cache or a fresh login on another browser).
router.get('/mine/:email', async (req, res) => {
  const email = (req.params.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const nodes = await homenode.find({ members: email }).lean();
    const homes = nodes.map(n => ({
      linkCode:  n.linkcode,
      homeName:  n.homename || 'our sanctuary',
      role:      n.creatoremail === email ? 'creator' : 'joiner',
      createdAt: n.createdat ? new Date(n.createdat).getTime() : Date.now(),
    }));
    res.status(200).json({ homes });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch homes' });
  }
});

// POST /api/home/anniversary — set the shared anniversary date for a home
router.post('/anniversary', async (req, res) => {
  const { linkcode, date } = req.body;
  if (!linkcode || !date) return res.status(400).json({ error: 'linkcode and date required' });
  try {
    await homenode.findOneAndUpdate(
      { linkcode: linkcode.trim().toLowerCase() },
      { $set: { anniversary: date } },
      { upsert: false }
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to save anniversary' });
  }
});

// GET /api/home/anniversary/:linkcode — read this home's anniversary date
router.get('/anniversary/:linkcode', async (req, res) => {
  try {
    const h = await homenode.findOne({ linkcode: req.params.linkcode.toLowerCase() }).lean();
    res.status(200).json({ anniversary: h?.anniversary || '' });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch anniversary' });
  }
});

// GET /api/home/info/:linkcode — look up a home's details
router.get('/info/:linkcode', async (req, res) => {
  try {
    const home = await homenode.findOne({ linkcode: req.params.linkcode.toLowerCase() }).lean();
    res.status(200).json({ home: home || null });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch home' });
  }
});

export default router;
