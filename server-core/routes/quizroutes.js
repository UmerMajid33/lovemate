import express from 'express';
import quizsession from '../models/quizsession.js';
import quizhistory from '../models/quizhistory.js';
import inboxmessage from '../models/inboxmessage.js';

const router = express.Router();

const PER_QUIZ = 10;
const POINTS   = 10;

// ─── General-knowledge bank — medium difficulty (not trivial, not obscure) ────
const BANK = [
  { q: 'which planet is known as the red planet?', options: ['venus', 'mars', 'jupiter', 'mercury'], answer: 1 },
  { q: 'what is the capital of australia?', options: ['sydney', 'melbourne', 'canberra', 'perth'], answer: 2 },
  { q: 'which gas makes up most of earth\'s atmosphere?', options: ['oxygen', 'nitrogen', 'carbon dioxide', 'argon'], answer: 1 },
  { q: 'who developed the theory of relativity?', options: ['newton', 'einstein', 'tesla', 'bohr'], answer: 1 },
  { q: 'what is the longest river in the world?', options: ['amazon', 'nile', 'yangtze', 'mississippi'], answer: 1 },
  { q: 'which country gifted the statue of liberty to the usa?', options: ['britain', 'france', 'spain', 'italy'], answer: 1 },
  { q: 'how many bones are in the adult human body?', options: ['206', '198', '215', '187'], answer: 0 },
  { q: 'what is the currency of japan?', options: ['won', 'yuan', 'yen', 'ringgit'], answer: 2 },
  { q: 'which artist cut off part of his own ear?', options: ['monet', 'van gogh', 'dali', 'picasso'], answer: 1 },
  { q: 'what is the smallest country in the world?', options: ['monaco', 'nauru', 'vatican city', 'malta'], answer: 2 },
  { q: 'which planet has the most moons?', options: ['jupiter', 'saturn', 'uranus', 'neptune'], answer: 1 },
  { q: 'what is the powerhouse of the cell?', options: ['nucleus', 'ribosome', 'mitochondria', 'membrane'], answer: 2 },
  { q: 'in which year did world war ii end?', options: ['1943', '1945', '1947', '1950'], answer: 1 },
  { q: 'what is the largest desert in the world?', options: ['sahara', 'gobi', 'antarctic', 'arabian'], answer: 2 },
  { q: 'who wrote "the origin of species"?', options: ['mendel', 'darwin', 'pasteur', 'linnaeus'], answer: 1 },
  { q: 'which element has the chemical symbol "fe"?', options: ['fluorine', 'iron', 'francium', 'lead'], answer: 1 },
  { q: 'what is the capital of canada?', options: ['toronto', 'vancouver', 'ottawa', 'montreal'], answer: 2 },
  { q: 'how many strings does a standard guitar have?', options: ['4', '5', '6', '7'], answer: 2 },
  { q: 'which ocean is the deepest?', options: ['atlantic', 'indian', 'pacific', 'arctic'], answer: 2 },
  { q: 'what does "www" stand for?', options: ['world web wide', 'world wide web', 'wide world web', 'web wide world'], answer: 1 },
  { q: 'which vitamin is produced when skin is exposed to sunlight?', options: ['vitamin a', 'vitamin b', 'vitamin c', 'vitamin d'], answer: 3 },
  { q: 'who painted the ceiling of the sistine chapel?', options: ['raphael', 'michelangelo', 'donatello', 'titian'], answer: 1 },
  { q: 'what is the hardest known natural material?', options: ['titanium', 'quartz', 'diamond', 'granite'], answer: 2 },
  { q: 'which country is home to the kangaroo?', options: ['south africa', 'australia', 'brazil', 'india'], answer: 1 },
  { q: 'how many planets are in our solar system?', options: ['7', '8', '9', '10'], answer: 1 },
  { q: 'what is the capital of egypt?', options: ['cairo', 'alexandria', 'giza', 'luxor'], answer: 0 },
  { q: 'which metal is the best conductor of electricity?', options: ['copper', 'gold', 'silver', 'aluminium'], answer: 2 },
  { q: 'who was the first person to walk on the moon?', options: ['buzz aldrin', 'neil armstrong', 'yuri gagarin', 'john glenn'], answer: 1 },
  { q: 'what is the largest mammal on earth?', options: ['elephant', 'blue whale', 'giraffe', 'orca'], answer: 1 },
  { q: 'which language is the most spoken worldwide (total speakers)?', options: ['mandarin', 'spanish', 'english', 'hindi'], answer: 2 },
  { q: 'what is the freezing point of water in fahrenheit?', options: ['0', '32', '100', '212'], answer: 1 },
  { q: 'which country invented tea?', options: ['india', 'china', 'japan', 'england'], answer: 1 },
  { q: 'how many sides does a heptagon have?', options: ['6', '7', '8', '9'], answer: 1 },
  { q: 'what is the main ingredient in guacamole?', options: ['tomato', 'avocado', 'pepper', 'onion'], answer: 1 },
  { q: 'which planet is closest to the sun?', options: ['venus', 'earth', 'mercury', 'mars'], answer: 2 },
  { q: 'who is known as the father of computers?', options: ['alan turing', 'charles babbage', 'bill gates', 'tim berners-lee'], answer: 1 },
  { q: 'what is the capital of brazil?', options: ['rio de janeiro', 'sao paulo', 'brasilia', 'salvador'], answer: 2 },
  { q: 'which blood type is the universal donor?', options: ['a', 'b', 'ab', 'o negative'], answer: 3 },
  { q: 'in computing, what does "cpu" stand for?', options: ['central process unit', 'central processing unit', 'computer personal unit', 'core processing unit'], answer: 1 },
  { q: 'which sea is the saltiest?', options: ['red sea', 'dead sea', 'caspian sea', 'black sea'], answer: 1 },
  { q: 'how many players are on a soccer team on the field?', options: ['9', '10', '11', '12'], answer: 2 },
  { q: 'what is the tallest mountain above sea level?', options: ['k2', 'mount everest', 'kilimanjaro', 'denali'], answer: 1 },
  { q: 'which instrument has 88 keys?', options: ['organ', 'piano', 'harp', 'accordion'], answer: 1 },
  { q: 'what is the chemical symbol for gold?', options: ['gd', 'go', 'au', 'ag'], answer: 2 },
  { q: 'which country has the largest population?', options: ['usa', 'india', 'china', 'indonesia'], answer: 1 },
  { q: 'what does dna stand for?', options: ['deoxyribonucleic acid', 'dinucleic acid', 'double nucleic acid', 'dynamic acid'], answer: 0 },
  { q: 'which empire built the colosseum?', options: ['greek', 'roman', 'ottoman', 'persian'], answer: 1 },
  { q: 'what is the most abundant gas produced by plants?', options: ['nitrogen', 'oxygen', 'methane', 'helium'], answer: 1 },
  { q: 'how many degrees are in a circle?', options: ['180', '270', '360', '400'], answer: 2 },
  { q: 'which scientist proposed the laws of motion?', options: ['galileo', 'newton', 'kepler', 'hawking'], answer: 1 },
];

