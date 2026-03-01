import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { LineToolType } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { SpiralRenderer } from '../../renderers/spiral-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class FibSpiralPaneView extends LineToolPaneView {
	protected _spiralRenderer: SpiralRenderer = new SpiralRenderer();

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

		// Draw single spiral using the first visible level's color, or fallback to line color
		const visibleLevel = options.levels.find((l) => l.visible);
		const spiralColor = visibleLevel ? visibleLevel.color : '#2962ff';

		this._spiralRenderer.setData({
			color: spiralColor,
			width: options.line.width,
			style: options.line.style,
			points: [p1, p2],
		});

		compositeRenderer.append(this._spiralRenderer);

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
