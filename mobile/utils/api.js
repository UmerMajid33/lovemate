import { Platform } from 'react-native';

// Production / shared backend URL. Set this at build time:
//   EXPO_PUBLIC_API_URL=https://your-api.onrender.com  (no trailing slash)
// Expo inlines any EXPO_PUBLIC_* var into the bundle, so the APK ships with it.
const PUBLIC_API = process.env.EXPO_PUBLIC_API_URL;

// Backend port for LOCAL dev only (server-core runs on 5000).
const PORT = 5000;
// Your computer's LAN IPv4 (run `ipconfig`) — used by a phone on the same wifi
// during development when no EXPO_PUBLIC_API_URL is set.
const LAN_IP = '192.168.1.100';

function resolveBase() {
  // 1) A deployed URL always wins (this is what public APKs use).
  if (PUBLIC_API) return PUBLIC_API.replace(/\/$/, '');

  // 2) Web dev: talk to the backend on the same host the page came from.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${PORT}`;
  }

  // 3) Native dev fallback over LAN.
  return `http://${LAN_IP}:${PORT}`;
}

export const API_BASE = resolveBase();
