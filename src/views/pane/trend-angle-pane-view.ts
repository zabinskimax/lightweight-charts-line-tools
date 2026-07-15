import { defaultFontFamily } from '../../helpers/make-font';

import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType, TextAlignment } from '../../model/line-tool-options';
import { ArcRenderer } from '../../renderers/arc-renderer';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

const ARC_RADIUS = 38;
const REFERENCE_LENGTH = 55;

export class TrendAnglePaneView extends LineToolPaneView {
	protected _lineRenderer: SegmentRenderer = new SegmentRenderer();
	protected _referenceRenderer: SegmentRenderer = new SegmentRenderer();
	protected _arcRenderer: ArcRenderer = new ArcRenderer();
	protected _labelRenderer: TextRenderer = new TextRenderer();

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'TrendAngle'>;

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

		this._lineRenderer.setData({ line: options.line, points: this._points });
		compositeRenderer.append(this._lineRenderer);

		const dx = point1.x - point0.x;
		const dy = point1.y - point0.y;

		if (dx !== 0 || dy !== 0) {
			// Horizontal reference in the drag direction (left or right of point 0).
			const referenceSign = dx >= 0 ? 1 : -1;
			const referenceEnd = new AnchorPoint(point0.x + referenceSign * REFERENCE_LENGTH, point0.y, 0);
			this._referenceRenderer.setData({
				line: {
					...options.line,
					color: '#787b86',
					style: LineStyle.Dashed,
					extend: { left: false, right: false },
				},
				points: [point0, referenceEnd],
			});
			compositeRenderer.append(this._referenceRenderer);

			// Canvas-space angles: reference direction → line direction, wrapped to
			// the short way around so the arc never sweeps the far side.
			const baseAngle = referenceSign >= 0 ? 0 : Math.PI;
			const lineAngle = Math.atan2(dy, dx);
			let sweep = lineAngle - baseAngle;
			while (sweep > Math.PI) { sweep -= 2 * Math.PI; }
			while (sweep < -Math.PI) { sweep += 2 * Math.PI; }

			this._arcRenderer.setData({
				points: [point0],
				radius: ARC_RADIUS,
				startAngle: Math.min(baseAngle, baseAngle + sweep),
				endAngle: Math.max(baseAngle, baseAngle + sweep),
				border: { color: '#787b86', width: 1, style: LineStyle.Solid },
			});
			compositeRenderer.append(this._arcRenderer);

			// Displayed angle: measured from the horizontal, positive when price
			// rises left-to-right (screen y grows downward, hence the negation).
			const degrees = Math.round(Math.atan2(-dy, dx) * 180 / Math.PI);
			const midAngle = baseAngle + sweep / 2;
			const labelPivot = new AnchorPoint(
				point0.x + Math.cos(midAngle) * (ARC_RADIUS + 16),
				point0.y + Math.sin(midAngle) * (ARC_RADIUS + 16),
				0
			);

			this._labelRenderer.setData({
				text: {
					alignment: TextAlignment.Center,
					value: `${degrees}°`,
					font: { color: options.line.color, size: 13, family: defaultFontFamily, bold: true },
					box: { alignment: { horizontal: BoxHorizontalAlignment.Center, vertical: BoxVerticalAlignment.Middle } },
				},
				points: [labelPivot],
			});
			compositeRenderer.append(this._labelRenderer);
		}

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}
}
