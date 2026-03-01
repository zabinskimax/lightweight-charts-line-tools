import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, FibRetracementLevel, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { SpiralRenderer } from '../../renderers/spiral-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class FibSpiralPaneView extends LineToolPaneView {
	protected _labelRenderers: TextRenderer[] = [];
	protected _spiralRenderers: SpiralRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'FibSpiral'>;

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

		options.levels.forEach((level: FibRetracementLevel, i: number) => {
            // A Fibonacci Spiral tool usually draws ONE spiral based on the Golden Ratio.
            // However, our options allow for "levels".
            // For now, let's draw one spiral at level.coeff scale if level.visible is true.
			if (!level.visible) { return; }

			if (!this._spiralRenderers[i]) {
				this._spiralRenderers.push(new SpiralRenderer());
				this._labelRenderers.push(new TextRenderer());
			}

            // We need to pass scaled points to the renderer to handle "levels"
            // But SpiralRenderer uses points[0] as center and points[1] as radius unit.
			const edgeX = p1.x + (p2.x - p1.x) * level.coeff;
			const edgeY = p1.y + (p2.y - p1.y) * level.coeff;

			this._spiralRenderers[i].setData({
				color: level.color,
				width: 1,
				style: LineStyle.Solid,
				points: [p1, new AnchorPoint(edgeX, edgeY, 0)],
			});

			this._labelRenderers[i].setData({
				text: {
					alignment: TextAlignment.Center,
					value: `${level.coeff}`,
					font: { color: level.color, size: 11, family: defaultFontFamily },
					box: { alignment: { horizontal: BoxHorizontalAlignment.Center, vertical: BoxVerticalAlignment.Middle } },
				},
				points: [new AnchorPoint(edgeX, edgeY, 0)],
			});

			compositeRenderer.append(this._spiralRenderers[i]);
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
