import { PolygonFillDataSource } from '../model/polygon-fill-data-source';
import { PolygonFillOptions } from '../views/pane/polygon-fill-pane-view';

import { IPolygonFillApi } from './ipolygon-fill-api';

export class PolygonFillApi implements IPolygonFillApi {
	private readonly _source: PolygonFillDataSource;
	private _options: PolygonFillOptions;

	public constructor(source: PolygonFillDataSource, options: PolygonFillOptions) {
		this._source = source;
		this._options = options;
	}

	public source(): PolygonFillDataSource {
		return this._source;
	}

	public applyOptions(options: Partial<PolygonFillOptions>): void {
		this._options = { ...this._options, ...options };
		this._source.setOptions(this._options);
		this._source.model().lightUpdate();
	}
}
