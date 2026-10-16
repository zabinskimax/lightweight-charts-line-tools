import { undefinedIfNull } from '../../helpers/strict-type-checks';

import { BarPrice } from '../../model/bar';
import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { PlotRowValueIndex } from '../../model/plot-data';
import { PricedValue, PriceScale } from '../../model/price-scale';
import { Series } from '../../model/series';
import { SeriesBarColorer } from '../../model/series-bar-colorer';
import { TimedValue, TimePointIndex } from '../../model/time-data';
import { TimeScale } from '../../model/time-scale';

import { SeriesPaneViewBase } from './series-pane-view-base';

export abstract class LinePaneViewBase<TSeriesType extends 'Line' | 'Area' | 'Baseline', ItemType extends PricedValue & TimedValue> extends SeriesPaneViewBase<TSeriesType, ItemType> {
	protected constructor(series: Series<TSeriesType>, model: ChartModel) {
		super(series, model, true);
	}

	protected _convertToCoordinates(priceScale: PriceScale, timeScale: TimeScale, firstValue: number): void {
		timeScale.indexesToCoordinates(this._items, undefinedIfNull(this._itemsVisibleRange));
		priceScale.pointsArrayToCoordinates(this._items, firstValue, undefinedIfNull(this._itemsVisibleRange));
	}

	protected abstract _createRawItem(time: TimePointIndex, price: BarPrice, colorer: SeriesBarColorer): ItemType;

	protected _createRawItemBase(time: TimePointIndex, price: BarPrice): PricedValue & TimedValue {
		return {
			time: time,
			price: price,
			x: NaN as Coordinate,
			y: NaN as Coordinate,
		};
	}

	protected _updateOptions(): void {}

	protected _fillRawPoints(): void {
		const colorer = this._series.barColorer();
		const rows = this._series.bars().rows();
		const items = this._items;

		const keptCount = this._keptItemCount(rows, items);
		items.length = keptCount;
		for (let i = keptCount; i < rows.length; i++) {
			const row = rows[i];
			const value = row.value[PlotRowValueIndex.Close] as BarPrice;
			items.push(this._createRawItem(row.index, value, colorer));
		}

		this._rememberItemRows(rows, keptCount);
	}
}
