import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, UserStatus, InviteToken, AdminActiveMode } from '../types';
import { MOCK_USERS, isFounderAdminEmail } from '../services/mockData';
import { safeSetItem } from '../services/safeStorage';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { findInviteById, markInviteUsed, getSavedInvites, saveInvites } from '../services/inviteService';
import {
  getUserFromCloud,
  syncUserToCloud,
  deleteUserFromCloud,
  subscribeToUsers,
  fetchInviteFromCloud,
} from '../services/cloudSync';

export type TestRoleView = 'admin' | 'committee' | 'player' | 'pending' | 'spectator';

interface RegisterWithInviteParams {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  token: InviteToken;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  realCurrentUser: UserProfile | null;
  allUsers: UserProfile[];
  loading: boolean;
  isFirebaseMode: boolean;
  adminMode: AdminActiveMode;
  setAdminMode: (mode: AdminActiveMode) => void;
  isTestMode: boolean;
  canUseTestMode: boolean;
  canTestAdminView: boolean;
  testRoleView: TestRoleView;
  enterTestMode: (
    initialUsers: UserProfile[],
    defaultPlayerId?: string,
    defaultPlayerName?: string,
    initialView?: TestRoleView
  ) => void;
  exitTestMode: () => void;
  setSandboxUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  switchTestPersona: (view: TestRoleView, playerId?: string, playerName?: string) => void;
  switchMockRole: (role: UserRole | 'pending') => void;
  approveUser: (uid: string, claimedPlayerId: string, role?: UserRole) => void;
  rejectUser: (uid: string) => void;
  updateClaimedPlayer: (playerId: string) => void;
  loginWithCredentials: (user: UserProfile) => void;
  registerWithInvite: (params: RegisterWithInviteParams) => void;
  logout: () => void;
  authRedirectError: string | null;
  clearAuthRedirectError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USERS_KEY = 'revirfc_users_v4';
const LOCAL_STORAGE_CURRENT_KEY = 'revirfc_current_user_v4';
const LOCAL_STORAGE_ADMIN_MODE_KEY = 'revirfc_admin_mode_v1';
export const PENDING_INVITE_SESSION_KEY = 'revirfc_pending_invite_v1';

/**
 * Sahte / eski demo kullanıcı kayıtlarını tespit eder (@revirfc.com, yeni.uye@gmail.com veya 'user-' mock UID).
 */
function isDemoPlaceholderUser(user?: Partial<UserProfile> | null): boolean {
  if (!user) return true;
  const emailLower = (user.email || '').trim().toLowerCase();
  const uid = user.uid || '';
  if (emailLower.endsWith('@revirfc.com') || emailLower === 'yeni.uye@gmail.com') return true;
  if (uid.startsWith('user-')) return true;
  return false;
}

/**
 * Kurucu yönetici e-postası (ör. tabipsubayi@gmail.com) yanlışlıkla pending kaydedilmişse
 * anında onaylı yöneticiye (Alper / p1) yükseltir.
 */
function normalizeFounderProfile(user: UserProfile): UserProfile {
  if (isFounderAdminEmail(user.email)) {
    return {
      ...user,
      role: 'admin',
      status: 'approved',
      claimedPlayerId: user.claimedPlayerId || 'p1',
      displayName: user.displayName && user.displayName !== 'Yeni Futbolcu' ? user.displayName : 'Alper',
    };
  }
  return user;
}

/**
 * URL veya sessionStorage üzerinde aktif bir davet tokenı varsa döndürür.
 */
function readActiveInviteToken(): InviteToken | undefined {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('invite');
    if (fromUrl) {
      const found = findInviteById(fromUrl);
      if (found) return found;
    }
    const fromSession = sessionStorage.getItem(PENDING_INVITE_SESSION_KEY);
    if (fromSession) {
      const found = findInviteById(fromSession);
      if (found) return found;
    }
    const fromLocal = localStorage.getItem(PENDING_INVITE_SESSION_KEY);
    if (fromLocal) {
      const found = findInviteById(fromLocal);
      if (found) return found;
    }
  } catch {}
  return undefined;
}

