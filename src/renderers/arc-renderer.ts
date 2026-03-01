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
	radiusY?: number;
	innerRadius?: number;
	innerRadiusY?: number;
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

		const rx = this._data.radius * pixelRatio;
		const ry = (this._data.radiusY ?? this._data.radius) * pixelRatio;

		if (rx < 0.5 || ry < 0.5) {
			return null;
		}

		// Ellipse hit test: (scaledX/rx)^2 + (scaledY/ry)^2 = 1
		const dx = scaledPoint.x - center.x;
		const dy = scaledPoint.y - center.y;
		const normalizedDistance = Math.sqrt(Math.pow(dx / rx, 2) + Math.pow(dy / ry, 2));

		const angle = Math.atan2(dy, dx);
		const normalizedStart = this._normalizeAngle(this._data.startAngle);
		const normalizedEnd = this._normalizeAngle(this._data.endAngle);
		const normalizedAngle = this._normalizeAngle(angle);

		const inAngleRange = this._isAngleBetween(normalizedAngle, normalizedStart, normalizedEnd);
		if (!inAngleRange) {
			return null;
		}

		const toleranceInUnit = tolerance / Math.min(rx, ry);

		// 1. Check outer boundary
		if (Math.abs(normalizedDistance - 1) <= toleranceInUnit) {
			return this._hitTest;
		}

		// 2. Check inner boundary
		if (this._data.innerRadius !== undefined) {
			const irx = this._data.innerRadius * pixelRatio;
			const iry = (this._data.innerRadiusY ?? (this._data.innerRadius * (ry / rx))) * pixelRatio;
			if (irx > 0.5 && iry > 0.5) {
				const innerNormalizedDistance = Math.sqrt(Math.pow(dx / irx, 2) + Math.pow(dy / iry, 2));
				const innerToleranceInUnit = tolerance / Math.min(irx, iry);
				if (Math.abs(innerNormalizedDistance - 1) <= innerToleranceInUnit) {
					return this._hitTest;
				}

				// 3. Check background (area between inner and outer)
				if (this._data.hitTestBackground && normalizedDistance < 1 && innerNormalizedDistance > 1) {
					return this._backHitTest;
				}
			}
		} else if (this._data.hitTestBackground && normalizedDistance < 1) {
			// 3b. Check background (full wedge/circle)
			return this._backHitTest;
		}

		return null;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number, isHovered: boolean, hitTestData?: unknown): void {
		if (this._data === null || this._data.points.length < 1) {
			return;
		}

		ctx.save();

		const center = new Point(this._data.points[0].x * pixelRatio, this._data.points[0].y * pixelRatio);
		const radiusX = this._data.radius * pixelRatio;
		const radiusY = (this._data.radiusY ?? this._data.radius) * pixelRatio;
		const startAngle = this._data.startAngle;
		const endAngle = this._data.endAngle;

		const borderWidth = this._data.border?.width || 0;
		const scaledBorderWidth = borderWidth ? Math.max(1, Math.floor(borderWidth * pixelRatio)) : 0;
		const borderColor = this._data.border?.color;
		const background = this._data.background?.color;

		if (background) {
			ctx.fillStyle = background;
			ctx.beginPath();
			const innerRadiusX = this._data.innerRadius !== undefined ? this._data.innerRadius * pixelRatio : 0;
			const innerRadiusY = this._data.innerRadiusY !== undefined ? this._data.innerRadiusY * pixelRatio : (this._data.innerRadius !== undefined ? this._data.innerRadius * (radiusY / radiusX) * pixelRatio : 0);

			if (innerRadiusX > 0 || innerRadiusY > 0) {
				ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, startAngle, endAngle);
				ctx.ellipse(center.x, center.y, innerRadiusX, innerRadiusY, 0, endAngle, startAngle, true);
			} else {
				ctx.moveTo(center.x, center.y);
				ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, startAngle, endAngle);
			}
			ctx.closePath();
			ctx.fill();
		}

		if (borderColor && scaledBorderWidth > 0) {
			ctx.beginPath();
			setLineStyle(ctx, this._data.border?.style || LineStyle.Solid);
			ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, startAngle, endAngle);
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
