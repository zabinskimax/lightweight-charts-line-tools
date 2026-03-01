import { applyAlpha } from '../../helpers/color';
import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, FibRetracementLevel, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { CircleRenderer } from '../../renderers/circle-renderer';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class FibCirclesPaneView extends LineToolPaneView {
	protected _labelRenderers: TextRenderer[] = [];
	protected _circleRenderers: CircleRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'FibCircles'>;

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

		const center = this._points[0];
		const edge = this._points[1];
		const radius0 = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));

		options.levels.forEach((level: FibRetracementLevel, i: number) => {
			const radius = level.coeff * radius0;

			if (!this._circleRenderers[i]) {
				this._circleRenderers.push(new CircleRenderer());
				this._labelRenderers.push(new TextRenderer());
			}

			this._circleRenderers[i].setData({
				background: { color: applyAlpha(level.color, level.opacity) },
				border: { color: level.color, width: 1, style: LineStyle.Solid },
				points: [center, new AnchorPoint(center.x + radius, center.y, 0)],
			});

			this._labelRenderers[i].setData({
				text: {
					alignment: TextAlignment.Center,
					value: `${level.coeff}`,
					font: { color: level.color, size: 11, family: defaultFontFamily },
					box: { alignment: { horizontal: BoxHorizontalAlignment.Center, vertical: BoxVerticalAlignment.Middle } },
				},
				points: [new AnchorPoint(center.x + radius, center.y, 0)],
			});

			compositeRenderer.append(this._circleRenderers[i]);
			compositeRenderer.append(this._labelRenderers[i]);
		});

		this.addAnchors(compositeRenderer);

        // Draw trend line from center to edge
		const trendLineRenderer = new SegmentRenderer();
		trendLineRenderer.setData({
			line: { ...options.line, color: '#787b86', style: 2, extend: { left: false, right: false } },
			points: [center, edge],
		});
		compositeRenderer.append(trendLineRenderer);

		this._renderer = compositeRenderer;
	}
}
