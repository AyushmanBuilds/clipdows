import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";

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
const functions = getFunctions(app, 'asia-south1'); // must match REGION in functions/index.js

// Exported so firestoreSync.js (device pairing + real-time clipboard sync)
// can reuse this same app/auth instance instead of re-initializing Firebase.
export { app, auth };

function emit(user) {
  const detail = user
    ? { uid: user.uid, email: user.email, displayName: user.displayName || '', emailVerified: !!user.emailVerified }
    : null;
  window.dispatchEvent(new CustomEvent('clipauth:state', { detail }));
}

onAuthStateChanged(auth, emit);

window.clipAuth = {
  signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
  async signUp(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    sendEmailVerification(cred.user).catch(() => {}); // if this fails the user can press "Resend" on the verify screen
    if (name) {
      await updateProfile(cred.user, { displayName: name });
      emit(auth.currentUser); // re-emit so the UI picks up the name
    }
    return cred;
  },
  resendVerification: () => sendEmailVerification(auth.currentUser),
  // Re-reads the account from Firebase. Once the email is verified, force a fresh ID token (it carries
  // email_verified=true, which the Cloud Functions check) and tell the UI. Returns true when verified.
  async refreshVerified() {
    const u = auth.currentUser;
    if (!u) return false;
    await u.reload();
    if (!u.emailVerified) return false;
    await u.getIdToken(true);
    emit(auth.currentUser);
    return true;
  },
  resetPassword: (email) => sendPasswordResetEmail(auth, email),
  signOut: () => signOut(auth),
};

// Payments (Razorpay). Every call runs on Cloud Functions — the Razorpay secret never reaches the app.
window.clipPay = {
  createOrder: async (tier) => (await httpsCallable(functions, 'createOrder')({ tier })).data,
  verifyPayment: async (p) => (await httpsCallable(functions, 'verifyPayment')(p)).data,
  getEntitlement: async () => (await httpsCallable(functions, 'getEntitlement')()).data,
  // Referral / redeem codes are checked on the server; the code itself is never stored in the app.
  redeem: async (code) => (await httpsCallable(functions, 'redeemReferral')({ code })).data,
};