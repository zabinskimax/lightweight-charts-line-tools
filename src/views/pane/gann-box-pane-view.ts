import { applyAlpha } from '../../helpers/color';
import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, FibRetracementLevel, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { RectangleRenderer } from '../../renderers/fib-retracement-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class GannBoxPaneView extends LineToolPaneView {
	protected _priceLineRenderers: SegmentRenderer[] = [];
	protected _timeLineRenderers: SegmentRenderer[] = [];
	protected _priceFillRenderers: RectangleRenderer[] = [];
	protected _timeFillRenderers: RectangleRenderer[] = [];
	protected _priceLabelRenderers: TextRenderer[] = [];
	protected _timeLabelRenderers: TextRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	// eslint-disable-next-line complexity
	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'GannBox'>;

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

		const p0 = this._points[0];
		const p1 = this._points[1];
		const minX = Math.min(p0.x, p1.x);
		const maxX = Math.max(p0.x, p1.x);

		const priceLevels = options.priceLevels.filter((level: FibRetracementLevel) => level.visible !== false);
		const timeLevels = options.timeLevels.filter((level: FibRetracementLevel) => level.visible !== false);

		// Horizontal (price) levels: coeff 0 at point 0, coeff 1 at point 1.
		priceLevels.forEach((level: FibRetracementLevel, i: number) => {
			const y = p0.y + level.coeff * (p1.y - p0.y);

			if (!this._priceLineRenderers[i]) {
				this._priceLineRenderers.push(new SegmentRenderer());
				this._priceLabelRenderers.push(new TextRenderer());
			}

			this._priceLineRenderers[i].setData({
				line: { ...options.line, color: level.color, extend: { left: options.extend.left, right: options.extend.right } },
				points: [new AnchorPoint(minX, y, 0), new AnchorPoint(maxX, y, 0)],
			});
			compositeRenderer.append(this._priceLineRenderers[i]);

			if (options.showLabels) {
				this._priceLabelRenderers[i].setData({
					text: {
						alignment: TextAlignment.Right,
						value: `${level.coeff}`,
						font: { color: level.color, size: 11, family: defaultFontFamily },
						box: {
							alignment: { horizontal: BoxHorizontalAlignment.Right, vertical: BoxVerticalAlignment.Middle },
							offset: { x: 6, y: 0 },
						},
					},
					points: [new AnchorPoint(minX, y, 0)],
				});
				compositeRenderer.append(this._priceLabelRenderers[i]);
			}

			if (i > 0 && level.opacity > 0) {
				const prevY = p0.y + priceLevels[i - 1].coeff * (p1.y - p0.y);
				if (!this._priceFillRenderers[i - 1]) { this._priceFillRenderers.push(new RectangleRenderer()); }
				this._priceFillRenderers[i - 1].setData({
					extend: { left: false, right: false },
					background: { color: applyAlpha(level.color, level.opacity) },
					points: [new AnchorPoint(minX, prevY, 0), new AnchorPoint(maxX, y, 0)],
				});
				compositeRenderer.append(this._priceFillRenderers[i - 1]);
			}
		});

		const minY = Math.min(p0.y, p1.y);
		const maxY = Math.max(p0.y, p1.y);

		// Vertical (time) levels: coeff 0 at point 0, coeff 1 at point 1.
		timeLevels.forEach((level: FibRetracementLevel, i: number) => {
			const x = p0.x + level.coeff * (p1.x - p0.x);

			if (!this._timeLineRenderers[i]) {
				this._timeLineRenderers.push(new SegmentRenderer());
				this._timeLabelRenderers.push(new TextRenderer());
			}

			this._timeLineRenderers[i].setData({
				line: { ...options.line, color: level.color, extend: { left: false, right: false } },
				points: [new AnchorPoint(x, minY, 0), new AnchorPoint(x, maxY, 0)],
			});
			compositeRenderer.append(this._timeLineRenderers[i]);

			if (options.showLabels) {
				this._timeLabelRenderers[i].setData({
					text: {
						alignment: TextAlignment.Center,
						value: `${level.coeff}`,
						font: { color: level.color, size: 11, family: defaultFontFamily },
						box: {
							alignment: { horizontal: BoxHorizontalAlignment.Center, vertical: BoxVerticalAlignment.Bottom },
							offset: { x: 0, y: 6 },
						},
					},
					points: [new AnchorPoint(x, maxY, 0)],
				});
				compositeRenderer.append(this._timeLabelRenderers[i]);
			}

			if (i > 0 && level.opacity > 0) {
				const prevX = p0.x + timeLevels[i - 1].coeff * (p1.x - p0.x);
				if (!this._timeFillRenderers[i - 1]) { this._timeFillRenderers.push(new RectangleRenderer()); }
				this._timeFillRenderers[i - 1].setData({
					extend: { left: false, right: false },
					background: { color: applyAlpha(level.color, level.opacity) },
					points: [new AnchorPoint(prevX, minY, 0), new AnchorPoint(x, maxY, 0)],
				});
				compositeRenderer.append(this._timeFillRenderers[i - 1]);
			}
		});

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
