// Comprehensive database of Nations and Football Clubs for Revir FC cards
export interface Nation {
  code: string;
  name: string;
  flagUrl: string;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  league: 'super_lig' | 'lig_1' | 'world_top';
  leagueName: string;
  country: string;
  logoUrl: string;
}

export const DEFAULT_NATION: Nation = {
  code: 'tr',
  name: 'Türkiye',
  flagUrl: '/cards/flag_tr.png',
};

export const DEFAULT_CLUB: Club = {
  id: 'revir_fc',
  name: 'Revir FC',
  shortName: 'Revir FC',
  league: 'super_lig',
  leagueName: 'Özel Halı Saha Kulübü',
  country: 'Türkiye',
  logoUrl: '/cards/logo_badge.png',
};

// 60+ Major Football Nations
export const NATIONS: Nation[] = [
  { code: 'tr', name: 'Türkiye', flagUrl: '/cards/flag_tr.png' },
  { code: 'de', name: 'Almanya', flagUrl: 'https://flagcdn.com/w80/de.png' },
  { code: 'br', name: 'Brezilya', flagUrl: 'https://flagcdn.com/w80/br.png' },
  { code: 'ar', name: 'Arjantin', flagUrl: 'https://flagcdn.com/w80/ar.png' },
  { code: 'fr', name: 'Fransa', flagUrl: 'https://flagcdn.com/w80/fr.png' },
  { code: 'gb-eng', name: 'İngiltere', flagUrl: 'https://flagcdn.com/w80/gb-eng.png' },
  { code: 'es', name: 'İspanya', flagUrl: 'https://flagcdn.com/w80/es.png' },
  { code: 'it', name: 'İtalya', flagUrl: 'https://flagcdn.com/w80/it.png' },
  { code: 'pt', name: 'Portekiz', flagUrl: 'https://flagcdn.com/w80/pt.png' },
  { code: 'nl', name: 'Hollanda', flagUrl: 'https://flagcdn.com/w80/nl.png' },
  { code: 'be', name: 'Belçika', flagUrl: 'https://flagcdn.com/w80/be.png' },
  { code: 'hr', name: 'Hırvatistan', flagUrl: 'https://flagcdn.com/w80/hr.png' },
  { code: 'uy', name: 'Uruguay', flagUrl: 'https://flagcdn.com/w80/uy.png' },
  { code: 'co', name: 'Kolombiya', flagUrl: 'https://flagcdn.com/w80/co.png' },
  { code: 'ma', name: 'Fas', flagUrl: 'https://flagcdn.com/w80/ma.png' },
  { code: 'jp', name: 'Japonya', flagUrl: 'https://flagcdn.com/w80/jp.png' },
  { code: 'kr', name: 'Güney Kore', flagUrl: 'https://flagcdn.com/w80/kr.png' },
  { code: 'ng', name: 'Nijerya', flagUrl: 'https://flagcdn.com/w80/ng.png' },
  { code: 'sn', name: 'Senegal', flagUrl: 'https://flagcdn.com/w80/sn.png' },
  { code: 'ci', name: 'Fildişi Sahili', flagUrl: 'https://flagcdn.com/w80/ci.png' },
  { code: 'eg', name: 'Mısır', flagUrl: 'https://flagcdn.com/w80/eg.png' },
  { code: 'ch', name: 'İsviçre', flagUrl: 'https://flagcdn.com/w80/ch.png' },
  { code: 'at', name: 'Avusturya', flagUrl: 'https://flagcdn.com/w80/at.png' },
  { code: 'pl', name: 'Polonya', flagUrl: 'https://flagcdn.com/w80/pl.png' },
  { code: 'dk', name: 'Danimarka', flagUrl: 'https://flagcdn.com/w80/dk.png' },
  { code: 'se', name: 'İsveç', flagUrl: 'https://flagcdn.com/w80/se.png' },
  { code: 'no', name: 'Norveç', flagUrl: 'https://flagcdn.com/w80/no.png' },
  { code: 'gr', name: 'Yunanistan', flagUrl: 'https://flagcdn.com/w80/gr.png' },
  { code: 'rs', name: 'Sırbistan', flagUrl: 'https://flagcdn.com/w80/rs.png' },
  { code: 'ba', name: 'Bosna-Hersek', flagUrl: 'https://flagcdn.com/w80/ba.png' },
  { code: 'az', name: 'Azerbaycan', flagUrl: 'https://flagcdn.com/w80/az.png' },
  { code: 'ge', name: 'Gürcistan', flagUrl: 'https://flagcdn.com/w80/ge.png' },
  { code: 'ua', name: 'Ukrayna', flagUrl: 'https://flagcdn.com/w80/ua.png' },
  { code: 'cz', name: 'Çekya', flagUrl: 'https://flagcdn.com/w80/cz.png' },
  { code: 'ro', name: 'Romanya', flagUrl: 'https://flagcdn.com/w80/ro.png' },
  { code: 'hu', name: 'Macaristan', flagUrl: 'https://flagcdn.com/w80/hu.png' },
  { code: 'sk', name: 'Slovakya', flagUrl: 'https://flagcdn.com/w80/sk.png' },
  { code: 'gb-sct', name: 'İskoçya', flagUrl: 'https://flagcdn.com/w80/gb-sct.png' },
  { code: 'gb-wls', name: 'Galler', flagUrl: 'https://flagcdn.com/w80/gb-wls.png' },
  { code: 'ie', name: 'İrlanda', flagUrl: 'https://flagcdn.com/w80/ie.png' },
  { code: 'is', name: 'İzlanda', flagUrl: 'https://flagcdn.com/w80/is.png' },
  { code: 'fi', name: 'Finlandiya', flagUrl: 'https://flagcdn.com/w80/fi.png' },
  { code: 'al', name: 'Arnavutluk', flagUrl: 'https://flagcdn.com/w80/al.png' },
  { code: 'mk', name: 'Kuzey Makedonya', flagUrl: 'https://flagcdn.com/w80/mk.png' },
  { code: 'xk', name: 'Kosova', flagUrl: 'https://flagcdn.com/w80/xk.png' },
  { code: 'bg', name: 'Bulgaristan', flagUrl: 'https://flagcdn.com/w80/bg.png' },
  { code: 'us', name: 'Amerika Birleşik Devletleri', flagUrl: 'https://flagcdn.com/w80/us.png' },
  { code: 'mx', name: 'Meksika', flagUrl: 'https://flagcdn.com/w80/mx.png' },
  { code: 'cl', name: 'Şili', flagUrl: 'https://flagcdn.com/w80/cl.png' },
  { code: 'gh', name: 'Gana', flagUrl: 'https://flagcdn.com/w80/gh.png' },
  { code: 'cm', name: 'Kamerun', flagUrl: 'https://flagcdn.com/w80/cm.png' },
  { code: 'dz', name: 'Cezayir', flagUrl: 'https://flagcdn.com/w80/dz.png' },
  { code: 'sa', name: 'Suudi Arabistan', flagUrl: 'https://flagcdn.com/w80/sa.png' },
  { code: 'ir', name: 'İran', flagUrl: 'https://flagcdn.com/w80/ir.png' },
  { code: 'uz', name: 'Özbekistan', flagUrl: 'https://flagcdn.com/w80/uz.png' },
  { code: 'kz', name: 'Kazakistan', flagUrl: 'https://flagcdn.com/w80/kz.png' },
  { code: 'au', name: 'Avustralya', flagUrl: 'https://flagcdn.com/w80/au.png' },
  { code: 'ca', name: 'Kanada', flagUrl: 'https://flagcdn.com/w80/ca.png' },
  { code: 'ps', name: 'Filistin', flagUrl: 'https://flagcdn.com/w80/ps.png' },
];

