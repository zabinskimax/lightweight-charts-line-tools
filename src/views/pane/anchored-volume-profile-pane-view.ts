import { Coordinate } from '../../model/coordinate';
import { LineToolOptionsInternal } from '../../model/line-tool';
import { PriceScale } from '../../model/price-scale';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';

import { FixedRangeVolumeProfilePaneView, volumeProfileRendererData } from './fixed-range-volume-profile-pane-view';

/**
 * TradingView-style anchored profile. Like the visible-range profile, the box
 * is the whole pane and the histogram hangs from a chart border, so it stays in
 * view wherever the chart is scrolled. The POC and VAH / VAL lines start at the
 * anchor bar, which a dashed line marks across the profile's price range; the
 * anchor's handle sits in the middle of that line.
 */
export class AnchoredVolumeProfilePaneView extends FixedRangeVolumeProfilePaneView {
	private _anchorLineRenderer: SegmentRenderer = new SegmentRenderer();

	protected override _toolRenderer(priceScale: PriceScale, height: number, width: number): IPaneRenderer | null {
		if (this._points.length < 1 || width <= 0) { return null; }

		const options = this._source.options() as LineToolOptionsInternal<'AnchoredVolumeProfile'>;
		const vp = options.volumeProfile;
		const anchor = this._points[0];
		const compositeRenderer = new CompositeRenderer();

		const firstValue = this._source.ownerSource()?.firstValue();
		const data = !this._source.creating() && firstValue
			? volumeProfileRendererData(vp, priceScale, firstValue.value, 0, width)
			: null;

		const top = data !== null ? data.points[0].y : 0;
		const bottom = data !== null ? data.points[1].y : height;

		if (anchor.x >= 0 && anchor.x <= width) {
			this._anchorLineRenderer.setData({
				line: { color: vp.borderColor, width: 1, style: LineStyle.Dashed },
				points: [new AnchorPoint(anchor.x, top, 0), new AnchorPoint(anchor.x, bottom, 1)],
			});
			compositeRenderer.append(this._anchorLineRenderer);
		}

		if (data !== null) {
			data.linesStartX = Math.max(0, Math.min(anchor.x, width));
			// A fill would cover the whole pane, and only the histogram takes clicks.
			data.backgroundColor = undefined;
			data.hitTestBarsOnly = true;
			this._profileRenderer.setData(data);
			compositeRenderer.append(this._profileRenderer);
		}

		anchor.y = ((top + bottom) / 2) as Coordinate;
		anchor.square = true;
		this.addAnchors(compositeRenderer);
		return compositeRenderer;
	}
}
