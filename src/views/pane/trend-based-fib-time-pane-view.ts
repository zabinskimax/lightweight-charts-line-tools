import { applyAlpha } from '../../helpers/color';
import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, FibRetracementLevel, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { UTCTimestamp } from '../../model/time-data';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { RectangleRenderer } from '../../renderers/fib-retracement-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class TrendBasedFibTimePaneView extends LineToolPaneView {
	protected _rectangleRenderers: RectangleRenderer[] = [];
	protected _labelRenderers: TextRenderer[] = [];
	protected _lineRenderers: SegmentRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'TrendBasedFibTime'>;

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

		const t1 = points[0].timestamp;
		const t2 = points[1].timestamp;
		const dt = Number(t2) - Number(t1);

		super._updateImpl();

		if (this._points.length < 2) { return; }
		const compositeRenderer = new CompositeRenderer();

		const pane = this._model.paneForSource(this._source);
		const height = pane ? pane.height() : 0;

		const t3 = points.length > 2 ? points[2].timestamp : points[1].timestamp;

		// Draw trend line between Level 1 and Level 2 (relative to T3)
		const tLevel1 = Number(t3) + options.levels[0].coeff * dt;
		const tLevel2 = Number(t3) + options.levels[1].coeff * dt;
		const xLevel1 = timeScale.timeToCoordinate({ timestamp: tLevel1 as UTCTimestamp });
		const xLevel2 = timeScale.timeToCoordinate({ timestamp: tLevel2 as UTCTimestamp });

		if (xLevel1 !== null && xLevel2 !== null) {
			const trendLineRenderer = new SegmentRenderer();
			trendLineRenderer.setData({
				line: { ...options.line, color: '#787b86', style: 2, extend: { left: false, right: false } },
				points: [
					new AnchorPoint(xLevel1, this._points[0].y, 0),
					new AnchorPoint(xLevel2, this._points[0].y, 0),
				],
			});
			compositeRenderer.append(trendLineRenderer);
		}

		options.levels.forEach((level: FibRetracementLevel, i: number) => {
			const timestamp = Number(t3) + level.coeff * dt;
			const x = timeScale.timeToCoordinate({ timestamp: timestamp as UTCTimestamp });

			if (!this._lineRenderers[i]) {
				this._lineRenderers.push(new SegmentRenderer());
				this._labelRenderers.push(new TextRenderer());
			}

			const linePoints = [
				new AnchorPoint(x, 0, 0),
				new AnchorPoint(x, height, 0),
			];

			this._lineRenderers[i].setData({
				line: { ...options.line, extend: { left: false, right: false }, color: level.color },
				points: linePoints,
			});

			this._labelRenderers[i].setData({
				text: {
					alignment: TextAlignment.Left,
					value: `${i + 1}`,
					font: { color: level.color, size: 11, family: defaultFontFamily },
					box: { alignment: { horizontal: BoxHorizontalAlignment.Left, vertical: BoxVerticalAlignment.Top } },
				},
				points: [new AnchorPoint(x + 4, height - 11 - 10, 0)],
			});

			compositeRenderer.append(this._labelRenderers[i]);
			compositeRenderer.append(this._lineRenderers[i]);

			if (i > 0) {
				const prevX = timeScale.timeToCoordinate({ timestamp: (Number(t3) + options.levels[i - 1].coeff * dt) as UTCTimestamp });
				if (!this._rectangleRenderers[i - 1]) { this._rectangleRenderers.push(new RectangleRenderer()); }
				this._rectangleRenderers[i - 1].setData({
					...options.line,
					extend: { left: false, right: false },
					background: { color: applyAlpha(level.color, level.opacity) },
					points: [new AnchorPoint(prevX, 0, 0), new AnchorPoint(x, height, 0)],
				});
				compositeRenderer.append(this._rectangleRenderers[i - 1]);
			}
		});

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
