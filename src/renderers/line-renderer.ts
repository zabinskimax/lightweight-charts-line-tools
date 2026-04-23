import { PricedValue } from '../model/price-scale';
import { SeriesItemsIndexesRange, TimedValue } from '../model/time-data';

import { LinePoint, LineStyle, LineType, LineWidth, setLineStyle } from './draw-line';
import { ScaledRenderer } from './scaled-renderer';
import { walkLine } from './walk-line';

export type LineItem = TimedValue & PricedValue & LinePoint & { color?: string };

export interface PaneRendererLineDataBase {
	lineType: LineType;

	items: LineItem[];

	barWidth: number;

	lineWidth: LineWidth;
	lineStyle: LineStyle;

	visibleRange: SeriesItemsIndexesRange | null;

	/**
	 * Optional per-render flags surfaced from {@link LineStyleOptions}.
	 * Both default to undefined when callers omit them; the renderer
	 * falls back to "stroke the line, don't draw markers" — i.e. the
	 * pre-extension behavior — so omitting them is safe for any
	 * series-pane-view that doesn't surface the new options (e.g. the
	 * area pane view, which doesn't expose pointMarkers* on its style
	 * options).
	 */
	lineVisible?: boolean;
	pointMarkersVisible?: boolean;
	pointMarkersRadius?: number;
}

export abstract class PaneRendererLineBase<TData extends PaneRendererLineDataBase> extends ScaledRenderer {
	protected _data: TData | null = null;

	public setData(data: TData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		if (this._data === null || this._data.items.length === 0 || this._data.visibleRange === null) {
			return;
		}

		ctx.lineCap = 'butt';
		ctx.lineWidth = this._data.lineWidth;

		setLineStyle(ctx, this._data.lineStyle);

		ctx.strokeStyle = this._strokeStyle(ctx);
		ctx.lineJoin = 'round';

		// Stroke the connecting line. `lineVisible !== false` (default
		// true) keeps existing series rendering identical; series like
		// Parabolic SAR pass `lineVisible: false` explicitly to render
		// only the per-bar markers below.
		if (this._data.lineVisible !== false) {
			if (this._data.items.length === 1) {
				ctx.beginPath();

				const point = this._data.items[0];
				ctx.moveTo(point.x - this._data.barWidth / 2, point.y);
				ctx.lineTo(point.x + this._data.barWidth / 2, point.y);

				if (point.color !== undefined) {
					ctx.strokeStyle = point.color;
				}

				ctx.stroke();
			} else {
				this._drawLine(ctx, this._data);
			}
		}

		// Optional filled-circle marker per bar. Drawn *after* the line
		// so dots sit on top. `pointMarkersVisible` defaults to false
		// (undefined → falsy) so existing series get no markers.
		if (this._data.pointMarkersVisible) {
			this._drawPointMarkers(ctx, this._data);
		}
	}

	protected _drawLine(ctx: CanvasRenderingContext2D, data: TData): void {
		ctx.beginPath();
		walkLine(ctx, data.items, data.lineType, data.visibleRange as SeriesItemsIndexesRange);
		ctx.stroke();
	}

	/**
	 * Default per-bar dot renderer. Uses the current strokeStyle as
	 * fill so the markers visually match the line color. Subclasses
	 * with per-item colors (PaneRendererLine) override this to honor
	 * the per-bar color.
	 *
	 * Skips items whose y coord is NaN (gap items emitted by the
	 * frontend's null-preserving toPoints / position-shifting
	 * applyOffset). Drawing arcs at NaN coords is a silent no-op on
	 * canvas, but skipping explicitly avoids the begin/arc/fill cycle
	 * for every gap bar.
	 */
	protected _drawPointMarkers(ctx: CanvasRenderingContext2D, data: TData): void {
		if (data.visibleRange === null) {
			return;
		}
		const radius = data.pointMarkersRadius ?? 2;
		const fill = ctx.strokeStyle as string;
		ctx.fillStyle = fill;
		for (let i = data.visibleRange.from; i < data.visibleRange.to; ++i) {
			const item = data.items[i];
			if (!Number.isFinite(item.y)) {
				continue;
			}
			ctx.beginPath();
			ctx.arc(item.x, item.y, radius, 0, 2 * Math.PI);
			ctx.fill();
		}
	}

