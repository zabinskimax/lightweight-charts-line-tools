/**
 * Represents the interface to control a polygon fill between two line series.
 */
export interface IPolygonFillApi {
	/**
	 * Updates the fill color.
	 *
	 * @param fillColor - The new fill color.
	 */
	applyOptions(fillColor: string): void;
}
