import { Time } from './data-consumer';

/**
 * A per-bar tint specification.
 */
export interface BarColorOverlayPair {
	time: Time;
	color: string;
}

/**
 * Options for a bar color overlay.
 */
export interface BarColorOverlayOptions {
	pairs: BarColorOverlayPair[];
	/**
	 * Width of each tint strip as a fraction of bar spacing. 1.0 covers the
	 * full bar slot; smaller values create gaps between bars.
	 *
	 * @defaultValue 0.9
	 */
	widthRatio?: number;
}

export type BarColorOverlayPartialOptions = Partial<BarColorOverlayOptions>;

export interface IBarColorOverlayApi {
	applyOptions(options: BarColorOverlayPartialOptions): void;
}
