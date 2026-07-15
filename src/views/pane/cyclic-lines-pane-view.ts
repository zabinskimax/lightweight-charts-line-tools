import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { LineToolType } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

// Hard cap so a tiny interval can never spawn an unbounded number of lines.
const MAX_LINES = 300;

export class CyclicLinesPaneView extends LineToolPaneView {
	protected _lineRenderers: SegmentRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'CyclicLines'>;

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

		const pane = this._model.paneForSource(this._source);
		const height = pane ? pane.height() : 0;
		const width = pane ? pane.width() : timeScale.width();

		const x0 = this._points[0].x;
		const interval = this._points[1].x - x0;

		if (Math.abs(interval) >= 1) {
			// Repeat rightward from the first point (leftward when the second
			// point was placed to the left), until past the pane edge.
			let rendererIndex = 0;
			for (let i = 0; i < MAX_LINES; i++) {
				const x = x0 + i * interval;
				if (interval > 0 && x > width + Math.abs(interval)) { break; }
				if (interval < 0 && x < -Math.abs(interval)) { break; }

				if (!this._lineRenderers[rendererIndex]) { this._lineRenderers.push(new SegmentRenderer()); }
				this._lineRenderers[rendererIndex].setData({
					line: { ...options.line, extend: { left: false, right: false } },
					points: [new AnchorPoint(x, 0, 0), new AnchorPoint(x, height, 0)],
				});
				compositeRenderer.append(this._lineRenderers[rendererIndex]);
				rendererIndex++;
			}
		}

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
