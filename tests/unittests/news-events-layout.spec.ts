import { expect } from 'chai';
import { describe, it } from 'mocha';

import {
	clusterAtPoint,
	clusterNewsEvents,
	detectBarInterval,
	eventBarIndex,
	NewsEventItem,
	pickTopEvent,
	PlacedNewsEvent,
} from '../../src/model/news-events-layout';
import { UTCTimestamp } from '../../src/model/time-data';

const HOUR = 3600;
const DAY = 24 * HOUR;
// Fri 5 Jul 2024 00:00 UTC.
const FRIDAY = Date.UTC(2024, 6, 5) / 1000;

function at(times: number[]): (index: number) => number {
	return (index: number) => times[index];
}

function event(time: number, impact: NewsEventItem['impact'], currency: string = 'USD'): NewsEventItem {
	return { time, impact, currency, source: { time: time as UTCTimestamp, impact, currency, title: `${currency} ${impact} ${time}` } };
}

describe('detectBarInterval', () => {
	it('uses the smallest gap, so a weekend does not inflate it', () => {
		// Fri 20:00, 21:00, then Sun 22:00, 23:00
		const times = [FRIDAY + 20 * HOUR, FRIDAY + 21 * HOUR, FRIDAY + 2 * DAY + 22 * HOUR, FRIDAY + 2 * DAY + 23 * HOUR];
		expect(detectBarInterval(times.length, at(times))).to.equal(HOUR);
	});

	it('returns 0 without two bars', () => {
		expect(detectBarInterval(0, at([]))).to.equal(0);
		expect(detectBarInterval(1, at([FRIDAY]))).to.equal(0);
	});
});

describe('eventBarIndex', () => {
	const fourHour = [0, 4, 8, 12, 16, 20].map((h: number) => FRIDAY + h * HOUR);

	it('puts an event on the bar that opens at its time', () => {
		expect(eventBarIndex(FRIDAY + 12 * HOUR, fourHour.length, at(fourHour), 4 * HOUR)).to.equal(3);
	});

	it('puts an event inside a bar on that bar, not the next one', () => {
		// 13:30 on 4H bars belongs to the 12:00 bar.
		expect(eventBarIndex(FRIDAY + 13.5 * HOUR, fourHour.length, at(fourHour), 4 * HOUR)).to.equal(3);
	});

	it('returns null before the first bar and without data', () => {
		expect(eventBarIndex(FRIDAY - HOUR, fourHour.length, at(fourHour), 4 * HOUR)).to.equal(null);
		expect(eventBarIndex(FRIDAY, 0, at([]), 4 * HOUR)).to.equal(null);
	});

	describe('across a weekend on hourly bars', () => {
		// Fri 20:00, Fri 21:00 (last before the close), Sun 22:00, Sun 23:00
		const times = [FRIDAY + 20 * HOUR, FRIDAY + 21 * HOUR, FRIDAY + 2 * DAY + 22 * HOUR, FRIDAY + 2 * DAY + 23 * HOUR];

		it('keeps an event within the last bar before the gap on that bar', () => {
			expect(eventBarIndex(FRIDAY + 21.5 * HOUR, times.length, at(times), HOUR)).to.equal(1);
		});

		it('moves an event inside the gap to the first bar after it', () => {
			expect(eventBarIndex(FRIDAY + DAY + 9 * HOUR, times.length, at(times), HOUR)).to.equal(2);
		});
	});

	it('keeps an event late in a long month on that month\'s bar', () => {
		// Monthly bars: Jan, Feb, Mar 2024. The shortest gap (Feb, 29 days) is the interval,
		// so 31 Jan is more than one interval after the Jan open but still inside January.
		const months = [Date.UTC(2024, 0, 1), Date.UTC(2024, 1, 1), Date.UTC(2024, 2, 1)].map((ms: number) => ms / 1000);
		const interval = detectBarInterval(months.length, at(months));
		expect(eventBarIndex(Date.UTC(2024, 0, 31, 12) / 1000, months.length, at(months), interval)).to.equal(0);
	});

	describe('after the last bar', () => {
		it('stays on the last bar within its span', () => {
			expect(eventBarIndex(FRIDAY + 20 * HOUR, fourHour.length, at(fourHour), 4 * HOUR)).to.equal(5);
			expect(eventBarIndex(FRIDAY + 23 * HOUR, fourHour.length, at(fourHour), 4 * HOUR)).to.equal(5);
		});

		it('counts whole bars into the future', () => {
			// 2.5 bars after the last open lands in the second future bar.
			expect(eventBarIndex(FRIDAY + 30 * HOUR, fourHour.length, at(fourHour), 4 * HOUR)).to.equal(7);
		});
	});
});

describe('pickTopEvent', () => {
	const priority = ['USD', 'EUR', 'GBP'];

	it('prefers the higher impact', () => {
		const top = pickTopEvent([event(1, 'medium', 'USD'), event(1, 'high', 'CAD')], priority);
		expect(top.currency).to.equal('CAD');
	});

	it('breaks impact ties by currency priority, unlisted currencies last', () => {
		expect(pickTopEvent([event(1, 'high', 'CAD'), event(1, 'high', 'EUR')], priority).currency).to.equal('EUR');
		expect(pickTopEvent([event(1, 'high', 'CAD'), event(1, 'high', 'AUD')], priority).currency).to.equal('CAD');
	});
});

describe('clusterNewsEvents', () => {
	const placed = (items: [number, number, NewsEventItem][]): PlacedNewsEvent[] =>
		items.map(([index, x, e]: [number, number, NewsEventItem]) => ({ index, x, event: e }));

	it('merges icons closer than the minimum distance and keys each by its first event', () => {
		const items = placed([
			[10, 100, event(1000, 'low')],
			[11, 109, event(2000, 'high')],
			[13, 127, event(3000, 'medium')],
		]);
		const clusters = clusterNewsEvents(items, 20, 5000, ['USD']);
		expect(clusters.length).to.equal(2);
		expect(clusters[0].key).to.equal('1000');
		expect(clusters[0].events.length).to.equal(2);
		expect(clusters[0].top.impact).to.equal('high');
		expect(clusters[0].x).to.equal(100);
		expect(clusters[1].key).to.equal('3000');
	});

	it('marks an icon upcoming only when every event in it is after now', () => {
		const items = placed([
			[1, 10, event(900, 'high')],
			[1, 10, event(1100, 'high')],
			[5, 90, event(1500, 'medium')],
		]);
		const clusters = clusterNewsEvents(items, 20, 1000, ['USD']);
		expect(clusters[0].upcoming).to.equal(false);
		expect(clusters[1].upcoming).to.equal(true);
	});
});

describe('clusterAtPoint', () => {
	const placedItems: PlacedNewsEvent[] = [
		{ index: 3, x: 40, event: event(1000, 'high') },
		{ index: 9, x: 100, event: event(2000, 'low') },
	];
	const clusters = clusterNewsEvents(placedItems, 20, 5000, ['USD']);

	it('finds the icon under a point, with a little slack around the ring', () => {
		// Icons are pixel aligned at x + 0.5; radius 7 plus 4 slack reaches 11px.
		expect(clusterAtPoint(clusters, 200, 7, 40.5, 200)?.key).to.equal('1000');
		expect(clusterAtPoint(clusters, 200, 7, 110, 200)?.key).to.equal('2000');
		expect(clusterAtPoint(clusters, 200, 7, 70, 200)).to.equal(null);
	});

	it('ignores points above or below the icon row', () => {
		expect(clusterAtPoint(clusters, 200, 7, 40.5, 180)).to.equal(null);
	});
});
