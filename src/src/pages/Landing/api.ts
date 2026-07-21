import { apiBase } from './theme';
import type { Stats, Listing } from './data';

// طبقة API — نقاط نهاية عامة حقيقية فقط (بلا مصادقة)، مع فشل صامت رشيق.
export async function fetchPublicStats(): Promise<Stats | null> {
  try {
    const r = await fetch(`${apiBase()}/listings/public/stats`);
    if (!r.ok) return null;
    return (await r.json()) as Stats;
  } catch { return null; }
}

export async function fetchPublicListings(): Promise<Listing[]> {
  try {
    const r = await fetch(`${apiBase()}/listings/public/catalog`);
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d?.listings) ? (d.listings as Listing[]) : [];
  } catch { return []; }
}
