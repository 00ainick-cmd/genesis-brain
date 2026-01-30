import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
}

export function StatCard({ title, value, icon: Icon, highlight }: StatCardProps) {
  return (
    <div 
      className={cn(
        'card group cursor-default',
        highlight && 'border-[#00FF41]/50 glow-green'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={cn(
            'text-3xl font-bold font-mono',
            highlight ? 'text-[#00FF41]' : 'text-white'
          )}>
            {value}
          </p>
        </div>
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          highlight 
            ? 'bg-[#00FF41]/10 text-[#00FF41]' 
            : 'bg-[#1a1a1a] text-gray-500 group-hover:text-[#00FF41]'
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
