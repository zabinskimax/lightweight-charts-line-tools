import { applyAlpha } from '../../helpers/color';
import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, FibRetracementLevel, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { PolygonRenderer } from '../../renderers/polygon-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class FibSpeedResistanceFanPaneView extends LineToolPaneView {
	protected _labelRenderers: TextRenderer[] = [];
	protected _lineRenderers: SegmentRenderer[] = [];
	protected _polygonRenderers: PolygonRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'FibSpeedResistanceFan'>;

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

        // Draw trend line between P1 and P2
		const trendLineRenderer = new SegmentRenderer();
		trendLineRenderer.setData({
			line: { ...options.line, color: '#787b86', style: 2, extend: { left: false, right: false } },
			points: [this._points[0], this._points[1]],
		});
		compositeRenderer.append(trendLineRenderer);

		const p1 = points[0];
		const p2 = points[1];
		const dp = p2.price - p1.price;

		const p1Screen = this._points[0];
		const p2ScreenX = this._points[1].x;

		options.levels.forEach((level: FibRetracementLevel, i: number) => {
			const price = p1.price + level.coeff * dp;
			const baseValue = this._source.ownerSource()?.firstValue()?.value || 0;
			const y = priceScale.priceToCoordinate(price, baseValue);

			if (!this._lineRenderers[i]) {
				this._lineRenderers.push(new SegmentRenderer());
				this._labelRenderers.push(new TextRenderer());
			}

			const endPoint = new AnchorPoint(p2ScreenX, y, 0);
			this._lineRenderers[i].setData({
				line: { ...options.line, extend: { left: false, right: false }, color: level.color },
				points: [p1Screen, endPoint],
			});

			this._labelRenderers[i].setData({
				text: {
					alignment: TextAlignment.Right,
					value: `${level.coeff}`,
					font: { color: level.color, size: 11, family: defaultFontFamily },
					box: { alignment: { horizontal: BoxHorizontalAlignment.Right, vertical: BoxVerticalAlignment.Middle } },
				},
				points: [endPoint],
			});

			compositeRenderer.append(this._labelRenderers[i]);
			compositeRenderer.append(this._lineRenderers[i]);

			if (i > 0) {
				const prevPrice = p1.price + options.levels[i - 1].coeff * dp;
				const prevY = priceScale.priceToCoordinate(prevPrice, baseValue);

				if (!this._polygonRenderers[i - 1]) { this._polygonRenderers.push(new PolygonRenderer()); }
				this._polygonRenderers[i - 1].setData({
					points: [p1Screen, new AnchorPoint(p2ScreenX, prevY, 0), endPoint],
					background: { color: applyAlpha(level.color, level.opacity) },
					line: { color: applyAlpha(level.color, 0), width: 1, style: LineStyle.Solid },
				});
				compositeRenderer.append(this._polygonRenderers[i - 1]);
			}
		});

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
