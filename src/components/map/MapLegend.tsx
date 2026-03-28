'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const LEGEND_ITEMS = [
  {
    label: 'Fire Severity',
    items: [
      { color: 'bg-red-500', text: 'Critical' },
      { color: 'bg-orange-500', text: 'High' },
      { color: 'bg-yellow-500', text: 'Moderate' },
      { color: 'bg-yellow-300', text: 'Low' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { color: 'bg-emerald-500', text: 'Available' },
      { color: 'bg-blue-500', text: 'Deployed' },
      { color: 'bg-yellow-400', text: 'En Route' },
      { color: 'bg-gray-500', text: 'Maintenance' },
    ],
  },
  {
    label: 'Evacuation',
    items: [
      { color: 'bg-red-500/50', text: 'Immediate', border: true },
      { color: 'bg-orange-500/50', text: 'Warning', border: true },
      { color: 'bg-yellow-500/50', text: 'Watch', border: true },
    ],
  },
];

export function MapLegend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-16 left-4 z-30">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="glass-panel rounded-lg px-3 py-1.5 flex items-center gap-2 border border-white/5 text-xs text-muted-foreground hover:text-white transition-colors cursor-pointer"
      >
        <span className="font-medium">Legend</span>
        {collapsed ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )}
      </button>

      {!collapsed && (
        <div className="glass-panel rounded-lg border border-white/5 mt-1 p-3 space-y-2.5 min-w-[140px]">
          {LEGEND_ITEMS.map((group) => (
            <div key={group.label}>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <div key={item.text} className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-sm ${item.color} ${
                        'border' in item && item.border
                          ? 'border border-white/20'
                          : ''
                      }`}
                    />
                    <span className="text-[10px] text-gray-400">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
              Other
            </p>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-4 rounded-sm bg-gradient-to-r from-yellow-200 via-orange-400 to-red-700" />
                <span className="text-[10px] text-gray-400">Heat Map</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-blue-400 rounded" />
                <span className="text-[10px] text-gray-400">Deploy Arc</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-4 rounded-sm bg-red-500/20 border border-red-500/40" />
                <span className="text-[10px] text-gray-400">Spread Pred.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
