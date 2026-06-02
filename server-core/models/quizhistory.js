import mongoose from 'mongoose';

// Tracks which quiz questions a home has already seen, so quizzes don't repeat
// until the pool is exhausted (then it cycles).
const quizhistoryschema = new mongoose.Schema({
  linkcode:  { type: String, required: true, lowercase: true, trim: true, unique: true },
  used:      { type: [String], default: [] },   // question texts already served
  updatedat: { type: Date, default: Date.now },
});

export default mongoose.model('quizhistory', quizhistoryschema);
