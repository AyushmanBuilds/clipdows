// presence.js — heartbeat so the admin dashboard can count Windows users online.
import { app, auth } from './firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const db = getFirestore(app);
const beat = () => {
  const u = auth.currentUser;
  if (!u) return;
  setDoc(doc(db, 'presence', u.uid), { platform: 'windows', lastSeen: serverTimestamp() }).catch(() => {});
};
auth.onAuthStateChanged((u) => { if (u) beat(); });
setInterval(beat, 3 * 60 * 1000);
