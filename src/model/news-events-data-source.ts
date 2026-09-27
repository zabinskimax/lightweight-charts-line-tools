import { convertTime } from '../api/data-layer';
import { NewsEventsIcon, NewsEventsOptions } from '../api/inews-events-api';

import { PriceFormatter } from '../formatters/price-formatter';

import { lowerbound } from '../helpers/algorithms';
import { Delegate } from '../helpers/delegate';
import { DeepPartial, merge } from '../helpers/strict-type-checks';

import { IPaneView } from '../views/pane/ipane-view';
import { NewsEventsPaneView } from '../views/pane/news-events-pane-view';

import { AutoscaleInfoImpl } from './autoscale-info-impl';
import { ChartModel } from './chart-model';
import { FirstValue } from './iprice-data-source';
import {
	clusterAtPoint,
	clusterNewsEvents,
	detectBarInterval,
	eventBarIndex,
	iconX,
	impactRank,
	NewsCluster,
	NewsEventItem,
	PlacedNewsEvent,
} from './news-events-layout';
import { Point } from './point';
import { PriceDataSource } from './price-data-source';
import { TimePointIndex, TimeScalePoint } from './time-data';

export interface NewsEventsLayout {
	clusters: NewsCluster[];
	/**
	 * Vertical center of the icons.
	 */
	y: number;
	/**
	 * Radius of the flag inside each icon.
	 */
	radius: number;
}

// Everything a layout depends on. The time scale grows its point list in place when a bar is
// appended, so the list's length and end times are part of the key, not just its identity.
interface LayoutKey {
	points: readonly TimeScalePoint[];
	count: number;
	firstTime: number;
	lastTime: number;
	left: number;
	right: number;
	barSpacing: number;
	width: number;
	height: number;
	version: number;
}

function sameLayoutKey(a: LayoutKey, b: LayoutKey): boolean {
	return a.points === b.points && a.count === b.count && a.firstTime === b.firstTime && a.lastTime === b.lastTime
		&& a.left === b.left && a.right === b.right && a.barSpacing === b.barSpacing && a.width === b.width
		&& a.height === b.height && a.version === b.version;
}

/**
 * Economic-calendar events drawn as flag icons along the bottom of the main pane. Reports hovers and
 * clicks so the caller can show its own card. Takes no part in autoscale and has no price axis labels.
 */
export class NewsEventsDataSource extends PriceDataSource {
	private readonly _formatter: PriceFormatter = new PriceFormatter();
	private readonly _paneView: NewsEventsPaneView;
	private readonly _flagReady: () => void;
	private readonly _hovered: Delegate<NewsEventsIcon | null> = new Delegate();
	private readonly _clicked: Delegate<NewsEventsIcon | null> = new Delegate();
	private _options: NewsEventsOptions;
	// Sorted by time; ties keep the more important event first.
	private _events: NewsEventItem[] = [];
	private _hoveredId: string | null = null;
	private _activeId: string | null = null;
	// Bumped by every event or option change. Drawing, hit testing, the cursor and the hover
	// check all ask for the layout on a single mouse move; the cache makes that one computation.
	private _version: number = 0;
	private _layoutCache: { key: LayoutKey; layout: NewsEventsLayout | null } | null = null;

	public constructor(model: ChartModel, options: NewsEventsOptions) {
		super(model);
		this._options = options;
		this._paneView = new NewsEventsPaneView(this);
		this._flagReady = () => model.lightUpdate();
		// Fires on real mouse moves over a pane and with null when the mouse leaves; the programmatic
		// crosshair sync between charts does not fire it, so a synced chart never reports a hover.
		model.crosshairMoved().subscribe(this._onCrosshairMoved.bind(this), this);
	}

	public destroy(): void {
		this.model().crosshairMoved().unsubscribeAll(this);
		this._hovered.destroy();
		this._clicked.destroy();
	}

	public options(): Readonly<NewsEventsOptions> {
		return this._options;
	}

	public applyOptions(options: DeepPartial<NewsEventsOptions>): void {
		merge(this._options, options);
		this._version++;
	}

	public setEvents(events: NewsEventItem[]): void {
		this._events = events
			.map((event: NewsEventItem, order: number) => ({ event, order }))
			.sort((a: { event: NewsEventItem; order: number }, b: { event: NewsEventItem; order: number }) =>
				a.event.time - b.event.time || impactRank(b.event.impact) - impactRank(a.event.impact) || a.order - b.order
			)
			.map((entry: { event: NewsEventItem; order: number }) => entry.event);
		this._version++;
	}

	public hovered(): Delegate<NewsEventsIcon | null> {
		return this._hovered;
	}

	public clicked(): Delegate<NewsEventsIcon | null> {
		return this._clicked;
	}

	public hoveredId(): string | null {
		return this._hoveredId;
	}

	/**
	 * The icon the caller keeps highlighted, e.g. while its card is open.
	 */
	public activeId(): string | null {
		return this._activeId;
	}

	public setActiveId(id: string | null): void {
		if (id !== this._activeId) {
			this._activeId = id;
			this.model().lightUpdate();
		}
	}

	public flagReadyHandler(): () => void {
		return this._flagReady;
	}

