import { convertTime } from '../../api/data-layer';
import { Time } from '../../api/data-consumer';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import {
	BarColorOverlayItem,
	BarColorOverlayRenderer,
	BarColorOverlayRendererData,
} from '../../renderers/bar-color-overlay-renderer';

import { IUpdatablePaneView } from './iupdatable-pane-view';

export interface BarColorOverlayPair {
	time: Time;
	color: string;
}

export interface BarColorOverlayInternalOptions {
	pairs: BarColorOverlayPair[];
	widthRatio: number;
}

export class BarColorOverlayPaneView implements IUpdatablePaneView {
	private readonly _model: ChartModel;
	private _options: BarColorOverlayInternalOptions;
	private readonly _renderer: BarColorOverlayRenderer = new BarColorOverlayRenderer();

	public constructor(model: ChartModel, options: BarColorOverlayInternalOptions) {
		this._model = model;
		this._options = options;
	}

	public setOptions(options: BarColorOverlayInternalOptions): void {
		this._options = options;
	}

	public update(): void {
		// no cache — coordinates resolved on each render
	}

	public renderer(height: number, _width: number): IPaneRenderer | null {
		const timeScale = this._model.timeScale();
		if (timeScale.isEmpty()) {
			return null;
		}

		const items: BarColorOverlayItem[] = [];
		for (const pair of this._options.pairs) {
			const x = timeScale.timeToCoordinate(convertTime(pair.time));
			items.push({ x: x as Coordinate, color: pair.color });
		}

		const data: BarColorOverlayRendererData = {
			items,
			barSpacing: timeScale.barSpacing(),
			widthRatio: this._options.widthRatio,
			height,
		};
		this._renderer.setData(data);
		return this._renderer;
	}
}
