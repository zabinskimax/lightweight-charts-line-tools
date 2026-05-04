import { DeepPartial } from '../helpers/strict-type-checks';

import { BarPrice, BarPrices } from '../model/bar';
import { ChartOptions } from '../model/chart-model';
import { LineToolExport, LineToolPoint } from '../model/line-tool';
import { LineToolPartialOptionsMap, LineToolType } from '../model/line-tool-options';
import { Point } from '../model/point';
import { SeriesMarker } from '../model/series-markers';
import {
	AreaSeriesPartialOptions,
	BarSeriesPartialOptions,
	BaselineSeriesPartialOptions,
	CandlestickSeriesPartialOptions,
	HistogramSeriesPartialOptions,
	LineSeriesPartialOptions,
	SeriesType,
} from '../model/series-options';
import { BusinessDay, UTCTimestamp } from '../model/time-data';

import { Time } from './data-consumer';
import { IBackgroundBandApi } from './ibackground-band-api';
import { BarColorOverlayPair, BarColorOverlayPartialOptions, IBarColorOverlayApi } from './ibar-color-overlay-api';
import { ILineToolApi } from './iline-tool-api';
import { IOverlayBoxApi, OverlayBoxPartialOptions } from './ioverlay-box-api';
import { IOverlayLineApi, OverlayLinePartialOptions } from './ioverlay-line-api';
import { IPolygonFillApi, PolygonFillOptions } from './ipolygon-fill-api';
import { IPriceLevelMarkerApi, PriceLevelMarkerPartialOptions } from './iprice-level-marker-api';
import { IPriceScaleApi } from './iprice-scale-api';
import { ISeriesApi } from './iseries-api';
import { ITextLabelApi, TextLabelPartialOptions } from './itext-label-api';
import { ITimeScaleApi } from './itime-scale-api';

/**
 * Represents a mouse event.
 */
export interface MouseEventParams {
	/**
	 * Time of the data at the location of the mouse event.
	 *
	 * The value will be `undefined` if the location of the event in the chart is outside the range of available data.
	 */
	time?: UTCTimestamp | BusinessDay;
	/**
	 * Location of the event in the chart.
	 *
	 * The value will be `undefined` if the event is fired outside the chart, for example a mouse leave event.
	 */
	point?: Point;
	/**
	 * Prices of all series at the location of the event in the chart.
	 *
	 * Keys of the map are {@link ISeriesApi} instances. Values are prices.
	 * Each price is a number for line, area, and histogram series or a OHLC object for candlestick and bar series.
	 */
	seriesPrices: Map<ISeriesApi<SeriesType>, BarPrice | BarPrices>;
	/**
	 * The {@link ISeriesApi} for the series at the point of the mouse event.
	 */
	hoveredSeries?: ISeriesApi<SeriesType>;
	/**
	 * The ID of the marker at the point of the mouse event.
	 */
	hoveredMarkerId?: SeriesMarker<Time>['id'];
}

/**
 * A custom function use to handle mouse events.
 */
export type MouseEventHandler = (param: MouseEventParams) => void;

export interface LineToolsDoubleClickEventParams {
	selectedLineTool: LineToolExport<LineToolType>;
}

export interface LineToolsAfterEditEventParams {
	selectedLineTool: LineToolExport<LineToolType>;
	stage: string;
}

export type LineToolsDoubleClickEventHandler = (param: LineToolsDoubleClickEventParams) => void;

export type LineToolsAfterEditEventHandler = (param: LineToolsAfterEditEventParams) => void;

/**
 * The main interface of a single chart.
 */
export interface IChartApi {
	/**
	 * Removes the chart object including all DOM elements. This is an irreversible operation, you cannot do anything with the chart after removing it.
	 */
	remove(): void;

	/**
	 * Sets fixed size of the chart. By default chart takes up 100% of its container.
	 *
	 * @param width - Target width of the chart.
	 * @param height - Target height of the chart.
	 * @param forceRepaint - True to initiate resize immediately. One could need this to get screenshot immediately after resize.
	 */
	resize(width: number, height: number, forceRepaint?: boolean): void;

