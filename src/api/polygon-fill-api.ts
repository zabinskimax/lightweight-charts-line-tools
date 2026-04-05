import { PolygonFillDataSource } from '../model/polygon-fill-data-source';

import { IPolygonFillApi } from './ipolygon-fill-api';

export class PolygonFillApi implements IPolygonFillApi {
	private readonly _source: PolygonFillDataSource;

	public constructor(source: PolygonFillDataSource) {
		this._source = source;
	}

	public source(): PolygonFillDataSource {
		return this._source;
	}

	public applyOptions(fillColor: string): void {
		this._source.setOptions({ fillColor });
		this._source.model().lightUpdate();
	}
}
