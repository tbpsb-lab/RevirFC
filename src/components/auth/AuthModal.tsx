import React, { useState, useEffect } from 'react';
import { useAuth, PENDING_INVITE_SESSION_KEY } from '../../context/AuthContext';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../../services/firebase';
import { ShieldCheck, Mail, Lock, UserCheck, AlertCircle, X, Sparkles, KeyRound } from 'lucide-react';
import { InviteToken } from '../../types';

interface Props {
  inviteToken?: InviteToken | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<Props> = ({ inviteToken, onClose, onSuccess }) => {
  const {
    currentUser,
    loginWithCredentials,
    registerWithInvite,
    allUsers,
    authRedirectError,
    clearAuthRedirectError,
  } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(!inviteToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(inviteToken?.name || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isEmbeddedInAppBrowser = /WhatsApp|FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|; wv\)/i.test(ua);
  const isMobileOrSafari =
    /iPhone|iPad|iPod|Android|Mobile/i.test(ua) ||
    (/Safari/i.test(ua) && !/Chrome|CriOS|Edg/i.test(ua));

  useEffect(() => {
    if (authRedirectError) {
      setError(authRedirectError);
      clearAuthRedirectError();
    }
  }, [authRedirectError, clearAuthRedirectError]);

  // Davet linki açıldığında token'ı hem sessionStorage hem localStorage'a yaz (yönlendirme ve iOS Safari durumları için)
  useEffect(() => {
    if (inviteToken) {
      try {
        sessionStorage.setItem(PENDING_INVITE_SESSION_KEY, inviteToken.id);
        localStorage.setItem(PENDING_INVITE_SESSION_KEY, inviteToken.id);
      } catch {}
      setIsLoginMode(false);
      if (inviteToken.name) {
        setName((prev) => prev || inviteToken.name);
      }
    }
  }, [inviteToken]);

  const handleActivateExistingPendingWithInvite = () => {
    if (!inviteToken || !currentUser) return;
    registerWithInvite({
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName || name || inviteToken.name,
      photoURL: currentUser.photoURL,
      token: inviteToken,
    });
    onSuccess?.();
    onClose?.();
  };

  // Google Sign-In (iOS Safari / mobile cross-origin storage partitioning korumalı)
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      if (inviteToken) {
        try {
          sessionStorage.setItem(PENDING_INVITE_SESSION_KEY, inviteToken.id);
          localStorage.setItem(PENDING_INVITE_SESSION_KEY, inviteToken.id);
        } catch {}
      }
      if (isFirebaseConfigured && auth) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        const authDomainHost = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
        const isOnWebAppCrossOrigin =
          typeof window !== 'undefined' &&
          authDomainHost &&
          window.location.hostname !== authDomainHost &&
          window.location.hostname.endsWith('.web.app');

        // iOS Safari & mobil tarayıcılarda web.app -> firebaseapp.com geçişi sessionStorage'ı bölümlediği için
        // doğrudan aynı kökenli authDomain (revirfc.firebaseapp.com) üzerine yönlendirerek hatayı engelle.
        if (isOnWebAppCrossOrigin && isMobileOrSafari) {
          const targetUrl = new URL(window.location.href);
          targetUrl.hostname = authDomainHost;
          targetUrl.searchParams.set('auth', '1');
          if (inviteToken && !targetUrl.searchParams.has('invite')) {
            targetUrl.searchParams.set('invite', inviteToken.id);
          }
          window.location.replace(targetUrl.toString());
          return;
        }

        // Aynı kökendeyken (ör. revirfc.firebaseapp.com) mobilde tam sayfa redirect kullan (popup engeli yok)
        if (isMobileOrSafari && !isOnWebAppCrossOrigin) {
          await signInWithRedirect(auth, provider);
          return;
        }

        try {
          const res = await signInWithPopup(auth, provider);
          const fbUser = res.user;

          if (inviteToken) {
            registerWithInvite({
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || name || inviteToken.name,
              photoURL: fbUser.photoURL || undefined,
              token: inviteToken,
            });
          }
        } catch (popupErr: any) {
          const code = popupErr?.code || '';
          const msg = String(popupErr?.message || '');
          const isPopupOrStorageIssue =
            code === 'auth/popup-blocked' ||
            code === 'auth/operation-not-supported-in-this-environment' ||
            msg.includes('missing initial state') ||
            msg.includes('sessionStorage');

          if (isPopupOrStorageIssue) {
            if (isOnWebAppCrossOrigin && authDomainHost) {
              const targetUrl = new URL(window.location.href);
              targetUrl.hostname = authDomainHost;
              targetUrl.searchParams.set('auth', '1');
              if (inviteToken && !targetUrl.searchParams.has('invite')) {
                targetUrl.searchParams.set('invite', inviteToken.id);
              }
              window.location.replace(targetUrl.toString());
              return;
            }
            await signInWithRedirect(auth, provider);
            return;
          }
          throw popupErr;
        }
      } else {
        // Fallback / Demo simulation if popup is cancelled or offline
        if (inviteToken) {
          registerWithInvite({
            uid: `google-${Date.now()}`,
            email: email || `${inviteToken.name.toLowerCase()}@revirfc.com`,
            displayName: name || inviteToken.name,
            token: inviteToken,
          });
        }
      }
      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Google giriş penceresi kapatıldı. Tekrar deneyebilir veya aşağıdaki e-posta/şifre ile kayıt olabilirsiniz.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('Bu alan adı Firebase Authentication için yetkili değil.');
      } else {
        setError(err?.message || 'Google ile giriş başarısız oldu.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email / Password Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    setLoading(true);
    try {
      if (inviteToken) {
        try {
          sessionStorage.setItem(PENDING_INVITE_SESSION_KEY, inviteToken.id);
          localStorage.setItem(PENDING_INVITE_SESSION_KEY, inviteToken.id);
        } catch {}
      }
      if (isFirebaseConfigured && auth) {
        if (isLoginMode) {
          const res = await signInWithEmailAndPassword(auth, email, password);
          if (inviteToken) {
            registerWithInvite({
              uid: res.user.uid,
              email: res.user.email || email,
              displayName: res.user.displayName || name || inviteToken.name,
              photoURL: res.user.photoURL || undefined,
              token: inviteToken,
            });
          }
        } else {
          const res = await createUserWithEmailAndPassword(auth, email, password);
          if (inviteToken) {
            registerWithInvite({
              uid: res.user.uid,
              email: res.user.email || email,
              displayName: name || inviteToken.name,
              token: inviteToken,
            });
          }
        }
      } else {
        // Local auth simulation
        if (isLoginMode) {
          const existing = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
          if (existing) {
            if (inviteToken) {
              registerWithInvite({
                uid: existing.uid,
                email: existing.email,
                displayName: existing.displayName || name || inviteToken.name,
                photoURL: existing.photoURL,
                token: inviteToken,
              });
            } else {
              loginWithCredentials(existing);
            }
          } else {
            setError('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.');
            setLoading(false);
            return;
          }
        } else {
          if (inviteToken) {
            registerWithInvite({
              uid: `user-${Date.now()}`,
              email,
              displayName: name || inviteToken.name,
              token: inviteToken,
            });
          }
        }
      }
      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setError('Hatalı şifre veya e-posta.');
      } else if (err?.code === 'auth/email-already-in-use') {
        if (inviteToken) {
          setIsLoginMode(true);
          setError('Bu e-posta zaten kayıtlı! Şifrenizi girip "Giriş Yap & Daveti Aktifleştir" butonuna basın.');
        } else {
          setError('Bu e-posta adresi zaten kullanımda. Giriş yapmayı deneyin.');
        }
      } else if (err?.code === 'auth/weak-password') {
        setError('Şifreniz en az 6 karakter olmalıdır.');
      } else {
        setError(err?.message || 'Giriş işlemi gerçekleştirilemedi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[88dvh] overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 mx-auto mb-2.5 shadow-xl shadow-amber-500/20 flex items-center justify-center">
            <img src="/logo.jpg" alt="Revir FC" className="w-full h-full object-cover rounded-2xl" />
          </div>

          <h2 className="text-xl font-black text-white">
            {inviteToken ? 'Özel Davet ile Katıl' : isLoginMode ? 'Revir FC Giriş' : 'Hesap Oluştur'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {inviteToken
              ? `${inviteToken.name} için tanımlı özel davet yetkilendirmesi`
              : 'Kapalı devre halı saha kulüp sistemi'}
          </p>

          {inviteToken && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Yetki: {inviteToken.role === 'admin' ? '👑 Yönetici & Kurul' : inviteToken.role === 'captain' ? '⭐ Kurul Üyesi' : '🏃 Kulüp Oyuncusu'}
              </span>
            </div>
          )}
        </div>

        {inviteToken && currentUser?.status === 'pending' && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <p className="text-[11px] text-emerald-200 leading-relaxed">
              Mevcut oturumun (<strong>{currentUser.email}</strong>) şu an onay bekliyor. Bu davet bağlantısını mevcut hesabına hemen tanımlayabilirsin.
            </p>
            <button
              type="button"
              onClick={handleActivateExistingPendingWithInvite}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all cursor-pointer"
            >
              ⚡ Daveti Hemen Aktifleştir ({inviteToken.name})
            </button>
          </div>
        )}

        {isEmbeddedInAppBrowser && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] leading-relaxed">
            <strong className="text-amber-300 block mb-0.5">📱 WhatsApp / Uygulama İçi Tarayıcı Algılandı</strong>
            Google güvenliği uygulama içi pencerelerde girişi kısıtlayabilir. Google ile devam etmek için sağ köşeden{' '}
            <strong>&quot;Safari&apos;de / Tarayıcıda Aç&quot;</strong> yapın veya hemen aşağıdaki <strong>E-posta &amp; Şifre</strong> ile anında kayıt olun.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google One-Click Login */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white hover:bg-neutral-100 text-black font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Google ile {inviteToken ? 'Yetkili Kayıt Ol' : 'Giriş Yap'}</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-neutral-800" />
          <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">veya e-posta</span>
          <div className="flex-1 h-px bg-neutral-800" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {inviteToken && (
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Adınız / Oyuncu İsmi</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Alper"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">E-Posta Adresi</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@revirfc.com"
                required
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            {loading ? (
              <span>İşleniyor...</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>
                  {inviteToken
                    ? isLoginMode
                      ? 'Giriş Yap & Yetkiyi Tanımla'
                      : 'Yetkiyi Tanımla & Başla'
                    : isLoginMode
                    ? 'Giriş Yap'
                    : 'Kayıt Ol'}
                </span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsLoginMode(!isLoginMode);
            }}
            className="text-xs text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            {inviteToken
              ? isLoginMode
                ? 'Yeni bir hesap oluşturarak daveti kullan'
                : 'Zaten hesabınız var mı? Giriş yapıp daveti aktifleştirin'
              : isLoginMode
              ? 'Hesabınız yok mu? Davet linki ile kayıt olun'
              : 'Zaten hesabınız var mı? Giriş yapın'}
          </button>
        </div>
      </div>
    </div>
  );
};
