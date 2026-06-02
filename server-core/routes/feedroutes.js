import express from 'express';
import feedtask from '../models/feedtask.js';
import inboxmessage from '../models/inboxmessage.js';

const router = express.Router();

const POINTS_PER_CHALLENGE = 10;
const PER_DAY              = 3;     // challenges per partner per day
const NO_REPEAT_DAYS       = 30;    // best-effort: avoid reusing within this window

// ─── Challenge pool (action tasks only — no questions) ────────────────────────
const CHALLENGES = [
  { id: 'selfie_silly',   emoji: '🤪', text: 'send your partner a selfie making the silliest face you can right now' },
  { id: 'sing_song',      emoji: '🎤', text: 'send a video of you singing a few lines of any song' },
  { id: 'goodmorning_vn', emoji: '🌅', text: 'record a voice note saying good morning in the most dramatic voice possible' },
  { id: 'doing_now_photo',emoji: '📸', text: 'send a photo of exactly what you are doing this very second' },
  { id: 'dance_10s',      emoji: '💃', text: 'send a 10-second clip of you dancing to whatever is playing' },
  { id: 'impersonate',    emoji: '🎭', text: 'send a video impersonating your partner for 10 seconds' },
  { id: 'draw_them',      emoji: '🎨', text: 'draw your partner in 60 seconds and send the masterpiece' },
  { id: 'compliment_vn',  emoji: '💌', text: 'record a voice note giving 3 genuine compliments about them' },
  { id: 'sky_photo',      emoji: '☁️', text: 'send a photo of the sky wherever you are right now' },
  { id: 'fav_song_link',  emoji: '🎵', text: 'send the song stuck in your head right now' },
  { id: 'baby_face',      emoji: '👶', text: 'send a selfie using the silliest face filter you can find' },
  { id: 'pet_or_object',  emoji: '🧸', text: 'introduce a pet or a random object near you on video like it is a celebrity' },
  { id: 'two_truths',     emoji: '🤔', text: 'send a voice note with two truths and one lie about your day' },
  { id: 'air_guitar',     emoji: '🎸', text: 'send a clip of your best air guitar solo' },
  { id: 'mirror_selfie',  emoji: '🪞', text: 'send a mirror selfie striking a model pose' },
  { id: 'food_photo',     emoji: '🍽️', text: 'send a photo of the last thing you ate or drank' },
  { id: 'wink_video',     emoji: '😉', text: 'send a video of you attempting to wink (good luck)' },
  { id: 'fav_memory_vn',  emoji: '💭', text: 'record a voice note sharing your favourite memory of the two of you' },
  { id: 'outfit_check',   emoji: '👗', text: 'send a full outfit-check photo, even if it is pyjamas' },
  { id: 'whisper_secret', emoji: '🤫', text: 'send a whispered voice note telling them one tiny secret' },
  { id: 'jump_photo',     emoji: '🦘', text: 'send a photo of you mid-jump (timer required)' },
  { id: 'narrate_room',   emoji: '🎬', text: 'narrate your room like a nature documentary for 15 seconds' },
  { id: 'heart_hands',    emoji: '🫶', text: 'send a photo making a heart with your hands' },
  { id: 'best_joke',      emoji: '😂', text: 'record yourself telling your worst joke with full commitment' },
  { id: 'view_photo',     emoji: '🌇', text: 'send a photo of the view out your nearest window' },
  { id: 'spell_name',     emoji: '🔤', text: 'send a video spelling their name with your body' },
  { id: 'fav_emoji_story',emoji: '📖', text: 'tell the story of your day using only voice + sound effects, no normal words' },
  { id: 'slow_mo',        emoji: '🐌', text: 'send a slow-motion video of you flipping your hair' },
  { id: 'cook_show',      emoji: '👨‍🍳', text: 'film yourself making a snack like a 5-star chef for 15 seconds' },
  { id: 'thumbs_places',  emoji: '👍', text: 'send a photo giving a thumbs up somewhere unexpected' },
  { id: 'serenade',       emoji: '🎙️', text: 'serenade them with a made-up song about your day (voice note)' },
  { id: 'goofy_walk',     emoji: '🚶', text: 'send a clip of your silliest walk across the room' },
  { id: 'rate_day',       emoji: '⭐', text: 'send a video rating your day out of 10 and why, talk-show style' },
  { id: 'show_shoes',     emoji: '👟', text: 'send a photo of the shoes nearest to you right now' },
  { id: 'blow_kiss',      emoji: '😘', text: 'send a video blowing them the most over-the-top kiss' },
  { id: 'tiny_tour',      emoji: '🏠', text: 'give a 15-second tour of wherever you are' },
  { id: 'fav_snack',      emoji: '🍫', text: 'send a photo of a snack you wish you could share with them' },
  { id: 'robot_voice',    emoji: '🤖', text: 'send a voice note saying i love you in a robot voice' },
  { id: 'plant_or_view',  emoji: '🪴', text: 'send a photo of something green near you' },
  { id: 'three_words',    emoji: '✍️', text: 'send a video saying three words that describe how you feel right now' },
  { id: 'wave_hello',     emoji: '👋', text: 'send a clip waving hello as if you have not seen them in years' },
  { id: 'fav_color_hunt', emoji: '🌈', text: 'find and photograph something in their favourite colour' },
  { id: 'lip_sync',       emoji: '🎶', text: 'send a 10-second lip-sync to any song' },
  { id: 'cheers',         emoji: '🥤', text: 'send a photo raising whatever drink you have in a cheers to them' },
  { id: 'silly_hat',      emoji: '🎩', text: 'put something on your head as a hat and send a photo' },
  { id: 'count_blessings',emoji: '🙏', text: 'voice note: name 3 small things that made you smile today' },
  { id: 'morning_hair',   emoji: '💇', text: 'send a brave unfiltered photo of your current hair situation' },
  { id: 'pretend_news',   emoji: '📺', text: 'read out one thing from your day like a serious news anchor (video)' },
  { id: 'shadow_puppet',  emoji: '🐰', text: 'send a photo of a shadow puppet you make with your hands' },
  { id: 'fav_pose',       emoji: '🤳', text: 'send your signature selfie pose, full confidence' },
  { id: 'hum_song',       emoji: '🎼', text: 'hum a song in a voice note and make them guess it' },
  { id: 'desk_chaos',     emoji: '🗂️', text: 'send a photo of your desk or bag exactly as it is, no cleaning' },
  { id: 'big_smile',      emoji: '😁', text: 'send a photo with the biggest genuine smile you can make' },
  { id: 'fav_word',       emoji: '💬', text: 'send a video saying your favourite word and why you love it' },
  { id: 'stretch',        emoji: '🧘', text: 'send a clip of you doing one dramatic morning stretch' },
  { id: 'gift_idea',      emoji: '🎁', text: 'send a photo of something you would buy them if money was no issue' },
  { id: 'weather_report', emoji: '🌦️', text: 'give a 15-second weather report from your window' },
  { id: 'fav_throwback',  emoji: '🕰️', text: 'send any throwback photo of yourself you can find' },
];

