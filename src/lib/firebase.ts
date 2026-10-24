import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Conversation, User, ApiKeyItem } from '../types';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if configured
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Map Firebase User to App User
export function mapFirebaseUser(user: FirebaseUser): User {
  return {
    id: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Scholar',
    email: user.email || '',
    role: 'Berno Scholar',
    tier: 'Scholar',
    avatar: user.photoURL || undefined,
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).getTime()
      : Date.now(),
  };
}

// Authentication Helpers
export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && credential.user) {
    await updateProfile(credential.user, { displayName: name });
  }
  const appUser = mapFirebaseUser(credential.user);
  
  // Persist user record in Firestore
  try {
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: name || credential.user.displayName || 'Scholar',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not write user profile doc immediately:', err);
  }

  return appUser;
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  return mapFirebaseUser(credential.user);
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  const appUser = mapFirebaseUser(credential.user);

  try {
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName || 'Scholar',
      photoURL: credential.user.photoURL || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not update user profile on Google sign-in:', err);
  }

  return appUser;
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      callback(mapFirebaseUser(fbUser));
    } else {
      callback(null);
    }
  });
}

// Firestore Persistence for Conversations & Responses
export async function saveConversationToCloud(uid: string, conversation: Conversation): Promise<void> {
  if (!uid || !conversation.id) return;
  const conversationDocRef = doc(db, 'users', uid, 'conversations', conversation.id);
  await setDoc(conversationDocRef, {
    id: conversation.id,
    userId: uid,
    title: conversation.title,
    mode: conversation.mode,
    chatbotRole: conversation.chatbotRole,
    pinned: Boolean(conversation.pinned),
    tags: conversation.tags || [],
    messages: conversation.messages || [],
    updatedAt: typeof conversation.updatedAt === 'number' ? conversation.updatedAt : Date.now(),
    createdAt: typeof conversation.createdAt === 'number' ? conversation.createdAt : Date.now(),
  }, { merge: true });
}

export async function loadConversationsFromCloud(uid: string): Promise<Conversation[]> {
  if (!uid) return [];
  try {
    const colRef = collection(db, 'users', uid, 'conversations');
    const snapshot = await getDocs(colRef);
    const list: Conversation[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      list.push({
        id: data.id || d.id,
        title: data.title || 'Untitled Session',
        mode: data.mode || 'dialectic',
        chatbotRole: data.chatbotRole || 'epistemic_architect',
        pinned: Boolean(data.pinned),
        tags: data.tags || [],
        messages: (data.messages || []).map((m: any) => ({
          ...m,
          timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
        })),
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
        updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
      });
    });
    // Sort recent first
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.warn('Error loading conversations from Firestore:', err);
    return [];
  }
}

export async function deleteConversationFromCloud(uid: string, conversationId: string): Promise<void> {
  if (!uid || !conversationId) return;
  try {
    const docRef = doc(db, 'users', uid, 'conversations', conversationId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Error deleting cloud conversation:', err);
  }
}

export async function saveUserSettingsToCloud(uid: string, settings: Record<string, any>): Promise<void> {
  if (!uid) return;
  try {
    const settingsRef = doc(db, 'users', uid, 'settings', 'preferences');
    await setDoc(settingsRef, {
      userId: uid,
      ...settings,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Error saving user settings:', err);
  }
}

export async function loadUserSettingsFromCloud(uid: string): Promise<Record<string, any> | null> {
  if (!uid) return null;
  try {
    const settingsRef = doc(db, 'users', uid, 'settings', 'preferences');
    const snap = await getDoc(settingsRef);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('Error loading user settings:', err);
    return null;
  }
}

// Connection check required by skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or network restricted.');
    }
    return false;
  }
}

// API Key Firestore Persistence & Management
export async function saveApiKeyToCloud(uid: string, keyItem: ApiKeyItem): Promise<void> {
  if (!uid || !keyItem.id) return;
  try {
    const keyRef = doc(db, 'users', uid, 'api_keys', keyItem.id);
    await setDoc(keyRef, {
      ...keyItem,
      userId: uid,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Error saving API key to cloud:', err);
  }
}

export async function loadApiKeysFromCloud(uid: string): Promise<ApiKeyItem[]> {
  if (!uid) return [];
  try {
    const colRef = collection(db, 'users', uid, 'api_keys');
    const snap = await getDocs(colRef);
    const keys: ApiKeyItem[] = [];
    snap.forEach((d) => {
      const data = d.data();
      keys.push({
        id: data.id || d.id,
        name: data.name || 'API Key',
        keyPrefix: data.keyPrefix || 'berno_live',
        key: data.key || '',
        permissions: Array.isArray(data.permissions) ? data.permissions : ['read:all_data'],
        targetWebsite: data.targetWebsite || '',
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
        lastUsedAt: typeof data.lastUsedAt === 'number' ? data.lastUsedAt : undefined,
        status: data.status === 'revoked' ? 'revoked' : 'active',
      });
    });
    return keys.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.warn('Error loading API keys from cloud:', err);
    return [];
  }
}

export async function revokeApiKeyInCloud(uid: string, keyId: string): Promise<void> {
  if (!uid || !keyId) return;
  try {
    const keyRef = doc(db, 'users', uid, 'api_keys', keyId);
    await setDoc(keyRef, { status: 'revoked', revokedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Error revoking API key:', err);
  }
}

export async function deleteApiKeyFromCloud(uid: string, keyId: string): Promise<void> {
  if (!uid || !keyId) return;
  try {
    const keyRef = doc(db, 'users', uid, 'api_keys', keyId);
    await deleteDoc(keyRef);
  } catch (err) {
    console.warn('Error deleting API key:', err);
  }
}

