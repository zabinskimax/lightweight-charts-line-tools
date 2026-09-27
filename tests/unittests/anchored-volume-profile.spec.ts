import { expect } from 'chai';
import { describe, it } from 'mocha';

import { AnchoredVolumeProfileOptionDefaults } from '../../src/api/options/line-tools-options-defaults';
import { ChartModel } from '../../src/model/chart-model';
import { Coordinate } from '../../src/model/coordinate';
import { LineTool } from '../../src/model/line-tool';
import { AnchoredVolumeProfileToolOptions, LineToolType, VolumeProfileBar } from '../../src/model/line-tool-options';
import { PriceScale } from '../../src/model/price-scale';
import { CompositeRenderer } from '../../src/renderers/composite-renderer';
import {
	FixedRangeVolumeProfileRenderer,
	FixedRangeVolumeProfileRendererData,
	RenderedVolumeBar,
} from '../../src/renderers/fixed-range-volume-profile-renderer';
import { IPaneRenderer } from '../../src/renderers/ipane-renderer';
import { AnchorPoint } from '../../src/renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../src/renderers/segment-renderer';
import { AnchoredVolumeProfilePaneView } from '../../src/views/pane/anchored-volume-profile-pane-view';
import { computeValueArea } from '../../src/views/pane/fixed-range-volume-profile-pane-view';

// Rows sorted high-to-low price, as the pane view sorts them.
function rows(...volumes: number[]): VolumeProfileBar[] {
	return volumes.map((volume: number, i: number) => ({ price: 100 - i, volume }));
}

describe('computeValueArea (TradingView rule)', () => {
	it('adds the larger neighbour and stops before the target is exceeded', () => {
		// Target 16.1: POC 10, then below 5 (11 left 1.1), then above 4 would exceed.
		expect(computeValueArea(rows(1, 4, 10, 5, 2, 1), 0.7)).to.deep.equal([2, 3]);
	});

	it('stops at the larger neighbour even when the smaller one would fit', () => {
		// 2.6 left after the POC; below (5) does not fit, above (1) is never tried.
		expect(computeValueArea(rows(1, 1, 10, 5, 1), 0.7)).to.deep.equal([2, 2]);
	});

	it('breaks a tie towards the row closer to the POC', () => {
		// Above 3 first; then above 2 (two rows up) ties below 2 (one row down).
		expect(computeValueArea(rows(2, 3, 10, 2, 1), 0.9)).to.deep.equal([1, 3]);
	});

	it('breaks a tie at equal distance towards the row above', () => {
		expect(computeValueArea(rows(1, 3, 10, 3, 1), 0.8)).to.deep.equal([1, 2]);
	});

	it('keeps going on one side when the other runs out', () => {
		expect(computeValueArea(rows(10, 3, 2, 1), 1)).to.deep.equal([0, 3]);
		expect(computeValueArea(rows(1, 2, 3, 10), 1)).to.deep.equal([0, 3]);
	});
});

function rendererData(overrides: Partial<FixedRangeVolumeProfileRendererData> = {}): FixedRangeVolumeProfileRendererData {
	const bar = (y: number, isPOC: boolean): RenderedVolumeBar => ({ y: y as Coordinate, h: 20, widthRatio: 1, isPOC, isInValueArea: true });
	return {
		points: [new AnchorPoint(0, 0, 0), new AnchorPoint(1000, 40, 1)],
		bars: [bar(0, true), bar(20, false)],
		barColor: 'bar',
		valueAreaColor: 'va',
		buyColor: 'buy',
		sellColor: 'sell',
		isTwoTone: false,
		pocColor: 'poc',
		showPOC: true,
		showValueArea: true,
		showValueAreaLines: true,
		valueAreaLineColor: 'va-line',
		borderColor: 'border',
		borderWidth: 0,
		pocExpansion: 'none',
		barWidthRatio: 0.3,
		barAnchorSide: 'right',
		...overrides,
	};
}

const hitCtx = { canvas: {} } as unknown as CanvasRenderingContext2D;

function hits(data: FixedRangeVolumeProfileRendererData, x: number, y: number): boolean {
	const renderer = new FixedRangeVolumeProfileRenderer();
	renderer.setData(data);
	return renderer.hitTest(x as Coordinate, y as Coordinate, hitCtx) !== null;
}