	/**
	 * Creates an area series with specified parameters.
	 *
	 * @param areaOptions - Customization parameters of the series being created.
	 * @returns An interface of the created series.
	 * @example
	 * ```js
	 * const series = chart.addAreaSeries();
	 * ```
	 */
	addAreaSeries(areaOptions?: AreaSeriesPartialOptions): ISeriesApi<'Area'>;

	/**
	 * Creates a baseline series with specified parameters.
	 *
	 * @param baselineOptions - Customization parameters of the series being created.
	 * @returns An interface of the created series.
	 * @example
	 * ```js
	 * const series = chart.addBaselineSeries();
	 * ```
	 */
	addBaselineSeries(baselineOptions?: BaselineSeriesPartialOptions): ISeriesApi<'Baseline'>;

	/**
	 * Creates a bar series with specified parameters.
	 *
	 * @param barOptions - Customization parameters of the series being created.
	 * @returns An interface of the created series.
	 * @example
	 * ```js
	 * const series = chart.addBarSeries();
	 * ```
	 */
	addBarSeries(barOptions?: BarSeriesPartialOptions): ISeriesApi<'Bar'>;

	/**
	 * Creates a candlestick series with specified parameters.
	 *
	 * @param candlestickOptions - Customization parameters of the series being created.
	 * @returns An interface of the created series.
	 * @example
	 * ```js
	 * const series = chart.addCandlestickSeries();
	 * ```
	 */
	addCandlestickSeries(candlestickOptions?: CandlestickSeriesPartialOptions): ISeriesApi<'Candlestick'>;

	/**
	 * Creates a histogram series with specified parameters.
	 *
	 * @param histogramOptions - Customization parameters of the series being created.
	 * @returns An interface of the created series.
	 * @example
	 * ```js
	 * const series = chart.addHistogramSeries();
	 * ```
	 */
	addHistogramSeries(histogramOptions?: HistogramSeriesPartialOptions): ISeriesApi<'Histogram'>;

	/**
	 * Creates a line series with specified parameters.
	 *
	 * @param lineOptions - Customization parameters of the series being created.
	 * @returns An interface of the created series.
	 * @example
	 * ```js
	 * const series = chart.addLineSeries();
	 * ```
	 */
	addLineSeries(lineOptions?: LineSeriesPartialOptions): ISeriesApi<'Line'>;

	/**
	 * Creates a line tool with specified parameters.
	 */
	addLineTool<T extends LineToolType>(name: T, points: LineToolPoint[], options: LineToolPartialOptionsMap[T]): ILineToolApi<T>;

	/**
	 * Sets the active line tool with specified parameters.
	 */
	setActiveLineTool<T extends LineToolType>(name: T, options: LineToolPartialOptionsMap[T]): void;

	/**
	 * Toggles the drawing-tool lock. When `true`, the most recently armed
	 * line tool stays armed after each completed drawing — the user can keep
	 * placing new shapes of the same type without re-clicking the toolbar.
	 * Set to `false` to fall back to the default one-shot behaviour.
	 *
	 * The lock applies to whichever tool was last passed to
	 * {@link setActiveLineTool}; toggling the lock mid-session picks up the
	 * tool from the next `setActiveLineTool` call.
	 */
	setDrawingToolLock(locked: boolean): void;

	/**
	 * Returns the current state of the drawing-tool lock toggle.
	 */
	isDrawingToolLocked(): boolean;

	/**
     * Remove a LineTool by its ID.
     */
	removeLineToolsById(ids: string[]): void;

	/**
     * Get the currently selected LineTool(s), return JSON string of them.
     */
	getSelectedLineTools(): void;

	/**
     * Remove the currently selected LineTool only.
     */
	removeSelectedLineTools(): void;

    /**
     * Remove All LineTools that have been drawn.
     */
	removeAllLineTools(): void;

    /**
     * Export all LineTools that have been drawn to a JSON string.  This export can be used with importLineTools(JSONstring) if you want to import them in the future
     */
	exportLineTools(): void;

