import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { auth } from '../firebase';

export const watchAuth = (callback) => onAuthStateChanged(auth, callback);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    // fallback for popup-blocked browsers/environments
    await signInWithRedirect(auth, provider);
    return null;
  }
};

export const completeRedirectSignIn = async () => {
  try {
    return await getRedirectResult(auth);
  } catch {
    return null;
  }
};

export const logout = async () => signOut(auth);

export const getIdToken = async (forceRefresh = true) => {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken(forceRefresh);
};
