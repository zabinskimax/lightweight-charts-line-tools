import { VolumeProfileBar } from '../../model/line-tool-options';

export interface BarPriceExtent {
	/** Higher of the two bin price bounds. */
	top: number;
	/** Lower of the two bin price bounds. */
	bottom: number;
}

/**
 * Derive the fallback bin size (in price units) for an array of profile bars.
 *
 * Uses the spacing between the first two `price` values when available, and
 * falls back to 0.1% of the single bar's price for length-1 arrays. Returns
 * 0 for empty arrays. Callers should treat the result as a uniform extent
 * applied symmetrically around each bar's center price (price ± fallback / 2).
 */
export function deriveFallbackBinSize(sortedBars: VolumeProfileBar[]): number {
	if (sortedBars.length === 0) { return 0; }
	if (sortedBars.length > 1) {
		return Math.abs(sortedBars[0].price - sortedBars[1].price);
	}
	return sortedBars[0].price * 0.001;
}

/**
 * Resolve the per-bar vertical extent (in price units) for a sorted profile.
 *
 * When a bar carries both `priceLow` and `priceHigh`, those bounds are used
 * directly (swapped defensively if the caller passed them inverted). When
 * either is absent, the bar falls back to `price ± fallback / 2`, where the
 * fallback bin size is derived from the spacing of the first two bars.
 *
 * The helper returns prices, not pixel coordinates — callers convert via
 * `priceScale.priceToCoordinate` at the use site.
 */
export function resolveBarPriceExtents(sortedBars: VolumeProfileBar[]): BarPriceExtent[] {
	const fallback = deriveFallbackBinSize(sortedBars);
	return sortedBars.map((bar: VolumeProfileBar): BarPriceExtent => {
		if (bar.priceLow !== undefined && bar.priceHigh !== undefined) {
			return {
				top: Math.max(bar.priceLow, bar.priceHigh),
				bottom: Math.min(bar.priceLow, bar.priceHigh),
			};
		}
		return {
			top: bar.price + fallback / 2,
			bottom: bar.price - fallback / 2,
		};
	});
}