    /**
     * Import a JSON string to recreate all LineTools that have previously been exported using exportLineTools().
     */
	importLineTools(json: string): boolean;

    /**
     * Apply new provided options to lineTool specified in the id field.
     */
	applyLineToolOptions(newLineTool: LineToolExport<LineToolType>): boolean;

	/**
		 * Creates or updates a line tool with the specified ID.
		 *
		 * @param lineToolType - The type of line tool to create or update.
		 * @param points - The points of the line tool.
		 * @param options - The options for the line tool.
		 * @param id - The ID of the line tool.
	*/
	createOrUpdateLineTool<T extends LineToolType>(
		lineToolType: T,
		points: LineToolPoint[],
		options: LineToolPartialOptionsMap[T],
		id: string
	): void;

	/**
	 * Retrieves a LineTool by its ID.
	 *
     * @param id - The ID of the line tool to retrieve.
     * @returns A JSON string representation of the LineTool, or an empty array as a string if no line tool is found.
     */
	getLineToolByID(id: string): string;

	/**
    * Retrieves multiple LineTools whose IDs match a given regular expression.
    *
    * @param regex - The regular expression to match against LineTool IDs.
    * @returns A JSON string representing an array of matching LineTools
    * (in the `LineToolExport` format), or an empty array as a
    * string if no matching line tools are found, or if 'regex' is not a valid regular expression object.
    */
	getLineToolsByIdRegex(regex: RegExp): string;

   /**
    * Removes LineTools whose IDs match a given regular expression.
    *
    * @param regex - The regular expression to match against LineTool IDs.
    */
	removeLineToolsByIdRegex(regex: RegExp): void;

	/**
	 * Removes a series of any type. This is an irreversible operation, you cannot do anything with the series after removing it.
	 *
	 * @example
	 * ```js
	 * chart.removeSeries(series);
	 * ```
	 */
	removeSeries(seriesApi: ISeriesApi<SeriesType>): void;

	/**
	 * Subscribe to the chart click event.
	 *
	 * @param handler - Handler to be called on mouse click.
	 * @example
	 * ```js
	 * function myClickHandler(param) {
	 *     if (!param.point) {
	 *         return;
	 *     }
	 *
	 *     console.log(`Click at ${param.point.x}, ${param.point.y}. The time is ${param.time}.`);
	 * }
	 *
	 * chart.subscribeClick(myClickHandler);
	 * ```
	 */
	subscribeClick(handler: MouseEventHandler): void;

	/**
	 * Unsubscribe a handler that was previously subscribed using {@link subscribeClick}.
	 *
	 * @param handler - Previously subscribed handler
	 * @example
	 * ```js
	 * chart.unsubscribeClick(myClickHandler);
	 * ```
	 */
	unsubscribeClick(handler: MouseEventHandler): void;

	/**
	 * Subscribe to the crosshair move event.
	 *
	 * @param handler - Handler to be called on crosshair move.
	 * @example
	 * ```js
	 * function myCrosshairMoveHandler(param) {
	 *     if (!param.point) {
	 *         return;
	 *     }
	 *
	 *     console.log(`Crosshair moved to ${param.point.x}, ${param.point.y}. The time is ${param.time}.`);
	 * }
	 *
	 * chart.subscribeClick(myCrosshairMoveHandler);
	 * ```
	 */
	subscribeCrosshairMove(handler: MouseEventHandler): void;

	setCrossHairXY(x: number, y: number, visible: boolean): void;

	clearCrossHair(): void;

