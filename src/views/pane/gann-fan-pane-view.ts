import { applyAlpha } from '../../helpers/color';
import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, FibRetracementLevel, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { PolygonRenderer } from '../../renderers/polygon-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

function ratioLabel(coeff: number): string {
	return coeff >= 1 ? `${Math.round(coeff)}/1` : `1/${Math.round(1 / coeff)}`;
}

export class GannFanPaneView extends LineToolPaneView {
	protected _lineRenderers: SegmentRenderer[] = [];
	protected _labelRenderers: TextRenderer[] = [];
	protected _fillRenderers: PolygonRenderer[] = [];

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'GannFan'>;

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
		const dx = p1.x - p0.x;
		const dy = p1.y - p0.y;

		if (dx === 0) {
			this.addAnchors(compositeRenderer);
			this._renderer = compositeRenderer;
			return;
		}

		const pane = this._model.paneForSource(this._source);
		const paneSpan = (pane?.width() ?? 1000) + (pane?.height() ?? 500);
		const far = paneSpan / Math.max(1, Math.abs(dx)) + 1;

		const visibleLevels = options.levels.filter((level: FibRetracementLevel) => level.visible !== false);
		const endpointFor = (coeff: number): AnchorPoint => new AnchorPoint(p0.x + dx, p0.y + dy * coeff, 0);

		visibleLevels.forEach((level: FibRetracementLevel, i: number) => {
			const end = endpointFor(level.coeff);

			if (!this._lineRenderers[i]) {
				this._lineRenderers.push(new SegmentRenderer());
				this._labelRenderers.push(new TextRenderer());
			}

			this._lineRenderers[i].setData({
				line: { ...options.line, color: level.color, extend: { left: false, right: true } },
				points: [p0, end],
			});
			compositeRenderer.append(this._lineRenderers[i]);

			if (options.showLabels) {
				this._labelRenderers[i].setData({
					text: {
						alignment: TextAlignment.Center,
						value: ratioLabel(level.coeff),
						font: { color: level.color, size: 11, family: defaultFontFamily },
						box: { alignment: { horizontal: BoxHorizontalAlignment.Center, vertical: BoxVerticalAlignment.Middle } },
					},
					points: [end],
				});
				compositeRenderer.append(this._labelRenderers[i]);
			}

			if (i > 0 && level.opacity > 0) {
				const prevEnd = endpointFor(visibleLevels[i - 1].coeff);
				const farPrev = new AnchorPoint(p0.x + (prevEnd.x - p0.x) * far, p0.y + (prevEnd.y - p0.y) * far, 0);
				const farCurrent = new AnchorPoint(p0.x + (end.x - p0.x) * far, p0.y + (end.y - p0.y) * far, 0);

				if (!this._fillRenderers[i - 1]) { this._fillRenderers.push(new PolygonRenderer()); }
				this._fillRenderers[i - 1].setData({
					points: [p0, farPrev, farCurrent],
					background: { color: applyAlpha(level.color, level.opacity) },
					line: { color: applyAlpha(level.color, 0), width: 1, style: LineStyle.Solid },
				});
				compositeRenderer.append(this._fillRenderers[i - 1]);
			}
		});

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
