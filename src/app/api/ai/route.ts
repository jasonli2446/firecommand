import { NextRequest } from 'next/server';

const PALANTIR_FOUNDRY_URL = process.env.PALANTIR_FOUNDRY_URL;
const PALANTIR_TOKEN = process.env.PALANTIR_TOKEN;
const PALANTIR_AGENT_RID = process.env.PALANTIR_AGENT_RID;

interface ClusterData {
  id: string;
  name: string;
  severity: string;
  totalFRP: number;
  estimatedAcres: number;
  centroid: [number, number];
  pointCount: number;
  firstDetected: string;
  lastDetected: string;
}

interface ResourceData {
  id: string;
  name: string;
  type: string;
  status: string;
  homeBase: string;
  latitude: number;
  longitude: number;
}

interface EvacZoneData {
  id: string;
  riskLevel: string;
  population: number;
  radiusMiles: number;
}

interface WeatherData {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  windGust?: number;
}

interface RequestBody {
  clusters: ClusterData[];
  weather?: WeatherData;
  resources: ResourceData[];
  evacuationZones: EvacZoneData[];
  selectedClusterId: string | null;
}

function getCardinalDirection(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degrees / 45) % 8];
}

function getSpreadDirection(windDeg: number): string {
  // Fire spreads in the direction the wind is blowing (downwind)
  const dirs: Record<string, string> = {
    N: 'northward',
    NE: 'northeastward',
    E: 'eastward',
    SE: 'southeastward',
    S: 'southward',
    SW: 'southwestward',
    W: 'westward',
    NW: 'northwestward',
  };
  return dirs[getCardinalDirection(windDeg)] || 'multiple directions';
}