	/**
	 * Programmatically position the crosshair at a given (price, time) on the
	 * chart. Useful for syncing crosshairs across multiple charts on the same
	 * page — subscribe to a source chart's `crosshairMove` event and call this
	 * on every other chart with the time from the event and any reference
	 * price (e.g. via `seriesApi.coordinateToPrice` of the source's y).
	 *
	 * The chart's own `crosshairMove` event is NOT fired by this call, so two
	 * charts sync'd to each other won't feedback-loop.
	 *
	 * If the chart has multiple panes, the supplied series determines which
	 * pane and which price scale the price is interpreted against.
	 *
	 * @param price - Price for the horizontal crosshair line, in the
	 * coordinate space of `seriesApi`'s price scale.
	 * @param horizontalPosition - Time for the vertical crosshair line.
	 * @param seriesApi - Series whose price scale and pane are used.
	 *
	 * @example
	 * ```js
	 * chartA.subscribeCrosshairMove(param => {
	 *     if (param.time === undefined || param.point === undefined) {
	 *         chartB.clearCrosshairPosition();
	 *         return;
	 *     }
	 *     const price = seriesA.coordinateToPrice(param.point.y);
	 *     if (price !== null) {
	 *         chartB.setCrosshairPosition(price, param.time, seriesB);
	 *     }
	 * });
	 * ```
	 */
	setCrosshairPosition(price: number, horizontalPosition: Time, seriesApi: ISeriesApi<SeriesType>): void;

	/**
	 * Clears the crosshair position previously set via
	 * {@link setCrosshairPosition}. Does not fire the chart's `crosshairMove`
	 * event, mirroring the no-fire behavior of `setCrosshairPosition`.
	 */
	clearCrosshairPosition(): void;

	/**
	 * Unsubscribe a handler that was previously subscribed using {@link subscribeCrosshairMove}.
	 *
	 * @param handler - Previously subscribed handler
	 * @example
	 * ```js
	 * chart.unsubscribeCrosshairMove(myCrosshairMoveHandler);
	 * ```
	 */
	unsubscribeCrosshairMove(handler: MouseEventHandler): void;

	/**
	 * Adds a subscription to receive notifications on linetools being double clicked
	 *
	 * @param handler - handler (function) to be called on double click
	 */
	subscribeLineToolsDoubleClick(handler: LineToolsDoubleClickEventHandler): void;

	/**
	 * Removes linetools being double clicked subscription
	 *
	 * @param handler - previously subscribed handler
	 */
	unsubscribeLineToolsDoubleClick(handler: LineToolsDoubleClickEventHandler): void;

	/**
	 * Adds a subscription to receive notifications on linetools after finishing editing a line tool
	 *
	 * @param handler - handler (function) to be called after line tool was finished editing
	 */
	subscribeLineToolsAfterEdit(handler: LineToolsAfterEditEventHandler): void;

	/**
	 * Removes linetools notifications on linetools after finishing editing a line tool
	 *
	 * @param handler - previously subscribed handler
	 */
	unsubscribeLineToolsAfterEdit(handler: LineToolsAfterEditEventHandler): void;

	/**
	 * Returns API to manipulate a price scale.
	 *
	 * @param priceScaleId - ID of the price scale.
	 * @returns Price scale API.
	 */
	priceScale(priceScaleId?: string): IPriceScaleApi;

	/**
	 * Returns API to manipulate the time scale
	 *
	 * @returns Target API
	 */
	timeScale(): ITimeScaleApi;

	/**
	 * Applies new options to the chart
	 *
	 * @param options - Any subset of options.
	 */
	applyOptions(options: DeepPartial<ChartOptions>): void;

	/**
	 * Returns currently applied options
	 *
	 * @returns Full set of currently applied options, including defaults
	 */
	options(): Readonly<ChartOptions>;

	/**
	 * Creates a full-height background band spanning a time range.
	 *
	 * @param fromTime - Left edge of the band.
	 * @param toTime - Right edge of the band.
	 * @param color - Fill color (supports rgba).
	 */
	addBackgroundBand(fromTime: Time, toTime: Time, color: string): IBackgroundBandApi;

	/**
	 * Removes a background band.
	 */
	removeBackgroundBand(band: IBackgroundBandApi): void;