function clearPendingInviteFromUrlAndSession() {
  try {
    sessionStorage.removeItem(PENDING_INVITE_SESSION_KEY);
    localStorage.removeItem(PENDING_INVITE_SESSION_KEY);
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.has('invite')) {
      url.searchParams.delete('invite');
      changed = true;
    }
    if (url.searchParams.has('auth')) {
      url.searchParams.delete('auth');
      changed = true;
    }
    if (changed) {
      window.history.replaceState({}, '', url.toString());
    }
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    try {
      localStorage.removeItem('revirfc_users_v1');
      localStorage.removeItem('revirfc_current_user_v1');
      localStorage.removeItem('revirfc_users_v2');
      localStorage.removeItem('revirfc_current_user_v2');
      localStorage.removeItem('revirfc_users_v3');
      localStorage.removeItem('revirfc_current_user_v3');
    } catch {}
  }, []);

  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (!saved) return MOCK_USERS;
    try {
      const parsed: UserProfile[] = JSON.parse(saved);
      if (parsed.some((u) => u.displayName.includes('Mert Kayra')) || !parsed.some((u) => u.uid === 'user-korkmaz')) {
        return MOCK_USERS;
      }
      const cleaned = parsed.filter((u) => !isDemoPlaceholderUser(u)).map(normalizeFounderProfile);
      return cleaned.length > 0 ? cleaned : MOCK_USERS;
    } catch {
      return MOCK_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CURRENT_KEY);
    if (!saved) return null; // Giriş yapmamış cihazlar Seyirci Modu ile başlar
    try {
      const parsed: UserProfile = JSON.parse(saved);
      if (!parsed || !parsed.uid || isDemoPlaceholderUser(parsed)) {
        return null;
      }
      return normalizeFounderProfile(parsed);
    } catch {
      return null;
    }
  });

  const [adminMode, setAdminModeState] = useState<AdminActiveMode>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ADMIN_MODE_KEY);
      if (saved === 'committee' || saved === 'admin') return saved;
    } catch {}
    return 'admin';
  });

  // Yönetici Test / Sandbox Modu state'leri (yalnızca bellek içi, gerçek oturumu ve Firestore'u etkilemez)
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [sandboxUsers, setSandboxUsers] = useState<UserProfile[]>([]);
  const [sandboxCurrentUser, setSandboxCurrentUser] = useState<UserProfile | null>(null);
  const [sandboxAdminMode, setSandboxAdminMode] = useState<AdminActiveMode>('admin');
  const [testRoleView, setTestRoleView] = useState<TestRoleView>('admin');
  const [authRedirectError, setAuthRedirectError] = useState<string | null>(null);

  const isTestModeRef = useRef(isTestMode);
  isTestModeRef.current = isTestMode;
  const sandboxUsersRef = useRef(sandboxUsers);
  sandboxUsersRef.current = sandboxUsers;
  const sandboxCurrentUserRef = useRef(sandboxCurrentUser);
  sandboxCurrentUserRef.current = sandboxCurrentUser;

  const setAdminMode = (mode: AdminActiveMode) => {
    if (isTestModeRef.current) {
      setSandboxAdminMode(mode);
      setTestRoleView(mode === 'admin' ? 'admin' : 'committee');
      return;
    }
    setAdminModeState(mode);
    safeSetItem(LOCAL_STORAGE_ADMIN_MODE_KEY, mode);
  };

  const [loading] = useState<boolean>(false);

  // Refs for stable access inside Firebase auth listener (prevents re-subscribing on every state change)
  const allUsersRef = useRef<UserProfile[]>(allUsers);
  allUsersRef.current = allUsers;

  const currentUserRef = useRef<UserProfile | null>(currentUser);
  currentUserRef.current = currentUser;

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    if (currentUser) {
      safeSetItem(LOCAL_STORAGE_CURRENT_KEY, JSON.stringify(currentUser));
    } else {
      try {
        localStorage.removeItem(LOCAL_STORAGE_CURRENT_KEY);
      } catch {}
    }
  }, [currentUser]);

  // Firestore users real-time listener (keeps admin approval list synced across devices)
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribe = subscribeToUsers((cloudUsers) => {
      if (!cloudUsers || cloudUsers.length === 0) return;

      // Bulutta eski demo kayıtları kalmışsa sessizce temizle (@revirfc.com / yeni.uye@gmail.com / user-*)
      cloudUsers.filter(isDemoPlaceholderUser).forEach((demoU) => {
        deleteUserFromCloud(demoU.uid).catch(() => {});
      });

      const normalizedCloud = cloudUsers
        .filter((u) => !isDemoPlaceholderUser(u))
        .map(normalizeFounderProfile);

      setAllUsers((prev) => {
        const mergedMap = new Map<string, UserProfile>();
        for (const u of prev) {
          if (!isDemoPlaceholderUser(u)) {
            mergedMap.set(u.uid, normalizeFounderProfile(u));
          }
        }
        for (const cu of normalizedCloud) {
          for (const [k, existing] of mergedMap.entries()) {
            if (cu.email && existing.email.toLowerCase() === cu.email.toLowerCase() && k !== cu.uid) {
              mergedMap.delete(k);
            }
          }
          mergedMap.set(cu.uid, cu);
        }
        return mergedMap.size > 0 ? Array.from(mergedMap.values()) : MOCK_USERS;
      });

      // Keep active logged-in user synced if admin approved or updated their role in cloud
      const active = currentUserRef.current;
      if (active) {
        const updatedSelf = normalizedCloud.find(
          (cu) => cu.uid === active.uid || (active.email && cu.email.toLowerCase() === active.email.toLowerCase())
        );
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Firebase auth state listener (mounted once; handles redirect results, founder admin, active invite tokens, cloud profile)
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    // Check redirect sign-in outcome (mobile/Safari Google OAuth redirect return)
    getRedirectResult(auth).catch((err) => {
      console.error('Google redirect auth error:', err);
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setAuthRedirectError('Bu alan adı Firebase Auth için yetkilendirilmemiş.');
      } else if (code !== 'auth/cancelled-popup-request') {
        setAuthRedirectError((err as Error)?.message || 'Google yönlendirme girişi tamamlanamadı.');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // Gerçek Firebase Auth oturumu yoksa cihaz Seyirci Moduna (null) sıfırlanır
        setCurrentUser(null);
        try {
          localStorage.removeItem(LOCAL_STORAGE_CURRENT_KEY);
        } catch {}
        return;
      }

      const fbEmail = (fbUser.email || '').trim().toLowerCase();
      let activeInvite = readActiveInviteToken();
      if (!activeInvite) {
        try {
          const params = new URLSearchParams(window.location.search);
          const code =
            params.get('invite') ||
            sessionStorage.getItem(PENDING_INVITE_SESSION_KEY) ||
            localStorage.getItem(PENDING_INVITE_SESSION_KEY);
          if (code) {
            const cloudInvite = await fetchInviteFromCloud(code);
            if (cloudInvite) {
              activeInvite = cloudInvite;
              const localList = getSavedInvites();
              if (!localList.some((i) => i.id === cloudInvite.id)) {
                saveInvites([cloudInvite, ...localList]);
              }
            }
          }
        } catch {}
      }
      const cloudProfile = await getUserFromCloud(fbUser.uid);

      const existingLocal = allUsersRef.current.find(
        (u) => u.uid === fbUser.uid || (fbEmail && u.email.toLowerCase() === fbEmail)
      );

      let resolvedUser: UserProfile;

      if (isFounderAdminEmail(fbEmail)) {
        // Kurucu yönetici (tabipsubayi@gmail.com) asla onay kapısında kalmaz
        resolvedUser = {
          uid: fbUser.uid,
          email: fbUser.email || fbEmail,
          displayName: fbUser.displayName || existingLocal?.displayName || 'Alper',
          photoURL: fbUser.photoURL || existingLocal?.photoURL,
          role: 'admin',
          status: 'approved',
          claimedPlayerId: cloudProfile?.claimedPlayerId || existingLocal?.claimedPlayerId || 'p1',
          createdAt: cloudProfile?.createdAt || existingLocal?.createdAt || new Date().toISOString(),
        };
        if (activeInvite) {
          // Kurucu yönetici yanlışlıkla başka bir üyenin davet linkini açarsa linki tüketme; sadece URL'den temizle
          clearPendingInviteFromUrlAndSession();
        }
        syncUserToCloud(resolvedUser);
      } else if (activeInvite) {
        // Geçerli davet linkiyle giriş/kayıt -> doğrudan linkteki yetki & kart ile onayla!
        resolvedUser = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || activeInvite.name,
          photoURL: fbUser.photoURL || undefined,
          role: activeInvite.role,
          status: 'approved',
          claimedPlayerId: activeInvite.claimedPlayerId,
          createdAt: cloudProfile?.createdAt || existingLocal?.createdAt || new Date().toISOString(),
        };
        markInviteUsed(activeInvite.id, resolvedUser.email);
        clearPendingInviteFromUrlAndSession();
        syncUserToCloud(resolvedUser);
      } else if (cloudProfile) {
        resolvedUser = normalizeFounderProfile({
          ...cloudProfile,
          photoURL: fbUser.photoURL || cloudProfile.photoURL,
        });
      } else if (existingLocal && existingLocal.status === 'approved') {
        resolvedUser = normalizeFounderProfile({
          ...existingLocal,
          uid: fbUser.uid,
          photoURL: fbUser.photoURL || existingLocal.photoURL,
        });
        syncUserToCloud(resolvedUser);
      } else {
        resolvedUser = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'Yeni Futbolcu',
          photoURL: fbUser.photoURL || undefined,
          role: 'player',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        syncUserToCloud(resolvedUser);
      }

      setAllUsers((prev) => {
        const filtered = prev.filter(
          (u) => u.uid !== resolvedUser.uid && (!fbEmail || u.email.toLowerCase() !== fbEmail)
        );
        return [resolvedUser, ...filtered];
      });
      setCurrentUser(resolvedUser);
    });

    return () => unsubscribe();
  }, []);

  const switchMockRole = (type: UserRole | 'pending') => {
    if (type === 'admin') {
      const user = allUsers.find((u) => u.role === 'admin') || MOCK_USERS[0] || null;
      setCurrentUser(user);
    } else if (type === 'captain') {
      const user = allUsers.find((u) => u.role === 'captain') || null;
      if (user) setCurrentUser(user);
    } else if (type === 'pending') {
      const user = allUsers.find((u) => u.status === 'pending') || null;
      setCurrentUser(user);
    } else {
      const user = allUsers.find((u) => u.role === 'player' && u.status === 'approved') || null;
      setCurrentUser(user);
    }
  };

  const approveUser = (uid: string, claimedPlayerId: string, role: UserRole = 'player') => {
    if (isTestModeRef.current) {
      const existingSb = sandboxUsersRef.current.find((u) => u.uid === uid);
      const updatedSb: UserProfile | undefined = existingSb
        ? { ...existingSb, status: 'approved' as UserStatus, claimedPlayerId, role }
        : undefined;
      setSandboxUsers((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, status: 'approved' as UserStatus, claimedPlayerId, role } : u
        )
      );
      if (sandboxCurrentUserRef.current?.uid === uid && updatedSb) {
        setSandboxCurrentUser(updatedSb);
      }
      return;
    }

    const existing = allUsersRef.current.find((u) => u.uid === uid);
    const approvedProfile: UserProfile | undefined = existing
      ? { ...existing, status: 'approved' as UserStatus, claimedPlayerId, role }
      : undefined;

    setAllUsers((prev) =>
      prev.map((u) =>
        u.uid === uid
          ? { ...u, status: 'approved' as UserStatus, claimedPlayerId, role }
          : u
      )
    );
    if (approvedProfile) {
      syncUserToCloud(approvedProfile);
    }
    if (currentUser?.uid === uid) {
      setCurrentUser((prev) => (prev ? { ...prev, status: 'approved', claimedPlayerId, role } : null));
    }
  };

  const rejectUser = (uid: string) => {
    if (isTestModeRef.current) {
      setSandboxUsers((prev) => prev.filter((u) => u.uid !== uid));
      if (sandboxCurrentUserRef.current?.uid === uid) {
        setSandboxCurrentUser(null);
        setTestRoleView('spectator');
      }
      return;
    }

    setAllUsers((prev) => prev.filter((u) => u.uid !== uid));
    deleteUserFromCloud(uid);
    if (currentUser?.uid === uid) {
      setCurrentUser(null);
    }
  };

  const updateClaimedPlayer = (playerId: string) => {
    if (isTestModeRef.current) {
      const activeSb = sandboxCurrentUserRef.current;
      if (!activeSb) return;
      const updated = { ...activeSb, claimedPlayerId: playerId };
      setSandboxCurrentUser(updated);
      setSandboxUsers((prev) => prev.map((u) => (u.uid === updated.uid ? updated : u)));
      return;
    }

    if (!currentUser) return;
    const updated = { ...currentUser, claimedPlayerId: playerId };
    setCurrentUser(updated);
    setAllUsers((prev) => prev.map((u) => (u.uid === updated.uid ? updated : u)));
    syncUserToCloud(updated);
  };

  const loginWithCredentials = (user: UserProfile) => {
    if (isTestModeRef.current) {
      setSandboxCurrentUser(user);
      setTestRoleView(
        user.status === 'pending'
          ? 'pending'
          : user.role === 'admin'
          ? 'admin'
          : user.role === 'captain'
          ? 'committee'
          : 'player'
      );
      return;
    }
    const normalized = normalizeFounderProfile(user);
    setCurrentUser(normalized);
  };

  const registerWithInvite = ({ uid, email, displayName, photoURL, token }: RegisterWithInviteParams) => {
    if (isTestModeRef.current) {
      const sbUser: UserProfile = {
        uid: `sandbox-invite-${Date.now()}`,
        email,
        displayName: displayName || token.name,
        photoURL,
        role: token.role,
        status: 'approved',
        claimedPlayerId: token.claimedPlayerId,
        createdAt: new Date().toISOString(),
      };
      setSandboxUsers((prev) => [sbUser, ...prev.filter((u) => u.uid !== sbUser.uid)]);
      setSandboxCurrentUser(sbUser);
      setTestRoleView(sbUser.role === 'captain' ? 'committee' : sbUser.role === 'admin' ? 'admin' : 'player');
      markInviteUsed(token.id, email);
      return;
    }

    const isFounder = isFounderAdminEmail(email);
    const newUser: UserProfile = {
      uid,
      email,
      displayName: displayName || token.name,
      photoURL,
      role: isFounder ? 'admin' : token.role,
      status: 'approved', // Davet linki ile geldiği için anında onaylı!
      claimedPlayerId: token.claimedPlayerId || (isFounder ? 'p1' : undefined),
      createdAt: new Date().toISOString(),
    };

    const emailLower = email.trim().toLowerCase();
    setAllUsers((prev) => {
      const filtered = prev.filter(
        (u) => u.uid !== uid && (!emailLower || u.email.toLowerCase() !== emailLower)
      );
      return [newUser, ...filtered];
    });
    setCurrentUser(newUser);
    markInviteUsed(token.id, email);
    clearPendingInviteFromUrlAndSession();
    syncUserToCloud(newUser);
  };

  const logout = () => {
    if (isTestModeRef.current) {
      setSandboxCurrentUser(null);
      setTestRoleView('spectator');
      return;
    }
    if (isFirebaseConfigured && auth) {
      signOut(auth).catch(console.error);
    }
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_KEY);
  };

  const canTestAdminView =
    currentUser?.status === 'approved' && currentUser?.role === 'admin';

  const switchTestPersona = (view: TestRoleView, playerId?: string, playerName?: string) => {
    const safeView: TestRoleView = view === 'admin' && !canTestAdminView ? 'committee' : view;
    setTestRoleView(safeView);
    if (safeView === 'spectator') {
      setSandboxCurrentUser(null);
      return;
    }

    if (safeView === 'pending') {
      const pending = sandboxUsersRef.current.find((u) => u.status === 'pending');
      setSandboxCurrentUser(
        pending || {
          uid: 'sandbox-pending-preview',
          email: 'bekleyen.uye@revirfc.sandbox',
          displayName: playerName || 'Onay Bekleyen Üye (Test)',
          role: 'player',
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
      );
      return;
    }

    const fallbackId =
      playerId ||
      sandboxCurrentUserRef.current?.claimedPlayerId ||
      (safeView === 'admin' ? 'p1' : safeView === 'committee' ? 'p2' : 'p5');

    const baseUser = sandboxUsersRef.current.find((u) => u.claimedPlayerId === fallbackId);
    const resolvedName = playerName || baseUser?.displayName?.replace(/\s*\(Test.*\)$/, '') || 'Test Üyesi';

    if (safeView === 'admin') {
      setSandboxAdminMode('admin');
      setSandboxCurrentUser({
        uid: `sandbox-admin-${fallbackId}`,
        email: baseUser?.email || 'tabipsubayi@gmail.com',
        displayName: `${resolvedName} (Test Yönetici)`,
        photoURL: baseUser?.photoURL,
        role: 'admin',
        status: 'approved',
        claimedPlayerId: fallbackId,
        createdAt: baseUser?.createdAt || new Date().toISOString(),
      });
      return;
    }

    if (safeView === 'committee') {
      setSandboxAdminMode('committee');
      setSandboxCurrentUser({
        uid: `sandbox-committee-${fallbackId}`,
        email: baseUser?.email || `${fallbackId}.kurul@revirfc.sandbox`,
        displayName: `${resolvedName} (Test Kurul)`,
        photoURL: baseUser?.photoURL,
        role: 'captain',
        status: 'approved',
        claimedPlayerId: fallbackId,
        createdAt: baseUser?.createdAt || new Date().toISOString(),
      });
      return;
    }

    // Düz Oyuncu (player): COMMITTEE_MEMBERS listesinde olsa bile düz üye kısıtlamalarını test edebilmesi için forced prefix kullan
    setSandboxCurrentUser({
      uid: `sandbox-force-player-${fallbackId}`,
      email: baseUser?.email || `${fallbackId}.oyuncu@revirfc.sandbox`,
      displayName: `${resolvedName} (Test Oyuncu)`,
      photoURL: baseUser?.photoURL,
      role: 'player',
      status: 'approved',
      claimedPlayerId: fallbackId,
      createdAt: baseUser?.createdAt || new Date().toISOString(),
    });
  };

  const enterTestMode = (
    initialUsers: UserProfile[],
    defaultPlayerId: string = 'p1',
    defaultPlayerName?: string,
    initialView: TestRoleView = 'admin'
  ) => {
    const safeInitialView: TestRoleView =
      initialView === 'admin' && !canTestAdminView ? 'committee' : initialView;
    setSandboxUsers(initialUsers);
    setIsTestMode(true);
    isTestModeRef.current = true;
    sandboxUsersRef.current = initialUsers;
    setSandboxAdminMode(safeInitialView === 'admin' ? 'admin' : 'committee');
    setTestRoleView(safeInitialView);

    const matchedUser = initialUsers.find((u) => u.claimedPlayerId === defaultPlayerId);
    const isAdminStart = safeInitialView === 'admin';
    setSandboxCurrentUser({
      uid: `${isAdminStart ? 'sandbox-admin' : 'sandbox-committee'}-${defaultPlayerId}`,
      email: matchedUser?.email || (isAdminStart ? 'tabipsubayi@gmail.com' : `${defaultPlayerId}.kurul@revirfc.sandbox`),
      displayName: defaultPlayerName
        ? `${defaultPlayerName} (${isAdminStart ? 'Test Yönetici' : 'Test Kurul'})`
        : matchedUser?.displayName || (isAdminStart ? 'Alper (Test Yönetici)' : 'Kurul Üyesi (Test Kurul)'),
      photoURL: matchedUser?.photoURL,
      role: isAdminStart ? 'admin' : 'captain',
      status: 'approved',
      claimedPlayerId: defaultPlayerId,
      createdAt: matchedUser?.createdAt || new Date().toISOString(),
    });
  };

  const exitTestMode = () => {
    setIsTestMode(false);
    isTestModeRef.current = false;
    setSandboxUsers([]);
    setSandboxCurrentUser(null);
    setSandboxAdminMode('admin');
    setTestRoleView('admin');
  };

  const canUseTestMode =
    isTestMode ||
    (currentUser?.status === 'approved' && (currentUser?.role === 'admin' || currentUser?.role === 'captain'));

  return (
    <AuthContext.Provider
      value={{
        currentUser: isTestMode ? sandboxCurrentUser : currentUser,
        realCurrentUser: currentUser,
        allUsers: isTestMode ? sandboxUsers : allUsers,
        loading,
        isFirebaseMode: isFirebaseConfigured,
        adminMode: isTestMode ? sandboxAdminMode : adminMode,
        setAdminMode,
        isTestMode,
        canUseTestMode,
        canTestAdminView,
        testRoleView,
        enterTestMode,
        exitTestMode,
        setSandboxUsers,
        switchTestPersona,
        switchMockRole,
        approveUser,
        rejectUser,
        updateClaimedPlayer,
        loginWithCredentials,
        registerWithInvite,
        logout,
        authRedirectError,
        clearAuthRedirectError: () => setAuthRedirectError(null),
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
