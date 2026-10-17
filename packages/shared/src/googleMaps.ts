export interface MapLocation {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}
const clean = (value?: string | null) => (value ?? '').replace(/\s+/g, ' ').trim();

// A city on its own must never be presented as the customer's street address.
export function mapDestination(location?: MapLocation | null): string | null {
  if (!location || !clean(location.address)) return null;
  return [location.address, location.postalCode, location.city, location.country || 'Nederland']
    .map(clean)
    .filter(Boolean)
    .join(', ');
}
export function googleMapsLinks(location?: MapLocation | null) {
  const destination = mapDestination(location);
  if (!destination) return null;
  try {
    const query = encodeURIComponent(destination);
    const map = `https://www.google.com/maps/search/?api=1&query=${query}`;
    const route = `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`;
    return route.length <= 2048 ? { map, route, destination } : null;
  } catch {
    return null;
  }
}
export function meetbonMapLocation(fields: Record<string, string>): MapLocation | undefined {
  // Keep the form's address together. Never combine a new street with an old project city.
  if (![fields.street, fields.postalCode, fields.city].some((value) => clean(value)))
    return undefined;
  return { address: fields.street, postalCode: fields.postalCode, city: fields.city };
}
