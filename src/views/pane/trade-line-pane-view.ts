import { TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';

import { applyAlpha, generateContrastColors } from '../../helpers/color';
import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { HitTestResult, HitTestType } from '../../model/hit-test-result';
import { LineTool, LineToolButtonHitData, LineToolButtonId, LineToolOptionsInternal } from '../../model/line-tool';
import { LineToolType } from '../../model/line-tool-options';
import { PaneCursorType } from '../../model/pane';
import { Point } from '../../model/point';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineEnd } from '../../renderers/draw-line';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TradeLinePanePillRenderer } from '../../renderers/trade-line-pane-pill-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

type TradeLineType = 'TradeEntryLine' | 'TradeTakeProfitLine' | 'TradeStopLossLine' | 'TradePendingOrderLine';

const INACTIVE_ALPHA = 0.4;

export class TradeLinePaneView extends LineToolPaneView {
	protected _lineRenderer: SegmentRenderer = new SegmentRenderer();
	protected _pillRenderer: TradeLinePanePillRenderer = new TradeLinePanePillRenderer();
	// A pill glyph (× / +TP / +SL) pressed on mouse-down; fired on mouse-up unless a drag cancels it.
	private _pendingButton: LineToolButtonId | null = null;

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
		this._lineRenderer.setHitTest(new HitTestResult(HitTestType.MovePoint));
	}

	protected override _updateImpl(height: number, width: number): void {
		const options = this._source.options() as LineToolOptionsInternal<TradeLineType>;
		this._renderer = null;

		if (!this._isRenderable(options, width)) { return; }

		super._updateImpl();
		if (this._points.length < 1) { return; }

		const point = this._points[0];
		const start = new AnchorPoint(0 as Coordinate, point.y, 0);
		const end = new AnchorPoint(width as Coordinate, point.y, 1);

		// center the anchor on the visible line so drag grabs the middle of the pane
		point.x = (width / 2) as Coordinate;
		point.square = true;

		const isActive = options.isActive !== false;
		const lineOptions = deepCopy(options.line);
		if (!isActive) {
			lineOptions.color = applyAlpha(lineOptions.color, INACTIVE_ALPHA);
		}
		lineOptions.end = { left: LineEnd.Normal, right: LineEnd.Normal };

		const composite = new CompositeRenderer();
		this._lineRenderer.setData({ line: lineOptions, points: [start, end] });
		composite.append(this._lineRenderer);

		this._updatePillRenderer(options, width, point.y, isActive);
		composite.append(this._pillRenderer);

		this.addAnchors(composite);
		this._renderer = composite;
	}

	// On a glyph press, remember which button and swallow the event so the line is neither
	// selected nor dragged; the click is delivered on mouse-up (see _onMouseUp).
	protected override _onMouseDown(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		this._pendingButton = null;
		if (this._source.finished() && this._source.options().editable !== false && !event.consumed) {
			const hit = this._hitTest(paneWidget, ctx, originPoint);
			if (hit !== null && hit.type() === HitTestType.Custom) {
				const button = (hit.data() as unknown as LineToolButtonHitData | null)?.button;
				if (button) {
					this._pendingButton = button;
					event.consumed = true;
					return false;
				}
			}
		}
		return super._onMouseDown(paneWidget, ctx, originPoint, appliedPoint, event);
	}

	// Moving past the click threshold turns the gesture into a drag, so cancel the pending click.
	protected override _onPressedMouseMove(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		if (this._pendingButton !== null) {
			this._pendingButton = null;
			return false;
		}
		return super._onPressedMouseMove(paneWidget, ctx, originPoint, appliedPoint, event);
	}

	protected override _onMouseUp(paneWidget: PaneWidget): boolean {
		if (this._pendingButton !== null) {
			const button = this._pendingButton;
			this._pendingButton = null;
			this.getSelectedAndFireButtonClick(button);
			return true;
		}
		return super._onMouseUp(paneWidget);
	}

	// Show a pointer cursor while hovering a glyph.
	protected override _onMouseMove(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		if (this._source.finished()) {
			const hit = this._hitTest(paneWidget, ctx, originPoint);
			if (hit !== null && hit.type() === HitTestType.Custom) {
				paneWidget.setCursor(PaneCursorType.Pointer);
				return false;
			}
		}
		return super._onMouseMove(paneWidget, ctx, originPoint, appliedPoint, event);
	}

	private _updatePillRenderer(options: LineToolOptionsInternal<TradeLineType>, width: number, y: Coordinate, isActive: boolean): void {
		const labelText = (options.labelText || '').trim();
		const valueText = (options.valueText || '').trim();
		const text = [labelText, valueText].filter((s: string) => s.length > 0).join(' ');

		const baseBg = options.line.color;
		const background = isActive ? baseBg : applyAlpha(baseBg, INACTIVE_ALPHA);
		const rawForeground = generateContrastColors(background).foreground;
		const color = isActive ? rawForeground : applyAlpha(rawForeground, INACTIVE_ALPHA);

		this._pillRenderer.setData({
			visible: text.length > 0,
			text,
			y,
			paneWidth: width,
			alignment: options.pillAlignment,
			offsetX: options.pillOffsetX,
			background,
			color,
			fontSize: options.text.font.size,
			fontFamily: options.text.font.family,
			fontBold: options.text.font.bold,
			fontItalic: options.text.font.italic,
			paddingX: options.pillPaddingX,
			paddingY: options.pillPaddingY,
			showClose: options.showCloseButton === true,
			showSpawnTP: options.showSpawnTP === true,
			showSpawnSL: options.showSpawnSL === true,
		});
	}

	private _isRenderable(options: LineToolOptionsInternal<TradeLineType>, width: number): boolean {
		if (!options.visible || width <= 0) { return false; }

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();
		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return false; }

		const points = this._source.points();
		if (points.length < 1) { return false; }

		const firstValue = this._source.ownerSource()?.firstValue();
		if (!firstValue) { return false; }

		const y0 = priceScale.priceToCoordinate(points[0].price, firstValue.value);
		const paneHeight = this._model.paneForSource(this._source)?.height() ?? 0;
		return y0 >= 0 && y0 <= paneHeight;
	}
}
