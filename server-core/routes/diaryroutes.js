import express from 'express';
import diaryentry from '../models/diaryentry.js';

const router = express.Router();

// POST /api/diary/add — save a memory to the shared home diary
router.post('/add', async (req, res) => {
  const { linkcode, author, authorname, mood, title, text } = req.body;
  if (!linkcode || !author || !text || !text.trim()) {
    return res.status(400).json({ error: 'missing fields' });
  }
  try {
    const entry = await diaryentry.create({
      linkcode: linkcode.toLowerCase(),
      author, authorname: authorname || '',
      mood: mood || '📖', title: title || '', text: text.trim(),
    });
    res.status(201).json({ entry });
  } catch (err) {
    res.status(500).json({ error: 'failed to save memory' });
  }
});

// GET /api/diary/:linkcode — all memories for this home, newest first
router.get('/:linkcode', async (req, res) => {
  try {
    const entries = await diaryentry
      .find({ linkcode: req.params.linkcode.toLowerCase() })
      .sort({ createdat: -1 })
      .limit(300)
      .lean();
    res.status(200).json({ entries });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch memories' });
  }
});

// DELETE /api/diary/:id — remove a memory (only the author should call this)
router.delete('/:id', async (req, res) => {
  try {
    await diaryentry.findByIdAndDelete(req.params.id);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to delete memory' });
  }
});

export default router;
