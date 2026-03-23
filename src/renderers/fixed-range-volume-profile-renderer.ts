import { Coordinate } from '../model/coordinate';
import { HitTestResult, HitTestType } from '../model/hit-test-result';
import { pointInBox } from '../model/interesection';
import { Box, Point } from '../model/point';
import { AnchorPoint } from './line-anchor-renderer';
import { IPaneRenderer } from './ipane-renderer';

export interface RenderedVolumeBar {
	/** Top y of this bar in CSS pixels (absolute within pane). */
	y: Coordinate;
	/** Height of this bar in CSS pixels. */
	h: number;
	/** Fraction of max-volume bar width [0–1]. */
	widthRatio: number;
	isPOC: boolean;
	isInValueArea: boolean;
}

export interface FixedRangeVolumeProfileRendererData {
	/** Anchor points: [0] top-left, [1] bottom-right (CSS pixels). */
	points: AnchorPoint[];
	bars: RenderedVolumeBar[];
	barColor: string;
	valueAreaColor: string;
	pocColor: string;
	showPOC: boolean;
	showValueArea: boolean;
	borderColor: string;
	borderWidth: number;
	backgroundColor?: string;
	pocExpansion: 'none' | 'left' | 'right' | 'both';
	barWidthRatio: number;
}

export class FixedRangeVolumeProfileRenderer implements IPaneRenderer {
	private _data: FixedRangeVolumeProfileRendererData | null = null;

	public setData(data: FixedRangeVolumeProfileRendererData): void {
		this._data = data;
	}

	private _hitTestResult: HitTestResult<void> = new HitTestResult(HitTestType.Regular);
	private _backHitTestResult: HitTestResult<void> = new HitTestResult(HitTestType.Regular);

	public hitTest(x: Coordinate, y: Coordinate, ctx: CanvasRenderingContext2D): HitTestResult<void> | null {
		if (!this._data || this._data.points.length < 2) { return null; }
		const pixelRatio = ctx.canvas.ownerDocument?.defaultView?.devicePixelRatio ?? 1;
		const scaledPt = new Point(x * pixelRatio, y * pixelRatio);
		const [p0, p1] = this._getBoundsPhysical(pixelRatio);
		const tolerance = 4;

		if (
			Math.abs(scaledPt.x - p0.x) <= tolerance ||
			Math.abs(scaledPt.x - p1.x) <= tolerance ||
			Math.abs(scaledPt.y - p0.y) <= tolerance ||
			Math.abs(scaledPt.y - p1.y) <= tolerance
		) {
			if (scaledPt.x >= p0.x - tolerance && scaledPt.x <= p1.x + tolerance &&
				scaledPt.y >= p0.y - tolerance && scaledPt.y <= p1.y + tolerance) {
				return this._hitTestResult;
			}
		}

		if (pointInBox(scaledPt, new Box(p0, p1))) {
			return this._backHitTestResult;
		}

		return null;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (!this._data || this._data.points.length < 2) { return; }

		const { bars, barColor, valueAreaColor, pocColor, showPOC, showValueArea } = this._data;
		const [p0, p1] = this._getBoundsPhysical(pixelRatio);
		const x0 = p0.x;
		const y0 = p0.y;
		const x1 = p1.x;
		const y1 = p1.y;
		const totalWidth = x1 - x0;
		const totalHeight = y1 - y0;

		if (totalWidth <= 0 || totalHeight <= 0) { return; }

		ctx.save();

		if (this._data.backgroundColor) {
			ctx.fillStyle = this._data.backgroundColor;
			ctx.fillRect(x0, y0, totalWidth, totalHeight);
		}

		for (const bar of bars) {
			const barY = Math.round(bar.y * pixelRatio);
			const barH = Math.max(1, Math.round(bar.h * pixelRatio));
			const barW = Math.round(bar.widthRatio * totalWidth * this._data.barWidthRatio);

			if (barW > 0) {
				ctx.fillStyle = (showValueArea && bar.isInValueArea) ? valueAreaColor : barColor;
				ctx.fillRect(x0, barY, barW, barH);
			}
		}

		if (showPOC) {
			const poc = bars.find(b => b.isPOC);
			if (poc) {
				const pocCenterY = Math.round((poc.y + poc.h / 2) * pixelRatio);
				const canvasWidth = ctx.canvas.width;
				const pocExpansion = this._data.pocExpansion;
				const lineX0 = (pocExpansion === 'left' || pocExpansion === 'both') ? 0 : x0;
				const lineX1 = (pocExpansion === 'right' || pocExpansion === 'both') ? canvasWidth : x1;
				ctx.strokeStyle = pocColor;
				ctx.lineWidth = Math.max(1, Math.round(pixelRatio));
				ctx.beginPath();
				ctx.moveTo(lineX0, pocCenterY);
				ctx.lineTo(lineX1, pocCenterY);
				ctx.stroke();
			}
		}

		// Background border outline not drawn for fixed height profile

		ctx.restore();
	}

	private _getBoundsPhysical(pixelRatio: number): [Point, Point] {
		const [pt0, pt1] = this._data!.points;
		const x0 = Math.round(Math.min(pt0.x, pt1.x) * pixelRatio);
		const y0 = Math.round(Math.min(pt0.y, pt1.y) * pixelRatio);
		const x1 = Math.round(Math.max(pt0.x, pt1.x) * pixelRatio);
		const y1 = Math.round(Math.max(pt0.y, pt1.y) * pixelRatio);
		return [new Point(x0, y0), new Point(x1, y1)];
	}
}
