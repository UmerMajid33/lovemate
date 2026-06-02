// utils/googleAuth.js
// ─── Google sign-in via Expo AuthSession ──────────────────────────────────────
// Setup (one-time):
//   1. npx expo install expo-auth-session expo-web-browser
//   2. Create OAuth client IDs at https://console.cloud.google.com/apis/credentials
//      - Web client     → webClientId      (used in Expo Go / web)
//      - iOS client      → iosClientId
//      - Android client  → androidClientId
//      For the Android client, the package name + SHA-1 must match your build.
//   3. Paste the IDs below. Until they're filled in, the buttons show a friendly notice.
import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { saveUser, setLoggedIn, getUser } from './storage';
import { API_BASE } from './api';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CONFIG = {
  // Web OAuth client (used on web + Expo Go). NOTE: only the client ID belongs
  // in the app — never the client secret (GOCSPX-…); it can't be kept private here.
  webClientId:     '324613832083-tjl45unaaqk0hijc7cf5lko79l114lq8.apps.googleusercontent.com',
  // Add these later if you ship native builds (separate iOS/Android OAuth clients):
  // iosClientId:     'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  // androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
};

// True once at least one real client id has been pasted in
export const GOOGLE_READY = !GOOGLE_CONFIG.webClientId.startsWith('YOUR_');

// Fetch the Google profile, persist the user locally + sync to our server.
// Returns { ...user, needsSetup } — true until name + gender + birthday are set,
// so a google user is always asked to complete their profile (even if the server
// account already exists or they're on a new device).
async function resolveProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('could not read google profile');
  const profile = await res.json(); // { id, email, name, given_name, picture }

  const email    = (profile.email || '').toLowerCase();
  const existing = await getUser();
  const same     = existing && existing.email === email;

  // Preserve a previously-completed profile instead of wiping it each sign-in.
  const user = {
    name:     (same && existing.name) || profile.given_name || profile.name || 'mate',
    email,
    gender:   same ? (existing.gender || 'unknown') : 'unknown',
    birthday: same ? (existing.birthday || null) : null,
    google:   true,
    picture:  profile.picture || null,
    registeredAt: (same && existing.registeredAt) || Date.now(),
  };
  await saveUser(user);
  await setLoggedIn(true);

  // Best-effort backend sync (account creation / pairing awareness)
  try {
    await fetch(`${API_BASE}/api/user/google`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: user.name, email: user.email, googleid: profile.id }),
    });
  } catch (_) {}

  const profileComplete = user.gender && user.gender !== 'unknown' && !!user.birthday;
  return { ...user, needsSetup: !profileComplete };
}

/** Update the locally-stored user with the name, gender + birthday chosen by a google user. */
export async function completeGoogleProfile(name, gender, birthday) {
  const u = (await getUser()) || {};
  const merged = {
    ...u,
    name:     name || u.name,
    gender:   gender || 'unknown',
    birthday: birthday || u.birthday || null,
  };
  await saveUser(merged);
  return merged;
}

/**
 * useGoogleAuth — returns { promptAsync, ready }.
 * Call promptAsync() on button press. onSuccess(user) fires after profile resolves.
 */
export function useGoogleAuth(onSuccess, onError) {
  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CONFIG);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const token = response.authentication?.accessToken;
      if (!token) { onError?.('no access token from google'); return; }
      resolveProfile(token).then(onSuccess).catch(err => onError?.(err.message || 'google sign-in failed'));
    } else if (response.type === 'error') {
      onError?.('google sign-in was cancelled or failed');
    }
  }, [response]);

  return { promptAsync, ready: !!request && GOOGLE_READY };
}
