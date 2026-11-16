import React from 'react';
import { Player } from '../../types';
import { FCCard } from './FCCard';
import { useAuth } from '../../context/AuthContext';
import { getAccess } from '../../services/permissions';
import { Sparkles, Crown, Flame, Shield } from 'lucide-react';

interface Props {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
}

export const SquadCardGallery: React.FC<Props> = React.memo(({ players, onSelectPlayer }) => {
  const { currentUser } = useAuth();

  const isAdminOrCaptain = getAccess(currentUser, players).isCommittee;
  const isApproved = currentUser?.status === 'approved';
  const isPending = !currentUser || currentUser?.status === 'pending';

  // Find the logged-in user's claimed player ID
  const myPlayerId = isApproved ? currentUser?.claimedPlayerId : undefined;

  // 1. Calculate active squad-wide rating leaderboard rank for each player (former members excluded)
  const activePlayers = players.filter((p) => !p.isFormer && p.theme !== 'nostalgia');
  const leaderboard = [...activePlayers].sort((a, b) => {
    if (b.currentOVR !== a.currentOVR) {
      return b.currentOVR - a.currentOVR;
    }
    return a.name.localeCompare(b.name, 'tr');
  });

  const rankMap = new Map<string, number>();
  leaderboard.forEach((p, idx) => {
    rankMap.set(p.id, idx + 1);
  });

  // 2. Base list order with Strict Hierarchy:
  //    1) Current User's card (myPlayer) - always 1st if claimed & approved
  //    2) Haftanın MVP'si (theme === 'totw')
  //    3) Alev Atıyo! Kartlar (theme === 'inform', max 3, sorted by rank)
  //    4) Etten Duvar (theme === 'wall')
  //    5) Haftanın Bidonu (theme === 'bidon', if any)
  //    6) Remaining active squad sorted by OVR descending (rank order)
  //    -> Strictly ZERO duplicates!
  const myPlayer = myPlayerId ? activePlayers.find((p) => p.id === myPlayerId) : undefined;
  const orderedPlayers: Player[] = [];
  const addedIds = new Set<string>();

  // 1. Current user
  if (myPlayer) {
    orderedPlayers.push(myPlayer);
    addedIds.add(myPlayer.id);
  }

  // 2. MVP (theme === 'totw')
  const mvp = activePlayers.find((p) => p.theme === 'totw');
  if (mvp && !addedIds.has(mvp.id)) {
    orderedPlayers.push(mvp);
    addedIds.add(mvp.id);
  }

  // 3. Alev Atıyo! cards (theme === 'inform', max 3, sorted by rank)
  const informs = activePlayers
    .filter((p) => p.theme === 'inform' && !addedIds.has(p.id))
    .sort((a, b) => (rankMap.get(a.id) || 99) - (rankMap.get(b.id) || 99))
    .slice(0, 3);
  for (const p of informs) {
    orderedPlayers.push(p);
    addedIds.add(p.id);
  }

  // 4. Etten Duvar (theme === 'wall')
  const wallPlayer = activePlayers.find((p) => p.theme === 'wall');
  if (wallPlayer && !addedIds.has(wallPlayer.id)) {
    orderedPlayers.push(wallPlayer);
    addedIds.add(wallPlayer.id);
  }

  // 5. Bidon (theme === 'bidon', optional)
  const bidon = activePlayers.find((p) => p.theme === 'bidon');
  if (bidon && !addedIds.has(bidon.id)) {
    orderedPlayers.push(bidon);
    addedIds.add(bidon.id);
  }

  // 6. Remaining active squad sorted by currentOVR descending
  const remainingActive = activePlayers
    .filter((p) => !addedIds.has(p.id))
    .sort((a, b) => {
      if (b.currentOVR !== a.currentOVR) {
        return b.currentOVR - a.currentOVR;
      }
      return a.name.localeCompare(b.name, 'tr');
    });

  for (const p of remainingActive) {
    orderedPlayers.push(p);
    addedIds.add(p.id);
  }

  // Former members (Mazide Kalanlar) - strictly at the bottom in their own row
  const formerPlayers = players
    .filter((p) => p.isFormer || p.theme === 'nostalgia')
    .sort((a, b) => b.currentOVR - a.currentOVR);

  const filtered = orderedPlayers;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-clip py-2">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-5 justify-items-center">
        {filtered.map((player, idx) => {
          const isMyCard = player.id === myPlayerId;
          const isMvp = player.theme === 'totw';
          const rank = rankMap.get(player.id) || 1;

          return (
            <div
              key={player.id}
              className={`relative flex flex-col items-center transition-transform duration-300 ${
                isMvp ? 'z-20 scale-[1.03]' : isMyCard ? 'z-10' : 'z-10'
              }`}
            >
              {/* Top Badge: "Senin Kartın", "MVP", "Alev Atıyo!", "Etten Duvar", "Haftanın Bidonu", or Score Rank */}
              {isMyCard ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/70 shadow-lg shadow-amber-500/25 text-amber-300 text-[11px] font-black tracking-wide uppercase mb-2.5 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                  <span>Senin Kartın</span>
                  {player.theme === 'totw' && <span className="text-yellow-300 font-extrabold">• MVP</span>}
                  {player.theme === 'inform' && <span className="text-orange-400 font-extrabold">• ALEV ATIYO!</span>}
                  {player.theme === 'wall' && <span className="text-sky-300 font-extrabold">• ETTEN DUVAR</span>}
                  {player.theme === 'bidon' && <span className="text-rose-400 font-extrabold">• HAFTANIN BİDONU</span>}
                  <span className="text-amber-200/70 font-mono text-[10px] font-normal">#{rank}</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                </div>
              ) : player.theme === 'totw' ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-neutral-900 via-amber-950/60 to-neutral-900 border border-amber-400/70 shadow-lg shadow-amber-500/20 text-amber-300 text-[11px] font-black tracking-wide uppercase mb-2.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Haftanın MVP&apos;si</span>
                  <span className="text-amber-200/70 font-mono text-[10px]">#{rank}</span>
                </div>
              ) : player.theme === 'inform' ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-neutral-900 via-orange-950/60 to-neutral-900 border border-orange-500/70 shadow-lg shadow-orange-500/20 text-orange-300 text-[11px] font-black tracking-wide uppercase mb-2.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  <span>Alev Atıyo!</span>
                  <span className="text-orange-200/70 font-mono text-[10px]">#{rank}</span>
                </div>
              ) : player.theme === 'wall' ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-neutral-900 via-sky-950/60 to-neutral-900 border border-sky-400/70 shadow-lg shadow-sky-500/20 text-sky-300 text-[11px] font-black tracking-wide uppercase mb-2.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Etten Duvar</span>
                  <span className="text-sky-200/70 font-mono text-[10px]">#{rank}</span>
                </div>
              ) : player.theme === 'bidon' ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-neutral-900 via-rose-950/50 to-neutral-900 border border-rose-500/60 shadow-lg shadow-rose-500/20 text-rose-300 text-[11px] font-black tracking-wide uppercase mb-2.5">
                  <span>🪵 Haftanın Bidonu • Çay Borçlusu</span>
                </div>
              ) : player.isFormer ? (
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-neutral-900/90 border border-neutral-700/80 text-neutral-400 text-[10px] font-bold mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500"></span>
                  <span>Eski Üye (Ayrıldı)</span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-neutral-400 font-mono">{player.currentOVR} OVR</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-neutral-900/80 border border-neutral-800 text-neutral-400 text-[10px] font-mono font-bold mb-2.5">
                  <span className="text-neutral-500">Sıra #{rank}</span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-amber-400/90 font-extrabold">{player.currentOVR} OVR</span>
                </div>
              )}

              {/* Card Wrapper with Looping Background Animation for User's Own Card or MVP Card */}
              <div className={`relative ${isMvp ? 'animate-card-float will-change-transform' : ''}`}>
                {/* 1. MVP Kartı (Kullanıcının kendisi veya bir başkası) - Çarpıcı Kozmik Altın & Yıldız Tozu Aurası */}
                {isMvp ? (
                  <div className="absolute -inset-3 sm:-inset-4 pointer-events-none -z-10 flex items-center justify-center">
                    {/* Layer 1: Cosmic Starlight & Gold Conic Beam (Obsidian Black, Deep Cosmic Violet, Radiant Gold, Starburst Amber) */}
                    <div
                      className="absolute inset-0 rounded-[2.6rem] opacity-75 blur-2xl animate-mvp-spin-aurora will-change-transform"
                      style={{
                        background:
                          'conic-gradient(from 0deg at 50% 50%, rgba(245, 158, 11, 0.85) 0deg, rgba(217, 119, 6, 0.55) 45deg, rgba(79, 70, 229, 0.4) 110deg, rgba(251, 191, 36, 0.95) 180deg, rgba(234, 88, 12, 0.5) 240deg, rgba(124, 58, 237, 0.35) 300deg, rgba(245, 158, 11, 0.85) 360deg)',
                      }}
                    />

                    {/* Layer 2: Radiant Breathing Gold & Cosmic Starlight Pulse */}
                    <div className="absolute -inset-1.5 rounded-[2.3rem] bg-gradient-to-tr from-amber-500/40 via-yellow-400/35 to-amber-600/40 blur-xl animate-mvp-cosmic-aura will-change-transform" />

                    {/* Layer 3: Expanding Starburst Ripple Wave */}
                    <div className="absolute inset-0 rounded-[2rem] border-2 border-amber-400/60 animate-mvp-ripple will-change-transform" />
                  </div>
                ) : isMyCard ? (
                  /* 2. Kullanıcının Kendi Kartı (MVP değilken) - MVP parlamasını bastırmayan minimalist ve zarif aura */
                  <div className="absolute -inset-3 sm:-inset-4 pointer-events-none -z-10 flex items-center justify-center">
                    {/* Yumuşak nefes alan sıcak kehribar parıltısı */}
                    <div className="absolute inset-0 rounded-[2.2rem] bg-amber-500/10 blur-xl opacity-60 animate-pulse will-change-transform" />
                    {/* Sade ve şık kart çerçevesi aydınlatması */}
                    <div className="absolute inset-0 rounded-[1.8rem] border border-amber-400/25 shadow-sm shadow-amber-500/10" />
                  </div>
                ) : null}

                <FCCard
                  player={player}
                  size="md"
                  interactive={true}
                  priority={idx < 4}
                  onClick={() => onSelectPlayer(player)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mazide Kalanlar (Kulüp Hatırası) Bölümü - Sıralamanın en sonunda bağımsız satır */}
      {formerPlayers.length > 0 && (
        <div className="pt-8 border-t border-amber-900/30 mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-950/50 border border-amber-600/40 flex items-center justify-center text-xl shadow-inner">
                📜
              </div>
              <div>
                <h3 className="text-lg font-black text-amber-200/90 tracking-wide flex items-center gap-2">
                  <span>Mazide Kalanlar</span>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300">
                    Kulüp Hatırası
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Kulübümüzün geçmişinde forma terletmiş, gruptan ayrılmış eski üyelerimiz. Aktif lig sıralamasını etkilemez.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-5 justify-items-center">
            {formerPlayers.map((player) => (
              <div key={player.id} className="relative flex flex-col items-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-amber-900/50 text-amber-300/90 text-[11px] font-bold mb-2.5 shadow-sm">
                  <span>📜 Mazide Kalanlar</span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-amber-400/90 font-mono">{player.currentOVR} OVR</span>
                </div>
                <FCCard
                  player={player}
                  size="md"
                  interactive={true}
                  onClick={() => onSelectPlayer(player)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
