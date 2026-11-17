import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Player } from '../../types';
import {
  Shield,
  MessageSquare,
  BarChart3,
  LogOut,
  Sliders,
  Bell,
  ChevronDown,
  ChevronRight,
  UserCircle,
  Edit3,
  LogIn,
  Menu,
  X,
  PanelLeftOpen,
  PanelLeftClose,
  LayoutGrid,
  Vote,
  FlaskConical,
  ClipboardList,
} from 'lucide-react';

// Taktik tahtası için üstten görünüm halı saha simgesi
const PitchFieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="12" y1="4" x2="12" y2="20" />
    <circle cx="12" cy="12" r="2.8" />
    <path d="M2 8.5h3.2v7H2" />
    <path d="M22 8.5h-3.2v7H22" />
  </svg>
);

export type NavTab =
  | 'squad'
  | 'match'
  | 'tactics'
  | 'rating'
  | 'scouting'
  | 'locker'
  | 'analytics'
  | 'admin';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  claimedPlayer?: Player;
  onOpenCardEdit?: () => void;
  onOpenAuthModal?: () => void;
  onOpenFirebaseModal?: () => void; // kept for backward compat, unused
  pendingApprovalCount?: number;
  matchStartersCount?: number;
  isTestMode?: boolean;
  canUseTestMode?: boolean;
  onToggleTestMode?: () => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  approvedOnly?: boolean;
  adminOnly?: boolean;
  committeeOnly?: boolean;
}

