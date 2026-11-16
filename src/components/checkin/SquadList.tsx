import React, { useState, useEffect } from 'react';
import { Match, Player, CheckInEntry, PhysicalStatus, PollAttendanceChoice, isFormerPlayer } from '../../types';
import { getMatchLifecycleFlags, MatchLifecycleFlags } from '../../services/matchLifecycle';
import {
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  Bandage,
  Moon,
  Flame,
  Sparkles,
  Trophy,
  Bell,
  Lock,
  ShieldCheck,
  UserPlus,
  CreditCard,
  Calendar,
  Edit3,
  PlusCircle,
  XCircle,
  ExternalLink,
  HelpCircle,
  X,
  Unlock,
  Coffee,
} from 'lucide-react';

export interface PollConfigPayload {
  title: string;
  date: string;
  matchTime: string;
  pitchName: string;
  pitchLocationUrl?: string;
  pitchFee?: string;
  tacticalNotes?: string;
  isPollOpen: boolean;
}

interface Props {
  match: Match;
  pastMatches?: Match[];
  onSelectMatch?: (matchId: string) => void;
  players: Player[];
  claimedPlayer?: Player;
  onOpenCheckIn: (player: Player) => void;
  onJoinPollWithCheckIn?: (
    playerId: string,
    status: PhysicalStatus,
    note?: string,
    attendance?: PollAttendanceChoice,
    canPayPitchFee?: boolean,
    canBringTea?: boolean
  ) => void;
  onCreateNewPoll?: (config: PollConfigPayload) => void;
  onUpdatePollConfig?: (config: PollConfigPayload) => void;
  onSelectPitchFeePayer?: (playerId?: string) => void;
  onSelectTeaBringer?: (playerId?: string) => void;
  onResetMatchPoll?: () => void;
  onRunBalancing: () => void;
  onOpenRating: () => void;
  onFinishMatchAndOpenRating?: () => void;
  onOpenCommittee?: () => void;
  onToggleParticipation: (playerId: string) => void;
  onSwapStarterWithWaitlist?: (
    waitlistPlayerId: string,
    starterToRemoveId: string,
    moveRemovedTo: 'waitlist' | 'absent'
  ) => void;
  onOpenReminderHub?: () => void;
  lifecycleFlags?: MatchLifecycleFlags;
  isPendingUser?: boolean;
  isFormerUser?: boolean;
  isAdmin?: boolean;
}

const QUICK_TIME_SLOTS = ['20:00 - 21:00', '21:00 - 22:00', '22:00 - 23:00', '23:00 - 00:00'];

const PITCH_PRESETS = [
  {
    name: 'Aksaz Lojman Halı Saha',
    url: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
  },
  {
    name: 'Marmaris Lojman Halı Saha',
    url: 'https://maps.app.goo.gl/HA3XFwWrGDL9KdyF7',
  },
] as const;

const DEFAULT_PITCH_FEE = '400 TL';
const DEFAULT_TACTICAL_NOTE = 'Beyler maç saatinden 15 dakika önce sahada olalım lütfen.';

function toLocalDateInputValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildIsoDateTime(dateStr: string, matchTime: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const timeMatch = matchTime.match(/(\d{1,2}):(\d{2})/);
  const hour = timeMatch ? Math.min(23, Math.max(0, Number(timeMatch[1]))) : 21;
  const minute = timeMatch ? Math.min(59, Math.max(0, Number(timeMatch[2]))) : 0;
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, hour, minute, 0).toISOString();
}

function getNextWednesdayInputValue(): string {
  const now = new Date();
  const day = now.getDay(); // 3 = Wednesday
  const diff = (3 - day + 7) % 7 || 7;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return toLocalDateInputValue(target.toISOString());
}

