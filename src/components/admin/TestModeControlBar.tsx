import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Wrench,
  RotateCcw,
  LogOut,
  ChevronDown,
  ChevronUp,
  Users,
  Vote,
  Flame,
  Sliders,
  Shield,
  MessageSquare,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Match, Player } from '../../types';
import { TestRoleView } from '../../context/AuthContext';
import { NavTab } from '../layout/Navbar';

interface TestModeControlBarProps {
  players: Player[];
  match: Match;
  testRoleView: TestRoleView;
  activePlayerId?: string;
  pendingCount: number;
  canTestAdminView?: boolean;
  onSwitchPersona: (view: TestRoleView, playerId?: string, playerName?: string) => void;
  onJumpTab: (tab: NavTab) => void;
  onSimulatePoll: () => void;
  onSimulateRatings: () => void;
  onSimulateScouting: () => void;
  onSimulatePendingApprovals: () => void;
  onResetTestMode: () => void;
  onExitTestMode: () => void;
}

const PERSPECTIVES: { id: TestRoleView; label: string; shortLabel: string; hint: string }[] = [
  { id: 'admin', label: '👑 Yönetici', shortLabel: '👑 Yönetici', hint: 'Tam yetki (Alper)' },
  { id: 'committee', label: '⭐ Kurul', shortLabel: '⭐ Kurul', hint: 'Kurul üyesi gözüyle' },
  { id: 'player', label: '🏃 Düz Oyuncu', shortLabel: '🏃 Oyuncu', hint: 'Normal üye gözüyle' },
  { id: 'pending', label: '⏳ Onay Bekleyen', shortLabel: '⏳ Bekleyen', hint: 'Onay bekleyen yeni üye' },
  { id: 'spectator', label: '👁️ Seyirci', shortLabel: '👁️ Seyirci', hint: 'Giriş yapmamış ziyaretçi' },
];

const QUICK_TABS: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'squad', label: 'Kadro', icon: Users },
  { id: 'match', label: 'Maç Anketi', icon: Vote },
  { id: 'tactics', label: 'Taktik Tahtası', icon: Flame },
  { id: 'scouting', label: 'Kurul Puanlama', icon: Sliders },
  { id: 'admin', label: 'Yönetici Onayı', icon: Shield },
  { id: 'locker', label: 'Soyunma Odası', icon: MessageSquare },
];

