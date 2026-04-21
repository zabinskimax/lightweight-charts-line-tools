import { convertTime } from '../../api/data-layer';
import { Time } from '../../api/data-consumer';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { Series } from '../../model/series';
import { LineStyle, LineWidth } from '../../renderers/draw-line';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import {
	PriceLevelMarkerRenderer,
	PriceLevelMarkerRendererData,
	PriceLevelMarkerShape,
} from '../../renderers/price-level-marker-renderer';

import { IUpdatablePaneView } from './iupdatable-pane-view';

export interface PriceLevelMarkerInternalOptions {
	time: Time;
	price: number;
	text?: string;
	color: string;
	textColor: string;
	shape: PriceLevelMarkerShape;
	markerSize: number;
	showLine: boolean;
	showLabel: boolean;
	lineStyle: LineStyle;
	lineWidth: LineWidth;
	fontSize: number;
	fontFamily: string;
	bold: boolean;
	labelPaddingX: number;
	labelPaddingY: number;
	labelTailSize: number;
}

export class PriceLevelMarkerPaneView implements IUpdatablePaneView {
	private readonly _model: ChartModel;
	private readonly _series: Series;
	private _options: PriceLevelMarkerInternalOptions;
	private readonly _renderer: PriceLevelMarkerRenderer = new PriceLevelMarkerRenderer();

	public constructor(model: ChartModel, series: Series, options: PriceLevelMarkerInternalOptions) {
		this._model = model;
		this._series = series;
		this._options = options;
	}

	public setOptions(options: PriceLevelMarkerInternalOptions): void {
		this._options = options;
	}

	public update(): void {
		// no cache — coordinates resolved per render
	}

	public renderer(_height: number, width: number): IPaneRenderer | null {
		const timeScale = this._model.timeScale();
		if (timeScale.isEmpty()) {
			return null;
		}
		const firstValue = this._series.firstValue();
		if (firstValue === null) {
			return null;
		}

		const x = timeScale.timeToCoordinate(convertTime(this._options.time));
		const priceScale = this._series.priceScale();
		const y = priceScale.priceToCoordinate(this._options.price as never, firstValue.value);

		const text = this._options.text !== undefined
			? this._options.text
			: priceScale.formatPrice(this._options.price as never, firstValue.value);

		const data: PriceLevelMarkerRendererData = {
			x: x as Coordinate,
			y: y as Coordinate,
			paneWidth: width,
			color: this._options.color,
			textColor: this._options.textColor,
			text,
			shape: this._options.shape,
			markerSize: this._options.markerSize,
			showLine: this._options.showLine,
			showLabel: this._options.showLabel,
			lineStyle: this._options.lineStyle,
			lineWidth: this._options.lineWidth,
			fontSize: this._options.fontSize,
			fontFamily: this._options.fontFamily,
			bold: this._options.bold,
			labelPaddingX: this._options.labelPaddingX,
			labelPaddingY: this._options.labelPaddingY,
			labelTailSize: this._options.labelTailSize,
		};
		this._renderer.setData(data);
		return this._renderer;
	}
}