function buildMockResponse(body: RequestBody): string {
  const { clusters, weather, resources, evacuationZones, selectedClusterId } =
    body;

  const selected = clusters.find((c) => c.id === selectedClusterId);
  const criticalClusters = clusters
    .filter((c) => c.severity === 'critical')
    .sort((a, b) => b.totalFRP - a.totalFRP);
  const highClusters = clusters
    .filter((c) => c.severity === 'high')
    .sort((a, b) => b.totalFRP - a.totalFRP);

  const availableResources = resources.filter((r) => r.status === 'available');
  const deployedResources = resources.filter((r) => r.status === 'deployed');
  const helicopters = resources.filter((r) => r.type === 'helicopter');
  const engines = resources.filter((r) => r.type === 'engine');
  const airTankers = resources.filter((r) => r.type === 'air_tanker');
  const handCrews = resources.filter((r) => r.type === 'hand_crew');

  const totalPopAtRisk = evacuationZones.reduce(
    (sum, z) => sum + z.population,
    0
  );
  const immediateZones = evacuationZones.filter(
    (z) => z.riskLevel === 'immediate'
  );

  const windInfo =
    weather && weather.windSpeed !== undefined
      ? `${weather.windSpeed} mph from the ${getCardinalDirection(weather.windDirection ?? 0)}`
      : 'moderate';
  const spreadDir =
    weather && weather.windDirection !== undefined
      ? getSpreadDirection(weather.windDirection)
      : 'downslope';

  // Build situation assessment
  let situationText = `## SITUATION ASSESSMENT\n\n`;
  situationText += `**${clusters.length} active fire clusters** detected across the operational area. `;

  if (selected) {
    situationText += `The **${selected.name}** fire (currently selected) is rated **${selected.severity.toUpperCase()}** severity with a cumulative FRP of **${selected.totalFRP.toFixed(1)} MW** across ${selected.pointCount} detection points, burning an estimated **${selected.estimatedAcres.toLocaleString()} acres**.\n\n`;
  }

  if (criticalClusters.length > 0) {
    situationText += `**Critical fires requiring immediate attention:** ${criticalClusters.map((c) => `${c.name} (FRP: ${c.totalFRP.toFixed(1)} MW, ~${c.estimatedAcres.toLocaleString()} acres)`).join(', ')}.\n\n`;
  }

  if (weather) {
    situationText += `Current weather conditions show winds at **${windInfo}**`;
    if (weather.windGust) {
      situationText += ` with gusts to **${Math.round(weather.windGust)} mph**`;
    }
    situationText += `. Temperature is **${weather.temperature ?? '--'}°F** with **${weather.humidity ?? '--'}% relative humidity**. `;
    if (weather.humidity && weather.humidity < 20) {
      situationText += `**Low humidity is significantly increasing fire risk and rate of spread.**\n\n`;
    } else if (weather.humidity && weather.humidity < 30) {
      situationText += `Humidity levels are below optimal, contributing to elevated fire behavior.\n\n`;
    } else {
      situationText += `\n\n`;
    }
  }

  situationText += `Currently **${deployedResources.length}** resources deployed, **${availableResources.length}** available for assignment. ${totalPopAtRisk > 0 ? `Estimated **${totalPopAtRisk.toLocaleString()} residents** in active evacuation zones.` : 'No active evacuation zones.'}\n\n`;

  // Priority actions
  let priorityText = `## PRIORITY ACTIONS\n\n`;
  let actionNum = 1;

  if (selected && selected.severity === 'critical') {
    priorityText += `${actionNum}. **IMMEDIATE** - Concentrate aerial suppression on **${selected.name}**. This fire poses the highest threat with FRP at ${selected.totalFRP.toFixed(1)} MW and active spread ${spreadDir}.\n`;
    actionNum++;
  }

  if (criticalClusters.length > 0) {
    const topCritical =
      selected && criticalClusters[0].id === selected.id
        ? criticalClusters[1]
        : criticalClusters[0];
    if (topCritical) {
      priorityText += `${actionNum}. **IMMEDIATE** - Establish containment lines on the ${getCardinalDirection(weather?.windDirection ?? 180)} flank of **${topCritical.name}** to prevent further spread ${spreadDir}.\n`;
      actionNum++;
    }
  }

  if (immediateZones.length > 0) {
    priorityText += `${actionNum}. **IMMEDIATE** - Execute mandatory evacuation for ${immediateZones.length} zone(s) affecting ~${immediateZones.reduce((s, z) => s + z.population, 0).toLocaleString()} residents. Coordinate with local law enforcement for traffic management.\n`;
    actionNum++;
  }

  if (highClusters.length > 0) {
    priorityText += `${actionNum}. **WITHIN 1 HOUR** - Pre-position suppression resources near **${highClusters[0].name}** (~${highClusters[0].estimatedAcres.toLocaleString()} acres) before conditions deteriorate.\n`;
    actionNum++;
  }

  priorityText += `${actionNum}. **WITHIN 4 HOURS** - Request mutual aid from neighboring jurisdictions if additional aerial resources are needed. Current fleet may be insufficient for simultaneous multi-front operations.\n\n`;

  // Resource deployments
  let resourceText = `## RESOURCE DEPLOYMENTS\n\n`;

  if (selected) {
    const availHelos = helicopters.filter((h) => h.status === 'available');
    if (availHelos.length > 0) {
      resourceText += `- Deploy **${availHelos[0].name}** from ${availHelos[0].homeBase} to **${selected.name}** for aerial water drops on the active head. Estimated flight time: 15-25 minutes.\n`;
    }

    const availEngines = engines.filter((e) => e.status === 'available');
    if (availEngines.length > 0) {
      resourceText += `- Assign **${availEngines[0].name}** from ${availEngines[0].homeBase} to structure protection on the ${spreadDir} perimeter of **${selected.name}**.\n`;
    }
    if (availEngines.length > 1) {
      resourceText += `- Stage **${availEngines[1].name}** as backup suppression at the ${getCardinalDirection((weather?.windDirection ?? 180) + 180)} flank.\n`;
    }

    const availTankers = airTankers.filter((t) => t.status === 'available');
    if (availTankers.length > 0) {
      resourceText += `- Launch **${availTankers[0].name}** for retardant line deployment ahead of fire spread ${spreadDir}.\n`;
    }

    const availCrews = handCrews.filter((c) => c.status === 'available');
    if (availCrews.length > 0) {
      resourceText += `- Deploy **${availCrews[0].name}** for hand line construction on the southeast perimeter of **${selected.name}**.\n`;
    }
  } else {
    if (availableResources.length > 0) {
      resourceText += `- ${availableResources.length} resources standing by for assignment. Select a fire cluster to generate specific deployment recommendations.\n`;
    }
  }

  resourceText += `\n`;

  // Evacuation recommendations
  let evacText = `## EVACUATION RECOMMENDATIONS\n\n`;

  if (selected && selected.severity === 'critical') {
    evacText += `- **${selected.name}**: Recommend **IMMEDIATE** evacuation within ${evacuationZones.find((z) => z.riskLevel === 'immediate')?.radiusMiles ?? 3}-mile radius. Estimated ${evacuationZones.find((z) => z.riskLevel === 'immediate')?.population?.toLocaleString() ?? '2,000-5,000'} residents affected. Fire spread ${spreadDir} threatens residential areas.\n`;
  }

  if (highClusters.length > 0 && highClusters[0].id !== selected?.id) {
    evacText += `- **${highClusters[0].name}**: Issue **WARNING** level advisory. Residents within 5 miles should prepare for possible evacuation if wind conditions shift.\n`;
  }

  if (immediateZones.length === 0 && evacuationZones.length === 0) {
    evacText += `- No evacuation orders currently recommended. Continue monitoring fire perimeter expansion.\n`;
  }

  evacText += `- Ensure all shelter facilities are staffed and have capacity for potential evacuees. Coordinate with Red Cross for supplementary sheltering.\n\n`;

  // Fire behavior prediction
  let predictionText = `## FIRE BEHAVIOR PREDICTION\n\n`;

  if (selected) {
    predictionText += `**${selected.name}**: With current winds at ${windInfo}, expect continued spread **${spreadDir}** at an estimated rate of 150-300 acres/hour in grass/brush fuel types. `;
    if (weather && weather.humidity && weather.humidity < 25) {
      predictionText += `Critically low humidity (${weather.humidity}%) will sustain active crown fire behavior. `;
    }
    if (weather && weather.windGust && weather.windGust > 30) {
      predictionText += `Gust potential of ${Math.round(weather.windGust)} mph could produce spotting 0.5-1.0 miles ahead of the main fire front. `;
    }
    predictionText += `\n\n`;
  }

  if (criticalClusters.length > 1) {
    predictionText += `**Multi-fire scenario risk**: With ${criticalClusters.length} critical fires active simultaneously, resource competition is a concern. Prioritize suppression on fires threatening populated areas.\n\n`;
  }

  predictionText += `**Next 6-12 hours**: ${weather && weather.windSpeed && weather.windSpeed > 15 ? 'Sustained high winds will maintain extreme fire behavior through the operational period. Plan for overnight suppression operations.' : 'Wind conditions may moderate after sunset, providing a potential window for direct attack operations during evening hours.'}\n`;

  return (
    situationText +
    priorityText +
    resourceText +
    evacText +
    predictionText
  );
}

