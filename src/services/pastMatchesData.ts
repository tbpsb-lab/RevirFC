import { Match, MatchSquad, Player, PreferredPosition, TacticalFormation, CheckInEntry } from '../types';
import { run462BalancingAlgorithm, computeEffectivePlayer } from './balancingEngine';

/**
 * 6v6 Halı saha kadrosu oluşturma yardımcısı
 */
export function buildPastSquad(
  name: string,
  color: 'green' | 'white',
  assignments: { playerId: string; role: PreferredPosition }[],
  allPlayers: Player[],
  checkIns: Record<string, CheckInEntry> = {},
  formation?: TacticalFormation
): MatchSquad {
  const pMap = new Map(allPlayers.map((p) => [p.id, p]));
  const players = assignments.map(({ playerId, role }) => {
    const player = pMap.get(playerId) || {
      id: playerId,
      name: playerId,
      nickname: '',
      position: role,
      number: 0,
      photoUrl: '/logo.jpg',
      baseOVR: 75,
      currentOVR: 75,
      stats: { pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 },
      playstyles: [],
      theme: 'gold' as const,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      assists: 0,
      egoIndex: 0,
      formTrend: 'stable' as const,
    };
    const eff = computeEffectivePlayer(player, checkIns[playerId]);
    return {
      player,
      position: { x: 50, y: 50 },
      assignedRole: role,
      effectiveStats: eff.effectiveStats,
      effectiveOVR: eff.effectiveOVR,
    };
  });

  const count = players.length || 1;
  const totalOVR = Math.round(players.reduce((s, p) => s + p.effectiveOVR, 0) / count);
  const avgPAC = Math.round(players.reduce((s, p) => s + p.effectiveStats.pac, 0) / count);
  const avgDEF = Math.round(players.reduce((s, p) => s + p.effectiveStats.def, 0) / count);
  const fwdCount = players.filter((p) => p.assignedRole === 'FWD').length;
  const midCount = players.filter((p) => p.assignedRole === 'MID').length;
  const derivedFormation: TacticalFormation =
    formation || (fwdCount === 2 && midCount === 1 ? '2-1-2' : '2-2-1');

  return {
    name,
    color,
    players,
    formation: derivedFormation,
    totalOVR,
    avgPAC,
    avgDEF,
  };
}

/**
 * 8 Oynanan Resmi Maçın Eksiksiz Taktik Tahtası Kadroları & Algoritma Karşılaştırmaları
 */
