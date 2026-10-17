'use client';
import React from 'react';
import { buildDayRoutes, type RouteStop } from '@glaszetter/shared';
export function DayRoute({
  stops,
  onChange,
  enabled,
}: {
  stops: RouteStop[];
  onChange: (stops: RouteStop[]) => void;
  enabled: boolean;
}) {
  let routes: ReturnType<typeof buildDayRoutes> = [],
    error = '';
  try {
    routes = buildDayRoutes(stops);
  } catch (err) {
    error = (err as Error).message;
  }
  function move(index: number, offset: number) {
    const next = [...stops];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }
  return (
    <section className="glass-panel urgent-card" aria-label="Dagroute">
      <h2>Dagroute</h2>
      <p>
        {enabled
          ? 'Voeg klussen en leveranciers toe. Pas hieronder de stopvolgorde aan.'
          : 'Kies Vandaag of Morgen om een dagroute samen te stellen.'}{' '}
        De eerste route begint vanaf je locatie in Google Maps. Gelijke adressen worden één keer
        bezocht.
      </p>
      <ol>
        {stops.map((stop, index) => (
          <li key={stop.key}>
            <strong>{stop.label}</strong>
            <div className="urgent-actions">
              <button
                type="button"
                disabled={!index}
                onClick={() => move(index, -1)}
                aria-label={`${stop.label} omhoog`}
              >
                Omhoog
              </button>
              <button
                type="button"
                disabled={index === stops.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`${stop.label} omlaag`}
              >
                Omlaag
              </button>
              <button
                type="button"
                onClick={() => onChange(stops.filter((item) => item.key !== stop.key))}
                aria-label={`${stop.label} verwijderen uit route`}
              >
                Verwijderen
              </button>
            </div>
          </li>
        ))}
      </ol>
      {!!stops.length && (
        <button
          type="button"
          className="sapphire-button sapphire-button-secondary"
          onClick={() => onChange([])}
        >
          Route wissen
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="urgent-actions">
        {routes.map((route, index) => (
          <a
            key={index}
            className="sapphire-button"
            href={route.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {routes.length === 1
              ? 'Dagroute openen in Google Maps'
              : `Routedeel ${index + 1} openen (${route.stops.length} stops)`}
          </a>
        ))}
      </div>
      {routes.length > 1 && (
        <p>
          Open de delen op volgorde; elk volgend deel begint bij de laatste stop van het vorige
          deel. Gelijke adressen worden één keer bezocht.
        </p>
      )}
    </section>
  );
}
