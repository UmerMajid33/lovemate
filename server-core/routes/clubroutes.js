import express from 'express';
import club, { CLUB_MAX_MEMBERS } from '../models/club.js';

const router = express.Router();

const genCode = () => `club-${Math.floor(1000 + Math.random() * 9000)}`;

// POST /api/club/create { clubname, name, email } — make a club, founder = first member
router.post('/create', async (req, res) => {
  const { clubname, name, email } = req.body;
  if (!clubname || !email) return res.status(400).json({ error: 'missing fields' });
  try {
    let code, exists, tries = 0;
    do { code = genCode(); exists = await club.findOne({ clubcode: code }); tries++; } while (exists && tries < 8);
    const c = await club.create({
      clubname: clubname.trim(),
      clubcode: code,
      founderemail: email.toLowerCase(),
      members: [{ email: email.toLowerCase(), name: name || '' }],
    });
    res.status(201).json({ club: c, clubcode: c.clubcode });
  } catch (err) {
    res.status(500).json({ error: 'failed to create club' });
  }
});

// POST /api/club/join { clubcode, name, email } — join an existing club (max 5)
router.post('/join', async (req, res) => {
  let { clubcode, name, email } = req.body;
  if (!clubcode || !email) return res.status(400).json({ error: 'missing fields' });
  clubcode = clubcode.trim().toLowerCase();
  email = email.toLowerCase();
  try {
    const c = await club.findOne({ clubcode });
    if (!c) return res.status(404).json({ error: 'no club found with that code' });
    const already = c.members.some(m => m.email === email);
    if (!already) {
      if (c.members.length >= CLUB_MAX_MEMBERS) return res.status(403).json({ error: 'this club is full (5 members max)' });
      c.members.push({ email, name: name || '' });
      await c.save();
    }
    res.status(200).json({ club: c });
  } catch (err) {
    res.status(500).json({ error: 'failed to join club' });
  }
});

// POST /api/club/rename { clubcode, clubname } — rename the club
router.post('/rename', async (req, res) => {
  let { clubcode, clubname } = req.body;
  if (!clubcode || !clubname || !clubname.trim()) return res.status(400).json({ error: 'missing fields' });
  clubcode = clubcode.trim().toLowerCase();
  try {
    const c = await club.findOneAndUpdate(
      { clubcode },
      { $set: { clubname: clubname.trim().slice(0, 40) } },
      { new: true }
    );
    if (!c) return res.status(404).json({ error: 'not found' });
    res.status(200).json({ club: c });
  } catch (err) {
    res.status(500).json({ error: 'failed to rename club' });
  }
});

// POST /api/club/remove { clubcode, founderemail, target } — founder kicks a member
router.post('/remove', async (req, res) => {
  let { clubcode, founderemail, target } = req.body;
  if (!clubcode || !founderemail || !target) return res.status(400).json({ error: 'missing fields' });
  clubcode = clubcode.trim().toLowerCase();
  founderemail = founderemail.toLowerCase();
  target = target.toLowerCase();
  try {
    const c = await club.findOne({ clubcode });
    if (!c) return res.status(404).json({ error: 'not found' });
    if ((c.founderemail || '').toLowerCase() !== founderemail) return res.status(403).json({ error: 'only the founder can remove members' });
    if (target === founderemail) return res.status(400).json({ error: 'founder cannot remove themselves' });
    c.members = c.members.filter(m => m.email !== target);
    await c.save();
    res.status(200).json({ club: c });
  } catch (err) {
    res.status(500).json({ error: 'failed to remove member' });
  }
});

// GET /api/club/mine/:email — clubs this email belongs to
router.get('/mine/:email', async (req, res) => {
  const email = (req.params.email || '').toLowerCase();
  try {
    const clubs = await club.find({ 'members.email': email }).sort({ createdat: -1 }).lean();
    res.status(200).json({ clubs });
  } catch (err) {
    res.status(500).json({ error: 'failed to load clubs' });
  }
});

// GET /api/club/:clubcode — club info (members list)
router.get('/:clubcode', async (req, res) => {
  const clubcode = (req.params.clubcode || '').toLowerCase();
  try {
    const c = await club.findOne({ clubcode }).lean();
    if (!c) return res.status(404).json({ error: 'not found' });
    res.status(200).json({ club: c });
  } catch (err) {
    res.status(500).json({ error: 'failed to load club' });
  }
});

// POST /api/club/leave { clubcode, email } — leave; delete the club if it empties
router.post('/leave', async (req, res) => {
  let { clubcode, email } = req.body;
  if (!clubcode || !email) return res.status(400).json({ error: 'missing fields' });
  clubcode = clubcode.trim().toLowerCase();
  email = email.toLowerCase();
  try {
    const c = await club.findOne({ clubcode });
    if (!c) return res.status(200).json({ ok: true });
    c.members = c.members.filter(m => m.email !== email);
    if (c.members.length === 0) await club.deleteOne({ clubcode });
    else await c.save();
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to leave club' });
  }
});

export default router;
