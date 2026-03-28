'use client';

import { useState, useEffect } from 'react';
import { X, Activity, Brain, Truck, Shield, Loader2, Trash2, Zap, Check, FileText, TrendingUp, TrendingDown, Minus, Flame, Plane, Users, Tractor, Droplets } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// ScrollArea from base-ui doesn't scroll in flex layouts — use native overflow
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/app-store';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useAIAgent } from '@/hooks/useAIAgent';
import { WindCompass } from '@/components/WindCompass';
import { generateICS209 } from '@/lib/ics209-export';
import { ICS209Modal } from '@/components/ICS209Modal';
import { ResourceDonut } from '@/components/ResourceDonut';
import { OntologyGraph } from '@/components/OntologyGraph';

const SEVERITY_BADGE_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-500/20 text-emerald-400',
  deployed: 'bg-blue-500/20 text-blue-400',
  en_route: 'bg-yellow-500/20 text-yellow-400',
  maintenance: 'bg-gray-500/20 text-gray-400',
};

const RISK_COLORS: Record<string, string> = {
  immediate: 'bg-red-500/20 text-red-400',
  warning: 'bg-orange-500/20 text-orange-400',
  watch: 'bg-yellow-500/20 text-yellow-400',
};

const RESOURCE_TYPE_ICONS: Record<string, typeof Flame> = {
  engine: Flame,
  helicopter: Plane,
  hand_crew: Users,
  air_tanker: Plane,
  dozer: Tractor,
  water_tender: Droplets,
};

const CONTAINMENT_PER_TYPE: Record<string, number> = {
  helicopter: 10,
  air_tanker: 12,
  engine: 6,
  hand_crew: 5,
  dozer: 8,
  water_tender: 4,
};

function getContainment(clusterId: string, resources: { type: string; status: string; assignedClusterId: string | null }[]): number {
  const deployed = resources.filter(
    (r) => r.assignedClusterId === clusterId && (r.status === 'deployed' || r.status === 'en_route')
  );
  const total = deployed.reduce((sum, r) => sum + (CONTAINMENT_PER_TYPE[r.type] || 3), 0);
  return Math.min(85, total); // Cap at 85% — never auto-reaches 100%
}

