/**
 * Compute the convex hull of a set of [lng, lat] points using Graham scan,
 * then expand it slightly for visual padding.
 */
export function computeFirePerimeter(
  points: [number, number][],
  paddingMiles: number = 0.5
): [number, number][] {
  if (points.length < 3) return [];

  // Graham scan for convex hull
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const cross = (O: [number, number], A: [number, number], B: [number, number]) =>
    (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);

  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  const hull = [...lower, ...upper];

  if (hull.length < 3) return [];

  // Compute centroid
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;

  // Expand outward from centroid by paddingMiles
  const paddingDeg = paddingMiles / 69; // rough miles to degrees
  const expanded = hull.map(([lng, lat]): [number, number] => {
    const dx = lng - cx;
    const dy = lat - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.0001) return [lng, lat];
    const scale = (dist + paddingDeg) / dist;
    return [cx + dx * scale, cy + dy * scale];
  });

  // Close the polygon
  expanded.push(expanded[0]);

  return expanded;
}
