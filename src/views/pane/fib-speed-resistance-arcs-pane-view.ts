import { applyAlpha } from '../../helpers/color';
import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, FibRetracementLevel, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { ArcRenderer } from '../../renderers/arc-renderer';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class FibSpeedResistanceArcsPaneView extends LineToolPaneView {
	protected _labelRenderers: TextRenderer[] = [];
	protected _arcRenderers: ArcRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'FibSpeedResistanceArcs'>;

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
		const radius0 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

        // Angles: draw a full circle or semi-circle?
        // "Speed Resistance Arcs" are often semi-circles in the trend direction.
        // For now, let's draw full circles like Fib Circles if not specified.
		const startAngle = 0;
		const endAngle = 2 * Math.PI;

		options.levels.forEach((level: FibRetracementLevel, i: number) => {
			const radius = level.coeff * radius0;

			if (!this._arcRenderers[i]) {
				this._arcRenderers.push(new ArcRenderer());
				this._labelRenderers.push(new TextRenderer());
			}

			this._arcRenderers[i].setData({
				background: { color: applyAlpha(level.color, level.opacity) },
				border: { color: level.color, width: 1, style: 0 },
				points: [p1],
				radius: radius,
				startAngle: startAngle,
				endAngle: endAngle,
			});

			this._labelRenderers[i].setData({
				text: {
					alignment: TextAlignment.Center,
					value: `${level.coeff}`,
					font: { color: level.color, size: 11, family: defaultFontFamily },
					box: { alignment: { horizontal: BoxHorizontalAlignment.Center, vertical: BoxVerticalAlignment.Middle } },
				},
				points: [new AnchorPoint(p1.x + radius, p1.y, 0)],
			});

			compositeRenderer.append(this._arcRenderers[i]);
			compositeRenderer.append(this._labelRenderers[i]);
		});

		this.addAnchors(compositeRenderer);

        // Draw trend line from p1 to p2
		const trendLineRenderer = new SegmentRenderer();
		trendLineRenderer.setData({
			line: { ...options.line, color: '#787b86', style: 2, extend: { left: false, right: false } },
			points: [p1, p2],
		});
		compositeRenderer.append(trendLineRenderer);

		this._renderer = compositeRenderer;
	}
}