export const getNationFlagUrl = (code?: string): string => {
  if (!code || code === 'tr') return '/cards/flag_tr.png';
  const found = NATIONS.find((n) => n.code.toLowerCase() === code.toLowerCase());
  if (found) return found.flagUrl;
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
};

// ---------------------------------------------------------------------------
// 1. TÜRK TAKIMLARI (4 BÜYÜKLER - ALFABETİK SIRA)
// ---------------------------------------------------------------------------
export const BIG_FOUR_TR_CLUBS: Club[] = [
  { id: 'besiktas', name: 'Beşiktaş', shortName: 'BJK', league: 'super_lig', leagueName: '4 Büyükler', country: 'Türkiye', logoUrl: '/teams/besiktas.png' },
  { id: 'fenerbahce', name: 'Fenerbahçe', shortName: 'FB', league: 'super_lig', leagueName: '4 Büyükler', country: 'Türkiye', logoUrl: '/teams/fenerbahce.png' },
  { id: 'galatasaray', name: 'Galatasaray', shortName: 'GS', league: 'super_lig', leagueName: '4 Büyükler', country: 'Türkiye', logoUrl: '/teams/galatasaray.png' },
  { id: 'trabzonspor', name: 'Trabzonspor', shortName: 'TS', league: 'super_lig', leagueName: '4 Büyükler', country: 'Türkiye', logoUrl: '/teams/trabzonspor.png' },
];

