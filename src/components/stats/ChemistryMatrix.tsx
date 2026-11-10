import React from 'react';
import { Player } from '../../types';
import { Users2, Flame, Skull, Trophy } from 'lucide-react';

interface Props {
  players: Player[];
}

export const ChemistryMatrix: React.FC<Props> = ({ players }) => {
  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-amber-400" /> İkili Kimya & "Kader Ortaklığı" Matrisi
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Kimin kiminle aynı takımda oynadığında kazanma oranının tavan veya taban yaptığını gösterir.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* En İyi İkili */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Kulübün En Uyumlu İkilisi
              </span>
              <h4 className="text-sm font-black text-white mt-0.5">Mert Kayra & Burak Demir</h4>
              <p className="text-xs text-neutral-400">Birlikte 16 maç • 14 Galibiyet</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-emerald-400">%87.5</span>
            <span className="text-[10px] text-neutral-400 block">Kazanma Oranı</span>
          </div>
        </div>

        {/* Kâbus İkilisi */}
        <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
              <Skull className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                Kâbus İkilisi (Aynı Takımda Kazanamayan)
              </span>
              <h4 className="text-sm font-black text-white mt-0.5">Caner Özkan & Okan Güler</h4>
              <p className="text-xs text-neutral-400">İkisi de geri koşmuyor • 10 maç 2 Galibiyet</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-rose-400">%20.0</span>
            <span className="text-[10px] text-neutral-400 block">Kazanma Oranı</span>
          </div>
        </div>
      </div>

      {/* Top 4 Player Partnership Snapshot */}
      <div className="mt-6 pt-4 border-t border-neutral-800">
        <h4 className="text-xs font-bold uppercase text-neutral-400 mb-3">
          Öne Çıkan Oyuncu Partnerlikleri
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {players.slice(0, 4).map((p, idx) => {
            const partner = players[(idx + 1) % players.length];
            return (
              <div key={p.id} className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/60">
                <span className="text-xs font-bold text-white block truncate">{p.name}</span>
                <span className="text-[11px] text-amber-300 font-semibold block mt-1">
                  En İyi Partneri: {partner.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-neutral-400">Galibiyet: %78</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
