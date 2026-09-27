import { Time } from '../../api/data-consumer';
import { convertTime } from '../../api/data-layer';

import { ChartModel } from '../../model/chart-model';
import { intersectLineSegmentAndBox } from '../../model/interesection';
import { Box, Point, Segment } from '../../model/point';
import { Series } from '../../model/series';
import { LineStyle, LineWidth } from '../../renderers/draw-line';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { OverlayLineRenderer, OverlayLineRendererData } from '../../renderers/overlay-line-renderer';

import { IUpdatablePaneView } from './iupdatable-pane-view';

export interface OverlayLineInternalOptions {
	time1: Time;
	price1: number;
	time2: Time;
	price2: number;
	color: string;
	lineWidth: LineWidth;
	lineStyle: LineStyle;
	xOffsetBars: number;
}

// Pixels kept outside the pane when clipping, so line caps at the edge stay whole.
const CLIP_MARGIN = 2;

export class OverlayLinePaneView implements IUpdatablePaneView {
	private readonly _model: ChartModel;
	private readonly _series: Series;
	private _options: OverlayLineInternalOptions;
	private readonly _renderer: OverlayLineRenderer = new OverlayLineRenderer();

	public constructor(model: ChartModel, series: Series, options: OverlayLineInternalOptions) {
		this._model = model;
		this._series = series;
		this._options = options;
	}

	public setOptions(options: OverlayLineInternalOptions): void {
		this._options = options;
	}

	public update(): void {
		// no cache — coordinates resolved on each render
	}

	public renderer(height: number, width: number): IPaneRenderer | null {
		const timeScale = this._model.timeScale();
		if (timeScale.isEmpty()) {
			return null;
		}
		const firstValue = this._series.firstValue();
		if (firstValue === null) {
			return null;
		}

		const shift = (this._options.xOffsetBars || 0) * timeScale.barSpacing();
		const x1 = timeScale.timeToCoordinate(convertTime(this._options.time1)) + shift;
		const x2 = timeScale.timeToCoordinate(convertTime(this._options.time2)) + shift;
		const priceScale = this._series.priceScale();
		const y1 = priceScale.priceToCoordinate(this._options.price1 as never, firstValue.value);
		const y2 = priceScale.priceToCoordinate(this._options.price2 as never, firstValue.value);

		// Stroke only the part inside the pane. A full-height marker (a session
		// break) runs between prices far off screen, and stroked whole a dashed
		// line that long costs the GPU millions of dashes on every frame.
		const clipped = intersectLineSegmentAndBox(
			[new Point(x1, y1), new Point(x2, y2)] as Segment,
			new Box(new Point(-CLIP_MARGIN, -CLIP_MARGIN), new Point(width + CLIP_MARGIN, height + CLIP_MARGIN))
		);
		if (!Array.isArray(clipped)) {
			return null;
		}
		const [start, end] = clipped;

		const data: OverlayLineRendererData = {
			x1: start.x,
			y1: start.y,
			x2: end.x,
			y2: end.y,
			color: this._options.color,
			lineWidth: this._options.lineWidth,
			lineStyle: this._options.lineStyle,
		};
		this._renderer.setData(data);
		return this._renderer;
	}
}
