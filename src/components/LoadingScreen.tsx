'use client';

import { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';

const STAGES = [
  'Connecting to NASA FIRMS...',
  'Downloading VIIRS NOAA-20 data...',
  'Clustering fire detections...',
  'Initializing Palantir AIP Agent...',
  'Loading map terrain...',
];

export function LoadingScreen() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col items-center justify-center z-[100]">
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-3xl bg-orange-500/20 rounded-full scale-150 animate-pulse" />
        <Flame className="h-16 w-16 text-orange-500 relative z-10 animate-pulse" />
      </div>

      <h1 className="text-2xl font-bold tracking-[0.3em] text-white uppercase mb-1">
        FireCommand
      </h1>
      <p className="text-[10px] text-muted-foreground/50 tracking-[0.4em] uppercase mb-8">
        Palantir Foundry
      </p>

      <div className="flex flex-col items-center gap-4 w-64">
        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground h-4">
          {STAGES[stage]}
        </p>

        {/* Stage dots */}
        <div className="flex gap-1.5">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                i <= stage ? 'bg-orange-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 flex items-center gap-2 text-[10px] text-muted-foreground/40 tracking-wider">
        <span>NASA FIRMS</span>
        <span className="text-white/10">\u00b7</span>
        <span>VIIRS NOAA-20</span>
        <span className="text-white/10">\u00b7</span>
        <span>Weather.gov</span>
        <span className="text-white/10">\u00b7</span>
        <span>Palantir AIP</span>
      </div>
    </div>
  );
}
