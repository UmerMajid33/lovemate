import express from 'express';
import xosession from '../models/xosession.js';

const router = express.Router();

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],   // rows
  [0,3,6],[1,4,7],[2,5,8],   // cols
  [0,4,8],[2,4,6],           // diagonals
];
const mark = (role) => (role === 'creator' ? 'X' : 'O');

function evaluate(board) {
  for (const ln of LINES) {
    const [a,b,c] = ln;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winnerMark: board[a], line: ln };
    }
  }
  if (board.every(Boolean)) return { winnerMark: 'draw', line: [] };
  return { winnerMark: null, line: [] };
}

// GET /api/xo/:linkcode — current board (creates a fresh game if none)
router.get('/:linkcode', async (req, res) => {
  const lc = (req.params.linkcode || '').toLowerCase();
  try {
    let g = await xosession.findOne({ linkcode: lc });
    if (!g) g = await xosession.create({ linkcode: lc });
    res.status(200).json({ game: g });
  } catch (err) {
    res.status(500).json({ error: 'failed to load game' });
  }
});

// POST /api/xo/move { linkcode, role, cell } — place your mark if it's your turn
router.post('/move', async (req, res) => {
  const { linkcode, role, cell } = req.body;
  if (!linkcode || !role || cell === undefined) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  try {
    let g = await xosession.findOne({ linkcode: lc });
    if (!g) g = await xosession.create({ linkcode: lc });

    if (g.winner)            return res.status(200).json({ game: g }); // game over
    if (g.turn !== role)     return res.status(200).json({ game: g }); // not your turn
    if (g.board[cell])       return res.status(200).json({ game: g }); // cell taken

    g.board[cell] = mark(role);
    const { winnerMark, line } = evaluate(g.board);
    if (winnerMark === 'draw') { g.winner = 'draw'; }
    else if (winnerMark)       { g.winner = role; g.line = line; g.wins[role] = (g.wins[role] || 0) + 1; g.markModified('wins'); }
    else                       { g.turn = role === 'creator' ? 'joiner' : 'creator'; }

    g.markModified('board');
    g.updatedat = new Date();
    await g.save();
    res.status(200).json({ game: g });
  } catch (err) {
    res.status(500).json({ error: 'failed to move' });
  }
});

// POST /api/xo/reset { linkcode } — new round; loser/either starts (alternate)
router.post('/reset', async (req, res) => {
  const lc = (req.body.linkcode || '').toLowerCase();
  try {
    const g = await xosession.findOne({ linkcode: lc });
    const starter = g && g.turn === 'creator' ? 'joiner' : 'creator'; // alternate who goes first
    const upd = await xosession.findOneAndUpdate(
      { linkcode: lc },
      { $set: { board: Array(9).fill(''), turn: starter, winner: null, line: [], updatedat: new Date() } },
      { upsert: true, new: true }
    );
    res.status(200).json({ game: upd });
  } catch (err) {
    res.status(500).json({ error: 'failed to reset' });
  }
});

export default router;
