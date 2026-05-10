import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { db as firestore, auth, handleFirestoreError, OperationType } from '../firebase';
import { User, UserRole, Spot, Event } from '../types';

const STORAGE_KEYS = {
  SESSION: 'rni_session',
  LOCAL_USERS: 'rni_local_users' // For fallback if needed, but we aim for cloud
};

// Search for MASTER_USERNAME and add helper after it
const MASTER_USERNAME = 'TIA_258';

// Helper to remove undefined values from objects (Firestore doesn't allow them)
const sanitizeData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(v => sanitizeData(v));
  }
  if (data !== null && typeof data === 'object' && !(data instanceof Date) && !(data instanceof Timestamp)) {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeData(v)])
    );
  }
  return data;
};

// Helper to ensure master admin role
const ensureMasterAdmin = (user: any) => {
  if (!user) return null;
  if (user.username && user.username.toLowerCase() === MASTER_USERNAME.toLowerCase()) {
    return { ...user, role: UserRole.ADMIN };
  }
  return user;
};

export const db = {
  users: {
    getAll: async (): Promise<any[]> => {
      const path = 'users';
      try {
        const querySnapshot = await getDocs(collection(firestore, path));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _source: 'cloud' }));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    },
    getById: async (id: string): Promise<any | null> => {
      const path = `users/${id}`;
      try {
        const docRef = doc(firestore, 'users', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return ensureMasterAdmin({ id: docSnap.id, ...docSnap.data() });
        }
        return null;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return null;
      }
    },
    create: async (userData: any): Promise<any> => {
      const path = `users/${userData.id}`;
      try {
        const userWithMeta = sanitizeData({
          ...userData,
          username_lower: userData.username.toLowerCase(),
          created_at: new Date().toISOString(),
          role: userData.role || UserRole.USER
        });
        await setDoc(doc(firestore, 'users', userData.id), userWithMeta);
        return userWithMeta;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    },
    update: async (id: string, updates: any): Promise<any | null> => {
      const path = `users/${id}`;
      try {
        const enhancedUpdates = sanitizeData({ ...updates });
        if (updates.username) {
          enhancedUpdates.username_lower = updates.username.toLowerCase();
        }
        const docRef = doc(firestore, 'users', id);
        await updateDoc(docRef, enhancedUpdates);
        const updatedSnap = await getDoc(docRef);
        return { id, ...updatedSnap.data() };
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
        return null;
      }
    },
    delete: async (id: string): Promise<boolean> => {
      const path = `users/${id}`;
      try {
        await deleteDoc(doc(firestore, 'users', id));
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
        return false;
      }
    },
    search: async (queryStr: string): Promise<any[]> => {
      const path = 'users';
      try {
        const q = query(
          collection(firestore, 'users'),
          where('username', '>=', queryStr),
          where('username', '<=', queryStr + '\uf8ff'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          username: doc.data().username,
          role: doc.data().role,
          _source: 'cloud'
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    },
    findByUsername: async (username: string): Promise<any | null> => {
      const path = 'users';
      try {
        const lowerUsername = username.toLowerCase().trim();
        // Try searching by username_lower first (new approach)
        let q = query(collection(firestore, 'users'), where('username_lower', '==', lowerUsername), limit(1));
        let querySnapshot = await getDocs(q);
        
        // Fallback to original username if not found (for old accounts)
        if (querySnapshot.empty) {
          q = query(collection(firestore, 'users'), where('username', '==', username), limit(1));
          querySnapshot = await getDocs(q);
        }

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          return ensureMasterAdmin({ id: querySnapshot.docs[0].id, ...data, _source: 'cloud' });
        }
        return null;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return null;
      }
    }
  },
  events: {
    getAll: async (): Promise<any[]> => {
      const path = 'events';
      try {
        const q = query(collection(firestore, 'events'), orderBy('start_date', 'asc'), orderBy('start_time', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _source: 'cloud' }));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    },
    create: async (event: any): Promise<any> => {
      const id = crypto.randomUUID();
      const path = `events/${id}`;
      try {
        const newEvent = sanitizeData({ ...event, id, created_at: new Date().toISOString(), _source: 'cloud' });
        await setDoc(doc(firestore, 'events', id), newEvent);
        return newEvent;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    },
    delete: async (id: string): Promise<boolean> => {
      const path = `events/${id}`;
      try {
        await deleteDoc(doc(firestore, 'events', id));
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
        return false;
      }
    }
  },
  spots: {
    getAll: async (): Promise<any[]> => {
      const path = 'spots';
      try {
        const q = query(collection(firestore, 'spots'), orderBy('created_at', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _source: 'cloud' }));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    },
    create: async (spot: any): Promise<any> => {
      const id = crypto.randomUUID();
      const path = `spots/${id}`;
      try {
        const newSpot = sanitizeData({ ...spot, id, created_at: new Date().toISOString(), _source: 'cloud' });
        await setDoc(doc(firestore, 'spots', id), newSpot);
        return newSpot;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    },
    delete: async (id: string): Promise<boolean> => {
      const path = `spots/${id}`;
      try {
        await deleteDoc(doc(firestore, 'spots', id));
        return true;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
        return false;
      }
    }
  },
  auth: {
    login: async (credentials: any): Promise<any> => {
      const { identifier, password } = credentials;
      let email = identifier.trim();
      
      if (!email.includes('@')) {
        // Find user by username to get email
        const userFound = await db.users.findByUsername(email);
        if (!userFound) {
          throw new Error("Username non trovato. Verifica di averlo scritto correttamente.");
        }
        email = userFound.email;
      }

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        let userData = await db.users.getById(firebaseUser.uid);
        
        // AUTO-HEAL: If user exists in Auth but not in Firestore collection, create a basic profile
        if (!userData) {
          console.warn("User document not found in Firestore, creating default profile.");
          const defaultUsername = firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.slice(0,5)}`;
          userData = {
            id: firebaseUser.uid,
            username: defaultUsername,
            email: firebaseUser.email || '',
            role: UserRole.USER,
            created_at: new Date().toISOString(),
            following: []
          };
          await db.users.create(userData);
        }
        
        const session = { ...userData, token: 'firebase-session' };
        sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        return session;
      } catch (error: any) {
        console.error("Login error:", error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          throw new Error("Credenziali non valide. Se hai creato l'account dalla console, prova ad accedere prima con l'Email.");
        }
        throw new Error("Errore di connessione o credenziali non valide.");
      }
    },
    register: async (userData: any): Promise<any> => {
      const { email, password, username } = userData;
      
      try {
        // Check if username exists
        const existing = await db.users.findByUsername(username);
        
        // If username exists and belongs to a DIFFERENT email, block it
        if (existing && existing.email !== email) {
          throw new Error("Username già esistente. Scegline un altro.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        const newUser = {
          id: firebaseUser.uid,
          username,
          username_lower: username.toLowerCase().trim(),
          email,
          role: userData.role || UserRole.USER,
          created_at: new Date().toISOString(),
          following: []
        };

        await db.users.create(newUser);
        
        const session = { ...newUser, token: 'firebase-session' };
        sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        return session;
      } catch (error: any) {
        console.error("Registration error:", error);
        if (error.code === 'auth/email-already-in-use') {
          throw new Error("L'indirizzo email è già utilizzato da un altro account.");
        }
        if (error.code === 'auth/weak-password') {
          throw new Error("La password è troppo debole. Usa almeno 6 caratteri.");
        }
        throw new Error(error.message || "Errore durante la registrazione");
      }
    },
    logout: async (): Promise<void> => {
      await signOut(auth);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    },
    getSession: () => {
      try {
        const session = sessionStorage.getItem(STORAGE_KEYS.SESSION);
        return session ? JSON.parse(session) : null;
      } catch (e) {
        console.error("Session retrieval error:", e);
        sessionStorage.removeItem(STORAGE_KEYS.SESSION);
        return null;
      }
    }
  },
  // Real-time listeners
  subscribeToSpots: (callback: (spots: any[]) => void) => {
    const path = 'spots';
    try {
      return onSnapshot(collection(firestore, 'spots'), (snapshot) => {
        const spots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _source: 'cloud' }));
        callback(spots);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return () => {};
    }
  },
  subscribeToEvents: (callback: (events: any[]) => void) => {
    const path = 'events';
    try {
      return onSnapshot(collection(firestore, 'events'), (snapshot) => {
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _source: 'cloud' }));
        callback(events);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return () => {};
    }
  },
  subscribeToUsers: (callback: (users: any[]) => void) => {
    const path = 'users';
    try {
      return onSnapshot(collection(firestore, 'users'), (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _source: 'cloud' }));
        callback(users);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return () => {};
    }
  }
};
