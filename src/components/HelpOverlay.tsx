'use client';

import { X } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

const SHORTCUTS = [
  { key: 'Space', action: 'Play / Pause timeline' },
  { key: '?', action: 'Toggle this help' },
  { key: 'P', action: 'Toggle command panel' },
  { key: 'T', action: 'Auto-tour critical fires' },
  { key: 'Shift+D', action: 'Demo mode (tour + select)' },
  { key: 'Esc', action: 'Stop tour / deselect / close' },
  { key: '1 / 2 / 4', action: 'Playback speed' },
  { key: '\u21E7+1-4', action: 'Switch panel tab' },
  { key: '\u2190 / \u2192', action: 'Step timeline back / forward' },
];

export function HelpOverlay() {
  const showHelp = useAppStore((s) => s.showHelp);
  const setShowHelp = useAppStore((s) => s.setShowHelp);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="glass-panel rounded-xl border border-white/10 p-6 w-[340px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-sm tracking-wide">Keyboard Shortcuts</h2>
          <button
            onClick={() => setShowHelp(false)}
            className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <kbd className="px-2 py-0.5 bg-white/10 rounded text-[11px] font-mono text-white border border-white/10 min-w-[60px] text-center">
                {s.key}
              </kbd>
              <span className="text-xs text-gray-400">{s.action}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-muted-foreground text-center">
          Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px] font-mono border border-white/10">?</kbd> to close
        </div>
      </div>
    </div>
  );
}
