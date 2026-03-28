'use client';

import { Play, Pause, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAppStore } from '@/store/app-store';
import { useEffect, useMemo, useRef } from 'react';

export function TimelineBar() {
  const {
    fireDetections,
    timelinePosition,
    isPlaying,
    playbackSpeed,
    setTimelinePosition,
    setIsPlaying,
    setPlaybackSpeed,
  } = useAppStore();

  // Use ref for playback to avoid stale closures in interval
  const posRef = useRef(timelinePosition);
  posRef.current = timelinePosition;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const next = Math.min(1, posRef.current + 0.002 * playbackSpeed);
      if (next >= 0.999) {
        setTimelinePosition(1);
        setIsPlaying(false);
      } else {
        setTimelinePosition(next);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, setTimelinePosition, setIsPlaying]);

  // Pre-compute sorted timestamps once
  const sortedTimestamps = useMemo(() => {
    if (!fireDetections.length) return [];
    return fireDetections
      .map(d => new Date(d.acquiredAt).getTime())
      .sort((a, b) => a - b);
  }, [fireDetections]);

  const timeRange = useMemo(() => {
    if (!sortedTimestamps.length)
      return { min: Date.now() - 86400000, max: Date.now() };
    return { min: sortedTimestamps[0], max: sortedTimestamps[sortedTimestamps.length - 1] };
  }, [sortedTimestamps]);

  const currentTime = new Date(
    timeRange.min + (timeRange.max - timeRange.min) * timelinePosition
  );

  // Binary search for visible count
  const visibleCount = useMemo(() => {
    if (!sortedTimestamps.length) return 0;
    const cutoff = timeRange.min + (timeRange.max - timeRange.min) * timelinePosition;
    let lo = 0, hi = sortedTimestamps.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sortedTimestamps[mid] <= cutoff) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }, [sortedTimestamps, timelinePosition, timeRange]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/5">
      <div className="flex items-center gap-4 h-16 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (timelinePosition >= 0.999) setTimelinePosition(0);
            setIsPlaying(!isPlaying);
          }}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex items-center gap-1">
          {[1, 2, 4].map((speed) => (
            <Button
              key={speed}
              variant={playbackSpeed === speed ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPlaybackSpeed(speed)}
              className="h-7 px-2 text-xs"
            >
              {speed}x
            </Button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-3">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Slider
            value={[timelinePosition * 100]}
            onValueChange={(val) => {
              const v = Array.isArray(val) ? val[0] : val;
              setTimelinePosition(v / 100);
            }}
            max={100}
            step={0.5}
            className="flex-1"
          />
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs font-mono text-white">
            {currentTime.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {visibleCount} detections
          </p>
        </div>
      </div>
    </div>
  );
}
