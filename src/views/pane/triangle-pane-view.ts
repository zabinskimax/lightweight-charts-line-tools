import { TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';
import { TextEditor } from '../../gui/text-editor';

import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { LineTool, LineToolOptionsInternal, LineToolPoint } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType } from '../../model/line-tool-options';
import { Point } from '../../model/point';
import { PriceScale } from '../../model/price-scale';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { TextRenderer } from '../../renderers/text-renderer';
import { TriangleRenderer } from '../../renderers/triangle-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class TrianglePaneView extends LineToolPaneView {
	protected _triangleRenderer: TriangleRenderer = new TriangleRenderer();
	protected _labelRenderer: TextRenderer = new TextRenderer();
	private _textEditor: TextEditor | null = null;

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'Triangle'>;

		if (!options.visible) {
			return;
		}

		if (this._isOutsideView(options)) {
			return;
		}

		// GOTCHA if using isOutsideView and it is culling the redraw, sometimes a partial triangle artifact will be on screen.
		// It has to do with the redraw?  maybe because this one uses the compositeRenderer?  If not using isOutsideView at all it draws fine
		super._updateImpl();
		this._renderer = null;

		this._triangleRenderer.setData({ ...options.triangle, points: this._points, hitTestBackground: true });
		const compositeRenderer = new CompositeRenderer();
		compositeRenderer.append(this._triangleRenderer);

		this._updateLabelRenderer(options, compositeRenderer);

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}

	protected override _onMouseDoubleClick(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		if (this._source.options().editable === false) {
			return false;
		}

		const options = this._source.options() as LineToolOptionsInternal<'Triangle'>;
		if (!options.text.value) {
			return false;
		}

		// Hit test specifically on the label, not the entire tool
		if (this._labelRenderer.hitTest(originPoint.x, originPoint.y)) {
			if (this._textEditor) {
				this._textEditor.destroy();
			}

			const rect = this._labelRenderer.textRect();
			const pixelRatio = ctx.canvas.width / ctx.canvas.getBoundingClientRect().width;

			this._source.setEditing(true);
			this._source.updateAllViews();

			const align = options.text.box.alignment.horizontal;
			const alignment = align === BoxHorizontalAlignment.Left
				? 'left' : align === BoxHorizontalAlignment.Right
					? 'right' : 'center';
			// textRect() already returns the positioned text rectangle
			// For left: pivot is at rect.x
			// For center: pivot is at rect.x + rect.width / 2
			// For right: pivot is at rect.x + rect.width
			const anchorX = align === BoxHorizontalAlignment.Left
				? rect.x : align === BoxHorizontalAlignment.Right
					? rect.x + rect.width : rect.x + rect.width / 2;

			this._textEditor = new TextEditor({
				container: paneWidget.canvasWrapper(),
				text: options.text,
				pixelRatio: pixelRatio,
				pivotX: anchorX,
				pivotY: rect.y - 4,
				alignment: alignment,
				rect: {
					left: rect.x,
					top: rect.y - 4,
					width: rect.width,
					height: rect.height,
				},
				onBlur: (newValue: string) => {
					this._source.setEditing(false);
					if (newValue !== options.text.value) {
						this._source.applyOptions({
							text: { value: newValue },
						});
					} else {
						this._source.updateAllViews();
					}
					this._textEditor?.destroy();
					this._textEditor = null;
				},
				onCancel: () => {
					this._source.setEditing(false);
					this._source.updateAllViews();
					this._textEditor?.destroy();
					this._textEditor = null;
				},
			});
			return true;
		}

		return false;
	}

	private _isOutsideView(options: LineToolOptionsInternal<'Triangle'>): boolean {
		if (this._points.length !== 3) {
			return false;
		}

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();

		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
			return true;
		}

		const visibleTimestampRange = timeScale.timestampRangeFromVisibleLogicalRange();
		if (visibleTimestampRange === null) {
			return true;
		}

		const points = this._source.points();
		if (points.length < 3) {
			return true;
		}

		return this._isOffScreenVertical(priceScale, points) || this._isOffScreenHorizontal(visibleTimestampRange, points);
	}

	private _isOffScreenVertical(priceScale: PriceScale, points: LineToolPoint[]): boolean {
		const ownerSource = this._source.ownerSource();
		const firstValue = ownerSource?.firstValue();
		if (!firstValue) {
			return true;
		}

		const y0 = priceScale.priceToCoordinate(points[0].price, firstValue.value);
		const y1 = priceScale.priceToCoordinate(points[1].price, firstValue.value);
		const y2 = priceScale.priceToCoordinate(points[2].price, firstValue.value);

		const pane = this._model.paneForSource(this._source);
		const paneHeight = pane?.height() ?? 0;

		return (y0 < 0 && y1 < 0 && y2 < 0) || (y0 > paneHeight && y1 > paneHeight && y2 > paneHeight);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private _isOffScreenHorizontal(visibleTimestampRange: any, points: LineToolPoint[]): boolean {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const isOffScreenRight = Math.min(points[0].timestamp, points[1].timestamp, points[2].timestamp) > Number(visibleTimestampRange.to);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const isOffScreenLeft = Math.max(points[0].timestamp, points[1].timestamp, points[2].timestamp) < Number(visibleTimestampRange.from);
		return isOffScreenRight || isOffScreenLeft;
	}

	private _updateLabelRenderer(options: LineToolOptionsInternal<'Triangle'>, compositeRenderer: CompositeRenderer): void {
		if (this._points.length !== 3 || !options.text.value) {
			return;
		}

		const point0 = this._points[0];
		const point1 = this._points[1];
		const point2 = this._points[2];

		const minX = Math.min(point0.x, point1.x, point2.x);
		const maxX = Math.max(point0.x, point1.x, point2.x);
		const minY = Math.min(point0.y, point1.y, point2.y);
		const maxY = Math.max(point0.y, point1.y, point2.y);

		const pivot = point0.clone();
		const textHalfSize = options.text.font.size / 3;
		let hoirzontalPadding = 0;

		switch (options.text.box.alignment.vertical) {
			case BoxVerticalAlignment.Middle:
				pivot.y = (minY + maxY) / 2 as Coordinate;
				hoirzontalPadding = textHalfSize;
				break;
			case BoxVerticalAlignment.Top:
				pivot.y = minY as Coordinate;
				break;
			case BoxVerticalAlignment.Bottom:
				pivot.y = maxY as Coordinate;
		}

		switch (options.text.box.alignment.horizontal) {
			case BoxHorizontalAlignment.Center:
				pivot.x = (minX + maxX) / 2 as Coordinate;
				break;
			case BoxHorizontalAlignment.Left:
				pivot.x = minX as Coordinate;
				break;
			case BoxHorizontalAlignment.Right:
				pivot.x = maxX as Coordinate;
		}

		const labelOptions = deepCopy(options.text);
		labelOptions.box = { ...labelOptions.box, padding: { y: textHalfSize, x: hoirzontalPadding } };

		if (options.text.box.alignment.vertical === BoxVerticalAlignment.Middle) {
			labelOptions.box.maxHeight = maxY - minY;
		}

		this._labelRenderer.setData({ text: labelOptions, points: [pivot], editing: !!this._textEditor });
		compositeRenderer.append(this._labelRenderer);
	}
}
