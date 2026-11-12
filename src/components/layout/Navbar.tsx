import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Player } from '../../types';
import {
  Shield,
  Users,
  Trophy,
  MessageSquare,
  Camera,
  BarChart3,
  Flame,
  Bandage,
  LogOut,
  Sparkles,
  Sliders,
  Bell,
  ChevronDown,
  UserCircle,
  Edit3,
} from 'lucide-react';

export type NavTab =
  | 'squad'
  | 'scouting'
  | 'match'
  | 'tactics'
  | 'locker'
  | 'gallery'
  | 'analytics'
  | 'admin';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  claimedPlayer?: Player;
  onOpenCardEdit?: () => void;
  onOpenFirebaseModal?: () => void; // kept for backward compat, unused
  pendingApprovalCount?: number;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  claimedPlayer,
  onOpenCardEdit,
  pendingApprovalCount = 0,
}) => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; adminOnly?: boolean }[] = [
    { id: 'squad', label: '22 Kişilik Kadro', icon: Users },
    { id: 'scouting', label: '⭐ Kurul Puanlama', icon: Sliders },
    { id: 'match', label: 'Maç & Check-In', icon: Trophy },
    { id: 'tactics', label: 'Taktik Tahtası', icon: Flame },
    { id: 'locker', label: 'Soyunma Odası', icon: MessageSquare },
    { id: 'gallery', label: 'Görsel Arşiv', icon: Camera },
    { id: 'analytics', label: 'Kimya & Çetele', icon: BarChart3 },
    { id: 'admin', label: 'Yönetici Onayı', icon: Shield, adminOnly: true },
  ];

  const isAdmin = currentUser?.role === 'admin';

  const roleLabel =
    currentUser?.role === 'admin'
      ? '👑 Yönetici'
      : currentUser?.role === 'captain'
      ? '⭐ Kurul'
      : currentUser?.status === 'pending'
      ? '👁️ Seyirci'
      : '🏃 Oyuncu';

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('squad')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img
            src="/logo.jpg"
            alt="Revir FC Logo"
            className="w-11 h-11 rounded-full object-cover shadow-lg shadow-amber-500/20 border-2 border-amber-400/50 group-hover:scale-105 group-hover:border-amber-300 transition-all"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">REVIR</span>
              <span className="font-black text-lg text-amber-400 tracking-tight">FC</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                27
              </span>
            </div>
            <p className="text-[10px] text-amber-400/80 -mt-1 font-mono tracking-wider font-semibold">
              RUBOR, CALOR, DOLOR
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.id === 'admin' && pendingApprovalCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {pendingApprovalCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: User Profile Menu */}
        <div className="flex items-center gap-2" ref={menuRef}>
          {/* Notifications Bell (admin: pending count) */}
          {isAdmin && pendingApprovalCount > 0 && (
            <button
              onClick={() => setActiveTab('admin')}
              className="relative p-2 rounded-xl bg-neutral-900 border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-all"
              title={`${pendingApprovalCount} onay bekliyor`}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                {pendingApprovalCount}
              </span>
            </button>
          )}

          {/* Profile Avatar Button */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 px-2.5 py-1.5 rounded-xl transition-all group"
            >
              {claimedPlayer?.photoUrl ? (
                <img
                  src={claimedPlayer.photoUrl}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full object-cover border border-amber-400/40"
                />
              ) : (
                <UserCircle className="w-6 h-6 text-neutral-400 group-hover:text-amber-400 transition-colors" />
              )}
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-bold text-white leading-tight">
                  {claimedPlayer?.name || currentUser?.displayName || 'Hesabım'}
                </span>
                <span className="text-[10px] text-amber-400/80 font-mono leading-tight">{roleLabel}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950/50">
                  <p className="text-xs font-black text-white truncate">
                    {claimedPlayer?.name || currentUser?.displayName || 'Futbolcu'}
                  </p>
                  <p className="text-[10px] text-amber-400 font-mono">{roleLabel}</p>
                  {claimedPlayer && (
                    <p className="text-[10px] text-neutral-500 font-mono">OVR {claimedPlayer.currentOVR}</p>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-1">
                  {claimedPlayer && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenCardEdit?.();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-amber-300 transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-amber-400" />
                      Kartımı Düzenle
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setActiveTab('admin');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-amber-300 transition-colors"
                    >
                      <Bell className="w-4 h-4 text-rose-400" />
                      <span>Bildirimler</span>
                      {pendingApprovalCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                          {pendingApprovalCount}
                        </span>
                      )}
                    </button>
                  )}

                  <div className="border-t border-neutral-800 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Çıkış Yap
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav pills */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-neutral-900 scrollbar-none">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                isActive
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.id === 'admin' && pendingApprovalCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                  {pendingApprovalCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