const CH_BY_ID = Object.fromEntries(CHALLENGES.map(c => [c.id, c]));
const today = () => new Date().toISOString().slice(0, 10);

// Deterministic shuffle so a role's daily picks are stable across requests/devices.
function seededPick(pool, seedStr, n) {
  const arr = [...pool];
  let s = 0;
  for (const ch of String(seedStr)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

// Assign today's PER_DAY challenges for one role, if not already assigned.
async function ensureTasks(linkcode, role) {
  const d = today();
  const existing = await feedtask.find({ linkcode, role, date: d }).lean();
  if (existing.length >= PER_DAY) return existing;

  // Challenge ids this home used recently (either partner) → avoid repeats.
  const since = new Date(Date.now() - NO_REPEAT_DAYS * 86400000).toISOString().slice(0, 10);
  const recent = await feedtask.find({ linkcode, date: { $gte: since } }).select('challengeid -_id').lean();
  const usedToday = new Set(existing.map(t => t.challengeid));
  const usedRecent = new Set(recent.map(t => t.challengeid));

  let pool = CHALLENGES.filter(c => !usedRecent.has(c.id) && !usedToday.has(c.id));
  if (pool.length < PER_DAY - existing.length) {
    // Best-effort fallback: allow anything not already picked today.
    pool = CHALLENGES.filter(c => !usedToday.has(c.id));
  }

  const need = PER_DAY - existing.length;
  const picks = seededPick(pool, `${linkcode}|${role}|${d}`, need);

  for (const c of picks) {
    try {
      await feedtask.create({ linkcode, role, date: d, challengeid: c.id, text: c.text, emoji: c.emoji });
    } catch (_) { /* unique race — ignore */ }
  }
  return feedtask.find({ linkcode, role, date: d }).lean();
}

async function leaderboard(linkcode) {
  const verified = await feedtask.find({ linkcode, status: 'verified' }).select('role points -_id').lean();
  const tally = { creator: { points: 0, count: 0 }, joiner: { points: 0, count: 0 } };
  for (const t of verified) {
    if (!tally[t.role]) continue;
    tally[t.role].points += t.points || POINTS_PER_CHALLENGE;
    tally[t.role].count  += 1;
  }
  return tally;
}

// GET /api/feed/today/:linkcode/:role — this role's 3 challenges + leaderboard
router.get('/today/:linkcode/:role', async (req, res) => {
  const linkcode = (req.params.linkcode || '').toLowerCase();
  const role     = req.params.role;
  if (!['creator', 'joiner'].includes(role)) return res.status(400).json({ error: 'bad role' });
  try {
    const tasks = await ensureTasks(linkcode, role);
    const board = await leaderboard(linkcode);
    res.status(200).json({ date: today(), tasks, leaderboard: board });
  } catch (err) {
    res.status(500).json({ error: 'failed to load feed' });
  }
});

// POST /api/feed/accept — doer marks a challenge done; notify partner in inbox
router.post('/accept', async (req, res) => {
  const { linkcode, role, challengeid, name } = req.body;
  if (!linkcode || !role || !challengeid) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  const d  = today();
  try {
    const task = await feedtask.findOneAndUpdate(
      { linkcode: lc, role, date: d, challengeid },
      { $set: { status: 'accepted', acceptedat: new Date() } },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'challenge not found' });

    const ch = CH_BY_ID[challengeid];
    // Drop a verification request into the shared inbox for the partner.
    await inboxmessage.create({
      linkcode: lc, from: role, fromname: name || '',
      type: 'feed', emoji: ch?.emoji || '✨',
      content: `says they did it: "${ch?.text || challengeid}". verify it?`,
      meta: { challengeid, doerrole: role, date: d },
    });
    res.status(200).json({ ok: true, task });
  } catch (err) {
    res.status(500).json({ error: 'failed to accept challenge' });
  }
});

// POST /api/feed/verify — partner approves/rejects the doer's challenge
router.post('/verify', async (req, res) => {
  const { linkcode, doerrole, challengeid, date, approved } = req.body;
  if (!linkcode || !doerrole || !challengeid) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  const d  = date || today();
  try {
    const task = await feedtask.findOneAndUpdate(
      { linkcode: lc, role: doerrole, date: d, challengeid },
      approved
        ? { $set: { status: 'verified', verifiedat: new Date(), points: POINTS_PER_CHALLENGE } }
        : { $set: { status: 'rejected', verifiedat: new Date(), points: 0 } },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'challenge not found' });

    // Clear the matching inbox verify request so it stops nagging.
    try {
      await inboxmessage.deleteMany({ linkcode: lc, type: 'feed', 'meta.challengeid': challengeid, 'meta.doerrole': doerrole, 'meta.date': d });
    } catch (_) {}

    const board = await leaderboard(lc);
    res.status(200).json({ ok: true, leaderboard: board });
  } catch (err) {
    res.status(500).json({ error: 'failed to verify challenge' });
  }
});

// GET /api/feed/leaderboard/:linkcode — points per partner (for the home hero)
router.get('/leaderboard/:linkcode', async (req, res) => {
  try {
    const board = await leaderboard((req.params.linkcode || '').toLowerCase());
    res.status(200).json({ leaderboard: board });
  } catch (err) {
    res.status(500).json({ error: 'failed to load leaderboard' });
  }
});

export default router;
