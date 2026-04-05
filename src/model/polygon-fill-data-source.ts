import { PriceFormatter } from '../formatters/price-formatter';

import { IPaneView } from '../views/pane/ipane-view';
import { PolygonFillOptions, PolygonFillPaneView } from '../views/pane/polygon-fill-pane-view';

import { AutoscaleInfoImpl } from './autoscale-info-impl';
import { ChartModel } from './chart-model';
import { FirstValue } from './iprice-data-source';
import { PriceDataSource } from './price-data-source';
import { Series } from './series';
import { TimePointIndex } from './time-data';

export class PolygonFillDataSource extends PriceDataSource {
	private readonly _series1: Series<'Line'>;
	private readonly _series2: Series<'Line'>;
	private readonly _paneView: PolygonFillPaneView;
	private readonly _formatter: PriceFormatter = new PriceFormatter();

	public constructor(model: ChartModel, series1: Series<'Line'>, series2: Series<'Line'>, options: PolygonFillOptions) {
		super(model);
		this._series1 = series1;
		this._series2 = series2;
		this._paneView = new PolygonFillPaneView(series1, series2, model, options);
	}

	public series1(): Series<'Line'> {
		return this._series1;
	}

	public series2(): Series<'Line'> {
		return this._series2;
	}

	public setOptions(options: PolygonFillOptions): void {
		this._paneView.setOptions(options);
	}

	public updateAllViews(): void {
		this._paneView.update('data');
	}

	public paneViews(): readonly IPaneView[] {
		return [this._paneView];
	}

	public priceAxisViews(): readonly [] {
		return [];
	}

	public minMove(): number {
		return 0;
	}

	public autoscaleInfo(_startTimePoint: TimePointIndex, _endTimePoint: TimePointIndex): AutoscaleInfoImpl | null {
		return null;
	}

	public firstValue(): FirstValue | null {
		return null;
	}

	public formatter(): PriceFormatter {
		return this._formatter;
	}

	public priceLineColor(lastBarColor: string): string {
		return lastBarColor;
	}
}
