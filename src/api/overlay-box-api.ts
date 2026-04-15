import { OverlayBoxDataSource } from '../model/overlay-box-data-source';
import { OverlayBoxInternalOptions } from '../views/pane/overlay-box-pane-view';

import { IOverlayBoxApi, OverlayBoxPartialOptions } from './ioverlay-box-api';

export class OverlayBoxApi implements IOverlayBoxApi {
	private readonly _source: OverlayBoxDataSource;
	private _options: OverlayBoxInternalOptions;

	public constructor(source: OverlayBoxDataSource, options: OverlayBoxInternalOptions) {
		this._source = source;
		this._options = options;
	}

	public source(): OverlayBoxDataSource {
		return this._source;
	}

	public applyOptions(options: OverlayBoxPartialOptions): void {
		this._options = { ...this._options, ...options };
		this._source.setOptions(this._options);
		this._source.model().lightUpdate();
	}
}