export function CommandPanel() {
  const {
    fireClusters,
    resources,
    evacuationZones,
    selectedClusterId,
    panelOpen,
    activeTab,
    setPanelOpen,
    setActiveTab,
    deployResource,
    recallResource,
    executeAIPlan,
  } = useAppStore();

  const { isAnalyzing, recommendation, error, analyze, clearRecommendation } =
    useAIAgent();

  const [ics209Report, setIcs209Report] = useState<string | null>(null);

  const selectedCluster = fireClusters.find((c) => c.id === selectedClusterId);

  const { weather } = useWeatherData(
    selectedCluster ? selectedCluster.centroid[1] : null,
    selectedCluster ? selectedCluster.centroid[0] : null
  );

  // Push wind primitives to store so FireMap can use real wind direction
  const setSelectedWind = useAppStore((s) => s.setSelectedWind);
  useEffect(() => {
    setSelectedWind(
      weather?.windDirection ?? null,
      weather?.windSpeed ?? null
    );
  }, [weather?.windDirection, weather?.windSpeed, setSelectedWind]);

  // Register analyze function with store for demo mode
  const setTriggerAIAnalyze = useAppStore((s) => s.setTriggerAIAnalyze);
  useEffect(() => {
    setTriggerAIAnalyze(() => analyze(weather));
    return () => setTriggerAIAnalyze(null);
  }, [analyze, weather, setTriggerAIAnalyze]);

  if (!panelOpen) return null;

  return (
    <>
      <div className="fixed top-12 right-0 bottom-16 w-[420px] z-40 glass-panel border-l border-white/5 flex flex-col panel-enter">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-blue-500 rounded-full" />
          <span className="text-sm font-semibold text-white tracking-wide">Command</span>
          <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">Panel</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPanelOpen(false)}
          className="h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid w-full grid-cols-4 bg-white/5 rounded-none border-b border-white/5 h-10">
          <TabsTrigger
            value="overview"
            className="text-xs gap-1 data-[state=active]:bg-white/10"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="text-xs gap-1 data-[state=active]:bg-white/10"
          >
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">AI</span>
          </TabsTrigger>
          <TabsTrigger
            value="resources"
            className="text-xs gap-1 data-[state=active]:bg-white/10"
          >
            <Truck className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Resources</span>
          </TabsTrigger>
          <TabsTrigger
            value="evacuations"
            className="text-xs gap-1 data-[state=active]:bg-white/10"
          >
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Evac</span>
          </TabsTrigger>
        </TabsList>

        <div className="h-0 flex-grow overflow-y-auto">
          <TabsContent value="overview" className="p-4 mt-0 space-y-4">
            {selectedCluster ? (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {selectedCluster.name}
                  </h3>
                  <Badge
                    className={
                      SEVERITY_BADGE_COLORS[selectedCluster.severity]
                    }
                  >
                    {selectedCluster.severity.toUpperCase()}
                  </Badge>
                  {(() => {
                    const pct = getContainment(selectedCluster.id, resources);
                    if (pct >= 40) return (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] gap-0.5">
                        <TrendingDown className="h-3 w-3" /> Stabilizing
                      </Badge>
                    );
                    if (pct > 0) return (
                      <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-[10px] gap-0.5">
                        <Minus className="h-3 w-3" /> Contested
                      </Badge>
                    );
                    if (selectedCluster.severity === 'critical' || selectedCluster.severity === 'high') return (
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px] gap-0.5">
                        <TrendingUp className="h-3 w-3" /> Intensifying
                      </Badge>
                    );
                    return null;
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Fire Power (FRP)"
                    value={selectedCluster.totalFRP.toString()}
                  />
                  <MetricCard
                    label="Est. Acres"
                    value={selectedCluster.estimatedAcres.toLocaleString()}
                  />
                  <MetricCard
                    label="Detections"
                    value={selectedCluster.points.length.toString()}
                  />
                  <MetricCard
                    label="Hours Active"
                    value={Math.round(
                      (Date.now() -
                        selectedCluster.firstDetected.getTime()) /
                        3600000
                    ).toString()}
                  />
                </div>

                {/* Containment Progress */}
                {(() => {
                  const pct = getContainment(selectedCluster.id, resources);
                  const color =
                    pct >= 60 ? 'bg-emerald-500' :
                    pct >= 40 ? 'bg-yellow-500' :
                    pct >= 20 ? 'bg-orange-500' :
                    'bg-red-500';
                  const textColor =
                    pct >= 60 ? 'text-emerald-400' :
                    pct >= 40 ? 'text-yellow-400' :
                    pct >= 20 ? 'text-orange-400' :
                    'text-red-400';
                  return (
                    <Card className="bg-white/5 border-white/5">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Containment</span>
                          <span className={`text-lg font-bold tabular-nums ${textColor}`}>{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {pct === 0 ? 'No resources deployed — deploy units to contain' : pct >= 60 ? 'Strong containment — maintain pressure' : 'Deploy more resources to increase containment'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })()}

                <Separator className="bg-white/5" />

                {weather && (
                  <Card className="bg-white/5 border-white/5">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <CardTitle className="text-sm text-muted-foreground">
                        Weather at Fire
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                      <div className="flex gap-3">
                        <WindCompass
                          direction={weather.windDirection}
                          speed={weather.windSpeed}
                        />
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm flex-1">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Wind</span>
                            <p className="text-white font-medium text-sm">
                              {weather.windSpeed} mph{' '}
                              {getCardinalDirection(weather.windDirection)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Gusts</span>
                            <p className="text-white font-medium text-sm">
                              {Math.round(weather.windGust)} mph
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Temp</span>
                            <p className="text-white font-medium text-sm">
                              {weather.temperature}°F
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Humidity</span>
                            <p className="text-white font-medium text-sm">
                              {weather.humidity}%
                            </p>
                          </div>
                        </div>
                      </div>
                      {weather.isFireWeatherWarning && (
                        <Badge variant="destructive" className="mt-2 text-xs glow-red">
                          FIRE WEATHER WARNING
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Deployed resources for this cluster */}
                {(() => {
                  const deployedToCluster = resources.filter(
                    (r) => r.assignedClusterId === selectedCluster.id
                  );
                  if (deployedToCluster.length === 0) return null;
                  const typeCounts: Record<string, number> = {};
                  for (const r of deployedToCluster) {
                    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
                  }
                  const typeColors: Record<string, string> = {
                    engine: '#ef4444', helicopter: '#3b82f6', hand_crew: '#eab308',
                    air_tanker: '#a855f7', dozer: '#f97316', water_tender: '#06b6d4',
                  };
                  return (
                    <Card className="bg-white/5 border-white/5">
                      <CardHeader className="pb-2 pt-3 px-3">
                        <CardTitle className="text-sm text-muted-foreground">
                          Deployed Resources ({deployedToCluster.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 space-y-2">
                        {/* Type breakdown bar */}
                        <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                          {Object.entries(typeCounts).map(([type, count]) => (
                            <div
                              key={type}
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${(count / deployedToCluster.length) * 100}%`,
                                backgroundColor: typeColors[type] || '#888',
                              }}
                              title={`${count} ${type.replace('_', ' ')}${count > 1 ? 's' : ''}`}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {Object.entries(typeCounts).map(([type, count]) => (
                            <span key={type} className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: typeColors[type] || '#888' }} />
                              {count} {type.replace('_', ' ')}{count > 1 ? 's' : ''}
                            </span>
                          ))}
                        </div>
                        {deployedToCluster.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-white">{r.name}</span>
                            <Badge
                              className={`text-[10px] ${STATUS_COLORS[r.status]}`}
                            >
                              {r.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })()}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-white border border-white/5 hover:border-white/10"
                  onClick={() => {
                    const report = generateICS209(selectedCluster, resources, evacuationZones, weather);
                    setIcs209Report(report);
                  }}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Export ICS-209 Report
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    First detected:{' '}
                    {selectedCluster.firstDetected.toLocaleString()}
                  </p>
                  <p>
                    Last detected:{' '}
                    {selectedCluster.lastDetected.toLocaleString()}
                  </p>
                  <p>
                    Coords: {selectedCluster.centroid[1].toFixed(4)},{' '}
                    {selectedCluster.centroid[0].toFixed(4)}
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground py-4">
                  <Activity className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">
                    Click a fire on the map to view details
                  </p>
                </div>

                {/* Threat Level */}
                {(() => {
                  const critCount = fireClusters.filter((c) => c.severity === 'critical').length;
                  const highCount = fireClusters.filter((c) => c.severity === 'high').length;
                  const totalFRP = fireClusters.reduce((s, c) => s + c.totalFRP, 0);
                  const level = critCount >= 2 || totalFRP > 500 ? 'EXTREME' :
                                critCount >= 1 || highCount >= 3 ? 'HIGH' :
                                highCount >= 1 || totalFRP > 100 ? 'ELEVATED' : 'GUARDED';
                  const levelColor = level === 'EXTREME' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                                    level === 'HIGH' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                                    level === 'ELEVATED' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                                    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  const barColor = level === 'EXTREME' ? 'bg-red-500' :
                                  level === 'HIGH' ? 'bg-orange-500' :
                                  level === 'ELEVATED' ? 'bg-yellow-500' : 'bg-emerald-500';
                  const barWidth = level === 'EXTREME' ? '100%' : level === 'HIGH' ? '75%' : level === 'ELEVATED' ? '50%' : '25%';
                  return (
                    <Card className={`border ${levelColor}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Threat Level</span>
                          <span className="text-sm font-bold tracking-wider">{level}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all duration-1000`} style={{ width: barWidth }} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Operational Summary */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Operational Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                      label="Active Fires"
                      value={fireClusters.length.toString()}
                    />
                    <MetricCard
                      label={fireClusters.some((c) => c.severity === 'critical') ? 'Critical' : 'High Sev.'}
                      value={(fireClusters.some((c) => c.severity === 'critical')
                        ? fireClusters.filter((c) => c.severity === 'critical').length
                        : fireClusters.filter((c) => c.severity === 'high').length
                      ).toString()}
                    />
                    <MetricCard
                      label="Total Acres"
                      value={fireClusters
                        .reduce((s, c) => s + c.estimatedAcres, 0)
                        .toLocaleString()}
                    />
                    <MetricCard
                      label="Detections"
                      value={fireClusters
                        .reduce((s, c) => s + c.points.length, 0)
                        .toLocaleString()}
                    />
                  </div>
                </div>

                {/* Top fires by severity */}
                {fireClusters.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Fires by Severity
                    </h3>
                    <div className="space-y-1">
                      {[...fireClusters]
                        .sort((a, b) => b.totalFRP - a.totalFRP)
                        .slice(0, 6)
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() => useAppStore.getState().selectCluster(c.id)}
                            className="w-full flex items-center justify-between py-1.5 px-2 rounded bg-white/5 hover:bg-white/10 transition-colors text-sm cursor-pointer"
                          >
                            <span className="text-white font-medium truncate">
                              {c.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {(() => {
                                const pct = getContainment(c.id, resources);
                                if (pct > 0) {
                                  const clr = pct >= 60 ? 'text-emerald-400' : pct >= 40 ? 'text-yellow-400' : 'text-orange-400';
                                  return <span className={`text-[10px] font-bold tabular-nums ${clr}`}>{pct}%</span>;
                                }
                                return null;
                              })()}
                              <span className="text-[10px] text-muted-foreground">
                                {c.estimatedAcres.toLocaleString()} ac
                              </span>
                              <Badge
                                className={`text-[10px] ${SEVERITY_BADGE_COLORS[c.severity]}`}
                              >
                                {c.severity.toUpperCase()}
                              </Badge>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Resource status summary */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Resource Readiness
                  </h3>
                  <ResourceDonut
                    total={resources.length}
                    segments={[
                      { label: 'Available', count: resources.filter(r => r.status === 'available').length, color: '#22c55e' },
                      { label: 'Deployed', count: resources.filter(r => r.status === 'deployed').length, color: '#3b82f6' },
                      { label: 'En Route', count: resources.filter(r => r.status === 'en_route').length, color: '#facc15' },
                      { label: 'Maintenance', count: resources.filter(r => r.status === 'maintenance').length, color: '#6b7280' },
                    ]}
                  />
                </div>

                {/* Ontology visualization */}
                <OntologyGraph />
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="p-4 mt-0">
            <div className="space-y-3">
              {!recommendation && !isAnalyzing && (
                <div className="text-center text-muted-foreground py-6">
                  <div className="relative mx-auto w-14 h-14 mb-4">
                    <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-pulse" />
                    <div className="absolute inset-2 rounded-full bg-blue-500/5 border border-blue-500/20 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-blue-400/80" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white mb-0.5">Palantir AIP Agent</p>
                  <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-3">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 align-middle" />
                    Connected
                  </p>
                  <p className="text-xs mb-4 text-muted-foreground">
                    {selectedCluster
                      ? `Analyze ${selectedCluster.name} — fire data, weather, and resources`
                      : 'Select a fire on the map to analyze'}
                  </p>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                    disabled={!selectedCluster}
                    onClick={() => analyze(weather)}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Situation
                  </Button>
                </div>
              )}

              {isAnalyzing && !recommendation && (
                <div className="space-y-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-400 font-medium">AIP Agent analyzing...</p>
                      <p className="text-[10px] text-muted-foreground">Processing fire data, weather, and resources</p>
                    </div>
                  </div>
                  {/* Skeleton loading bars */}
                  <div className="space-y-2 pt-1">
                    <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-white/5 rounded animate-pulse w-full" />
                    <div className="h-3 bg-white/5 rounded animate-pulse w-5/6" />
                    <div className="h-3 bg-white/5 rounded animate-pulse w-2/3" style={{ animationDelay: '0.15s' }} />
                    <div className="h-3 bg-white/5 rounded animate-pulse w-4/5" style={{ animationDelay: '0.3s' }} />
                    <div className="h-3 bg-white/5 rounded animate-pulse w-3/5" style={{ animationDelay: '0.45s' }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                  {error}
                </div>
              )}

              {recommendation && (
                <>
                  <div className="flex items-center justify-between">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                      disabled={isAnalyzing}
                      onClick={() => analyze(weather)}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4 mr-2" />
                      )}
                      {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRecommendation}
                      className="text-muted-foreground hover:text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>

                  <div
                    className={`text-sm text-gray-300 leading-relaxed ai-recommendation-content ${isAnalyzing ? 'ai-streaming' : ''}`}
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(recommendation),
                    }}
                  />

                  <ExecuteButton onExecute={() => executeAIPlan(recommendation)} />
                </>
              )}

              <div className="pt-3 border-t border-white/5">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                  Powered by Palantir AIP
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="p-4 mt-0 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Resources</h3>
              <span className="text-xs text-muted-foreground">
                {resources.length} total
              </span>
            </div>
            {[
              'engine',
              'helicopter',
              'hand_crew',
              'air_tanker',
              'dozer',
              'water_tender',
            ].map((type) => {
              const typeResources = resources.filter((r) => r.type === type);
              if (typeResources.length === 0) return null;
              const available = typeResources.filter(
                (r) => r.status === 'available'
              ).length;
              const TypeIcon = RESOURCE_TYPE_ICONS[type];
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {TypeIcon && <TypeIcon className="h-3 w-3 text-muted-foreground/60" />}
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {type.replace('_', ' ')}s
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {available}/{typeResources.length} avail
                    </span>
                  </div>
                  {typeResources.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-white/5 text-sm gap-2"
                    >
                      <span className="text-white truncate flex-1">{r.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={`text-[10px] ${STATUS_COLORS[r.status]}`}>
                          {r.status.replace('_', ' ')}
                        </Badge>
                        {selectedClusterId && r.status === 'available' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            onClick={() => deployResource(r.id, selectedClusterId)}
                          >
                            Deploy
                          </Button>
                        )}
                        {(r.status === 'deployed' || r.status === 'en_route') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            onClick={() => recallResource(r.id)}
                          >
                            Recall
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="evacuations" className="p-4 mt-0 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">
                Evacuation Zones
              </h3>
              <span className="text-xs text-muted-foreground">
                {evacuationZones.length} active
              </span>
            </div>
            {evacuationZones.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Shield className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No active evacuation zones</p>
              </div>
            ) : (
              evacuationZones.map((zone) => {
                const fire = fireClusters.find(
                  (c) => c.id === zone.clusterId
                );
                return (
                  <Card key={zone.id} className="bg-white/5 border-white/5">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">
                          {fire?.name || 'Unknown Fire'}
                        </span>
                        <Badge
                          className={`text-xs ${RISK_COLORS[zone.riskLevel]}`}
                        >
                          {zone.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>
                          Population: ~{zone.population.toLocaleString()}
                        </p>
                        <p>Radius: {zone.radiusMiles} miles</p>
                        <p>Issued: {zone.issuedAt.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </div>
      </Tabs>
      </div>

      {ics209Report && (
        <ICS209Modal
          report={ics209Report}
          onClose={() => setIcs209Report(null)}
        />
      )}
    </>
  );
}

function formatMarkdown(text: string): string {
  let html = text
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // --- horizontal rules
    .replace(
      /^---+$/gm,
      '<hr class="border-white/10 my-3" />'
    )
    // # top-level headings
    .replace(
      /^# (.+)$/gm,
      '<h2 class="text-white font-bold text-base mt-3 mb-2 tracking-wide">$1</h2>'
    )
    // ## headings
    .replace(
      /^## (.+)$/gm,
      '<h3 class="text-orange-400 font-bold text-sm mt-4 mb-2 pb-1 border-b border-white/10">$1</h3>'
    )
    // ### sub-headings
    .replace(
      /^### (.+)$/gm,
      '<h4 class="text-blue-400 font-semibold text-xs mt-3 mb-1.5 uppercase tracking-wider">$1</h4>'
    )
    // **bold**
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="text-white">$1</strong>'
    )
    // *italic*
    .replace(
      /\*([^*]+)\*/g,
      '<em class="text-gray-300 italic">$1</em>'
    )
    // Numbered lists: 1. text
    .replace(
      /^(\d+)\. (.+)$/gm,
      '<div class="flex gap-2 my-1.5"><span class="text-orange-400 font-medium shrink-0">$1.</span><span>$2</span></div>'
    )
    // Bullet points: - text
    .replace(
      /^- (.+)$/gm,
      '<div class="flex gap-2 my-1.5"><span class="text-orange-400 shrink-0">&bull;</span><span>$1</span></div>'
    )
    // Double newlines → paragraph breaks
    .replace(/\n\n/g, '<div class="my-2"></div>')
    // Single newlines → line breaks
    .replace(/\n/g, '<br />');

  return html;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-white/5 border-white/5">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      </CardContent>
    </Card>
  );
}

function ExecuteButton({ onExecute }: { onExecute: () => void }) {
  const [executed, setExecuted] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const actionLog = useAppStore((s) => s.actionLog);

  const handleExecute = () => {
    onExecute();
    setExecuted(true);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 700);
  };

  if (executed) {
    // Show the most recent deploy actions from the log
    const recentDeploys = actionLog
      .filter((e) => e.type === 'deploy')
      .slice(0, 8);

    return (
      <div className="space-y-2">
        {showFlash && (
          <div className="fixed inset-0 z-[80] execute-flash" />
        )}
        <div
          className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
          style={{ animation: 'panel-slide-in 0.3s ease-out' }}
        >
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-400 font-medium">
            Plan executed — {recentDeploys.length} resources deploying
          </span>
        </div>
        {recentDeploys.length > 0 && (
          <div className="space-y-0.5 pl-1">
            {recentDeploys.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-1.5 text-[11px] text-blue-400/80"
                style={{
                  animation: `panel-slide-in 0.4s ease-out ${i * 0.15}s both`,
                }}
              >
                <span className="h-1 w-1 rounded-full bg-blue-400/60 shrink-0" />
                {entry.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      className="w-full bg-orange-600 hover:bg-orange-700 text-white glow-orange animate-pulse"
      size="sm"
      onClick={handleExecute}
    >
      <Zap className="h-4 w-4 mr-2" />
      Execute Recommendation
    </Button>
  );
}

function getCardinalDirection(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degrees / 45) % 8];
}
