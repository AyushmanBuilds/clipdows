import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCM-ay_5E70skMszLlYziZgafrkQ25SWS8",
  authDomain: "clipdows-c20d5.firebaseapp.com",
  projectId: "clipdows-c20d5",
  storageBucket: "clipdows-c20d5.firebasestorage.app",
  messagingSenderId: "229362038617",
  appId: "1:229362038617:web:9145117fe7b3a610227e48",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Exported so firestoreSync.js (device pairing + real-time clipboard sync)
// can reuse this same app/auth instance instead of re-initializing Firebase.
export { app, auth };

function emit(user) {
  const detail = user
    ? { uid: user.uid, email: user.email, displayName: user.displayName || '' }
    : null;
  window.dispatchEvent(new CustomEvent('clipauth:state', { detail }));
}

onAuthStateChanged(auth, emit);

window.clipAuth = {
  signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
  async signUp(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
      emit(auth.currentUser); // re-emit so the UI picks up the name
    }
    return cred;
  },
  signInWithGoogle: (idToken, accessToken) =>
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken, accessToken)),
  resetPassword: (email) => sendPasswordResetEmail(auth, email),
  signOut: () => signOut(auth),
};