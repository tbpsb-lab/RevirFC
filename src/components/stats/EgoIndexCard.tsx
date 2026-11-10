import React from 'react';
import { Player } from '../../types';
import { Rocket, ShieldCheck, Scale, Award } from 'lucide-react';

interface Props {
  players: Player[];
}

export const EgoIndexCard: React.FC<Props> = ({ players }) => {
  // Sort players by highest ego vs lowest ego
  const sortedHighEgo = [...players].sort((a, b) => b.egoIndex - a.egoIndex);
  const sortedHumble = [...players].sort((a, b) => a.egoIndex - b.egoIndex);

  const highestEgoPlayer = sortedHighEgo[0];
  const mostHumblePlayer = sortedHumble[0];

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" /> "Öz Algı vs. Saha Gerçeği" Endeksi
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Kendine verdiği puan ile sahadaki arkadaşlarının verdiği puan arasındaki makas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* En Yüksek Özgüven Patlaması */}
        {highestEgoPlayer && (
          <div className="bg-gradient-to-br from-rose-950/40 via-neutral-900 to-neutral-900 border border-rose-500/40 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
                <Rocket className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                  Özgüven Patlaması Lideri 🚀
                </span>
                <h4 className="text-sm font-black text-white mt-0.5">{highestEgoPlayer.name}</h4>
                <p className="text-xs text-neutral-400 italic">"Bugün yine resital sundum"</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-rose-400">+{highestEgoPlayer.egoIndex.toFixed(1)}</span>
              <span className="text-[10px] text-neutral-400 block">Puan Farkı</span>
            </div>
          </div>
        )}

        {/* En Mütevazı Gizli Kahraman */}
        {mostHumblePlayer && (
          <div className="bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Gizli Kahraman / Mütevazı Usta 🛡️
                </span>
                <h4 className="text-sm font-black text-white mt-0.5">{mostHumblePlayer.name}</h4>
                <p className="text-xs text-neutral-400 italic">"Ben sadece görevimi yaptım"</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-emerald-400">{mostHumblePlayer.egoIndex.toFixed(1)}</span>
              <span className="text-[10px] text-neutral-400 block">Puan Farkı</span>
            </div>
          </div>
        )}
      </div>

      {/* 20-Player Mini Leaderboard */}
      <div className="bg-neutral-950/60 rounded-2xl p-4 border border-neutral-800">
        <h4 className="text-xs font-bold uppercase text-neutral-400 mb-3">Tüm Kadro Öz Algı Dağılımı</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {sortedHighEgo.map((p) => {
            const isHigh = p.egoIndex >= 1.0;
            const isHumble = p.egoIndex <= -0.8;

            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-xs"
              >
                <div className="flex items-center gap-2">
                  <img src={p.photoUrl} alt={p.name} className="w-6 h-6 rounded-full object-cover" />
                  <span className="font-bold text-white">{p.name}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">#{p.number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isHigh
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : isHumble
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {isHigh ? 'Özgüven Patlaması 🚀' : isHumble ? 'Gizli Kahraman 🛡️' : 'Dengeli ⚖️'}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      p.egoIndex > 0 ? 'text-rose-400' : p.egoIndex < 0 ? 'text-emerald-400' : 'text-neutral-400'
                    }`}
                  >
                    {p.egoIndex > 0 ? `+${p.egoIndex.toFixed(1)}` : p.egoIndex.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
