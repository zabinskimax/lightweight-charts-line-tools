import { PriceFormatter } from '../formatters/price-formatter';

import { IPaneView } from '../views/pane/ipane-view';
import {
	PriceLevelMarkerInternalOptions,
	PriceLevelMarkerPaneView,
} from '../views/pane/price-level-marker-pane-view';

import { AutoscaleInfoImpl } from './autoscale-info-impl';
import { ChartModel } from './chart-model';
import { FirstValue } from './iprice-data-source';
import { PriceDataSource } from './price-data-source';
import { Series } from './series';
import { TimePointIndex } from './time-data';

export class PriceLevelMarkerDataSource extends PriceDataSource {
	private readonly _paneView: PriceLevelMarkerPaneView;
	private readonly _formatter: PriceFormatter = new PriceFormatter();

	public constructor(model: ChartModel, series: Series, options: PriceLevelMarkerInternalOptions) {
		super(model);
		this._paneView = new PriceLevelMarkerPaneView(model, series, options);
	}

	public setOptions(options: PriceLevelMarkerInternalOptions): void {
		this._paneView.setOptions(options);
	}

	public updateAllViews(): void {
		this._paneView.update();
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
