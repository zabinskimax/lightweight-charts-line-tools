import { DeepPartial } from '../helpers/strict-type-checks';

import { Coordinate } from '../model/coordinate';
import { HitTestResult, HitTestType } from '../model/hit-test-result';
import { CircleOptions } from '../model/line-tool-options';
import { Point } from '../model/point';

import { LineStyle } from '..';
import { setLineStyle } from './draw-line';
import { IPaneRenderer } from './ipane-renderer';
import { AnchorPoint } from './line-anchor-renderer';
import { interactionTolerance } from './optimal-bar-width';

export type ArcRendererData = DeepPartial<CircleOptions> & {
	points: AnchorPoint[];
	radius: number;
	startAngle: number;
	endAngle: number;
	hitTestBackground?: boolean;
};

export class ArcRenderer implements IPaneRenderer {
	protected _backHitTest: HitTestResult<void>;
	protected _hitTest: HitTestResult<void>;
	protected _data: ArcRendererData | null;

	public constructor(hitTest?: HitTestResult<void>, backHitTest?: HitTestResult<void>) {
		this._backHitTest = backHitTest || new HitTestResult(HitTestType.MovePointBackground);
		this._hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
		this._data = null;
	}

	public setData(data: ArcRendererData): void {
		this._data = data;
	}

	public hitTest(x: Coordinate, y: Coordinate, ctx: CanvasRenderingContext2D): HitTestResult<void> | null {
		if (null === this._data || this._data.points.length < 1) {
			return null;
		}

		const pixelRatio = ctx.canvas.ownerDocument && ctx.canvas.ownerDocument.defaultView && ctx.canvas.ownerDocument.defaultView.devicePixelRatio || 1;
		const tolerance = interactionTolerance.line + 2;
		const scaledPoint = new Point(x * pixelRatio, y * pixelRatio);
		const center = new Point(this._data.points[0].x * pixelRatio, this._data.points[0].y * pixelRatio);

		const distanceToCenter = Math.sqrt(Math.pow(center.x - scaledPoint.x, 2) + Math.pow(center.y - scaledPoint.y, 2));
		const radius = this._data.radius * pixelRatio;

		const angle = Math.atan2(scaledPoint.y - center.y, scaledPoint.x - center.x);
		const normalizedStart = this._normalizeAngle(this._data.startAngle);
		const normalizedEnd = this._normalizeAngle(this._data.endAngle);
		const normalizedAngle = this._normalizeAngle(angle);

		const inAngleRange = this._isAngleBetween(normalizedAngle, normalizedStart, normalizedEnd);

		if (inAngleRange && Math.abs(distanceToCenter - radius) <= tolerance) {
			return this._hitTest;
		}

		return null;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number, isHovered: boolean, hitTestData?: unknown): void {
		if (this._data === null || this._data.points.length < 1) {
			return;
		}

		ctx.save();

		const center = new Point(this._data.points[0].x * pixelRatio, this._data.points[0].y * pixelRatio);
		const radius = this._data.radius * pixelRatio;
		const startAngle = this._data.startAngle;
		const endAngle = this._data.endAngle;

		const borderWidth = this._data.border?.width || 0;
		const scaledBorderWidth = borderWidth ? Math.max(1, Math.floor(borderWidth * pixelRatio)) : 0;
		const borderColor = this._data.border?.color;
		const background = this._data.background?.color;

		if (background) {
			ctx.fillStyle = background;
			ctx.beginPath();
			ctx.moveTo(center.x, center.y);
			ctx.arc(center.x, center.y, radius, startAngle, endAngle);
			ctx.closePath();
			ctx.fill();
		}

		if (borderColor && scaledBorderWidth > 0) {
			ctx.beginPath();
			setLineStyle(ctx, this._data.border?.style || LineStyle.Solid);
			ctx.arc(center.x, center.y, radius, startAngle, endAngle);
			ctx.lineWidth = scaledBorderWidth;
			ctx.strokeStyle = borderColor;
			ctx.stroke();
		}

		ctx.restore();
	}

	private _normalizeAngle(angle: number): number {
		while (angle < 0) { angle += 2 * Math.PI; }
		while (angle >= 2 * Math.PI) { angle -= 2 * Math.PI; }
		return angle;
	}

	private _isAngleBetween(angle: number, start: number, end: number): boolean {
		if (start <= end) {
			return angle >= start && angle <= end;
		} else {
			return angle >= start || angle <= end;
		}
	}
}
