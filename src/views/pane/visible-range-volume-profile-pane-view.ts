import { Coordinate } from '../../model/coordinate';
import { LineToolOptionsInternal } from '../../model/line-tool';
import { VolumeProfileBar } from '../../model/line-tool-options';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { RenderedVolumeBar } from '../../renderers/fixed-range-volume-profile-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';

import { computeValueArea, FixedRangeVolumeProfilePaneView } from './fixed-range-volume-profile-pane-view';

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

		const binSizePrice = sortedBars.length > 1
			? Math.abs(sortedBars[0].price - sortedBars[1].price)
			: sortedBars[0].price * 0.001;

		const renderedBars = sortedBars.map((bar: VolumeProfileBar, i: number): RenderedVolumeBar => {
			const barTopPrice = bar.price + binSizePrice / 2;
			const barBottomPrice = bar.price - binSizePrice / 2;
			const topY = priceScale.priceToCoordinate(barTopPrice, firstValue.value);
			const bottomY = priceScale.priceToCoordinate(barBottomPrice, firstValue.value);

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

		const topExtreme = Math.max(...vp.bars.map((b: VolumeProfileBar) => b.price)) + binSizePrice / 2;
		const bottomExtreme = Math.min(...vp.bars.map((b: VolumeProfileBar) => b.price)) - binSizePrice / 2;
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
