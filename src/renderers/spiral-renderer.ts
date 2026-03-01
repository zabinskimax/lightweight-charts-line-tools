import { DeepPartial } from '../helpers/strict-type-checks';

import { Coordinate } from '../model/coordinate';
import { HitTestResult, HitTestType } from '../model/hit-test-result';
import { LineOptions } from '../model/line-tool-options';
import { Point } from '../model/point';

import { LineStyle } from '..';
import { setLineStyle } from './draw-line';
import { IPaneRenderer } from './ipane-renderer';
import { AnchorPoint } from './line-anchor-renderer';
import { interactionTolerance } from './optimal-bar-width';

export type SpiralRendererData = DeepPartial<LineOptions> & {
	points: AnchorPoint[];
	hitTestBackground?: boolean;
};

export class SpiralRenderer implements IPaneRenderer {
	protected _backHitTest: HitTestResult<void>;
	protected _hitTest: HitTestResult<void>;
	protected _data: SpiralRendererData | null;

	public constructor(hitTest?: HitTestResult<void>, backHitTest?: HitTestResult<void>) {
		this._backHitTest = backHitTest || new HitTestResult(HitTestType.MovePointBackground);
		this._hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
		this._data = null;
	}

	public setData(data: SpiralRendererData): void {
		this._data = data;
	}

	public hitTest(x: Coordinate, y: Coordinate, ctx: CanvasRenderingContext2D): HitTestResult<void> | null {
		if (null === this._data || this._data.points.length < 2) {
			return null;
		}

		// Hit test is complex for spiral, but we can approximate it or hit test the start/end points.
		// For simplicity, let's hit test a few points along the spiral.
		const pixelRatio = ctx.canvas.ownerDocument && ctx.canvas.ownerDocument.defaultView && ctx.canvas.ownerDocument.defaultView.devicePixelRatio || 1;
		const tolerance = interactionTolerance.line + 2;
		const scaledPoint = new Point(x * pixelRatio, y * pixelRatio);

		const spiralPoints = this._calculateSpiralPoints(pixelRatio);
		for (let i = 0; i < spiralPoints.length - 1; i++) {
			const p1 = spiralPoints[i];
			const p2 = spiralPoints[i + 1];
			if (this._distanceToSegment(scaledPoint, p1, p2) <= tolerance) {
				return this._hitTest;
			}
		}

		return null;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number, isHovered: boolean, hitTestData?: unknown): void {
		if (this._data === null || this._data.points.length < 2) {
			return;
		}

		ctx.save();

		const color = this._data.color;
		const width = this._data.width || 1;
		const scaledWidth = Math.max(1, Math.floor(width * pixelRatio));

		if (color && scaledWidth > 0) {
			const spiralPoints = this._calculateSpiralPoints(pixelRatio);
			if (spiralPoints.length < 2) { return; }

			ctx.beginPath();
			setLineStyle(ctx, this._data.style || LineStyle.Solid);
			ctx.moveTo(spiralPoints[0].x, spiralPoints[0].y);
			for (let i = 1; i < spiralPoints.length; i++) {
				ctx.lineTo(spiralPoints[i].x, spiralPoints[i].y);
			}
			ctx.lineWidth = scaledWidth;
			ctx.strokeStyle = color;
			ctx.stroke();
		}

		ctx.restore();
	}

	private _calculateSpiralPoints(pixelRatio: number): Point[] {
		if (!this._data || this._data.points.length < 2) { return []; }
		const p1 = this._data.points[0];
		const p2 = this._data.points[1];

		const centerX = p1.x * pixelRatio;
		const centerY = p1.y * pixelRatio;
		const edgeX = p2.x * pixelRatio;
		const edgeY = p2.y * pixelRatio;

		const startRadius = Math.sqrt(Math.pow(edgeX - centerX, 2) + Math.pow(edgeY - centerY, 2));
		const startAngle = Math.atan2(edgeY - centerY, edgeX - centerX);

		const points: Point[] = [];
		const goldenRatio = (1 + Math.sqrt(5)) / 2;
		const b = Math.log(goldenRatio) / (Math.PI / 2); // growth factor for 90 degree turns

		// Approximate the logarithmic spiral
		// We start from a negative theta so it winds out from the center (p1)
		// At theta = 0, r = startRadius (the distance to p2)
		for (let theta = -20 * Math.PI; theta < 20 * Math.PI; theta += 0.1) {
			const r = startRadius * Math.exp(b * theta);
			const x = centerX + r * Math.cos(startAngle + theta);
			const y = centerY + r * Math.sin(startAngle + theta);

			// Limit points near center for performance and limit outward growth
			if (theta < 0 && r < 0.5) { continue; }
			points.push(new Point(x, y));
			if (r > 3000 * pixelRatio) { break; } // limit size
		}

		return points;
	}

	private _distanceToSegment(p: Point, a: Point, b: Point): number {
		const l2 = Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
		if (l2 === 0) { return Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2)); }
		let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
		t = Math.max(0, Math.min(1, t));
		return Math.sqrt(Math.pow(p.x - (a.x + t * (b.x - a.x)), 2) + Math.pow(p.y - (a.y + t * (b.y - a.y)), 2));
	}
}
