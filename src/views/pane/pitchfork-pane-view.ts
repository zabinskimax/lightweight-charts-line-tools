import { applyAlpha } from '../../helpers/color';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { FibRetracementLevel, LineToolType } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { PolygonRenderer } from '../../renderers/polygon-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class PitchforkPaneView extends LineToolPaneView {
	protected _medianRenderer: SegmentRenderer = new SegmentRenderer();
	protected _handleRenderer: SegmentRenderer = new SegmentRenderer();
	protected _levelRenderers: SegmentRenderer[] = [];
	protected _fillRenderers: PolygonRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	// eslint-disable-next-line complexity
	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'Pitchfork'>;

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

		// Two placed points only: dashed preview of the p1→p2 leg.
		if (this._points.length < 3) {
			this._handleRenderer.setData({
				line: { ...options.line, color: '#787b86', style: LineStyle.Dashed, extend: { left: false, right: false } },
				points: [p1, p2],
			});
			compositeRenderer.append(this._handleRenderer);
			this.addAnchors(compositeRenderer);
			this._renderer = compositeRenderer;
			return;
		}

		const p3 = this._points[2];

		// Variant start point for the median line.
		let start = p1;
		if (options.variant === 'schiff') {
			start = new AnchorPoint(p1.x, (p1.y + p2.y) / 2, 0);
		} else if (options.variant === 'modifiedSchiff') {
			start = new AnchorPoint((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 0);
		}

		const mid = new AnchorPoint((p2.x + p3.x) / 2, (p2.y + p3.y) / 2, 0);
		const dirX = mid.x - start.x;
		const dirY = mid.y - start.y;
		// Half-vector from the midpoint of the handle towards p3.
		const halfX = (p3.x - p2.x) / 2;
		const halfY = (p3.y - p2.y) / 2;

		// Handle between p2 and p3.
		this._handleRenderer.setData({
			line: { ...options.line, color: options.median.color, extend: { left: false, right: false } },
			points: [p2, p3],
		});
		compositeRenderer.append(this._handleRenderer);

		// Median line from the variant start through the handle midpoint.
		this._medianRenderer.setData({
			line: {
				...options.line,
				color: options.median.color,
				width: options.median.width,
				style: options.median.style,
				extend: { left: options.extend.left, right: options.extend.right },
			},
			points: [start, mid],
		});
		compositeRenderer.append(this._medianRenderer);

		// Far-extension factor pushing fill polygons past the pane edge.
		const pane = this._model.paneForSource(this._source);
		const paneSpan = (pane?.width() ?? 1000) + (pane?.height() ?? 500);
		const dirLength = Math.max(1, Math.sqrt(dirX * dirX + dirY * dirY));
		const far = paneSpan / dirLength + 1;

		const visibleLevels = options.levels.filter((level: FibRetracementLevel) => level.visible !== false);
		let rendererIndex = 0;
		let fillIndex = 0;

		visibleLevels.forEach((level: FibRetracementLevel, i: number) => {
			for (const sign of [1, -1]) {
				const originX = mid.x + sign * level.coeff * halfX;
				const originY = mid.y + sign * level.coeff * halfY;

				if (!this._levelRenderers[rendererIndex]) { this._levelRenderers.push(new SegmentRenderer()); }
				this._levelRenderers[rendererIndex].setData({
					line: {
						...options.line,
						color: level.color,
						extend: { left: options.extend.left, right: options.extend.right },
					},
					points: [new AnchorPoint(originX, originY, 0), new AnchorPoint(originX + dirX, originY + dirY, 0)],
				});
				compositeRenderer.append(this._levelRenderers[rendererIndex]);
				rendererIndex++;
			}

			if (level.opacity <= 0) { return; }

			// Fill: interior band for the innermost level, side bands between
			// this level and the previous one otherwise.
			const bands: number[][] = i === 0
				? [[-level.coeff, level.coeff]]
				: [[visibleLevels[i - 1].coeff, level.coeff], [-visibleLevels[i - 1].coeff, -level.coeff]];

			for (const [fromCoeff, toCoeff] of bands) {
				const nearFrom = new AnchorPoint(mid.x + fromCoeff * halfX, mid.y + fromCoeff * halfY, 0);
				const nearTo = new AnchorPoint(mid.x + toCoeff * halfX, mid.y + toCoeff * halfY, 0);
				const farFrom = new AnchorPoint(nearFrom.x + dirX * far, nearFrom.y + dirY * far, 0);
				const farTo = new AnchorPoint(nearTo.x + dirX * far, nearTo.y + dirY * far, 0);

				if (!this._fillRenderers[fillIndex]) { this._fillRenderers.push(new PolygonRenderer()); }
				this._fillRenderers[fillIndex].setData({
					points: [nearFrom, farFrom, farTo, nearTo],
					background: { color: applyAlpha(level.color, level.opacity) },
					line: { color: applyAlpha(level.color, 0), width: 1, style: LineStyle.Solid },
				});
				compositeRenderer.append(this._fillRenderers[fillIndex]);
				fillIndex++;
			}
		});

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
