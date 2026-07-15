import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType } from '../../model/line-tool-options';
import { ArcRenderer } from '../../renderers/arc-renderer';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

// Full sweep minus a sliver: normalizing an exact 2π end angle back to 0 would
// make the renderer's angle-range hit test reject every point.
const FULL_ELLIPSE_END = 2 * Math.PI - 0.0001;

export class EllipsePaneView extends LineToolPaneView {
	protected _ellipseRenderer: ArcRenderer = new ArcRenderer();
	protected _labelRenderer: TextRenderer = new TextRenderer();

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'Ellipse'>;

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
		const center = new AnchorPoint((point0.x + point1.x) / 2, (point0.y + point1.y) / 2, 0);
		const radiusX = Math.max(1, Math.abs(point1.x - point0.x) / 2);
		const radiusY = Math.max(1, Math.abs(point1.y - point0.y) / 2);

		this._ellipseRenderer.setData({
			points: [center],
			radius: radiusX,
			radiusY: radiusY,
			startAngle: 0,
			endAngle: FULL_ELLIPSE_END,
			background: options.ellipse.background,
			border: options.ellipse.border,
		});
		compositeRenderer.append(this._ellipseRenderer);

		if (options.text.value) {
			const labelOptions = deepCopy(options.text);
			labelOptions.box.alignment = { horizontal: BoxHorizontalAlignment.Center, vertical: BoxVerticalAlignment.Middle };
			this._labelRenderer.setData({ text: labelOptions, points: [center] });
			compositeRenderer.append(this._labelRenderer);
		}

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
