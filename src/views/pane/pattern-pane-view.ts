import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { PolygonRenderer } from '../../renderers/polygon-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

/**
 * Shared pane view for multi-point pattern tools: a polyline through all
 * placed points, one label per vertex, and (for harmonic XABCD patterns)
 * translucent triangle fills between the legs.
 */
export class PatternPaneView extends LineToolPaneView {
	protected _polylineRenderer: PolygonRenderer = new PolygonRenderer();
	protected _fillRenderers: PolygonRenderer[] = [];
	protected _labelRenderers: TextRenderer[] = [];
	protected readonly _labels: string[];
	protected readonly _fillShapes: boolean;

	public constructor(source: LineTool<LineToolType>, model: ChartModel, labels: string[], fillShapes: boolean) {
		super(source, model);
		this._labels = labels;
		this._fillShapes = fillShapes;
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'XABCDPattern'>;

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

		// Triangle fills first so lines and labels draw on top of them.
		if (this._fillShapes) {
			const triangles: AnchorPoint[][] = [];
			if (this._points.length >= 3) { triangles.push(this._points.slice(0, 3)); }
			if (this._points.length >= 5) { triangles.push(this._points.slice(2, 5)); }

			triangles.forEach((triangle: AnchorPoint[], i: number) => {
				if (!this._fillRenderers[i]) { this._fillRenderers.push(new PolygonRenderer()); }
				this._fillRenderers[i].setData({
					points: triangle,
					background: { color: options.background.color },
					line: { color: 'rgba(0, 0, 0, 0)', width: 1, style: options.line.style },
				});
				compositeRenderer.append(this._fillRenderers[i]);
			});
		}

		if (this._points.length >= 2) {
			this._polylineRenderer.setData({ line: { ...options.line }, points: this._points });
			compositeRenderer.append(this._polylineRenderer);
		}

		if (options.showLabels) {
			this._points.forEach((point: AnchorPoint, i: number) => {
				if (i >= this._labels.length) { return; }

				// Label above local peaks, below local troughs (screen y grows
				// downward). Endpoints compare against their only neighbour.
				const prev = this._points[i - 1] ?? this._points[i + 1] ?? point;
				const next = this._points[i + 1] ?? this._points[i - 1] ?? point;
				const isPeak = point.y <= Math.min(prev.y, next.y);

				if (!this._labelRenderers[i]) { this._labelRenderers.push(new TextRenderer()); }
				this._labelRenderers[i].setData({
					text: {
						alignment: TextAlignment.Center,
						value: this._labels[i],
						font: { color: options.line.color, size: 13, family: defaultFontFamily, bold: true },
						box: {
							alignment: {
								horizontal: BoxHorizontalAlignment.Center,
								vertical: isPeak ? BoxVerticalAlignment.Top : BoxVerticalAlignment.Bottom,
							},
							offset: { x: 0, y: 8 },
						},
					},
					points: [point],
				});
				compositeRenderer.append(this._labelRenderers[i]);
			});
		}

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
