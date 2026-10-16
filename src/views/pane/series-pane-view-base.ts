import { ChartModel } from '../../model/chart-model';
import { PriceScale } from '../../model/price-scale';
import { Series } from '../../model/series';
import { SeriesPlotRow } from '../../model/series-data';
import { SeriesType } from '../../model/series-options';
import { SeriesItemsIndexesRange, TimedValue, visibleTimedValues } from '../../model/time-data';
import { TimeScale } from '../../model/time-scale';
import { IPaneRenderer } from '../../renderers/ipane-renderer';

import { IUpdatablePaneView, UpdateType } from './iupdatable-pane-view';

export abstract class SeriesPaneViewBase<TSeriesType extends SeriesType, ItemType extends TimedValue> implements IUpdatablePaneView {
	protected readonly _series: Series<TSeriesType>;
	protected readonly _model: ChartModel;
	protected _invalidated: boolean = true;
	protected _dataInvalidated: boolean = true;
	protected _optionsInvalidated: boolean = true;
	protected _items: ItemType[] = [];
	protected _itemsVisibleRange: SeriesItemsIndexesRange | null = null;
	private readonly _extendedVisibleRange: boolean;
	// The row each item was built from, so a fill can keep the items of rows that didn't change.
	private _itemRows: SeriesPlotRow<TSeriesType>[] = [];
	// Items take their colours from the options, so the fill after an options change rebuilds them all.
	private _optionsChangedSinceFill: boolean = true;

	public constructor(series: Series<TSeriesType>, model: ChartModel, extendedVisibleRange: boolean) {
		this._series = series;
		this._model = model;
		this._extendedVisibleRange = extendedVisibleRange;
	}

	public update(updateType?: UpdateType): void {
		this._invalidated = true;
		if (updateType === 'data') {
			this._dataInvalidated = true;
		}
		if (updateType === 'options') {
			this._optionsInvalidated = true;
			this._optionsChangedSinceFill = true;
		}
	}

	public abstract renderer(height: number, width: number): IPaneRenderer | null;

	protected _makeValid(): void {
		if (this._dataInvalidated) {
			this._fillRawPoints();
			this._dataInvalidated = false;
		}

		if (this._invalidated) {
			this._updatePoints();
			this._invalidated = false;
		}

		if (this._optionsInvalidated) {
			this._updateOptions();
			this._optionsInvalidated = false;
		}
	}

	protected abstract _fillRawPoints(): void;

	protected abstract _updateOptions(): void;

	protected abstract _convertToCoordinates(priceScale: PriceScale, timeScale: TimeScale, firstValue: number): void;

	protected _clearVisibleRange(): void {
		this._itemsVisibleRange = null;
	}

	/**
	 * Number of leading items that the last fill built from rows still in place: the same
	 * row object at the same position with the same time index, and no options change since.
	 * A new bar only adds or replaces rows at the end, so a fill keeps all the items before
	 * it instead of rebuilding one per loaded bar. Kept items can carry coordinates from an
	 * earlier paint, but only the visible range is drawn and that is converted on every update.
	 */
	protected _keptItemCount(rows: readonly SeriesPlotRow<TSeriesType>[], items: readonly TimedValue[]): number {
		if (this._optionsChangedSinceFill) {
			return 0;
		}

		const itemRows = this._itemRows;
		const limit = Math.min(rows.length, itemRows.length, items.length);
		let count = 0;
		while (count < limit && rows[count] === itemRows[count] && items[count].time === rows[count].index) {
			count++;
		}

		return count;
	}

	// Records the rows a fill built its items from; the first `keptCount` are unchanged.
	protected _rememberItemRows(rows: readonly SeriesPlotRow<TSeriesType>[], keptCount: number): void {
		const itemRows = this._itemRows;
		itemRows.length = keptCount;
		for (let i = keptCount; i < rows.length; i++) {
			itemRows.push(rows[i]);
		}

		this._optionsChangedSinceFill = false;
	}

	protected _updatePoints(): void {
		const priceScale = this._series.priceScale();
		const timeScale = this._model.timeScale();

		this._clearVisibleRange();

		if (timeScale.isEmpty() || priceScale.isEmpty()) {
			return;
		}

		const visibleBars = timeScale.visibleStrictRange();
		if (visibleBars === null) {
			return;
		}

		if (this._series.bars().size() === 0) {
			return;
		}

		const firstValue = this._series.firstValue();
		if (firstValue === null) {
			return;
		}

		this._itemsVisibleRange = visibleTimedValues(this._items, visibleBars, this._extendedVisibleRange);
		this._convertToCoordinates(priceScale, timeScale, firstValue.value);
	}
}
