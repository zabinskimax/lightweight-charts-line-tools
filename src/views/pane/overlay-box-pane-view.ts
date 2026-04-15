import { convertTime } from '../../api/data-layer';
import { Time } from '../../api/data-consumer';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { Series } from '../../model/series';
import { LineStyle, LineWidth } from '../../renderers/draw-line';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { OverlayBoxRenderer, OverlayBoxRendererData } from '../../renderers/overlay-box-renderer';

import { IUpdatablePaneView } from './iupdatable-pane-view';

export interface OverlayBoxInternalOptions {
	time1: Time;
	price1: number;
	time2: Time;
	price2: number;
	fillColor?: string;
	borderColor?: string;
	borderWidth: LineWidth;
	borderStyle: LineStyle;
}

export class OverlayBoxPaneView implements IUpdatablePaneView {
	private readonly _model: ChartModel;
	private readonly _series: Series;
	private _options: OverlayBoxInternalOptions;
	private readonly _renderer: OverlayBoxRenderer = new OverlayBoxRenderer();

	public constructor(model: ChartModel, series: Series, options: OverlayBoxInternalOptions) {
		this._model = model;
		this._series = series;
		this._options = options;
	}

	public setOptions(options: OverlayBoxInternalOptions): void {
		this._options = options;
	}

	public update(): void {
		// no cache — coordinates resolved on each render
	}

	public renderer(_height: number, _width: number): IPaneRenderer | null {
		const timeScale = this._model.timeScale();
		if (timeScale.isEmpty()) {
			return null;
		}
		const firstValue = this._series.firstValue();
		if (firstValue === null) {
			return null;
		}

		const x1 = timeScale.timeToCoordinate(convertTime(this._options.time1));
		const x2 = timeScale.timeToCoordinate(convertTime(this._options.time2));
		const priceScale = this._series.priceScale();
		const y1 = priceScale.priceToCoordinate(this._options.price1 as never, firstValue.value);
		const y2 = priceScale.priceToCoordinate(this._options.price2 as never, firstValue.value);

		const data: OverlayBoxRendererData = {
			x1: x1 as Coordinate,
			y1: y1 as Coordinate,
			x2: x2 as Coordinate,
			y2: y2 as Coordinate,
			fillColor: this._options.fillColor,
			borderColor: this._options.borderColor,
			borderWidth: this._options.borderWidth,
			borderStyle: this._options.borderStyle,
		};
		this._renderer.setData(data);
		return this._renderer;
	}
}
