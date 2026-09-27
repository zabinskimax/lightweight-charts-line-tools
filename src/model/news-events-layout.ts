import { NewsEvent, NewsEventImpact } from '../api/inews-events-api';

/**
 * A news event after conversion: time in seconds on the chart's clock, plus the caller's object.
 */
export interface NewsEventItem {
	time: number;
	impact: NewsEventImpact;
	currency: string;
	/**
	 * The object the caller passed in, handed back untouched in hover and click events.
	 */
	source: NewsEvent;
}

export interface PlacedNewsEvent {
	event: NewsEventItem;
	index: number;
	x: number;
}

/**
 * Events sharing one icon: the same bar, or bars too close together to show apart.
 */
export interface NewsCluster {
	/**
	 * Time of the first event. Stable across scrolling and new data, so it doubles as the icon id.
	 */
	key: string;
	index: number;
	x: number;
	events: NewsEventItem[];
	/**
	 * The event that picks the icon's flag and color.
	 */
	top: NewsEventItem;
	/**
	 * Every event in the icon is still to come.
	 */
	upcoming: boolean;
}

export function impactRank(impact: NewsEventImpact): number {
	return impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
}

/**
 * The bar duration in seconds: the smallest gap between neighbouring bars among the last `sample`
 * bars, so weekends and holidays do not inflate it. 0 when there are fewer than two bars.
 */
export function detectBarInterval(count: number, timeAt: (index: number) => number, sample: number = 50): number {
	let best = Infinity;
	for (let i = Math.max(1, count - sample); i < count; i++) {
		const gap = timeAt(i) - timeAt(i - 1);
		if (gap > 0 && gap < best) {
			best = gap;
		}
	}
	return isFinite(best) ? best : 0;
}

/**
 * The bar an event belongs to: the bar whose span contains it, the first bar after a gap in the data
 * (weekend, holiday) for an event inside the gap, and a future index counted in whole bars for an event
 * after the last bar. Null when there is no data or the event is before the first bar.
 */
export function eventBarIndex(time: number, count: number, timeAt: (index: number) => number, interval: number): number | null {
	if (count === 0 || time < timeAt(0)) {
		return null;
	}

	const lastIndex = count - 1;
	const lastTime = timeAt(lastIndex);
	if (time >= lastTime) {
		return interval > 0 ? lastIndex + Math.floor((time - lastTime) / interval) : lastIndex;
	}

	// Invariant: timeAt(lo) <= time < timeAt(hi).
	let lo = 0;
	let hi = lastIndex;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if (timeAt(mid) <= time) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	// Neighbouring bars without a real gap between them (1.5 bars covers uneven months): the event is
	// inside bar `lo`. Across a gap it is inside `lo` only while within one bar of its open.
	const gap = timeAt(hi) - timeAt(lo);
	if (interval <= 0 || gap <= interval * 1.5 || time - timeAt(lo) < interval) {
		return lo;
	}
	return hi;
}

/**
 * The event that represents a group: highest impact first, then the currency listed first in
 * `currencyPriority` (unlisted currencies come after listed ones), then the earliest.
 */
export function pickTopEvent(events: readonly NewsEventItem[], currencyPriority: readonly string[]): NewsEventItem {
	const priority = (currency: string): number => {
		const position = currencyPriority.indexOf(currency);
		return position < 0 ? currencyPriority.length : position;
	};

	let top = events[0];
	for (let i = 1; i < events.length; i++) {
		const candidate = events[i];
		const byImpact = impactRank(candidate.impact) - impactRank(top.impact);
		if (byImpact > 0 || (byImpact === 0 && priority(candidate.currency) < priority(top.currency))) {
			top = candidate;
		}
	}
	return top;
}

/**
 * Groups placed events (sorted by time) into icons. An icon sits on its first event's bar and absorbs
 * every following event closer than `minDistance` pixels to it, so icons never overlap.
 */
export function clusterNewsEvents(
	placed: readonly PlacedNewsEvent[],
	minDistance: number,
	now: number,
	currencyPriority: readonly string[]
): NewsCluster[] {
	const clusters: NewsCluster[] = [];
	let current: NewsCluster | null = null;

	for (const item of placed) {
		if (current !== null && item.x - current.x < minDistance) {
			current.events.push(item.event);
			continue;
		}
		current = {
			key: String(item.event.time),
			index: item.index,
			x: item.x,
			events: [item.event],
			top: item.event,
			upcoming: false,
		};
		clusters.push(current);
	}

	for (const cluster of clusters) {
		cluster.top = pickTopEvent(cluster.events, currencyPriority);
		cluster.upcoming = cluster.events.every((event: NewsEventItem) => event.time > now);
	}

	return clusters;
}

/**
 * Pixel-aligned x of an icon, shared by drawing and hit testing so they agree.
 */
export function iconX(cluster: NewsCluster): number {
	return Math.round(cluster.x) + 0.5;
}

/**
 * The icon under a point, with `slack` extra pixels around its ring so small icons are easy to hit.
 */
export function clusterAtPoint(clusters: readonly NewsCluster[], iconY: number, radius: number, x: number, y: number, slack: number = 4): NewsCluster | null {
	const reach = radius + slack;
	if (Math.abs(y - iconY) > reach) {
		return null;
	}
	for (const cluster of clusters) {
		const dx = x - iconX(cluster);
		const dy = y - iconY;
		if (dx * dx + dy * dy <= reach * reach) {
			return cluster;
		}
	}
	return null;
}
