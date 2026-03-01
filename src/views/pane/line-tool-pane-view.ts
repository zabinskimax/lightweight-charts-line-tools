import { IInputEventListener, InputEventType, TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';

import { ensureNotNull } from '../../helpers/assertions';
import { clone } from '../../helpers/strict-type-checks';

import { BarPrice } from '../../model/bar';
import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { HitTestResult, HitTestType } from '../../model/hit-test-result';
import { FirstValue } from '../../model/iprice-data-source';
import { LineTool, LineToolHitTestData, LineToolPoint } from '../../model/line-tool';
import { LineToolLongShortPosition } from '../../model/line-tool-long-short-position';
import { LineToolType } from '../../model/line-tool-options';
import { PaneCursorType } from '../../model/pane';
import { Point } from '../../model/point';
import { PriceScale } from '../../model/price-scale';
import { UTCTimestamp } from '../../model/time-data';
import { TimeScale } from '../../model/time-scale';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { AnchorPoint, LineAnchorRenderer } from '../../renderers/line-anchor-renderer';

import { IUpdatablePaneView } from './iupdatable-pane-view';

export interface CreateAnchorData {
	points: AnchorPoint[];
	pointsCursorType?: PaneCursorType[];
}

export abstract class LineToolPaneView implements IUpdatablePaneView, IInputEventListener {
	protected readonly _source: LineTool<LineToolType>;
	protected readonly _model: ChartModel;
	protected _points: AnchorPoint[] = [];

	protected _invalidated: boolean = true;
	protected _lastMovePoint: Point | null = null;
	protected _editedPointIndex: number | null = null;
	protected _lineAnchorRenderers: LineAnchorRenderer[] = [];
	protected _renderer: IPaneRenderer | null = null;
	protected _onMouseDownInitialPoints: AnchorPoint[] = [];
	private _isFlipped: boolean = false;

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		this._source = source;
		this._model = model;
	}

	public onInputEvent(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, eventType: InputEventType, event?: TouchMouseEvent): void {
		if (!event || (!this._renderer || !this._renderer.hitTest) && this._source.finished()) { return; }

		const crossHair = this._model.crosshairSource();
		const appliedPoint = new Point(crossHair.appliedX(), crossHair.appliedY());
		const originPoint = new Point(event.localX, event.localY);

		const changed = this._processInputEvent(paneWidget, ctx, eventType, originPoint, appliedPoint, event);

		event.consumed ||= this._source.editing() || !this._source.finished();
		if (changed || this._source.hovered() || this._source.editing() || !this._source.finished()) {
			this.updateLineAnchors();
		}
	}

	/*
	public renderer(height: number, width: number, addAnchors?: boolean | undefined): IPaneRenderer | null {
		if (this._invalidated) { this._updateImpl(height, width); }
		return this._source.visible() ? this._renderer : null;
	}
	*/

	public renderer(height: number, width: number, addAnchors?: boolean | undefined): IPaneRenderer | null {
		if (!this._source.options().visible) {
			return null;
		}
		if (this._invalidated) {
			this._updateImpl(height, width); // _updateImpl() is now only called if visible
		}
		return this._renderer;
	}

	public priceToCoordinate(price: BarPrice): Coordinate | null {
		const priceScale = this._source.priceScale();
		const ownerSource = this._source.ownerSource();

		if (priceScale === null) { return null; }

		const basePrice = ownerSource !== null ? ownerSource.firstValue() : null;
		return basePrice === null ? null : priceScale.priceToCoordinate(price, basePrice.value);
	}

	public currentPoint(): Point {
		const crossHair = this._model.crosshairSource();
		return new Point(crossHair.originCoordX(), crossHair.originCoordY());
	}

	public editedPointIndex(): number | null {
		return this._source.editing() ? this._editedPointIndex : null;
	}

	public areAnchorsVisible(): boolean {
		return this._source.hovered() || this._source.selected() || this._source.editing() || !this._source.finished();
	}

	public update(): void {
		this._invalidated = true;
	}

	public addAnchors(renderer: CompositeRenderer): void {
		renderer.append(this.createLineAnchor({ points: this._points }, 0));
	}

	public updateLineAnchors(): void {
		this._lineAnchorRenderers.forEach((renderer: LineAnchorRenderer) => {
			renderer.updateData({
				points: this._points,
				selected: this._source.selected(),
				visible: this.areAnchorsVisible(),
				currentPoint: this.currentPoint(),
				editedPointIndex: this.editedPointIndex(),
			});
		});
		this._model.updateSource(this._source);
		this._source.updateAllViews();
	}

	public createLineAnchor(data: CreateAnchorData, index: number): LineAnchorRenderer {
		const renderer = this._getLineAnchorRenderer(index);
		renderer.setData({
			...data,
			radius: 6,
			strokeWidth: 1,
			color: '#1E53E5',
			hoveredStrokeWidth: 4,
			selected: this._source.selected(),
			visible: this.areAnchorsVisible(),
			currentPoint: this.currentPoint(),
			backgroundColors: this._lineAnchorColors(data.points),
			editedPointIndex: this._source.editing() ? this.editedPointIndex() : null,
			hitTestType: HitTestType.ChangePoint,
		});

		return renderer;
	}

	public getSelectedAndFireAfterEdit(paneWidget: PaneWidget, stage: string, orderID: string): void {
		// finised editing or creating a line tool, execute AfterEdit event
		// get the specific lineTool that was pathFinished, lineToolFinished, lineToolEdited and pass it on to the front end
		const modifiedLineTool = paneWidget.state().getLineTool(orderID);
		// if not null, the id exists, so pass it to frontend
		if (modifiedLineTool !== null) {
			// create a new lineToolExport to make sure that any change in the lineTool exported in not immediately applied.
			const selectedLineTool = clone(modifiedLineTool.exportLineToolToLineToolExport());
			this._model.fireLineToolsAfterEdit(selectedLineTool, stage);
		}
	}

	public get isFlipped(): boolean {
		return this._isFlipped;
	}

	// Public setter for _isFlipped
	public setIsFlipped(isFlipped: boolean): void {
		// Used to track if the LongShortPosition tool's direction
		// (long/short) has been flipped during dragging.
		this._isFlipped = isFlipped;
	}

	protected _onMouseUp(paneWidget: PaneWidget): boolean {
		if (this._source.toolType() === 'LongShortPosition') {
			// For LongShortPosition, reset the flipped state on mouse up,
			// as we don't want to carry the flipped state between drags
			this.setIsFlipped(false);
		}

		if (!this._source.finished()) {
			// donnt execute tryFinish on LongShortPosition because that is handled by addPoint
			if (this._source.toolType() !== 'LongShortPosition') {
				this._source.tryFinish();
			}

			const orderID = this._source.id();

			// did a line tool just finish being created, if so fire AfterEdit
			if (!this._source.editing() && !this._source.creating()) {
				// finished creating a line tool, fire after edit event
				this.getSelectedAndFireAfterEdit(paneWidget, 'lineToolFinished', orderID);
			} else if (this._source.finished()) {
				// this will detect if a path is finished being created
				this.getSelectedAndFireAfterEdit(paneWidget, 'pathFinished', orderID);
			}
		} else if (this._source.editing()) {
			this._model.magnet().disable();
			this._updateSourcePoints();

			this._lastMovePoint = null;
			this._editedPointIndex = null;
			this._source.setEditing(false);
			this._source.setCreating(false);

			// pass along the id of the lineTool
			const orderID = this._source.id();

			// finished editing an existing line tool, fire after edit event
			this.getSelectedAndFireAfterEdit(paneWidget, 'lineToolEdited', orderID);
			return true;
		}
		return false;
	}

	protected _onPressedMouseMove(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		if (!this._source.finished()) {
			if (this._source.lineDrawnWithPressedButton()) {
				this._source.addPoint(this._source.screenPointToPoint(appliedPoint) as LineToolPoint);
			}
			return false;
		}

		if (!this._source.selected() || this._source.options().locked) { return false; }

		if (!this._source.editing()) {
			const hitResult = this._hitTest(paneWidget, ctx, originPoint);
			const hitData = hitResult?.data();
			this._source.setEditing(this._source.hovered() || !!hitResult);

			this._lastMovePoint = appliedPoint;
			this._editedPointIndex = hitData?.pointIndex ?? this._editedPointIndex;
			if (hitData) { this._model.magnet().enable(); }
		} else {
			paneWidget.setCursor(this._editedPointIndex !== null ? PaneCursorType.Default : PaneCursorType.Grabbing);

			if (this._editedPointIndex !== null) {
				this._tryApplyLineToolShift(appliedPoint, event, true, originPoint);

				// LongShortPosition needs special handeling because it can flip to long to short and then enter the 3x TP constraint
				if (this._source.toolType() === 'LongShortPosition') {
					this._onPressedMouseMoveLongShortPosition(appliedPoint);
				} else {
					// For other tools, update the point normally
					this._source.setPoint(this._editedPointIndex, this._source.screenPointToPoint(appliedPoint) as LineToolPoint);
				}
			} else if (this._lastMovePoint) {
				// ... (Logic for moving the entire tool) ...
				const diff = appliedPoint.subtract(this._lastMovePoint);
				this._points.forEach((point: Point) => {
					point.x = (point.x + diff.x) as Coordinate;
					point.y = (point.y + diff.y) as Coordinate;
				});

				this._lastMovePoint = appliedPoint;
				this._updateSourcePoints();
			}
		}
		return false;
	}

	protected _onMouseMove(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		if (!this._source.finished()) {
			return this._onMouseMovePreview(originPoint, appliedPoint, event);
		} else {
			return this._onMouseMoveHover(paneWidget, ctx, originPoint, event);
		}
	}

	protected _onMouseDown(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		// lock in points location on mouseDown to use with shift event for fib and rectangle
		this._onMouseDownInitialPoints = this._points;

		// Initialize _isLong for restored tools
		// when position tools already exist, i need to change setIsLong so the tool does not start
		// modifying in the equivelent of isFlipped logic at 3x movement.  with this, it will just adjust
		// the entry and stop like normal
		// click count was set by constructor
		if (this._source.toolType() === 'LongShortPosition') {
			const longShortTool = this._source as LineToolLongShortPosition;
			if (this._source.points().length === 3 && longShortTool.getClickCount() === 2) {
				const priceScale = ensureNotNull(this._source.priceScale());
				const firstValue = ensureNotNull(priceScale.firstValue());
				const entryPrice = Number(priceScale.formatPrice(this._source.points()[0].price, firstValue));
				const stopLossPrice = Number(priceScale.formatPrice(this._source.points()[1].price, firstValue));
				longShortTool.setIsLong(entryPrice > stopLossPrice);
			}
		}

		if (!this._source.finished()) {
			// ===  Handle new points (preview/creation mode) ===

			// LongShortPosition specific handling
			if (this._source.toolType() === 'LongShortPosition') {
				// Reset _isFlipped for LongShortPosition tools
				this.setIsFlipped(false);
				const longShortTool = this._source as LineToolLongShortPosition;

				// increment click count and add point
				if (!this._source.finished() && longShortTool.getClickCount() < 2) {
					longShortTool.setClickCount(longShortTool.getClickCount() + 1);
					// Call addPoint() HERE for LongShortPosition
					this._source.addPoint(this._source.screenPointToPoint(appliedPoint) as LineToolPoint);
				}
			} else {
				// Handling for other line tool types
				this._tryApplyLineToolShift(appliedPoint, event, false, originPoint);

				this._source.addPoint(this._source.screenPointToPoint(appliedPoint) as LineToolPoint);
			}
			return false;
		}
		// Handle finished and editable tools:
		if (this._source.options().editable === true) {
			// If the event was already consumed (e.g., by a UI element), don't change selection.
			if (event.consumed) {
				return false;
			}

			const hitResult = this._hitTest(paneWidget, ctx, originPoint);
			return this._source.setSelected(hitResult !== null);
		}
		return false;
	}

	protected _onMouseDoubleClick(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		return false;
	}

	protected _updateSourcePoints(): void {
		this._source.setPoints(this._points.map((point: Point) => this._source.screenPointToPoint(point) as LineToolPoint));
	}

	protected _hitTest(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, point: Point): HitTestResult<LineToolHitTestData> | null {
		if (!this._renderer?.hitTest) { return null; }
		return this._renderer.hitTest(point.x, point.y, ctx) as HitTestResult<LineToolHitTestData> | null;
	}

	protected _lineAnchorColors(points: AnchorPoint[]): string[] {
		const height = ensureNotNull(this._model.paneForSource(this._source)).height();
		return points.map((point: AnchorPoint) => this._model.backgroundColorAtYPercentFromTop(point.y / height));
	}

	protected _updateImpl(height?: number, width?: number): void {
		this._invalidated = false;

		if (this._model.timeScale().isEmpty()) { return; }
		if (!this._validatePriceScale()) { return; }

		this._points = [] as AnchorPoint[];
		const sourcePoints = this._source.points();
		const priceScale = ensureNotNull(this._source.priceScale());
		const timeScale = this._model.timeScale();
		const firstValue = ensureNotNull(this._source.ownerSource()).firstValue();

		// Special Handling for LongShortPosition Tool
		if (this._source.toolType() === 'LongShortPosition') {
			const longShortTool = this._source as LineToolLongShortPosition;

			// Calculate Entry and Stop Loss anchor coordinates
			// directly from their prices (for accuracy)
			for (let i = 0; i < Math.min(2, sourcePoints.length); i++) {
				const point = sourcePoints[i];

				const ptX = timeScale.timeToCoordinate({ timestamp: point.timestamp as UTCTimestamp });
				let ptY = NaN as Coordinate;
				if (firstValue !== null) {
					ptY = priceScale.priceToCoordinate(point.price, firstValue.value);
				}

				this._points.push(new AnchorPoint(ptX, ptY, i, false));
			}

			// Only proceed if there are enough points for the TP point
			// If the tool is finalized, calculate the TP anchor
			if (sourcePoints.length >= 3) {
				// 1. Calculate rounded TP price and timestamp
				const ptPoint = longShortTool.calculateThirdPoint(longShortTool.points()[2]);

				// 2. Calculate rounded x and y coordinates for TP:
				const ptX = timeScale.timeToCoordinate({ timestamp: ptPoint.timestamp as UTCTimestamp });
				let ptY = NaN as Coordinate;
				if (firstValue !== null) {
					ptY = priceScale.priceToCoordinate(ptPoint.price, firstValue.value);
				}

				// 3. Create AnchorPoint for TP point:
				this._points.push(new AnchorPoint(ptX, ptY, 2, false));
			}
		} else {
			// Handle all other tools using the loop and pointToScreenPoint:
			for (let i = 0; i < sourcePoints.length; i++) {
				const point = this._source.pointToScreenPoint(sourcePoints[i]) as AnchorPoint;
				if (!point) { return; }
				point.data = i;
				this._points.push(point);
			}
		}
	}

	protected _validatePriceScale(): boolean {
		const priceScale = this._source.priceScale();
		return null !== priceScale && !priceScale.isEmpty();
	}

	protected _getLineAnchorRenderer(index: number): LineAnchorRenderer {
		for (; this._lineAnchorRenderers.length <= index;) { this._lineAnchorRenderers.push(new LineAnchorRenderer()); }
		return this._lineAnchorRenderers[index];
	}

	protected _tryApplyLineToolShift(appliedPoint: Point, event: TouchMouseEvent, useEditedPointIndex: boolean, originPoint: Point): void {
		if (event.shiftKey !== true) {
			return;
		}

		const toolTypeStr = String(this._source.toolType());

		if (this._isTrendLine() && this._points.length > 0) {
			this._applyTrendLineShift(appliedPoint, useEditedPointIndex);
		}

		this._applyFibRetracementShift(appliedPoint, toolTypeStr);
		this._applyLongShortPositionShift(appliedPoint, toolTypeStr);
		this._applyRectanglePriceRangeShiftCombined(appliedPoint, toolTypeStr);
	}

	protected _isTrendLine(): boolean {
		let isTrendLine = false;
		const toolTypeStr = String(this._source.toolType());
		if (toolTypeStr === 'TrendLine' || toolTypeStr === 'Ray' || toolTypeStr === 'Arrow' || toolTypeStr === 'ExtendedLine' || toolTypeStr === 'ParallelChannel') {
			isTrendLine = true;
		}
		return isTrendLine;
	}

	private _applyFibRetracementShift(appliedPoint: Point, toolTypeStr: string): void {
		const isFibTool = ['FibRetracement', 'TrendBasedFibExtension', 'FibChannel', 'FibTimeZone', 'FibSpeedResistanceFan', 'TrendBasedFibTime', 'FibCircles', 'FibSpiral', 'FibSpeedResistanceArcs', 'FibWedge', 'Pitchfan'].includes(toolTypeStr);
		if (isFibTool && this._editedPointIndex !== null && this._onMouseDownInitialPoints.length > 0 && this._onMouseDownInitialPoints[this._editedPointIndex]) {
			appliedPoint.y = this._onMouseDownInitialPoints[this._editedPointIndex].y;
		}
	}

	private _applyLongShortPositionShift(appliedPoint: Point, toolTypeStr: string): void {
		if (toolTypeStr === 'LongShortPosition' && this._points.length >= 2 && this._editedPointIndex !== null && this._onMouseDownInitialPoints.length >= 2) {
			this._applyLongShortShift(appliedPoint);
		}
	}

	private _applyRectanglePriceRangeShiftCombined(appliedPoint: Point, toolTypeStr: string): void {
		if ((toolTypeStr === 'Rectangle' || toolTypeStr === 'PriceRange') && this._points.length === 2 && this._editedPointIndex !== null && this._onMouseDownInitialPoints.length === 2) {
			this._applyRectanglePriceRangeShift(appliedPoint);
		}
	}

	private _applyTrendLineShift(appliedPoint: Point, useEditedPointIndex: boolean): void {
		if (useEditedPointIndex) {
			switch (this._editedPointIndex) {
				case 0:
					appliedPoint.y = this._points[1].y;
					break;
				case 1:
					appliedPoint.y = this._points[0].y;
					break;
				case 2: {
					const dif = this._points[0].y - this._points[1].y;
					appliedPoint.y = (this._points[2].y - dif) as Coordinate;
					break;
				}
				case 3:
					appliedPoint.y = this._points[2].y;
					break;
			}
		} else {
			appliedPoint.y = this._points[0].y;
		}
	}

	private _applyLongShortShift(appliedPoint: Point): void {
		if (this._editedPointIndex === 0) {
			appliedPoint.y = this._onMouseDownInitialPoints[0].y;
		} else if (this._editedPointIndex === 1) {
			appliedPoint.y = this._onMouseDownInitialPoints[1].y;
		}
	}

	private _applyRectanglePriceRangeShift(appliedPoint: Point): void {
		if (this._editedPointIndex === 0 || this._editedPointIndex === 3) {
			appliedPoint.y = this._onMouseDownInitialPoints[0].y;
		} else if (this._editedPointIndex === 1 || this._editedPointIndex === 2) {
			appliedPoint.y = this._onMouseDownInitialPoints[1].y;
		}
	}

	private _processInputEvent(
		paneWidget: PaneWidget,
		ctx: CanvasRenderingContext2D,
		eventType: InputEventType,
		originPoint: Point,
		appliedPoint: Point,
		event: TouchMouseEvent
	): boolean {
		switch (eventType) {
			case InputEventType.PressedMouseMove:
				return !event.consumed && this._onPressedMouseMove(paneWidget, ctx, originPoint, appliedPoint, event);
			case InputEventType.MouseMove:
				return this._onMouseMove(paneWidget, ctx, originPoint, appliedPoint, event);
			case InputEventType.MouseDown:
				return this._onMouseDown(paneWidget, ctx, originPoint, appliedPoint, event);
			case InputEventType.MouseUp:
				return this._onMouseUp(paneWidget);
			case InputEventType.MouseDoubleClick:
				return this._onMouseDoubleClick(paneWidget, ctx, originPoint, appliedPoint, event);
			default:
				return false;
		}
	}

	private _onPressedMouseMoveLongShortPosition(appliedPoint: Point): void {
		const longShortTool = this._source as LineToolLongShortPosition;
		const priceScale = ensureNotNull(this._source.priceScale());
		const timeScale = this._model.timeScale();
		const firstValue = ensureNotNull(this._source.ownerSource()).firstValue();

		// Create deep copies to prevent accidental modification of original values
		const currentIsLong = JSON.parse(JSON.stringify(longShortTool.getIsLong()));
		const appliedPointCopy = JSON.parse(JSON.stringify(appliedPoint));

		if (firstValue !== null) {
			// Check for a flip in long/short direction
			if ((this._editedPointIndex === 0 || this._editedPointIndex === 1) && longShortTool.checkFlip(ensureNotNull(this._editedPointIndex), appliedPointCopy, currentIsLong)) {
				// Update the _isLong state based on the flip
				longShortTool.setIsLong(longShortTool.isCurrentLong());
				this.setIsFlipped(true);

				// Recalculate the TP point to reflect the flip
				longShortTool.updateTP();
			}

			// Update point coordinates and the main source's point data
			this._updateLongShortPoints(priceScale, timeScale, firstValue, appliedPoint);

			// Update TP point coordinates to stay in sync
			this._points[2].x = timeScale.timeToCoordinate({ timestamp: this._source.points()[2].timestamp as UTCTimestamp });
			this._points[2].y = priceScale.priceToCoordinate(this._source.points()[2].price, firstValue.value);
		}
	}

	private _updateLongShortPoints(priceScale: PriceScale, timeScale: TimeScale, firstValue: FirstValue, appliedPoint: Point): void {
		if (this._editedPointIndex === 0 || this._editedPointIndex === 1) {
			const newTimestamp = timeScale.coordinateToTime(appliedPoint.x).timestamp;

			// === Calculate draggedPrice ===
			let draggedPrice = priceScale.coordinateToPrice(appliedPoint.y, firstValue.value);
			draggedPrice = Number(priceScale.formatPrice(draggedPrice, firstValue.value)) as BarPrice;

			// Update the source point
			this._source.setPoint(ensureNotNull(this._editedPointIndex), { price: draggedPrice, timestamp: newTimestamp });

			// === Calculate draggedX and draggedY ===
			const draggedX = timeScale.timeToCoordinate({ timestamp: newTimestamp });
			const draggedY = priceScale.priceToCoordinate(draggedPrice, firstValue.value);

			this._points[ensureNotNull(this._editedPointIndex)].x = draggedX;
			this._points[ensureNotNull(this._editedPointIndex)].y = draggedY;
		} else if (this._editedPointIndex === 2) { // TP Point
			let newTpPrice = priceScale.coordinateToPrice(appliedPoint.y, firstValue.value);

			newTpPrice = Number(priceScale.formatPrice(newTpPrice, firstValue.value)) as BarPrice;

			// Update the TP point in the main source
			this._source.setPoint(ensureNotNull(this._editedPointIndex), { price: newTpPrice, timestamp: this._source.points()[1].timestamp });
		}
	}

	private _onMouseMovePreview(originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		if (this._source.toolType() === 'LongShortPosition') {
			this._onMouseMovePreviewLongShortPosition(originPoint, appliedPoint, event);
		} else {
			if (this._source.hasMagnet()) { this._model.magnet().enable(); }
			this._tryApplyLineToolShift(appliedPoint, event, false, originPoint);
			this._source.setLastPoint(this._source.screenPointToPoint(appliedPoint) as LineToolPoint);
		}
		return false;
	}

	private _onMouseMovePreviewLongShortPosition(originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): void {
		const longShortTool = this._source as LineToolLongShortPosition;
		if (longShortTool.getClickCount() === 1) {
			if (this._source.hasMagnet()) {
				this._model.magnet().enable();
			}
			const priceScale = ensureNotNull(this._source.priceScale());
			const firstValue = priceScale.firstValue();
			this._tryApplyLineToolShift(appliedPoint, event, false, originPoint);
			const tempStopLossPoint = this._source.screenPointToPoint(appliedPoint) as LineToolPoint;
			if (firstValue !== null) {
				tempStopLossPoint.price = Number(priceScale.formatPrice(tempStopLossPoint.price, firstValue));
			}
			longShortTool.updatePreviewPoints(tempStopLossPoint);
		}
	}

	private _onMouseMoveHover(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, event: TouchMouseEvent): boolean {
		const hitResult = this._hitTest(paneWidget, ctx, originPoint);
		const changed = this._source.setHovered(hitResult !== null && !event.consumed);

		if (this._source.hovered() && !event.consumed) {
			this._setCursor(paneWidget, hitResult);
		}

		return changed;
	}

	private _setCursor(paneWidget: PaneWidget, hitResult: HitTestResult<LineToolHitTestData> | null): void {
		if (this._source.options().locked) {
			paneWidget.setCursor(PaneCursorType.NotAllowed);
		} else if (this._source.options().editable === true) {
			paneWidget.setCursor(hitResult?.data()?.cursorType || PaneCursorType.Pointer);
			this._editedPointIndex = hitResult?.data()?.pointIndex ?? null;
		} else {
			paneWidget.setCursor(hitResult?.data()?.cursorType || PaneCursorType.NotAllowed);
		}
	}
}
