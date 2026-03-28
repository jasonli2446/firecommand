'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, ArrowRight, RotateCcw, Radio } from 'lucide-react';
import { useAppStore, type ActionLogEntry } from '@/store/app-store';

const TYPE_CONFIG: Record<ActionLogEntry['type'], { icon: typeof Zap; color: string; label: string }> = {
  ai_plan: { icon: Zap, color: 'text-orange-400', label: 'AIP' },
  deploy: { icon: ArrowRight, color: 'text-blue-400', label: 'DEPLOY' },
  recall: { icon: RotateCcw, color: 'text-amber-400', label: 'RECALL' },
  system: { icon: Radio, color: 'text-gray-400', label: 'SYS' },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ActivityLog() {
  const actionLog = useAppStore((s) => s.actionLog);
  const [expanded, setExpanded] = useState(false);

  if (actionLog.length === 0) return null;

  const visible = expanded ? actionLog.slice(0, 15) : actionLog.slice(0, 4);

  return (
    <div className="fixed bottom-16 left-3 z-30 w-72">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2 py-1 mb-1 text-[10px] text-muted-foreground hover:text-white transition-colors cursor-pointer"
      >
        <Radio className="h-3 w-3" />
        <span className="uppercase tracking-wider font-semibold">Activity Log</span>
        <span className="text-muted-foreground/50">({actionLog.length})</span>
        {expanded ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronUp className="h-3 w-3 ml-auto" />}
      </button>
      <div className="glass-panel rounded-lg border border-white/5 overflow-hidden">
        <div className="divide-y divide-white/5">
          {visible.map((entry, i) => {
            const config = TYPE_CONFIG[entry.type];
            const Icon = config.icon;
            return (
              <div
                key={entry.id}
                className={`flex items-start gap-2 px-2.5 py-1.5 text-[11px] ${i === 0 ? 'bg-white/5' : ''}`}
              >
                <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-300 break-words">{entry.message}</span>
                </div>
                <span className="text-[9px] text-muted-foreground/60 tabular-nums shrink-0 mt-0.5">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
