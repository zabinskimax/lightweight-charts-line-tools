import { undefinedIfNull } from '../../helpers/strict-type-checks';

import { BarPrice } from '../../model/bar';
import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { PlotRowValueIndex } from '../../model/plot-data';
import { PricedValue } from '../../model/price-scale';
import { Series } from '../../model/series';
import { SeriesPlotRow } from '../../model/series-data';
import { SeriesItemsIndexesRange, TimedValue, TimePointIndex, visibleTimedValues } from '../../model/time-data';
import { TimeScale } from '../../model/time-scale';
import { LineType } from '../../renderers/draw-line';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { PolygonFillColorRun, PolygonFillRenderer, PolygonFillRendererData } from '../../renderers/polygon-fill-renderer';

import { IUpdatablePaneView, UpdateType } from './iupdatable-pane-view';

type FillItem = PricedValue & TimedValue;

export interface PolygonFillOptions {
	fillColor: string;
	lineType?: LineType;
	colors?: readonly (string | null | undefined)[];
}

export interface PolygonFillBuildRunsResult {
	runs: PolygonFillColorRun[];
	truncated: boolean;
}

export function buildPolygonFillRuns(
	colors: readonly (string | null | undefined)[] | undefined,
	fallbackColor: string,
	items1Length: number,
	items2Length: number
): PolygonFillBuildRunsResult {
	if (colors === undefined || colors.length === 0) {
		return { runs: [], truncated: false };
	}

	const itemsLen = Math.min(items1Length, items2Length);
	const maxLen = Math.min(itemsLen, colors.length);
	const truncated = colors.length > itemsLen;

	if (maxLen === 0) {
		return { runs: [], truncated };
	}

	const runs: PolygonFillColorRun[] = [];
	let currentColor = colors[0] ?? fallbackColor;
	let runStart = 0;
	for (let i = 1; i < maxLen; i++) {
		const c = colors[i] ?? fallbackColor;
		if (c !== currentColor) {
			runs.push({ fromIndex: runStart, toIndex: i, color: currentColor });
			runStart = i;
			currentColor = c;
		}
	}
	runs.push({ fromIndex: runStart, toIndex: maxLen - 1, color: currentColor });
	return { runs, truncated };
}

export class PolygonFillPaneView implements IUpdatablePaneView {
	private readonly _series1: Series<'Line'>;
	private readonly _series2: Series<'Line'>;
	private readonly _model: ChartModel;
	private _options: PolygonFillOptions;

	private _items1: FillItem[] = [];
	private _items2: FillItem[] = [];
	private _visibleRange1: SeriesItemsIndexesRange | null = null;
	private _visibleRange2: SeriesItemsIndexesRange | null = null;

	private _invalidated: boolean = true;
	private _dataInvalidated: boolean = true;
	private _runsInvalidated: boolean = true;
	private _runs: PolygonFillColorRun[] = [];
	private _warnedOverlongColors: boolean = false;

	private readonly _renderer: PolygonFillRenderer = new PolygonFillRenderer();

	public constructor(series1: Series<'Line'>, series2: Series<'Line'>, model: ChartModel, options: PolygonFillOptions) {
		this._series1 = series1;
		this._series2 = series2;
		this._model = model;
		this._options = options;
	}

	public setOptions(options: PolygonFillOptions): void {
		const prev = this._options;
		this._options = options;
		this._invalidated = true;
		if (options.colors !== prev.colors || options.fillColor !== prev.fillColor) {
			this._runsInvalidated = true;
		}
		if (options.colors !== prev.colors) {
			this._warnedOverlongColors = false;
		}
	}

	public update(updateType?: UpdateType): void {
		this._invalidated = true;
		if (updateType === 'data') {
			this._dataInvalidated = true;
		}
	}

	public renderer(height: number, width: number): IPaneRenderer | null {
		if (!this._series1.visible() || !this._series2.visible()) {
			return null;
		}

		this._makeValid();

		if (this._visibleRange1 === null || this._visibleRange2 === null) {
			return null;
		}

		const data: PolygonFillRendererData = {
			topItems: this._items1,
			bottomItems: this._items2,
			lineType: this._options.lineType ?? LineType.Simple,
			fillColor: this._options.fillColor,
			topVisibleRange: this._visibleRange1,
			bottomVisibleRange: this._visibleRange2,
			runs: this._runs.length > 0 ? this._runs : undefined,
		};

		this._renderer.setData(data);
		return this._renderer;
	}

	private _makeValid(): void {
		if (this._dataInvalidated) {
			this._fillRawPoints();
			this._dataInvalidated = false;
			this._runsInvalidated = true;
		}

		if (this._runsInvalidated) {
			this._buildRuns();
			this._runsInvalidated = false;
		}

		if (this._invalidated) {
			this._updatePoints();
			this._invalidated = false;
		}
	}

	private _fillRawPoints(): void {
		this._items1 = this._extractItems(this._series1);
		this._items2 = this._extractItems(this._series2);
	}

	private _extractItems(series: Series<'Line'>): FillItem[] {
		return series.bars().rows().map((row: SeriesPlotRow<'Line'>) => ({
			time: row.index,
			price: row.value[PlotRowValueIndex.Close] as BarPrice,
			x: NaN as Coordinate,
			y: NaN as Coordinate,
		}));
	}

	private _buildRuns(): void {
		const { runs, truncated } = buildPolygonFillRuns(
			this._options.colors,
			this._options.fillColor,
			this._items1.length,
			this._items2.length
		);
		this._runs = runs;
		if (truncated && !this._warnedOverlongColors) {
			const colorsLen = (this._options.colors as readonly unknown[]).length;
			const itemsLen = Math.min(this._items1.length, this._items2.length);
			// eslint-disable-next-line no-console
			console.warn(
				`[PolygonFill] colors array length (${colorsLen}) exceeds items length (${itemsLen}); truncating.`
			);
			this._warnedOverlongColors = true;
		}
	}

	private _updatePoints(): void {
		this._visibleRange1 = null;
		this._visibleRange2 = null;

		const timeScale = this._model.timeScale();
		if (timeScale.isEmpty()) {
			return;
		}

		const visibleBars = timeScale.visibleStrictRange();
		if (visibleBars === null) {
			return;
		}

		this._visibleRange1 = this._convertSeries(this._series1, this._items1, timeScale, visibleBars);
		this._visibleRange2 = this._convertSeries(this._series2, this._items2, timeScale, visibleBars);
	}

	private _convertSeries(
		series: Series<'Line'>,
		items: FillItem[],
		timeScale: TimeScale,
		visibleBars: import('../../model/range-impl').RangeImpl<TimePointIndex>
	): SeriesItemsIndexesRange | null {
		const priceScale = series.priceScale();
		if (priceScale.isEmpty() || series.bars().size() === 0) {
			return null;
		}

		const firstValue = series.firstValue();
		if (firstValue === null) {
			return null;
		}

		const range = visibleTimedValues(items, visibleBars, true);
		timeScale.indexesToCoordinates(items, undefinedIfNull(range));
		priceScale.pointsArrayToCoordinates(items, firstValue.value, undefinedIfNull(range));
		return range;
	}
}
