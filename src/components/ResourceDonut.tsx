'use client';

interface Segment {
  label: string;
  count: number;
  color: string;
}

interface ResourceDonutProps {
  segments: Segment[];
  total: number;
}

export function ResourceDonut({ segments, total }: ResourceDonutProps) {
  const size = 80;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {segments.map((seg) => {
          const segLength = (seg.count / total) * circumference;
          const offset = cumulativeOffset;
          cumulativeOffset += segLength;
          if (seg.count === 0) return null;
          return (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segLength} ${circumference - segLength}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          );
        })}
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white font-bold text-lg rotate-90"
          style={{ transformOrigin: 'center' }}
        >
          {total}
        </text>
      </svg>
      <div className="space-y-1">
        {segments.map((seg) => (
          seg.count > 0 && (
            <div key={seg.label} className="flex items-center gap-2 text-[10px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-muted-foreground">{seg.label}</span>
              <span className="text-white font-medium">{seg.count}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
