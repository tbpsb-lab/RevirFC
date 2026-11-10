import React, { useState, useEffect } from 'react';
import { Player, PlayStyle, GoalkeeperWillingness, PlayerScoutingEntry } from '../../types';
import { FCCard } from '../card/FCCard';
import { PLAYSTYLE_CONFIG, PLAYSTYLE_CATEGORIES } from '../card/PlayStyleBadge';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Zap,
  Eye,
  Sliders,
  UserCheck,
  Share2,
  Lock,
  ListFilter,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  players: Player[];
  evaluatorName: string;
  onEvaluatorChange: (name: string) => void;
  savedEntries: PlayerScoutingEntry[];
  onSaveEntry: (entry: PlayerScoutingEntry) => void;
  onFinishAll: () => void;
  onSwitchToDashboard: () => void;
}

export const ScoutingWizard: React.FC<Props> = ({
  players,
  evaluatorName,
  onEvaluatorChange,
  savedEntries,
  onSaveEntry,
  onFinishAll,
  onSwitchToDashboard,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentPlayer = players[currentIndex] || players[0];

  // Find existing entry if already scored by this evaluator
  const existingEntry = savedEntries.find(
    (e) => e.playerId === currentPlayer.id && e.evaluatorName === evaluatorName
  );

  // Form state
  const [pac, setPac] = useState<number>(existingEntry?.pac ?? Math.round(currentPlayer.stats.pac / 10));
  const [sho, setSho] = useState<number>(existingEntry?.sho ?? Math.round(currentPlayer.stats.sho / 10));
  const [pas, setPas] = useState<number>(existingEntry?.pas ?? Math.round(currentPlayer.stats.pas / 10));
  const [dri, setDri] = useState<number>(existingEntry?.dri ?? Math.round(currentPlayer.stats.dri / 10));
  const [def, setDef] = useState<number>(existingEntry?.def ?? Math.round(currentPlayer.stats.def / 10));
  const [phy, setPhy] = useState<number>(existingEntry?.phy ?? Math.round(currentPlayer.stats.phy / 10));
  const [gkRole, setGkRole] = useState<GoalkeeperWillingness>(existingEntry?.gkRole ?? (currentPlayer.position === 'GK' ? 'yes' : 'emergency_only'));
  const [selectedPlaystyles, setSelectedPlaystyles] = useState<PlayStyle[]>(existingEntry?.playstyles ?? currentPlayer.playstyles.slice(0, 2));
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'tactical' | 'status' | 'humor'>('all');
  const [secretNote, setSecretNote] = useState<string>(existingEntry?.secretNote ?? '');

  // Keep state in sync when moving across players
  useEffect(() => {
    const entry = savedEntries.find(
      (e) => e.playerId === currentPlayer.id && e.evaluatorName === evaluatorName
    );
    if (entry) {
      setPac(entry.pac);
      setSho(entry.sho);
      setPas(entry.pas);
      setDri(entry.dri);
      setDef(entry.def);
      setPhy(entry.phy);
      setGkRole(entry.gkRole);
      setSelectedPlaystyles(entry.playstyles);
      setSecretNote(entry.secretNote || '');
    } else {
      setPac(Math.max(3, Math.min(10, Math.round(currentPlayer.stats.pac / 10))));
      setSho(Math.max(3, Math.min(10, Math.round(currentPlayer.stats.sho / 10))));
      setPas(Math.max(3, Math.min(10, Math.round(currentPlayer.stats.pas / 10))));
      setDri(Math.max(3, Math.min(10, Math.round(currentPlayer.stats.dri / 10))));
      setDef(Math.max(3, Math.min(10, Math.round(currentPlayer.stats.def / 10))));
      setPhy(Math.max(3, Math.min(10, Math.round(currentPlayer.stats.phy / 10))));
      setGkRole(currentPlayer.position === 'GK' ? 'yes' : 'emergency_only');
      setSelectedPlaystyles(currentPlayer.playstyles.slice(0, 2));
      setSecretNote('');
    }
  }, [currentIndex, evaluatorName, currentPlayer.id, savedEntries]);

  // Live calculated preview stats
  const previewStats = {
    pac: pac * 10,
    sho: sho * 10,
    pas: pas * 10,
    dri: dri * 10,
    def: def * 10,
    phy: phy * 10,
  };
  const previewOVR = Math.round((previewStats.pac + previewStats.sho + previewStats.pas + previewStats.dri + previewStats.def + previewStats.phy) / 6);

  // Playstyle toggle
  const togglePlayStyle = (style: PlayStyle) => {
    if (selectedPlaystyles.includes(style)) {
      setSelectedPlaystyles(selectedPlaystyles.filter((s) => s !== style));
    } else if (selectedPlaystyles.length < 2) {
      setSelectedPlaystyles([...selectedPlaystyles, style]);
    } else {
      setSelectedPlaystyles([selectedPlaystyles[1], style]);
    }
  };

  // Save current player entry
  const handleSaveAndNext = () => {
    const entry: PlayerScoutingEntry = {
      playerId: currentPlayer.id,
      evaluatorName,
      pac,
      sho,
      pas,
      dri,
      def,
      phy,
      gkRole,
      playstyles: selectedPlaystyles,
      secretNote: secretNote.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveEntry(entry);

    if (currentIndex < players.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      onFinishAll();
    }
  };

  // Progress metrics
  const scoredCount = players.filter((p) =>
    savedEntries.some((e) => e.playerId === p.id && e.evaluatorName === evaluatorName)
  ).length;
  const progressPercent = Math.round((scoredCount / players.length) * 100);

  // Copy unique survey link for this evaluator
  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'scouting');
    url.searchParams.set('kurul', evaluatorName);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Evaluator Name & Progress */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/40 border border-neutral-800 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase mb-1">
            <Sliders className="w-4 h-4" /> Yöntem 3: Kurul Değerlendirme & Kalibrasyon Modülü
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Oyuncu Puanlama Ekranı ({currentIndex + 1} / {players.length})
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            140 soruluk anket yorgunluğu yaşamadan, kart üzerinde kaydırıcılarla 20 oyuncuyu tek tek değerlendirin.
          </p>
        </div>

        {/* Evaluator Selector & Link Share */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 4 Committee Members Fast Switcher */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-2xl border border-neutral-800">
            <span className="text-[10px] text-neutral-400 font-bold px-2">Kurul:</span>
            {['Alper', 'Yüksel', 'Akif', 'İsmail'].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onEvaluatorChange(name)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  evaluatorName === name
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-2 rounded-xl border border-neutral-700 transition-colors"
            title="Kurul üyesine özel bağlantıyı kopyala (site.com/?kurul=adınız)"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            {copiedLink ? 'Kopyalandı!' : 'Özel Linkimi Kopyala'}
          </button>

          <button
            onClick={onSwitchToDashboard}
            className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-black font-black px-4 py-2 rounded-xl shadow-lg shadow-amber-500/20"
          >
            <ListFilter className="w-4 h-4" /> Konsensus Tablosu
          </button>
        </div>
      </div>

      {/* Progress Bar & Dots */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-neutral-300">
            Kurul Değerlendirme İlerlemesi: {scoredCount} / {players.length} Oyuncu Tamamlandı
          </span>
          <span className="font-mono font-bold text-amber-400">%{progressPercent}</span>
        </div>

        <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Player Dots for direct jump */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
          {players.map((p, idx) => {
            const isScored = savedEntries.some(
              (e) => e.playerId === p.id && e.evaluatorName === evaluatorName
            );
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={p.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 rounded-lg text-[11px] font-bold shrink-0 transition-all flex items-center justify-center border ${
                  isCurrent
                    ? 'bg-amber-500 text-black border-amber-300 scale-110 shadow-md shadow-amber-500/30'
                    : isScored
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-white'
                }`}
                title={`${p.name} (${isScored ? 'Puanlandı ✓' : 'Bekliyor'})`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Evaluation Workspace: Card Preview + Slider Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Dynamic FC 27 Card with live calculated attributes */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-24">
            <FCCard
              player={{
                ...currentPlayer,
                playstyles: selectedPlaystyles,
              }}
              overrideStats={previewStats}
              overrideOVR={previewOVR}
              size="lg"
              interactive={true}
              showBadges={true}
            />

            <div className="mt-4 text-center">
              <span className="text-xs font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800">
                Canlı Kart Önizlemesi • OVR: <strong className="text-amber-400">{previewOVR}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: The 6 Halı Saha Sliders & Attributes Form */}
        <div className="lg:col-span-7 bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-lg font-black text-white">{currentPlayer.name}</h3>
              <p className="text-xs text-amber-400/90 italic">
                "{currentPlayer.nickname}" • Forma: #{currentPlayer.number} • Ana Mevki: {currentPlayer.position}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 font-mono">
              Oyuncu {currentIndex + 1} / {players.length}
            </span>
          </div>

          {/* 6 Core Sliders */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" /> 6 Temel Halı Saha Metriği (1 - 10 Kaydırıcı)
            </h4>

            {/* PAC */}
            <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">PAC • Tempo & Kondisyon</span>
                <span className="font-mono font-black text-amber-400 text-sm bg-neutral-900 px-2.5 py-0.5 rounded-lg border border-neutral-700">
                  {pac} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={pac}
                onChange={(e) => setPac(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block">Maç boyu depar atabilme ve koşu temposu</span>
            </div>

            {/* SHO */}
            <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">SHO • Şut & Bitiricilik</span>
                <span className="font-mono font-black text-amber-400 text-sm bg-neutral-900 px-2.5 py-0.5 rounded-lg border border-neutral-700">
                  {sho} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={sho}
                onChange={(e) => setSho(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block">Son vuruş kalitesi, uzaktan sert şut ve gol koklama</span>
            </div>

            {/* PAS */}
            <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">PAS • Vizyon & Oyun Kurma</span>
                <span className="font-mono font-black text-amber-400 text-sm bg-neutral-900 px-2.5 py-0.5 rounded-lg border border-neutral-700">
                  {pas} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={pas}
                onChange={(e) => setPas(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block">Ara pası, top dağıtma ve isabetli pas yüzdesi</span>
            </div>

            {/* DRI */}
            <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">DRI • Dar Alan & Dribbling</span>
                <span className="font-mono font-black text-amber-400 text-sm bg-neutral-900 px-2.5 py-0.5 rounded-lg border border-neutral-700">
                  {dri} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={dri}
                onChange={(e) => setDri(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block">Bilek hareketleri, top saklama ve adam eksiltme</span>
            </div>

            {/* DEF */}
            <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">DEF • Kademe & Savunma</span>
                <span className="font-mono font-black text-amber-400 text-sm bg-neutral-900 px-2.5 py-0.5 rounded-lg border border-neutral-700">
                  {def} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={def}
                onChange={(e) => setDef(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block">Top kapma, araya girme ve savunma disiplini</span>
            </div>

            {/* PHY */}
            <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">PHY • Fizik & İkili Mücadele</span>
                <span className="font-mono font-black text-amber-400 text-sm bg-neutral-900 px-2.5 py-0.5 rounded-lg border border-neutral-700">
                  {phy} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={phy}
                onChange={(e) => setPhy(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block">Omuz omuza direnç, yıkılmama ve ayakta kalma</span>
            </div>
          </div>

          {/* Kaleye Geçer mi? */}
          <div className="bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
            <label className="text-xs font-bold text-white block mb-2">
              🧤 Kaleye Geçer mi? (Dengeleme Algoritması İçin Kritik)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGkRole('yes')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  gkRole === 'yes'
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                🧤 Evet (Gönüllü)
              </button>
              <button
                type="button"
                onClick={() => setGkRole('emergency_only')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  gkRole === 'emergency_only'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                ⚠️ Sadece Acil Durumda
              </button>
              <button
                type="button"
                onClick={() => setGkRole('never')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  gkRole === 'never'
                    ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                🚫 Asla Geçmez
              </button>
            </div>
          </div>

          {/* PlayStyles Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-300">
                Karakteristik Rozetler (PlayStyles+ • Maksimum 2 Seçim)
              </label>
              <span className="text-[11px] text-amber-400 font-bold">
                {selectedPlaystyles.length}/2 Seçildi
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1">
              {PLAYSTYLE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-xs px-3 py-1 rounded-full font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Badge Buttons */}
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-neutral-950/70 rounded-2xl border border-neutral-800">
              {(Object.keys(PLAYSTYLE_CONFIG) as PlayStyle[])
                .filter((style) => {
                  if (selectedCategory === 'all') return true;
                  return PLAYSTYLE_CONFIG[style].category === selectedCategory;
                })
                .map((style) => {
                  const cfg = PLAYSTYLE_CONFIG[style];
                  const isSelected = selectedPlaystyles.includes(style);
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => togglePlayStyle(style)}
                      title={`${cfg.label}: ${cfg.description}`}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-semibold flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md shadow-amber-500/20'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{cfg.label}</span>
                      {isSelected && <span className="font-black text-black ml-0.5">✓</span>}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Secret Note / Chemistry Warning */}
          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              🤫 Gizli Not / Kimya Uyarısı (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={secretNote}
              onChange={(e) => setSecretNote(e.target.value)}
              placeholder="örn: Ahmet ile paslaşmıyor, defansa dönmez, ikinci yarı oyundan düşer..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Navigation & Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-300 text-xs font-bold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Önceki Oyuncu
            </button>

            <button
              type="button"
              onClick={handleSaveAndNext}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-2 shadow-xl shadow-amber-500/30 transition-transform active:scale-95"
            >
              {currentIndex === players.length - 1 ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Tüm Puanlamayı Tamamla & Kaydet
                </>
              ) : (
                <>
                  Kaydet ve Sonrakine Geç <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
