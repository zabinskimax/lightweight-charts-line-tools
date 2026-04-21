import { PriceLevelMarkerDataSource } from '../model/price-level-marker-data-source';
import { PriceLevelMarkerInternalOptions } from '../views/pane/price-level-marker-pane-view';

import { IPriceLevelMarkerApi, PriceLevelMarkerPartialOptions } from './iprice-level-marker-api';

export class PriceLevelMarkerApi implements IPriceLevelMarkerApi {
	private readonly _source: PriceLevelMarkerDataSource;
	private _options: PriceLevelMarkerInternalOptions;

	public constructor(source: PriceLevelMarkerDataSource, options: PriceLevelMarkerInternalOptions) {
		this._source = source;
		this._options = options;
	}

	public source(): PriceLevelMarkerDataSource {
		return this._source;
	}

	public applyOptions(options: PriceLevelMarkerPartialOptions): void {
		this._options = { ...this._options, ...options };
		this._source.setOptions(this._options);
		this._source.model().lightUpdate();
	}
}
