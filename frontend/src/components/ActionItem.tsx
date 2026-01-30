import { Circle, CheckCircle2 } from 'lucide-react';
import { cn, getEnergyColor, getEnergyIcon } from '../lib/utils';
import type { Action } from '../lib/api';

interface ActionItemProps {
  action: Action;
  showContext?: boolean;
  onClick?: () => void;
}

export function ActionItem({ action, showContext = true, onClick }: ActionItemProps) {
  return (
    <div 
      className="card group cursor-pointer hover:border-[#00FF41]/50"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <button className="mt-0.5 text-gray-600 hover:text-[#00FF41] transition-colors">
          <Circle className="w-5 h-5" />
        </button>
        
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate group-hover:text-[#00FF41] transition-colors">
            {action.title}
          </p>
          
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Energy indicator */}
            <span className={cn('text-sm font-mono', getEnergyColor(action.energy))}>
              {getEnergyIcon(action.energy)} {action.energy}
            </span>
            
            {/* Contexts */}
            {showContext && action.context?.map((ctx) => (
              <span 
                key={ctx}
                className="text-xs px-2 py-0.5 rounded bg-[#1a1a1a] text-gray-400 font-mono"
              >
                {ctx}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