	protected abstract _strokeStyle(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D['strokeStyle'];
}

export interface PaneRendererLineData extends PaneRendererLineDataBase {
	lineColor: string;
}

export class PaneRendererLine extends PaneRendererLineBase<PaneRendererLineData> {
	/**
	 * Similar to {@link walkLine}, but supports color changes AND
	 * NaN-breaks.
	 *
	 * NaN-break semantics: items with `Number.isNaN(y)` terminate the
	 * current sub-path. The next valid item starts a fresh sub-path with
	 * `moveTo`, so internal nulls in the source data become true visual
	 * gaps in the rendered line. Without this branch the canvas would
	 * silently skip the `lineTo(NaN, NaN)` (the HTML canvas spec drops
	 * non-finite coords) and the next valid `lineTo` would draw from the
	 * last finite pen position across the gap — exactly the "null
	 * values silently render as a continuous line" bug that motivated
	 * this patch. The NaN y coord itself comes from
	 * `priceScale.pointsArrayToCoordinates` which skips NaN prices and
	 * leaves the item's y at the `NaN as Coordinate` initializer in
	 * `LinePaneViewBase._createRawItemBase`.
	 *
	 * Color state is preserved across gaps: if the pre-gap run ended in
	 * red and the post-gap run starts in red, no stroke flush is needed
	 * at the sub-path boundary (the flush already happens on the gap).
	 * Step-line geometry uses the *previous valid* item's y, not
	 * `items[i-1].y`, so a step immediately after a gap bases its
	 * horizontal segment on the last real point rather than the NaN
	 * item we just skipped.
	 */
	protected override _drawLine(ctx: CanvasRenderingContext2D, data: PaneRendererLineData): void {
		const { items, visibleRange, lineType, lineColor } = data;
		if (items.length === 0 || visibleRange === null) {
			return;
		}

		ctx.beginPath();

		let prevValid: LineItem | null = null;
		let prevStrokeStyle: string = lineColor;
		let pathOpen = false;

		const flushSubPath = () => {
			ctx.strokeStyle = prevStrokeStyle;
			ctx.stroke();
			ctx.beginPath();
		};

		for (let i = visibleRange.from; i < visibleRange.to; ++i) {
			const currItem = items[i];

			if (Number.isNaN(currItem.y)) {
				if (pathOpen) {
					flushSubPath();
					pathOpen = false;
				}
				prevValid = null;
				continue;
			}

			const currentStrokeStyle = currItem.color ?? lineColor;

			if (!pathOpen) {
				prevStrokeStyle = currentStrokeStyle;
				ctx.moveTo(currItem.x, currItem.y);
				pathOpen = true;
				prevValid = currItem;
				continue;
			}

			if (lineType === LineType.WithSteps) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const prevY = prevValid!.y;
				ctx.lineTo(currItem.x, prevY);

				if (currentStrokeStyle !== prevStrokeStyle) {
					flushSubPath();
					prevStrokeStyle = currentStrokeStyle;
					ctx.moveTo(currItem.x, prevY);
				}
			}

			ctx.lineTo(currItem.x, currItem.y);

			if (lineType !== LineType.WithSteps && currentStrokeStyle !== prevStrokeStyle) {
				flushSubPath();
				prevStrokeStyle = currentStrokeStyle;
				ctx.moveTo(currItem.x, currItem.y);
			}

			prevValid = currItem;
		}

		if (pathOpen) {
			ctx.strokeStyle = prevStrokeStyle;
			ctx.stroke();
		}
	}

	/**
	 * Colored override of {@link PaneRendererLineBase._drawPointMarkers}.
	 * Honors the per-bar `LineItem.color` (used by indicators that emit a
	 * `colors` array — Parabolic SAR's green-on-uptrend / red-on-
	 * downtrend dot trail, for example), falling back to the series's
	 * scalar `lineColor` when an item carries no per-bar color.
	 */
	protected override _drawPointMarkers(ctx: CanvasRenderingContext2D, data: PaneRendererLineData): void {
		if (data.visibleRange === null) {
			return;
		}
		const radius = data.pointMarkersRadius ?? 2;
		for (let i = data.visibleRange.from; i < data.visibleRange.to; ++i) {
			const item = data.items[i];
			if (!Number.isFinite(item.y)) {
				continue;
			}
			ctx.fillStyle = item.color ?? data.lineColor;
			ctx.beginPath();
			ctx.arc(item.x, item.y, radius, 0, 2 * Math.PI);
			ctx.fill();
		}
	}

	protected override _strokeStyle(): CanvasRenderingContext2D['strokeStyle'] {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this._data!.lineColor;
	}
}