	/**
	 * Where every icon in view goes for a pane of the given height, or null when there is nothing to draw.
	 */
	public layout(height: number): NewsEventsLayout | null {
		const timeScale = this.model().timeScale();
		const points = timeScale.points();
		const range = timeScale.visibleLogicalRange();
		if (!this._options.visible || this._events.length === 0 || timeScale.isEmpty() || points.length === 0 || range === null) {
			return null;
		}

		const key: LayoutKey = {
			points,
			count: points.length,
			firstTime: points[0].time.timestamp as number,
			lastTime: points[points.length - 1].time.timestamp as number,
			left: range.left(),
			right: range.right(),
			barSpacing: timeScale.barSpacing(),
			width: timeScale.width(),
			height,
			version: this._version,
		};
		if (this._layoutCache === null || !sameLayoutKey(this._layoutCache.key, key)) {
			this._layoutCache = { key, layout: this._computeLayout(height, points, range.left(), range.right()) };
		}
		return this._layoutCache.layout;
	}

	/**
	 * The icon at a point of the main pane, reported the same way as to hover and click handlers.
	 */
	public iconAt(x: number, y: number): NewsEventsIcon | null {
		const layout = this._currentLayout();
		if (layout === null) {
			return null;
		}
		const cluster = clusterAtPoint(layout.clusters, layout.y, layout.radius, x, y);
		return cluster === null ? null : this._icon(cluster, layout);
	}

	public iconById(id: string): NewsEventsIcon | null {
		const layout = this._currentLayout();
		if (layout === null) {
			return null;
		}
		for (const cluster of layout.clusters) {
			if (cluster.key === id) {
				return this._icon(cluster, layout);
			}
		}
		return null;
	}

	public paneViews(): readonly IPaneView[] {
		return [this._paneView];
	}

	public updateAllViews(): void {
		// nothing to do: the layout cache keys itself on everything the layout depends on
	}

	public priceAxisViews(): readonly [] {
		return [];
	}

	public minMove(): number {
		return 0;
	}

	public autoscaleInfo(startTimePoint: TimePointIndex, endTimePoint: TimePointIndex): AutoscaleInfoImpl | null {
		return null;
	}

	public firstValue(): FirstValue | null {
		return null;
	}

	public formatter(): PriceFormatter {
		return this._formatter;
	}

	public priceLineColor(lastBarColor: string): string {
		return lastBarColor;
	}

	private _computeLayout(height: number, points: readonly TimeScalePoint[], left: number, right: number): NewsEventsLayout {
		const timeScale = this.model().timeScale();
		const count = points.length;
		const timeAt = (index: number) => points[index].time.timestamp as number;
		const interval = detectBarInterval(count, timeAt);
		const options = this._options;
		const radius = options.iconSize / 2;
		// Without an explicit clock the last bar counts as complete: its events have happened.
		const now = options.now !== undefined ? convertTime(options.now).timestamp as number : timeAt(count - 1) + Math.max(0, interval - 1);

		// One bar of slack on both sides so icons sliding in from an edge are not cut off early.
		const fromIndex = Math.floor(left) - 1;
		const toIndex = Math.ceil(right) + 1;
		// Scan from one bar earlier still: an event inside a gap belongs to the bar after the gap.
		const scanFrom = fromIndex - 1 <= 0 ? -Infinity : timeAt(Math.min(fromIndex - 1, count - 1));

		const placed: PlacedNewsEvent[] = [];
		const start = lowerbound(this._events, scanFrom, (event: NewsEventItem, time: number) => event.time < time);
		for (let i = start; i < this._events.length; i++) {
			const event = this._events[i];
			const index = eventBarIndex(event.time, count, timeAt, interval);
			if (index === null || index < fromIndex) {
				continue;
			}
			if (index > toIndex) {
				break;
			}
			placed.push({ event, index, x: timeScale.indexToCoordinate(index as TimePointIndex) });
		}

		// Icons closer than their own footprint (disc + a 2px gap) merge into one.
		const minDistance = (radius + 2) * 2 + 2;

		return {
			clusters: clusterNewsEvents(placed, minDistance, now, options.currencyPriority),
			y: height - options.bottomMargin - radius - 2,
			radius,
		};
	}

	private _currentLayout(): NewsEventsLayout | null {
		const pane = this.model().paneForSource(this);
		return pane === null ? null : this.layout(pane.height());
	}

	private _icon(cluster: NewsCluster, layout: NewsEventsLayout): NewsEventsIcon {
		return {
			id: cluster.key,
			events: cluster.events.map((event: NewsEventItem) => event.source),
			x: iconX(cluster),
			y: layout.y,
			radius: layout.radius + 2,
			upcoming: cluster.upcoming,
		};
	}

	private _onCrosshairMoved(index: TimePointIndex | null, point: Point | null): void {
		const model = this.model();
		let icon: NewsEventsIcon | null = null;
		if (point !== null && model.crosshairSource().pane() === model.paneForSource(this)) {
			icon = this.iconAt(point.x, point.y);
		}
		const id = icon === null ? null : icon.id;
		if (id === this._hoveredId) {
			return;
		}
		this._hoveredId = id;
		model.lightUpdate();
		this._hovered.fire(icon);
	}
}