	/**
	 * Creates a free-floating text label at a (time, price) point.
	 *
	 * @param series - Series whose price scale is used to resolve the price.
	 * @param time - Time anchor for the label.
	 * @param price - Price anchor for the label.
	 * @param text - Text content.
	 * @param options - Styling overrides (color, font, alignment, etc.).
	 */
	addTextLabel(
		series: ISeriesApi<'Line' | 'Area' | 'Baseline' | 'Bar' | 'Candlestick' | 'Histogram'>,
		time: Time,
		price: number,
		text: string,
		options?: TextLabelPartialOptions
	): ITextLabelApi;

	/**
	 * Removes a text label.
	 */
	removeTextLabel(label: ITextLabelApi): void;

	/**
	 * Paints per-bar color tints over the main candles at specified times.
	 * Use low-alpha colors so the underlying candles remain visible.
	 */
	addBarColorOverlay(pairs: BarColorOverlayPair[], options?: BarColorOverlayPartialOptions): IBarColorOverlayApi;

	/**
	 * Removes a bar color overlay.
	 */
	removeBarColorOverlay(overlay: IBarColorOverlayApi): void;

	/**
	 * Creates a passive (non-interactive) line between two (time, price) points.
	 * Unlike addLineTool, the line does not appear in the drawings panel and
	 * cannot be selected or edited.
	 */
	addOverlayLine(
		series: ISeriesApi<'Line' | 'Area' | 'Baseline' | 'Bar' | 'Candlestick' | 'Histogram'>,
		time1: Time,
		price1: number,
		time2: Time,
		price2: number,
		options?: OverlayLinePartialOptions
	): IOverlayLineApi;

	/**
	 * Removes an overlay line.
	 */
	removeOverlayLine(line: IOverlayLineApi): void;

	/**
	 * Creates a passive (non-interactive) rectangle defined by two
	 * (time, price) corners. Unlike addLineTool, the box does not appear in
	 * the drawings panel and cannot be selected or edited.
	 */
	addOverlayBox(
		series: ISeriesApi<'Line' | 'Area' | 'Baseline' | 'Bar' | 'Candlestick' | 'Histogram'>,
		time1: Time,
		price1: number,
		time2: Time,
		price2: number,
		options?: OverlayBoxPartialOptions
	): IOverlayBoxApi;

	/**
	 * Removes an overlay box.
	 */
	removeOverlayBox(box: IOverlayBoxApi): void;

	/**
	 * Creates a price-level marker: a shape anchored at (time, price) with a
	 * horizontal connector line extending to the right edge of the pane and
	 * a labeled pill showing the price.
	 */
	addPriceLevelMarker(
		series: ISeriesApi<'Line' | 'Area' | 'Baseline' | 'Bar' | 'Candlestick' | 'Histogram'>,
		time: Time,
		price: number,
		options?: PriceLevelMarkerPartialOptions
	): IPriceLevelMarkerApi;

	/**
	 * Removes a price-level marker.
	 */
	removePriceLevelMarker(marker: IPriceLevelMarkerApi): void;

	/**
	 * Creates a polygon fill between two line series.
	 *
	 * @param series1 - The first (top) line series.
	 * @param series2 - The second (bottom) line series.
	 * @param options - Polygon-fill options. `fillColor` is required (supports rgba for
	 * transparency); an optional `colors` array enables per-bar coloring where `colors[i]`
	 * applies to the polygon segment between `series1`'s and `series2`'s i-th bar, falling
	 * back to `fillColor` for `null`/`undefined` entries.
	 * @returns An interface to control the polygon fill.
	 */
	addPolygonFill(series1: ISeriesApi<'Line'>, series2: ISeriesApi<'Line'>, options: PolygonFillOptions): IPolygonFillApi;

	/**
	 * Removes a polygon fill that was created with {@link addPolygonFill}.
	 *
	 * @param polygonFill - The polygon fill to remove.
	 */
	removePolygonFill(polygonFill: IPolygonFillApi): void;

	/**
	 * Make a screenshot of the chart with all the elements excluding crosshair.
	 *
	 * @returns A canvas with the chart drawn on. Any `Canvas` methods like `toDataURL()` or `toBlob()` can be used to serialize the result.
	 */
	takeScreenshot(): HTMLCanvasElement;
}
