/* eslint-disable complexity */
import { TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';
import { TextEditor } from '../../gui/text-editor';

import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType, TextAlignment, TextOptions } from '../../model/line-tool-options';
import { Point } from '../../model/point';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class TextPaneView extends LineToolPaneView {
	protected _labelRenderer: TextRenderer = new TextRenderer();
	private _textEditor: TextEditor | null = null;

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(height: number, width: number): void {
		const options = this._source.options() as LineToolOptionsInternal<'Text'>;

		if (!options.visible) {
			return;
		}

		this._renderer = null;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();
		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }

		super._updateImpl();
		if (this._points.length < 1) { return; }

		const visibleTimestampRange = timeScale.timestampRangeFromVisibleLogicalRange();
		if (visibleTimestampRange === null) { return; }
		const points = this._source.points();

		const point0Data = points[0];

		if (!point0Data) {
			return;
		}

		const ownerSource = this._source.ownerSource();
		const firstValue = ownerSource?.firstValue();
		if (!firstValue) { return; }

		const point0ScreenY = priceScale.priceToCoordinate(point0Data.price, firstValue.value);

		const y0 = point0ScreenY;

		const pane = this._model.paneForSource(this._source);
		const paneHeight = pane?.height() ?? 0;
		// const paneWidth = pane?.width() ?? 0;

		// Consolidated vertical top and bottom off-screen check
		const isOffScreenTopVertical = (y0 < 0);
		const isOffScreenBottomVertical = (y0 > paneHeight);
		const isOffScreenVertical = isOffScreenTopVertical || isOffScreenBottomVertical;

		// Consolidated horizontal right and left off-screen check
		const isOffScreenRightHorizontal = Math.min(points[0].timestamp) > Number(visibleTimestampRange.to);
		const isOffScreenLeftHorizontal = Math.max(points[0].timestamp) < Number(visibleTimestampRange.from);
		const isOffScreenHorizontal = isOffScreenRightHorizontal || isOffScreenLeftHorizontal;

		const isOutsideView = isOffScreenVertical || isOffScreenHorizontal;

		if (!isOutsideView) {
			// console.log('draw text');
			const data = deepCopy(options.text) as TextOptions;
			data.box.alignment = { vertical: BoxVerticalAlignment.Top, horizontal: BoxHorizontalAlignment.Center };
			data.alignment = TextAlignment.Center;
			const point = this._points[0].clone();

			const compositeRenderer = new CompositeRenderer();
			this._labelRenderer.setData({ text: data, points: [point], editing: this._source.editing() });

			compositeRenderer.append(this._labelRenderer);
			this.addAnchors(compositeRenderer);
			this._renderer = compositeRenderer;
		}
	}

	protected override _onMouseDoubleClick(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		console.log('TextPaneView: _onMouseDoubleClick called');
		if (this._source.options().editable === false) {
			return false;
		}

		if (this._hitTest(paneWidget, ctx, originPoint)) {
			if (this._textEditor) {
				this._textEditor.destroy();
			}

			const options = this._source.options() as LineToolOptionsInternal<'Text'>;
			const rect = this._labelRenderer.textRect();
			const pixelRatio = ctx.canvas.width / ctx.canvas.getBoundingClientRect().width;

			this._source.setEditing(true);
			this._source.updateAllViews();

			const alignment = 'center';
			const anchorX = rect.x + rect.width / 2;

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
