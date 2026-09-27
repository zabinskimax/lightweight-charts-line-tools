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
	/** Draw VAH / VAL lines at the top and bottom edge of the value-area bars. */
	showValueAreaLines: boolean;
	valueAreaLineColor: string;
	borderColor: string;
	borderWidth: number;
	backgroundColor?: string;
	pocExpansion: 'none' | 'left' | 'right' | 'both';
	barWidthRatio: number;
	/** Which side of the box bars hang from. */
	barAnchorSide: 'left' | 'right';
	/**
	 * Only the histogram's own strip is clickable, not the whole box. For a
	 * profile whose box spans the chart, so it doesn't swallow clicks meant for
	 * the candles under it.
	 */
	hitTestBarsOnly?: boolean;
	/**
	 * Where the POC and VAH / VAL lines start (CSS px) when not at the box's
	 * left edge: the anchored profile's box is the whole pane, its lines start
	 * at the anchor bar.
	 */
	linesStartX?: number;
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

		if (this._data.hitTestBarsOnly) {
			return this._hitTestBarsStrip(scaledPt, p0, p1, this._data);
		}

		if (this._onBorder(scaledPt, p0, p1)) {
			return this._hitTestResult;
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
			// Round both edges, not the height, so touching rows leave no gap.
			const barY = Math.round(bar.y * pixelRatio);
			const barH = Math.max(1, Math.round((bar.y + bar.h) * pixelRatio) - barY);
			if (data.isTwoTone) {
				this._drawTwoTone(drawCtx, bar, barY, barH);
			} else {
				this._drawSingleTone(drawCtx, bar, barY, barH);
			}
		}

		const linesX0 = data.linesStartX === undefined ? x0 : Math.round(data.linesStartX * pixelRatio);

		if (data.showValueArea && data.showValueAreaLines) {
			this._drawValueAreaLines(ctx, pixelRatio, linesX0, x1, data);
		}

		if (data.showPOC) {
			this._drawPOC(ctx, pixelRatio, linesX0, x1, data);
		}

		ctx.restore();
	}

	// Within 4px of the box outline.
	private _onBorder(pt: Point, p0: Point, p1: Point): boolean {
		const tolerance = 4;
		const nearEdge = Math.abs(pt.x - p0.x) <= tolerance || Math.abs(pt.x - p1.x) <= tolerance ||
			Math.abs(pt.y - p0.y) <= tolerance || Math.abs(pt.y - p1.y) <= tolerance;
		return nearEdge && pt.x >= p0.x - tolerance && pt.x <= p1.x + tolerance &&
			pt.y >= p0.y - tolerance && pt.y <= p1.y + tolerance;
	}

	private _hitTestBarsStrip(pt: Point, p0: Point, p1: Point, data: FixedRangeVolumeProfileRendererData): HitTestResult<void> | null {
		const strip = (p1.x - p0.x) * data.barWidthRatio;
		const left = data.barAnchorSide === 'right' ? p1.x - strip : p0.x;
		const inside = pointInBox(pt, new Box(new Point(left, p0.y), new Point(left + strip, p1.y)));
		return inside ? this._backHitTestResult : null;
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

	// VAH / VAL span the profile box. The value area is contiguous, so its
	// high is the top of the highest value-area bar and its low the bottom of
	// the lowest. Works in two-tone mode too, where the bars carry no tint.
	private _drawValueAreaLines(
		ctx: CanvasRenderingContext2D,
		pixelRatio: number,
		x0: number,
		x1: number,
		data: FixedRangeVolumeProfileRendererData
	): void {
		let top = Infinity;
		let bottom = -Infinity;
		for (const bar of data.bars) {
			if (!bar.isInValueArea) { continue; }
			top = Math.min(top, bar.y);
			bottom = Math.max(bottom, bar.y + bar.h);
		}
		if (!isFinite(top) || !isFinite(bottom)) { return; }
		const vahY = Math.round(top * pixelRatio);
		const valY = Math.round(bottom * pixelRatio);
		ctx.strokeStyle = data.valueAreaLineColor;
		ctx.lineWidth = Math.max(1, Math.round(pixelRatio));
		ctx.beginPath();
		ctx.moveTo(x0, vahY);
		ctx.lineTo(x1, vahY);
		ctx.moveTo(x0, valY);
		ctx.lineTo(x1, valY);
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
