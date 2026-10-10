/** Feeds named as strings, for routes and settings: "home", "popular", "r/<name>". */
import type { Feed, Period, Sort } from '@/api/endpoints';
import { PERIODS, SORTS } from '@/api/endpoints';

export function feedParam(feed: Feed): string {
  return feed.kind === 'subreddit' ? `r/${feed.name}` : feed.kind;
}

export function parseFeed(value: string | undefined): Feed {
  if (value === 'home' || value === 'popular') return { kind: value };
  const match = /^r\/([A-Za-z0-9_]{2,21})$/.exec(value ?? '');
  if (match?.[1]) return { kind: 'subreddit', name: match[1] };
  return { kind: 'popular' };
}

export function parseSort(value: string | undefined, fallback: Sort): Sort {
  return (SORTS as readonly string[]).includes(value ?? '') ? (value as Sort) : fallback;
}

export function parsePeriod(value: string | undefined): Period {
  return (PERIODS as readonly string[]).includes(value ?? '') ? (value as Period) : 'day';
}

/** Each feed's natural order: Reddit's "best" for home, "hot" elsewhere. */
export function defaultSort(feed: Feed): Sort {
  return feed.kind === 'home' ? 'best' : 'hot';
}

export const SORT_LABELS: Record<Sort, string> = {
  best: 'Best',
  hot: 'Hot',
  new: 'New',
  top: 'Top',
  rising: 'Rising',
};

export const PERIOD_LABELS: Record<Period, string> = {
  hour: 'Past hour',
  day: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
};

/** "Top · This week", "Hot". */
export function sortLabel(sort: Sort, period: Period): string {
  return sort === 'top' ? `Top · ${PERIOD_LABELS[period]}` : SORT_LABELS[sort];
}
