import React from 'react';
import { PlayStyle } from '../../types';
import { Shield, Zap, Target, Eye, Footprints, Activity, Flame } from 'lucide-react';

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
    description: 'Bitmeyen kondisyon, maç boyu depar',
    icon: Activity,
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  power_shot: {
    label: 'Balyoz',
    description: 'Uzaktan mermi gibi şutlar',
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
    description: 'Geçilmez stoper ve kademe',
    icon: Shield,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
  poacher: {
    label: 'İleride Bekleyen',
    description: 'Geriye koşmayan fırsatçı forvet',
    icon: Target,
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  },
  maestro: {
    label: 'Maestro',
    description: 'Oyun kurucu, akıl almaz ara pasları',
    icon: Eye,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  },
  trickster: {
    label: 'Ayak Tenisçisi',
    description: 'Dar alanda bilek hareketleri ve çalım',
    icon: Footprints,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
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
