import { convertTime } from '../../api/data-layer';
import { Time } from '../../api/data-consumer';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { BackgroundBandRenderer, BackgroundBandRendererData } from '../../renderers/background-band-renderer';

import { IUpdatablePaneView } from './iupdatable-pane-view';

export interface BackgroundBandOptions {
	fromTime: Time;
	toTime: Time;
	color: string;
}

export class BackgroundBandPaneView implements IUpdatablePaneView {
	private readonly _model: ChartModel;
	private _options: BackgroundBandOptions;
	private readonly _renderer: BackgroundBandRenderer = new BackgroundBandRenderer();

	public constructor(model: ChartModel, options: BackgroundBandOptions) {
		this._model = model;
		this._options = options;
	}

	public setOptions(options: BackgroundBandOptions): void {
		this._options = options;
	}

	public update(): void {
		// nothing cached — times are resolved on every render call
	}

	public renderer(height: number, _width: number): IPaneRenderer | null {
		const timeScale = this._model.timeScale();
		if (timeScale.isEmpty()) {
			return null;
		}
		const from = convertTime(this._options.fromTime);
		const to = convertTime(this._options.toTime);
		const x1 = timeScale.timeToCoordinate(from);
		const x2 = timeScale.timeToCoordinate(to);

		const data: BackgroundBandRendererData = {
			x1: x1 as Coordinate,
			x2: x2 as Coordinate,
			height,
			color: this._options.color,
		};
		this._renderer.setData(data);
		return this._renderer;
	}
}
