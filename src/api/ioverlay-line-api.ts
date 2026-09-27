import { LineStyle, LineWidth } from '../renderers/draw-line';

import { Time } from './data-consumer';

export interface OverlayLineOptions {
	time1: Time;
	price1: number;
	time2: Time;
	price2: number;
	color: string;
	lineWidth: LineWidth;
	lineStyle: LineStyle;
	/**
	 * Shifts both ends sideways by this many bar widths. `-0.5` puts a vertical
	 * line on the left edge of its candle, between it and the previous one
	 * (a session break) instead of through the candle's middle.
	 *
	 * @defaultValue `0`
	 */
	xOffsetBars: number;
}

export type OverlayLinePartialOptions = Partial<OverlayLineOptions>;

/**
 * Represents the interface to control a passive (non-interactive) overlay line
 * connecting two (time, price) points.
 */
export interface IOverlayLineApi {
	applyOptions(options: OverlayLinePartialOptions): void;
}
