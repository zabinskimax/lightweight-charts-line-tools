import { Time } from './data-consumer';

/**
 * Options for a background band.
 */
export interface BackgroundBandOptions {
	fromTime: Time;
	toTime: Time;
	color: string;
}

/**
 * Represents the interface to control a background band (vertical strip).
 */
export interface IBackgroundBandApi {
	applyOptions(options: Partial<BackgroundBandOptions>): void;
}
