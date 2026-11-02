import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, ADMIN_EMAIL, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isRealAdmin: boolean;
  activeRole: UserRole;
  activeTeam: string;
  activeRef: string;
  setSimulatedRole: (role: UserRole, team?: string, ref?: string) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulation mode for admin testing
  const [simulatedRole, setSimulatedRoleState] = useState<UserRole | null>(null);
  const [simulatedTeam, setSimulatedTeam] = useState<string>('');
  const [simulatedRef, setSimulatedRef] = useState<string>('');

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);

      if (!currentUser) {
        setUserProfile(null);
        setLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
        return;
      }

      const isSuperAdmin = (currentUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const userRef = doc(db, 'users', currentUser.uid);

      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const initialData: Partial<UserProfile> = {
            name: currentUser.displayName || 'Usuario KAPE',
            email: currentUser.email || '',
            role: isSuperAdmin ? 'admin' : 'visitante',
            photoURL: currentUser.photoURL || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await setDoc(userRef, initialData);

          if (isSuperAdmin) {
            // Also ensure document in admins collection
            await setDoc(doc(db, 'admins', currentUser.uid), {
              email: currentUser.email,
              createdAt: serverTimestamp(),
            });
          }
        } else if (isSuperAdmin && snap.data()?.role !== 'admin') {
          await setDoc(userRef, { role: 'admin' }, { merge: true });
        }
      } catch (err) {
        console.warn('Could not initialize user profile:', err);
      }

      // Listen for profile changes in real time (e.g. admin assigns captain/referee role)
      unsubscribeDoc = onSnapshot(
        userRef,
        docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const finalRole: UserRole = isSuperAdmin ? 'admin' : (data.role || 'visitante');
            setUserProfile({
              ...data,
              id: docSnap.id,
              role: finalRole,
            });
          }
          setLoading(false);
        },
        error => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const isRealAdmin =
    (user?.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    userProfile?.role === 'admin';

  const activeRole: UserRole = isRealAdmin && simulatedRole ? simulatedRole : (userProfile?.role || 'visitante');
  const activeTeam: string = isRealAdmin && simulatedRole === 'capitan' ? simulatedTeam : (userProfile?.team || '');
  const activeRef: string = isRealAdmin && simulatedRole === 'arbitro' ? simulatedRef : (userProfile?.ref || '');

  const setSimulatedRole = (role: UserRole, team: string = '', ref: string = '') => {
    if (!isRealAdmin) return;
    if (role === 'admin') {
      setSimulatedRoleState(null);
      setSimulatedTeam('');
      setSimulatedRef('');
    } else {
      setSimulatedRoleState(role);
      setSimulatedTeam(team);
      setSimulatedRef(ref);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        alert('Error al iniciar sesión con Google: ' + (err.message || err.code));
      }
    }
  };

  const logout = async () => {
    setSimulatedRoleState(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isRealAdmin,
        activeRole,
        activeTeam,
        activeRef,
        setSimulatedRole,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
