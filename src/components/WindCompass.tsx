'use client';

interface WindCompassProps {
  direction: number; // degrees, 0 = N
  speed: number;
}

export function WindCompass({ direction, speed }: WindCompassProps) {
  // Color intensity based on wind speed (higher = redder)
  const speedColor = speed > 25 ? '#ef4444' : speed > 15 ? '#f97316' : '#3b82f6';
  const speedBg = speed > 25 ? 'rgba(239,68,68,0.1)' : speed > 15 ? 'rgba(249,115,22,0.1)' : 'rgba(59,130,246,0.05)';

  return (
    <div
      className="relative w-16 h-16 rounded-full border border-white/10 flex items-center justify-center"
      style={{ background: speedBg }}
    >
      {/* Tick marks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div
          key={deg}
          className="absolute w-px h-1.5 bg-white/15"
          style={{
            transform: `rotate(${deg}deg) translateY(-28px)`,
            transformOrigin: 'center center',
          }}
        />
      ))}

      {/* Cardinal labels */}
      <span className="absolute top-0.5 text-[7px] font-bold text-white/60">N</span>
      <span className="absolute bottom-0.5 text-[7px] text-white/30">S</span>
      <span className="absolute left-1 text-[7px] text-white/30">W</span>
      <span className="absolute right-1 text-[7px] text-white/30">E</span>

      {/* Wind arrow */}
      <svg
        viewBox="0 0 40 40"
        className="w-10 h-10 transition-transform duration-700 ease-out"
        style={{ transform: `rotate(${direction}deg)` }}
      >
        <defs>
          <linearGradient id="wind-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={speedColor} />
            <stop offset="100%" stopColor={speedColor} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* Arrow pointing from center outward in wind direction */}
        <path
          d="M20 5 L24.5 18 L20 15.5 L15.5 18 Z"
          fill="url(#wind-grad)"
          stroke={speedColor}
          strokeWidth="0.5"
          strokeOpacity="0.5"
        />
        {/* Tail line */}
        <line x1="20" y1="15.5" x2="20" y2="35" stroke={speedColor} strokeWidth="1.5" opacity="0.2" />
      </svg>

      {/* Speed in center */}
      <span className="absolute text-[10px] font-bold tabular-nums" style={{ color: speedColor }}>
        {Math.round(speed)}
      </span>
    </div>
  );
}
