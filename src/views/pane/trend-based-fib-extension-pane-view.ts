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

export class TrendBasedFibExtensionPaneView extends LineToolPaneView {
	protected _rectangleRenderers: RectangleRenderer[] = [];
	protected _labelRenderers: TextRenderer[] = [];
	protected _lineRenderers: SegmentRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	// eslint-disable-next-line complexity
	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'TrendBasedFibExtension'>;

		if (!options.visible) {
			return;
		}

		this._renderer = null;
		this._invalidated = false;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();

		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }
		const visibleTimestampRange = timeScale.timestampRangeFromVisibleLogicalRange();
		if (visibleTimestampRange === null) { return; }
		const points = this._source.points();
		if (points.length < 2) { return; }

		const isOffScreenRightHorizontal = Math.min(points[0].timestamp, points[1].timestamp, points.length > 2 ? points[2].timestamp : points[1].timestamp) > Number(visibleTimestampRange.to);
		const isOffScreenLeftHorizontal = Math.max(points[0].timestamp, points[1].timestamp, points.length > 2 ? points[2].timestamp : points[1].timestamp) < Number(visibleTimestampRange.from);
		const isOffScreenHorizontal = isOffScreenRightHorizontal || isOffScreenLeftHorizontal;

		if (!isOffScreenHorizontal || options.extend.left || options.extend.right) {
			super._updateImpl();

			if (this._points.length < 2) { return; }
			const compositeRenderer = new CompositeRenderer();

			// Main trend line (P1 to P2)
			const trendLineRenderer = new SegmentRenderer();
			trendLineRenderer.setData({
				line: { ...options.line, color: '#787b86', style: 2, extend: { left: false, right: false } },
				points: [this._points[0], this._points[1]],
			});
			compositeRenderer.append(trendLineRenderer);

			const p1 = points[0].price;
			const p2 = points[1].price;
			const p3 = points.length > 2 ? points[2].price : p2;
			const diff = p2 - p1;

			if (this._points.length > 2) {
				// Retracement line (P2 to P3)
				const retracementLineRenderer = new SegmentRenderer();
				retracementLineRenderer.setData({
					line: { ...options.line, color: '#787b86', style: 2, extend: { left: false, right: false } },
					points: [this._points[1], this._points[2]],
				});
				compositeRenderer.append(retracementLineRenderer);
			}

			const minX = Math.min(this._points[0].x, this._points[1].x, this._points.length > 2 ? this._points[2].x : this._points[1].x);
			const maxX = Math.max(this._points[0].x, this._points[1].x, this._points.length > 2 ? this._points[2].x : this._points[1].x);

			const levelCoordinates = options.levels.map((level: FibRetracementLevel) => {
				const price = p3 + level.coeff * diff;
				const baseValue = this._source.ownerSource()?.firstValue()?.value || 0;
				const coordinate = priceScale.priceToCoordinate(price, baseValue);
				return { coordinate, price: priceScale.formatPrice(price, baseValue), coeff: level.coeff, color: level.color, opacity: level.opacity };
			});

			let distanceTextToDisplay = '';

			const findIndexByKeyValue = (levels: FibRetracementLevel[], keyToFind: keyof FibRetracementLevel, valueToFind: number): number => {
				for (let k = 0; k < levels.length; k++) {
					if (levels[k][keyToFind] === valueToFind) {
						return k;
					}
				}
				return -1;
			};

			for (let i = 0, j = -1; i < levelCoordinates.length; i++, j++) {
				if (options.levels[i].distanceFromCoeffEnabled) {
					const compareToIndex = findIndexByKeyValue(options.levels, 'coeff', options.levels[i].distanceFromCoeff);

					if (compareToIndex >= 0) {
						const compareToPrice = Number(levelCoordinates[compareToIndex].price);
						const currentPrice = Number(levelCoordinates[i].price);
						const priceDiference = Math.round(Math.abs(currentPrice - compareToPrice) * 100000) / 100000;

						if (priceDiference > 0) {
							distanceTextToDisplay = '>>>>' + priceDiference + ' from ' + options.levels[compareToIndex].coeff + ' line';
						}
					}
				}
				if (!this._lineRenderers[i]) {
					this._lineRenderers.push(new SegmentRenderer());
					this._labelRenderers.push(new TextRenderer());
				}

				const linePoints = [
					new AnchorPoint(minX, levelCoordinates[i].coordinate, 0),
					new AnchorPoint(maxX, levelCoordinates[i].coordinate, 0),
				];

				this._lineRenderers[i].setData({
					line: { ...options.line, extend: options.extend, color: levelCoordinates[i].color },
					points: linePoints,
				});
				this._labelRenderers[i].setData({
					text: {
						alignment: TextAlignment.Right,
						value: `${levelCoordinates[i].coeff}(${levelCoordinates[i].price}) ${distanceTextToDisplay}`,
						font: { color: levelCoordinates[i].color, size: 11, family: defaultFontFamily },
						box: { alignment: { horizontal: BoxHorizontalAlignment.Right, vertical: BoxVerticalAlignment.Middle } },
					},
					points: linePoints,
				});

				distanceTextToDisplay = '';

				compositeRenderer.append(this._labelRenderers[i]);
				compositeRenderer.append(this._lineRenderers[i]);

				if (j < 0) { continue; }

				if (!this._rectangleRenderers[j]) { this._rectangleRenderers.push(new RectangleRenderer()); }
				this._rectangleRenderers[j].setData({
					...options.line,
					extend: options.extend,
					background: { color: applyAlpha(levelCoordinates[i].color, levelCoordinates[i].opacity) },
					points: [new AnchorPoint(minX, levelCoordinates[i - 1].coordinate, 0), new AnchorPoint(maxX, levelCoordinates[i].coordinate, 0)],
				});
				compositeRenderer.append(this._rectangleRenderers[j]);
			}

			this.addAnchors(compositeRenderer);
			this._renderer = compositeRenderer;
		}
	}
}
