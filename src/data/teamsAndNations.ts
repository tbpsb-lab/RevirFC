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

// Turkish Trendyol Süper Lig Teams
export const SUPER_LIG_CLUBS: Club[] = [
  { id: 'galatasaray', name: 'Galatasaray', shortName: 'GS', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/645.png' },
  { id: 'fenerbahce', name: 'Fenerbahçe', shortName: 'FB', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/611.png' },
  { id: 'besiktas', name: 'Beşiktaş', shortName: 'BJK', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/549.png' },
  { id: 'trabzonspor', name: 'Trabzonspor', shortName: 'TS', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/998.png' },
  { id: 'basaksehir', name: 'İstanbul Başakşehir', shortName: 'İBFK', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1005.png' },
  { id: 'samsunspor', name: 'Samsunspor', shortName: 'SAM', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3574.png' },
  { id: 'eyupspor', name: 'Eyüpspor', shortName: 'EYÜP', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3564.png' },
  { id: 'goztepe', name: 'Göztepe', shortName: 'GÖZ', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1007.png' },
  { id: 'sivasspor', name: 'Sivasspor', shortName: 'SİV', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1004.png' },
  { id: 'kasimpasa', name: 'Kasımpaşa', shortName: 'KAS', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1002.png' },
  { id: 'antalyaspor', name: 'Antalyaspor', shortName: 'ANT', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1001.png' },
  { id: 'caykur_rizespor', name: 'Çaykur Rizespor', shortName: 'RİZE', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1010.png' },
  { id: 'gaziantep_fk', name: 'Gaziantep FK', shortName: 'GFK', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3575.png' },
  { id: 'kayserispor', name: 'Kayserispor', shortName: 'KAY', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1008.png' },
  { id: 'konyaspor', name: 'Konyaspor', shortName: 'KON', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1009.png' },
  { id: 'alanyaspor', name: 'Corendon Alanyaspor', shortName: 'ALN', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1000.png' },
  { id: 'bodrum_fk', name: 'Bodrum FK', shortName: 'BOD', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3583.png' },
  { id: 'hatayspor', name: 'Hatayspor', shortName: 'HAT', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3577.png' },
  { id: 'adana_demirspor', name: 'Adana Demirspor', shortName: 'ADS', league: 'super_lig', leagueName: 'Trendyol Süper Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3563.png' },
];

// Turkish Trendyol 1. Lig Teams
export const LIG_1_CLUBS: Club[] = [
  { id: 'kocaelispor', name: 'Kocaelispor', shortName: 'KOC', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3578.png' },
  { id: 'genclerbirligi', name: 'Gençlerbirliği', shortName: 'GB', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/5203.png' },
  { id: 'bandirmaspor', name: 'Teksüt Bandırmaspor', shortName: 'BAN', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3582.png' },
  { id: 'erzurumspor', name: 'Erzurumspor FK', shortName: 'ERZ', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1012.png' },
  { id: 'amed_sk', name: 'Amed SK', shortName: 'AMED', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/7041.png' },
  { id: 'karagumruk', name: 'Fatih Karagümrük', shortName: 'FKG', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3576.png' },
  { id: 'ankaragucu', name: 'MKE Ankaragücü', shortName: 'AGÜ', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1003.png' },
  { id: 'sakaryaspor', name: 'Sakaryaspor', shortName: 'SAK', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3584.png' },
  { id: 'istanbulspor', name: 'İstanbulspor', shortName: 'İST', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3570.png' },
  { id: 'pendikspor', name: 'Pendikspor', shortName: 'PEN', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3588.png' },
  { id: 'boluspor', name: 'Boluspor', shortName: 'BOL', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3568.png' },
  { id: 'corum_fk', name: 'Ahlatcı Çorum FK', shortName: 'ÇOR', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/7044.png' },
  { id: 'umraniyespor', name: 'Ümraniyespor', shortName: 'ÜMR', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3566.png' },
  { id: 'igdir_fk', name: 'Alagöz Holding Iğdır FK', shortName: 'IĞD', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/18765.png' },
  { id: 'manisa_fk', name: 'Manisa FK', shortName: 'MAN', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/7043.png' },
  { id: 'sanliurfaspor', name: 'Şanlıurfaspor', shortName: 'URF', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3567.png' },
  { id: 'erokspor', name: 'Esenler Erokspor', shortName: 'EROK', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/7047.png' },
  { id: 'adanaspor', name: 'Adanaspor', shortName: 'ADA', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3573.png' },
  { id: 'keciorengucu', name: 'Ankara Keçiörengücü', shortName: 'KÖG', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/3587.png' },
  { id: 'yeni_malatyaspor', name: 'Yeni Malatyaspor', shortName: 'MAL', league: 'lig_1', leagueName: 'Trendyol 1. Lig', country: 'Türkiye', logoUrl: 'https://media.api-sports.io/football/teams/1011.png' },
];

// Top 100 World Football Clubs (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Giants of Europe & Americas)
export const WORLD_TOP_CLUBS: Club[] = [
  // --- İspanya La Liga ---
  { id: 'real_madrid', name: 'Real Madrid', shortName: 'RMA', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/541.png' },
  { id: 'barcelona', name: 'FC Barcelona', shortName: 'BAR', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/529.png' },
  { id: 'atletico_madrid', name: 'Atlético Madrid', shortName: 'ATM', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/530.png' },
  { id: 'athletic_bilbao', name: 'Athletic Bilbao', shortName: 'ATH', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/531.png' },
  { id: 'real_sociedad', name: 'Real Sociedad', shortName: 'RSO', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/548.png' },
  { id: 'villarreal', name: 'Villarreal CF', shortName: 'VIL', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/533.png' },
  { id: 'sevilla', name: 'Sevilla FC', shortName: 'SEV', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/536.png' },
  { id: 'real_betis', name: 'Real Betis', shortName: 'BET', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/543.png' },
  { id: 'valencia', name: 'Valencia CF', shortName: 'VAL', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/532.png' },
  { id: 'girona', name: 'Girona FC', shortName: 'GIR', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/547.png' },
  { id: 'celta_vigo', name: 'Celta Vigo', shortName: 'CEL', league: 'world_top', leagueName: 'La Liga (İspanya)', country: 'İspanya', logoUrl: 'https://media.api-sports.io/football/teams/538.png' },

  // --- İngiltere Premier League ---
  { id: 'man_city', name: 'Manchester City', shortName: 'MCI', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/50.png' },
  { id: 'arsenal', name: 'Arsenal', shortName: 'ARS', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/42.png' },
  { id: 'liverpool', name: 'Liverpool FC', shortName: 'LIV', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/40.png' },
  { id: 'man_united', name: 'Manchester United', shortName: 'MUN', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/33.png' },
  { id: 'chelsea', name: 'Chelsea FC', shortName: 'CHE', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/49.png' },
  { id: 'tottenham', name: 'Tottenham Hotspur', shortName: 'TOT', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/47.png' },
  { id: 'aston_villa', name: 'Aston Villa', shortName: 'AVL', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/66.png' },
  { id: 'newcastle', name: 'Newcastle United', shortName: 'NEW', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/34.png' },
  { id: 'brighton', name: 'Brighton & Hove Albion', shortName: 'BHA', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/51.png' },
  { id: 'west_ham', name: 'West Ham United', shortName: 'WHU', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/48.png' },
  { id: 'everton', name: 'Everton FC', shortName: 'EVE', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/45.png' },
  { id: 'nottingham_forest', name: 'Nottingham Forest', shortName: 'NFO', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/65.png' },
  { id: 'fulham', name: 'Fulham FC', shortName: 'FUL', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/36.png' },
  { id: 'brentford', name: 'Brentford FC', shortName: 'BRE', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/55.png' },
  { id: 'wolves', name: 'Wolverhampton Wanderers', shortName: 'WOL', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/39.png' },
  { id: 'leicester', name: 'Leicester City', shortName: 'LEI', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/46.png' },
  { id: 'crystal_palace', name: 'Crystal Palace', shortName: 'CRY', league: 'world_top', leagueName: 'Premier League (İngiltere)', country: 'İngiltere', logoUrl: 'https://media.api-sports.io/football/teams/52.png' },

  // --- İtalya Serie A ---
  { id: 'inter_milan', name: 'Inter Milan', shortName: 'INT', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/505.png' },
  { id: 'ac_milan', name: 'AC Milan', shortName: 'MIL', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/489.png' },
  { id: 'juventus', name: 'Juventus', shortName: 'JUV', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/496.png' },
  { id: 'napoli', name: 'SSC Napoli', shortName: 'NAP', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/492.png' },
  { id: 'roma', name: 'AS Roma', shortName: 'ROM', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/497.png' },
  { id: 'lazio', name: 'SS Lazio', shortName: 'LAZ', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/487.png' },
  { id: 'atalanta', name: 'Atalanta BC', shortName: 'ATA', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/499.png' },
  { id: 'fiorentina', name: 'ACF Fiorentina', shortName: 'FIO', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/502.png' },
  { id: 'bologna', name: 'Bologna FC', shortName: 'BOL', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/500.png' },
  { id: 'torino', name: 'Torino FC', shortName: 'TOR', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/503.png' },
  { id: 'genoa', name: 'Genoa CFC', shortName: 'GEN', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/495.png' },
  { id: 'parma', name: 'Parma Calcio', shortName: 'PAR', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/523.png' },
  { id: 'como', name: 'Como 1907', shortName: 'COM', league: 'world_top', leagueName: 'Serie A (İtalya)', country: 'İtalya', logoUrl: 'https://media.api-sports.io/football/teams/516.png' },

  // --- Almanya Bundesliga ---
  { id: 'bayern_munich', name: 'Bayern Münih', shortName: 'FCB', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/157.png' },
  { id: 'borussia_dortmund', name: 'Borussia Dortmund', shortName: 'BVB', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/165.png' },
  { id: 'bayer_leverkusen', name: 'Bayer 04 Leverkusen', shortName: 'B04', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/168.png' },
  { id: 'rb_leipzig', name: 'RB Leipzig', shortName: 'RBL', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/173.png' },
  { id: 'eintracht_frankfurt', name: 'Eintracht Frankfurt', shortName: 'SGE', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/169.png' },
  { id: 'vfb_stuttgart', name: 'VfB Stuttgart', shortName: 'VFB', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/172.png' },
  { id: 'borussia_mgladbach', name: 'Borussia Mönchengladbach', shortName: 'BMG', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/163.png' },
  { id: 'wolfsburg', name: 'VfL Wolfsburg', shortName: 'WOB', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/161.png' },
  { id: 'freiburg', name: 'SC Freiburg', shortName: 'SCF', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/160.png' },
  { id: 'werder_bremen', name: 'Werder Bremen', shortName: 'SVW', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/162.png' },
  { id: 'union_berlin', name: '1. FC Union Berlin', shortName: 'FCU', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/182.png' },
  { id: 'hoffenheim', name: 'TSG Hoffenheim', shortName: 'TSG', league: 'world_top', leagueName: 'Bundesliga (Almanya)', country: 'Almanya', logoUrl: 'https://media.api-sports.io/football/teams/167.png' },

  // --- Fransa Ligue 1 ---
  { id: 'psg', name: 'Paris Saint-Germain', shortName: 'PSG', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: 'https://media.api-sports.io/football/teams/85.png' },
  { id: 'marseille', name: 'Olympique de Marseille', shortName: 'OM', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: 'https://media.api-sports.io/football/teams/81.png' },
  { id: 'monaco', name: 'AS Monaco', shortName: 'ASM', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: 'https://media.api-sports.io/football/teams/91.png' },
  { id: 'lyon', name: 'Olympique Lyonnais', shortName: 'OL', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: 'https://media.api-sports.io/football/teams/80.png' },
  { id: 'lille', name: 'Lille OSC', shortName: 'LOSC', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: 'https://media.api-sports.io/football/teams/79.png' },
  { id: 'nice', name: 'OGC Nice', shortName: 'OGCN', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: 'https://media.api-sports.io/football/teams/84.png' },
  { id: 'rennes', name: 'Stade Rennais', shortName: 'SRFC', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: 'https://media.api-sports.io/football/teams/94.png' },
  { id: 'lens', name: 'RC Lens', shortName: 'RCL', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: 'https://media.api-sports.io/football/teams/116.png' },
  { id: 'brest', name: 'Stade Brestois 29', shortName: 'SB29', league: 'world_top', leagueName: 'Ligue 1 (Fransa)', country: 'Fransa', logoUrl: 'https://media.api-sports.io/football/teams/1063.png' },

  // --- Portekiz, Hollanda & Diğer Avrupa Devleri ---
  { id: 'benfica', name: 'SL Benfica', shortName: 'SLB', league: 'world_top', leagueName: 'Primeira Liga (Portekiz)', country: 'Portekiz', logoUrl: 'https://media.api-sports.io/football/teams/211.png' },
  { id: 'porto', name: 'FC Porto', shortName: 'FCP', league: 'world_top', leagueName: 'Primeira Liga (Portekiz)', country: 'Portekiz', logoUrl: 'https://media.api-sports.io/football/teams/212.png' },
  { id: 'sporting_cp', name: 'Sporting CP', shortName: 'SCP', league: 'world_top', leagueName: 'Primeira Liga (Portekiz)', country: 'Portekiz', logoUrl: 'https://media.api-sports.io/football/teams/228.png' },
  { id: 'ajax', name: 'AFC Ajax', shortName: 'AJX', league: 'world_top', leagueName: 'Eredivisie (Hollanda)', country: 'Hollanda', logoUrl: 'https://media.api-sports.io/football/teams/194.png' },
  { id: 'psv', name: 'PSV Eindhoven', shortName: 'PSV', league: 'world_top', leagueName: 'Eredivisie (Hollanda)', country: 'Hollanda', logoUrl: 'https://media.api-sports.io/football/teams/197.png' },
  { id: 'feyenoord', name: 'Feyenoord Rotterdam', shortName: 'FEY', league: 'world_top', leagueName: 'Eredivisie (Hollanda)', country: 'Hollanda', logoUrl: 'https://media.api-sports.io/football/teams/247.png' },
  { id: 'celtic', name: 'Celtic FC', shortName: 'CEL', league: 'world_top', leagueName: 'Premiership (İskoçya)', country: 'İskoçya', logoUrl: 'https://media.api-sports.io/football/teams/252.png' },
  { id: 'rangers', name: 'Rangers FC', shortName: 'RAN', league: 'world_top', leagueName: 'Premiership (İskoçya)', country: 'İskoçya', logoUrl: 'https://media.api-sports.io/football/teams/257.png' },
  { id: 'club_brugge', name: 'Club Brugge', shortName: 'CLU', league: 'world_top', leagueName: 'Pro League (Belçika)', country: 'Belçika', logoUrl: 'https://media.api-sports.io/football/teams/569.png' },
  { id: 'anderlecht', name: 'RSC Anderlecht', shortName: 'AND', league: 'world_top', leagueName: 'Pro League (Belçika)', country: 'Belçika', logoUrl: 'https://media.api-sports.io/football/teams/571.png' },
  { id: 'shakhtar', name: 'Shakhtar Donetsk', shortName: 'SHK', league: 'world_top', leagueName: 'Premier League (Ukrayna)', country: 'Ukrayna', logoUrl: 'https://media.api-sports.io/football/teams/550.png' },
  { id: 'dynamo_kyiv', name: 'Dynamo Kyiv', shortName: 'DYN', league: 'world_top', leagueName: 'Premier League (Ukrayna)', country: 'Ukrayna', logoUrl: 'https://media.api-sports.io/football/teams/554.png' },
  { id: 'olympiacos', name: 'Olympiacos FC', shortName: 'OLY', league: 'world_top', leagueName: 'Super League (Yunanistan)', country: 'Yunanistan', logoUrl: 'https://media.api-sports.io/football/teams/553.png' },
  { id: 'panathinaikos', name: 'Panathinaikos FC', shortName: 'PAO', league: 'world_top', leagueName: 'Super League (Yunanistan)', country: 'Yunanistan', logoUrl: 'https://media.api-sports.io/football/teams/552.png' },
  { id: 'red_star', name: 'Kızılyıldız (Crvena Zvezda)', shortName: 'CZV', league: 'world_top', leagueName: 'SuperLiga (Sırbistan)', country: 'Sırbistan', logoUrl: 'https://media.api-sports.io/football/teams/597.png' },
  { id: 'dinamo_zagreb', name: 'Dinamo Zagreb', shortName: 'DZG', league: 'world_top', leagueName: 'HNL (Hırvatistan)', country: 'Hırvatistan', logoUrl: 'https://media.api-sports.io/football/teams/593.png' },

  // --- Suudi Arabistan, Amerika & Güney Amerika Devleri ---
  { id: 'al_hilal', name: 'Al-Hilal SFC', shortName: 'HIL', league: 'world_top', leagueName: 'Saudi Pro League', country: 'Suudi Arabistan', logoUrl: 'https://media.api-sports.io/football/teams/2939.png' },
  { id: 'al_nassr', name: 'Al-Nassr FC', shortName: 'NAS', league: 'world_top', leagueName: 'Saudi Pro League', country: 'Suudi Arabistan', logoUrl: 'https://media.api-sports.io/football/teams/2932.png' },
  { id: 'al_ittihad', name: 'Al-Ittihad Club', shortName: 'ITT', league: 'world_top', leagueName: 'Saudi Pro League', country: 'Suudi Arabistan', logoUrl: 'https://media.api-sports.io/football/teams/2931.png' },
  { id: 'al_ahli', name: 'Al-Ahli SFC', shortName: 'AHL', league: 'world_top', leagueName: 'Saudi Pro League', country: 'Suudi Arabistan', logoUrl: 'https://media.api-sports.io/football/teams/2938.png' },
  { id: 'inter_miami', name: 'Inter Miami CF', shortName: 'MIA', league: 'world_top', leagueName: 'MLS (ABD)', country: 'ABD', logoUrl: 'https://media.api-sports.io/football/teams/895.png' },
  { id: 'la_galaxy', name: 'LA Galaxy', shortName: 'LAG', league: 'world_top', leagueName: 'MLS (ABD)', country: 'ABD', logoUrl: 'https://media.api-sports.io/football/teams/1608.png' },
  { id: 'boca_juniors', name: 'Boca Juniors', shortName: 'BOC', league: 'world_top', leagueName: 'Primera División (Arjantin)', country: 'Arjantin', logoUrl: 'https://media.api-sports.io/football/teams/451.png' },
  { id: 'river_plate', name: 'River Plate', shortName: 'RIV', league: 'world_top', leagueName: 'Primera División (Arjantin)', country: 'Arjantin', logoUrl: 'https://media.api-sports.io/football/teams/435.png' },
  { id: 'flamengo', name: 'CR Flamengo', shortName: 'FLA', league: 'world_top', leagueName: 'Série A (Brezilya)', country: 'Brezilya', logoUrl: 'https://media.api-sports.io/football/teams/127.png' },
  { id: 'palmeiras', name: 'SE Palmeiras', shortName: 'PAL', league: 'world_top', leagueName: 'Série A (Brezilya)', country: 'Brezilya', logoUrl: 'https://media.api-sports.io/football/teams/121.png' },
  { id: 'sao_paulo', name: 'São Paulo FC', shortName: 'SAO', league: 'world_top', leagueName: 'Série A (Brezilya)', country: 'Brezilya', logoUrl: 'https://media.api-sports.io/football/teams/126.png' },
  { id: 'corinthians', name: 'SC Corinthians', shortName: 'COR', league: 'world_top', leagueName: 'Série A (Brezilya)', country: 'Brezilya', logoUrl: 'https://media.api-sports.io/football/teams/131.png' },
  { id: 'fluminense', name: 'Fluminense FC', shortName: 'FLU', league: 'world_top', leagueName: 'Série A (Brezilya)', country: 'Brezilya', logoUrl: 'https://media.api-sports.io/football/teams/124.png' },
  { id: 'santos', name: 'Santos FC', shortName: 'SAN', league: 'world_top', leagueName: 'Série A (Brezilya)', country: 'Brezilya', logoUrl: 'https://media.api-sports.io/football/teams/128.png' },
  { id: 'gremio', name: 'Grêmio FBPA', shortName: 'GRE', league: 'world_top', leagueName: 'Série A (Brezilya)', country: 'Brezilya', logoUrl: 'https://media.api-sports.io/football/teams/130.png' },
];

// All clubs list starting with Revir FC
export const ALL_CLUBS: Club[] = [
  DEFAULT_CLUB,
  ...SUPER_LIG_CLUBS,
  ...LIG_1_CLUBS,
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
