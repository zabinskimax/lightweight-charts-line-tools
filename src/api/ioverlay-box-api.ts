import { LineStyle, LineWidth } from '../renderers/draw-line';

import { Time } from './data-consumer';

export interface OverlayBoxOptions {
	time1: Time;
	price1: number;
	time2: Time;
	price2: number;
	fillColor?: string;
	borderColor?: string;
	borderWidth: LineWidth;
	borderStyle: LineStyle;
}

export type OverlayBoxPartialOptions = Partial<OverlayBoxOptions>;

/**
 * Represents the interface to control a passive (non-interactive) overlay
 * rectangle defined by two (time, price) corners.
 */
export interface IOverlayBoxApi {
	applyOptions(options: OverlayBoxPartialOptions): void;
}
