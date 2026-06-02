// One-off: clear every home + all per-home data. Keeps user accounts + wallets + inventory.
import mongoose from 'mongoose';

import homenode     from '../models/homenode.js';
import home         from '../models/home.js';
import homeleave    from '../models/homeleave.js';
import inboxmessage from '../models/inboxmessage.js';
import gamelobby    from '../models/gamelobby.js';
import duelsession  from '../models/duelsession.js';
import goalsession  from '../models/goalsession.js';
import racesession  from '../models/racesession.js';
import gamesession  from '../models/gamesession.js';
import feedlog      from '../models/feedlog.js';
import presence     from '../models/presence.js';

const URI = "mongodb+srv://umermagi6514_db_user:XUjPbEaxjszBgJjL@lovemate.ltcngv5.mongodb.net/lovemate?retryWrites=true&w=majority";

const targets = [
  ['homenode', homenode], ['home', home], ['homeleave', homeleave],
  ['inboxmessage', inboxmessage], ['gamelobby', gamelobby],
  ['duelsession', duelsession], ['goalsession', goalsession],
  ['racesession', racesession], ['gamesession', gamesession],
  ['feedlog', feedlog], ['presence', presence],
];

let connected = false;
for (let attempt = 1; attempt <= 5 && !connected; attempt++) {
  try {
    await mongoose.connect(URI, { family: 4, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
    connected = true;
  } catch (e) {
    console.log(`attempt ${attempt} failed: ${e.message.split('\n')[0]}`);
    await new Promise(r => setTimeout(r, 4000));
  }
}
if (!connected) { console.log('could not connect after retries'); process.exit(1); }
console.log('connected');
for (const [name, model] of targets) {
  const r = await model.deleteMany({});
  console.log(`${name}: deleted ${r.deletedCount}`);
}
await mongoose.disconnect();
console.log('done');