interface NavGroupConfig {
  group: string;
  items: NavItemConfig[];
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  claimedPlayer,
  onOpenCardEdit,
  onOpenAuthModal,
  pendingApprovalCount = 0,
  matchStartersCount = 0,
  isTestMode = false,
  canUseTestMode = false,
  onToggleTestMode,
}) => {
  const { currentUser, logout, adminMode, setAdminMode } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close drawer on Escape key & prevent background scroll when drawer is open
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const isApprovedUser = currentUser?.status === 'approved';
  const isAdminAccount = isApprovedUser && currentUser?.role === 'admin';
  const isAdmin = isAdminAccount && adminMode === 'admin';
  const canSeeCommittee =
    isApprovedUser &&
    (currentUser?.role === 'admin' || currentUser?.role === 'captain');

  const navGroups: NavGroupConfig[] = [
    {
      group: 'HAFTALIK MAÇ AKIŞI',
      items: [
        {
          id: 'squad',
          label: 'Oyuncu Kartları (Kadro)',
          desc: 'FC Kart Galerisi & Oyuncu Profilleri',
          icon: LayoutGrid,
        },
        {
          id: 'match',
          label: '1. Maç Anketi & Check-In',
          desc: 'Saat, Yer, Katılım, Çay & Saha Ücreti',
          icon: Vote,
          approvedOnly: true,
        },
        {
          id: 'tactics',
          label: '2. Taktik Tahtası',
          desc: '462 Kadro Dengeleme & Yelekli / Yeleksiz',
          icon: PitchFieldIcon,
        },
        {
          id: 'rating',
          label: '3. Maç Sonu 360° Form Anketi',
          desc: 'Sözel Değerlendirme, Ödül Kürsüsü & Son Karne',
          icon: ClipboardList,
          approvedOnly: true,
        },
      ],
    },
    {
      group: 'KULÜP & İSTATİSTİK',
      items: [
        {
          id: 'locker',
          label: 'Soyunma Odası & Medya',
          desc: 'Maç Sohbeti, Fotoğraf Akışı & Haftanın Manşeti',
          icon: MessageSquare,
          approvedOnly: true,
        },
        {
          id: 'analytics',
          label: 'Kimya & Çetele',
          desc: 'İkili Kimya, Ego İndeksi & Tatlı Defteri',
          icon: BarChart3,
          approvedOnly: true,
        },
      ],
    },
    {
      group: 'KURUL & YÖNETİM',
      items: [
        {
          id: 'scouting',
          label: '⭐ Kök Kurul Puanlama',
          desc: 'Baz Reyting & Stat Kalibrasyonu (1–100)',
          icon: Sliders,
          committeeOnly: true,
        },
        {
          id: 'admin',
          label: 'Yönetici Onayı & Kıdem',
          desc: 'Özel Davet Linkleri, Üye & Lakap Onayı',
          icon: Shield,
          adminOnly: true,
        },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.adminOnly) return isAdmin;
        if (item.committeeOnly) return canSeeCommittee;
        if (item.approvedOnly) return isApprovedUser;
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);

  const allFlatItems = visibleGroups.flatMap((g) => g.items);
  const activeItem = allFlatItems.find((i) => i.id === activeTab) || allFlatItems[0];
  const ActiveIcon = activeItem?.icon || LayoutGrid;

  const roleLabel = isAdminAccount
    ? adminMode === 'admin'
      ? '👑 Yönetici Modu'
      : '⭐ Kurul Modu'
    : currentUser?.role === 'captain'
    ? '⭐ Kurul'
    : currentUser?.status === 'pending'
    ? '👁️ Seyirci'
    : '🏃 Oyuncu';

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setDrawerOpen(false);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    setDrawerOpen(false);
    logout();
    onOpenAuthModal?.();
  };

  return (
    <>
      {/* Top Compact Utility Bar */}
      <header className="sticky top-0 z-40 h-14 bg-neutral-950/92 backdrop-blur-xl border-b border-neutral-800/90 flex items-center">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 flex items-center justify-between gap-2">
          {/* Left: Hamburger Menu Button + Brand + Active Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? 'Sol menüyü kapat' : 'Sol menüyü aç'}
              title={drawerOpen ? 'Menüyü Kapat' : 'Menüyü Aç'}
              className="relative inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/45 text-neutral-200 hover:text-amber-300 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold">Menü</span>
              {isAdmin && pendingApprovalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-neutral-950" />
              )}
            </button>

            {/* Brand (Clicking navigates to Kadro) */}
            <button
              type="button"
              onClick={() => handleSelectTab('squad')}
              title="Kadroya Dön"
              className={`flex items-center gap-2 cursor-pointer group shrink-0 px-2 py-1 rounded-xl transition-all text-left border ${
                activeTab === 'squad'
                  ? 'bg-amber-500/10 border-amber-500/30 shadow-sm shadow-amber-500/10'
                  : 'border-transparent hover:bg-neutral-900/80'
              }`}
            >
              <img
                src="/logo.jpg"
                alt="Revir FC Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 shadow-md shadow-amber-500/20 border-2 border-amber-400/50 group-hover:scale-105 group-hover:border-amber-300 transition-all"
              />
              <div className="shrink-0">
                <div className="flex items-center gap-1 whitespace-nowrap leading-none">
                  <span className="font-black text-sm sm:text-base text-white tracking-tight">REVIR</span>
                  <span className="font-black text-sm sm:text-base text-amber-400 tracking-tight">FC</span>
                </div>
                <p className="text-[8px] sm:text-[9px] text-amber-400/85 mt-0.5 font-mono tracking-wider font-semibold whitespace-nowrap leading-none">
                  RUBOR, CALOR, DOLOR
                </p>
              </div>
            </button>

            {/* Desktop Active Section Breadcrumb */}
            {activeItem && (
              <div className="hidden md:inline-flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-xl bg-neutral-900/80 border border-neutral-800/90 text-[11px] font-bold text-neutral-300 min-w-0 max-w-[260px] lg:max-w-[360px] overflow-hidden">
                <ActiveIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{activeItem.label}</span>
              </div>
            )}
          </div>

          {/* Right: Active Test Mode Pill (when running) + Notifications + User Menu */}
          <div className="flex items-center gap-1.5 shrink-0" ref={menuRef}>
            {/* Test Modu yalnızca aktifken üst barda çıkış kısayolu olarak görünür; başlatmak profil/sol menüdedir */}
            {isTestMode && canUseTestMode && onToggleTestMode && (
              <button
                type="button"
                onClick={onToggleTestMode}
                title="Test Modundan çık (gerçek site verilerine dön)"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all cursor-pointer border active:scale-95 bg-fuchsia-500/25 hover:bg-fuchsia-500/35 border-fuchsia-400/60 text-fuchsia-200 animate-pulse shadow-sm shadow-fuchsia-500/30"
              >
                <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">🧪 Test Aktif</span>
                <span className="sm:hidden">Test</span>
              </button>
            )}

            {/* Notifications Bell (admin: pending count) */}
            {isAdmin && pendingApprovalCount > 0 && (
              <button
                onClick={() => handleSelectTab('admin')}
                className="relative p-1.5 rounded-xl bg-neutral-900 border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                title={`${pendingApprovalCount} onay bekliyor`}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {pendingApprovalCount}
                </span>
              </button>
            )}

            {/* Profile Avatar Button OR Spectator Badge + Guest Login Button */}
            {!currentUser ? (
              <div className="flex items-center gap-1.5">
                <span
                  className="hidden xs:inline-flex sm:inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-[10px] sm:text-[11px] font-bold text-neutral-300 whitespace-nowrap"
                  title="Giriş yapmadığınız için salt-okunur Seyirci Modundasınız"
                >
                  <span>👁️</span>
                  <span className="hidden sm:inline">Seyirci Modu</span>
                  <span className="sm:hidden">Seyirci</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal?.()}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
                  title="Hesabına giriş yap veya davet linki ile katıl"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Giriş Yap</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 px-2 py-1 rounded-xl transition-all group cursor-pointer"
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

                    {/* Mode switcher inside menu */}
                    {isAdminAccount && (
                      <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-950/40">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                          Çalışma Modu
                        </p>
                        <div className="grid grid-cols-2 gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
                          <button
                            type="button"
                            onClick={() => {
                              setAdminMode('admin');
                              setMenuOpen(false);
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                              adminMode === 'admin'
                                ? 'bg-amber-500 text-black'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            👑 Yönetici
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdminMode('committee');
                              setMenuOpen(false);
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                              adminMode === 'committee'
                                ? 'bg-sky-500 text-black'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            ⭐ Kurul
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Menu items */}
                    <div className="py-1">
                      {claimedPlayer && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onOpenCardEdit?.();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4 text-amber-400" />
                          Kartımı Düzenle
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleSelectTab('admin');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-amber-300 transition-colors cursor-pointer"
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

                      {canUseTestMode && onToggleTestMode && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onToggleTestMode();
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                            isTestMode
                              ? 'text-fuchsia-300 hover:bg-fuchsia-500/15'
                              : 'text-violet-300 hover:bg-violet-500/15'
                          }`}
                        >
                          <FlaskConical className="w-4 h-4 shrink-0" />
                          <span>{isTestMode ? '🧪 Test Modundan Çık' : '🧪 Test Modunu Aç'}</span>
                        </button>
                      )}

                      <div className="border-t border-neutral-800 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Çıkış Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Slim Left Icon Rail (always visible on lg+, 1:1 aligned with expanded drawer) */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-14 bottom-0 w-16 z-30 bg-neutral-950/95 backdrop-blur-xl border-r border-neutral-800/90 py-3 items-center justify-between select-none">
        <div className="flex flex-col items-center gap-1.5 w-full px-2">
          {/* Expand Full Drawer Button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            title="Menüyü Genişlet"
            className="group relative w-11 h-10 shrink-0 rounded-xl flex items-center justify-center text-neutral-400 hover:text-amber-300 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
            <span className="pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 fixed left-16 ml-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl text-xs font-bold text-white whitespace-nowrap z-50">
              Menüyü Genişlet
            </span>
          </button>

          <div className="w-8 h-px bg-neutral-800/80 my-1 shrink-0" />

          {/* Group Icons with Hover Tooltips */}
          {visibleGroups.map((group, gIdx) => (
            <React.Fragment key={group.group}>
              {gIdx > 0 && <div className="w-7 h-px bg-neutral-800/70 my-1 shrink-0" />}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`group relative w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute -left-2 top-2 bottom-2 w-1 rounded-r-full bg-amber-300" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />

                    {/* Live Badges on Rail Icons */}
                    {item.id === 'match' && (
                      <span
                        className={`absolute -top-1 -right-1 min-w-[18px] h-[16px] px-1 rounded-full text-[9px] font-mono font-black flex items-center justify-center ring-2 ring-neutral-950 ${
                          matchStartersCount >= 12
                            ? 'bg-emerald-500 text-black'
                            : 'bg-amber-500 text-black'
                        }`}
                      >
                        {matchStartersCount}
                      </span>
                    )}
                    {item.id === 'admin' && pendingApprovalCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-neutral-950">
                        {pendingApprovalCount}
                      </span>
                    )}

                    {/* Floating Hover Tooltip */}
                    <div className="pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 fixed left-16 ml-2.5 px-3 py-2 rounded-xl bg-neutral-900/95 border border-neutral-700/90 shadow-2xl text-left whitespace-nowrap z-50">
                      <p className="text-xs font-black text-white">{item.label}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Bottom Rail Utility */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          {claimedPlayer && (
            <button
              type="button"
              onClick={() => onOpenCardEdit?.()}
              title="Kartımı Düzenle"
              className="group relative w-11 h-10 rounded-xl flex items-center justify-center text-amber-400 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/35 transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span className="pointer-events-none opacity-0 group-hover:opacity-100 fixed left-16 ml-2.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl text-xs font-bold text-white whitespace-nowrap z-50">
                Kartımı Düzenle
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* Left Slide-Out Navigation Drawer (Mobile, Tablet & Desktop Expanded — aligned 1:1 with slim rail below header) */}
      <div
        className={`fixed inset-x-0 top-14 bottom-0 z-50 transition-all duration-300 ${
          drawerOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
        }`}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop Overlay */}
        <div
          onClick={() => setDrawerOpen(false)}
          className={`fixed inset-x-0 top-14 bottom-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Drawer Panel */}
        <aside
          className={`fixed top-14 bottom-0 left-0 w-72 sm:w-80 max-w-[86vw] bg-neutral-950/98 backdrop-blur-2xl border-r border-neutral-800 shadow-2xl shadow-black/90 pt-3 flex flex-col justify-between transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* 1. Navigation Items (1:1 vertical coordinates with Desktop Slim Rail) */}
          <nav aria-label="Ana menü" className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 w-full px-2 pb-3">
            {/* Collapse Drawer Row (h-10 matches rail Expand button) */}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Menüyü daralt"
              className="w-full h-10 shrink-0 px-3 rounded-xl flex items-center justify-between text-neutral-300 hover:text-amber-300 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-xs font-bold">
                <PanelLeftClose className="w-4 h-4 shrink-0" />
                <span>Menüyü Daralt</span>
              </span>
              <X className="w-4 h-4 text-neutral-500 shrink-0" />
            </button>

            <div className="w-full h-px bg-neutral-800/80 my-1 shrink-0" />

            {visibleGroups.map((group, gIdx) => (
              <React.Fragment key={group.group}>
                {gIdx > 0 && <div className="w-full h-px bg-neutral-800/70 my-1 shrink-0" />}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full h-11 shrink-0 flex items-center gap-2.5 px-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/45 shadow-md shadow-amber-500/10'
                          : 'bg-transparent border border-transparent hover:bg-neutral-900/90 hover:border-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-amber-500 text-black shadow-sm shadow-amber-500/30'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 group-hover:text-amber-300 group-hover:border-neutral-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`text-xs font-black truncate leading-tight ${
                              isActive ? 'text-amber-300' : 'text-neutral-100 group-hover:text-white'
                            }`}
                          >
                            {item.label}
                          </span>

                          {item.id === 'match' && (
                            <span
                              className={`shrink-0 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                                matchStartersCount >= 12
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {matchStartersCount}/12
                            </span>
                          )}

                          {item.id === 'admin' && pendingApprovalCount > 0 && (
                            <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                              {pendingApprovalCount}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5">{item.desc}</p>
                      </div>

                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isActive
                            ? 'text-amber-400 translate-x-0.5'
                            : 'text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5'
                        }`}
                      />
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>

          {/* 2. Bottom User Profile, Mode Switcher & Actions (placed at bottom so nav items stay aligned 1:1) */}
          <div className="shrink-0 p-3 border-t border-neutral-800/90 bg-neutral-900/50 space-y-2">
            {currentUser ? (
              <>
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {claimedPlayer?.photoUrl ? (
                      <img
                        src={claimedPlayer.photoUrl}
                        alt={claimedPlayer.name}
                        className="w-9 h-9 rounded-xl object-cover border border-amber-400/50 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                        <UserCircle className="w-5 h-5 text-neutral-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">
                        {claimedPlayer?.name || currentUser.displayName || 'Futbolcu'}
                      </p>
                      <p className="text-[10px] text-amber-400 font-mono truncate">{roleLabel}</p>
                    </div>
                  </div>
                  {claimedPlayer && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/35 text-[10px] font-mono font-black text-amber-300 shrink-0">
                      OVR {claimedPlayer.currentOVR}
                    </span>
                  )}
                </div>

                {claimedPlayer && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onOpenCardEdit?.();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-amber-500/40 text-xs font-bold text-neutral-200 hover:text-amber-300 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    Kartımı Düzenle
                  </button>
                )}

                {isAdminAccount && (
                  <div className="grid grid-cols-2 gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setAdminMode('admin')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        adminMode === 'admin'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      👑 Yönetici Modu
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminMode('committee')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        adminMode === 'committee'
                          ? 'bg-sky-500 text-black shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      ⭐ Kurul Modu
                    </button>
                  </div>
                )}

                <div className={`grid gap-1.5 ${canUseTestMode && onToggleTestMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {canUseTestMode && onToggleTestMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        onToggleTestMode();
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                        isTestMode
                          ? 'bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border-fuchsia-400/50 text-fuchsia-200'
                          : 'bg-violet-500/15 hover:bg-violet-500/25 border-violet-500/40 text-violet-300'
                      }`}
                    >
                      <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{isTestMode ? 'Testi Kapat' : 'Test Modu'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-[11px] font-black transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 bg-neutral-950/70 border border-neutral-800 rounded-2xl p-2.5">
                  <div>
                    <p className="text-xs font-black text-neutral-200 flex items-center gap-1.5">
                      <span>👁️</span> Seyirci Modu
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Salt-okunur görüntüleme aktif</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onOpenAuthModal?.();
                    }}
                    className="shrink-0 flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-3 py-1.5 rounded-xl shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Giriş Yap</span>
                  </button>
                </div>

                {canUseTestMode && onToggleTestMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onToggleTestMode();
                    }}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      isTestMode
                        ? 'bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border-fuchsia-400/50 text-fuchsia-200'
                        : 'bg-violet-500/15 hover:bg-violet-500/25 border-violet-500/40 text-violet-300'
                    }`}
                  >
                    <FlaskConical className="w-4 h-4" />
                    {isTestMode ? 'Test Modundan Çık' : 'Test / Simülasyon Modunu Aç'}
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
};
