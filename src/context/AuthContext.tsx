import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, UserStatus } from '../types';
import { MOCK_USERS } from '../services/mockData';
import { safeSetItem } from '../services/safeStorage';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  loading: boolean;
  isFirebaseMode: boolean;
  switchMockRole: (role: UserRole | 'pending') => void;
  approveUser: (uid: string, claimedPlayerId: string, role?: UserRole) => void;
  rejectUser: (uid: string) => void;
  updateClaimedPlayer: (playerId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USERS_KEY = 'revirfc_users_v2';
const LOCAL_STORAGE_CURRENT_KEY = 'revirfc_current_user_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Clear legacy mock cache if present
  useEffect(() => {
    try {
      localStorage.removeItem('revirfc_users_v1');
      localStorage.removeItem('revirfc_current_user_v1');
    } catch {}
  }, []);

  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (!saved) return MOCK_USERS;
    try {
      const parsed: UserProfile[] = JSON.parse(saved);
      // If legacy dummy users exist, reset to current real users
      if (parsed.some((u) => u.displayName.includes('Mert Kayra'))) {
        return MOCK_USERS;
      }
      return parsed;
    } catch {
      return MOCK_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CURRENT_KEY);
    if (!saved) return MOCK_USERS[0]; // Alper
    try {
      const parsed: UserProfile = JSON.parse(saved);
      if (parsed.displayName.includes('Mert Kayra')) {
        return MOCK_USERS[0];
      }
      return parsed;
    } catch {
      return MOCK_USERS[0];
    }
  });

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    if (currentUser) {
      safeSetItem(LOCAL_STORAGE_CURRENT_KEY, JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Firebase auth state listener if enabled
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          // Check if user exists in allUsers or create pending
          const existing = allUsers.find((u) => u.uid === fbUser.uid || u.email === fbUser.email);
          if (existing) {
            setCurrentUser(existing);
          } else {
            const newUser: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Yeni Futbolcu',
              photoURL: fbUser.photoURL || undefined,
              role: 'player',
              status: 'pending', // Approval gate!
              createdAt: new Date().toISOString(),
            };
            setAllUsers((prev) => [...prev, newUser]);
            setCurrentUser(newUser);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [allUsers]);

  const switchMockRole = (type: UserRole | 'pending') => {
    if (type === 'admin') {
      const user = allUsers.find((u) => u.role === 'admin') || MOCK_USERS[0];
      setCurrentUser(user);
    } else if (type === 'captain') {
      const user = allUsers.find((u) => u.role === 'captain') || MOCK_USERS[1];
      setCurrentUser(user);
    } else if (type === 'pending') {
      const user = allUsers.find((u) => u.status === 'pending') || MOCK_USERS.find((u) => u.status === 'pending') || MOCK_USERS[MOCK_USERS.length - 1];
      setCurrentUser(user);
    } else {
      const user = allUsers.find((u) => u.role === 'player' && u.status === 'approved') || MOCK_USERS[2];
      setCurrentUser(user);
    }
  };

  const approveUser = (uid: string, claimedPlayerId: string, role: UserRole = 'player') => {
    setAllUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, status: 'approved' as UserStatus, claimedPlayerId, role } : u))
    );
    if (currentUser?.uid === uid) {
      setCurrentUser((prev) => (prev ? { ...prev, status: 'approved', claimedPlayerId, role } : null));
    }
  };

  const rejectUser = (uid: string) => {
    setAllUsers((prev) => prev.filter((u) => u.uid !== uid));
    if (currentUser?.uid === uid) {
      setCurrentUser(null);
    }
  };

  const updateClaimedPlayer = (playerId: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, claimedPlayerId: playerId };
    setCurrentUser(updated);
    setAllUsers((prev) => prev.map((u) => (u.uid === updated.uid ? updated : u)));
  };

  const logout = () => {
    if (isFirebaseConfigured && auth) {
      signOut(auth).catch(console.error);
    }
    // Switch to pending user to demonstrate locked door
    switchMockRole('pending');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        loading,
        isFirebaseMode: isFirebaseConfigured,
        switchMockRole,
        approveUser,
        rejectUser,
        updateClaimedPlayer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
