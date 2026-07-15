import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { LineToolType } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class PriceLabelPaneView extends LineToolPaneView {
	protected _pointerRenderer: SegmentRenderer = new SegmentRenderer();
	protected _labelRenderer: TextRenderer = new TextRenderer();

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'PriceLabel'>;

		if (!options.visible) {
			return;
		}

		this._renderer = null;
		this._invalidated = false;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();

		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }
		const points = this._source.points();
		if (points.length < 1) { return; }

		super._updateImpl();
		if (this._points.length < 1) { return; }

		const compositeRenderer = new CompositeRenderer();
		const point = this._points[0];

		const firstValue = priceScale.firstValue();
		if (firstValue === null) { return; }

		const labelOptions = deepCopy(options.text);
		// The bubble always displays the anchor's formatted price; a custom
		// text value (from settings) is shown on a second line.
		const formattedPrice = priceScale.formatPrice(points[0].price, firstValue);
		labelOptions.value = options.text.value ? `${formattedPrice}\n${options.text.value}` : formattedPrice;

		const borderColor = labelOptions.box.border?.color || '#2962ff';
		const gap = labelOptions.box.offset?.y ?? 14;

		// Pointer stem connecting the anchor to the bubble.
		this._pointerRenderer.setData({
			line: {
				color: borderColor,
				width: 1,
				style: LineStyle.Solid,
				extend: { left: false, right: false },
			},
			points: [point, new AnchorPoint(point.x, point.y - gap, 0)],
		});
		compositeRenderer.append(this._pointerRenderer);

		this._labelRenderer.setData({ text: labelOptions, points: [point] });
		compositeRenderer.append(this._labelRenderer);

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
