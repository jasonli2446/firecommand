'use client';

interface WindCompassProps {
  direction: number; // degrees, 0 = N
  speed: number;
}

export function WindCompass({ direction, speed }: WindCompassProps) {
  return (
    <div className="relative w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
      {/* Cardinal labels */}
      <span className="absolute top-0.5 text-[8px] text-muted-foreground">N</span>
      <span className="absolute bottom-0.5 text-[8px] text-muted-foreground">S</span>
      <span className="absolute left-1 text-[8px] text-muted-foreground">W</span>
      <span className="absolute right-1 text-[8px] text-muted-foreground">E</span>

      {/* Wind arrow */}
      <svg
        viewBox="0 0 40 40"
        className="w-10 h-10"
        style={{ transform: `rotate(${direction}deg)` }}
      >
        <defs>
          <linearGradient id="wind-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {/* Arrow pointing from center outward in wind direction */}
        <path
          d="M20 6 L24 18 L20 16 L16 18 Z"
          fill="url(#wind-grad)"
        />
        <line x1="20" y1="16" x2="20" y2="34" stroke="#3b82f6" strokeWidth="1.5" opacity="0.3" />
      </svg>

      {/* Speed in center */}
      <span className="absolute text-[10px] font-bold text-white">
        {Math.round(speed)}
      </span>
    </div>
  );
}
