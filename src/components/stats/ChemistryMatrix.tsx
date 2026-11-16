import React, { useMemo } from 'react';
import { Match, Player } from '../../types';
import { Users2, Flame, Skull, Trophy, ShieldAlert, Sparkles } from 'lucide-react';
import { createPastMatches } from '../../services/pastMatchesData';

interface Props {
  players: Player[];
  pastMatches?: Match[];
}

interface PairRecord {
  key: string;
  player1: Player;
  player2: Player;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  lossRate: number;
}

export const ChemistryMatrix: React.FC<Props> = ({ players, pastMatches }) => {
  const { topBestPair, topWorstPair, secondaryBest1, secondaryBest2, secondaryWorst1, secondaryWorst2 } =
    useMemo(() => {
      const matchSource =
        pastMatches && pastMatches.length > 0 ? pastMatches : createPastMatches(players);

      const playerMap = new Map(players.map((p) => [p.id, p]));
      const pairsMap = new Map<
        string,
        { p1: Player; p2: Player; matches: number; wins: number; losses: number }
      >();

      matchSource.forEach((match) => {
        const winner =
          match.awards?.winnerTeam ||
          (match.score && typeof match.score.teamA === 'number' && typeof match.score.teamB === 'number'
            ? match.score.teamA > match.score.teamB
              ? 'A'
              : match.score.teamB > match.score.teamA
              ? 'B'
              : undefined
            : undefined);
        if (!winner) return;

        const processSquad = (squadPlayers: { player: { id: string; name: string } }[], won: boolean) => {
          for (let i = 0; i < squadPlayers.length; i++) {
            for (let j = i + 1; j < squadPlayers.length; j++) {
              const id1 = squadPlayers[i].player.id;
              const id2 = squadPlayers[j].player.id;
              const p1 = playerMap.get(id1) || (squadPlayers[i].player as Player);
              const p2 = playerMap.get(id2) || (squadPlayers[j].player as Player);

              const [first, second] = id1 < id2 ? [p1, p2] : [p2, p1];
              const pairKey = `${first.id}__${second.id}`;

              if (!pairsMap.has(pairKey)) {
                pairsMap.set(pairKey, { p1: first, p2: second, matches: 0, wins: 0, losses: 0 });
              }

              const record = pairsMap.get(pairKey)!;
              record.matches++;
              if (won) {
                record.wins++;
              } else {
                record.losses++;
              }
            }
          }
        };

        if (match.teamA?.players) processSquad(match.teamA.players, winner === 'A');
        if (match.teamB?.players) processSquad(match.teamB.players, winner === 'B');
      });

      const allPairs: PairRecord[] = Array.from(pairsMap.entries()).map(([key, val]) => ({
        key,
        player1: val.p1,
        player2: val.p2,
        matchesPlayed: val.matches,
        wins: val.wins,
        losses: val.losses,
        winRate: val.matches > 0 ? Math.round((val.wins / val.matches) * 1000) / 10 : 0,
        lossRate: val.matches > 0 ? Math.round((val.losses / val.matches) * 1000) / 10 : 0,
      }));

      // 1. En çok kazanan çiftler (Wins azalan, ardından Kazanma Oranı azalan)
      const sortedBest = [...allPairs].sort(
        (a, b) => b.wins - a.wins || b.winRate - a.winRate || b.matchesPlayed - a.matchesPlayed
      );

      // 2. En çok kaybeden kâbus ikilileri (Kullanıcı kuralı: En az 3 maç birlikte oynamış olanlar)
      const min3Losses = allPairs.filter((p) => p.matchesPlayed >= 3 && p.losses > 0);
      const sortedWorst = (min3Losses.length >= 3 ? min3Losses : allPairs.filter((p) => p.losses > 0)).sort(
        (a, b) => b.losses - a.losses || b.lossRate - a.lossRate || b.matchesPlayed - a.matchesPlayed
      );

      return {
        topBestPair: sortedBest[0] || null,
        topWorstPair: sortedWorst[0] || null,
        secondaryBest1: sortedBest[1] || null,
        secondaryBest2: sortedBest[2] || null,
        secondaryWorst1: sortedWorst[1] || null,
        secondaryWorst2: sortedWorst[2] || null,
      };
    }, [players, pastMatches]);

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-amber-400" /> İkili Kimya & "Kader Ortaklığı" Matrisi
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Gerçek maç geçmişinde kimin kiminle aynı takımda oynadığında kazanma ve kaybetme oranlarını gösterir.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KULÜBÜN EN UYUMLU İKİLİSİ (TOP GREEN BOX) */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Kulübün En Uyumlu İkilisi
              </span>
              <h4 className="text-sm font-black text-white mt-0.5">
                {topBestPair
                  ? `${topBestPair.player1.name} & ${topBestPair.player2.name}`
                  : 'Henüz veri yok'}
              </h4>
              <p className="text-xs text-neutral-400">
                {topBestPair
                  ? `Toplam ${topBestPair.matchesPlayed} maç kaydı • ${topBestPair.wins} Galibiyet`
                  : 'Maç istatistikleri hesaplanıyor'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-emerald-400">
              %{topBestPair ? topBestPair.winRate.toFixed(1) : '0'}
            </span>
            <span className="text-[10px] text-neutral-400 block">Kazanma Oranı</span>
          </div>
        </div>

        {/* KÂBUS İKİLİSİ (TOP RED BOX - EN ÇOK MAĞLUBİYET) */}
        <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
              <Skull className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                Kâbus İkilisi (En Çok Mağlubiyet)
              </span>
              <h4 className="text-sm font-black text-white mt-0.5">
                {topWorstPair
                  ? `${topWorstPair.player1.name} & ${topWorstPair.player2.name}`
                  : 'Henüz veri yok'}
              </h4>
              <p className="text-xs text-neutral-400">
                {topWorstPair
                  ? `Toplam ${topWorstPair.matchesPlayed} maç kaydı • ${topWorstPair.losses} Mağlubiyet`
                  : 'Maç istatistikleri hesaplanıyor'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-rose-400">
              %{topWorstPair ? topWorstPair.lossRate.toFixed(0) : '0'}
            </span>
            <span className="text-[10px] text-neutral-400 block">Mağlubiyet Oranı</span>
          </div>
        </div>
      </div>

      {/* DİĞER ÖNE ÇIKAN OYUNCU PARTNERLİKLERİ (4 CARDS: 2 BEST + 2 WORST) */}
      <div className="mt-6 pt-4 border-t border-neutral-800">
        <h4 className="text-xs font-bold uppercase text-neutral-400 mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Diğer Öne Çıkan Oyuncu Partnerlikleri
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Slot 1: 2. En Uyumlu İkili */}
          {secondaryBest1 && (
            <div className="bg-neutral-800/60 p-3 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">
                2. En Uyumlu İkili
              </span>
              <span className="text-xs font-black text-white block mt-1 truncate">
                {secondaryBest1.player1.name.split(' ')[0]} & {secondaryBest1.player2.name.split(' ')[0]}
              </span>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1.5">
                <span>{secondaryBest1.matchesPlayed} Maç • {secondaryBest1.wins} Gal.</span>
                <span className="text-emerald-300 font-bold">%{secondaryBest1.winRate.toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* Slot 2: 3. En Uyumlu İkili */}
          {secondaryBest2 && (
            <div className="bg-neutral-800/60 p-3 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">
                3. En Uyumlu İkili
              </span>
              <span className="text-xs font-black text-white block mt-1 truncate">
                {secondaryBest2.player1.name.split(' ')[0]} & {secondaryBest2.player2.name.split(' ')[0]}
              </span>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1.5">
                <span>{secondaryBest2.matchesPlayed} Maç • {secondaryBest2.wins} Gal.</span>
                <span className="text-emerald-300 font-bold">%{secondaryBest2.winRate.toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* Slot 3: Sondan 2. Kâbus İkilisi */}
          {secondaryWorst1 && (
            <div className="bg-neutral-800/60 p-3 rounded-xl border border-rose-500/30">
              <span className="text-[10px] font-bold text-rose-400 block uppercase tracking-wider">
                Sondan 2. Kâbus İkilisi
              </span>
              <span className="text-xs font-black text-white block mt-1 truncate">
                {secondaryWorst1.player1.name.split(' ')[0]} & {secondaryWorst1.player2.name.split(' ')[0]}
              </span>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1.5">
                <span>{secondaryWorst1.matchesPlayed} Maç • {secondaryWorst1.losses} Mağ.</span>
                <span className="text-rose-300 font-bold">%{secondaryWorst1.lossRate.toFixed(0)}</span>
              </div>
            </div>
          )}

          {/* Slot 4: Sondan 3. Kâbus İkilisi */}
          {secondaryWorst2 && (
            <div className="bg-neutral-800/60 p-3 rounded-xl border border-rose-500/30">
              <span className="text-[10px] font-bold text-rose-400 block uppercase tracking-wider">
                Sondan 3. Kâbus İkilisi
              </span>
              <span className="text-xs font-black text-white block mt-1 truncate">
                {secondaryWorst2.player1.name.split(' ')[0]} & {secondaryWorst2.player2.name.split(' ')[0]}
              </span>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1.5">
                <span>{secondaryWorst2.matchesPlayed} Maç • {secondaryWorst2.losses} Mağ.</span>
                <span className="text-rose-300 font-bold">%{secondaryWorst2.lossRate.toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
