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

export class FibWedgePaneView extends LineToolPaneView {
	protected _labelRenderers: TextRenderer[] = [];
	protected _lineRenderers: SegmentRenderer[] = [];
	protected _polygonRenderers: PolygonRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'FibWedge'>;

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

        // Base line (P1 to P2)
        // Wedge is formed by rays starting at P1.
        // One ray goes through P2.
        // Another ray goes through P3.
        // Levels are rays with interpolated angles between Ray1 and Ray2.

		const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
		const angle2 = Math.atan2(p3.y - p1.y, p3.x - p1.x);

        // Shortest angle difference
		let dAngle = angle2 - angle1;
		while (dAngle > Math.PI) { dAngle -= 2 * Math.PI; }
		while (dAngle < -Math.PI) { dAngle += 2 * Math.PI; }

		if (this._points.length < 3) {
            // Draw only the base line as preview
			const baseLineRenderer = new SegmentRenderer();
			baseLineRenderer.setData({
				line: { ...options.line, color: '#787b86', style: 2, extend: { left: false, right: false } },
				points: [p1, p2],
			});
			compositeRenderer.append(baseLineRenderer);
		}
        // Even if length is 2, we can proceed to draw levels (they will overlap at dAngle=0)
        // This makes it "live" as soon as you move towards P3.

		const pane = this._model.paneForSource(this._source);
		const width = pane ? pane.width() : 2000;
		const height = pane ? pane.height() : 2000;
		const maxDist = Math.sqrt(width * width + height * height);

		options.levels.forEach((level: FibRetracementLevel, i: number) => {
			const angle = angle1 + level.coeff * dAngle;
			const endX = p1.x + Math.cos(angle) * maxDist;
			const endY = p1.y + Math.sin(angle) * maxDist;

			if (!this._lineRenderers[i]) {
				this._lineRenderers.push(new SegmentRenderer());
				this._labelRenderers.push(new TextRenderer());
			}

			const endPoint = new AnchorPoint(endX, endY, 0);
			this._lineRenderers[i].setData({
				line: { ...options.line, extend: { left: false, right: false }, color: level.color },
				points: [p1, endPoint],
			});

			this._labelRenderers[i].setData({
				text: {
					alignment: TextAlignment.Center,
					value: `${level.coeff}`,
					font: { color: level.color, size: 11, family: defaultFontFamily },
					box: { alignment: { horizontal: BoxHorizontalAlignment.Center, vertical: BoxVerticalAlignment.Middle } },
				},
				points: [new AnchorPoint(p1.x + Math.cos(angle) * 100, p1.y + Math.sin(angle) * 100, 0)],
			});

			compositeRenderer.append(this._lineRenderers[i]);
			compositeRenderer.append(this._labelRenderers[i]);

			if (i > 0) {
				const prevAngle = angle1 + options.levels[i - 1].coeff * dAngle;
				const prevEndX = p1.x + Math.cos(prevAngle) * maxDist;
				const prevEndY = p1.y + Math.sin(prevAngle) * maxDist;

				if (!this._polygonRenderers[i - 1]) { this._polygonRenderers.push(new PolygonRenderer()); }
				this._polygonRenderers[i - 1].setData({
					points: [p1, new AnchorPoint(prevEndX, prevEndY, 0), endPoint],
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
