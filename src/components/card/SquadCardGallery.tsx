import React, { useState } from 'react';
import { Player, PreferredPosition, CardTheme } from '../../types';
import { FCCard } from './FCCard';
import { Search, Filter, Sparkles, Crown, Flame, Bandage, Shield } from 'lucide-react';

interface Props {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
}

export const SquadCardGallery: React.FC<Props> = ({ players, onSelectPlayer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [posFilter, setPosFilter] = useState<string>('ALL');
  const [themeFilter, setThemeFilter] = useState<string>('ALL');

  const filtered = players.filter((p) => {
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
              Oyuncuların kartlarına tıklayarak fotoğraflarını doğrudan kart üzerinden kadrajlayabilir, lakap ve niteliklerini güncelleyebilirsiniz.
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
            <Crown className="w-3 h-3" /> TOTW (Siyah)
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
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center">
        {filtered.map((player) => (
          <div key={player.id} className="flex flex-col items-center">
            <FCCard
              player={player}
              size="md"
              interactive={true}
              onClick={() => onSelectPlayer(player)}
            />
            <div className="mt-2 text-center">
              <button
                onClick={() => onSelectPlayer(player)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                Kartı İncele & Düzenle →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
