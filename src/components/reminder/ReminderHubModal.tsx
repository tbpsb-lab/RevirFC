import React, { useState } from 'react';
import { Player, Match, PlayerScoutingEntry } from '../../types';
import { COMMITTEE_MEMBERS } from '../../services/mockData';
import {
  Bell,
  Mail,
  MessageCircle,
  Copy,
  Check,
  Send,
  AlertTriangle,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';

interface Props {
  match: Match;
  players: Player[];
  savedScoutingEntries: PlayerScoutingEntry[];
  onQuickCheckInForPlayer: (playerId: string) => void;
  onClose: () => void;
}

export const ReminderHubModal: React.FC<Props> = ({
  match,
  players,
  savedScoutingEntries,
  onQuickCheckInForPlayer,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'checkin' | 'rating' | 'scouting'>('checkin');
  const [copied, setCopied] = useState(false);

  // 1. Missing Check-ins (Players in match starters who haven't checked in)
  const starters = players.filter((p) => match.starters.includes(p.id));
  const missingCheckInPlayers = starters.filter((p) => !match.checkIns[p.id]);

  // 2. Missing Ratings (Players who were in match but haven't submitted post-match rating)
  const votedRaterIds = new Set(match.ratings?.map((r) => r.raterPlayerId) || []);
  const missingRatingPlayers = starters.filter((p) => !votedRaterIds.has(p.id));

  // 3. Missing Committee Members (from Alper, Yüksel, Akif, İsmail)
  const committeeStatus = COMMITTEE_MEMBERS.map((name) => {
    const scoredCount = players.filter((p) =>
      savedScoutingEntries.some((e) => e.playerId === p.id && e.evaluatorName === name)
    ).length;
    return {
      name,
      scoredCount,
      total: players.length,
      isDone: scoredCount === players.length,
    };
  });

  // Current Site URL
  const siteUrl = window.location.origin;

  // Generate polite, friendly halı saha reminder messages
  const getWhatsAppMessage = () => {
    if (activeTab === 'checkin') {
      const names = missingCheckInPlayers.map((p) => p.name).join(', ');
      return `⚽ *RevirFC 27 • Maç Öncesi Check-In Hatırlatması*\n\nBeyler selam! ${match.title} için kadro dengeleme algoritması çalıştırılacak.\nHenüz sağlık/revir durumu bildirmeyen arkadaşlar:\n👉 ${names || 'Herkes bildirdi!'}\n\n3 saniyede durumunuzu seçip onaylayın:\n🔗 ${siteUrl}`;
    } else if (activeTab === 'rating') {
      const names = missingRatingPlayers.map((p) => p.name).join(', ');
      return `🏆 *RevirFC 27 • Maç Sonu 360° Puanlama*\n\nMaç bitti! Haftanın MVP'si (Most Valuable Player) ve Günün Bidonu'nu belirlemek için karneler 24 saat açık.\nPuanlamasını yapmayanlar:\n👉 ${names || 'Herkes tamamladı!'}\n\nOylarınızı gönderin, kartlar güncellensin:\n🔗 ${siteUrl}`;
    } else {
      const pendingCommittee = committeeStatus.filter((c) => !c.isDone).map((c) => `${c.name} (${c.scoredCount}/${c.total})`).join(', ');
      return `⭐ *RevirFC 27 • Kurul Kalibrasyon Hatırlatması*\n\nKurul üyelerimiz (${pendingCommittee || 'Tümü tamamlandı!'}), 20 kişilik kadronun baz reyting konsensüsünü tamamlamak için linke tıklayıp kaydırıcılarla puanları kaydedebilirsiniz:\n🔗 ${siteUrl}/?tab=scouting`;
    }
  };

  const getEmailSubject = () => {
    if (activeTab === 'checkin') return `RevirFC 27 - ${match.title} Durum Bildirimi Hatırlatması`;
    if (activeTab === 'rating') return 'RevirFC 27 - Maç Sonu 360° Puanlama Karneniz Açık';
    return 'RevirFC 27 - Kurul Oyuncu Kalibrasyonu Hatırlatması';
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(getWhatsAppMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsAppWeb = () => {
    const text = encodeURIComponent(getWhatsAppMessage());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleOpenEmailClient = () => {
    const subject = encodeURIComponent(getEmailSubject());
    const body = encodeURIComponent(getWhatsAppMessage());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl relative my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Hatırlatıcı & Bildirim Merkezi</h2>
              <p className="text-xs text-neutral-400">
                Girmeyi unutan üyeleri rahatsız etmeden, kibar e-posta veya WhatsApp mesajıyla haberdar edin.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 mb-5 text-xs">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'checkin'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Maç Check-In ({missingCheckInPlayers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rating')}
            className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'rating'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Maç Puanlama ({missingRatingPlayers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('scouting')}
            className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'scouting'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kurul Puanlama</span>
          </button>
        </div>

        {/* Status Snapshot of Missing Members */}
        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80 mb-5">
          {activeTab === 'checkin' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-300">
                  Henüz Check-In Yapmayan Oyuncular ({missingCheckInPlayers.length} Kişi)
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  Sistem Hata Vermez: Kaptan tek tıkla onaylayabilir
                </span>
              </div>
              {missingCheckInPlayers.length === 0 ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-4 h-4" /> 12 kişilik kadronun tamamı durum bildirdi!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {missingCheckInPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-xl text-xs"
                    >
                      <span className="font-bold text-white">{p.name}</span>
                      <button
                        onClick={() => onQuickCheckInForPlayer(p.id)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                        title="Oyuncu adına %100 Hazır check-in'i yap"
                      >
                        Kaptan Adına Onayla ✓
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rating' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-300">
                  Puan Vermeyen Oyuncular ({missingRatingPlayers.length} Kişi)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Mevcut Oylar Üzerinden Hata Vermeden Hesaplanır
                </span>
              </div>
              {missingRatingPlayers.length === 0 ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-4 h-4" /> Herkes maç sonu karnesini tamamladı!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {missingRatingPlayers.map((p) => (
                    <span
                      key={p.id}
                      className="text-xs bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-xl font-bold text-neutral-300"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'scouting' && (
            <div>
              <span className="text-xs font-bold text-neutral-300 block mb-2">
                Kurul Üyelerinin Puanlama Durumu
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {committeeStatus.map((c) => (
                  <div
                    key={c.name}
                    className={`p-2.5 rounded-xl border text-xs ${
                      c.isDone
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span className="font-bold block text-white">{c.name}</span>
                    <span className="text-[11px] font-mono mt-0.5 block">
                      {c.scoredCount} / {c.total} {c.isDone ? '✓' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message Preview */}
        <div className="mb-5">
          <label className="text-xs font-bold text-neutral-300 block mb-1.5 uppercase tracking-wider">
            Otomatik Üretilen Kibar Hatırlatma Metni
          </label>
          <pre className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs text-neutral-300 font-sans whitespace-pre-wrap leading-relaxed">
            {getWhatsAppMessage()}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-neutral-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopyalandı!' : 'Metni Kopyala'}
            </button>

            <button
              onClick={handleOpenWhatsAppWeb}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp Grubuna Gönder
            </button>
          </div>

          <button
            onClick={handleOpenEmailClient}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20"
          >
            <Mail className="w-4 h-4" /> E-Posta Taslağı Aç
          </button>
        </div>
      </div>
    </div>
  );
};
