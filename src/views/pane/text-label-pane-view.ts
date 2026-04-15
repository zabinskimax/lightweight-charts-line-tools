import { convertTime } from '../../api/data-layer';
import { Time } from '../../api/data-consumer';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { Series } from '../../model/series';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import {
	TextLabelHAlign,
	TextLabelRenderer,
	TextLabelRendererData,
	TextLabelVAlign,
} from '../../renderers/text-label-renderer';

import { IUpdatablePaneView } from './iupdatable-pane-view';

export interface TextLabelInternalOptions {
	time: Time;
	price: number;
	text: string;
	color: string;
	fontSize: number;
	fontFamily: string;
	bold: boolean;
	italic: boolean;
	horzAlign: TextLabelHAlign;
	vertAlign: TextLabelVAlign;
	backgroundColor?: string;
	paddingX: number;
	paddingY: number;
}

export class TextLabelPaneView implements IUpdatablePaneView {
	private readonly _model: ChartModel;
	private readonly _series: Series;
	private _options: TextLabelInternalOptions;
	private readonly _renderer: TextLabelRenderer = new TextLabelRenderer();

	public constructor(
		model: ChartModel,
		series: Series,
		options: TextLabelInternalOptions
	) {
		this._model = model;
		this._series = series;
		this._options = options;
	}

	public setOptions(options: TextLabelInternalOptions): void {
		this._options = options;
	}

	public update(): void {
		// nothing cached — resolved on every render call
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

		const timePoint = convertTime(this._options.time);
		const x = timeScale.timeToCoordinate(timePoint);
		const y = this._series.priceScale().priceToCoordinate(this._options.price as never, firstValue.value);

		const data: TextLabelRendererData = {
			x: x as Coordinate,
			y: y as Coordinate,
			text: this._options.text,
			color: this._options.color,
			fontSize: this._options.fontSize,
			fontFamily: this._options.fontFamily,
			bold: this._options.bold,
			italic: this._options.italic,
			horzAlign: this._options.horzAlign,
			vertAlign: this._options.vertAlign,
			backgroundColor: this._options.backgroundColor,
			paddingX: this._options.paddingX,
			paddingY: this._options.paddingY,
		};
		this._renderer.setData(data);
		return this._renderer;
	}
}
