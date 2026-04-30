import { Coordinate } from '../../model/coordinate';
import { LineToolOptionsInternal } from '../../model/line-tool';
import { VolumeProfileBar } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { RenderedVolumeBar } from '../../renderers/fixed-range-volume-profile-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';

import { computeValueArea, FixedRangeVolumeProfilePaneView } from './fixed-range-volume-profile-pane-view';
import { BarPriceExtent, resolveBarPriceExtents } from './volume-profile-bar-extents';

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

		const sortedBars = [...vp.bars].sort((a: VolumeProfileBar, b: VolumeProfileBar) => b.price - a.price);
		const isTwoTone = sortedBars.some((b: VolumeProfileBar) => b.buyVolume !== undefined && b.sellVolume !== undefined);
		const maxVolume = sortedBars.reduce((m: number, b: VolumeProfileBar) => Math.max(m, b.volume), 0);
		const pocIndex = sortedBars.reduce((mi: number, b: VolumeProfileBar, i: number) => b.volume > sortedBars[mi].volume ? i : mi, 0);
		const [vaHigh, vaLow] = computeValueArea(sortedBars, vp.valueAreaVolume);

		const extents = resolveBarPriceExtents(sortedBars);

		const renderedBars = sortedBars.map((bar: VolumeProfileBar, i: number): RenderedVolumeBar => {
			const { top, bottom } = extents[i];
			const topY = priceScale.priceToCoordinate(top, firstValue.value);
			const bottomY = priceScale.priceToCoordinate(bottom, firstValue.value);

			const rendered: RenderedVolumeBar = {
				y: Math.min(topY, bottomY) as Coordinate,
				h: Math.abs(bottomY - topY),
				widthRatio: maxVolume > 0 ? bar.volume / maxVolume : 0,
				isPOC: i === pocIndex,
				isInValueArea: vp.showValueArea && i >= vaHigh && i <= vaLow,
			};

			if (isTwoTone && maxVolume > 0) {
				rendered.buyRatio = (bar.buyVolume ?? 0) / maxVolume;
				rendered.sellRatio = (bar.sellVolume ?? 0) / maxVolume;
			}

			return rendered;
		});

		// Anchor box must cover the actual rendered extents — driving it from
		// `vp.bars.map(b => b.price) ± binSizePrice/2` would clip bars whose
		// explicit `priceHigh` exceeds that uniform derivation.
		const topExtreme = Math.max(...extents.map((e: BarPriceExtent) => e.top));
		const bottomExtreme = Math.min(...extents.map((e: BarPriceExtent) => e.bottom));
		const topYExtreme = priceScale.priceToCoordinate(topExtreme, firstValue.value);
		const bottomYExtreme = priceScale.priceToCoordinate(bottomExtreme, firstValue.value);

		const topLeft = new AnchorPoint(x0 as Coordinate, Math.min(topYExtreme, bottomYExtreme) as Coordinate, 0);
		const bottomRight = new AnchorPoint(x1 as Coordinate, Math.max(topYExtreme, bottomYExtreme) as Coordinate, 1);

		this._profileRenderer.setData({
			points: [topLeft, bottomRight],
			bars: renderedBars,
			barColor: vp.barColor,
			valueAreaColor: vp.valueAreaColor,
			buyColor: vp.buyColor,
			sellColor: vp.sellColor,
			isTwoTone,
			pocColor: vp.pocColor,
			showPOC: vp.showPOC,
			showValueArea: vp.showValueArea,
			borderColor: vp.borderColor,
			borderWidth: vp.borderWidth,
			backgroundColor: vp.backgroundColor,
			pocExpansion: vp.pocExpansion,
			barWidthRatio: vp.barWidthRatio,
			barAnchorSide: vp.barAnchorSide,
		});

		const compositeRenderer = new CompositeRenderer();
		compositeRenderer.append(this._profileRenderer);
		this._renderer = compositeRenderer;
	}
}
