import express from 'express';
import homeleave from '../models/homeleave.js';
import homenode from '../models/homenode.js';
import presence from '../models/presence.js';

const router = express.Router();

const roleField = (role) => (role === 'creator' ? 'creatorwantsleave' : 'joinerwantsleave');
const PARTNER_ONLINE_MS = 5 * 60 * 1000; // partner counts as "connected" if seen in last 5 min

// Has the OTHER partner actually joined / been present in this home?
async function partnerConnected(lc, role) {
  const partnerRole = role === 'creator' ? 'joiner' : 'creator';
  const [home, pres] = await Promise.all([
    homenode.findOne({ linkcode: lc }).lean(),
    presence.findOne({ linkcode: lc, role: partnerRole }).lean(),
  ]);
  const partnerName = home ? (partnerRole === 'creator' ? home.creatorname : home.joinername) : '';
  const named  = !!(partnerName && partnerName.trim());
  const online = !!(pres && pres.lastseen && (Date.now() - new Date(pres.lastseen).getTime() < PARTNER_ONLINE_MS));
  return named || online;
}

// POST /api/home/leave-request — one partner asks to leave the home.
// If no partner is connected, the leave auto-agrees (nothing to wait for).
router.post('/leave-request', async (req, res) => {
  const { linkcode, role } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  try {
    const hasPartner = await partnerConnected(lc, role);

    const set = { [roleField(role)]: true, updatedat: new Date() };
    if (!hasPartner) {
      // solo home → auto-agree on the (absent) partner's behalf
      set.creatorwantsleave = true;
      set.joinerwantsleave  = true;
    }

    const doc = await homeleave.findOneAndUpdate(
      { linkcode: lc },
      { $set: set },
      { upsert: true, new: true }
    );
    res.status(200).json({
      creator: doc.creatorwantsleave,
      joiner:  doc.joinerwantsleave,
      bothAgreed: doc.creatorwantsleave && doc.joinerwantsleave,
    });
  } catch (err) {
    res.status(500).json({ error: 'failed to request leave' });
  }
});

// POST /api/home/leave-cancel — withdraw a leave request
router.post('/leave-cancel', async (req, res) => {
  const { linkcode, role } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  try {
    const doc = await homeleave.findOneAndUpdate(
      { linkcode: linkcode.toLowerCase() },
      { $set: { [roleField(role)]: false, updatedat: new Date() } },
      { upsert: true, new: true }
    );
    res.status(200).json({
      creator: doc.creatorwantsleave,
      joiner:  doc.joinerwantsleave,
      bothAgreed: doc.creatorwantsleave && doc.joinerwantsleave,
    });
  } catch (err) {
    res.status(500).json({ error: 'failed to cancel leave' });
  }
});

// POST /api/home/leave-reset — clear both flags (called when a home is created/joined/dissolved)
router.post('/leave-reset', async (req, res) => {
  const { linkcode } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'missing fields' });
  try {
    await homeleave.findOneAndUpdate(
      { linkcode: linkcode.toLowerCase() },
      { $set: { creatorwantsleave: false, joinerwantsleave: false, updatedat: new Date() } },
      { upsert: true }
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to reset leave' });
  }
});

// POST /api/home/leave-finalize — actually remove THIS member once both agreed.
// Clears their slot + drops their email from members. Deletes the home only when
// nobody is left, so the staying partner never loses the home or its data.
router.post('/leave-finalize', async (req, res) => {
  const { linkcode, role, email } = req.body;
  if (!linkcode || !role) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  const em = (email || '').toLowerCase().trim();
  try {
    const home = await homenode.findOne({ linkcode: lc });
    if (!home) return res.status(200).json({ ok: true, dissolved: true });

    if (role === 'creator') { home.creatoremail = ''; home.creatorname = ''; }
    else                    { home.joineremail  = ''; home.joinername  = ''; }
    home.members = (home.members || []).filter(m => {
      const v = (m || '').toLowerCase();
      return v && v !== em;   // drop the leaving member's email
    });

    if (home.members.length === 0) {
      await homenode.deleteOne({ linkcode: lc });
      return res.status(200).json({ ok: true, dissolved: true });
    }
    await home.save();
    res.status(200).json({ ok: true, dissolved: false });
  } catch (err) {
    res.status(500).json({ error: 'failed to finalize leave' });
  }
});

// GET /api/home/leave-status/:linkcode — current leave agreement state
router.get('/leave-status/:linkcode', async (req, res) => {
  try {
    const doc = await homeleave.findOne({ linkcode: req.params.linkcode.toLowerCase() }).lean();
    const creator = doc ? doc.creatorwantsleave : false;
    const joiner  = doc ? doc.joinerwantsleave  : false;
    res.status(200).json({ creator, joiner, bothAgreed: creator && joiner });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch leave status' });
  }
});

export default router;
