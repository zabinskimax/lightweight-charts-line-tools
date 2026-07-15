import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { toPercent } from '../../model/price-scale-conversions';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { formatDuration } from './date-range-pane-view';
import { LineToolPaneView } from './line-tool-pane-view';

export class InfoLinePaneView extends LineToolPaneView {
	protected _lineRenderer: SegmentRenderer = new SegmentRenderer();
	protected _statsRenderer: TextRenderer = new TextRenderer();

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'InfoLine'>;

		if (!options.visible) {
			return;
		}

		this._renderer = null;
		this._invalidated = false;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();

		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }
		const points = this._source.points();
		if (points.length < 2) { return; }

		super._updateImpl();
		if (this._points.length < 2) { return; }

		const compositeRenderer = new CompositeRenderer();
		const point0 = this._points[0];
		const point1 = this._points[1];

		this._lineRenderer.setData({ line: options.line, points: this._points });
		compositeRenderer.append(this._lineRenderer);

		const firstValue = priceScale.firstValue();
		if (firstValue !== null) {
			const priceDiff = points[1].price - points[0].price;
			const sign = priceDiff > 0 ? '+' : '';
			const formattedDiff = priceScale.formatPrice(priceDiff, firstValue);
			const percent = toPercent(points[1].price, points[0].price);

			const barSpacing = timeScale.barSpacing();
			const bars = barSpacing > 0 ? Math.round((point1.x - point0.x) / barSpacing) : 0;
			const duration = formatDuration(Number(points[1].timestamp) - Number(points[0].timestamp));

			const dx = point1.x - point0.x;
			const dy = point1.y - point0.y;
			const degrees = (dx !== 0 || dy !== 0) ? Math.round(Math.atan2(-dy, dx) * 180 / Math.PI) : 0;

			const statsValue = `${sign}${formattedDiff} (${sign}${percent.toFixed(2)}%)\n${bars} bars, ${duration}\n∠ ${degrees}°`;

			// Stats pill hangs off the drag end: above it on an up-slope,
			// below it on a down-slope, so it never covers the line itself.
			const upward = point1.y <= point0.y;
			this._statsRenderer.setData({
				text: {
					alignment: TextAlignment.Center,
					value: statsValue,
					font: { color: '#ffffff', size: options.text.font.size || 12, family: defaultFontFamily },
					box: {
						alignment: {
							horizontal: BoxHorizontalAlignment.Center,
							vertical: upward ? BoxVerticalAlignment.Top : BoxVerticalAlignment.Bottom,
						},
						offset: { x: 0, y: 14 },
						padding: { x: 0, y: 2 },
						background: { color: 'rgba(41, 98, 255, 0.89)', inflation: { x: 10, y: 6 } },
						border: { color: 'rgba(41, 98, 255, 1)', width: 0, radius: 6, highlight: false, style: LineStyle.Solid },
					},
				},
				points: [point1],
			});
			compositeRenderer.append(this._statsRenderer);
		}

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