function shuffle(arr, seedStr) {
  let s = 0;
  for (const ch of String(seedStr)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick PER_QUIZ questions this home hasn't seen; cycle the pool once exhausted.
async function pickQuestions(lc) {
  let hist = await quizhistory.findOne({ linkcode: lc });
  let used = new Set(hist?.used || []);
  let pool = BANK.filter(q => !used.has(q.q));
  if (pool.length < PER_QUIZ) { used = new Set(); pool = [...BANK]; } // exhausted → reset
  const picked = shuffle(pool, lc + Date.now()).slice(0, PER_QUIZ);
  const nextUsed = [...used, ...picked.map(p => p.q)];
  await quizhistory.findOneAndUpdate(
    { linkcode: lc },
    { $set: { used: nextUsed, updatedat: new Date() } },
    { upsert: true }
  );
  return picked;
}

// Strip the correct answer + the partner's pick until BOTH have answered current.
function publicView(qs) {
  const cur = qs.current;
  const cAns = qs.answers?.creator || {};
  const jAns = qs.answers?.joiner || {};
  const bothAnswered = cAns[cur] !== undefined && jAns[cur] !== undefined;
  const q = qs.questions[cur];
  return {
    status: qs.status,
    fromrole: qs.fromrole,
    fromname: qs.fromname,
    total: qs.questions.length,
    current: cur,
    scores: qs.scores,
    bothAnswered,
    question: q ? { q: q.q, options: q.options, answer: bothAnswered ? q.answer : null } : null,
    picks: bothAnswered ? { creator: cAns[cur], joiner: jAns[cur] } : {},
    myAnswered: { creator: cAns[cur] !== undefined, joiner: jAns[cur] !== undefined },
  };
}

// POST /api/quiz/invite — start a pending quiz + drop an inbox invite for partner
router.post('/invite', async (req, res) => {
  const { linkcode, fromrole, fromname } = req.body;
  if (!linkcode || !fromrole) return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  try {
    await quizsession.deleteMany({ linkcode: lc }); // one live quiz per home
    const qs = await quizsession.create({
      linkcode: lc, status: 'pending', fromrole, fromname: fromname || '',
      questions: await pickQuestions(lc),
      answers: { creator: {}, joiner: {} }, scores: { creator: 0, joiner: 0 },
    });
    await inboxmessage.create({
      linkcode: lc, from: fromrole, fromname: fromname || '',
      type: 'quiz', emoji: '🧠', content: 'wants to test you — general knowledge quiz. accept?',
      meta: { quiz: true },
    });
    res.status(200).json({ ok: true, id: qs._id });
  } catch (err) {
    res.status(500).json({ error: 'failed to start quiz' });
  }
});

// POST /api/quiz/accept — partner accepts → quiz goes live
router.post('/accept', async (req, res) => {
  const { linkcode } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'missing linkcode' });
  const lc = linkcode.toLowerCase();
  try {
    await quizsession.findOneAndUpdate(
      { linkcode: lc, status: 'pending' },
      { $set: { status: 'active', updatedat: new Date() } }
    );
    await inboxmessage.deleteMany({ linkcode: lc, type: 'quiz' });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to accept quiz' });
  }
});