export const SquadList: React.FC<Props> = ({
  match,
  pastMatches = [],
  onSelectMatch,
  players,
  claimedPlayer,
  onOpenCheckIn,
  onJoinPollWithCheckIn,
  onCreateNewPoll,
  onUpdatePollConfig,
  onSelectPitchFeePayer,
  onSelectTeaBringer,
  onRunBalancing,
  onOpenRating,
  onFinishMatchAndOpenRating,
  onOpenCommittee,
  onToggleParticipation,
  onSwapStarterWithWaitlist,
  onOpenReminderHub,
  lifecycleFlags,
  isPendingUser = false,
  isFormerUser = false,
  isAdmin = false,
}) => {
  // Katılım sırasını korumak için ID dizisi sırasına göre eşle (ilk 12 kişi anket sırası!)
  const starterPlayers = match.starters
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));
  const waitlistPlayers = match.waitlist
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const absenteeIds = match.absentees || [];
  const absenteePlayers = absenteeIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const notRespondedPlayers = players.filter(
    (p) =>
      !isFormerPlayer(p) &&
      !match.starters.includes(p.id) &&
      !match.waitlist.includes(p.id) &&
      !absenteeIds.includes(p.id)
  );

  const volunteerIds = Array.from(
    new Set([
      ...(match.pitchFeeVolunteerIds || []),
      ...Object.values(match.checkIns || {})
        .filter((c) => c.canPayPitchFee && c.attendance !== 'no')
        .map((c) => c.playerId),
    ])
  ).filter((id) => match.starters.includes(id) || match.waitlist.includes(id));

  const volunteerPlayers = volunteerIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const activePayerId =
    match.pitchFeePayerId && (match.starters.includes(match.pitchFeePayerId) || match.waitlist.includes(match.pitchFeePayerId))
      ? match.pitchFeePayerId
      : volunteerPlayers[0]?.id;
  const payerPlayer = activePayerId ? players.find((p) => p.id === activePayerId) : undefined;

  const teaVolunteerIds = Array.from(
    new Set([
      ...(match.teaVolunteerIds || []),
      ...Object.values(match.checkIns || {})
        .filter((c) => c.canBringTea && c.attendance !== 'no')
        .map((c) => c.playerId),
    ])
  ).filter((id) => match.starters.includes(id) || match.waitlist.includes(id));

  const teaVolunteerPlayers = teaVolunteerIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const activeTeaBringerId =
    match.teaBringerId && (match.starters.includes(match.teaBringerId) || match.waitlist.includes(match.teaBringerId))
      ? match.teaBringerId
      : teaVolunteerPlayers[0]?.id;
  const teaBringerPlayer = activeTeaBringerId ? players.find((p) => p.id === activeTeaBringerId) : undefined;

  const isUserStarter = claimedPlayer ? match.starters.includes(claimedPlayer.id) : false;
  const isUserWaitlist = claimedPlayer ? match.waitlist.includes(claimedPlayer.id) : false;
  const isUserAbsentee = claimedPlayer ? absenteeIds.includes(claimedPlayer.id) : false;
  const isUserInPoll = isUserStarter || isUserWaitlist;
  const userCheckIn = claimedPlayer ? match.checkIns[claimedPlayer.id] : undefined;

  const [attendanceChoice, setAttendanceChoice] = useState<PollAttendanceChoice>(() =>
    isUserAbsentee || userCheckIn?.attendance === 'no' ? 'no' : 'yes'
  );
  const [pollStatus, setPollStatus] = useState<PhysicalStatus>(() => userCheckIn?.status || 'full');
  const [pollNote, setPollNote] = useState<string>(() => userCheckIn?.note || '');
  const [canPayPitchFee, setCanPayPitchFee] = useState<boolean>(() =>
    Boolean(userCheckIn?.canPayPitchFee || (claimedPlayer && volunteerIds.includes(claimedPlayer.id)))
  );
  const [canBringTea, setCanBringTea] = useState<boolean>(() =>
    Boolean(userCheckIn?.canBringTea || (claimedPlayer && teaVolunteerIds.includes(claimedPlayer.id)))
  );

  // Admin quick add controls
  const [adminAddPlayerId, setAdminAddPlayerId] = useState<string>('');
  const [adminAddStatus, setAdminAddStatus] = useState<PhysicalStatus>('full');
  const [adminAddCanPay, setAdminAddCanPay] = useState<boolean>(false);
  const [adminAddCanTea, setAdminAddCanTea] = useState<boolean>(false);

  // Asil kadro doluyken "Asile Al ↑" takas modalı state'i
  const [swapWaitlistPlayer, setSwapWaitlistPlayer] = useState<Player | null>(null);
  const [swapRemoveStarterId, setSwapRemoveStarterId] = useState<string>('');
  const [swapRemovedDestination, setSwapRemovedDestination] = useState<'waitlist' | 'absent'>('waitlist');

  // Admin Create/Edit Poll Modal State
  const [pollModalMode, setPollModalMode] = useState<'create' | 'edit' | null>(null);
  const [formTitle, setFormTitle] = useState(match.title);
  const [formDate, setFormDate] = useState(() => toLocalDateInputValue(match.date));
  const [formTime, setFormTime] = useState(match.matchTime || '21:00 - 22:00');
  const [formPitchName, setFormPitchName] = useState(match.pitchName || PITCH_PRESETS[0].name);
  const [formLocationUrl, setFormLocationUrl] = useState(match.pitchLocationUrl || PITCH_PRESETS[0].url);
  const [formPitchFee, setFormPitchFee] = useState(match.pitchFee || DEFAULT_PITCH_FEE);
  const [formNotes, setFormNotes] = useState(match.tacticalNotes || DEFAULT_TACTICAL_NOTE);
  const [formIsOpen, setFormIsOpen] = useState<boolean>(match.isPollOpen !== false);

  useEffect(() => {
    setAttendanceChoice(isUserAbsentee || userCheckIn?.attendance === 'no' ? 'no' : 'yes');
    setPollStatus(userCheckIn?.status || 'full');
    setPollNote(userCheckIn?.note || '');
    setCanPayPitchFee(
      Boolean(userCheckIn?.canPayPitchFee || (claimedPlayer && (match.pitchFeeVolunteerIds || []).includes(claimedPlayer.id)))
    );
    setCanBringTea(
      Boolean(userCheckIn?.canBringTea || (claimedPlayer && (match.teaVolunteerIds || []).includes(claimedPlayer.id)))
    );
  }, [
    claimedPlayer?.id,
    isUserAbsentee,
    userCheckIn?.attendance,
    userCheckIn?.status,
    userCheckIn?.note,
    userCheckIn?.canPayPitchFee,
    userCheckIn?.canBringTea,
    match.pitchFeeVolunteerIds,
    match.teaVolunteerIds,
  ]);

  const openPollModal = (mode: 'create' | 'edit') => {
    if (mode === 'create') {
      const nextWeekMatch = match.title.match(/(\d+)\.\s*Hafta/i);
      const nextWeekNum = nextWeekMatch ? Number(nextWeekMatch[1]) + 1 : 15;
      setFormTitle(`${nextWeekNum}. Hafta Geleneksel Çarşamba Derbisi`);
      setFormDate(getNextWednesdayInputValue());
      setFormTime(match.matchTime || '21:00 - 22:00');
      setFormPitchName(PITCH_PRESETS[0].name);
      setFormLocationUrl(PITCH_PRESETS[0].url);
      setFormPitchFee(DEFAULT_PITCH_FEE);
      setFormNotes(DEFAULT_TACTICAL_NOTE);
      setFormIsOpen(true);
    } else {
      setFormTitle(match.title);
      setFormDate(toLocalDateInputValue(match.date));
      setFormTime(match.matchTime || '21:00 - 22:00');
      setFormPitchName(match.pitchName || PITCH_PRESETS[0].name);
      setFormLocationUrl(match.pitchLocationUrl || PITCH_PRESETS[0].url);
      setFormPitchFee(match.pitchFee || DEFAULT_PITCH_FEE);
      setFormNotes(match.tacticalNotes || DEFAULT_TACTICAL_NOTE);
      setFormIsOpen(match.isPollOpen !== false);
    }
    setPollModalMode(mode);
  };

  const handlePollModalSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPitchName.trim()) return;
    const payload: PollConfigPayload = {
      title: formTitle.trim(),
      date: buildIsoDateTime(formDate, formTime),
      matchTime: formTime.trim() || '21:00 - 22:00',
      pitchName: formPitchName.trim(),
      pitchLocationUrl: formLocationUrl.trim() || undefined,
      pitchFee: formPitchFee.trim() || undefined,
      tacticalNotes: formNotes.trim() || undefined,
      isPollOpen: formIsOpen,
    };

    if (pollModalMode === 'create') {
      onCreateNewPoll?.(payload);
    } else if (pollModalMode === 'edit') {
      onUpdatePollConfig?.(payload);
    }
    setPollModalMode(null);
  };

  const handleStartNewWeekPollDirect = () => {
    if (!isAdmin) return;
    const dateIso = new Date(formDate).toISOString();
    const payload: PollConfigPayload = {
      title: formTitle.trim() || '9. Hafta Geleneksel Çarşamba Derbisi',
      date: isNaN(new Date(dateIso).getTime()) ? new Date(Date.now() + 86400000 * 3).toISOString() : dateIso,
      matchTime: formTime.trim() || '21:00 - 22:00',
      pitchName: formPitchName.trim() || 'Aksaz Halısaha',
      pitchFee: formPitchFee.trim() || 'Kişi Başı 150 ₺',
      tacticalNotes: formNotes.trim() || '9. Hafta Maç Anketi açılmıştır. Katılım durumunuzu (Geliyorum / Gelemiyorum), mevki ve sağlık durumunuzu belirtiniz.',
      isPollOpen: true,
    };

    if (onCreateNewPoll) {
      onCreateNewPoll(payload);
    } else if (onUpdatePollConfig) {
      onUpdatePollConfig(payload);
    }
  };

  const flags = lifecycleFlags ?? getMatchLifecycleFlags(match);
  const deadlineDate = flags.timing.ratingDeadlineAt;
  const isPollOpen = match.isPollOpen !== false;
  const canPlayersMutatePoll = flags.canPlayersEditPoll;
  const canCommitteeMutatePoll = isAdmin && flags.canCommitteeManagePoll;
  const canUserMutatePollForm = isAdmin ? canCommitteeMutatePoll : canPlayersMutatePoll;

  const phaseBadge = (() => {
    switch (flags.phase) {
      case 'sealed':
        return {
          cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
          icon: <ShieldCheck className="w-3 h-3" />,
          text: `Mühürlü (${match.awards?.confirmedBy || 'Kurul'})`,
        };
      case 'rating_open':
        return {
          cls: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
          icon: <Trophy className="w-3 h-3" />,
          text: '360° Oylama Açık',
        };
      case 'rating_closed':
        return {
          cls: 'bg-orange-500/15 text-orange-300 border-orange-500/35',
          icon: <Clock className="w-3 h-3" />,
          text: '14:00 Doldu • Mühür Bekleniyor',
        };
      case 'live_match':
        return {
          cls: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
          icon: <Clock className="w-3 h-3" />,
          text: 'Maç Saati • Kadro Kilitli',
        };
      case 'pre_match':
      default:
        return isPollOpen
          ? {
              cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
              icon: <Unlock className="w-3 h-3" />,
              text: 'Katılıma Açık',
            }
          : {
              cls: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
              icon: <Lock className="w-3 h-3" />,
              text: 'Anket Kilitli',
            };
    }
  })();

  const getStatusBadge = (checkIn?: CheckInEntry) => {
    if (!checkIn) {
      return (
        <span className="text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
          Form Durumu Bekliyor
        </span>
      );
    }
    switch (checkIn.status) {
      case 'light_injury':
        return (
          <span className="text-[10px] text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40 flex items-center gap-1 font-bold">
            <Bandage className="w-3 h-3 text-rose-400" /> Revir Raporlu (PAC -%25)
          </span>
        );
      case 'tired':
        return (
          <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1 font-bold">
            <Moon className="w-3 h-3 text-amber-400" /> Yorgun (PAC -%15)
          </span>
        );
      case 'extra_fit':
        return (
          <span className="text-[10px] text-orange-300 bg-orange-950/80 px-2 py-0.5 rounded border border-orange-500/40 flex items-center gap-1 font-bold">
            <Flame className="w-3 h-3 text-orange-400" /> İdmanlı / Formda (+%5)
          </span>
        );
      case 'full':
      default:
        return (
          <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> %100 Hazır
          </span>
        );
    }
  };

  const pollStatusOptions: { id: PhysicalStatus; label: string; badge: string; activeCls: string }[] = [
    { id: 'full', label: '✅ %100 Hazırım', badge: '1.00x', activeCls: 'bg-emerald-500/20 border-emerald-400 text-emerald-200' },
    { id: 'extra_fit', label: '🔥 Ekstra Formda', badge: '+%5', activeCls: 'bg-orange-500/20 border-orange-400 text-orange-200' },
    { id: 'tired', label: '🟠 Yorgun / Nöbet', badge: '-%15', activeCls: 'bg-amber-500/20 border-amber-400 text-amber-200' },
    { id: 'light_injury', label: '🩹 Hafif Sakatlık', badge: '-%25', activeCls: 'bg-rose-500/20 border-rose-400 text-rose-200' },
  ];

  const handlePollSubmit = () => {
    if (!claimedPlayer) return;
    if (onJoinPollWithCheckIn) {
      onJoinPollWithCheckIn(
        claimedPlayer.id,
        attendanceChoice === 'yes' ? pollStatus : 'full',
        pollNote,
        attendanceChoice,
        attendanceChoice === 'yes' ? canPayPitchFee : false,
        attendanceChoice === 'yes' ? canBringTea : false
      );
    } else {
      onOpenCheckIn(claimedPlayer);
    }
  };

  const handleAdminAddPlayer = (forceAbsent = false) => {
    const targetId = adminAddPlayerId || notRespondedPlayers[0]?.id;
    if (!targetId || !onJoinPollWithCheckIn) return;
    if (forceAbsent) {
      onJoinPollWithCheckIn(targetId, 'full', 'Kurul tarafından mazeretli işlendi', 'no', false, false);
    } else {
      onJoinPollWithCheckIn(
        targetId,
        adminAddStatus,
        'Kurul tarafından ankete eklendi',
        'yes',
        adminAddCanPay,
        adminAddCanTea
      );
    }
    setAdminAddPlayerId('');
    setAdminAddCanPay(false);
    setAdminAddCanTea(false);
  };

  const progressPct = Math.min(100, Math.round((starterPlayers.length / 12) * 100));

  return (
    <div className="space-y-5">
      {/* 1. Match & Poll Header Banner */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/30 border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-start gap-3.5 sm:gap-4 w-full min-w-0">
            <img
              src="/logo.jpg"
              alt="Revir FC"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-amber-400/50 shadow-lg shadow-amber-500/20 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] mb-1.5">
                <span className="inline-flex items-center gap-1 font-mono font-bold uppercase text-amber-400">
                  <Clock className="w-3.5 h-3.5" /> Site İçi Haftalık Maç Anketi
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${phaseBadge.cls}`}
                >
                  {phaseBadge.icon}
                  {phaseBadge.text}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800/90 text-neutral-300 border border-neutral-700">
                  👤 Anketi Açan: <strong className="text-amber-300">{match.pollOpenedBy || 'Alper'}</strong>
                </span>
              </div>

              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug break-words">
                {match.title}
              </h2>

              {match.tacticalNotes && (
                <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">{match.tacticalNotes}</p>
              )}


            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => openPollModal('create')}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Yeni Maç Anketi Aç
                </button>
                {!flags.isSealed && (
                  <button
                    type="button"
                    onClick={() => openPollModal('edit')}
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
                    title="Saat, yer, ücret veya notları düzenle"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Saat / Yer / Ücret Düzenle
                  </button>
                )}
                {flags.canEditTactics && (
                  <button
                    type="button"
                    onClick={onRunBalancing}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> 462 Kadro Dengele
                  </button>
                )}
                {flags.canOpenRatingManually && onFinishMatchAndOpenRating && (
                  <button
                    type="button"
                    onClick={onFinishMatchAndOpenRating}
                    className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 font-black text-xs px-3.5 py-2.5 rounded-xl border border-sky-400/45 flex items-center gap-1.5 cursor-pointer"
                    title="Maç saatini beklemeden kadroyu kilitleyip 360° oylamayı başlat"
                  >
                    <CheckCircle2 className="w-4 h-4 text-sky-300" /> 🏁 Maçı Bitir / 360° Aç
                  </button>
                )}
              </>
            )}

            {(() => {
              const isStarterInMatch = !isPendingUser && !isFormerUser && Boolean(claimedPlayer && match.starters.includes(claimedPlayer.id));
              const canVoteNow = isStarterInMatch && flags.canVote360;
              const disabledReason = !isStarterInMatch
                ? 'Sadece bu maçın ilk 12 asil kadrosunda oynayanlar 360° oylamaya katılabilir'
                : flags.phase === 'pre_match' || flags.phase === 'live_match'
                ? 'Maç bitince 360° Form Anketi açılacaktır'
                : flags.phase === 'rating_closed'
                ? 'Oylama penceresi (Ertesi Gün 14:00) kapandı'
                : 'Bu maç Kurul tarafından mühürlendi';
              return (
                <button
                  type="button"
                  disabled={!canVoteNow}
                  onClick={onOpenRating}
                  title={canVoteNow ? 'Maç Sonu 360° Form Anketini Aç' : disabledReason}
                  className={`font-bold text-xs px-3.5 py-2.5 rounded-xl border flex items-center gap-1.5 ${
                    canVoteNow
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-amber-500/30 cursor-pointer'
                      : 'bg-neutral-900 text-neutral-500 border-neutral-800 cursor-not-allowed opacity-70'
                  }`}
                >
                  {canVoteNow ? <Trophy className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                  {flags.phase === 'pre_match' || flags.phase === 'live_match'
                    ? '360° (Maç Sonu Açılır)'
                    : flags.phase === 'sealed'
                    ? '360° (Mühürlü)'
                    : flags.phase === 'rating_closed'
                    ? '360° (Süre Doldu)'
                    : '360° Form Anketi'}
                </button>
              );
            })()}

            {isAdmin && onOpenCommittee && (
              <button
                type="button"
                disabled={!flags.canSealAwards}
                onClick={onOpenCommittee}
                title={
                  flags.canSealAwards
                    ? 'Oylama sandığı sonuçlarını incele ve Kurul Mührü bas / güncelle'
                    : 'Maç bitip 360° oylama açıldıktan sonra mühür basılabilir'
                }
                className={`font-black text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-transform ${
                  flags.canSealAwards
                    ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer'
                    : 'bg-neutral-900 text-neutral-500 border border-neutral-800 cursor-not-allowed opacity-70'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{match.awards?.isConfirmedByCommittee ? '🔏 Mührü Düzenle' : '🔏 Kurul Mührü'}</span>
                {match.awards?.isConfirmedByCommittee && (
                  <span className="bg-black/30 text-black text-[9px] px-1.5 py-0.5 rounded-full font-black">
                    {match.awards.confirmedBy || 'MÜHÜRLÜ'}
                  </span>
                )}
              </button>
            )}

            {onOpenReminderHub && (
              <button
                type="button"
                onClick={onOpenReminderHub}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
                title="Eksik bildirimlere hatırlatma gönder"
              >
                <Bell className="w-4 h-4 text-amber-400" /> Hatırlatıcı
              </button>
            )}
          </div>
        </div>

        {/* 4 Structured Info Cards: Tarih, Saat, Yer, Saha Ücreti */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-black/40 border border-neutral-800 rounded-2xl px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-neutral-400 uppercase block">Maç Günü</span>
              <span className="text-xs font-black text-white truncate block">
                {new Date(match.date).toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-2xl px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-neutral-400 uppercase block">Saat</span>
              <span className="text-xs font-black text-white font-mono truncate block">
                {match.matchTime || '21:00 - 22:00'}
              </span>
            </div>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-2xl px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase block">Yer / Halı Saha</span>
              <span className="text-xs font-black text-white truncate block" title={match.pitchName}>
                {match.pitchName}
              </span>
              {match.pitchLocationUrl && (
                match.pitchLocationUrl.startsWith('http') ? (
                  <a
                    href={match.pitchLocationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:underline mt-0.5"
                  >
                    Konumu Aç <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-neutral-400 truncate block">{match.pitchLocationUrl}</span>
                )
              )}
            </div>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-2xl px-3.5 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-neutral-400 uppercase block">Halı Saha Ücreti</span>
              <span className="text-xs font-black text-white truncate block">
                {match.pitchFee || 'Belirtilmedi'}
                {payerPlayer && (
                  <span className="text-[10px] text-emerald-300 font-bold ml-1.5">
                    • Ödeyen: {payerPlayer.name}
                  </span>
                )}
                {teaBringerPlayer && (
                  <span className="text-[10px] text-amber-300 font-bold ml-1.5">
                    • 🫖 Çay: {teaBringerPlayer.name}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Operating Rule & Voting Window */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
          <div className="bg-black/35 border border-emerald-500/25 rounded-xl px-3 py-2 text-neutral-300">
            <strong className="text-emerald-300 block mb-0.5">📋 Tek Adımda Anket + Form + Saha Ödemesi + Çay:</strong>
            Katılım durumunu ve sahadaki formunu seç; dilersen <strong>&quot;Ücreti ben ödeyebilirim&quot;</strong> veya <strong>&quot;Termosla çay getirebilirim&quot;</strong> işaretle. İlk{' '}
            <strong>12 kişi asil</strong>, <strong>13+ yedek</strong> sırasına otomatik yazılır.
          </div>
          <div className="bg-black/35 border border-sky-500/25 rounded-xl px-3 py-2 text-neutral-300">
            <strong className="text-sky-300 block mb-0.5">⏳ Ertesi Gün 14:00 Oylama Penceresi:</strong>
            Maç sonu 360° oylaması{' '}
            <strong className="text-white">
              {deadlineDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} 14:00
            </strong>
            &apos;a kadar sürer; ardından Kurul Mührü ile haftalık kartlar kesinleşir.
          </div>
        </div>
      </div>

      {!isPollOpen && match.starters.length === 0 && flags.phase === 'pre_match' ? (
        isAdmin ? (
          <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/40 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3.5 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">⭐ Yeni Maç Anketi Hazırla (9. Hafta)</h3>
                <p className="text-xs text-neutral-300">
                  Kurul yöneticisi olarak 9. Hafta maç anketinin detaylarını belirleyin ve katılıma açın.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Maç Başlığı</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="9. Hafta Geleneksel Çarşamba Derbisi"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Halı Saha & Konum</label>
                <input
                  type="text"
                  value={formPitchName}
                  onChange={(e) => setFormPitchName(e.target.value)}
                  placeholder="Aksaz Halısaha"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Tarih & Saat</label>
                <input
                  type="datetime-local"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Kişi Başı Saha Ücreti</label>
                <input
                  type="text"
                  value={formPitchFee}
                  onChange={(e) => setFormPitchFee(e.target.value)}
                  placeholder="Kişi Başı 150 ₺"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Taktik & Duyuru Notu</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder="Maç öncesi duyuru ve notları buraya yazın..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleStartNewWeekPollDirect}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm py-3.5 rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Unlock className="w-5 h-5 text-black" />
              <span>🚀 9. Hafta Maç Anketini Başlat &amp; Yayına Al</span>
            </button>
          </div>
        ) : (
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 sm:p-12 text-center shadow-2xl max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">9. Hafta Maç Anketi Henüz Açılmadı</h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Kurul üyeleri tarafından yeni haftanın maç anketi hazırlandığında burada katılım seçeneği (Geliyorum / Gelemiyorum), mevki tercihleri ve anlık form bildirimleri aktif olacaktır.
            </p>
            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl text-xs text-neutral-400 text-left space-y-1.5">
              <div className="font-bold text-amber-400">💡 Bilgilendirme:</div>
              <div>• Geçmiş 8 haftanın oynanan maç kadrolarını ve kazanan takımlarını üst menüdeki <strong className="text-white">Taktik Tahtası</strong> sekmesinden inceleyebilirsiniz.</div>
              <div>• WhatsApp grubundan taşınan tarihi anıları ve fotoğrafları <strong className="text-white">Soyunma Odası</strong> bölümünden takip edebilirsiniz.</div>
            </div>
          </div>
        )
      ) : (
        <>
          {/* 2. Pitch Fee Payer Card + Live Poll Counters */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pitch Fee Payer Management & Volunteer Board */}
        <div className="lg:col-span-6 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Bu Hafta Halı Saha Ücreti Ödeyicisi</span>
            </h3>
            {match.pitchFee && (
              <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-700 text-amber-300">
                {match.pitchFee}
              </span>
            )}
          </div>

          {payerPlayer ? (
            <div className="flex items-center justify-between gap-3 bg-emerald-950/35 border border-emerald-500/40 rounded-xl p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={payerPlayer.photoUrl}
                  alt={payerPlayer.name}
                  className="w-9 h-9 rounded-xl object-cover border border-emerald-400/50 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                    Bu Hafta Saha Ücretini Ödeyecek
                  </span>
                  <span className="text-sm font-black text-white truncate block">{payerPlayer.name}</span>
                </div>
              </div>
              {isAdmin && onSelectPitchFeePayer && (
                <button
                  type="button"
                  onClick={() => onSelectPitchFeePayer(undefined)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 cursor-pointer shrink-0"
                >
                  Kaldır
                </button>
              )}
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between gap-2">
              <span>Bu hafta halı saha ücretini ödeyecek gönüllü henüz seçilmedi.</span>
            </div>
          )}

          {/* Volunteer chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>💳 &quot;Bu hafta ben ödeyebilirim&quot; diyenler ({volunteerPlayers.length}):</span>
              {!isAdmin && volunteerPlayers.length === 0 && (
                <span className="text-[10px] text-neutral-500">Anketten işaretleyebilirsin</span>
              )}
            </div>

            {volunteerPlayers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {volunteerPlayers.map((vp) => {
                  const isAssigned = payerPlayer?.id === vp.id;
                  return (
                    <button
                      key={vp.id}
                      type="button"
                      disabled={!isAdmin || !onSelectPitchFeePayer}
                      onClick={() => isAdmin && onSelectPitchFeePayer?.(vp.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                        isAssigned
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                          : isAdmin
                          ? 'bg-neutral-950 text-neutral-200 border-neutral-700 hover:border-emerald-400/60 cursor-pointer'
                          : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                      }`}
                      title={isAdmin ? `${vp.name} bu haftanın resmi ödeyicisi yap` : undefined}
                    >
                      <span>{vp.name}</span>
                      {isAssigned ? <span className="text-[10px]">✓ Seçili</span> : isAdmin ? <span className="text-[10px] text-emerald-400">Seç</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              isAdmin &&
              onSelectPitchFeePayer &&
              starterPlayers.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={activePayerId || ''}
                    onChange={(e) => onSelectPitchFeePayer(e.target.value || undefined)}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200"
                  >
                    <option value="">Manuel ödeyici seç (isteğe bağlı)...</option>
                    {starterPlayers.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}
          </div>

          {/* Termosla Çay Gönüllüsü Bölümü */}
          <div className="pt-3 border-t border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Bu Hafta Termosla Çay Getiren</span>
              </h4>
              {teaBringerPlayer && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35">
                  🫖 {teaBringerPlayer.name}
                </span>
              )}
            </div>

            {teaVolunteerPlayers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {teaVolunteerPlayers.map((tvp) => {
                  const isAssigned = teaBringerPlayer?.id === tvp.id;
                  return (
                    <button
                      key={tvp.id}
                      type="button"
                      disabled={!isAdmin || !onSelectTeaBringer}
                      onClick={() => isAdmin && onSelectTeaBringer?.(isAssigned ? undefined : tvp.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                        isAssigned
                          ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                          : isAdmin
                          ? 'bg-neutral-950 text-neutral-200 border-neutral-700 hover:border-amber-400/60 cursor-pointer'
                          : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                      }`}
                    >
                      <span>🫖 {tvp.name}</span>
                      {isAssigned ? <span className="text-[10px]">✓ Seçili</span> : isAdmin ? <span className="text-[10px] text-amber-400">Seç</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
                <span>&quot;Termosla çayı ben getirebilirim&quot; işaretleyenler burada görünür.</span>
                {isAdmin && onSelectTeaBringer && starterPlayers.length > 0 && (
                  <select
                    value={activeTeaBringerId || ''}
                    onChange={(e) => onSelectTeaBringer(e.target.value || undefined)}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200"
                  >
                    <option value="">Manuel çaycı seç...</option>
                    {starterPlayers.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Poll Summary Bar */}
        <div className="lg:col-span-6 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Canlı Anket Özeti</span>
            </h3>
            <span className="text-[11px] font-mono font-bold text-neutral-400">
              {starterPlayers.length >= 12 ? '✅ 12 Kişi Tamamlandı!' : `${12 - starterPlayers.length} boş asil yer`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-emerald-950/35 border border-emerald-500/30 rounded-xl p-2.5 text-center">
              <span className="text-lg font-black text-emerald-300 font-mono block leading-none">
                {starterPlayers.length}/12
              </span>
              <span className="text-[10px] font-bold text-neutral-300 mt-1 block">✅ Asil Kadro</span>
            </div>
            <div className="bg-amber-950/35 border border-amber-500/30 rounded-xl p-2.5 text-center">
              <span className="text-lg font-black text-amber-300 font-mono block leading-none">
                {waitlistPlayers.length}
              </span>
              <span className="text-[10px] font-bold text-neutral-300 mt-1 block">⏳ Yedek</span>
            </div>
            <div className="bg-rose-950/35 border border-rose-500/30 rounded-xl p-2.5 text-center">
              <span className="text-lg font-black text-rose-300 font-mono block leading-none">
                {absenteePlayers.length}
              </span>
              <span className="text-[10px] font-bold text-neutral-300 mt-1 block">❌ Gelemeyecek</span>
            </div>
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-2.5 text-center">
              <span className="text-lg font-black text-neutral-300 font-mono block leading-none">
                {notRespondedPlayers.length}
              </span>
              <span className="text-[10px] font-bold text-neutral-400 mt-1 block">❔ Beklenen</span>
            </div>
          </div>

          {/* 12-person fill bar */}
          <div className="space-y-1">
            <div className="h-2.5 w-full rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  starterPlayers.length >= 12
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
              <span>Kadro Doluluk Oranı</span>
              <span>%{progressPct}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Weekly Attendance Poll + Form Status + Pitch Fee Card */}
      {isPendingUser ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-200 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Hesabınız seyirci / onay aşamasında. Giriş yapıp onaylandığınızda haftalık maç anketine oy verebilirsiniz.</span>
        </div>
      ) : isFormerUser ? (
        <div className="bg-stone-900/90 border border-stone-700/60 rounded-2xl p-4 text-stone-300 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-400/80 shrink-0" />
          <span>
            <strong className="text-amber-200">📜 Mazide Kalanlar (Onursal Üye):</strong> Maç kadrolarını, taktik tahtasını ve kulüp geçmişini inceleyebilirsin; haftalık maç anketi ve saha içi oylamalar yalnızca aktif kadro üyelerine açıktır.
          </span>
        </div>
      ) : claimedPlayer ? (
        <div className="bg-neutral-900/95 border border-amber-500/35 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex flex-wrap items-center gap-2">
                <span>🗳️ Anket Katılımın & Form Durumun ({claimedPlayer.name})</span>
                {isUserStarter && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Asil #{match.starters.indexOf(claimedPlayer.id) + 1}
                  </span>
                )}
                {isUserWaitlist && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Yedek #{match.waitlist.indexOf(claimedPlayer.id) + 1}
                  </span>
                )}
                {isUserAbsentee && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Gelemeyecek (Mazeretli)
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Saat, yer ve kadro durumuna göre katılım kararını, fiziksel formunu ve saha ücreti gönüllülüğünü buradan işaretle.
              </p>
            </div>
          </div>

          {!canUserMutatePollForm ? (
            <div className={`rounded-xl p-3.5 text-xs flex items-center gap-2.5 border ${
              flags.isSealed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}>
              {flags.isSealed ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>
                {flags.phase === 'sealed'
                  ? `Bu haftanın maçı ${match.awards?.confirmedBy || 'Kurul'} tarafından mühürlendi! Yeni hafta anketi açıldığında katılım tekrar başlayacaktır.`
                  : flags.phase === 'rating_open'
                  ? 'Maç tamamlandığı için anket ve kadro değişikliği kapatılmıştır. İlk 12 oyuncusu 360° Form Anketi üzerinden oylama yapabilir.'
                  : flags.phase === 'rating_closed'
                  ? 'Maç tamamlandı ve 14:00 oylama süresi doldu. Kurul Mührü ve yeni hafta anketi bekleniyor.'
                  : flags.phase === 'live_match'
                  ? 'Maç saati başladığı için katılım anketi otomatik kilitlenmiştir.'
                  : 'Bu haftanın maç anketi Kurul / Yönetici tarafından kilitlenmiştir. Değişiklik için Yönetici/Kurul ile iletişime geçin.'}
              </span>
            </div>
          ) : (
            <>
              {/* Step A: Attendance Choice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAttendanceChoice('yes')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    attendanceChoice === 'yes'
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-100 ring-1 ring-emerald-400/50'
                      : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 shrink-0 ${attendanceChoice === 'yes' ? 'text-emerald-400' : 'text-neutral-500'}`} />
                  <div>
                    <span className="text-xs font-black block">✋ Maça Geliyorum</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">
                      {starterPlayers.length < 12 || isUserStarter
                        ? '12 kişilik asil kadroya katıl + formunu seç'
                        : `12 asil doldu • Yedek #${waitlistPlayers.length + 1} sırasına yazıl`}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceChoice('no')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    attendanceChoice === 'no'
                      ? 'bg-rose-500/15 border-rose-400 text-rose-100 ring-1 ring-rose-400/50'
                      : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <XCircle className={`w-5 h-5 shrink-0 ${attendanceChoice === 'no' ? 'text-rose-400' : 'text-neutral-500'}`} />
                  <div>
                    <span className="text-xs font-black block">❌ Bu Hafta Gelemeyeceğim</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">
                      Kadroda yer açılır (asildeysen 1. yedek otomatik asile çıkar)
                    </span>
                  </div>
                </button>
              </div>

              {/* Step B & C: Form Status + Pitch Fee Volunteer (shown when coming) */}
              {attendanceChoice === 'yes' && (
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                      Fiziksel Form & Sakatlık Durumun
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {pollStatusOptions.map((opt) => {
                        const selected = pollStatus === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPollStatus(opt.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              selected
                                ? `${opt.activeCls} ring-1 ring-white/40 font-black`
                                : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <div className="text-xs font-bold">{opt.label}</div>
                            <div className="text-[10px] font-mono opacity-80 mt-0.5">Algoritma: {opt.badge}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step C: Weekly Pitch Fee Volunteer Checkbox */}
                  <button
                    type="button"
                    onClick={() => setCanPayPitchFee((v) => !v)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      canPayPitchFee
                        ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-100 ring-1 ring-emerald-400/40'
                        : 'bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${canPayPitchFee ? 'bg-emerald-500/25 text-emerald-300' : 'bg-neutral-900 text-neutral-400'}`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black block">
                          💳 Bu hafta halı saha ücretini ben ödeyebilirim
                        </span>
                        <span className="text-[11px] text-neutral-400 block mt-0.5">
                          İşaretlersen haftanın halı saha ödeme gönüllüsü olarak listeye ekleneceksin
                          {match.pitchFee ? ` (${match.pitchFee})` : ''}
                        </span>
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

                  {/* Step C2: Weekly Tea Thermos Volunteer Checkbox */}
                  <button
                    type="button"
                    onClick={() => setCanBringTea((v) => !v)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      canBringTea
                        ? 'bg-amber-500/15 border-amber-400/60 text-amber-100 ring-1 ring-amber-400/40'
                        : 'bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${canBringTea ? 'bg-amber-500/25 text-amber-300' : 'bg-neutral-900 text-neutral-400'}`}>
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black block">
                          🫖 Bu hafta termosla çayı ben getirebilirim
                        </span>
                        <span className="text-[11px] text-neutral-400 block mt-0.5">
                          Maç sonu saha kenarı çay gönüllüleri listesine adını ekle
                        </span>
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
                </div>
              )}

              {/* Step D: Note + Submit */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={pollNote}
                  onChange={(e) => setPollNote(e.target.value)}
                  placeholder={
                    attendanceChoice === 'no'
                      ? 'Mazeret notu (örn: Nöbetteyim / Şehir dışındayım)...'
                      : 'İsteğe bağlı not (örn: İş çıkışı geliyorum / Arka adale hafif çekiyor)...'
                  }
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handlePollSubmit}
                  className={`font-black text-xs px-5 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${
                    attendanceChoice === 'no'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                  }`}
                >
                  {attendanceChoice === 'no'
                    ? isUserAbsentee
                      ? '✅ Mazeretimi Güncelle'
                      : '❌ Gelemeyeceğim Olarak Kaydet'
                    : isUserInPoll
                    ? '✅ Tercihimi & Formumu Güncelle'
                    : starterPlayers.length < 12
                    ? `✋ Geliyorum! ${starterPlayers.length + 1}. Asil Olarak Katıl`
                    : `⏳ Geliyorum! Yedek #${waitlistPlayers.length + 1} Olarak Katıl`}
                </button>
              </div>
            </>
          )}

          {/* Yönetici / Kurul Üyesi için başka oyuncu adına ankete ekleme */}
          {canCommitteeMutatePoll && notRespondedPlayers.length > 0 && onJoinPollWithCheckIn && (
            <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" /> Kurul / Yönetici Hızlı İşleme:
              </span>
              <select
                value={adminAddPlayerId || notRespondedPlayers[0]?.id || ''}
                onChange={(e) => setAdminAddPlayerId(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                {notRespondedPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.number} • {p.position})
                  </option>
                ))}
              </select>
              <select
                value={adminAddStatus}
                onChange={(e) => setAdminAddStatus(e.target.value as PhysicalStatus)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="full">%100 Hazır</option>
                <option value="extra_fit">Ekstra Formda</option>
                <option value="tired">Yorgun</option>
                <option value="light_injury">Hafif Sakat (Revir)</option>
              </select>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminAddCanPay}
                  onChange={(e) => setAdminAddCanPay(e.target.checked)}
                  className="accent-emerald-500"
                />
                💳 Ödeyebilir
              </label>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminAddCanTea}
                  onChange={(e) => setAdminAddCanTea(e.target.checked)}
                  className="accent-amber-500"
                />
                🫖 Çay Getirebilir
              </label>
              <button
                type="button"
                onClick={() => handleAdminAddPlayer(false)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer"
              >
                + Geliyor ({starterPlayers.length < 12 ? 'Asil' : 'Yedek'})
              </button>
              <button
                type="button"
                onClick={() => handleAdminAddPlayer(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
              >
                ✕ Gelemeyecek
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* 4. Grid: 12 Starters vs Waitlist / Absentees / Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* First 12 Starters (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-400" /> İlk 12 Kişilik Asil Kadro ({starterPlayers.length}/12)
            </h3>
            <span className="text-xs text-neutral-400">
              {starterPlayers.length >= 12 ? 'Kadro Doldu! 13+ Yedeklere Yazılır.' : `${12 - starterPlayers.length} kişilik boş yer var`}
            </span>
          </div>

          {starterPlayers.length === 0 ? (
            <div className="p-8 bg-neutral-900/70 border border-dashed border-neutral-700 rounded-2xl text-center space-y-2">
              <p className="text-sm font-bold text-neutral-300">Henüz asil kadroya katılan olmadı.</p>
              <p className="text-xs text-neutral-500">
                Yukarıdaki anketten ilk katılan 12 oyuncu otomatik olarak asil kadroya yazılır.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {starterPlayers.map((player, index) => {
                const checkIn = match.checkIns[player.id];
                const isOfficialPayer = payerPlayer?.id === player.id;
                const isFeeVolunteer = Boolean(checkIn?.canPayPitchFee || volunteerIds.includes(player.id));
                const isOfficialTea = teaBringerPlayer?.id === player.id;
                const isTeaVolunteer = Boolean(checkIn?.canBringTea || teaVolunteerIds.includes(player.id));

                return (
                  <div
                    key={player.id}
                    className={`p-3.5 bg-neutral-900/90 border rounded-2xl flex items-start justify-between gap-2 hover:border-neutral-700 transition-all group ${
                      isOfficialPayer ? 'border-emerald-500/45 shadow-md shadow-emerald-500/5' : 'border-neutral-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-neutral-500 w-4 mt-2.5 shrink-0">
                        {index + 1}.
                      </span>
                      <img
                        src={player.photoUrl}
                        alt={player.name}
                        className="w-11 h-11 rounded-xl object-cover border border-white/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">{player.name}</span>
                          <span className="text-[11px] font-mono font-bold text-amber-400">
                            {player.currentOVR}
                          </span>
                          {isOfficialPayer ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              💳 Ödeyecek
                            </span>
                          ) : isFeeVolunteer ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              💳 Ödeyebilir
                            </span>
                          ) : null}
                          {isOfficialTea ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              🫖 Çayı Getirecek
                            </span>
                          ) : isTeaVolunteer ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-200 border border-amber-500/25">
                              🫖 Çay Gönüllüsü
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1">{getStatusBadge(checkIn)}</div>
                        {checkIn?.note && (
                          <p className="text-[10px] text-neutral-400 mt-1 line-clamp-1 italic">&quot;{checkIn.note}&quot;</p>
                        )}
                      </div>
                    </div>

                    {((claimedPlayer && claimedPlayer.id === player.id && canPlayersMutatePoll) || canCommitteeMutatePoll) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenCheckIn(player)}
                          title="Form, Sağlık & Ödeme Durumunu Değiştir"
                          className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Bandage className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleParticipation(player.id)}
                          title="Sakatlandım / Çıkıyorum (1. Yedek otomatik asil kadroya girer)"
                          className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Waitlist + Absentees + Not Responded (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Waitlist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-amber-400" /> Akıllı Yedek Kulübesi ({waitlistPlayers.length})
              </h3>
              <span className="text-[10px] text-neutral-400">13. ve Sonrası</span>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-2.5">
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Asil kadrodan biri çekilirse 1. sıradaki yedek otomatik asile çıkar ve takımlar yeniden dengelenir.
              </p>

              {waitlistPlayers.length === 0 ? (
                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 text-center text-xs text-neutral-500">
                  Şu an yedek sırasında kimse yok.
                </div>
              ) : (
                waitlistPlayers.map((player, idx) => (
                  <div
                    key={player.id}
                    className="p-2.5 bg-neutral-950/90 rounded-xl border border-neutral-800 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-amber-400 font-bold font-mono shrink-0">#{idx + 1}</span>
                      <img
                        src={player.photoUrl}
                        alt={player.name}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-white truncate block">{player.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {player.position} • OVR {player.currentOVR}
                        </span>
                      </div>
                    </div>
                    {canCommitteeMutatePoll && (
                      <button
                        type="button"
                        onClick={() => {
                          if (starterPlayers.length < 12) {
                            onToggleParticipation(player.id);
                          } else {
                            setSwapWaitlistPlayer(player);
                            setSwapRemoveStarterId(starterPlayers[starterPlayers.length - 1]?.id || '');
                            setSwapRemovedDestination('waitlist');
                          }
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer shrink-0"
                      >
                        Asile Al ↑
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Absentees ("Bu hafta gelemeyeceğim") */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
                <XCircle className="w-4 h-4 text-rose-400" /> Gelemeyecekler ({absenteePlayers.length})
              </h3>
            </div>
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-2">
              {absenteePlayers.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-2">Mazeret bildiren olmadı.</p>
              ) : (
                absenteePlayers.map((player) => {
                  const note = match.checkIns[player.id]?.note;
                  return (
                    <div
                      key={player.id}
                      className="p-2.5 bg-neutral-950/80 rounded-xl border border-rose-500/25 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-7 h-7 rounded-lg object-cover opacity-75 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-neutral-200 block truncate">{player.name}</span>
                          {note && <span className="text-[10px] text-rose-300/80 truncate block">{note}</span>}
                        </div>
                      </div>
                      {canCommitteeMutatePoll && onJoinPollWithCheckIn && (
                        <button
                          type="button"
                          onClick={() => onJoinPollWithCheckIn(player.id, 'full', 'Kurul tarafından eklendi', 'yes', false)}
                          className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 shrink-0 cursor-pointer"
                        >
                          Kadroyu Al
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Not Responded Players */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-neutral-400" /> Henüz Oy Vermeyenler ({notRespondedPlayers.length})
              </h3>
            </div>
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5">
              {notRespondedPlayers.length === 0 ? (
                <p className="text-xs text-emerald-400 font-semibold text-center py-2">
                  🎉 Tüm kadro ankete yanıt verdi!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {notRespondedPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="inline-flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-xl text-[11px]"
                    >
                      <span className="font-semibold text-neutral-300">{p.name}</span>
                      {canCommitteeMutatePoll && onJoinPollWithCheckIn && (
                        <>
                          <button
                            type="button"
                            onClick={() => onJoinPollWithCheckIn(p.id, 'full', undefined, 'yes', false)}
                            title={`${p.name} için Geliyor ekle`}
                            className="text-emerald-400 hover:text-emerald-300 font-black cursor-pointer ml-0.5"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => onJoinPollWithCheckIn(p.id, 'full', undefined, 'no', false)}
                            title={`${p.name} için Gelemeyecek işaretle`}
                            className="text-rose-400 hover:text-rose-300 font-black cursor-pointer"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* 5. Admin / Committee Create or Edit Match Poll Modal */}
      {pollModalMode && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700/90 rounded-3xl max-w-lg w-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[88dvh] flex flex-col p-4 sm:p-5 text-white shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  {pollModalMode === 'create' ? (
                    <>
                      <PlusCircle className="w-5 h-5 text-amber-400 shrink-0" /> Yeni Hafta Maç Anketi Aç
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-5 h-5 text-amber-400 shrink-0" /> Maç Anketi Bilgilerini Düzenle
                    </>
                  )}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {pollModalMode === 'create'
                    ? 'Önceki haftanın kadrosu sıfırlanır ve Soyunma Odasına otomatik yeni anket duyurusu düşer.'
                    : 'Mevcut katılımcılar korunarak tarih, saat, halı saha ve ücret bilgileri güncellenir.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPollModalMode(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePollModalSave} className="flex-1 min-h-0 flex flex-col overflow-hidden text-xs">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 space-y-3">
              <div>
                <label className="block font-bold text-neutral-300 mb-1">Maç Başlığı / Hafta</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Örn: 15. Hafta Geleneksel Çarşamba Derbisi"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Maç Tarihi</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Maç Saati</label>
                  <input
                    type="text"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="21:00 - 22:00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {QUICK_TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setFormTime(slot)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono border cursor-pointer ${
                          formTime === slot
                            ? 'bg-amber-500 text-black border-amber-400 font-bold'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">Yer / Halı Saha Adı</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PITCH_PRESETS.map((preset) => {
                    const isPresetActive = formPitchName.trim() === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setFormPitchName(preset.name);
                          setFormLocationUrl(preset.url);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          isPresetActive
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                            : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-emerald-500/50'
                        }`}
                      >
                        📍 {preset.name}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  required
                  value={formPitchName}
                  onChange={(e) => setFormPitchName(e.target.value)}
                  placeholder="Örn: Aksaz Lojman Halı Saha"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Halı Saha Ücreti (Opsiyonel)</label>
                  <input
                    type="text"
                    value={formPitchFee}
                    onChange={(e) => setFormPitchFee(e.target.value)}
                    placeholder="Örn: 400 TL"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Konum Linki veya Adres Notu</label>
                  <input
                    type="text"
                    value={formLocationUrl}
                    onChange={(e) => setFormLocationUrl(e.target.value)}
                    placeholder="https://maps.google.com/... veya adres"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">Maç & Anket Notu</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Saat, saha veya ödeme hakkında not..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                <div>
                  <span className="font-bold text-white block">Anket Katılıma Açık</span>
                  <span className="text-[10px] text-neutral-400">
                    Kapatılırsa standart oyuncular anket oylarını değiştiremez
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsOpen}
                  onChange={(e) => setFormIsOpen(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
              </label>
              </div>

              <div className="shrink-0 flex items-center justify-end gap-2.5 pt-3 mt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setPollModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {pollModalMode === 'create' ? '📢 Anketi Aç & Duyur' : '💾 Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Asil Kadro Doluyken "Asile Al ↑" Takas Modalı */}
      {swapWaitlistPlayer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-black text-emerald-300">
                  🔄 İlk 12 Dolu: Kadro Değişimi
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  <strong className="text-white">{swapWaitlistPlayer.name}</strong> oyuncusunu asile almak için ilk 12&apos;den bir oyuncuyu seçin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSwapWaitlistPlayer(null)}
                className="text-neutral-400 hover:text-white bg-neutral-800 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  İlk 12&apos;den Çıkarılacak Oyuncu:
                </label>
                <select
                  value={swapRemoveStarterId}
                  onChange={(e) => setSwapRemoveStarterId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  {starterPlayers.map((sp, idx) => (
                    <option key={sp.id} value={sp.id}>
                      {idx + 1}. {sp.name} ({sp.position} • OVR {sp.currentOVR})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Çıkarılan Oyuncu Nereye Alınsın?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSwapRemovedDestination('waitlist')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                      swapRemovedDestination === 'waitlist'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    ⏳ 1. Yedek Sırasına
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwapRemovedDestination('absent')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                      swapRemovedDestination === 'absent'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    ❌ Gelemeyeceklere
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setSwapWaitlistPlayer(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!swapRemoveStarterId) return;
                  onSwapStarterWithWaitlist?.(
                    swapWaitlistPlayer.id,
                    swapRemoveStarterId,
                    swapRemovedDestination
                  );
                  setSwapWaitlistPlayer(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black cursor-pointer"
              >
                ✅ Değiştir &amp; Asile Al
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
