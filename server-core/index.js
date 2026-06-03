import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Pointing to your models folder where your routes live
import homeroutes from './models/homeroutes.js';
import userroutes from './routes/userroutes.js';
import feedroutes     from './routes/feedroutes.js';
import presenceroutes from './routes/presenceroutes.js';
import gameroutes     from './routes/gameroutes.js';
import walletroutes   from './routes/walletroutes.js';
import shoproutes     from './routes/shoproutes.js';
import inboxroutes    from './routes/inboxroutes.js';
import leaveroutes    from './routes/leaveroutes.js';
import homenoderoutes from './routes/homenoderoutes.js';
import diaryroutes    from './routes/diaryroutes.js';
import quizroutes     from './routes/quizroutes.js';
import xoroutes       from './routes/xoroutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '8mb' })); // allow compressed diary images (base64)

// Lightweight wake/health check (no DB) — the app pings this on boot so it can
// show a loader while a cold Render instance spins up.
app.get('/api/health', (req, res) => res.status(200).json({ ok: true }));

// Set up API endpoints
app.use('/api/user', userroutes);
app.use('/api/home', homeroutes);
app.use('/api/feed',   feedroutes);
app.use('/api/home',   presenceroutes);
app.use('/api/games',  gameroutes);
app.use('/api/wallet', walletroutes);
app.use('/api/shop',   shoproutes);
app.use('/api/inbox',  inboxroutes);
app.use('/api/home',   leaveroutes);
app.use('/api/home',   homenoderoutes);
app.use('/api/diary',  diaryroutes);
app.use('/api/quiz',   quizroutes);
app.use('/api/xo',     xoroutes);

const PORT = process.env.PORT || 5000;

// Mongo connection string comes from the environment (set MONGO_URI on Render).
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set. Add it as an environment variable.');
  process.exit(1);
}

console.log("🚀 Attempting connection using IPv4 explicit resolution loop...");

// Force Mongoose to bypass family lookup protocols
mongoose.connect(MONGO_URI, {
  family: 4
})
  .then(() => {
    console.log('✅ successfully linked to mongodb atlas cloud');
    app.listen(PORT, () => console.log(`🚀 core engine running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ database connection failure:', err.message);
  });