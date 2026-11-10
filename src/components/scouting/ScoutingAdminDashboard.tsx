import React, { useState } from 'react';
import { Player, PlayerScoutingEntry, CommitteeConsensus, PlayStyle } from '../../types';
import { COMMITTEE_MEMBERS } from '../../services/mockData';
import { PLAYSTYLE_CONFIG } from '../card/PlayStyleBadge';
import {
  FileSpreadsheet,
  Lock,
  Download,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  players: Player[];
  savedEntries: PlayerScoutingEntry[];
  onApplyConsensusToPlayers: (updatedPlayers: Player[]) => void;
  onBackToWizard: () => void;
}

export const ScoutingAdminDashboard: React.FC<Props> = ({
  players,
  savedEntries,
  onApplyConsensusToPlayers,
  onBackToWizard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Designated 4 Committee Members + any other voters
  const allEvaluators = Array.from(
    new Set([...COMMITTEE_MEMBERS, ...savedEntries.map((e) => e.evaluatorName)])
  ).filter(Boolean);

  // Compute consensus for each player
  const consensusList: CommitteeConsensus[] = players.map((player) => {
    const entries = savedEntries.filter((e) => e.playerId === player.id);

    if (entries.length === 0) {
      // Default fallback to player's current stats if no votes yet
      return {
        playerId: player.id,
        avgPac: Math.round(player.stats.pac / 10),
        avgSho: Math.round(player.stats.sho / 10),
        avgPas: Math.round(player.stats.pas / 10),
        avgDri: Math.round(player.stats.dri / 10),
        avgDef: Math.round(player.stats.def / 10),
        avgPhy: Math.round(player.stats.phy / 10),
        calculatedOVR: player.currentOVR,
        votesCount: 0,
        gkScore: { yes: player.position === 'GK' ? 1 : 0, emergency: 0, never: 0 },
        popularPlaystyles: player.playstyles,
        notes: [],
      };
    }

    const avgPac = Math.round((entries.reduce((sum, e) => sum + e.pac, 0) / entries.length) * 10) / 10;
    const avgSho = Math.round((entries.reduce((sum, e) => sum + e.sho, 0) / entries.length) * 10) / 10;
    const avgPas = Math.round((entries.reduce((sum, e) => sum + e.pas, 0) / entries.length) * 10) / 10;
    const avgDri = Math.round((entries.reduce((sum, e) => sum + e.dri, 0) / entries.length) * 10) / 10;
    const avgDef = Math.round((entries.reduce((sum, e) => sum + e.def, 0) / entries.length) * 10) / 10;
    const avgPhy = Math.round((entries.reduce((sum, e) => sum + e.phy, 0) / entries.length) * 10) / 10;

    // Calculate OVR: Average * 10
    const calculatedOVR = Math.round(((avgPac + avgSho + avgPas + avgDri + avgDef + avgPhy) / 6) * 10);

    // GK willingness
    const gkScore = {
      yes: entries.filter((e) => e.gkRole === 'yes').length,
      emergency: entries.filter((e) => e.gkRole === 'emergency_only').length,
      never: entries.filter((e) => e.gkRole === 'never').length,
    };

    // Playstyles frequency
    const styleCount: Record<string, number> = {};
    for (const e of entries) {
      for (const s of e.playstyles) {
        styleCount[s] = (styleCount[s] || 0) + 1;
      }
    }
    const popularPlaystyles = Object.entries(styleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([s]) => s as PlayStyle);

    // Secret notes
    const notes = entries
      .filter((e) => Boolean(e.secretNote))
      .map((e) => ({ evaluator: e.evaluatorName, note: e.secretNote! }));

    return {
      playerId: player.id,
      avgPac,
      avgSho,
      avgPas,
      avgDri,
      avgDef,
      avgPhy,
      calculatedOVR,
      votesCount: entries.length,
      gkScore,
      popularPlaystyles: popularPlaystyles.length > 0 ? popularPlaystyles : player.playstyles,
      notes,
    };
  });

  // Handle applying consensus to all 20 players in the system
  const handleApplyConsensus = () => {
    const updated = players.map((p) => {
      const c = consensusList.find((item) => item.playerId === p.id);
      if (!c || c.votesCount === 0) return p;

      return {
        ...p,
        baseOVR: c.calculatedOVR,
        currentOVR: c.calculatedOVR,
        stats: {
          pac: Math.min(99, Math.round(c.avgPac * 10)),
          sho: Math.min(99, Math.round(c.avgSho * 10)),
          pas: Math.min(99, Math.round(c.avgPas * 10)),
          dri: Math.min(99, Math.round(c.avgDri * 10)),
          def: Math.min(99, Math.round(c.avgDef * 10)),
          phy: Math.min(99, Math.round(c.avgPhy * 10)),
        },
        playstyles: c.popularPlaystyles,
      };
    });

    confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
    onApplyConsensusToPlayers(updated);
    alert('🎉 Kurul konsensüsü başarıyla sisteme uygulandı! 20 oyuncu kartının baz puanları güncellendi.');
  };

  // Export to CSV / Google Sheets format
  const handleExportCSV = () => {
    const headers = [
      'Oyuncu Adı',
      'Ana Mevki',
      'Kaleye Geçer mi?',
      'PAC (Tempo)',
      'SHO (Şut)',
      'PAS (Vizyon)',
      'DRI (Teknik)',
      'DEF (Kademe)',
      'PHY (Fizik)',
      'Hesaplanan OVR',
      'Rozet 1',
      'Rozet 2',
      'Kurul Gizli Notları',
    ];

    const rows = players.map((p) => {
      const c = consensusList.find((x) => x.playerId === p.id);
      const gkText = c
        ? c.gkScore.yes > c.gkScore.never
          ? 'Evet'
          : c.gkScore.emergency > 0
          ? 'Acil Durumda'
          : 'Hayır'
        : 'Hayır';

      const badge1 = c?.popularPlaystyles[0] ? PLAYSTYLE_CONFIG[c.popularPlaystyles[0]]?.label : '';
      const badge2 = c?.popularPlaystyles[1] ? PLAYSTYLE_CONFIG[c.popularPlaystyles[1]]?.label : '';
      const notesCombined = c?.notes.map((n) => `[${n.evaluator}]: ${n.note}`).join(' | ') || '';

      return [
        `"${p.name}"`,
        p.position,
        gkText,
        c?.avgPac || Math.round(p.stats.pac / 10),
        c?.avgSho || Math.round(p.stats.sho / 10),
        c?.avgPas || Math.round(p.stats.pas / 10),
        c?.avgDri || Math.round(p.stats.dri / 10),
        c?.avgDef || Math.round(p.stats.def / 10),
        c?.avgPhy || Math.round(p.stats.phy / 10),
        c?.calculatedOVR || p.currentOVR,
        badge1,
        badge2,
        `"${notesCombined}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RevirFC_Kurul_Degerlendirme_Tablosu_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredConsensus = consensusList.filter((item) => {
    const p = players.find((x) => x.id === item.playerId);
    return (
      p?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p?.nickname.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/40 border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase mb-1">
            <FileSpreadsheet className="w-4 h-4" /> Kurul Değerlendirme Tablosu & Konsensus Paneli
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Canlı Kurul Sonuçları & Baz Reyting Kalibrasyonu
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Kurul üyelerinin verdiği puanların ağırlıklı ortalaması, kalecilik istekleri ve gizli kimya notları.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToWizard}
            className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold px-3.5 py-2.5 rounded-xl border border-neutral-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Puanlamaya Dön
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold px-3.5 py-2.5 rounded-xl border border-amber-500/30"
          >
            <Download className="w-3.5 h-3.5" /> E-Tablolar (CSV) İndir
          </button>

          <button
            onClick={handleApplyConsensus}
            className="flex items-center gap-2 text-xs bg-amber-500 hover:bg-amber-400 text-black font-black px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
          >
            <Lock className="w-4 h-4" /> Reytingleri Kilitle ve Sisteme Uygula
          </button>
        </div>
      </div>

      {/* Committee Members Voting Status */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" /> Kurul Üyeleri Katılım Durumu ({allEvaluators.length} Üye Oy Kullandı)
        </h4>
        {allEvaluators.length === 0 ? (
          <p className="text-xs text-neutral-500 italic">
            Henüz kurul değerlendirmesi kaydedilmedi. Puanlama ekranından ilk değerlendirmenizi kaydedebilirsiniz.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {allEvaluators.map((name) => {
              const count = players.filter((p) =>
                savedEntries.some((e) => e.playerId === p.id && e.evaluatorName === name)
              ).length;
              const isDone = count === players.length;

              return (
                <div
                  key={name}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    isDone
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{name}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold">
                    {count}/{players.length} {isDone ? '✓' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Consensus Table matching Gemini's Google Sheets template */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <input
            type="text"
            placeholder="Tabloda oyuncu ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 w-64"
          />
          <span className="text-xs text-neutral-400 font-mono">
            Toplam {filteredConsensus.length} Oyuncu Tabloda
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-950 border-b border-neutral-800 text-[11px] font-bold uppercase text-neutral-400">
                <th className="p-3.5">Oyuncu Adı</th>
                <th className="p-3.5">Ana Mevki</th>
                <th className="p-3.5">Kaleye Geçer mi?</th>
                <th className="p-3.5 text-center text-amber-400">PAC</th>
                <th className="p-3.5 text-center text-amber-400">SHO</th>
                <th className="p-3.5 text-center text-amber-400">PAS</th>
                <th className="p-3.5 text-center text-amber-400">DRI</th>
                <th className="p-3.5 text-center text-amber-400">DEF</th>
                <th className="p-3.5 text-center text-amber-400">PHY</th>
                <th className="p-3.5 text-center font-black text-amber-300">OVR</th>
                <th className="p-3.5">Karakteristik Rozetler</th>
                <th className="p-3.5">Kurul Kimya & Gizli Notları</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredConsensus.map((item) => {
                const player = players.find((p) => p.id === item.playerId);
                if (!player) return null;

                const gkLabel =
                  item.gkScore.yes > 0
                    ? '🧤 Evet'
                    : item.gkScore.emergency > 0
                    ? '⚠️ Acil Durumda'
                    : '🚫 Hayır';

                return (
                  <tr key={item.playerId} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      <img
                        src={player.photoUrl}
                        alt={player.name}
                        className="w-7 h-7 rounded-lg object-cover"
                      />
                      <div>
                        <span>{player.name}</span>
                        <span className="text-[10px] text-neutral-500 block font-mono">
                          #{player.number} • "{player.nickname}"
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {player.position}
                      </span>
                    </td>

                    <td className="p-3.5 text-[11px] font-semibold text-neutral-300">
                      {gkLabel}
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold text-neutral-200">
                      {item.avgPac.toFixed(1)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-neutral-200">
                      {item.avgSho.toFixed(1)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-neutral-200">
                      {item.avgPas.toFixed(1)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-neutral-200">
                      {item.avgDri.toFixed(1)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-neutral-200">
                      {item.avgDef.toFixed(1)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-neutral-200">
                      {item.avgPhy.toFixed(1)}
                    </td>

                    <td className="p-3.5 text-center font-mono font-black text-amber-400 bg-amber-500/10">
                      {item.calculatedOVR}
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {item.popularPlaystyles.map((ps) => {
                          const cfg = PLAYSTYLE_CONFIG[ps];
                          if (!cfg) return <span key={ps}>{ps}</span>;
                          const Icon = cfg.icon;
                          return (
                            <span
                              key={ps}
                              className="text-[10px] bg-neutral-800 border border-neutral-700 text-amber-300 px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                            >
                              <Icon className="w-2.5 h-2.5 shrink-0" />
                              {cfg.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="p-3.5 max-w-[200px] truncate text-[11px] text-neutral-400 italic">
                      {item.notes.length > 0 ? (
                        item.notes.map((n, i) => (
                          <span key={i} title={`${n.evaluator}: ${n.note}`}>
                            "{n.note}"{i < item.notes.length - 1 ? ', ' : ''}
                          </span>
                        ))
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