export const TestModeControlBar: React.FC<TestModeControlBarProps> = ({
  players,
  match,
  testRoleView,
  activePlayerId,
  pendingCount,
  canTestAdminView = true,
  onSwitchPersona,
  onJumpTab,
  onSimulatePoll,
  onSimulateRatings,
  onSimulateScouting,
  onSimulatePendingApprovals,
  onResetTestMode,
  onExitTestMode,
}) => {
  const [toolsOpen, setToolsOpen] = useState(false);

  const visiblePerspectives = canTestAdminView
    ? PERSPECTIVES
    : PERSPECTIVES.filter((item) => item.id !== 'admin');
  const visibleQuickTabs = canTestAdminView
    ? QUICK_TABS
    : QUICK_TABS.filter((tab) => tab.id !== 'admin');

  const startersSet = useMemo(() => new Set(match.starters || []), [match.starters]);
  const waitlistSet = useMemo(() => new Set(match.waitlist || []), [match.waitlist]);
  const absenteesSet = useMemo(() => new Set(match.absentees || []), [match.absentees]);

  const sortedPlayers = useMemo(
    () =>
      [...players].sort((a, b) =>
        a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
      ),
    [players]
  );

  const selectedPlayer = useMemo(
    () => sortedPlayers.find((p) => p.id === activePlayerId),
    [sortedPlayers, activePlayerId]
  );

  const getPollStatusTag = (playerId: string) => {
    if (startersSet.has(playerId)) return '✅ Asil';
    if (waitlistSet.has(playerId)) return '⏳ Yedek';
    if (absenteesSet.has(playerId)) return '❌ Mazeret';
    return '⬜ Beklenen';
  };

  const handleSelectPlayer = (playerId: string) => {
    const target = players.find((p) => p.id === playerId);
    if (!target) return;
    const nextView: TestRoleView =
      testRoleView === 'spectator' || testRoleView === 'admin' ? 'player' : testRoleView;
    onSwitchPersona(nextView, target.id, target.name);
  };

  return (
    <div className="sticky top-14 z-30 bg-gradient-to-r from-violet-950/95 via-fuchsia-950/92 to-indigo-950/95 backdrop-blur-xl border-b border-violet-500/40 shadow-lg shadow-violet-950/40">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-2">
        {/* Top Compact Control Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Sandbox Status Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-500/20 border border-violet-400/50 text-violet-200 shrink-0">
              <FlaskConical className="w-3.5 h-3.5 text-fuchsia-300 animate-pulse" />
              <span className="text-[11px] font-black tracking-wide uppercase">Test Modu</span>
              <span className="hidden md:inline text-[10px] font-medium text-violet-300/90 border-l border-violet-400/35 pl-1.5">
                Gerçek Siteye Etki Etmez
              </span>
            </div>

            {/* Active Player Selector (22 members + poll badge) */}
            <div className="flex items-center gap-1.5 min-w-0">
              <select
                aria-label="Test edilecek oyuncu seç"
                value={activePlayerId || ''}
                onChange={(e) => handleSelectPlayer(e.target.value)}
                disabled={testRoleView === 'spectator'}
                className="max-w-[190px] sm:max-w-[235px] px-2.5 py-1.5 rounded-xl bg-neutral-950/85 border border-violet-500/40 text-xs font-semibold text-white focus:outline-none focus:border-fuchsia-400 disabled:opacity-50 cursor-pointer truncate"
              >
                {!activePlayerId && <option value="">Oyuncu Seç...</option>}
                {sortedPlayers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-950 text-white">
                    {p.name} ({p.position}) • {getPollStatusTag(p.id)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center: Perspective Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5 no-scrollbar">
            {visiblePerspectives.map((item) => {
              const isActive = testRoleView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.hint}
                  onClick={() =>
                    onSwitchPersona(
                      item.id,
                      item.id === 'spectator'
                        ? undefined
                        : selectedPlayer?.id || activePlayerId || sortedPlayers[0]?.id,
                      item.id === 'spectator'
                        ? undefined
                        : selectedPlayer?.name || sortedPlayers[0]?.name
                    )
                  }
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-fuchsia-500 text-white border-fuchsia-300 shadow-sm shadow-fuchsia-500/40'
                      : 'bg-neutral-950/60 hover:bg-violet-900/60 text-violet-200 border-violet-500/30'
                  }`}
                >
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Simulation Drawer Toggle + Reset + Exit */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setToolsOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
                toolsOpen
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-neutral-950/75 hover:bg-violet-900/70 text-amber-300 border-amber-400/40'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">🛠️ Simülasyon Araçları</span>
              <span className="sm:hidden">Araçlar</span>
              {toolsOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onResetTestMode}
              title="Test verilerini ilk haline sıfırla"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-950/75 hover:bg-neutral-900 border border-violet-500/35 text-violet-200 text-[11px] font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sıfırla</span>
            </button>

            <button
              type="button"
              onClick={onExitTestMode}
              title="Test Modundan çık ve gerçek oturuma dön"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 text-rose-200 text-[11px] font-black transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Testten Çık</span>
            </button>
          </div>
        </div>

        {/* Expandable Simulation Tools & Quick Tab Bar */}
        {toolsOpen && (
          <div className="mt-2 pt-2.5 border-t border-violet-500/30 space-y-2.5 animate-fade-in">
            {/* Simulation Triggers */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${canTestAdminView ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-2`}>
              <button
                type="button"
                onClick={onSimulatePoll}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-left transition-all cursor-pointer group"
              >
                <div>
                  <p className="text-[11px] font-black text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Anketi Doldur (22 Üye)
                  </p>
                  <p className="text-[10px] text-emerald-200/70">
                    12 asil, yedek & mazeretli + ücret gönüllüleri
                  </p>
                </div>
                <span className="text-[10px] font-mono font-black text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-lg">
                  {match.starters.length}/12
                </span>
              </button>

              <button
                type="button"
                onClick={onSimulateRatings}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-left transition-all cursor-pointer"
              >
                <div>
                  <p className="text-[11px] font-black text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Maç Sonu 360° Oylama
                  </p>
                  <p className="text-[10px] text-amber-200/70">
                    Sözel form oyları + Kurul MVP/Duvar oyları
                  </p>
                </div>
                <span className="text-[10px] font-mono font-black text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded-lg">
                  {(match.ratings || []).length} oy
                </span>
              </button>

              <button
                type="button"
                onClick={onSimulateScouting}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-left transition-all cursor-pointer"
              >
                <div>
                  <p className="text-[11px] font-black text-sky-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    Kurul Puanlama Doldur
                  </p>
                  <p className="text-[10px] text-sky-200/70">
                    Tüm kurul üyelerinin değerlendirmelerini ekle
                  </p>
                </div>
                <span className="text-[10px] font-mono font-black text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded-lg">
                  Scouting
                </span>
              </button>

              {canTestAdminView && (
                <button
                  type="button"
                  onClick={onSimulatePendingApprovals}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-left transition-all cursor-pointer"
                >
                  <div>
                    <p className="text-[11px] font-black text-rose-200 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      Örnek Onay Talepleri
                    </p>
                    <p className="text-[10px] text-rose-200/70">
                      Üyelik & lakap onayı kuyruğu oluştur
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-black text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded-lg">
                    {pendingCount}
                  </span>
                </button>
              )}
            </div>

            {/* Quick Tab Navigation */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300/80 mr-1">
                Hızlı Geçiş:
              </span>
              {visibleQuickTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onJumpTab(tab.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-950/70 hover:bg-violet-800/70 border border-violet-500/30 text-[11px] font-semibold text-violet-100 transition-colors cursor-pointer"
                  >
                    <Icon className="w-3 h-3 text-fuchsia-300" />
                    <span>{tab.label}</span>
                    {tab.id === 'admin' && pendingCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
