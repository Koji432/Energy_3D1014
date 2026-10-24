// TubeGeometry samples by arc length. Particles and the reveal front must use
// that same parameter, including on curved wires with uneven control points.
export function arcSamples(curve, count = 500) {
  return Array.from({ length: count + 1 }, (_, i) => curve.getPointAt(i / count));
}

export function revealRange(geometry, amount, reverse = false) {
  const segments = geometry.parameters.tubularSegments;
  const ringIndices = geometry.parameters.radialSegments * 6;
  const rings = Math.floor(Math.max(0, Math.min(1, amount)) * segments);
  return {
    start: reverse ? (segments - rings) * ringIndices : 0,
    count: rings * ringIndices,
    front: rings / segments
  };
}
