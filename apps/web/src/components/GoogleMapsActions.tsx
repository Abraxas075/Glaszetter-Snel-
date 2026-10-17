import React from 'react';
import { googleMapsLinks, type MapLocation } from '@glaszetter/shared';

interface Props {
  location?: MapLocation | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}
export function GoogleMapsActions({ location, loading, error, onRetry }: Props) {
  const links = googleMapsLinks(location);
  return (
    <div className="google-maps-actions">
      {loading ? (
        <p role="status">Adres laden…</p>
      ) : error ? (
        <>
          <p role="alert">{error}</p>
          {onRetry && (
            <button
              type="button"
              className="sapphire-button sapphire-button-secondary"
              onClick={onRetry}
            >
              Adres opnieuw laden
            </button>
          )}
        </>
      ) : !links ? (
        <p>Geen bruikbaar straatadres ingevuld voor Google Maps.</p>
      ) : (
        <>
          <p>{links.destination}</p>
          <div className="urgent-actions">
            <a
              className="sapphire-button sapphire-button-secondary"
              href={links.map}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Google Maps: ${links.destination} (nieuw tabblad)`}
            >
              Google Maps
            </a>
            <a
              className="sapphire-button sapphire-button-secondary"
              href={links.route}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Route starten: ${links.destination} (nieuw tabblad)`}
            >
              Route starten
            </a>
          </div>
        </>
      )}
    </div>
  );
}
