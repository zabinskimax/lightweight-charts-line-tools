import { BarColorOverlayDataSource } from '../model/bar-color-overlay-data-source';
import { BarColorOverlayInternalOptions } from '../views/pane/bar-color-overlay-pane-view';

import { BarColorOverlayPartialOptions, IBarColorOverlayApi } from './ibar-color-overlay-api';

export class BarColorOverlayApi implements IBarColorOverlayApi {
	private readonly _source: BarColorOverlayDataSource;
	private _options: BarColorOverlayInternalOptions;

	public constructor(source: BarColorOverlayDataSource, options: BarColorOverlayInternalOptions) {
		this._source = source;
		this._options = options;
	}

	public source(): BarColorOverlayDataSource {
		return this._source;
	}

	public applyOptions(options: BarColorOverlayPartialOptions): void {
		this._options = { ...this._options, ...options };
		this._source.setOptions(this._options);
		this._source.model().lightUpdate();
	}
}
