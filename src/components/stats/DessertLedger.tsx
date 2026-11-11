import React, { useState } from 'react';
import { DessertDebt, Player } from '../../types';
import { Coffee, CheckCircle, PlusCircle, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  debts: DessertDebt[];
  players: Player[];
  onToggleDebt: (debtId: string) => void;
  onAddDebt: (debtorId: string, description: string, type: DessertDebt['treatType']) => void;
}

export const DessertLedger: React.FC<Props> = ({
  debts,
  players,
  onToggleDebt,
  onAddDebt,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [debtorId, setDebtorId] = useState(players[0]?.id || '');
  const [description, setDescription] = useState('');
  const [treatType, setTreatType] = useState<DessertDebt['treatType']>('baklava');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorId || !description.trim()) return;
    onAddDebt(debtorId, description.trim(), treatType);
    setDescription('');
    setShowAdd(false);
  };

  const handleToggle = (id: string, currentStatus: 'pending' | 'paid') => {
    if (currentStatus === 'pending') {
      confetti({ particleCount: 50, spread: 60 });
    }
    onToggleDebt(id);
  };

  const getTreatIcon = (type: DessertDebt['treatType']) => {
    switch (type) {
      case 'baklava':
        return '🍯 Baklava';
      case 'çay':
        return '☕ Çay Turu';
      case 'kebap':
        return '🥩 Kebap/Dürüm';
      case 'soğuk_içecek':
      default:
        return '🥤 Soğuk İçecek';
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-400" /> Kulüp Kasası & Tatlı / Çay Çetelesi
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            İddia kaybedenlerin veya Haftanın Bidonu seçilenlerin baklava/çay borçları unutulmaz!
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20"
        >
          <PlusCircle className="w-4 h-4" /> Borç Ekle
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <form onSubmit={handleAddSubmit} className="mb-6 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Borçlu Oyuncu</label>
              <select
                value={debtorId}
                onChange={(e) => setDebtorId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-xs text-white"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">İkram Türü</label>
              <select
                value={treatType}
                onChange={(e) => setTreatType(e.target.value as any)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-xs text-white"
              >
                <option value="baklava">🍯 Baklava</option>
                <option value="çay">☕ Çay Turu</option>
                <option value="kebap">🥩 Kebap / Dürüm</option>
                <option value="soğuk_içecek">🥤 Soğuk İçecek</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Açıklama / Sebep</label>
              <input
                type="text"
                placeholder="örn: Boş kaleye kaçırdı veya iddia kaybetti"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-xs bg-neutral-800 rounded-lg text-neutral-300"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-black bg-amber-500 hover:bg-amber-400 text-black rounded-lg"
            >
              Çeteleye Ekle
            </button>
          </div>
        </form>
      )}

      {/* Debt list */}
      <div className="space-y-3">
        {debts.map((item) => {
          const debtor = players.find((p) => p.id === item.debtorPlayerId);
          const isPaid = item.status === 'paid';

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                isPaid
                  ? 'bg-neutral-950/40 border-neutral-800/60 opacity-60'
                  : 'bg-neutral-850/80 border-amber-500/30 shadow-md'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={debtor?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={debtor?.name}
                  className="w-10 h-10 rounded-full object-cover border border-white/20"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{debtor?.name}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {getTreatIcon(item.treatType)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">{item.description}</p>
                </div>
              </div>

              <button
                onClick={() => handleToggle(item.id, item.status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  isPaid
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {isPaid ? 'Ödendi ✓' : 'Borcu Kapat'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
