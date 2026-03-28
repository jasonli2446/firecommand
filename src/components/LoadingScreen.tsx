'use client';

import { Flame } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col items-center justify-center z-[100]">
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-2xl bg-orange-500/20 rounded-full animate-pulse" />
        <Flame className="h-16 w-16 text-orange-500 relative z-10 animate-pulse" />
      </div>

      <h1 className="text-2xl font-bold tracking-[0.3em] text-white uppercase mb-2">
        FireCommand
      </h1>
      <p className="text-sm text-muted-foreground tracking-widest uppercase mb-8">
        Wildfire Response Coordinator
      </p>

      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-orange-500/80"
              style={{
                animation: 'pulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground animate-pulse">
          Loading satellite fire detections...
        </p>
      </div>

      <div className="absolute bottom-8 flex items-center gap-2 text-xs text-muted-foreground/50">
        <span>NASA FIRMS</span>
        <span className="text-white/10">|</span>
        <span>VIIRS NOAA-20</span>
        <span className="text-white/10">|</span>
        <span>Palantir AIP</span>
      </div>
    </div>
  );
}
