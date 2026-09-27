import { IInputEventListener, InputEventType, TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';

import { NewsEventsDataSource } from '../../model/news-events-data-source';
import { PaneCursorType } from '../../model/pane';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { NewsEventsRenderer } from '../../renderers/news-events-renderer';

import { IUpdatablePaneView } from './iupdatable-pane-view';

/**
 * The icons along the bottom of the pane, plus the dashed guide of the highlighted one.
 */
export class NewsEventsPaneView implements IUpdatablePaneView, IInputEventListener {
	private readonly _source: NewsEventsDataSource;
	private readonly _renderer: NewsEventsRenderer = new NewsEventsRenderer();

	public constructor(source: NewsEventsDataSource) {
		this._source = source;
	}

	public update(): void {
		// nothing cached: the layout is resolved on every render
	}

	public renderer(height: number): IPaneRenderer | null {
		const layout = this._source.layout(height);
		if (layout === null) {
			return null;
		}
		const options = this._source.options();
		const model = this._source.model();
		this._renderer.setData({
			clusters: layout.clusters,
			y: layout.y,
			radius: layout.radius,
			colors: options.colors,
			background: model.backgroundBottomColor(),
			upcomingOpacity: options.upcomingOpacity,
			fontFamily: model.options().layout.fontFamily,
			hoveredId: this._source.hoveredId(),
			activeId: this._source.activeId(),
			guideLine: options.guideLine,
			onFlagReady: this._source.flagReadyHandler(),
		});
		return this._renderer;
	}

	public onInputEvent(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, eventType: InputEventType, event?: TouchMouseEvent): void {
		if (event === undefined) {
			return;
		}

		if (eventType === InputEventType.MouseMove) {
			if (this._source.iconAt(event.localX, event.localY) !== null) {
				paneWidget.setCursor(PaneCursorType.Pointer);
			}
			return;
		}

		// A mouse click, or a tap on touch screens (which have no hover): report the icon hit,
		// or null for anywhere else so the caller can close its card.
		const isClick = eventType === InputEventType.MouseClick && !event.isTouch;
		const isTap = eventType === InputEventType.MouseDown && event.isTouch;
		if (isClick || isTap) {
			this._source.clicked().fire(this._source.iconAt(event.localX, event.localY));
		}
	}
}
