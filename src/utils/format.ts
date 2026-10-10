/** Small text formatting shared by every screen. */

/** 12, 940, 1.2k, 12k, 1.4M: as Reddit shows scores and counts. */
export function compact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs < 1000) return `${n}`;
  if (abs < 10_000) return `${sign}${trim((abs / 1000).toFixed(1))}k`;
  if (abs < 1_000_000) return `${sign}${Math.round(abs / 1000)}k`;
  if (abs < 10_000_000) return `${sign}${trim((abs / 1_000_000).toFixed(1))}M`;
  return `${sign}${Math.round(abs / 1_000_000)}M`;
}

function trim(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}

/** How long ago, briefly: "now", "5m", "4h", "3d", "2w", "5mo", "2y". */
export function age(createdUtc: number, now: number = Date.now()): string {
  const seconds = Math.max(0, now / 1000 - createdUtc);
  if (seconds < 60) return 'now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

/** The same, spelled out for VoiceOver: "4 hours ago". */
export function ageSpoken(createdUtc: number, now: number = Date.now()): string {
  const short = age(createdUtc, now);
  if (short === 'now') return 'just now';
  const match = /^(\d+)(mo|m|h|d|w|y)$/.exec(short);
  if (!match) return short;
  const n = Number(match[1]);
  const unit = { m: 'minute', h: 'hour', d: 'day', w: 'week', mo: 'month', y: 'year' }[
    match[2] as 'm' | 'h' | 'd' | 'w' | 'mo' | 'y'
  ];
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
}

/** "1 comment", "2.4k comments". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${compact(n)} ${n === 1 ? one : many}`;
}
