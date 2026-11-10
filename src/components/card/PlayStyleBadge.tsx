import React from 'react';
import { PlayStyle, PlayStyleCategory } from '../../types';
import {
  Shield,
  Zap,
  Target,
  Eye,
  Footprints,
  Activity,
  Flame,
  Wind,
  Magnet,
  Compass,
  Crosshair,
  Volume2,
  Snowflake,
  Clock,
  Bandage,
  Layers,
  Sparkles,
  Swords,
  Search,
  Stethoscope,
  Bell,
  Hourglass,
  Bird,
  Focus,
  Megaphone,
  AlertCircle,
  Whistle,
  Cake,
  Repeat,
  Wand2,
  Ghost,
  Infinity as InfinityIcon,
  PawPrint,
  Key,
  Lighthouse,
  Hand,
  Sword,
} from 'lucide-react';

interface Props {
  styleName: PlayStyle;
  size?: 'sm' | 'md';
}

export interface PlayStyleConfigItem {
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  emoji: string;
  category: PlayStyleCategory;
}

export const PLAYSTYLE_CATEGORIES = [
  { id: 'all' as const, label: 'Tümü', icon: '✨' },
  { id: 'tactical' as const, label: 'Yetenek & Taktik', icon: '⚽' },
  { id: 'status' as const, label: 'Devamsızlık & Durum', icon: '🩺' },
  { id: 'humor' as const, label: 'Mizahi & Karakter', icon: '😂' },
];

