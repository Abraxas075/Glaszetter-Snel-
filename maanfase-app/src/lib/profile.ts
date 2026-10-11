import { parseKey } from './dates';
import { moonPhaseAngle } from './moon';
import { zonedToUtc } from './tz';
import type { Profile } from './types';

/** Geboortemoment als UTC ("Wereldtijd"). */
export function birthUtc(p: Pick<Profile, 'birthDate' | 'birthTime' | 'birthTz'>): Date {
  const { y, m, d } = parseKey(p.birthDate);
  const [h, mi] = p.birthTime.split(':').map(Number);
  return zonedToUtc(y, m, d, h || 0, mi || 0, p.birthTz);
}

/** Persoonlijke geboortefase: hoek tussen zon en maan (graden). Handmatige invoer gaat voor. */
export function birthPhase(p: Pick<Profile, 'birthDate' | 'birthTime' | 'birthTz' | 'phaseOverride'>): number {
  return p.phaseOverride ?? moonPhaseAngle(birthUtc(p));
}
