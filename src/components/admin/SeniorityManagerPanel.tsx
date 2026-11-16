import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Lock, RotateCcw, Save } from 'lucide-react';
import { DEFAULT_SENIORITY_NAMES, getPlayerSeniorityRank, Player } from '../../types';

interface Props {
  players: Player[];
  activeStarterIds?: string[];
  onSaveSeniority: (orderedPlayerIds: string[]) => void;
}

function getDefaultSortedIds(players: Player[]): string[] {
  return [...players]
    .sort((a, b) => {
      const normA = a.name.trim().toLocaleLowerCase('tr-TR');
      const normB = b.name.trim().toLocaleLowerCase('tr-TR');
      const idxA = DEFAULT_SENIORITY_NAMES.findIndex((n) => n.toLocaleLowerCase('tr-TR') === normA);
      const idxB = DEFAULT_SENIORITY_NAMES.findIndex((n) => n.toLocaleLowerCase('tr-TR') === normB);
      const rankA = idxA >= 0 ? idxA : 999;
      const rankB = idxB >= 0 ? idxB : 999;
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name, 'tr-TR');
    })
    .map((p) => p.id);
}

function getCurrentSortedIds(players: Player[]): string[] {
  return [...players]
    .sort((a, b) => {
      const rankDiff = getPlayerSeniorityRank(a) - getPlayerSeniorityRank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, 'tr-TR');
    })
    .map((p) => p.id);
}

export const SeniorityManagerPanel: React.FC<Props> = ({
  players,
  activeStarterIds = [],
  onSaveSeniority,
}) => {
  const savedOrderIds = useMemo(() => getCurrentSortedIds(players), [players]);
  const [orderedIds, setOrderedIds] = useState<string[]>(savedOrderIds);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setOrderedIds(savedOrderIds);
  }, [savedOrderIds]);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const starterSet = useMemo(() => new Set(activeStarterIds), [activeStarterIds]);

  const isDirty = useMemo(() => {
    if (orderedIds.length !== savedOrderIds.length) return true;
    return orderedIds.some((id, idx) => id !== savedOrderIds[idx]);
  }, [orderedIds, savedOrderIds]);

  const movePlayer = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= orderedIds.length) return;
    setOrderedIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setSavedToast(false);
  };

  const handleResetDefault = () => {
    setOrderedIds(getDefaultSortedIds(players));
    setSavedToast(false);
  };

  const handleSave = () => {
    onSaveSeniority(orderedIds);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="bg-neutral-900 border border-amber-500/35 rounded-3xl p-5 space-y-4 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Gizli Kıdem Sıralaması &amp; Yeleksiz Kuralı
              </h3>
              <p className="text-[11px] text-amber-300/90 font-semibold">
                Yalnızca Yönetici Modu (Alper) görür • Diğer üyelere ve kurul üyelerine tamamen gizlidir.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold border border-neutral-700 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Varsayılana Dön
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
              isDirty
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {isDirty ? 'Kıdem Sırasını Kaydet & Uygula' : 'Kaydet / Kadroyu Güncelle'}
          </button>
        </div>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 text-xs text-neutral-300 leading-relaxed">
        <strong className="text-amber-300">Nasıl Çalışır?</strong> Haftalık ilk 12 asil kadroya katılan oyunculardan listede en üst sırada yer alan en kıdemli oyuncu hangi takıma düşerse, o takım otomatik olarak <strong className="text-white">Yeleksiz</strong> olur; rakip takım ise <strong className="text-emerald-400">Yelekli</strong> oynar. Bu kural algoritma yorumlarında dahi dışarıya açıklanmaz.
      </div>

      {savedToast && (
        <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold px-3.5 py-2.5 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Kıdem sıralaması kaydedildi ve aktif maçın Yelekli / Yeleksiz dağılımı güncellendi.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {orderedIds.map((playerId, index) => {
          const p = playerMap.get(playerId);
          if (!p) return null;
          const isStarter = starterSet.has(p.id);
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl border transition-colors ${
                index === 0
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono font-black shrink-0 ${
                    index < 3
                      ? 'bg-amber-500 text-black'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {index + 1}
                </span>
                <img
                  src={p.photoUrl || '/logo.jpg'}
                  alt={p.name}
                  className="w-8 h-8 rounded-full object-cover border border-neutral-700 bg-neutral-900 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-white truncate">{p.name}</span>
                    {isStarter && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        İlk 12
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    {p.position} • {p.currentOVR} OVR
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => movePlayer(index, -1)}
                  disabled={index === 0}
                  title="Yukarı taşı (Kıdem artır)"
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-200 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => movePlayer(index, 1)}
                  disabled={index === orderedIds.length - 1}
                  title="Aşağı taşı"
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-200 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