export const PLAYSTYLE_CONFIG: Record<PlayStyle, PlayStyleConfigItem> = {
  // --- Saha İçi Yetenek ve Taktik Rozetleri ---
  relentless: {
    label: 'Ciğersiz',
    description: 'Bitmeyen kondisyon, maç boyu pres ve depar',
    icon: Activity,
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    emoji: '🫁',
    category: 'tactical',
  },
  power_shot: {
    label: 'Balyoz',
    description: 'Uzaktan mermi gibi sert şutlar',
    icon: Zap,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    emoji: '🔨',
    category: 'tactical',
  },
  octopus: {
    label: 'Ahtapot',
    description: 'Kaleci & Refleks canavarı',
    icon: Shield,
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    emoji: '🐙',
    category: 'tactical',
  },
  wall: {
    label: 'Beton Duvar',
    description: 'Geçilmez stoper ve sağlam kademe',
    icon: Shield,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    emoji: '🧱',
    category: 'tactical',
  },
  poacher: {
    label: 'Kampçı Forvet',
    description: 'Geriye koşmayan fırsatçı ceza sahası forveti',
    icon: Target,
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    emoji: '⛺',
    category: 'tactical',
  },
  maestro: {
    label: 'Orkestra Şefi',
    description: 'Oyun kurucu, akıl almaz kilit ara pasları',
    icon: Eye,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    emoji: '🪄',
    category: 'tactical',
  },
  trickster: {
    label: 'Ayak Tenisçisi',
    description: 'Dar alanda bilek hareketleri ve estetik çalımlar',
    icon: Footprints,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    emoji: '🕺',
    category: 'tactical',
  },
  speedster: {
    label: 'Roket Sprinter',
    description: 'Çizgiden basıp giden, tutulamaz deparcı',
    icon: Wind,
    color: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
    emoji: '🚀',
    category: 'tactical',
  },
  first_touch: {
    label: 'Mıknatıs',
    description: 'Zor gelen yüksek topları tekte yapıştıran kadife ayak',
    icon: Magnet,
    color: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
    emoji: '🧲',
    category: 'tactical',
  },
  tiki_taka: {
    label: 'Karekod Pasör',
    description: 'Garantici tek pas, oyunu hızlı çeviren pas istasyonu',
    icon: Layers,
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    emoji: '📐',
    category: 'tactical',
  },
  trivela: {
    label: 'Dış Füze',
    description: 'Ters ayak yerine ayağının dışıyla şut ve kavisli pas',
    icon: Sparkles,
    color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40',
    emoji: '💫',
    category: 'tactical',
  },
  interceptor: {
    label: 'Kademe Tilkisi',
    description: 'Rakibin pas açısını önceden sezen pas arası uzmanı',
    icon: Compass,
    color: 'bg-lime-500/20 text-lime-400 border-lime-500/40',
    emoji: '🦊',
    category: 'tactical',
  },
  finesse_shot: {
    label: 'Falso Ustası',
    description: 'Köşelere plase ve falsoyla topu bırakan usta',
    icon: Crosshair,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    emoji: '🎯',
    category: 'tactical',
  },
  slide_tackler: {
    label: 'Kasap Süpürücü',
    description: 'Gerektiğinde kayarak topu söken tavizsiz kesici',
    icon: Swords,
    color: 'bg-red-600/20 text-red-400 border-red-500/40',
    emoji: '⚔️',
    category: 'tactical',
  },
  commander: {
    label: 'Saha İçi Komutan',
    description: 'Maç boyu takımı uyararak yerleştiren bağıran kaptan',
    icon: Volume2,
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
    emoji: '🫡',
    category: 'tactical',
  },
  ice_cold: {
    label: 'Soğukkanlı Bitirici',
    description: 'Kaleciyle karşı karşıya heyecan yapmayan soğuk forvet',
    icon: Snowflake,
    color: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40',
    emoji: '❄️',
    category: 'tactical',
  },
  late_bloomer: {
    label: 'Son 15 Dakika Adamı',
    description: 'Herkes yorulurken ikinci yarı sahneye çıkan joker',
    icon: Clock,
    color: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    emoji: '⏰',
    category: 'tactical',
  },
  ping_pong: {
    label: 'Pimponcu',
    description: 'Tek topla oynayan, dar alanda seri "al-ver" ile stoper dengesi bozan',
    icon: Repeat,
    color: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
    emoji: '🏓',
    category: 'tactical',
  },
  weak_foot_wizard: {
    label: 'Ters Ayak Büyücüsü',
    description: 'Solak olmadığı halde aniden solla çatala takan öngörülemez şutör',
    icon: Wand2,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    emoji: '👟',
    category: 'tactical',
  },
  sneaky_winger: {
    label: 'Sinsi Kanat',
    description: 'Çizgide kaybolup arka direkte bomboş topa dokunup golleri atan fırsatçı',
    icon: Ghost,
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    emoji: '👥',
    category: 'tactical',
  },
  box_to_box: {
    label: 'İki Yönlü Ciğer',
    description: 'Hücumda ceza sahasında, 5 saniye sonra kendi kale çizgisi üzerinde box-to-box',
    icon: InfinityIcon,
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    emoji: '♾️',
    category: 'tactical',
  },
  press_monster: {
    label: 'Baskı Canavarı',
    description: 'Kaleciye ve stopere top verildiğinde deli gibi pres yapıp hata zorlayan tazı',
    icon: PawPrint,
    color: 'bg-red-500/20 text-red-400 border-red-500/40',
    emoji: '🐺',
    category: 'tactical',
  },
  key_passer: {
    label: 'Kilit Açıcı',
    description: 'Maç kilitlendiğinde tek bir akılalmaz pasla defans bloğunu açan oyun aklı',
    icon: Key,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    emoji: '🗝️',
    category: 'tactical',
  },
  tower_header: {
    label: 'Nöbetçi Kule',
    description: 'Duran toplarda ve kornerlerde boy avantajını kullanan kule',
    icon: Lighthouse,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    emoji: '🗼',
    category: 'tactical',
  },
  sponge_keeper: {
    label: 'Sünger Kaleci',
    description: 'Kalesine gelen sert füzelere sektirmeden tek hamlede yapışan eldiven',
    icon: Hand,
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    emoji: '🧽',
    category: 'tactical',
  },
  sliding_tackle_pro: {
    label: 'Kayarak Müdahale',
    description: 'Dizleri kanasa bile topa kaymaktan geri durmayan, temiz süpüren defans',
    icon: Zap,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    emoji: '⚡',
    category: 'tactical',
  },
  counter_dagger: {
    label: 'Son Kontra Silahı',
    description: 'Takım baskıdayken uzun topla depara kalkıp kontrayı bitiren silah',
    icon: Sword,
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
    emoji: '🗡️',
    category: 'tactical',
  },

  // --- Devamsızlık ve Durum Rozetleri ---
  fragile: {
    label: 'Müzmin Revirlik',
    description: 'Her maç bir yeri çeken ama maçı bırakmayan savaşçı',
    icon: Bandage,
    color: 'bg-rose-600/25 text-rose-300 border-rose-500/50',
    emoji: '🩹',
    category: 'status',
  },
  missing_person: {
    label: 'Kayıp İlanı',
    description: 'Uzun süre sonra maça gelip 20. dakikada "Bayağıdır koşmuyorum ya" diyen',
    icon: Search,
    color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
    emoji: '🔍',
    category: 'status',
  },
  shift_veteran: {
    label: 'Nöbet Gazisi',
    description: '24 saatlik ağır nöbetten uykusuz çıkıp direkt maça gelen fedakar emektar',
    icon: Stethoscope,
    color: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    emoji: '🩺',
    category: 'status',
  },
  whatsapp_captain: {
    label: 'WhatsApp Kaptanı',
    description: 'Ankete ilk "Varım" yazan, 13. kişiye tahammülsüz organizatör',
    icon: Bell,
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    emoji: '🔔',
    category: 'status',
  },
  jubilee_pending: {
    label: 'Jübile Bekleyen',
    description: '"Bu sezon son, bırakıyorum" deyip asla bırakamayan tecrübeli duayen',
    icon: Hourglass,
    color: 'bg-amber-600/20 text-amber-300 border-amber-600/40',
    emoji: '⏳',
    category: 'status',
  },

  // --- Mizahi ve Taktik Karakteristik Rozetleri ---
  out_collector: {
    label: 'Aut Koleksiyoncusu',
    description: 'Dağa taşa vurup her defasında zemini veya hafif topu suçlayan forvet',
    icon: Bird,
    color: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    emoji: '🕊️',
    category: 'humor',
  },
  selfish_maestro: {
    label: 'Bencil Maestro',
    description: '3 kişi bomboşken pas vermeyip kaleye vuran, sadece kaleyi gören bitirici',
    icon: Focus,
    color: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    emoji: '🪞',
    category: 'humor',
  },
  radio_striker: {
    label: 'Telsiz Santrafor',
    description: 'Geriye koşmayıp defansa ve kaleciye "Çıkın, basın, kaçırma!" direktifi yağdıran',
    icon: Megaphone,
    color: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    emoji: '📢',
    category: 'humor',
  },
  foul_magnet: {
    label: 'Faul Mıknatısı',
    description: 'Her temasta faul bekleyen, canı tatlı "Hocam devam mı?" oyuncusu',
    icon: AlertCircle,
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    emoji: '🩼',
    category: 'humor',
  },
  pitch_referee: {
    label: 'Saha İçi Hakem',
    description: 'Kendi takımından çok maçı yöneten, çizgiyi santimle takip eden fahri hakem',
    icon: Whistle,
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    emoji: '🪈',
    category: 'humor',
  },
  baklava_sponsor: {
    label: 'Baklava Sponsoru',
    description: 'Kaybeden tarafta olacağını kabullenip maç sonu tatlıları ısmarlayan tatlı yüz',
    icon: Cake,
    color: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
    emoji: '🍰',
    category: 'humor',
  },
};

export const PlayStyleBadge: React.FC<Props> = ({ styleName, size = 'sm' }) => {
  const config = PLAYSTYLE_CONFIG[styleName];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      title={`${config.label}: ${config.description}`}
      className={`inline-flex items-center gap-1 font-semibold rounded border transition-transform hover:scale-110 cursor-help ${
        config.color
      } ${size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}`}
    >
      <span className="text-[11px] leading-none select-none">{config.emoji}</span>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{config.label}</span>
    </div>
  );
};
