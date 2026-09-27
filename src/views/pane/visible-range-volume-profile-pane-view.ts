import { LineToolOptionsInternal } from '../../model/line-tool';
import { CompositeRenderer } from '../../renderers/composite-renderer';

import { FixedRangeVolumeProfilePaneView, volumeProfileRendererData } from './fixed-range-volume-profile-pane-view';

export class VisibleRangeVolumeProfilePaneView extends FixedRangeVolumeProfilePaneView {
	protected override _updateImpl(): void {
		this._renderer = null;
		this._invalidated = false;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();
		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }

		const options = this._source.options() as LineToolOptionsInternal<'VisibleRangeVolumeProfile'>;
		const vp = options.volumeProfile;

		if (vp.bars.length === 0) { return; }

		const ownerSource = this._source.ownerSource();
		const firstValue = ownerSource?.firstValue();
		if (!firstValue) { return; }

		// X-extent: span the visible chart pixel range. The renderer right-anchors
		// histogram bars by default for this tool (see VisibleRangeVolumeProfileOptionDefaults),
		// so the bars stay flush against the right edge as the visible range scrolls.
		const x0 = 0;
		const x1 = timeScale.width();
		if (x1 <= x0) { return; }

		const data = volumeProfileRendererData(vp, priceScale, firstValue.value, x0, x1);
		if (data === null) { return; }
		this._profileRenderer.setData(data);

		const compositeRenderer = new CompositeRenderer();
		compositeRenderer.append(this._profileRenderer);
		this._renderer = compositeRenderer;
	}
}
