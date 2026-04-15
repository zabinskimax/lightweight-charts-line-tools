import { OverlayLineDataSource } from '../model/overlay-line-data-source';
import { OverlayLineInternalOptions } from '../views/pane/overlay-line-pane-view';

import { IOverlayLineApi, OverlayLinePartialOptions } from './ioverlay-line-api';

export class OverlayLineApi implements IOverlayLineApi {
	private readonly _source: OverlayLineDataSource;
	private _options: OverlayLineInternalOptions;

	public constructor(source: OverlayLineDataSource, options: OverlayLineInternalOptions) {
		this._source = source;
		this._options = options;
	}

	public source(): OverlayLineDataSource {
		return this._source;
	}

	public applyOptions(options: OverlayLinePartialOptions): void {
		this._options = { ...this._options, ...options };
		this._source.setOptions(this._options);
		this._source.model().lightUpdate();
	}
}
