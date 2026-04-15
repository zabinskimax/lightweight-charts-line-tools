import { BackgroundBandDataSource } from '../model/background-band-data-source';
import { BackgroundBandOptions as InternalOptions } from '../views/pane/background-band-pane-view';

import { BackgroundBandOptions, IBackgroundBandApi } from './ibackground-band-api';

export class BackgroundBandApi implements IBackgroundBandApi {
	private readonly _source: BackgroundBandDataSource;
	private _options: InternalOptions;

	public constructor(source: BackgroundBandDataSource, options: InternalOptions) {
		this._source = source;
		this._options = options;
	}

	public source(): BackgroundBandDataSource {
		return this._source;
	}

	public applyOptions(options: Partial<BackgroundBandOptions>): void {
		this._options = { ...this._options, ...options };
		this._source.setOptions(this._options);
		this._source.model().lightUpdate();
	}
}
