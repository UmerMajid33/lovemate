# LoveMate 💌

A mobile app for couples — built with Expo (React Native) on the front end and a Node.js/Express + MongoDB backend. LoveMate gives couples a shared space with a daily countdown, a shared diary, mini-games, and real-time chat.

## Features

- **Couple pairing** — link accounts with a shared code, private to just the two of you
- **Countdown** — track days together with a themed countdown screen
- **Shared diary** — save memories with photos
- **Live chat** — real-time messaging, including an AI chat assistant
- **Mini-games** — a growing arcade of 2-player and solo games (Goal Rush, Bounce Blitz, Stack Memories, Crash & Clutch, Tic-Tac-Toe, Carrom Duel, Tap Racer, and more), several rebuilt in 3D with Three.js
- **Clubs & court** — social features for couples to interact
- **Shop & rewards** — in-app shop tied to gameplay progress
- **Google sign-in**, OTP email verification, and password recovery

## Tech Stack

**Mobile app** (`/mobile`)
- Expo / React Native 0.85
- React 19
- Three.js + expo-gl / expo-three for 3D games
- react-native-game-engine, matter-js for 2D physics games
- expo-auth-session for Google sign-in

**Backend** (`/server-core`)
- Node.js + Express 5
- MongoDB via Mongoose
- Nodemailer for OTP/email delivery
- bcrypt for password hashing

## Getting Started

### Backend
```bash
cd server-core
npm install
npm run dev
```

### Mobile app
```bash
cd mobile
npm install
npm start
```

Then run on Android, iOS, or web via the Expo CLI prompts.

## Project Structure

```
lovemate/
├── mobile/         # Expo React Native app
│   ├── screens/    # App screens (login, chat, games, diary, etc.)
│   ├── components/ # Shared UI components
│   ├── theme/       # Theming
│   └── utils/       # Helpers
└── server-core/    # Express API + MongoDB backend
    ├── routes/      # API routes
    ├── models/      # Mongoose models
    └── scripts/     # Utility scripts
```
