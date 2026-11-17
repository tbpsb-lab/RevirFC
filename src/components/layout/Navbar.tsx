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
  ChevronRight,
  UserCircle,
  Edit3,
  LogIn,
  Menu,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  // Sayfa aşağı kaydırıldığında üst barı gizle, yukarı kaydırınca veya sayfa başında göster
  useEffect(() => {
    lastScrollYRef.current = window.scrollY || 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        if (drawerOpen) {
          ticking = false;
          return;
        }
        const currentY = Math.max(0, window.scrollY || 0);
        const delta = currentY - lastScrollYRef.current;
        if (currentY < 24) {
          setHeaderHidden(false);
        } else if (delta > 8 && currentY > 64) {
          setHeaderHidden(true);
        } else if (delta < -6) {
          setHeaderHidden(false);
        }
        lastScrollYRef.current = currentY;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [drawerOpen]);

  // Close drawer on Escape key & prevent background scroll when drawer is open
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
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
          label: 'Maç Anketi & Check-In',
          desc: 'Saat, Yer, Katılım, Çay & Saha Ücreti',
          icon: Vote,
          approvedOnly: true,
        },
        {
          id: 'tactics',
          label: 'Taktik Tahtası',
          desc: '462 Kadro Dengeleme & Yelekli / Yeleksiz',
          icon: PitchFieldIcon,
        },
        {
          id: 'rating',
          label: 'Maç Sonu 360° Form Anketi',
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
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    onOpenAuthModal?.();
  };

  return (
    <>
      {/* Mobil/Tablet'te kadro dışı sekmelerde (sol dar menü gizliyken) sol üstte aynı merkez hizada (left-1.5 top-2, w-9 h-10) üç çizgili menü ikonu */}
      {activeTab !== 'squad' && (
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          className={`lg:hidden fixed left-1.5 top-2 z-50 w-9 h-10 rounded-xl bg-neutral-900/95 hover:bg-neutral-800 border border-neutral-800/90 hover:border-amber-500/45 text-neutral-300 hover:text-amber-300 flex items-center justify-center shadow-lg transition-[transform,opacity] duration-200 transform-gpu cursor-pointer active:scale-95 ${
            headerHidden && !drawerOpen ? '-translate-y-16 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`}
        >
          <Menu className="w-4 h-4" />
          {isAdmin && pendingApprovalCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-neutral-950" />
          )}
        </button>
      )}

      {/* Top Compact Utility Bar (yan menünün sağından başlar; aşağı kaydırınca gizlenir, yukarı kaydırınca döner) */}
      <header
        className={`fixed top-0 right-0 ${
          activeTab === 'squad' ? 'left-12 lg:left-16' : 'left-0 lg:left-16'
        } z-40 h-14 bg-neutral-950/92 backdrop-blur-xl border-b border-neutral-800/90 flex items-center transition-transform duration-300 ease-out ${
          headerHidden ? '-translate-y-full pointer-events-none' : 'translate-y-0'
        }`}
      >
        <div
          className={`w-full max-w-[1600px] mx-auto pr-3 sm:pr-4 ${
            activeTab !== 'squad' ? 'pl-15 lg:pl-4' : 'pl-3 sm:pl-4'
          } flex items-center justify-between gap-2`}
        >
          {/* Left: Brand + Active Breadcrumb (üç çizgili menü butonu sol açılır menüye taşındı) */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 overflow-hidden">

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

          {/* Right: Active Test Mode Pill (when running) + Notifications + Guest Login */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Test Modu yalnızca aktifken üst barda çıkış kısayolu olarak görünür; başlatmak sol menüdedir */}
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

            {/* Guest / Spectator Login Button (logged-in profile actions live in left drawer) */}
            {!currentUser && (
              <div className="flex items-center gap-1.5">
                <span
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-[10px] sm:text-[11px] font-bold text-neutral-300 whitespace-nowrap"
                  title="Giriş yapmadığınız için salt-okunur Seyirci Modundasınız"
                >
                  <span>👁️</span>
                  <span>Seyirci Modu</span>
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
            )}
          </div>
        </div>
      </header>

      {/* Slim Left Icon Rail (always top-0 bottom-0; pt-2 aligns Menu icon at 28px vertical center matching h-14 header) */}
      <aside
        className={`${
          activeTab === 'squad' ? 'flex w-12 lg:w-16' : 'hidden lg:flex w-16'
        } flex-col fixed left-0 top-0 bottom-0 z-30 bg-neutral-950/95 backdrop-blur-xl border-r border-neutral-800/90 pt-2 pb-3 items-center justify-between select-none`}
      >
        <div className="flex flex-col items-center gap-1.5 w-full px-1.5 lg:px-2">
          {/* Three-line Menu Icon (opens drawer, no extra label) */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menüyü aç"
            className="relative w-9 lg:w-11 h-10 shrink-0 rounded-xl flex items-center justify-center text-neutral-300 hover:text-amber-300 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            {isAdmin && pendingApprovalCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-neutral-950" />
            )}
          </button>

          <div className="w-6 lg:w-8 h-px bg-neutral-800/80 my-1 shrink-0" />

          {/* Group Icons with Hover Tooltips */}
          {visibleGroups.map((group, gIdx) => (
            <React.Fragment key={group.group}>
              {gIdx > 0 && <div className="w-5 lg:w-7 h-px bg-neutral-800/70 my-1 shrink-0" />}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    aria-label={item.label}
                    className={`group relative w-9 lg:w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute -left-1.5 lg:-left-2 top-2 bottom-2 w-1 rounded-r-full bg-amber-300" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />

                    {/* Live Badges on Rail Icons */}
                    {item.id === 'match' && (
                      <span
                        className={`absolute -top-1 -right-1 min-w-[16px] lg:min-w-[18px] h-[15px] lg:h-[16px] px-1 rounded-full text-[8px] lg:text-[9px] font-mono font-black flex items-center justify-center ring-2 ring-neutral-950 ${
                          matchStartersCount >= 12
                            ? 'bg-emerald-500 text-black'
                            : 'bg-amber-500 text-black'
                        }`}
                      >
                        {matchStartersCount}
                      </span>
                    )}
                    {item.id === 'admin' && pendingApprovalCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] lg:min-w-[16px] h-[15px] lg:h-[16px] px-1 rounded-full bg-rose-500 text-white text-[8px] lg:text-[9px] font-black flex items-center justify-center ring-2 ring-neutral-950">
                        {pendingApprovalCount}
                      </span>
                    )}

                    {/* Floating Hover Tooltip (Desktop mouse + Tablet stylus/Apple Pencil hover) */}
                    <div className="rail-hover-tooltip pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 fixed left-12 lg:left-16 ml-2.5 px-3 py-2 rounded-xl bg-neutral-900/95 border border-neutral-700/90 shadow-2xl text-left whitespace-nowrap z-50">
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
        <div className="flex flex-col items-center gap-2 w-full px-1.5 lg:px-2">
          {claimedPlayer && (
            <button
              type="button"
              onClick={() => onOpenCardEdit?.()}
              title="Kartımı Düzenle"
              className="group relative w-9 lg:w-11 h-10 rounded-xl flex items-center justify-center text-amber-400 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/35 transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span className="rail-hover-tooltip pointer-events-none opacity-0 group-hover:opacity-100 fixed left-12 lg:left-16 ml-2.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl text-xs font-bold text-white whitespace-nowrap z-50">
                Kartımı Düzenle
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* Left Navigation Drawer (Safari/iPad 60fps GPU-only transform + opacity; no width reflow or heavy backdrop blur) */}
      <div
        className={`fixed inset-0 z-50 transition-[visibility] duration-200 ${
          drawerOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
        }`}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop Overlay */}
        <div
          onClick={() => setDrawerOpen(false)}
          className={`fixed inset-0 bg-black/75 transition-opacity duration-200 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Drawer Panel */}
        <aside
          className={`fixed top-0 bottom-0 left-0 w-72 sm:w-80 max-w-[86vw] bg-neutral-950/[0.98] border-r border-neutral-800 shadow-2xl shadow-black/90 pt-2 flex flex-col justify-between origin-left transform-gpu transition-[transform,opacity] duration-150 ease-out ${
            drawerOpen ? 'scale-x-100 opacity-100' : 'scale-x-95 opacity-0'
          }`}
        >
          {/* 1. Navigation Items (1:1 vertical coordinates with Slim Rail) */}
          <nav aria-label="Ana menü" className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 w-full px-1.5 lg:px-2 pb-3">
            {/* Three-line Menu Icon row (closes drawer, aligned 1:1 with rail Menu button) */}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Menüyü kapat"
              className="w-9 lg:w-11 h-10 shrink-0 rounded-xl flex items-center justify-center text-amber-400 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4" />
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
          <div className="shrink-0 w-72 sm:w-80 max-w-full p-3 border-t border-neutral-800/90 bg-neutral-900/50 space-y-2">
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