function createStreamFromText(text: string): ReadableStream {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    async pull(controller) {
      if (index >= text.length) {
        controller.close();
        return;
      }

      // Stream in small chunks (3-8 chars) for typewriter effect
      const chunkSize = Math.floor(Math.random() * 6) + 3;
      const chunk = text.slice(index, index + chunkSize);
      index += chunkSize;

      controller.enqueue(encoder.encode(chunk));

      // Small delay for typewriter effect (5-15ms)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * 10) + 5)
      );
    },
  });
}

async function callPalantirAgent(body: RequestBody): Promise<ReadableStream> {
  const prompt = buildPalantirPrompt(body);

  // Create a session
  const sessionRes = await fetch(
    `${PALANTIR_FOUNDRY_URL}/api/v2/aipAgents/agents/${PALANTIR_AGENT_RID}/sessions?preview=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PALANTIR_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agentVersion: '1.0' }),
    }
  );

  if (!sessionRes.ok) {
    const errText = await sessionRes.text();
    throw new Error(
      `Palantir session creation failed (${sessionRes.status}): ${errText}`
    );
  }

  const session = (await sessionRes.json()) as { rid: string };
  const sessionId = session.rid;

  // Send message and get response
  const continueRes = await fetch(
    `${PALANTIR_FOUNDRY_URL}/api/v2/aipAgents/agents/${PALANTIR_AGENT_RID}/sessions/${sessionId}/blockingContinue?preview=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PALANTIR_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput: {
          text: prompt,
        },
      }),
    }
  );

  if (!continueRes.ok) {
    const errText = await continueRes.text();
    throw new Error(
      `Palantir agent call failed (${continueRes.status}): ${errText}`
    );
  }

  const result = (await continueRes.json()) as {
    agentMarkdownResponse?: string;
    agentMarkdown?: string;
    messageContents?: Array<{ text?: string }>;
  };

  // Extract text from the response
  const responseText =
    result.agentMarkdownResponse ||
    result.agentMarkdown ||
    result.messageContents?.map((m) => m.text).join('\n') ||
    'No response from AI agent.';

  return createStreamFromText(responseText);
}

