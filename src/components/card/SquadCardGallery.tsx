import React, { useState } from 'react';
import { Player, PreferredPosition, CardTheme } from '../../types';
import { FCCard } from './FCCard';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter, Sparkles, Crown, Flame, Bandage, Shield, Star } from 'lucide-react';

interface Props {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
}

export const SquadCardGallery: React.FC<Props> = ({ players, onSelectPlayer }) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [posFilter, setPosFilter] = useState<string>('ALL');
  const [themeFilter, setThemeFilter] = useState<string>('ALL');

  const isAdminOrCaptain = currentUser?.role === 'admin' || currentUser?.role === 'captain';
  const isApproved = currentUser?.status === 'approved';
  const isPending = currentUser?.status === 'pending';

  // Find the logged-in user's claimed player ID
  const myPlayerId = isApproved ? currentUser?.claimedPlayerId : undefined;

  // 1. Calculate squad-wide rating leaderboard rank for each player
  const leaderboard = [...players].sort((a, b) => {
    if (b.currentOVR !== a.currentOVR) {
      return b.currentOVR - a.currentOVR;
    }
    return a.name.localeCompare(b.name, 'tr');
  });

  const rankMap = new Map<string, number>();
  leaderboard.forEach((p, idx) => {
    rankMap.set(p.id, idx + 1);
  });

  // 2. Base list order with 5-Tier Deduplicated Hierarchy:
  //    Tier 1: Current User's card (myPlayer) - always 1st if claimed & approved
  //    Tier 2: Haftanın MVP'si (theme === 'totw' && not already added)
  //    Tier 3: Günün Bidonu (theme === 'bidon' && not already added, if selected that week)
  //    Tier 4: Alevli In-Form Kartlar (theme === 'inform' && not already added, max 3)
  //    Tier 5: Remaining squad sorted by OVR descending (and Turkish name)
  //    -> Strictly ZERO duplicates!
  const myPlayer = myPlayerId ? players.find((p) => p.id === myPlayerId) : undefined;
  const orderedPlayers: Player[] = [];
  const addedIds = new Set<string>();

  // 1. Current user
  if (myPlayer) {
    orderedPlayers.push(myPlayer);
    addedIds.add(myPlayer.id);
  }

  // 2. MVP (theme === 'totw')
  const mvp = players.find((p) => p.theme === 'totw');
  if (mvp && !addedIds.has(mvp.id)) {
    orderedPlayers.push(mvp);
    addedIds.add(mvp.id);
  }

  // 3. Bidon (theme === 'bidon', optional)
  const bidon = players.find((p) => p.theme === 'bidon');
  if (bidon && !addedIds.has(bidon.id)) {
    orderedPlayers.push(bidon);
    addedIds.add(bidon.id);
  }

  // 4. In-Form cards (theme === 'inform', max 3)
  const informs = players.filter((p) => p.theme === 'inform' && !addedIds.has(p.id)).slice(0, 3);
  for (const p of informs) {
    orderedPlayers.push(p);
    addedIds.add(p.id);
  }

  // 5. Remaining squad sorted by currentOVR descending
  const remaining = players
    .filter((p) => !addedIds.has(p.id))
    .sort((a, b) => {
      if (b.currentOVR !== a.currentOVR) {
        return b.currentOVR - a.currentOVR;
      }
      return a.name.localeCompare(b.name, 'tr');
    });

  for (const p of remaining) {
    orderedPlayers.push(p);
    addedIds.add(p.id);
  }

  // 3. Filter by search, position, and theme
  const filtered = orderedPlayers.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nickname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPos = posFilter === 'ALL' || p.position === posFilter;
    const matchesTheme = themeFilter === 'ALL' || p.theme === themeFilter;
    return matchesSearch && matchesPos && matchesTheme;
  });

  return (
    <div className="space-y-6">
      {/* Club Banner with Official Logo */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-emerald-950/30 border border-neutral-800 rounded-3xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <img
            src="/logo.jpg"
            alt="Revir FC Logo"
            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-amber-400/60 shadow-xl shadow-amber-500/20"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">REVIR FC</h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                FC 27 • 22 KİŞİLİK KADRO
              </span>
            </div>
            <p className="text-xs text-amber-400/90 font-mono font-semibold tracking-wider mt-0.5">
              RUBOR, CALOR, DOLOR • KAPALI DEVRE HALI SAHA KULÜBÜ
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              {isPending
                ? '👋 Seyirci Modu: Hesabınız onay bekliyor. Tüm kadronun 3D kartlarını inceleyebilir ve filtrelerle gezinebilirsiniz.'
                : isAdminOrCaptain
                ? '👑 Kurul Yetkisi: Tüm oyuncuların kartlarını, temalarını, PlayStyles rozetlerini ve istatistiklerini denetleyip düzenleyebilirsiniz.'
                : '✨ Kendi kartınızı özgürce kişiselleştirebilir, lakap, takım ve rozetinizi seçebilirsiniz. Arkadaşlarınızın kartlarını salt okunur inceleyebilirsiniz.'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Oyuncu veya halı saha lakabı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Position filters */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-2xl border border-neutral-800 text-xs">
          {['ALL', 'FWD', 'MID', 'DEF', 'GK'].map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                posFilter === pos
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {pos === 'ALL' ? `Tümü (${players.length})` : pos}
            </button>
          ))}
        </div>

        {/* Theme filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setThemeFilter('ALL')}
            className={`px-2.5 py-1.5 rounded-xl border font-bold transition-all ${
              themeFilter === 'ALL'
                ? 'bg-neutral-700 text-white border-neutral-500'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800'
            }`}
          >
            Tüm Kartlar
          </button>
          <button
            onClick={() => setThemeFilter('totw')}
            className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-all ${
              themeFilter === 'totw'
                ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                : 'bg-neutral-950 text-amber-400 border-amber-500/30'
            }`}
          >
            <Crown className="w-3 h-3" /> MVP (Siyah-Altın)
          </button>
          <button
            onClick={() => setThemeFilter('inform')}
            className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-all ${
              themeFilter === 'inform'
                ? 'bg-orange-500 text-black border-orange-400 shadow-md'
                : 'bg-neutral-950 text-orange-400 border-orange-500/30'
            }`}
          >
            <Flame className="w-3 h-3" /> In-Form 🔥
          </button>
          <button
            onClick={() => setThemeFilter('revir')}
            className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-all ${
              themeFilter === 'revir'
                ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                : 'bg-neutral-950 text-rose-400 border-rose-500/30'
            }`}
          >
            <Bandage className="w-3 h-3" /> Revir 🩹
          </button>
          <button
            onClick={() => setThemeFilter('legend')}
            className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-all ${
              themeFilter === 'legend'
                ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-md'
                : 'bg-neutral-950 text-amber-200 border-amber-300/30'
            }`}
          >
            👑 Efsane (İsmail, Gölcür, Cevdet)
          </button>
          <button
            onClick={() => setThemeFilter('bidon')}
            className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-all ${
              themeFilter === 'bidon'
                ? 'bg-amber-800 text-white border-amber-700 shadow-md'
                : 'bg-neutral-950 text-amber-600 border-amber-700/30'
            }`}
          >
            🛢️ Günün Bidonu
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center">
        {filtered.map((player) => {
          const isMyCard = player.id === myPlayerId;
          const isMvp = player.theme === 'totw';
          const rank = rankMap.get(player.id) || 1;

          return (
            <div
              key={player.id}
              className={`relative flex flex-col items-center transition-transform duration-300 ${
                isMyCard || isMvp ? 'z-20 scale-[1.02]' : 'z-10'
              }`}
            >
              {/* Top Badge: "Senin Kartın", "MVP", "Bidon", "In-Form", or Score Rank */}
              {isMyCard ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/70 shadow-lg shadow-amber-500/25 text-amber-300 text-[11px] font-black tracking-wide uppercase mb-2.5 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                  <span>Senin Kartın</span>
                  {player.theme === 'totw' && <span className="text-yellow-300 font-extrabold">• 🏆 MVP</span>}
                  {player.theme === 'inform' && <span className="text-orange-400 font-extrabold">• 🔥 IN-FORM</span>}
                  {player.theme === 'bidon' && <span className="text-rose-400 font-extrabold">• 🪵 BİDON</span>}
                  <span className="text-amber-200/70 font-mono text-[10px] font-normal">#{rank}</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                </div>
              ) : player.theme === 'totw' ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-neutral-900 via-amber-950/60 to-neutral-900 border border-amber-400/70 shadow-lg shadow-amber-500/20 text-amber-300 text-[11px] font-black tracking-wide uppercase mb-2.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>🏆 Haftanın MVP'si</span>
                  <span className="text-amber-200/70 font-mono text-[10px]">#{rank}</span>
                </div>
              ) : player.theme === 'bidon' ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-neutral-900 via-rose-950/50 to-neutral-900 border border-rose-500/60 shadow-lg shadow-rose-500/20 text-rose-300 text-[11px] font-black tracking-wide uppercase mb-2.5">
                  <span>🪵 Günün Bidonu • ☕ Çay Borçlusu</span>
                </div>
              ) : player.theme === 'inform' ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-neutral-900 via-orange-950/60 to-neutral-900 border border-orange-500/70 shadow-lg shadow-orange-500/20 text-orange-300 text-[11px] font-black tracking-wide uppercase mb-2.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  <span>🔥 Alev • In-Form</span>
                  <span className="text-orange-200/70 font-mono text-[10px]">#{rank}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-neutral-900/80 border border-neutral-800 text-neutral-400 text-[10px] font-mono font-bold mb-2.5">
                  <span className="text-neutral-500">Sıra #{rank}</span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-amber-400/90 font-extrabold">{player.currentOVR} OVR</span>
                </div>
              )}

              {/* Card Wrapper with Looping Background Animation for User's Own Card or MVP Card */}
              <div className={`relative ${isMyCard || isMvp ? 'animate-card-float' : ''}`}>
                {/* 1. If it's user's own card */}
                {isMyCard && (
                  <div className="absolute -inset-4 sm:-inset-6 pointer-events-none -z-10 flex items-center justify-center">
                    {/* Layer 1: Continuous Smooth Rotating Conic Aurora */}
                    <div
                      className="absolute inset-0 rounded-[2.8rem] opacity-55 blur-2xl animate-card-spin-slow"
                      style={{
                        background: isMvp
                          ? 'conic-gradient(from 0deg at 50% 50%, rgba(245, 158, 11, 0.85) 0deg, rgba(251, 191, 36, 0.7) 60deg, rgba(79, 70, 229, 0.45) 140deg, rgba(245, 158, 11, 0.85) 210deg, rgba(217, 119, 6, 0.65) 290deg, rgba(245, 158, 11, 0.85) 360deg)'
                          : 'conic-gradient(from 0deg at 50% 50%, rgba(245, 158, 11, 0.65) 0deg, rgba(234, 88, 12, 0.4) 60deg, rgba(16, 185, 129, 0.5) 140deg, rgba(6, 182, 212, 0.45) 210deg, rgba(217, 119, 6, 0.55) 290deg, rgba(245, 158, 11, 0.65) 360deg)',
                      }}
                    />

                    {/* Layer 2: Gentle Breathing Glow Pulse (Luminous Ambient Aura) */}
                    <div className="absolute -inset-2 rounded-[2.4rem] bg-gradient-to-tr from-amber-500/30 via-yellow-400/25 to-amber-600/30 blur-xl animate-card-aura" />

                    {/* Layer 3: Expanding Hologram Beam Wave Ripple */}
                    <div className="absolute inset-0 rounded-[2rem] border-2 border-amber-400/50 animate-card-ripple" />
                  </div>
                )}

                {/* 2. If it's MVP and not user's own card (Çarpıcı Kozmik Altın Aura) */}
                {!isMyCard && isMvp && (
                  <div className="absolute -inset-4 sm:-inset-6 pointer-events-none -z-10 flex items-center justify-center">
                    {/* Layer 1: Cosmic Starlight & Gold Conic Beam (Obsidian Black, Deep Cosmic Violet, Radiant Gold, Starburst Amber) */}
                    <div
                      className="absolute inset-0 rounded-[2.8rem] opacity-75 blur-2xl animate-mvp-spin-aurora"
                      style={{
                        background:
                          'conic-gradient(from 0deg at 50% 50%, rgba(245, 158, 11, 0.85) 0deg, rgba(217, 119, 6, 0.55) 45deg, rgba(79, 70, 229, 0.4) 110deg, rgba(251, 191, 36, 0.95) 180deg, rgba(234, 88, 12, 0.5) 240deg, rgba(124, 58, 237, 0.35) 300deg, rgba(245, 158, 11, 0.85) 360deg)',
                      }}
                    />

                    {/* Layer 2: Radiant Breathing Gold & Cosmic Starlight Pulse */}
                    <div className="absolute -inset-2 rounded-[2.4rem] bg-gradient-to-tr from-amber-500/40 via-yellow-400/35 to-amber-600/40 blur-xl animate-mvp-cosmic-aura" />

                    {/* Layer 3: Expanding Starburst Ripple Wave */}
                    <div className="absolute inset-0 rounded-[2rem] border-2 border-amber-400/60 animate-mvp-ripple" />
                  </div>
                )}

                <FCCard
                  player={player}
                  size="md"
                  interactive={true}
                  onClick={() => onSelectPlayer(player)}
                />
              </div>

              <div className="mt-2 text-center">
                {isMyCard ? (
                  <button
                    onClick={() => onSelectPlayer(player)}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-4 decoration-amber-500/50 cursor-pointer"
                  >
                    Kartını Düzenle & Fotoğrafı Kadrajla →
                  </button>
                ) : isAdminOrCaptain ? (
                  <button
                    onClick={() => onSelectPlayer(player)}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    👑 Kartı İncele & Düzenle (Yetkili) →
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectPlayer(player)}
                    className="text-xs font-semibold text-neutral-400 hover:text-amber-300 cursor-pointer"
                  >
                    {isPending ? '👁️ Kartı İncele (Seyirci) →' : '🔍 Kartı İncele (Önizleme) →'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
