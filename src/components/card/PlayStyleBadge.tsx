import React from 'react';
import { PlayStyle } from '../../types';
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
} from 'lucide-react';

interface Props {
  styleName: PlayStyle;
  size?: 'sm' | 'md';
}

export const PLAYSTYLE_CONFIG: Record<
  PlayStyle,
  { label: string; description: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  relentless: {
    label: 'Ciğersiz',
    description: 'Bitmeyen kondisyon, maç boyu pres ve depar',
    icon: Activity,
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  power_shot: {
    label: 'Balyoz',
    description: 'Uzaktan mermi gibi sert şutlar',
    icon: Zap,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
  octopus: {
    label: 'Ahtapot',
    description: 'Kaleci & Refleks canavarı',
    icon: Shield,
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  },
  wall: {
    label: 'Beton Duvar',
    description: 'Geçilmez stoper ve sağlam kademe',
    icon: Shield,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
  poacher: {
    label: 'Kampçı Forvet',
    description: 'Geriye koşmayan fırsatçı ceza sahası forveti',
    icon: Target,
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  },
  maestro: {
    label: 'Orkestra Şefi',
    description: 'Oyun kurucu, akıl almaz kilit ara pasları',
    icon: Eye,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  },
  trickster: {
    label: 'Ayak Tenisçisi',
    description: 'Dar alanda bilek hareketleri ve estetik çalımlar',
    icon: Footprints,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  },
  speedster: {
    label: 'Roket Sprinter',
    description: 'Çizgiden basıp giden, tutulamaz deparcı',
    icon: Wind,
    color: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  },
  first_touch: {
    label: 'Mıknatıs',
    description: 'Zor gelen yüksek topları tekte yapıştıran kadife ayak',
    icon: Magnet,
    color: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
  },
  tiki_taka: {
    label: 'Karekod Pasör',
    description: 'Garantici tek pas, oyunu hızlı çeviren pas istasyonu',
    icon: Layers,
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  },
  trivela: {
    label: 'Dış Füze (Trivela)',
    description: 'Ters ayak yerine ayağının dışıyla şut ve kavisli pas',
    icon: Sparkles,
    color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40',
  },
  interceptor: {
    label: 'Kademe Tilkisi',
    description: 'Rakibin pas açısını önceden sezen pas arası uzmanı',
    icon: Compass,
    color: 'bg-lime-500/20 text-lime-400 border-lime-500/40',
  },
  finesse_shot: {
    label: 'Falso Ustası',
    description: 'Köşelere plase ve falsoyla topu bırakan usta',
    icon: Crosshair,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  },
  slide_tackler: {
    label: 'Kasap Süpürücü',
    description: 'Gerektiğinde kayarak topu söken tavizsiz kesici',
    icon: Swords,
    color: 'bg-red-600/20 text-red-400 border-red-500/40',
  },
  commander: {
    label: 'Saha İçi Komutan',
    description: 'Maç boyu takımı uyararak yerleştiren bağıran kaptan',
    icon: Volume2,
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
  },
  ice_cold: {
    label: 'Soğukkanlı Bitirici',
    description: 'Kaleciyle karşı karşıya heyecan yapmayan soğuk forvet',
    icon: Snowflake,
    color: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40',
  },
  late_bloomer: {
    label: 'Son 15 Dakika Adamı',
    description: 'Herkes yorulurken ikinci yarı sahneye çıkan joker',
    icon: Clock,
    color: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
  },
  fragile: {
    label: 'Müzmin Revirlik',
    description: 'Her maç bir yeri çeken ama maçı bırakmayan savaşçı',
    icon: Bandage,
    color: 'bg-rose-600/25 text-rose-300 border-rose-500/50',
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
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{config.label}</span>
    </div>
  );
};
