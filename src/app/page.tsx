'use client';

import { useEffect } from 'react';
import { FireMap } from '@/components/map/FireMap';
import { AppHeader } from '@/components/header/AppHeader';
import { CommandPanel } from '@/components/panels/CommandPanel';
import { TimelineBar } from '@/components/timeline/TimelineBar';
import { useFireData } from '@/hooks/useFireData';
import { useAppStore } from '@/store/app-store';
import { generateResources } from '@/lib/mock-resources';

export default function Home() {
  const { isLoading, lastUpdated } = useFireData();
  const setResources = useAppStore((s) => s.setResources);

  useEffect(() => {
    setResources(generateResources());
  }, [setResources]);

  return (
    <div className="relative h-full w-full">
      <FireMap />
      <AppHeader lastUpdated={lastUpdated} isLoading={isLoading} />
      <CommandPanel />
      <TimelineBar />
    </div>
  );
}
