import { TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';
import { TextEditor } from '../../gui/text-editor';

import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { HitTestResult, HitTestType } from '../../model/hit-test-result';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, LineToolType } from '../../model/line-tool-options';
import { Point } from '../../model/point';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineEnd } from '../../renderers/draw-line';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class HorizontalLinePaneView extends LineToolPaneView {
	protected _lineRenderer: SegmentRenderer = new SegmentRenderer();
	protected _labelRenderer: TextRenderer = new TextRenderer();
	private _textEditor: TextEditor | null = null;

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
		this._lineRenderer.setHitTest(new HitTestResult(HitTestType.MovePoint));
	}

	// eslint-disable-next-line complexity
	protected override _updateImpl(height: number, width: number): void {
		const options = this._source.options() as LineToolOptionsInternal<'HorizontalLine'>;

		if (!options.visible) {
			return;
		}

		this._renderer = null;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();
		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }

		const points = this._source.points();
		if (points.length < 1) { return; }

		const point0Data = points[0];

		const ownerSource = this._source.ownerSource();
		const firstValue = ownerSource?.firstValue();
		if (!firstValue) { return; }

		const point0ScreenY = priceScale.priceToCoordinate(point0Data.price, firstValue.value);
		const y0 = point0ScreenY;

		const pane = this._model.paneForSource(this._source);
		const paneHeight = pane?.height() ?? 0;

		// Consolidated vertical top and bottom off-screen check
		const isOffScreenTopVertical = (y0 < 0);
		const isOffScreenBottomVertical = (y0 > paneHeight);
		const isOffScreenVertical = isOffScreenTopVertical || isOffScreenBottomVertical;

		const { left, right } = options.line.extend || {};
		const isOutsideView = isOffScreenVertical;

		if (!isOutsideView) {
			super._updateImpl();
			if (this._points.length < 1) { return; }

			const point = this._points[0];
			const start = left ? new AnchorPoint(0, point.y, 0) : new AnchorPoint(point.x, point.y, 0);
			const end = right ? new AnchorPoint(width, point.y, 1) : new AnchorPoint(point.x, point.y, 1);

			if (Math.floor(start.x) === Math.floor(end.x) || Math.max(start.x, end.x) <= 0 || end.x < start.x) { return; }

			if (left && right) {
				point.x = width / 2 as Coordinate;
				point.square = true;
			}

			const ends = { left: LineEnd.Normal, right: LineEnd.Normal };
			const compositeRenderer = new CompositeRenderer();
			this._lineRenderer.setData({ line: { ...deepCopy(options.line), end: ends }, points: [start, end] });

			compositeRenderer.append(this._lineRenderer);
			if (options.text.value) {
				const angle = Math.atan((end.y - start.y) / (end.x - start.x)) / Math.PI * -180;
				const align = options.text.box.alignment.horizontal;
				const pivot = align === BoxHorizontalAlignment.Left
					? start.clone() : align === BoxHorizontalAlignment.Right
						? end.clone() : new Point((start.x + end.x) / 2, (start.y + end.y) / 2);

				const labelOptions = deepCopy(options.text);
				labelOptions.box = { ...labelOptions.box, angle };

				this._labelRenderer.setData({ text: labelOptions, points: [pivot], editing: !!this._textEditor });
				compositeRenderer.append(this._labelRenderer);
			}

			this.addAnchors(compositeRenderer);
			this._renderer = compositeRenderer;
		}
	}

	protected override _onMouseDoubleClick(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		if (this._source.options().editable === false) {
			return false;
		}

		const options = this._source.options() as LineToolOptionsInternal<'HorizontalLine'>;
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
