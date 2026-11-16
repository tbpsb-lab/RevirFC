import React, { useState } from 'react';
import { Player, PhysicalStatus, CheckInEntry } from '../../types';
import { ShieldCheck, Bandage, Moon, Flame, CreditCard, Coffee } from 'lucide-react';

interface Props {
  player: Player;
  currentCheckIn?: CheckInEntry;
  onSave: (checkIn: CheckInEntry) => void;
  onClose: () => void;
}

export const CheckInModal: React.FC<Props> = ({ player, currentCheckIn, onSave, onClose }) => {
  const [status, setStatus] = useState<PhysicalStatus>(currentCheckIn?.status || 'full');
  const [note, setNote] = useState(currentCheckIn?.note || '');
  const [canPayPitchFee, setCanPayPitchFee] = useState<boolean>(Boolean(currentCheckIn?.canPayPitchFee));
  const [canBringTea, setCanBringTea] = useState<boolean>(Boolean(currentCheckIn?.canBringTea));

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
      attendance: currentCheckIn?.attendance || 'yes',
      canPayPitchFee,
      canBringTea,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl max-w-xl w-full max-h-[88vh] supports-[height:100dvh]:max-h-[calc(100dvh-1.5rem)] sm:supports-[height:100dvh]:max-h-[88dvh] flex flex-col p-4 sm:p-5 text-white shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800 mb-3 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Bandage className="w-5 h-5 text-rose-400 shrink-0" /> Maç Öncesi &quot;Revir &amp; Sağlık&quot; Raporu
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {player.name} ({player.nickname}) • 3 Saniyelik Hızlı Check-In
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 space-y-2.5">
          <p className="text-xs text-neutral-300 bg-neutral-800/80 p-2.5 sm:p-3 rounded-xl border border-neutral-700">
            Bu bildirim doğrudan <strong>462 kadro dengeleme algoritmasının katsayılarını</strong> ve sahadaki rolünüzü o maçlık ayarlar.
          </p>

          {/* Status choices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = status === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setStatus(opt.id)}
                  className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? `${opt.color} ring-2 ring-amber-400/50 shadow-md`
                      : 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800/80 text-neutral-300'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-black/40 mt-0.5 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-[13px] font-bold block leading-snug">{opt.title}</span>
                    <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-black/50 border border-white/10">
                      {opt.modifier}
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-snug">{opt.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pitch Fee Volunteer Option */}
          <button
            type="button"
            onClick={() => setCanPayPitchFee((v) => !v)}
            className={`w-full p-2.5 sm:p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
              canPayPitchFee
                ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200 ring-1 ring-emerald-400/40'
                : 'bg-neutral-800/40 border-neutral-700/80 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-lg shrink-0 ${canPayPitchFee ? 'bg-emerald-500/25 text-emerald-300' : 'bg-black/40 text-neutral-400'}`}>
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block">💳 Bu hafta halı saha ücretini ben ödeyebilirim</span>
                <span className="text-[11px] text-neutral-400 block">Haftanın saha ücreti ödeyicisi listesine gönüllü olarak yazıl</span>
              </div>
            </div>
            <span
              className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-black shrink-0 ${
                canPayPitchFee
                  ? 'bg-emerald-500 border-emerald-400 text-black'
                  : 'bg-neutral-900 border-neutral-600 text-transparent'
              }`}
            >
              ✓
            </span>
          </button>

          {/* Tea Thermos Volunteer Option */}
          <button
            type="button"
            onClick={() => setCanBringTea((v) => !v)}
            className={`w-full p-2.5 sm:p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
              canBringTea
                ? 'bg-amber-500/15 border-amber-400/60 text-amber-100 ring-1 ring-amber-400/40'
                : 'bg-neutral-800/40 border-neutral-700/80 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-lg shrink-0 ${canBringTea ? 'bg-amber-500/25 text-amber-300' : 'bg-black/40 text-neutral-400'}`}>
                <Coffee className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block">🫖 Bu hafta termosla çayı ben getirebilirim</span>
                <span className="text-[11px] text-neutral-400 block">Haftanın çay gönüllüleri arasına adını ekle</span>
              </div>
            </div>
            <span
              className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-black shrink-0 ${
                canBringTea
                  ? 'bg-amber-500 border-amber-400 text-black'
                  : 'bg-neutral-900 border-neutral-600 text-transparent'
              }`}
            >
              ✓
            </span>
          </button>

          {/* Note input */}
          <div>
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
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex justify-end gap-2.5 pt-3 mt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            Durumu Kaydet & Onayla
          </button>
        </div>
      </div>
    </div>
  );
};
