import { DeepPartial } from '../helpers/strict-type-checks';

import { Time } from './data-consumer';

/**
 * Importance of a news event. Picks the outline color of its icon.
 */
export type NewsEventImpact = 'high' | 'medium' | 'low';

/**
 * One economic-calendar event, drawn as a flag icon along the bottom of the main pane.
 *
 * Only `time`, `impact` and `currency` are read. Any other fields (title, actual, forecast, ...)
 * are kept untouched and handed back in hover and click events, so the app can build its card.
 */
export interface NewsEvent {
	/**
	 * When the event happens, on the same clock as the series data. It does not have to
	 * match a bar: it lands on the bar whose span contains it, on the first bar after a
	 * gap (weekend, holiday), or past the last bar for events that are still to come.
	 */
	time: Time;
	/**
	 * Importance of the event.
	 */
	impact: NewsEventImpact;
	/**
	 * Currency code, e.g. `USD`. Picks the flag; codes without a built-in flag show their symbol or first letter.
	 */
	currency?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

/**
 * Outline color of the icons per impact.
 */
export interface NewsEventsColors {
	high: string;
	medium: string;
	low: string;
}

/**
 * Options of the news-event icons.
 */
export interface NewsEventsOptions {
	/**
	 * Show or hide every icon.
	 *
	 * @defaultValue `true`
	 */
	visible: boolean;
	/**
	 * Outline color per impact.
	 */
	colors: NewsEventsColors;
	/**
	 * Diameter of the flag inside each icon, in pixels.
	 *
	 * @defaultValue `14`
	 */
	iconSize: number;
	/**
	 * Gap between the bottom of the icons and the bottom of the pane, in pixels.
	 *
	 * @defaultValue `4`
	 */
	bottomMargin: number;
	/**
	 * The current time, e.g. the replay clock. Later events are drawn faded. Defaults to the end
	 * of the last bar. Pass it whenever the last bar is still forming.
	 */
	now?: Time;
	/**
	 * Opacity of events later than `now`.
	 *
	 * @defaultValue `0.5`
	 */
	upcomingOpacity: number;
	/**
	 * When several events share one icon, the most important one picks the flag and the
	 * color; ties go to the currency listed first here.
	 */
	currencyPriority: string[];
	/**
	 * Draw a dashed line from the hovered or active icon up through its bar.
	 *
	 * @defaultValue `true`
	 */
	guideLine: boolean;
}

/**
 * A position in pixels from the top-left corner of the main pane.
 */
export interface NewsEventsPoint {
	x: number;
	y: number;
}

/**
 * An icon as reported to hover and click handlers.
 */
export interface NewsEventsIcon {
	/**
	 * Stable id of the icon (the time of its first event), for {@link INewsEventsApi.setActive}
	 * and {@link INewsEventsApi.iconPosition}.
	 */
	id: string;
	/**
	 * The events under the icon, sorted by time: the same objects that were passed to `setEvents`.
	 */
	events: NewsEvent[];
	/**
	 * Icon center in pixels from the top-left corner of the main pane.
	 */
	x: number;
	y: number;
	/**
	 * Radius of the icon's outer edge in pixels, to place a card clear of it.
	 */
	radius: number;
	/**
	 * Every event under the icon is later than `now`.
	 */
	upcoming: boolean;
}

/**
 * Receives the icon under the mouse (or the clicked icon), or null when there is none.
 */
export type NewsEventsIconHandler = (icon: NewsEventsIcon | null) => void;

/**
 * Controls a set of news-event icons created with {@link IChartApi.addNewsEvents}.
 */
export interface INewsEventsApi {
	/**
	 * Replaces every event.
	 */
	setEvents(events: readonly NewsEvent[]): void;
	/**
	 * Applies new options; omitted fields keep their current value.
	 */
	applyOptions(options: DeepPartial<NewsEventsOptions>): void;
	/**
	 * Current options.
	 */
	options(): Readonly<NewsEventsOptions>;
	/**
	 * Calls `handler` whenever the icon under the mouse changes: the new icon, or null when the
	 * mouse leaves it.
	 */
	subscribeHover(handler: NewsEventsIconHandler): void;
	unsubscribeHover(handler: NewsEventsIconHandler): void;
	/**
	 * Calls `handler` on every click or tap in the pane: the icon hit, or null for a click elsewhere.
	 */
	subscribeClick(handler: NewsEventsIconHandler): void;
	unsubscribeClick(handler: NewsEventsIconHandler): void;
	/**
	 * Keeps one icon highlighted (full opacity and guide line), e.g. while its card is open; null clears it.
	 */
	setActive(id: string | null): void;
	/**
	 * Where an icon is now, e.g. to move a card after scrolling or zooming. Null when the icon is
	 * off-screen or has merged into another one.
	 */
	iconPosition(id: string): NewsEventsPoint | null;
}
