/**
 * Half away from zero, per semantics §9. Nudges by a relative epsilon first so
 * that values like 2.675, which are slightly below .675 in binary, still round
 * the way the decimal literal reads.
 */
export function roundHalfAwayFromZero(x: number, places: number): number {
  if (!Number.isFinite(x)) return x;
  // Scale by multiplying in both directions; dividing by 10^-n reintroduces
  // exactly the representation error the nudge is there to remove.
  const f = Math.pow(10, Math.abs(places));
  const y = places >= 0 ? x * f : x / f;
  const nudged = Math.abs(y) * (1 + Number.EPSILON * 8);
  const r = Math.sign(y) * Math.round(nudged);
  return places >= 0 ? r / f : r * f;
}

export function truncToward(x: number, places: number, away: boolean): number {
  if (!Number.isFinite(x)) return x;
  const f = Math.pow(10, Math.abs(places));
  const y = places >= 0 ? x * f : x / f;
  const op = away ? Math.ceil : Math.floor;
  const r = Math.sign(y) * op(Math.abs(y) * (1 - Number.EPSILON * 8));
  return places >= 0 ? r / f : r * f;
}