export function createPastMatches(allPlayers: Player[]): Match[] {
  return [
  // ================= 1. HAFTA (15 EYLÜL 2026) =================
  (() => {
    const starters = ['p4', 'p3', 'p20', 'p23', 'p12', 'p15', 'p2', 'p1', 'p11', 'p22', 'p19', 'p6'];
    const checkIns: Record<string, CheckInEntry> = {
      p4: { playerId: 'p4', timestamp: 1726410000000, status: 'full', attendance: 'yes' },
      p3: { playerId: 'p3', timestamp: 1726410100000, status: 'full', attendance: 'yes' },
      p20: { playerId: 'p20', timestamp: 1726410200000, status: 'full', attendance: 'yes' },
      p23: { playerId: 'p23', timestamp: 1726410300000, status: 'full', attendance: 'yes' },
      p12: { playerId: 'p12', timestamp: 1726410400000, status: 'full', attendance: 'yes' },
      p15: { playerId: 'p15', timestamp: 1726410500000, status: 'full', attendance: 'yes' },
      p2: { playerId: 'p2', timestamp: 1726410600000, status: 'full', attendance: 'yes' },
      p1: { playerId: 'p1', timestamp: 1726410700000, status: 'full', attendance: 'yes', canPayPitchFee: true },
      p11: { playerId: 'p11', timestamp: 1726410800000, status: 'full', attendance: 'yes' },
      p22: { playerId: 'p22', timestamp: 1726410900000, status: 'full', attendance: 'yes' },
      p19: { playerId: 'p19', timestamp: 1726411000000, status: 'full', attendance: 'yes' },
      p6: { playerId: 'p6', timestamp: 1726411100000, status: 'full', attendance: 'yes' },
    };

    const teamA = buildPastSquad(
      'Yelekli',
      'green',
      [
        { playerId: 'p4', role: 'GK' },
        { playerId: 'p3', role: 'DEF' },
        { playerId: 'p20', role: 'DEF' },
        { playerId: 'p23', role: 'DEF' },
        { playerId: 'p15', role: 'DEF' },
        { playerId: 'p12', role: 'MID' },
      ],
      allPlayers,
      checkIns,
      '2-2-1'
    );

    const teamB = buildPastSquad(
      'Yeleksiz',
      'white',
      [
        { playerId: 'p11', role: 'GK' },
        { playerId: 'p22', role: 'DEF' },
        { playerId: 'p1', role: 'MID' },
        { playerId: 'p19', role: 'MID' },
        { playerId: 'p6', role: 'MID' },
        { playerId: 'p2', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-2-1'
    );

    const startersList = allPlayers.filter((p: Player) => starters.includes(p.id));
    const algoBalance = run462BalancingAlgorithm(startersList, checkIns);

    return {
      id: 'match-1',
      title: '1. Hafta • 2026-2027 Sezon Açılış Derbisi',
      date: '2026-09-15T20:00:00.000Z',
      matchTime: '20:00 - 21:00',
      pitchName: 'Aksaz Spor Salonu Arkası Halısaha',
      pitchLocationUrl: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
      pitchFee: '400 TL',
      stage: 'archived' as const,
      isPollOpen: false,
      starters,
      waitlist: ['p5', 'p7', 'p8', 'p9', 'p10', 'p13', 'p14', 'p16', 'p17', 'p18', 'p21'],
      checkIns,
      teamA,
      teamB,
      altTeamA: algoBalance.teamA,
      altTeamB: algoBalance.teamB,
      fairnessRating: 72,
      altFairnessRating: algoBalance.fairnessRating,
      selectedLineupOption: 1 as const,
      awards: {
        winnerTeam: 'B' as const,
        mvpId: 'p1',
        wallId: 'p4',
        isConfirmedByCommittee: true,
        confirmedAt: '2026-09-15T22:30:00.000Z',
        confirmedBy: 'Alper',
      },
      tacticalNotes: 'Dr. Sefa ve devresinin katılımıyla 12 kişi tamamlandı. 2. Takım (Beyaz) hücum üstünlüğüyle kazandı.',
      manualEvaluation: {
        isManualWhatsAppMatch: true,
        critiqueTitle: 'Manuel WhatsApp Eşleşmesi: Aşırı Savunma Yığılması vs Hücum Fazlalığı',
        defSummary: '1. Takım DEF Ortalaması: 85 | 2. Takım DEF Ortalaması: 60 (+25 SAV Dengesizliği)',
        roleDistributionSummary: '1. Takım 4 doğal stoperle sahadaydı (Yüksel, Mustafa, Korkmaz, İsmet) ve forvetsiz kaldı. 2. Takım ise Alper, Akif, Can, Ömer, Ferhun ile hücum ağırlıklıydı.',
        injuryFormSummary: 'Sezon açılışında tüm oyuncular tam kondisyon bildirdi; ancak 1. Takım hücumda top tutamadığı için kalesinde sürekli pres gördü.',
        bullets: [
          'WhatsApp grubunda yapılan manuel eşleşmede forvet ve gol silahları dengesiz dağıtıldı; 1. Takımda tek bir doğal forvet dahi yer almadı.',
          '2. Takım; Akif (85 OVR / 89 ŞUT), Alper (86 OVR / 88 PAS) ve Can (82 OVR / 87 DRI) ile sahanın tüm ofansif gücünü tek takımda topladı.',
          'İsmail kalede devleşmesine rağmen (Ahtapot Efsane), 1. Takımın hücuma çıkamaması sonucunda 2. Takım maçı rahat kopardı.',
          '🤖 Revir FC Algoritması Seçseydi: Akif ile Yüksel\'i karşılıklı takımlara vererek, forvetsiz takım kalmasını engeller ve denge skorunu %97 seviyesine çıkarırdı.',
        ],
      },
    };
  })(),

  // ================= 2. HAFTA (22 EYLÜL 2026) =================
  (() => {
    const starters = ['p1', 'p6', 'p11', 'p23', 'p12', 'p13', 'p14', 'p15', 'p3', 'p2', 'p17', 'p4'];
    const checkIns: Record<string, CheckInEntry> = {
      p1: { playerId: 'p1', timestamp: 1727010000000, status: 'full', attendance: 'yes' },
      p6: { playerId: 'p6', timestamp: 1727010100000, status: 'full', attendance: 'yes' },
      p11: { playerId: 'p11', timestamp: 1727010200000, status: 'full', attendance: 'yes' },
      p23: { playerId: 'p23', timestamp: 1727010300000, status: 'full', attendance: 'yes' },
      p12: { playerId: 'p12', timestamp: 1727010400000, status: 'full', attendance: 'yes' },
      p13: { playerId: 'p13', timestamp: 1727010500000, status: 'full', attendance: 'yes' },
      p14: { playerId: 'p14', timestamp: 1727010600000, status: 'full', attendance: 'yes' },
      p15: { playerId: 'p15', timestamp: 1727010700000, status: 'full', attendance: 'yes' },
      p3: { playerId: 'p3', timestamp: 1727010800000, status: 'full', attendance: 'yes' },
      p2: { playerId: 'p2', timestamp: 1727010900000, status: 'full', attendance: 'yes' },
      p17: { playerId: 'p17', timestamp: 1727011000000, status: 'full', attendance: 'yes' },
      p4: { playerId: 'p4', timestamp: 1727011100000, status: 'full', attendance: 'yes' },
    };

    const teamA = buildPastSquad(
      'Yelekli',
      'green',
      [
        { playerId: 'p12', role: 'GK' },
        { playerId: 'p23', role: 'DEF' },
        { playerId: 'p1', role: 'MID' },
        { playerId: 'p6', role: 'MID' },
        { playerId: 'p11', role: 'MID' },
        { playerId: 'p13', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-2-1'
    );

    const teamB = buildPastSquad(
      'Yeleksiz',
      'white',
      [
        { playerId: 'p4', role: 'GK' },
        { playerId: 'p3', role: 'DEF' },
        { playerId: 'p15', role: 'DEF' },
        { playerId: 'p14', role: 'MID' },
        { playerId: 'p2', role: 'FWD' },
        { playerId: 'p17', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-1-2'
    );

    const startersList = allPlayers.filter((p: Player) => starters.includes(p.id));
    const algoBalance = run462BalancingAlgorithm(startersList, checkIns);

    return {
      id: 'match-2',
      title: '2. Hafta • Aksaz Lojman Halısahası Derbisi',
      date: '2026-09-22T20:00:00.000Z',
      matchTime: '20:00 - 21:00',
      pitchName: 'Aksaz Lojman Halı Saha',
      pitchLocationUrl: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
      pitchFee: '400 TL',
      stage: 'archived' as const,
      isPollOpen: false,
      starters,
      waitlist: ['p5', 'p7', 'p8', 'p9', 'p10', 'p16', 'p18', 'p19', 'p20', 'p21', 'p22'],
      checkIns,
      teamA,
      teamB,
      altTeamA: algoBalance.teamA,
      altTeamB: algoBalance.teamB,
      fairnessRating: 78,
      altFairnessRating: algoBalance.fairnessRating,
      selectedLineupOption: 1 as const,
      awards: {
        winnerTeam: 'A' as const,
        mvpId: 'p6',
        wallId: 'p12',
        isConfirmedByCommittee: true,
        confirmedAt: '2026-09-22T22:30:00.000Z',
        confirmedBy: 'Alper',
      },
      tacticalNotes: 'Mahmut Beşiktaş 17 Immobile formasıyla sahaya çıktı. 1. Takım orta saha temposuyla kazandı.',
      manualEvaluation: {
        isManualWhatsAppMatch: true,
        critiqueTitle: 'Manuel WhatsApp Eşleşmesi: Orta Saha Hakimiyeti vs Çift Forvet İzolasyonu',
        defSummary: '1. Takım DEF Ortalaması: 68 | 2. Takım DEF Ortalaması: 82 (2. Takım savunmada üstün)',
        roleDistributionSummary: '1. Takım 4 orta saha virtüözüyle (Alper, Can, Sefa, Metin) oyunu domine etti. 2. Takımda Akif ve Mahmut çift forvet oynadı ancak orta sahadan pas desteği kesildi.',
        injuryFormSummary: 'Tüm kadro tam fit. Mahmut ilk kez Immobile formasıyla maça çıktı.',
        bullets: [
          '1. Takım orta sahada topa sahip olma oranını çok yüksek tuttu (Alper 88 PAS, Can 87 DRI, Sefa 88 PAC).',
          '2. Takım İsmail, Yüksel ve İsmet ile güçlü bir arka hat kursa da tek orta saha Turap iki yönlü yetişmekte zorlandı.',
          'Akif ile Mahmut ileride top beklerken orta saha üstünlüğü kaybedildi ve 1. Takım galibiyete uzandı.',
          '🤖 Revir FC Algoritması Seçseydi: Can ile Turap\'ı karşılıklı orta sahalara verir, iki takımın da pas trafiğini eşitlerdi.',
        ],
      },
    };
  })(),

  // ================= 3. HAFTA (29 EYLÜL 2026) =================
  (() => {
    const starters = ['p11', 'p8', 'p15', 'p13', 'p17', 'p23', 'p4', 'p9', 'p1', 'p2', 'p20', 'p14'];
    const checkIns: Record<string, CheckInEntry> = {
      p11: { playerId: 'p11', timestamp: 1727610000000, status: 'full', attendance: 'yes' },
      p8: { playerId: 'p8', timestamp: 1727610100000, status: 'full', attendance: 'yes' },
      p15: { playerId: 'p15', timestamp: 1727610200000, status: 'full', attendance: 'yes' },
      p13: { playerId: 'p13', timestamp: 1727610300000, status: 'full', attendance: 'yes' },
      p17: { playerId: 'p17', timestamp: 1727610400000, status: 'full', attendance: 'yes' },
      p23: { playerId: 'p23', timestamp: 1727610500000, status: 'full', attendance: 'yes' },
      p4: { playerId: 'p4', timestamp: 1727610600000, status: 'full', attendance: 'yes' },
      p9: { playerId: 'p9', timestamp: 1727610700000, status: 'full', attendance: 'yes' },
      p1: { playerId: 'p1', timestamp: 1727610800000, status: 'full', attendance: 'yes' },
      p2: { playerId: 'p2', timestamp: 1727610900000, status: 'full', attendance: 'yes' },
      p20: { playerId: 'p20', timestamp: 1727611000000, status: 'full', attendance: 'yes' },
      p14: { playerId: 'p14', timestamp: 1727611100000, status: 'full', attendance: 'yes' },
    };

    const teamA = buildPastSquad(
      'Yelekli',
      'green',
      [
        { playerId: 'p15', role: 'GK' },
        { playerId: 'p23', role: 'DEF' },
        { playerId: 'p11', role: 'MID' },
        { playerId: 'p13', role: 'MID' },
        { playerId: 'p8', role: 'FWD' },
        { playerId: 'p17', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-2-1'
    );

    const teamB = buildPastSquad(
      'Yeleksiz',
      'white',
      [
        { playerId: 'p4', role: 'GK' },
        { playerId: 'p20', role: 'DEF' },
        { playerId: 'p1', role: 'MID' },
        { playerId: 'p14', role: 'MID' },
        { playerId: 'p9', role: 'FWD' },
        { playerId: 'p2', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-1-2'
    );

    const startersList = allPlayers.filter((p: Player) => starters.includes(p.id));
    const algoBalance = run462BalancingAlgorithm(startersList, checkIns);

    return {
      id: 'match-3',
      title: '3. Hafta • Aksaz Halısaha Karşılaşması',
      date: '2026-09-29T21:00:00.000Z',
      matchTime: '21:00 - 22:00',
      pitchName: 'Aksaz Lojman Halı Saha',
      pitchLocationUrl: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
      pitchFee: '400 TL',
      stage: 'archived' as const,
      isPollOpen: false,
      starters,
      waitlist: ['p3', 'p5', 'p6', 'p7', 'p10', 'p12', 'p16', 'p18', 'p19', 'p21', 'p22'],
      checkIns,
      teamA,
      teamB,
      altTeamA: algoBalance.teamA,
      altTeamB: algoBalance.teamB,
      fairnessRating: 64,
      altFairnessRating: algoBalance.fairnessRating,
      selectedLineupOption: 1 as const,
      awards: {
        winnerTeam: 'B' as const,
        mvpId: 'p9',
        wallId: 'p4',
        isConfirmedByCommittee: true,
        confirmedAt: '2026-09-29T23:00:00.000Z',
        confirmedBy: 'Alper',
      },
      tacticalNotes: 'Gölcür ve Akif 2. Takımda fırtına gibi esti. Efsane forvet Gölcür MVP seçildi.',
      manualEvaluation: {
        isManualWhatsAppMatch: true,
        critiqueTitle: 'Manuel WhatsApp Eşleşmesi: Ligin En Ağır OVR Dengesizliği (Gölcür + İsmail + Alper + Akif)',
        defSummary: '1. Takım DEF Ortalaması: 65 | 2. Takım DEF Ortalaması: 76',
        roleDistributionSummary: '2. Takım; ligin 88 OVR\'lık iki yıldızı İsmail (GK) ve Gölcür\'ün (FWD) yanına Alper (86) ve Akif\'i (85) de ekleyerek süper takım kurdu.',
        injuryFormSummary: 'Gölcür eski İskenderun turnuva günlerini aratmayan formundaydı ("Dıkıcı"). 1. Takımda Elber yalnız kaldı.',
        bullets: [
          'WhatsApp grubunda yapılan bu eşleşme kulüp tarihinin en dengesiz manuel eşleşmesi olmuştur (Takım OVR farkı: 504 vs 470).',
          'Ligin en iyi iki bitiricisi Gölcür (90 ŞUT) ve Akif (89 ŞUT) aynı takıma verilmiş, arkalarına da Alper (88 PAS) konulmuştur.',
          '1. Takımda kalede doğal eldiven bulunmadığı için İsmet kaleye geçmek zorunda kalmış, İsmail\'in kalesine karşı büyük dezavantaj yaşamıştır.',
          '🤖 Revir FC Algoritması Seçseydi: Gölcür ile Akif\'i kesinlikle ayırır, İsmail\'in karşısına Alper\'i koyarak %98 dengeli iki takım oluştururdu.',
        ],
      },
    };
  })(),

  // ================= 4. HAFTA (06 EKİM 2026) =================
  (() => {
    const starters = ['p4', 'p3', 'p9', 'p12', 'p14', 'p18', 'p1', 'p2', 'p7', 'p13', 'p23', 'p15'];
    const checkIns: Record<string, CheckInEntry> = {
      p4: { playerId: 'p4', timestamp: 1728210000000, status: 'full', attendance: 'yes' },
      p3: { playerId: 'p3', timestamp: 1728210100000, status: 'light_injury', note: 'İlk yarıda rectus femoris uyluk çekmesi yaşandı', attendance: 'yes' },
      p9: { playerId: 'p9', timestamp: 1728210200000, status: 'full', attendance: 'yes' },
      p12: { playerId: 'p12', timestamp: 1728210300000, status: 'full', attendance: 'yes' },
      p14: { playerId: 'p14', timestamp: 1728210400000, status: 'full', attendance: 'yes' },
      p18: { playerId: 'p18', timestamp: 1728210500000, status: 'full', attendance: 'yes' },
      p1: { playerId: 'p1', timestamp: 1728210600000, status: 'full', attendance: 'yes' },
      p2: { playerId: 'p2', timestamp: 1728210700000, status: 'full', attendance: 'yes' },
      p7: { playerId: 'p7', timestamp: 1728210800000, status: 'full', attendance: 'yes' },
      p13: { playerId: 'p13', timestamp: 1728210900000, status: 'full', attendance: 'yes' },
      p23: { playerId: 'p23', timestamp: 1728211000000, status: 'full', attendance: 'yes' },
      p15: { playerId: 'p15', timestamp: 1728211100000, status: 'full', attendance: 'yes' },
    };

    const teamA = buildPastSquad(
      'Yelekli',
      'green',
      [
        { playerId: 'p4', role: 'GK' },
        { playerId: 'p3', role: 'DEF' },
        { playerId: 'p18', role: 'DEF' },
        { playerId: 'p12', role: 'MID' },
        { playerId: 'p14', role: 'MID' },
        { playerId: 'p9', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-2-1'
    );

    const teamB = buildPastSquad(
      'Yeleksiz',
      'white',
      [
        { playerId: 'p15', role: 'GK' },
        { playerId: 'p7', role: 'DEF' },
        { playerId: 'p23', role: 'DEF' },
        { playerId: 'p1', role: 'MID' },
        { playerId: 'p13', role: 'MID' },
        { playerId: 'p2', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-2-1'
    );

    const startersList = allPlayers.filter((p: Player) => starters.includes(p.id));
    const algoBalance = run462BalancingAlgorithm(startersList, checkIns);

    return {
      id: 'match-4',
      title: '4. Hafta • Aksaz Halısaha Karşılaşması',
      date: '2026-10-06T21:00:00.000Z',
      matchTime: '21:00 - 22:00',
      pitchName: 'Aksaz Lojman Halı Saha',
      pitchLocationUrl: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
      pitchFee: '400 TL',
      stage: 'archived' as const,
      isPollOpen: false,
      starters,
      waitlist: ['p5', 'p6', 'p8', 'p10', 'p11', 'p16', 'p17', 'p19', 'p20', 'p21', 'p22'],
      checkIns,
      teamA,
      teamB,
      altTeamA: algoBalance.teamA,
      altTeamB: algoBalance.teamB,
      fairnessRating: 81,
      altFairnessRating: algoBalance.fairnessRating,
      selectedLineupOption: 1 as const,
      awards: {
        winnerTeam: 'A' as const,
        mvpId: 'p4',
        wallId: 'p3',
        isConfirmedByCommittee: true,
        confirmedAt: '2026-10-06T23:00:00.000Z',
        confirmedBy: 'Alper',
      },
      tacticalNotes: 'Yüksel ilk yarıda uyluk çekmesi yaşadı (rectus femoris). Selahattin ve İsmail maçı tuttu, 1. Takım kazandı.',
      manualEvaluation: {
        isManualWhatsAppMatch: true,
        critiqueTitle: 'Manuel WhatsApp Eşleşmesi: Sakatlık Şoku & Selahattin-İsmail Çift Kaleci Sigortası',
        defSummary: '1. Takım DEF Ortalaması: 82 | 2. Takım DEF Ortalaması: 74',
        roleDistributionSummary: '1. Takımda iki kaleci birden (İsmail & Selahattin) yer aldı; Yüksel sakatlanınca Selahattin defansı toparladı. 2. Takımda Cevdet ve Alper direndi.',
        injuryFormSummary: 'Sağlık Raporu: Yüksel Gümüş ilk yarıda sağ uyluk rectus femoris kanamasıyla kenara geldi (2 hafta sahalardan uzak kaldı).',
        bullets: [
          'Yüksel\'in maç esnasında sakatlanması 1. Takımı zora soktu; ancak kadroda Selahattin\'in de bulunması savunma boşluğunu kapattı.',
          'Gölcür tek forvet olarak rakip stoperler Cevdet ve Korkmaz\'ı üzerine çekip Turap ile Harun\'a şut koridorları açtı.',
          '2. Takımda Alper ile Akif arasındaki bağlantı Harun\'un sert presiyle kesildi; İsmail kalede kritik pozisyonları kurtardı.',
          '🤖 Revir FC Algoritması Seçseydi: Selahattin ile İsmet\'i takas ederek iki kalecinin aynı takımda yer almasını önlerdi.',
        ],
      },
    };
  })(),

  // ================= 5. HAFTA (13 EKİM 2026) =================
  (() => {
    const starters = ['p19', 'p9', 'p7', 'p12', 'p11', 'p17', 'p15', 'p8', 'p23', 'p18', 'p1', 'p2'];
    const checkIns: Record<string, CheckInEntry> = {
      p19: { playerId: 'p19', timestamp: 1728810000000, status: 'full', attendance: 'yes' },
      p9: { playerId: 'p9', timestamp: 1728810100000, status: 'full', attendance: 'yes' },
      p7: { playerId: 'p7', timestamp: 1728810200000, status: 'full', attendance: 'yes' },
      p12: { playerId: 'p12', timestamp: 1728810300000, status: 'full', attendance: 'yes' },
      p11: { playerId: 'p11', timestamp: 1728810400000, status: 'full', attendance: 'yes' },
      p17: { playerId: 'p17', timestamp: 1728810500000, status: 'full', attendance: 'yes' },
      p15: { playerId: 'p15', timestamp: 1728810600000, status: 'full', attendance: 'yes' },
      p8: { playerId: 'p8', timestamp: 1728810700000, status: 'full', attendance: 'yes' },
      p23: { playerId: 'p23', timestamp: 1728810800000, status: 'full', attendance: 'yes' },
      p18: { playerId: 'p18', timestamp: 1728810900000, status: 'full', attendance: 'yes' },
      p1: { playerId: 'p1', timestamp: 1728811000000, status: 'full', attendance: 'yes' },
      p2: { playerId: 'p2', timestamp: 1728811100000, status: 'full', attendance: 'yes' },
    };

    const teamA = buildPastSquad(
      'Yelekli',
      'green',
      [
        { playerId: 'p11', role: 'GK' },
        { playerId: 'p7', role: 'DEF' },
        { playerId: 'p12', role: 'MID' },
        { playerId: 'p19', role: 'MID' },
        { playerId: 'p9', role: 'FWD' },
        { playerId: 'p17', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-1-2'
    );

    const teamB = buildPastSquad(
      'Yeleksiz',
      'white',
      [
        { playerId: 'p18', role: 'GK' },
        { playerId: 'p15', role: 'DEF' },
        { playerId: 'p23', role: 'DEF' },
        { playerId: 'p1', role: 'MID' },
        { playerId: 'p8', role: 'FWD' },
        { playerId: 'p2', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-1-2'
    );

    const startersList = allPlayers.filter((p: Player) => starters.includes(p.id));
    const algoBalance = run462BalancingAlgorithm(startersList, checkIns);

    return {
      id: 'match-5',
      title: '5. Hafta • Aksaz Halısaha Karşılaşması',
      date: '2026-10-13T20:00:00.000Z',
      matchTime: '20:00 - 21:00',
      pitchName: 'Aksaz Lojman Halı Saha',
      pitchLocationUrl: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
      pitchFee: '400 TL',
      stage: 'archived' as const,
      isPollOpen: false,
      starters,
      waitlist: ['p3', 'p4', 'p5', 'p6', 'p10', 'p13', 'p14', 'p16', 'p20', 'p21', 'p22'],
      absentees: ['p4'],
      checkIns,
      teamA,
      teamB,
      altTeamA: algoBalance.teamA,
      altTeamB: algoBalance.teamB,
      fairnessRating: 75,
      altFairnessRating: algoBalance.fairnessRating,
      selectedLineupOption: 1 as const,
      awards: {
        winnerTeam: 'B' as const,
        mvpId: 'p2',
        wallId: 'p15',
        isConfirmedByCommittee: true,
        confirmedAt: '2026-10-13T22:30:00.000Z',
        confirmedBy: 'Alper',
      },
      tacticalNotes: 'Dr. İsmail Atabey Adaköy turnuva maçında oynadığı için katılamadı. 2. Takım kazandı.',
      manualEvaluation: {
        isManualWhatsAppMatch: true,
        critiqueTitle: 'Manuel WhatsApp Eşleşmesi: İsmail Albay\'sız Maçta Hızlı Hücum Üstünlüğü',
        defSummary: '1. Takım DEF Ortalaması: 74 | 2. Takım DEF Ortalaması: 71',
        roleDistributionSummary: 'İsmail Albay\'ın yokluğunda Selahattin 2. Takımın kalesini korudu. 2. Takım Alper-Akif-Elber üçlü hücum silahıyla skoru aldı.',
        injuryFormSummary: 'İsmail Albay Adaköy turnuva maçı (Aksazspor) sebebiyle izinliydi. Yüksel Gümüş uyluk sakatlığı nedeniyle kadro dışı kaldı.',
        bullets: [
          'İsmail\'in yokluğunda 1. Takım kalede Sefa\'yı oynatmak zorunda kaldı; bu da savunma güvenliğini zayıflattı.',
          '2. Takımda Akif (89 ŞUT) ve Elber (85 PAC) ikilisi hızlı hücumlarda Cevdet ve Harun\'un arkasına sızmayı başardı.',
          'Ömer orta sahada Gölcür\'ü topla buluşturmaya çalışsa da 2. Takımın kontra atakları maçı kopardı.',
          '🤖 Revir FC Algoritması Seçseydi: Selahattin\'i 1. Takıma verir, Akif ile Elber\'i ayırarak maçı başa baş noktaya getirirdi.',
        ],
      },
    };
  })(),

  // ================= 6. HAFTA (20 EKİM 2026) =================
  (() => {
    const starters = ['p6', 'p18', 'p3', 'p1', 'p15', 'p17', 'p7', 'p20', 'p23', 'p2', 'p19', 'p8'];
    const checkIns: Record<string, CheckInEntry> = {
      p6: { playerId: 'p6', timestamp: 1729410000000, status: 'full', attendance: 'yes' },
      p18: { playerId: 'p18', timestamp: 1729410100000, status: 'full', attendance: 'yes' },
      p3: { playerId: 'p3', timestamp: 1729410200000, status: 'full', attendance: 'yes' },
      p1: { playerId: 'p1', timestamp: 1729410300000, status: 'full', attendance: 'yes' },
      p15: { playerId: 'p15', timestamp: 1729410400000, status: 'full', attendance: 'yes' },
      p17: { playerId: 'p17', timestamp: 1729410500000, status: 'full', attendance: 'yes' },
      p7: { playerId: 'p7', timestamp: 1729410600000, status: 'full', attendance: 'yes' },
      p20: { playerId: 'p20', timestamp: 1729410700000, status: 'full', attendance: 'yes' },
      p23: { playerId: 'p23', timestamp: 1729410800000, status: 'full', attendance: 'yes' },
      p2: { playerId: 'p2', timestamp: 1729410900000, status: 'full', attendance: 'yes' },
      p19: { playerId: 'p19', timestamp: 1729411000000, status: 'full', attendance: 'yes' },
      p8: { playerId: 'p8', timestamp: 1729411100000, status: 'full', attendance: 'yes' },
    };

    const teamA = buildPastSquad(
      'Yelekli',
      'green',
      [
        { playerId: 'p18', role: 'GK' },
        { playerId: 'p3', role: 'DEF' },
        { playerId: 'p15', role: 'DEF' },
        { playerId: 'p1', role: 'MID' },
        { playerId: 'p6', role: 'MID' },
        { playerId: 'p17', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-2-1'
    );

    const teamB = buildPastSquad(
      'Yeleksiz',
      'white',
      [
        { playerId: 'p20', role: 'GK' },
        { playerId: 'p7', role: 'DEF' },
        { playerId: 'p23', role: 'DEF' },
        { playerId: 'p19', role: 'MID' },
        { playerId: 'p2', role: 'FWD' },
        { playerId: 'p8', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-1-2'
    );

    const startersList = allPlayers.filter((p: Player) => starters.includes(p.id));
    const algoBalance = run462BalancingAlgorithm(startersList, checkIns);

    return {
      id: 'match-6',
      title: '6. Hafta • Aksaz Halısaha Karşılaşması',
      date: '2026-10-20T20:00:00.000Z',
      matchTime: '20:00 - 21:00',
      pitchName: 'Aksaz Lojman Halı Saha',
      pitchLocationUrl: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
      pitchFee: '400 TL',
      stage: 'archived' as const,
      isPollOpen: false,
      starters,
      waitlist: ['p4', 'p5', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p16', 'p21', 'p22'],
      checkIns,
      teamA,
      teamB,
      altTeamA: algoBalance.teamA,
      altTeamB: algoBalance.teamB,
      fairnessRating: 84,
      altFairnessRating: algoBalance.fairnessRating,
      selectedLineupOption: 1 as const,
      awards: {
        winnerTeam: 'A' as const,
        mvpId: 'p1',
        wallId: 'p3',
        isConfirmedByCommittee: true,
        confirmedAt: '2026-10-20T22:30:00.000Z',
        confirmedBy: 'Alper',
      },
      tacticalNotes: 'Dr. Mehmet Gölcür uyluk hematomu (vastus intermedius) nedeniyle kadroda yoktu. 1. Takım kazandı.',
      manualEvaluation: {
        isManualWhatsAppMatch: true,
        critiqueTitle: 'Manuel WhatsApp Eşleşmesi: Gölcür Sakatlığı & Alper-Can Orta Saha Aklı',
        defSummary: '1. Takım DEF Ortalaması: 76 | 2. Takım DEF Ortalaması: 73',
        roleDistributionSummary: '1. Takım Alper ve Can ile orta sahada teknik üstünlük kurdu, arkalarında Yüksel ve İsmet sağlam durdu. 2. Takımda Cevdet ve Korkmaz arkada, Akif ve Elber ileride kaldı.',
        injuryFormSummary: 'Dr. Mehmet Gölcür uyluk hematomu (vastus intermedius kanaması) nedeniyle 2-3 hafta sahalardan uzak kaldı ve bu maçta oynamadı.',
        bullets: [
          'Gölcür\'ün sakatlığı ligdeki hücum dengelerini değiştirdi; 1. Takım Alper ve Can ikilisinin ara paslarıyla Mahmut\'u pozisyona soktu.',
          '2. Takımda Cevdet ve Mustafa savunmada mücadele etse de orta sahada Ömer tek başına Alper-Can ikilisini durduramadı.',
          'Yüksel sakatlıktan sonra ilk kez tam 60 dakika sahada kalarak savunma liderliğini gösterdi.',
          '🤖 Revir FC Algoritması Seçseydi: Can ile Ömer\'i karşılıklı orta sahalara verir, dengeyi %96\'ya yükseltirdi.',
        ],
      },
    };
  })(),

  // ================= 7. HAFTA (05 KASIM 2026 - PERŞEMBE) =================
  (() => {
    const starters = ['p11', 'p4', 'p19', 'p14', 'p21', 'p7', 'p2', 'p3', 'p20', 'p1', 'p17', 'p5'];
    const checkIns: Record<string, CheckInEntry> = {
      p11: { playerId: 'p11', timestamp: 1730790000000, status: 'full', attendance: 'yes' },
      p4: { playerId: 'p4', timestamp: 1730790100000, status: 'full', attendance: 'yes' },
      p19: { playerId: 'p19', timestamp: 1730790200000, status: 'full', attendance: 'yes' },
      p14: { playerId: 'p14', timestamp: 1730790300000, status: 'full', attendance: 'yes' },
      p21: { playerId: 'p21', timestamp: 1730790400000, status: 'full', attendance: 'yes' },
      p7: { playerId: 'p7', timestamp: 1730790500000, status: 'full', attendance: 'yes', canPayPitchFee: true },
      p2: { playerId: 'p2', timestamp: 1730790600000, status: 'full', attendance: 'yes' },
      p3: { playerId: 'p3', timestamp: 1730790700000, status: 'full', attendance: 'yes' },
      p20: { playerId: 'p20', timestamp: 1730790800000, status: 'full', attendance: 'yes' },
      p1: { playerId: 'p1', timestamp: 1730790900000, status: 'full', attendance: 'yes' },
      p17: { playerId: 'p17', timestamp: 1730791000000, status: 'full', attendance: 'yes' },
      p5: { playerId: 'p5', timestamp: 1730791100000, status: 'full', attendance: 'yes' },
    };

    const teamA = buildPastSquad(
      'Yelekli',
      'green',
      [
        { playerId: 'p4', role: 'GK' },
        { playerId: 'p7', role: 'DEF' },
        { playerId: 'p11', role: 'MID' },
        { playerId: 'p14', role: 'MID' },
        { playerId: 'p19', role: 'MID' },
        { playerId: 'p21', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-2-1'
    );

    const teamB = buildPastSquad(
      'Yeleksiz',
      'white',
      [
        { playerId: 'p20', role: 'GK' },
        { playerId: 'p3', role: 'DEF' },
        { playerId: 'p1', role: 'MID' },
        { playerId: 'p5', role: 'MID' },
        { playerId: 'p17', role: 'FWD' },
        { playerId: 'p2', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-1-2'
    );

    const startersList = allPlayers.filter((p: Player) => starters.includes(p.id));
    const algoBalance = run462BalancingAlgorithm(startersList, checkIns);

    return {
      id: 'match-7',
      title: '7. Hafta • Perşembe Derbisi',
      date: '2026-11-05T20:00:00.000Z',
      matchTime: '20:00 - 21:00',
      pitchName: 'Aksaz Lojman Halı Saha',
      pitchLocationUrl: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
      pitchFee: '400 TL',
      pitchFeePayerId: 'p7',
      stage: 'archived' as const,
      isPollOpen: false,
      starters,
      waitlist: ['p6', 'p8', 'p9', 'p10', 'p12', 'p13', 'p15', 'p16', 'p18', 'p22', 'p23'],
      checkIns,
      teamA,
      teamB,
      altTeamA: algoBalance.teamA,
      altTeamB: algoBalance.teamB,
      fairnessRating: 80,
      altFairnessRating: algoBalance.fairnessRating,
      selectedLineupOption: 1 as const,
      awards: {
        winnerTeam: 'A' as const,
        mvpId: 'p11',
        wallId: 'p4',
        isConfirmedByCommittee: true,
        confirmedAt: '2026-11-05T22:30:00.000Z',
        confirmedBy: 'Alper',
      },
      tacticalNotes: 'Yağış ve maç sebebiyle Perşembe oynandı. Saha ücretini Cevdet ödedi, suları Alper temin etti. 1. Takım kazandı.',
      manualEvaluation: {
        isManualWhatsAppMatch: true,
        critiqueTitle: 'Manuel WhatsApp Eşleşmesi: Genç Yıldız Yusuf & Dinamik Orta Saha Presi',
        defSummary: '1. Takım DEF Ortalaması: 73 | 2. Takım DEF Ortalaması: 74',
        roleDistributionSummary: '1. Takım kalede İsmail, arkada Cevdet, orta sahada Sefa-Turap-Ömer ve ileride Yusuf (85 PAC) ile yüksek tempolu 2-2-1 oynadı.',
        injuryFormSummary: 'Maç hava muhalefeti nedeniyle Salı\'dan Perşembe\'ye alındı. 30 Ekim\'de alınan yeni toplar ve yeşil yeleklerle ilk resmi maç yapıldı.',
        bullets: [
          'Halı saha ücretini Cevdet Kartal takıma jest olarak ödedi, suları Alper Beyaz getirdi.',
          'Genç forvet Yusuf (85 PAC / 82 DRI) hızıyla rakip savunmayı zorladı; Sefa ve Turap orta alanda çok yüksek koşu mesafesine ulaştı.',
          '2. Takımda Alper, Akif ve Baran tecrübeleriyle hücum etmeye çalışsa da kalede İsmail\'in devleşmesi farkı korudu.',
          '🤖 Revir FC Algoritması Seçseydi: Yusuf ile Mahmut\'u takas ederek forvet hız dengesini iki takıma paylaştırırdı.',
        ],
      },
    };
  })(),

  // ================= 8. HAFTA (10 KASIM 2026 - SALI) =================
  (() => {
    const starters = ['p4', 'p3', 'p7', 'p19', 'p15', 'p14', 'p2', 'p11', 'p8', 'p21', 'p18', 'p17'];
    const checkIns: Record<string, CheckInEntry> = {
      p4: { playerId: 'p4', timestamp: 1731220000000, status: 'full', attendance: 'yes' },
      p3: { playerId: 'p3', timestamp: 1731220100000, status: 'full', attendance: 'yes' },
      p7: { playerId: 'p7', timestamp: 1731220200000, status: 'full', attendance: 'yes', canPayPitchFee: true },
      p19: { playerId: 'p19', timestamp: 1731220300000, status: 'full', attendance: 'yes' },
      p15: { playerId: 'p15', timestamp: 1731220400000, status: 'full', attendance: 'yes' },
      p14: { playerId: 'p14', timestamp: 1731220500000, status: 'full', attendance: 'yes' },
      p2: { playerId: 'p2', timestamp: 1731220600000, status: 'full', attendance: 'yes' },
      p11: { playerId: 'p11', timestamp: 1731220700000, status: 'full', attendance: 'yes' },
      p8: { playerId: 'p8', timestamp: 1731220800000, status: 'full', attendance: 'yes' },
      p21: { playerId: 'p21', timestamp: 1731220900000, status: 'full', attendance: 'yes' },
      p18: { playerId: 'p18', timestamp: 1731221000000, status: 'full', attendance: 'yes' },
      p17: { playerId: 'p17', timestamp: 1731221100000, status: 'full', attendance: 'yes' },
      p1: { playerId: 'p1', timestamp: 1731221200000, status: 'light_injury', note: 'Diz burkulması (S83.6), tribündeyim', attendance: 'no' },
    };

    const teamA = buildPastSquad(
      'Yelekli',
      'green',
      [
        { playerId: 'p4', role: 'GK' },
        { playerId: 'p3', role: 'DEF' },
        { playerId: 'p7', role: 'DEF' },
        { playerId: 'p15', role: 'DEF' },
        { playerId: 'p14', role: 'MID' },
        { playerId: 'p19', role: 'MID' },
      ],
      allPlayers,
      checkIns,
      '2-2-1'
    );

    const teamB = buildPastSquad(
      'Yeleksiz',
      'white',
      [
        { playerId: 'p18', role: 'GK' },
        { playerId: 'p11', role: 'DEF' },
        { playerId: 'p8', role: 'FWD' },
        { playerId: 'p21', role: 'FWD' },
        { playerId: 'p17', role: 'FWD' },
        { playerId: 'p2', role: 'FWD' },
      ],
      allPlayers,
      checkIns,
      '2-1-2'
    );

    const startersList = allPlayers.filter((p: Player) => starters.includes(p.id));
    const algoBalance = run462BalancingAlgorithm(startersList, checkIns);

    return {
      id: 'match-8',
      title: '8. Hafta • 10 Kasım Derbisi',
      date: '2026-11-10T20:00:00.000Z',
      matchTime: '20:00 - 21:00',
      pitchName: 'Aksaz Lojman Halı Saha',
      pitchLocationUrl: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
      pitchFee: '400 TL',
      pitchFeePayerId: 'p7',
      stage: 'archived' as const,
      isPollOpen: false,
      starters,
      waitlist: ['p1', 'p5', 'p6', 'p9', 'p10', 'p12', 'p13', 'p16', 'p20', 'p22', 'p23'],
      absentees: ['p1'],
      checkIns,
      teamA,
      teamB,
      altTeamA: algoBalance.teamA,
      altTeamB: algoBalance.teamB,
      fairnessRating: 70,
      altFairnessRating: algoBalance.fairnessRating,
      selectedLineupOption: 1 as const,
      awards: {
        winnerTeam: 'A' as const,
        mvpId: 'p4',
        wallId: 'p3',
        inFormIds: ['p14', 'p19'],
        isConfirmedByCommittee: true,
        confirmedAt: '2026-11-10T22:30:00.000Z',
        confirmedBy: 'Alper',
      },
      tacticalNotes: 'Alper diz burkulması sebebiyle yoktu. İsmail Albay kaptanlığındaki 1. Takım etten duvar örerek kazandı!',
      manualEvaluation: {
        isManualWhatsAppMatch: true,
        critiqueTitle: 'Manuel WhatsApp Eşleşmesi: "Etten Duvar" Savunması vs 4 Forvetli Dengesiz Hücum',
        defSummary: '1. Takım DEF Ortalaması: 86 | 2. Takım DEF Ortalaması: 56 (+30 SAV Farkı!)',
        roleDistributionSummary: '1. Takım ligin en sert 3 stoperini (Yüksel 90 DEF, Cevdet 88 DEF, İsmet 83 DEF) ve efsane kaleci İsmail\'i (92 DEF) tek takımda topladı. 2. Takım ise neredeyse sadece forvetlerden (Akif, Elber, Yusuf, Mahmut) kuruldu.',
        injuryFormSummary: 'Alper Beyaz diz burkulması (S83.6 teşhisi) nedeniyle forma giyemedi ve tribünden izledi.',
        bullets: [
          'WhatsApp grubunda yapılan eşleşmede savunma oyuncularının tamamı 1. Takıma, forvetlerin tamamı ise 2. Takıma yığılmıştır.',
          '1. Takım savunması (İsmail, Yüksel, Cevdet, İsmet) sahada adeta "Etten Duvar" örerek rakip hücumculara tek bir şut açısı dahi bırakmamıştır.',
          '2. Takımda Akif ve Yusuf gibi yıldızlar olmasına rağmen takım savunması çökmüş, orta saha direnci kalmamıştır.',
          '🤖 Revir FC Algoritması Seçseydi: Yüksel ile Akif\'i veya Cevdet ile Elber\'i karşılıklı takımlara vererek her iki kaleye de hem hücum hem savunma dengesi getirir ve %98 kusursuz denge sağlardı.',
        ],
      },
    };
  })(),
  ];
}

/**
 * Yaklaşan 9. Hafta Maçı (Temiz Ekran, Anket Henüz Başlatılmadı)
 */
export function createActiveMatch(): Match {
  return {
  id: 'match-9',
  title: '9. Hafta • Aksaz Lojman Halısahası Karşılaşması',
  date: '2026-11-17T20:00:00.000Z',
  matchTime: '20:00 - 21:00',
  pitchName: 'Aksaz Lojman Halı Saha',
  pitchLocationUrl: 'https://maps.app.goo.gl/3We3Qfcm5BHrJeS39o',
  pitchFee: '400 TL',
  stage: 'check_in' as const,
  isPollOpen: false, // Kurul yeni anket açana kadar kapalı (temiz ekran)
  starters: [],
  waitlist: [],
  absentees: [],
  checkIns: {},
  tacticalNotes: '9. hafta maçı Revir FC 462 algoritmasıyla dengelenecektir. Kurul tarafından yeni anket açıldığında bildirim gelecektir.',
  teamA: {
    name: 'Yelekli',
    color: 'green',
    players: [],
    formation: '2-2-1',
    totalOVR: 0,
    avgPAC: 0,
    avgDEF: 0,
  },
  teamB: {
    name: 'Yeleksiz',
    color: 'white',
    players: [],
    formation: '2-2-1',
    totalOVR: 0,
    avgPAC: 0,
    avgDEF: 0,
  },
  };
}

/**
 * Geçmiş oynanmış maç dizisinden her oyuncunun resmi Maç / Galibiyet / Beraberlik / Mağlubiyet toplamlarını hesaplar.
 */
export function computePlayerRecordsFromMatches(
  matches: Match[]
): Record<string, { matchesPlayed: number; wins: number; draws: number; losses: number }> {
  const records: Record<string, { matchesPlayed: number; wins: number; draws: number; losses: number }> = {};
  const ensure = (pid: string) => {
    if (!records[pid]) {
      records[pid] = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0 };
    }
    return records[pid];
  };

  for (const m of matches) {
    const useAlt = m.selectedLineupOption === 2 && Boolean(m.altTeamA && m.altTeamB);
    const squadA = useAlt ? m.altTeamA : m.teamA;
    const squadB = useAlt ? m.altTeamB : m.teamB;

    const winner =
      m.awards?.winnerTeam ??
      (m.score && typeof m.score.teamA === 'number' && typeof m.score.teamB === 'number'
        ? m.score.teamA > m.score.teamB
          ? 'A'
          : m.score.teamB > m.score.teamA
          ? 'B'
          : 'draw'
        : undefined);

    const aIds = Array.from(new Set((squadA?.players || []).map((p) => p.player.id)));
    const bIds = Array.from(new Set((squadB?.players || []).map((p) => p.player.id)));

    for (const pid of aIds) {
      const r = ensure(pid);
      r.matchesPlayed += 1;
      if (winner === 'A') r.wins += 1;
      else if (winner === 'B') r.losses += 1;
      else if (winner === 'draw') r.draws += 1;
    }
    for (const pid of bIds) {
      const r = ensure(pid);
      r.matchesPlayed += 1;
      if (winner === 'B') r.wins += 1;
      else if (winner === 'A') r.losses += 1;
      else if (winner === 'draw') r.draws += 1;
    }
  }

  return records;
}
