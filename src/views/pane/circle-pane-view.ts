/* eslint-disable no-trailing-spaces */
/* eslint-disable @typescript-eslint/tslint/config */
import { TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';
import { TextEditor } from '../../gui/text-editor';

import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType } from '../../model/line-tool-options';
import { PaneCursorType } from '../../model/pane';
import { Point } from '../../model/point';
import { calculateDistance, CircleRenderer } from '../../renderers/circle-renderer';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class CirclePaneView extends LineToolPaneView {
	protected _circleRenderer: CircleRenderer = new CircleRenderer();
	protected _labelRenderer: TextRenderer = new TextRenderer();
	private _textEditor: TextEditor | null = null;

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'Circle'>;

		if (!options.visible) {
			return;
		}

		this._renderer = null;
		this._invalidated = false;

		const points = this._source.points();
		if (points.length < 2) { return; }

		super._updateImpl();
		if (this._points.length < 2) { return; }
		const compositeRenderer = new CompositeRenderer();
		this._circleRenderer.setData({ ...deepCopy(options.circle), points: this._points, hitTestBackground: false });

		compositeRenderer.append(this._circleRenderer);
		const point0 = this._points[0];
		const point1 = this._points[1];

		if (options.text.value) {
			// make sure the text area takes into account the full circle

			const radius = calculateDistance(point0, point1);
			const minX = point0.x - radius;
			const maxX = point0.x + radius;
			const minY = point0.y - radius;
			const maxY = point0.y + radius;

			// const minX = Math.min(point0.x, point1.x);
			// const maxX = Math.max(point0.x, point1.x);
			// const minY = Math.min(point0.y, point1.y);
			// const maxY = Math.max(point0.y, point1.y);

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
				// if (options.text.forceCalculateMaxLineWidth) {
				//	labelOptions.wordWrapWidth = maxX - minX - 2 * hoirzontalPadding;
				// }
				labelOptions.box.maxHeight = maxY - minY;
			}

			this._labelRenderer.setData({ text: labelOptions, points: [pivot] });
			compositeRenderer.append(this._labelRenderer);
		}

		this._addAnchors(point0, point1, compositeRenderer);
		this._renderer = compositeRenderer;
	}

	protected _addAnchors(topLeft: AnchorPoint, bottomRight: AnchorPoint, renderer: CompositeRenderer): void {
		// Create anchors for both point0 and point1
		const point0Anchor = new AnchorPoint(topLeft.x, topLeft.y, 0, false);
		const point1Anchor = new AnchorPoint(bottomRight.x, bottomRight.y, 1, false);

		const anchorData = {
			points: [point0Anchor, point1Anchor],
			pointsCursorType: [PaneCursorType.Default, PaneCursorType.DiagonalNwSeResize],
		};

		renderer.append(this.createLineAnchor(anchorData, 0));
	}

	protected override _onMouseDoubleClick(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		if (this._source.options().editable === false) {
			return false;
		}

		const options = this._source.options() as LineToolOptionsInternal<'Circle'>;
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
}
