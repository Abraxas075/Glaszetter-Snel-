'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { googleMapsLinks } from '@glaszetter/shared';
import type { MapPoint } from '../lib/jobMap';
import { JOB_STATUS_LABELS } from '../constants/statusLabels';

export default function JobMapCanvas({ points }: { points: MapPoint[] }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, { scrollWheelZoom: false }).setView([52.4, 4.85], 10);
    map.current = instance;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      referrerPolicy: 'strict-origin-when-cross-origin',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    })
      .on('tileerror', () => setTileError(true))
      .addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const group = L.featureGroup().addTo(instance);
    points.forEach((point) => {
      const content = document.createElement('div');
      content.className = 'job-map-popup';
      const heading = document.createElement('strong');
      heading.textContent = point.location.label;
      content.append(heading);
      if (point.location.precision === 'straat') {
        const note = document.createElement('p');
        note.textContent = 'Straatniveau — geen exact huisnummer';
        content.append(note);
      }
      point.jobs.forEach(({ job, project }) => {
        const card = document.createElement('p');
        const title = document.createElement('a');
        title.href = `/dashboard/jobs/${encodeURIComponent(job.id)}`;
        title.textContent = job.name;
        card.append(title);
        const status = document.createElement('span');
        status.textContent = ` — ${JOB_STATUS_LABELS[job.status]}`;
        card.append(status);
        const links = googleMapsLinks(project);
        if (links) {
          card.append(document.createElement('br'));
          const route = document.createElement('a');
          route.href = links.route;
          route.target = '_blank';
          route.rel = 'noopener noreferrer';
          route.textContent = 'Route starten';
          card.append(route);
        }
        content.append(card);
      });
      L.circleMarker([point.location.lat, point.location.lon], {
        radius: point.jobs.length > 1 ? 12 : 9,
        color: '#075da4',
        fillColor: point.jobs.length > 1 ? '#E30613' : '#00A0E6',
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindPopup(content, { maxHeight: 260 })
        .bindTooltip(`${point.jobs.length} ${point.jobs.length === 1 ? 'klus' : 'klussen'}`)
        .addTo(group);
    });
    if (points.length) instance.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 15 });
    return () => {
      group.remove();
    };
  }, [points]);
  return (
    <>
      <div
        ref={element}
        className="job-map-canvas"
        role="region"
        aria-label="Interactieve kaart met kluslocaties"
      />
      {tileError && (
        <p role="alert">
          De achtergrondkaart kon niet volledig laden. De kluslijst en Google Maps-links blijven
          beschikbaar.
        </p>
      )}
    </>
  );
}