describe('FixedRangeVolumeProfileRenderer bars-only hit test', () => {
	it('takes clicks only on the histogram strip at the anchored side', () => {
		const data = rendererData({ hitTestBarsOnly: true });
		expect(hits(data, 800, 20)).to.equal(true);
		expect(hits(data, 500, 20)).to.equal(false);
		expect(hits(data, 800, 60)).to.equal(false);
		expect(hits(rendererData({ hitTestBarsOnly: true, barAnchorSide: 'left' }), 200, 20)).to.equal(true);
	});

	it('still takes clicks anywhere in the box by default', () => {
		expect(hits(rendererData(), 500, 20)).to.equal(true);
	});
});

describe('FixedRangeVolumeProfileRenderer lines start', () => {
	it('starts the POC and value area lines at linesStartX', () => {
		const starts: number[] = [];
		const ctx = {
			canvas: { width: 1000 },
			save: () => undefined,
			restore: () => undefined,
			fillRect: () => undefined,
			beginPath: () => undefined,
			moveTo: (x: number) => { starts.push(x); },
			lineTo: () => undefined,
			stroke: () => undefined,
		} as unknown as CanvasRenderingContext2D;
		const renderer = new FixedRangeVolumeProfileRenderer();
		renderer.setData(rendererData({ linesStartX: 400 }));
		renderer.draw(ctx, 1);
		expect(starts).to.deep.equal([400, 400, 400]);
	});
});

// Price p sits at y = 1000 - 10p.
const priceScale = { priceToCoordinate: (price: number) => 1000 - price * 10 } as unknown as PriceScale;

class TestView extends AnchoredVolumeProfilePaneView {
	public override addAnchors(): void {}

	public layout(anchorX: number, width: number): IPaneRenderer[] {
		this._points = [new AnchorPoint(anchorX, 0, 0)];
		const renderer = this._toolRenderer(priceScale, 900, width) as CompositeRenderer | null;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		return renderer === null ? [] : (renderer as unknown as { _renderers: IPaneRenderer[] })._renderers;
	}

	public anchor(): AnchorPoint {
		return this._points[0];
	}

	public profile(): FixedRangeVolumeProfileRendererData {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		return (this._profileRenderer as unknown as { _data: FixedRangeVolumeProfileRendererData })._data;
	}
}

function view(creating: boolean = false): TestView {
	const options = JSON.parse(JSON.stringify(AnchoredVolumeProfileOptionDefaults)) as AnchoredVolumeProfileToolOptions;
	options.volumeProfile.bars = [
		{ price: 50, volume: 5, priceLow: 49, priceHigh: 51 },
		{ price: 52, volume: 9, priceLow: 51, priceHigh: 53 },
	];
	const source = {
		options: () => options,
		creating: () => creating,
		ownerSource: () => ({ firstValue: () => ({ value: 0 }) }),
	};
	return new TestView(source as unknown as LineTool<LineToolType>, {} as unknown as ChartModel);
}

describe('AnchoredVolumeProfilePaneView', () => {
	it('hangs the histogram from the pane edge and starts its lines at the anchor', () => {
		const v = view();
		const renderers = v.layout(300, 800);
		expect(renderers[0]).to.be.instanceOf(SegmentRenderer);
		expect(renderers[1]).to.be.instanceOf(FixedRangeVolumeProfileRenderer);
		const data = v.profile();
		expect(data.points.map((p: AnchorPoint) => [p.x, p.y])).to.deep.equal([[0, 470], [800, 510]]);
		expect(data.barAnchorSide).to.equal('right');
		expect(data.linesStartX).to.equal(300);
		expect(data.hitTestBarsOnly).to.equal(true);
		expect(data.backgroundColor).to.equal(undefined);
		// The handle sits halfway down the dashed line, which spans the profile.
		expect(v.anchor().y).to.equal(490);
	});

	it('keeps the histogram when the anchor scrolls out of view', () => {
		const left = view();
		expect(left.layout(-50, 800).map((r: IPaneRenderer) => r.constructor)).to.deep.equal([FixedRangeVolumeProfileRenderer]);
		expect(left.profile().linesStartX).to.equal(0);

		const right = view();
		expect(right.layout(950, 800).map((r: IPaneRenderer) => r.constructor)).to.deep.equal([FixedRangeVolumeProfileRenderer]);
		expect(right.profile().linesStartX).to.equal(800);
	});

	it('shows only a full-height anchor line while placing', () => {
		const v = view(true);
		const renderers = v.layout(300, 800);
		expect(renderers.map((r: IPaneRenderer) => r.constructor)).to.deep.equal([SegmentRenderer]);
		expect(v.anchor().y).to.equal(450);
	});
});