// ---------------------------------------------------------------------------
// 2. DİĞER TÜRK TAKIMLARI (TRANSFERMARKT DEĞERİ SIRASIYLA)
// ---------------------------------------------------------------------------
export const OTHER_TR_CLUBS: Club[] = [
  { id: 'basaksehir', name: 'Başakşehir', shortName: 'İBFK', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/basaksehir.png' },
  { id: 'goztepe', name: 'Göztepe', shortName: 'GÖZ', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/goztepe.png' },
  { id: 'corum_fk', name: 'Çorum FK', shortName: 'ÇOR', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/corum_fk.png' },
  { id: 'samsunspor', name: 'Samsunspor', shortName: 'SAM', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/samsunspor.png' },
  { id: 'caykur_rizespor', name: 'Ç. Rizespor', shortName: 'RİZE', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/caykur_rizespor.png' },
  { id: 'kasimpasa', name: 'Kasımpaşa', shortName: 'KAS', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/kasimpasa.png' },
  { id: 'alanyaspor', name: 'Alanyaspor', shortName: 'ALN', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/alanyaspor.png' },
  { id: 'konyaspor', name: 'Konyaspor', shortName: 'KON', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/konyaspor.png' },
  { id: 'amed_sk', name: 'Amed SK', shortName: 'AMED', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/amed_sk.png' },
  { id: 'gaziantep_fk', name: 'Gaziantep', shortName: 'GFK', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/gaziantep_fk.png' },
  { id: 'genclerbirligi', name: 'Gençlerbirliği', shortName: 'GB', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/genclerbirligi.png' },
  { id: 'kocaelispor', name: 'Kocaelispor', shortName: 'KOC', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/kocaelispor.png' },
  { id: 'erzurumspor', name: 'Erzurumspor', shortName: 'ERZ', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/erzurumspor.png' },
  { id: 'bursaspor', name: 'Bursaspor', shortName: 'BUR', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/bursaspor.png' },
  { id: 'antalyaspor', name: 'Antalyaspor', shortName: 'ANT', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/antalyaspor.png' },
  { id: 'eyupspor', name: 'Eyüpspor', shortName: 'EYÜP', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/eyupspor.png' },
  { id: 'kayserispor', name: 'Kayserispor', shortName: 'KAY', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/kayserispor.png' },
  { id: 'karagumruk', name: 'Karagümrük', shortName: 'FKG', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/karagumruk.png' },
  { id: 'bodrum_fk', name: 'Bodrum FK', shortName: 'BOD', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/bodrum_fk.png' },
  { id: 'igdir_fk', name: 'Iğdır FK', shortName: 'IĞD', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/igdir_fk.png' },
  { id: 'erokspor', name: 'Erokspor', shortName: 'EROK', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/erokspor.png' },
  { id: 'istanbulspor', name: 'İstanbulspor', shortName: 'İST', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/istanbulspor.png' },
  { id: 'batman_petrolspor', name: 'Batman Petrol', shortName: 'BAT', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/batman_petrolspor.png' },
  { id: 'sivasspor', name: 'Sivasspor', shortName: 'SİV', league: 'super_lig', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/sivasspor.png' },
  { id: 'manisa_fk', name: 'Manisa FK', shortName: 'MAN', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/manisa_fk.png' },
  { id: 'vanspor_fk', name: 'Vanspor FK', shortName: 'VAN', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/vanspor_fk.png' },
  { id: 'pendikspor', name: 'Pendikspor', shortName: 'PEN', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/pendikspor.png' },
  { id: 'bandirmaspor', name: 'Bandırmaspor', shortName: 'BAN', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/bandirmaspor.png' },
  { id: 'boluspor', name: 'Boluspor', shortName: 'BOL', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/boluspor.png' },
  { id: 'sakaryaspor', name: 'Sakaryaspor', shortName: 'SAK', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/sakaryaspor.png' },
  { id: 'umraniyespor', name: 'Ümraniyespor', shortName: 'ÜMR', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/umraniyespor.png' },
  { id: 'sanliurfaspor', name: 'Şanlıurfaspor', shortName: 'URF', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/sanliurfaspor.png' },
  { id: 'adanaspor', name: 'Adanaspor', shortName: 'ADA', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/adanaspor.png' },
  { id: 'keciorengucu', name: 'Keçiörengücü', shortName: 'KÖG', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/keciorengucu.png' },
  { id: 'ankaragucu', name: 'Ankaragücü', shortName: 'AGÜ', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/ankaragucu.png' },
  { id: 'yeni_malatyaspor', name: 'Y. Malatya', shortName: 'MAL', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/yeni_malatyaspor.png' },
  { id: 'bucaspor_1928', name: 'Bucaspor 1928', shortName: 'BUC', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/bucaspor_1928.png' },
  { id: 'kastamonuspor', name: 'Kastamonuspor', shortName: 'KAS', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/kastamonuspor.png' },
  { id: 'trabzon_1461', name: '1461 Trabzon', shortName: '1461', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/trabzon_1461.png' },
  { id: 'sariyer', name: 'Sarıyer', shortName: 'SAR', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/sariyer.png' },
  { id: 'iskenderunspor', name: 'İskenderunspor', shortName: 'İSK', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/iskenderunspor.png' },
  { id: 'menemen_fk', name: 'Menemen FK', shortName: 'MEN', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/menemen_fk.png' },
  { id: 'altay', name: 'Altay', shortName: 'ALT', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/altay.png' },
  { id: 'erzincanspor_24', name: '24 Erzincan', shortName: 'ERZ', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/erzincanspor_24.png' },
  { id: 'karaman_fk', name: 'Karaman FK', shortName: 'KRM', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/karaman_fk.png' },
  { id: 'karsiyaka', name: 'Karşıyaka', shortName: 'KSK', league: 'lig_1', leagueName: 'Türk Takımları', country: 'Türkiye', logoUrl: '/teams/karsiyaka.png' },
];

// Geriye dönük uyumluluk için Süper Lig ve 1. Lig listeleri
export const SUPER_LIG_CLUBS: Club[] = BIG_FOUR_TR_CLUBS;
export const LIG_1_CLUBS: Club[] = OTHER_TR_CLUBS;

// ---------------------------------------------------------------------------
// 3. TRANSFERMARKT EN DEĞERLİ KULÜPLER LİSTESİ (DÜNYA)
// ---------------------------------------------------------------------------
export const WORLD_TOP_CLUBS: Club[] = [
  { id: 'real_madrid', name: 'Real Madrid', shortName: 'RMA', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/real_madrid.png' },
  { id: 'man_city', name: 'Man City', shortName: 'MCI', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/man_city.png' },
  { id: 'arsenal', name: 'Arsenal', shortName: 'ARS', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/arsenal.png' },
  { id: 'psg', name: 'PSG', shortName: 'PSG', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: '/teams/psg.png' },
  { id: 'barcelona', name: 'Barcelona', shortName: 'BAR', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/barcelona.png' },
  { id: 'chelsea', name: 'Chelsea', shortName: 'CHE', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/chelsea.png' },
  { id: 'liverpool', name: 'Liverpool', shortName: 'LIV', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/liverpool.png' },
  { id: 'bayern_munich', name: 'Bayern Münih', shortName: 'FCB', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/bayern_munich.png' },
  { id: 'man_united', name: 'Man United', shortName: 'MUN', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/man_united.png' },
  { id: 'tottenham', name: 'Tottenham', shortName: 'TOT', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/tottenham.png' },
  { id: 'inter_milan', name: 'Inter Milan', shortName: 'INT', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/inter_milan.png' },
  { id: 'newcastle', name: 'Newcastle', shortName: 'NEW', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/newcastle.png' },
  { id: 'atletico_madrid', name: 'Atlético Madrid', shortName: 'ATM', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/atletico_madrid.png' },
  { id: 'brighton', name: 'Brighton', shortName: 'BHA', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/brighton.png' },
  { id: 'brentford', name: 'Brentford', shortName: 'BRE', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/brentford.png' },
  { id: 'aston_villa', name: 'Aston Villa', shortName: 'AVL', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/aston_villa.png' },
  { id: 'bournemouth', name: 'Bournemouth', shortName: 'BOU', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/bournemouth.png' },
  { id: 'juventus', name: 'Juventus', shortName: 'JUV', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/juventus.png' },
  { id: 'crystal_palace', name: 'Crystal Palace', shortName: 'CRY', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/crystal_palace.png' },
  { id: 'borussia_dortmund', name: 'Dortmund', shortName: 'BVB', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/borussia_dortmund.png' },
  { id: 'como', name: 'Como 1907', shortName: 'COM', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/como.png' },
  { id: 'nottingham_forest', name: 'Nottingham', shortName: 'NFO', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/nottingham_forest.png' },
  { id: 'bayer_leverkusen', name: 'Leverkusen', shortName: 'B04', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/bayer_leverkusen.png' },
  { id: 'rb_leipzig', name: 'RB Leipzig', shortName: 'RBL', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/rb_leipzig.png' },
  { id: 'ac_milan', name: 'AC Milan', shortName: 'MIL', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/ac_milan.png' },
  { id: 'real_sociedad', name: 'Real Sociedad', shortName: 'RSO', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/real_sociedad.png' },
  { id: 'real_betis', name: 'Real Betis', shortName: 'BET', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/real_betis.png' },
  { id: 'west_ham', name: 'West Ham', shortName: 'WHU', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/west_ham.png' },
  { id: 'roma', name: 'AS Roma', shortName: 'ROM', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/roma.png' },
  { id: 'marseille', name: 'Marseille', shortName: 'OM', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: '/teams/marseille.png' },
  { id: 'villarreal', name: 'Villarreal CF', shortName: 'VIL', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/villarreal.png' },
  { id: 'athletic_bilbao', name: 'Athletic', shortName: 'ATH', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/athletic_bilbao.png' },
  { id: 'psv', name: 'PSV Eindhoven', shortName: 'PSV', league: 'world_top', leagueName: 'Eredivisie (Hollanda)', country: 'Hollanda', logoUrl: '/teams/psv.png' },
  { id: 'lyon', name: 'Lyon', shortName: 'OL', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: '/teams/lyon.png' },
  { id: 'vfb_stuttgart', name: 'Stuttgart', shortName: 'VFB', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/vfb_stuttgart.png' },
  { id: 'eintracht_frankfurt', name: 'E. Frankfurt', shortName: 'SGE', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/eintracht_frankfurt.png' },
  { id: 'galatasaray_world', name: 'Galatasaray', shortName: 'GS', league: 'world_top', leagueName: 'Süper Lig (Türkiye)', country: 'Türkiye', logoUrl: '/teams/galatasaray.png' },
  { id: 'lille', name: 'Lille', shortName: 'LOSC', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: '/teams/lille.png' },
  { id: 'ajax', name: 'Ajax', shortName: 'AJX', league: 'world_top', leagueName: 'Eredivisie (Hollanda)', country: 'Hollanda', logoUrl: '/teams/ajax.png' },
  { id: 'lazio', name: 'SS Lazio', shortName: 'LAZ', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/lazio.png' },
  { id: 'napoli', name: 'Napoli', shortName: 'NAP', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/napoli.png' },
  { id: 'atalanta', name: 'Atalanta', shortName: 'ATA', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/atalanta.png' },
  { id: 'girona', name: 'Girona FC', shortName: 'GIR', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/girona.png' },
  { id: 'porto', name: 'FC Porto', shortName: 'FCP', league: 'world_top', leagueName: 'Primeira Liga (Portekiz)', country: 'Portekiz', logoUrl: '/teams/porto.png' },
  { id: 'benfica', name: 'Benfica', shortName: 'SLB', league: 'world_top', leagueName: 'Primeira Liga (Portekiz)', country: 'Portekiz', logoUrl: '/teams/benfica.png' },
  { id: 'sporting_cp', name: 'Sporting', shortName: 'SCP', league: 'world_top', leagueName: 'Primeira Liga (Portekiz)', country: 'Portekiz', logoUrl: '/teams/sporting_cp.png' },
  { id: 'everton', name: 'Everton', shortName: 'EVE', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/everton.png' },
  { id: 'fulham', name: 'Fulham', shortName: 'FUL', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/fulham.png' },
  { id: 'hoffenheim', name: 'TSG Hoffenheim', shortName: 'TSG', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/hoffenheim.png' },
  { id: 'besiktas_world', name: 'Beşiktaş', shortName: 'BJK', league: 'world_top', leagueName: 'Süper Lig (Türkiye)', country: 'Türkiye', logoUrl: '/teams/besiktas.png' },
  { id: 'fenerbahce_world', name: 'Fenerbahçe', shortName: 'FB', league: 'world_top', leagueName: 'Süper Lig (Türkiye)', country: 'Türkiye', logoUrl: '/teams/fenerbahce.png' },
  { id: 'wolves', name: 'Wolves', shortName: 'WOL', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/wolves.png' },
  { id: 'torino', name: 'Torino FC', shortName: 'TOR', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/torino.png' },
  { id: 'valencia', name: 'Valencia CF', shortName: 'VAL', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/valencia.png' },
  { id: 'celta_vigo', name: 'Celta Vigo', shortName: 'CEL', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/celta_vigo.png' },
  { id: 'wolfsburg', name: 'VfL Wolfsburg', shortName: 'WOB', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/wolfsburg.png' },
  { id: 'werder_bremen', name: 'Werder Bremen', shortName: 'SVW', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/werder_bremen.png' },
  { id: 'sevilla', name: 'Sevilla FC', shortName: 'SEV', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/sevilla.png' },
  { id: 'bologna', name: 'Bologna FC', shortName: 'BOL', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/bologna.png' },
  { id: 'leeds_united', name: 'Leeds United', shortName: 'LEE', league: 'world_top', leagueName: 'Championship (İngiltere)', country: 'İngiltere', logoUrl: '/teams/leeds_united.png' },
  { id: 'feyenoord', name: 'Feyenoord', shortName: 'FEY', league: 'world_top', leagueName: 'Eredivisie (Hollanda)', country: 'Hollanda', logoUrl: '/teams/feyenoord.png' },
  { id: 'club_brugge', name: 'Club Brugge', shortName: 'CLU', league: 'world_top', leagueName: 'Pro League (Belçika)', country: 'Belçika', logoUrl: '/teams/club_brugge.png' },
  { id: 'trabzonspor_world', name: 'Trabzonspor', shortName: 'TS', league: 'world_top', leagueName: 'Süper Lig (Türkiye)', country: 'Türkiye', logoUrl: '/teams/trabzonspor.png' },
  { id: 'freiburg', name: 'SC Freiburg', shortName: 'SCF', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/freiburg.png' },
  { id: 'las_palmas', name: 'UD Las Palmas', shortName: 'LPA', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/las_palmas.png' },
  { id: 'osasuna', name: 'CA Osasuna', shortName: 'OSA', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/osasuna.png' },
  { id: 'augsburg', name: 'FC Augsburg', shortName: 'FCA', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/augsburg.png' },
  { id: 'genoa', name: 'Genoa CFC', shortName: 'GEN', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/genoa.png' },
  { id: 'udinese', name: 'Udinese Calcio', shortName: 'UDI', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/udinese.png' },
  { id: 'bochum', name: 'VfL Bochum', shortName: 'BOC', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/bochum.png' },
  { id: 'mainz_05', name: 'Mainz 05', shortName: 'M05', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/mainz_05.png' },
  { id: 'hellas_verona', name: 'Hellas Verona', shortName: 'VER', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/hellas_verona.png' },
  { id: 'getafe', name: 'Getafe CF', shortName: 'GET', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/getafe.png' },
  { id: 'rayo_vallecano', name: 'Rayo Vallecano', shortName: 'RAY', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/rayo_vallecano.png' },
  { id: 'montpellier', name: 'Montpellier', shortName: 'MON', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: '/teams/montpellier.png' },
  { id: 'nantes', name: 'FC Nantes', shortName: 'NAN', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: '/teams/nantes.png' },
  { id: 'strasbourg', name: 'Strasbourg', shortName: 'RCSA', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: '/teams/strasbourg.png' },
  { id: 'empoli', name: 'Empoli FC', shortName: 'EMP', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/empoli.png' },
  { id: 'parma', name: 'Parma Calcio', shortName: 'PAR', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/parma.png' },
  { id: 'norwich', name: 'Norwich City', shortName: 'NOR', league: 'world_top', leagueName: 'Championship (İngiltere)', country: 'İngiltere', logoUrl: '/teams/norwich.png' },
  { id: 'southampton', name: 'Southampton FC', shortName: 'SOU', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/southampton.png' },
  { id: 'leicester', name: 'Leicester City', shortName: 'LEI', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: '/teams/leicester.png' },
  { id: 'sheffield_united', name: 'Sheffield Utd', shortName: 'SHU', league: 'world_top', leagueName: 'Championship (İngiltere)', country: 'İngiltere', logoUrl: '/teams/sheffield_united.png' },
  { id: 'middlesbrough', name: 'Middlesbrough', shortName: 'MID', league: 'world_top', leagueName: 'Championship (İngiltere)', country: 'İngiltere', logoUrl: '/teams/middlesbrough.png' },
  { id: 'west_brom', name: 'West Brom', shortName: 'WBA', league: 'world_top', leagueName: 'Championship (İngiltere)', country: 'İngiltere', logoUrl: '/teams/west_brom.png' },
  { id: 'st_pauli', name: 'St. Pauli', shortName: 'STP', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/st_pauli.png' },
  { id: 'holstein_kiel', name: 'Holstein Kiel', shortName: 'KSV', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: '/teams/holstein_kiel.png' },
  { id: 'valladolid', name: 'Valladolid', shortName: 'VLL', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/valladolid.png' },
  { id: 'leganes', name: 'CD Leganés', shortName: 'LEG', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/leganes.png' },
  { id: 'espanyol', name: 'RCD Espanyol', shortName: 'ESP', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: '/teams/espanyol.png' },
  { id: 'venezia', name: 'Venezia FC', shortName: 'VEN', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: '/teams/venezia.png' },
  { id: 'spezia', name: 'Spezia', shortName: 'SPE', league: 'world_top', leagueName: 'Serie B (İtalya)', country: 'İtalya', logoUrl: '/teams/spezia.png' },
  { id: 'bordeaux', name: 'Bordeaux', shortName: 'BOR', league: 'world_top', leagueName: 'National 2 (Fransa)', country: 'Fransa', logoUrl: '/teams/bordeaux.png' },
  { id: 'az_alkmaar', name: 'AZ Alkmaar', shortName: 'AZ', league: 'world_top', leagueName: 'Eredivisie (Hollanda)', country: 'Hollanda', logoUrl: '/teams/az_alkmaar.png' },
  { id: 'fc_twente', name: 'FC Twente', shortName: 'TWE', league: 'world_top', leagueName: 'Eredivisie (Hollanda)', country: 'Hollanda', logoUrl: '/teams/fc_twente.png' },
  { id: 'fc_utrecht', name: 'FC Utrecht', shortName: 'UTR', league: 'world_top', leagueName: 'Eredivisie (Hollanda)', country: 'Hollanda', logoUrl: '/teams/fc_utrecht.png' },
  { id: 'young_boys', name: 'Young Boys', shortName: 'YB', league: 'world_top', leagueName: 'Super League (İsviçre)', country: 'İsviçre', logoUrl: '/teams/young_boys.png' },
  { id: 'salzburg', name: 'RB Salzburg', shortName: 'RBS', league: 'world_top', leagueName: 'Bundesliga (Avusturya)', country: 'Avusturya', logoUrl: '/teams/salzburg.png' },
];

// Tüm kulüpler listesi (Revir FC varsayılan)
export const ALL_CLUBS: Club[] = [
  DEFAULT_CLUB,
  ...BIG_FOUR_TR_CLUBS,
  ...OTHER_TR_CLUBS,
  ...WORLD_TOP_CLUBS,
];

export const getClubById = (clubId?: string): Club => {
  if (!clubId || clubId === 'revir_fc') return DEFAULT_CLUB;
  const found = ALL_CLUBS.find((c) => c.id === clubId);
  return found || DEFAULT_CLUB;
};

export const getClubLogoUrl = (clubId?: string): string => {
  return getClubById(clubId).logoUrl;
};

export const getShortCountry = (country: string): string => {
  const c = country.toLowerCase().trim();
  if (c.includes('ingiltere')) return 'ENG';
  if (c.includes('ispanya')) return 'ESP';
  if (c.includes('almanya')) return 'GER';
  if (c.includes('italya')) return 'ITA';
  if (c.includes('fransa')) return 'FRA';
  if (c.includes('portekiz')) return 'POR';
  if (c.includes('hollanda')) return 'NED';
  if (c.includes('belçika')) return 'BEL';
  if (c.includes('isviçre')) return 'SUI';
  if (c.includes('avusturya')) return 'AUT';
  if (c.includes('türkiye')) return 'TUR';
  return country.slice(0, 3).toUpperCase();
};
