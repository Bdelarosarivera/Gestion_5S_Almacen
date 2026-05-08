import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  setPersistence,
  browserLocalPersistence,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let app: any;
let auth: any;
let db: any;

const isConfigValid = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "";

try {
  if (isConfigValid) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    
    // Set persistence explicitly to local
    setPersistence(auth, browserLocalPersistence).catch(err => console.error("Persistence error:", err));
  } else {
    throw new Error("Configuración de Firebase incompleta");
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
  // Re-throw or handle as non-configured
  auth = { currentUser: null, onAuthStateChanged: (cb: any) => { cb(null); return () => {}; } };
  db = {};
}

export { auth, db, isConfigValid as isFirebaseConfigured };

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  if (!isConfigValid) throw new Error("Firebase no está configurado. Use 'set_up_firebase' primero.");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error logging in with Google:", error);
    throw error;
  }
};

export const logout = () => isConfigValid ? signOut(auth) : Promise.resolve();

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!isConfigValid || !auth.onAuthStateChanged) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// UI Error helper as per integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
