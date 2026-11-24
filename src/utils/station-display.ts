import type { Station } from '../api/citybikes';

export function availabilityLabel(value: number | null, kind: 'bikes' | 'docks'): string {
  if (value === null) return `${kind === 'bikes' ? 'Bike' : 'Dock'} count unknown`;
  if (value === 0) return kind === 'bikes' ? 'No bikes available' : 'No free docks';
  return kind === 'bikes' ? 'Bikes available' : 'Docks available';
}

export function stationStatus(station: Station): string {
  if (station.closed) return 'Station closed';
  return `${availabilityLabel(station.free_bikes, 'bikes')} · ${availabilityLabel(station.empty_slots, 'docks')}`;
}

export function ageLabel(time: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (time - now > 60_000) return 'time ahead of device clock';
  if (seconds < 60) return 'less than a minute ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} days ago`;
}
