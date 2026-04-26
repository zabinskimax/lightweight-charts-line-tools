import { SeriesItemsIndexesRange } from '../model/time-data';

import { LinePoint, LineType } from './draw-line';
import { ScaledRenderer } from './scaled-renderer';
import { walkLine } from './walk-line';

export interface PolygonFillColorRun {
	fromIndex: number;
	toIndex: number;
	color: string;
}

export interface PolygonFillRendererData {
	topItems: LinePoint[];
	bottomItems: LinePoint[];
	lineType: LineType;
	fillColor: string;
	topVisibleRange: SeriesItemsIndexesRange | null;
	bottomVisibleRange: SeriesItemsIndexesRange | null;
	runs?: readonly PolygonFillColorRun[];
}

interface PolygonSegmentBounds {
	topFrom: number;
	topTo: number;
	bottomFrom: number;
	bottomTo: number;
}

export class PolygonFillRenderer extends ScaledRenderer {
	private _data: PolygonFillRendererData | null = null;

	public setData(data: PolygonFillRendererData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		const data = this._data;
		if (
			data === null ||
			data.topItems.length === 0 ||
			data.bottomItems.length === 0 ||
			data.topVisibleRange === null ||
			data.bottomVisibleRange === null ||
			data.topVisibleRange.from >= data.topVisibleRange.to ||
			data.bottomVisibleRange.from >= data.bottomVisibleRange.to
		) {
			return;
		}

		const topVisFrom = data.topVisibleRange.from;
		const topVisTo = data.topVisibleRange.to - 1;
		const bottomVisFrom = data.bottomVisibleRange.from;
		const bottomVisTo = data.bottomVisibleRange.to - 1;

		const runs = data.runs;
		if (runs === undefined || runs.length === 0) {
			this._drawSegmentSplitOnGaps(
				ctx,
				data,
				{ topFrom: topVisFrom, topTo: topVisTo, bottomFrom: bottomVisFrom, bottomTo: bottomVisTo },
				data.fillColor
			);
			return;
		}

		for (let r = 0; r < runs.length; r++) {
			const run = runs[r];
			const topFrom = Math.max(run.fromIndex, topVisFrom);
			const topTo = Math.min(run.toIndex, topVisTo);
			const bottomFrom = Math.max(run.fromIndex, bottomVisFrom);
			const bottomTo = Math.min(run.toIndex, bottomVisTo);
			if (topFrom > topTo || bottomFrom > bottomTo) {
				continue;
			}
			this._drawSegmentSplitOnGaps(ctx, data, { topFrom, topTo, bottomFrom, bottomTo }, run.color);
		}
	}

	/**
	 * Wrap `_drawSegment` with gap detection: split the requested
	 * [topFrom..topTo] / [bottomFrom..bottomTo] range into one
	 * sub-polygon per contiguous run of positions where BOTH top and
	 * bottom items have finite coords. Positions where either edge has
	 * NaN y (from a null-valued backend descriptor that
	 * `priceScale.pointsArrayToCoordinates` left at the initializer
	 * NaN) terminate the current sub-polygon and the next finite
	 * position starts a fresh one.
	 *
	 * Without this split the polygon would walk straight through gap
	 * positions: `ctx.lineTo(NaN, NaN)` is a silent no-op, but the
	 * canvas pen position stays at the last finite vertex, so the next
	 * valid `lineTo` connects across the entire gap. Visually that
	 * shows up as a diagonal wedge from the last bar of one valid run
	 * to the first bar of the next — the exact "filled even if the
	 * line is not there" artifact Supertrend's body-midline fills
	 * produced before this patch.
	 *
	 * For the existing all-finite case (Bollinger upper/lower,
	 * Ichimoku Kumo, RSI midline fill) the loop never sees a NaN, so
	 * `segStart` stays at the initial value through the whole range
	 * and emits exactly one `_drawSegment` call — identical to the
	 * pre-patch behavior. The split only kicks in when descriptors
	 * actually carry internal nulls.
	 */
	private _drawSegmentSplitOnGaps(
		ctx: CanvasRenderingContext2D,
		data: PolygonFillRendererData,
		bounds: PolygonSegmentBounds,
		color: string
	): void {
		const { topFrom, topTo, bottomFrom, bottomTo } = bounds;

		// Scalar-edge fallback. When the descriptor's `top` or `bottom`
		// is a numeric price level, fill.js synthesizes a flat 2-point
		// anchor series at firstBarTime / lastBarTime. The resulting
		// top and bottom ranges then describe completely different
		// position spaces (top: K real bars; bottom: just [0..1]) and
		// the original `_drawSegment` is built to walk them
		// independently — wrapping its top edge with the bottom's
		// 2-point baseline. Position-aligned gap splitting doesn't
		// apply here, so delegate without the split. We detect this by
		// the two ranges not lining up; for sibling-edge fills
		// (Bollinger upper/lower, Ichimoku span_a/span_b, Supertrend
		// body_mid_up/up_trail) the caller passes identical bounds
		// because both edges share a visible range.
		if (topFrom !== bottomFrom || topTo !== bottomTo) {
			this._drawSegment(ctx, data, bounds, color);
			return;
		}

		// Sibling-edge path. Walk position-by-position and split at any
		// position where EITHER edge has a non-finite y, so a gap in
		// the source data produces a real visual gap in the fill
		// instead of a diagonal smear from the last valid bar of one
		// run to the first valid bar of the next.
		let segStart = -1;
		for (let i = topFrom; i <= topTo; i++) {
			const top = data.topItems[i];
			const bot = data.bottomItems[i];
			const valid = Number.isFinite(top.y) && Number.isFinite(bot.y);

			if (valid) {
				if (segStart < 0) {
					segStart = i;
				}
			} else if (segStart >= 0) {
				this._drawSegment(
					ctx,
					data,
					{ topFrom: segStart, topTo: i - 1, bottomFrom: segStart, bottomTo: i - 1 },
					color
				);
				segStart = -1;
			}
		}
		if (segStart >= 0) {
			this._drawSegment(
				ctx,
				data,
				{ topFrom: segStart, topTo, bottomFrom: segStart, bottomTo: topTo },
				color
			);
		}
	}

	private _drawSegment(
		ctx: CanvasRenderingContext2D,
		data: PolygonFillRendererData,
		bounds: PolygonSegmentBounds,
		color: string
	): void {
		const { topFrom, topTo, bottomFrom, bottomTo } = bounds;

		ctx.beginPath();

		walkLine(ctx, data.topItems, data.lineType, { from: topFrom, to: topTo + 1 });

		ctx.lineTo(data.bottomItems[bottomTo].x, data.bottomItems[bottomTo].y);

		for (let i = bottomTo - 1; i >= bottomFrom; --i) {
			if (data.lineType === LineType.WithSteps) {
				const nextX = data.bottomItems[i + 1].x;
				ctx.lineTo(nextX, data.bottomItems[i].y);
			}
			ctx.lineTo(data.bottomItems[i].x, data.bottomItems[i].y);
		}

		ctx.lineTo(data.topItems[topFrom].x, data.topItems[topFrom].y);

		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
	}
}
