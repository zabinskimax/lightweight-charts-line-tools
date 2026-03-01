import { applyAlpha } from '../../helpers/color';
import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, FibRetracementLevel, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { RectangleRenderer } from '../../renderers/fib-retracement-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { PolygonRenderer } from '../../renderers/polygon-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class FibChannelPaneView extends LineToolPaneView {
	protected _rectangleRenderers: RectangleRenderer[] = [];
	protected _labelRenderers: TextRenderer[] = [];
	protected _lineRenderers: SegmentRenderer[] = [];
	protected _polygonRenderers: PolygonRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	// eslint-disable-next-line complexity
	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'FibChannel'>;

		if (!options.visible) {
			return;
		}

		this._renderer = null;
		this._invalidated = false;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();

		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }
		const visibleTimestampRange = timeScale.timestampRangeFromVisibleLogicalRange();
		if (visibleTimestampRange === null) { return; }
		const points = this._source.points();
		if (points.length < 2) { return; }

		// Horizontal off-screen check
		const isOffScreenRightHorizontal = Math.min(points[0].timestamp, points[1].timestamp, points.length > 2 ? points[2].timestamp : points[1].timestamp) > Number(visibleTimestampRange.to);
		const isOffScreenLeftHorizontal = Math.max(points[0].timestamp, points[1].timestamp, points.length > 2 ? points[2].timestamp : points[1].timestamp) < Number(visibleTimestampRange.from);
		const isOffScreenHorizontal = isOffScreenRightHorizontal || isOffScreenLeftHorizontal;

		if (!isOffScreenHorizontal || options.extend.left || options.extend.right) {
			super._updateImpl();

			if (this._points.length < 2) { return; }
			const compositeRenderer = new CompositeRenderer();

			const p1 = this._points[0];
			const p2 = this._points[1];
			const p3 = this._points.length > 2 ? this._points[2] : p1;

			// Always draw the base line if we have at least 2 points
			const baseLineRenderer = new SegmentRenderer();
			baseLineRenderer.setData({
				line: { ...options.line, extend: options.extend, color: '#787b86' },
				points: [p1, p2],
			});
			compositeRenderer.append(baseLineRenderer);

			// Distance from P3 to the line P1-P2 (offset)
			// For simplicity in Fib Channel, we often just use the parallel offset defined by P3.
			// The levels are parallel lines.
			const offsetDx = p3.x - p1.x;
			const offsetDy = p3.y - p1.y;

			// In many implementations, P3 defines the width of the channel relative to the line P1-P2.
			// Levels are then drawn at Coeff * Offset.

			const levels = options.levels.map((level: FibRetracementLevel) => {
				const startX = p1.x + level.coeff * offsetDx;
				const startY = p1.y + level.coeff * offsetDy;
				const endX = p2.x + level.coeff * offsetDx;
				const endY = p2.y + level.coeff * offsetDy;
				return { start: new AnchorPoint(startX, startY, 0), end: new AnchorPoint(endX, endY, 0), level };
			});

			for (let i = 0, j = -1; i < levels.length; i++, j++) {
				if (!this._lineRenderers[i]) {
					this._lineRenderers.push(new SegmentRenderer());
					this._labelRenderers.push(new TextRenderer());
				}

				this._lineRenderers[i].setData({
					line: { ...options.line, extend: options.extend, color: levels[i].level.color },
					points: [levels[i].start, levels[i].end],
				});

				this._labelRenderers[i].setData({
					text: {
						alignment: TextAlignment.Right,
						value: `${levels[i].level.coeff}`,
						font: { color: levels[i].level.color, size: 11, family: defaultFontFamily },
						box: { alignment: { horizontal: BoxHorizontalAlignment.Right, vertical: BoxVerticalAlignment.Middle } },
					},
					points: [levels[i].start, levels[i].end],
				});

				compositeRenderer.append(this._labelRenderers[i]);
				compositeRenderer.append(this._lineRenderers[i]);

				if (j >= 0) {
					if (!this._polygonRenderers[j]) { this._polygonRenderers.push(new PolygonRenderer()); }
					this._polygonRenderers[j].setData({
						line: { ...options.line, color: 'transparent' },
						background: { color: applyAlpha(options.levels[i].color, options.levels[i].opacity) },
						points: [
							levels[i - 1].start,
							levels[i - 1].end,
							levels[i].end,
							levels[i].start,
						],
					});
					compositeRenderer.append(this._polygonRenderers[j]);
				}
			}

			this.addAnchors(compositeRenderer);
			this._renderer = compositeRenderer;
		}
	}
}
