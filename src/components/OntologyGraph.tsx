'use client';

import { useAppStore } from '@/store/app-store';

const NODES = [
  { id: 'detection', label: 'FireDetection', x: 40, y: 80, color: '#ef4444' },
  { id: 'cluster', label: 'FireCluster', x: 160, y: 80, color: '#f97316' },
  { id: 'resource', label: 'Resource', x: 280, y: 30, color: '#3b82f6' },
  { id: 'evacuation', label: 'EvacZone', x: 280, y: 130, color: '#eab308' },
  { id: 'weather', label: 'Weather', x: 40, y: 130, color: '#06b6d4' },
];

const EDGES = [
  { from: 'detection', to: 'cluster', label: 'clusters_to' },
  { from: 'cluster', to: 'resource', label: 'deployed_to' },
  { from: 'cluster', to: 'evacuation', label: 'triggers' },
  { from: 'cluster', to: 'weather', label: 'weather_at' },
];

export function OntologyGraph() {
  const detectionCount = useAppStore((s) => s.fireDetections.length);
  const clusterCount = useAppStore((s) => s.fireClusters.length);
  const resourceCount = useAppStore((s) => s.resources.length);
  const evacCount = useAppStore((s) => s.evacuationZones.length);

  const counts: Record<string, number> = {
    detection: detectionCount,
    cluster: clusterCount,
    resource: resourceCount,
    evacuation: evacCount,
    weather: clusterCount > 0 ? 1 : 0,
  };

  return (
    <div className="glass-panel rounded-lg border border-white/10 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3 w-0.5 bg-purple-500 rounded-full" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Ontology</span>
      </div>
      <svg width="320" height="160" className="block">
        {/* Edges */}
        {EDGES.map((edge) => {
          const from = NODES.find((n) => n.id === edge.from)!;
          const to = NODES.find((n) => n.id === edge.to)!;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              <text
                x={midX} y={midY - 4}
                textAnchor="middle"
                className="fill-muted-foreground/30"
                fontSize="7"
                fontFamily="system-ui"
              >
                {edge.label}
              </text>
            </g>
          );
        })}
        {/* Nodes */}
        {NODES.map((node) => (
          <g key={node.id}>
            {/* Glow */}
            <circle cx={node.x} cy={node.y} r="18" fill={node.color} opacity="0.08" />
            {/* Node circle */}
            <circle cx={node.x} cy={node.y} r="12" fill="rgba(10,10,15,0.8)" stroke={node.color} strokeWidth="1.5" />
            {/* Count */}
            <text
              x={node.x} y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={node.color}
              fontSize="9"
              fontWeight="bold"
              fontFamily="system-ui"
            >
              {counts[node.id] || 0}
            </text>
            {/* Label */}
            <text
              x={node.x} y={node.y + 22}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize="8"
              fontFamily="system-ui"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