function buildPalantirPrompt(body: RequestBody): string {
  const { clusters, weather, resources, evacuationZones, selectedClusterId } =
    body;
  const selected = clusters.find((c) => c.id === selectedClusterId);

  let prompt = `You are an AI wildfire incident commander assistant. Analyze the following operational data and provide tactical recommendations.\n\n`;
  prompt += `Format your response with these markdown sections: ## SITUATION ASSESSMENT, ## PRIORITY ACTIONS, ## RESOURCE DEPLOYMENTS, ## EVACUATION RECOMMENDATIONS, ## FIRE BEHAVIOR PREDICTION\n\n`;

  prompt += `=== ACTIVE FIRES ===\n`;
  for (const c of clusters) {
    prompt += `- ${c.name}: Severity=${c.severity}, FRP=${c.totalFRP.toFixed(1)} MW, Est. ${c.estimatedAcres.toLocaleString()} acres, ${c.pointCount} detections, Location=(${c.centroid[1].toFixed(4)}, ${c.centroid[0].toFixed(4)})${c.id === selectedClusterId ? ' [SELECTED - PRIMARY FOCUS]' : ''}\n`;
  }

  if (weather) {
    prompt += `\n=== WEATHER ===\n`;
    prompt += `Wind: ${weather.windSpeed ?? '--'} mph from ${weather.windDirection !== undefined ? getCardinalDirection(weather.windDirection) : '--'}, Gusts: ${weather.windGust ? Math.round(weather.windGust) : '--'} mph\n`;
    prompt += `Temperature: ${weather.temperature ?? '--'}°F, Humidity: ${weather.humidity ?? '--'}%\n`;
  }

  prompt += `\n=== RESOURCES (${resources.length} total) ===\n`;
  for (const r of resources) {
    prompt += `- ${r.name} (${r.type}): ${r.status}, Base: ${r.homeBase}\n`;
  }

  if (evacuationZones.length > 0) {
    prompt += `\n=== EVACUATION ZONES (${evacuationZones.length} active) ===\n`;
    for (const z of evacuationZones) {
      prompt += `- Risk: ${z.riskLevel}, Population: ~${z.population.toLocaleString()}, Radius: ${z.radiusMiles} mi\n`;
    }
  }

  if (selected) {
    prompt += `\n=== FOCUS ===\nProvide detailed tactical analysis for the ${selected.name} fire. Include specific resource deployment recommendations by name.\n`;
  }

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    let stream: ReadableStream;

    // Try Palantir AIP Agent if configured
    if (PALANTIR_AGENT_RID && PALANTIR_FOUNDRY_URL && PALANTIR_TOKEN) {
      try {
        stream = await callPalantirAgent(body);
      } catch (err) {
        console.error('Palantir AIP Agent call failed, using mock fallback:', err);
        const mockText = buildMockResponse(body);
        stream = createStreamFromText(mockText);
      }
    } else {
      // Fallback to mock response
      const mockText = buildMockResponse(body);
      stream = createStreamFromText(mockText);
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('AI route error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
