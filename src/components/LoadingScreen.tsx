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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes radarPing {
          0% {
            transform: scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        @keyframes orbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .radar-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 80px;
          height: 80px;
          margin-left: -40px;
          margin-top: -40px;
          border: 2px solid rgba(249, 115, 22, 0.6);
          border-radius: 50%;
          animation: radarPing 2s ease-out infinite;
        }
        .radar-ring-1 {
          animation-delay: 0s;
        }
        .radar-ring-2 {
          animation-delay: 0.66s;
        }
        .radar-ring-3 {
          animation-delay: 1.33s;
        }
        .orbit-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 120px;
          height: 120px;
          margin-left: -60px;
          margin-top: -60px;
          border: 1px solid rgba(249, 115, 22, 0.3);
          border-radius: 50%;
          animation: orbit 8s linear infinite;
        }
        .orbit-ring::before {
          content: '';
          position: absolute;
          top: -3px;
          left: 50%;
          width: 6px;
          height: 6px;
          background: rgba(249, 115, 22, 0.8);
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.6);
        }
      `}} />
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-3xl bg-orange-500/20 rounded-full scale-150 animate-pulse" />
        <div className="radar-ring radar-ring-1" />
        <div className="radar-ring radar-ring-2" />
        <div className="radar-ring radar-ring-3" />
        <div className="orbit-ring" />
        <Flame className="h-16 w-16 text-orange-500 relative z-10 animate-pulse" />
      </div>

      <h1 className="text-2xl font-bold tracking-[0.3em] uppercase mb-1 text-gradient-fire">
        FireCommand
      </h1>
      <p className="text-[10px] text-muted-foreground/60 tracking-[0.4em] uppercase mb-8">
        Palantir Foundry
      </p>

      <div className="flex flex-col items-center gap-4 w-64">
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
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
