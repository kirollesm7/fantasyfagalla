import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

// ---- Firebase config — get these from Firebase Console → Project settings ----
// (This is the same config used in public/sw.js — keep the two in sync.
// These values are meant to be public, like the Supabase URL/anon key —
// they identify the project, they don't grant admin access to anything.)
export const firebaseConfig = {
  apiKey: 'PASTE_FIREBASE_API_KEY_HERE',
  authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
  projectId: 'PASTE_PROJECT_ID',
  storageBucket: 'PASTE_PROJECT_ID.appspot.com',
  messagingSenderId: 'PASTE_SENDER_ID',
  appId: 'PASTE_APP_ID',
};

// Firebase Console → Project settings → Cloud Messaging → Web configuration
// → "Web Push certificates" → generate/copy the key pair's public key here.
export const VAPID_KEY = 'PASTE_VAPID_PUBLIC_KEY_HERE';

let app = null;
function getFirebaseApp() {
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

// Requests notification permission, registers with FCM, and returns the
// device token to save in Supabase — or null if the user said no / the
// browser doesn't support it (e.g. iOS Safari outside a PWA install).
export async function requestNotificationToken() {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn('[FCM] push messaging not supported in this browser');
    return null;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[FCM] notification permission not granted:', permission);
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(getFirebaseApp());
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    console.log('[FCM] got device token');
    return token;
  } catch (e) {
    console.error('[FCM] getToken failed:', e);
    return null;
  }
}
