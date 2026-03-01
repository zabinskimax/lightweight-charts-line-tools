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

export class PitchfanPaneView extends LineToolPaneView {
	protected _labelRenderers: TextRenderer[] = [];
	protected _lineRenderers: SegmentRenderer[] = [];
	protected _polygonRenderers: PolygonRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'Pitchfan'>;

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

		const p1 = this._points[0];
		const p2 = this._points[1];
		const p3 = this._points.length > 2 ? this._points[2] : p2;

        // If we only have 2 points, just draw the line between them as a preview
		if (this._points.length < 3) {
			const baseLineRenderer = new SegmentRenderer();
			baseLineRenderer.setData({
				line: { ...options.line, color: '#787b86', style: 2, extend: { left: false, right: false } },
				points: [p1, p2],
			});
			compositeRenderer.append(baseLineRenderer);
		}

        // Pitchfan: Lines from P1 to levels between P2 and P3.
        // Levels are points on the segment P2-P3 based on coefficients.

		options.levels.forEach((level: FibRetracementLevel, i: number) => {
			const x = p2.x + level.coeff * (p3.x - p2.x);
			const y = p2.y + level.coeff * (p3.y - p2.y);

			if (!this._lineRenderers[i]) {
				this._lineRenderers.push(new SegmentRenderer());
				this._labelRenderers.push(new TextRenderer());
			}

			const endPoint = new AnchorPoint(x, y, 0);
			this._lineRenderers[i].setData({
				line: { ...options.line, extend: options.extend, color: level.color },
				points: [p1, endPoint],
			});

			this._labelRenderers[i].setData({
				text: {
					alignment: TextAlignment.Center,
					value: `${level.coeff}`,
					font: { color: level.color, size: 11, family: defaultFontFamily },
					box: { alignment: { horizontal: BoxHorizontalAlignment.Center, vertical: BoxVerticalAlignment.Middle } },
				},
				points: [endPoint],
			});

			compositeRenderer.append(this._lineRenderers[i]);
			compositeRenderer.append(this._labelRenderers[i]);

			if (i > 0) {
				const prevX = p2.x + options.levels[i - 1].coeff * (p3.x - p2.x);
				const prevY = p2.y + options.levels[i - 1].coeff * (p3.y - p2.y);

				if (!this._polygonRenderers[i - 1]) { this._polygonRenderers.push(new PolygonRenderer()); }
				this._polygonRenderers[i - 1].setData({
					points: [p1, new AnchorPoint(prevX, prevY, 0), endPoint],
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
