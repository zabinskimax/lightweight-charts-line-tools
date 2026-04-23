import { PolygonFillOptions } from '../views/pane/polygon-fill-pane-view';

export { PolygonFillOptions } from '../views/pane/polygon-fill-pane-view';

/**
 * Represents the interface to control a polygon fill between two line series.
 */
export interface IPolygonFillApi {
	/**
	 * Updates polygon-fill options. Accepts any subset of {@link PolygonFillOptions}; provided
	 * fields overwrite the corresponding stored values via a shallow merge.
	 *
	 * Setting `options.colors` to a new array reference rebuilds the cached color runs; mutating
	 * the previously-passed array in place will not be detected. Pass a new array on every change.
	 *
	 * @param options - Partial options to merge into the current configuration.
	 */
	applyOptions(options: Partial<PolygonFillOptions>): void;
}
