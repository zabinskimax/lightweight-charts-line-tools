import { deepCopy } from '../helpers/deep-copy';
import { DeepPartial } from '../helpers/strict-type-checks';

import { NewsEventsDataSource } from '../model/news-events-data-source';
import { NewsEventItem } from '../model/news-events-layout';

import { Time } from './data-consumer';
import { convertTime } from './data-layer';
import { INewsEventsApi, NewsEvent, NewsEventsIconHandler, NewsEventsOptions, NewsEventsPoint } from './inews-events-api';

export class NewsEventsApi implements INewsEventsApi {
	private readonly _source: NewsEventsDataSource;

	public constructor(source: NewsEventsDataSource) {
		this._source = source;
	}

	public source(): NewsEventsDataSource {
		return this._source;
	}

	public setEvents(events: readonly NewsEvent[]): void {
		// Field by field into the internal shape: the build renames internal
		// property names, so a spread of the public object would lose them.
		const items: NewsEventItem[] = [];
		for (const event of events) {
			// Callers may be plain JavaScript: skip an event without a time instead of throwing.
			const time: Time | null | undefined = event.time;
			// eslint-disable-next-line @typescript-eslint/tslint/config
			if (time === undefined || time === null) {
				continue;
			}
			items.push({
				time: convertTime(time).timestamp as number,
				impact: event.impact === 'high' || event.impact === 'medium' ? event.impact : 'low',
				currency: typeof event.currency === 'string' ? event.currency.toUpperCase() : '',
				source: event,
			});
		}
		this._source.setEvents(items);
		this._source.model().lightUpdate();
	}

	public applyOptions(options: DeepPartial<NewsEventsOptions>): void {
		this._source.applyOptions(options);
		this._source.model().lightUpdate();
	}

	public options(): Readonly<NewsEventsOptions> {
		return deepCopy(this._source.options());
	}

	public subscribeHover(handler: NewsEventsIconHandler): void {
		this._source.hovered().subscribe(handler);
	}

	public unsubscribeHover(handler: NewsEventsIconHandler): void {
		this._source.hovered().unsubscribe(handler);
	}

	public subscribeClick(handler: NewsEventsIconHandler): void {
		this._source.clicked().subscribe(handler);
	}

	public unsubscribeClick(handler: NewsEventsIconHandler): void {
		this._source.clicked().unsubscribe(handler);
	}

	public setActive(id: string | null): void {
		this._source.setActiveId(id);
	}

	public iconPosition(id: string): NewsEventsPoint | null {
		const icon = this._source.iconById(id);
		return icon === null ? null : { x: icon.x, y: icon.y };
	}
}