// GET /api/quiz/:linkcode — current quiz state (answer hidden until both submit)
router.get('/:linkcode', async (req, res) => {
  try {
    const qs = await quizsession.findOne({ linkcode: req.params.linkcode.toLowerCase() }).lean();
    if (!qs) return res.status(200).json({ quiz: null });
    res.status(200).json({ quiz: publicView(qs) });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch quiz' });
  }
});

// POST /api/quiz/answer — a partner submits their option for the current question
router.post('/answer', async (req, res) => {
  const { linkcode, role, qindex, option } = req.body;
  if (!linkcode || !role || qindex === undefined || option === undefined)
    return res.status(400).json({ error: 'missing fields' });
  const lc = linkcode.toLowerCase();
  try {
    const qs = await quizsession.findOne({ linkcode: lc });
    if (!qs) return res.status(404).json({ error: 'no quiz' });
    if (qs.current !== qindex) return res.status(200).json({ quiz: publicView(qs) }); // stale

    qs.answers = qs.answers || { creator: {}, joiner: {} };
    if (!qs.answers[role]) qs.answers[role] = {};
    if (qs.answers[role][qindex] === undefined) {
      qs.answers[role][qindex] = option;

      const other = role === 'creator' ? 'joiner' : 'creator';
      const bothNow = qs.answers[other][qindex] !== undefined;
      if (bothNow) {
        // award points to each partner who got it right (independent)
        const correct = qs.questions[qindex].answer;
        qs.scores = qs.scores || { creator: 0, joiner: 0 };
        if (qs.answers.creator[qindex] === correct) qs.scores.creator += POINTS;
        if (qs.answers.joiner[qindex]  === correct) qs.scores.joiner  += POINTS;
      }
      qs.markModified('answers'); qs.markModified('scores');
      qs.updatedat = new Date();
      await qs.save();
    }
    res.status(200).json({ quiz: publicView(qs) });
  } catch (err) {
    res.status(500).json({ error: 'failed to submit answer' });
  }
});

// POST /api/quiz/next — advance to next question (or finish)
router.post('/next', async (req, res) => {
  const { linkcode } = req.body;
  if (!linkcode) return res.status(400).json({ error: 'missing linkcode' });
  const lc = linkcode.toLowerCase();
  try {
    const qs = await quizsession.findOne({ linkcode: lc });
    if (!qs) return res.status(404).json({ error: 'no quiz' });
    const cur = qs.current;
    const both = qs.answers?.creator?.[cur] !== undefined && qs.answers?.joiner?.[cur] !== undefined;
    if (both) {
      if (qs.current + 1 >= qs.questions.length) qs.status = 'done';
      else qs.current += 1;
      qs.updatedat = new Date();
      await qs.save();
    }
    res.status(200).json({ quiz: publicView(qs) });
  } catch (err) {
    res.status(500).json({ error: 'failed to advance' });
  }
});

// POST /api/quiz/leave — drop the quiz + any invite
router.post('/leave', async (req, res) => {
  const lc = (req.body.linkcode || '').toLowerCase();
  try {
    await quizsession.deleteMany({ linkcode: lc });
    await inboxmessage.deleteMany({ linkcode: lc, type: 'quiz' });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to leave' });
  }
});

export default router;
