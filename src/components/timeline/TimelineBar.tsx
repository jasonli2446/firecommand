'use client';

import { Play, Pause, Clock, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAppStore } from '@/store/app-store';
import { useEffect, useMemo, useRef } from 'react';

const SPARKLINE_BINS = 80;

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
      .map((d) => new Date(d.acquiredAt).getTime())
      .sort((a, b) => a - b);
  }, [fireDetections]);

  const timeRange = useMemo(() => {
    if (!sortedTimestamps.length)
      return { min: Date.now() - 86400000, max: Date.now() };
    return {
      min: sortedTimestamps[0],
      max: sortedTimestamps[sortedTimestamps.length - 1],
    };
  }, [sortedTimestamps]);

  const currentTime = new Date(
    timeRange.min + (timeRange.max - timeRange.min) * timelinePosition
  );

  // Binary search for visible count
  const visibleCount = useMemo(() => {
    if (!sortedTimestamps.length) return 0;
    const cutoff =
      timeRange.min + (timeRange.max - timeRange.min) * timelinePosition;
    let lo = 0,
      hi = sortedTimestamps.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sortedTimestamps[mid] <= cutoff) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }, [sortedTimestamps, timelinePosition, timeRange]);

  // Sparkline: histogram of detections over time
  const sparkline = useMemo(() => {
    if (!sortedTimestamps.length) return new Array(SPARKLINE_BINS).fill(0);
    const bins = new Array(SPARKLINE_BINS).fill(0);
    const range = timeRange.max - timeRange.min || 1;
    for (const ts of sortedTimestamps) {
      const bin = Math.min(
        SPARKLINE_BINS - 1,
        Math.floor(((ts - timeRange.min) / range) * SPARKLINE_BINS)
      );
      bins[bin]++;
    }
    return bins;
  }, [sortedTimestamps, timeRange]);

  const sparklineMax = Math.max(...sparkline, 1);

  // Time labels
  const startLabel = new Date(timeRange.min).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const endLabel = new Date(timeRange.max).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/5">
      <div className="flex items-center gap-3 h-16 px-4">
        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTimelinePosition(0);
              setIsPlaying(false);
            }}
            className="h-7 w-7 p-0"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
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
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 4].map((speed) => (
            <Button
              key={speed}
              variant={playbackSpeed === speed ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPlaybackSpeed(speed)}
              className="h-6 px-1.5 text-[10px]"
            >
              {speed}x
            </Button>
          ))}
        </div>

        {/* Sparkline + Slider */}
        <div className="flex-1 flex flex-col gap-0 min-w-0">
          {/* Sparkline visualization */}
          <div className="flex items-end h-5 gap-px px-0.5">
            {sparkline.map((count, i) => {
              const height = Math.max(1, (count / sparklineMax) * 20);
              const isActive = i / SPARKLINE_BINS <= timelinePosition;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-colors duration-150"
                  style={{
                    height: `${height}px`,
                    backgroundColor: isActive
                      ? count > sparklineMax * 0.7
                        ? 'rgba(255, 80, 40, 0.8)'
                        : count > sparklineMax * 0.3
                          ? 'rgba(255, 160, 50, 0.6)'
                          : 'rgba(255, 200, 80, 0.4)'
                      : 'rgba(255, 255, 255, 0.08)',
                  }}
                />
              );
            })}
          </div>

          {/* Slider */}
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

          {/* Time labels */}
          <div className="flex justify-between text-[9px] text-muted-foreground px-0.5 -mt-0.5">
            <span>{startLabel}</span>
            <span>{endLabel}</span>
          </div>
        </div>

        {/* Current time + stats */}
        <div className="text-right shrink-0 min-w-[120px]">
          <div className="flex items-center gap-1.5 justify-end">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs font-mono text-white">
              {currentTime.toLocaleTimeString()}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {currentTime.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <p className="text-[10px] text-orange-400/80 font-medium">
            {visibleCount.toLocaleString()} detections
          </p>
        </div>
      </div>
    </div>
  );
}
