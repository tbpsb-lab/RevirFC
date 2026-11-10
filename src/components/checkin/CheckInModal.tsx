import React, { useState } from 'react';
import { Player, PhysicalStatus, CheckInEntry } from '../../types';
import { ShieldCheck, Bandage, Moon, Flame, AlertCircle } from 'lucide-react';

interface Props {
  player: Player;
  currentCheckIn?: CheckInEntry;
  onSave: (checkIn: CheckInEntry) => void;
  onClose: () => void;
}

export const CheckInModal: React.FC<Props> = ({ player, currentCheckIn, onSave, onClose }) => {
  const [status, setStatus] = useState<PhysicalStatus>(currentCheckIn?.status || 'full');
  const [note, setNote] = useState(currentCheckIn?.note || '');

  const options: {
    id: PhysicalStatus;
    title: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
    color: string;
    modifier: string;
  }[] = [
    {
      id: 'full',
      title: '%100 Hazırım (Tam Kapasite)',
      subtitle: 'Herhangi bir sakatlığım yok, kondisyonum tam. 1.00x güç.',
      icon: ShieldCheck,
      color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
      modifier: 'Normal Çarpan (1.00x)',
    },
    {
      id: 'light_injury',
      title: 'Hafif Sakatlık / Kas Çekmesi 🩹',
      subtitle: 'Arka adalem çekiyor, çok depar atamam ama ayakta kalırım.',
      icon: Bandage,
      color: 'border-rose-500/60 bg-rose-500/10 text-rose-400',
      modifier: 'PAC -%25, OVR -%10 • Defans/Kaleci Rolü',
    },
    {
      id: 'tired',
      title: 'Yorgun / Nöbet - Mesai Çıkışı 🟠',
      subtitle: 'Uykusuzum veya işten yeni çıktım, kondisyonum düşük.',
      icon: Moon,
      color: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
      modifier: 'PAC -%15 • Takım Başı Limitli',
    },
    {
      id: 'extra_fit',
      title: 'Ekstra Formda / İdmanlı 🔥',
      subtitle: 'Hafta içi antrenmanlıyım, enerjim tavan.',
      icon: Flame,
      color: 'border-orange-500/60 bg-orange-500/10 text-orange-400',
      modifier: 'PAC +%5 • Tempo Çarpanı',
    },
  ];

  const handleConfirm = () => {
    onSave({
      playerId: player.id,
      timestamp: Date.now(),
      status,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Bandage className="w-5 h-5 text-rose-400" /> Maç Öncesi "Revir & Sağlık" Raporu
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {player.name} ({player.nickname}) • 3 Saniyelik Hızlı Check-In
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        <p className="text-xs text-neutral-300 mb-4 bg-neutral-800/80 p-3 rounded-xl border border-neutral-700">
          Bu bildirim doğrudan <strong>462 kadro dengeleme algoritmasının katsayılarını</strong> ve sahadaki rolünüzü o maçlık ayarlar.
        </p>

        {/* Status choices */}
        <div className="space-y-2.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = status === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setStatus(opt.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                  isSelected
                    ? `${opt.color} ring-2 ring-amber-400/50 shadow-md`
                    : 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800/80 text-neutral-300'
                }`}
              >
                <div className="p-2 rounded-lg bg-black/40 mt-0.5">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{opt.title}</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-black/50 border border-white/10">
                      {opt.modifier}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{opt.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note input */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-neutral-300 mb-1">
            Özel Not / Açıklama (İsteğe Bağlı)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="örn: Arka adale çekiyor, depar atmam defansta kalırım."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
          >
            Vazgeç
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/25"
          >
            Durumu Kaydet & Onayla
          </button>
        </div>
      </div>
    </div>
  );
};
