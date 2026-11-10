import React from 'react';
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
  KeyRound,
  LogOut,
  Sparkles,
  Sliders,
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
  onOpenFirebaseModal?: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  claimedPlayer,
  onOpenCardEdit,
  onOpenFirebaseModal,
}) => {
  const { currentUser, switchMockRole, isFirebaseMode, logout } = useAuth();

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

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
      {/* Top Bar: Persona Switcher & Firebase Status */}
      <div className="bg-neutral-900 border-b border-neutral-850 px-4 py-1.5 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Aktif Hesap:
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => switchMockRole('admin')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                currentUser?.role === 'admin'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              👑 Yönetici (Alper)
            </button>
            <button
              onClick={() => switchMockRole('captain')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                currentUser?.role === 'captain'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              ⭐ Kurul (Akif / Yüksel)
            </button>
            <button
              onClick={() => switchMockRole('player')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                currentUser?.role === 'player' && currentUser?.status === 'approved'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              🏃 Oyuncu (Baran)
            </button>
            <button
              onClick={() => switchMockRole('pending')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                currentUser?.status === 'pending'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-neutral-800 text-rose-400 hover:text-white'
              }`}
            >
              🔒 Onay Bekleyen (Kilitli)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Firebase status */}
          <button
            onClick={onOpenFirebaseModal}
            className={`flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border cursor-pointer ${
              isFirebaseMode
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isFirebaseMode ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isFirebaseMode ? 'Firebase Aktif' : 'Firebase Yapılandır'}
          </button>

          {/* User badge */}
          {claimedPlayer && (
            <button
              onClick={onOpenCardEdit}
              className="flex items-center gap-1.5 bg-neutral-800/80 hover:bg-neutral-800 px-2.5 py-0.5 rounded-full border border-neutral-700 text-white"
            >
              <img src={claimedPlayer.photoUrl} alt="Avatar" className="w-4 h-4 rounded-full object-cover" />
              <span className="font-bold text-[11px]">{claimedPlayer.name}</span>
              <span className="text-amber-400 font-mono text-[10px]">OVR {claimedPlayer.currentOVR}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('squad')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-[2px] shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center font-black text-amber-400 text-sm tracking-tighter">
              RFC
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">REVIR</span>
              <span className="font-black text-lg text-amber-400 tracking-tight">FC</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                27
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 -mt-1 font-mono tracking-wider">
              KAPALI DEVRE FUTBOL KULÜBÜ
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
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-2">
          {claimedPlayer && (
            <button
              onClick={onOpenCardEdit}
              className="hidden sm:flex items-center gap-1.5 bg-neutral-900 border border-amber-500/40 hover:border-amber-400 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" /> Kartımı Düzenle
            </button>
          )}
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
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
