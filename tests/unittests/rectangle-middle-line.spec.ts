import { expect } from 'chai';
import { describe, it } from 'mocha';

import { Coordinate } from '../../src/model/coordinate';
import { AnchorPoint } from '../../src/renderers/line-anchor-renderer';
import { RectangleRenderer, RectangleRendererData } from '../../src/renderers/rectangle-renderer';

interface Stroke {
	color: string;
	segments: [number, number, number, number][];
}

// Records every stroked path. No border and no background, so the middle
// line is the only thing drawn.
function strokes(data: RectangleRendererData): Stroke[] {
	const out: Stroke[] = [];
	let path: [number, number, number, number][] = [];
	let from: [number, number] = [0, 0];
	const ctx = {
		canvas: { width: 1000, height: 600 },
		strokeStyle: '',
		lineWidth: 1,
		save: () => undefined,
		restore: () => undefined,
		setLineDash: () => undefined,
		beginPath: () => { path = []; },
		moveTo: (x: number, y: number) => { from = [x, y]; },
		lineTo: (x: number, y: number) => { path.push([from[0], from[1], x, y]); from = [x, y]; },
		stroke: () => { out.push({ color: ctx.strokeStyle, segments: path }); },
	};
	const renderer = new RectangleRenderer();
	renderer.setData(data);
	renderer.draw(ctx as unknown as CanvasRenderingContext2D, 1, false);
	return out;
}

function rect(overrides: Partial<RectangleRendererData> = {}): RectangleRendererData {
	return {
		points: [new AnchorPoint(100, 20, 0), new AnchorPoint(300, 80, 1)],
		border: { width: 0 },
		extend: { left: false, right: false, up: false, down: false },
		middleLine: { visible: true, color: 'mid', width: 1, style: 2 },
		...overrides,
	};
}

describe('RectangleRenderer middle line', () => {
	it('runs across the rectangle halfway between its top and bottom', () => {
		// A 1px line sits on the pixel centre, hence the half pixel.
		expect(strokes(rect())).to.deep.equal([{ color: 'mid', segments: [[100, 50.5, 300, 50.5]] }]);
	});

	it('follows a left or right extension to the pane edge', () => {
		const extended = rect({ extend: { left: true, right: true, up: false, down: false } });
		expect(strokes(extended)[0].segments).to.deep.equal([[0, 50.5, 1000, 50.5]]);
	});

	it('takes the border color until it has its own', () => {
		const plain = rect({ border: { width: 0, color: 'border' }, middleLine: { visible: true } });
		expect(strokes(plain).map((s: Stroke) => s.color)).to.deep.equal(['border']);
	});

	it('is not drawn when switched off or unset', () => {
		expect(strokes(rect({ middleLine: { visible: false } }))).to.deep.equal([]);
		expect(strokes(rect({ middleLine: undefined }))).to.deep.equal([]);
	});

	it('selects the rectangle when clicked', () => {
		const hit = (d: RectangleRendererData) => {
			const renderer = new RectangleRenderer();
			renderer.setData(d);
			const ctx = { canvas: { width: 1000, height: 600 } } as unknown as CanvasRenderingContext2D;
			return renderer.hitTest(200 as Coordinate, 50 as Coordinate, ctx);
		};
		expect(hit(rect())).to.not.equal(null);
		expect(hit(rect({ middleLine: { visible: false } }))).to.equal(null);
	});
});
