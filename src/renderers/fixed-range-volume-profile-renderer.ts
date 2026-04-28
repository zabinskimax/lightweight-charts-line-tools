import { Coordinate } from '../model/coordinate';
import { HitTestResult, HitTestType } from '../model/hit-test-result';
import { pointInBox } from '../model/interesection';
import { Box, Point } from '../model/point';

import { IPaneRenderer } from './ipane-renderer';
import { AnchorPoint } from './line-anchor-renderer';

export interface RenderedVolumeBar {
	/** Top y of this bar in CSS pixels (absolute within pane). */
	y: Coordinate;
	/** Height of this bar in CSS pixels. */
	h: number;
	/** Fraction of max-volume bar width [0–1]. */
	widthRatio: number;
	/** Buy-side fraction of max-volume bar width [0–1]. Only set in two-tone mode. */
	buyRatio?: number;
	/** Sell-side fraction of max-volume bar width [0–1]. Only set in two-tone mode. */
	sellRatio?: number;
	isPOC: boolean;
	isInValueArea: boolean;
}

interface DrawContext {
	ctx: CanvasRenderingContext2D;
	data: FixedRangeVolumeProfileRendererData;
	x0: number;
	x1: number;
	widthScale: number;
	rightAnchored: boolean;
}

export interface FixedRangeVolumeProfileRendererData {
	/** Anchor points: [0] top-left, [1] bottom-right (CSS pixels). */
	points: AnchorPoint[];
	bars: RenderedVolumeBar[];
	barColor: string;
	valueAreaColor: string;
	buyColor: string;
	sellColor: string;
	/** When true, render each bar as buy+sell segments and skip value-area tinting. */
	isTwoTone: boolean;
	pocColor: string;
	showPOC: boolean;
	showValueArea: boolean;
	borderColor: string;
	borderWidth: number;
	backgroundColor?: string;
	pocExpansion: 'none' | 'left' | 'right' | 'both';
	barWidthRatio: number;
	/** Which side of the box bars hang from. */
	barAnchorSide: 'left' | 'right';
}

export class FixedRangeVolumeProfileRenderer implements IPaneRenderer {
	private _data: FixedRangeVolumeProfileRendererData | null = null;
	private _hitTestResult: HitTestResult<void> = new HitTestResult(HitTestType.Regular);
	private _backHitTestResult: HitTestResult<void> = new HitTestResult(HitTestType.Regular);

	public setData(data: FixedRangeVolumeProfileRendererData): void {
		this._data = data;
	}

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

		const data = this._data;
		const [p0, p1] = this._getBoundsPhysical(pixelRatio);
		const x0 = p0.x;
		const y0 = p0.y;
		const x1 = p1.x;
		const y1 = p1.y;
		const totalWidth = x1 - x0;
		const totalHeight = y1 - y0;

		if (totalWidth <= 0 || totalHeight <= 0) { return; }

		ctx.save();

		if (data.backgroundColor) {
			ctx.fillStyle = data.backgroundColor;
			ctx.fillRect(x0, y0, totalWidth, totalHeight);
		}

		const drawCtx: DrawContext = {
			ctx,
			data,
			x0,
			x1,
			widthScale: totalWidth * data.barWidthRatio,
			rightAnchored: data.barAnchorSide === 'right',
		};

		for (const bar of data.bars) {
			const barY = Math.round(bar.y * pixelRatio);
			const barH = Math.max(1, Math.round(bar.h * pixelRatio));
			if (data.isTwoTone) {
				this._drawTwoTone(drawCtx, bar, barY, barH);
			} else {
				this._drawSingleTone(drawCtx, bar, barY, barH);
			}
		}

		if (data.showPOC) {
			this._drawPOC(ctx, pixelRatio, x0, x1, data);
		}

		ctx.restore();
	}

	private _drawTwoTone(dc: DrawContext, bar: RenderedVolumeBar, barY: number, barH: number): void {
		const buyW = Math.round((bar.buyRatio ?? 0) * dc.widthScale);
		const sellW = Math.round((bar.sellRatio ?? 0) * dc.widthScale);
		// Buy is drawn on the chart-interior side and sell on the edge side, so when
		// right-anchored: buy sits left of sell, with sell flush against x1.
		const buyX = dc.rightAnchored ? dc.x1 - buyW - sellW : dc.x0;
		const sellX = dc.rightAnchored ? dc.x1 - sellW : dc.x0 + buyW;
		if (buyW > 0) {
			dc.ctx.fillStyle = dc.data.buyColor;
			dc.ctx.fillRect(buyX, barY, buyW, barH);
		}
		if (sellW > 0) {
			dc.ctx.fillStyle = dc.data.sellColor;
			dc.ctx.fillRect(sellX, barY, sellW, barH);
		}
	}

	private _drawSingleTone(dc: DrawContext, bar: RenderedVolumeBar, barY: number, barH: number): void {
		const barW = Math.round(bar.widthRatio * dc.widthScale);
		if (barW <= 0) { return; }
		dc.ctx.fillStyle = (dc.data.showValueArea && bar.isInValueArea) ? dc.data.valueAreaColor : dc.data.barColor;
		const barX = dc.rightAnchored ? dc.x1 - barW : dc.x0;
		dc.ctx.fillRect(barX, barY, barW, barH);
	}

	private _drawPOC(
		ctx: CanvasRenderingContext2D,
		pixelRatio: number,
		x0: number,
		x1: number,
		data: FixedRangeVolumeProfileRendererData
	): void {
		const poc = data.bars.find((b: RenderedVolumeBar) => b.isPOC);
		if (!poc) { return; }
		const pocCenterY = Math.round((poc.y + poc.h / 2) * pixelRatio);
		const canvasWidth = ctx.canvas.width;
		const pocExpansion = data.pocExpansion;
		const lineX0 = (pocExpansion === 'left' || pocExpansion === 'both') ? 0 : x0;
		const lineX1 = (pocExpansion === 'right' || pocExpansion === 'both') ? canvasWidth : x1;
		ctx.strokeStyle = data.pocColor;
		ctx.lineWidth = Math.max(1, Math.round(pixelRatio));
		ctx.beginPath();
		ctx.moveTo(lineX0, pocCenterY);
		ctx.lineTo(lineX1, pocCenterY);
		ctx.stroke();
	}

	private _getBoundsPhysical(pixelRatio: number): [Point, Point] {
		if (this._data === null) {
			return [new Point(0, 0), new Point(0, 0)];
		}
		const [pt0, pt1] = this._data.points;
		const x0 = Math.round(Math.min(pt0.x, pt1.x) * pixelRatio);
		const y0 = Math.round(Math.min(pt0.y, pt1.y) * pixelRatio);
		const x1 = Math.round(Math.max(pt0.x, pt1.x) * pixelRatio);
		const y1 = Math.round(Math.max(pt0.y, pt1.y) * pixelRatio);
		return [new Point(x0, y0), new Point(x1, y1)];
	}
}
