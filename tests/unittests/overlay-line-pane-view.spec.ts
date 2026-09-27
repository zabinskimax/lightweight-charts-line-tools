import { expect } from 'chai';
import { describe, it } from 'mocha';

import { UTCTimestamp } from '../../src/model/time-data';
import { OverlayLineRendererData } from '../../src/renderers/overlay-line-renderer';
import { OverlayLineInternalOptions, OverlayLinePaneView } from '../../src/views/pane/overlay-line-pane-view';

const t = (seconds: number): UTCTimestamp => seconds as UTCTimestamp;

// Pane 800 x 400. On the fake scales a time IS its x, and y = 500 - price.
function drawn(options: Partial<OverlayLineInternalOptions>): OverlayLineRendererData | null {
	const timeScale = {
		isEmpty: () => false,
		barSpacing: () => 10,
		timeToCoordinate: (point: { timestamp: number }) => point.timestamp,
	};
	const model = { timeScale: () => timeScale };
	const series = {
		firstValue: () => ({ value: 0 }),
		priceScale: () => ({ priceToCoordinate: (price: number) => 500 - price }),
	};
	const lineOptions: OverlayLineInternalOptions = {
		time1: t(100), price1: -1e6, time2: t(100), price2: 1e6,
		color: '#787b86', lineWidth: 1, lineStyle: 2, xOffsetBars: 0,
		...options,
	};
	const view = new OverlayLinePaneView(model as never, series as never, lineOptions);
	const renderer = view.renderer(400, 800);
	// eslint-disable-next-line @typescript-eslint/naming-convention
	return renderer === null ? null : (renderer as unknown as { _data: OverlayLineRendererData })._data;
}

describe('OverlayLinePaneView clipping', () => {
	it('trims a full-height marker to the pane, 2px margin included', () => {
		const d = drawn({});
		expect(d).to.not.equal(null);
		expect([d?.x1, d?.x2]).to.deep.equal([100, 100]);
		expect([Math.min(d?.y1 ?? 0, d?.y2 ?? 0), Math.max(d?.y1 ?? 0, d?.y2 ?? 0)]).to.deep.equal([-2, 402]);
	});

	it('applies the half-bar offset before clipping', () => {
		expect(drawn({ xOffsetBars: -0.5 })?.x1).to.equal(95);
	});

	it('draws nothing for a line wholly outside the pane', () => {
		expect(drawn({ time1: t(-50), time2: t(-50) })).to.equal(null);
		expect(drawn({ time1: t(900), time2: t(900) })).to.equal(null);
	});

	it('leaves a line inside the pane as it is', () => {
		const d = drawn({ time1: t(10), price1: 300, time2: t(700), price2: 250 });
		expect(d).to.deep.include({ x1: 10, y1: 200, x2: 700, y2: 250 });
	});
});
