import { expect } from 'chai';
import { describe, it } from 'mocha';

import { Coordinate } from '../../src/model/coordinate';
import {
	FixedRangeVolumeProfileRenderer,
	FixedRangeVolumeProfileRendererData,
	RenderedVolumeBar,
} from '../../src/renderers/fixed-range-volume-profile-renderer';
import { AnchorPoint } from '../../src/renderers/line-anchor-renderer';

interface Stroke {
	color: string;
	segments: [number, number, number, number][];
}

// Records every stroked path; fills are ignored.
function fakeContext(): { ctx: CanvasRenderingContext2D; strokes: Stroke[] } {
	const strokes: Stroke[] = [];
	let path: [number, number, number, number][] = [];
	let from: [number, number] = [0, 0];
	const ctx = {
		canvas: { width: 1000 },
		fillStyle: '',
		strokeStyle: '',
		lineWidth: 1,
		save: () => undefined,
		restore: () => undefined,
		fillRect: () => undefined,
		beginPath: () => { path = []; },
		moveTo: (x: number, y: number) => { from = [x, y]; },
		lineTo: (x: number, y: number) => { path.push([from[0], from[1], x, y]); from = [x, y]; },
		stroke: () => { strokes.push({ color: ctx.strokeStyle, segments: path }); },
	};
	return { ctx: ctx as unknown as CanvasRenderingContext2D, strokes };
}

function bar(y: number, h: number, isInValueArea: boolean, isPOC: boolean = false): RenderedVolumeBar {
	return { y: y as Coordinate, h, widthRatio: 0.5, isPOC, isInValueArea };
}

function data(overrides: Partial<FixedRangeVolumeProfileRendererData> = {}): FixedRangeVolumeProfileRendererData {
	return {
		points: [new AnchorPoint(100, 0, 0), new AnchorPoint(300, 100, 1)],
		// Top to bottom; the value area is the middle three rows (y 20 to 80).
		bars: [
			bar(0, 20, false),
			bar(20, 20, true),
			bar(40, 20, true, true),
			bar(60, 20, true),
			bar(80, 20, false),
		],
		barColor: 'bar',
		valueAreaColor: 'va',
		buyColor: 'buy',
		sellColor: 'sell',
		isTwoTone: false,
		pocColor: 'poc',
		showPOC: false,
		showValueArea: true,
		showValueAreaLines: true,
		valueAreaLineColor: 'va-line',
		borderColor: 'border',
		borderWidth: 0,
		pocExpansion: 'none',
		barWidthRatio: 0.3,
		barAnchorSide: 'left',
		...overrides,
	};
}

function draw(d: FixedRangeVolumeProfileRendererData): Stroke[] {
	const renderer = new FixedRangeVolumeProfileRenderer();
	renderer.setData(d);
	const { ctx, strokes } = fakeContext();
	renderer.draw(ctx, 1);
	return strokes;
}

describe('FixedRangeVolumeProfileRenderer value area lines', () => {
	it('draws VAH at the top and VAL at the bottom of the value area, across the box', () => {
		const strokes = draw(data());
		expect(strokes).to.have.length(1);
		expect(strokes[0].color).to.equal('va-line');
		expect(strokes[0].segments).to.deep.equal([
			[100, 20, 300, 20],
			[100, 80, 300, 80],
		]);
	});

	it('draws them in two-tone mode too, where the bars carry no value-area tint', () => {
		const strokes = draw(data({ isTwoTone: true }));
		expect(strokes).to.have.length(1);
		expect(strokes[0].segments).to.deep.equal([
			[100, 20, 300, 20],
			[100, 80, 300, 80],
		]);
	});

	it('draws nothing when the lines or the value area are switched off', () => {
		expect(draw(data({ showValueAreaLines: false }))).to.have.length(0);
		expect(draw(data({ showValueArea: false }))).to.have.length(0);
	});

	it('draws nothing when no bar is in the value area', () => {
		const bars = data().bars.map((b: RenderedVolumeBar) => ({ ...b, isInValueArea: false }));
		expect(draw(data({ bars }))).to.have.length(0);
	});

	it('scales with the pixel ratio', () => {
		const renderer = new FixedRangeVolumeProfileRenderer();
		renderer.setData(data());
		const { ctx, strokes } = fakeContext();
		renderer.draw(ctx, 2);
		expect(strokes[0].segments).to.deep.equal([
			[200, 40, 600, 40],
			[200, 160, 600, 160],
		]);
	});

	it('keeps the POC line after the value area lines so it paints on top', () => {
		const strokes = draw(data({ showPOC: true }));
		expect(strokes.map((s: Stroke) => s.color)).to.deep.equal(['va-line', 'poc']);
	});
});

describe('FixedRangeVolumeProfileRenderer bar edges', () => {
	it('leaves no gap between touching rows at fractional pixels', () => {
		const rects: [number, number][] = [];
		const ctx = {
			canvas: { width: 1000 },
			save: () => undefined,
			restore: () => undefined,
			fillRect: (x: number, y: number, w: number, h: number) => { rects.push([y, h]); },
		} as unknown as CanvasRenderingContext2D;
		const renderer = new FixedRangeVolumeProfileRenderer();
		renderer.setData(data({
			bars: [bar(0.4, 10.4, false), bar(10.8, 10.4, false), bar(21.2, 10.4, false)],
			points: [new AnchorPoint(100, 0.4, 0), new AnchorPoint(300, 31.6, 1)],
			showValueAreaLines: false,
		}));
		renderer.draw(ctx, 1);
		expect(rects).to.deep.equal([[0, 11], [11, 10], [21, 11]]);
	});
});
