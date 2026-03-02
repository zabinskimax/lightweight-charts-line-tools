import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { LineToolType, VolumeProfileBar } from '../../model/line-tool-options';
import { PaneCursorType } from '../../model/pane';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { FixedRangeVolumeProfileRenderer, RenderedVolumeBar } from '../../renderers/fixed-range-volume-profile-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

function computeValueArea(bars: VolumeProfileBar[], targetFraction: number): [number, number] {
	if (bars.length === 0) { return [0, 0]; }
	const totalVolume = bars.reduce((s, b) => s + b.volume, 0);
	const target = totalVolume * targetFraction;

	const pocIndex = bars.reduce((mi, b, i) => b.volume > bars[mi].volume ? i : mi, 0);
	let vaHigh = pocIndex;
	let vaLow = pocIndex;
	let accumulated = bars[pocIndex].volume;

	while (accumulated < target) {
		const addAbove = vaHigh > 0 ? bars[vaHigh - 1].volume : 0;
		const addBelow = vaLow < bars.length - 1 ? bars[vaLow + 1].volume : 0;
		if (addAbove === 0 && addBelow === 0) { break; }
		if (addAbove >= addBelow) {
			vaHigh--;
			accumulated += bars[vaHigh].volume;
		} else {
			vaLow++;
			accumulated += bars[vaLow].volume;
		}
	}

	return [vaHigh, vaLow];
}

export class FixedRangeVolumeProfilePaneView extends LineToolPaneView {
	private _profileRenderer: FixedRangeVolumeProfileRenderer = new FixedRangeVolumeProfileRenderer();

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		this._renderer = null;
		this._invalidated = false;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();
		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }

		super._updateImpl();
		if (this._points.length < 2) { return; }

		const options = this._source.options() as LineToolOptionsInternal<'FixedRangeVolumeProfile'>;
		const vp = options.volumeProfile;

		const [pt0, pt1] = this._points;
		const y0 = Math.min(pt0.y, pt1.y);
		const y1 = Math.max(pt0.y, pt1.y);
		const totalHeight = y1 - y0;

		// Sort bars high-to-low price (top of chart = highest price)
		const sortedBars = [...vp.bars].sort((a, b) => b.price - a.price);

		const compositeRenderer = new CompositeRenderer();

		let renderedBars: RenderedVolumeBar[] = [];

		if (sortedBars.length > 0) {
			const maxVolume = sortedBars.reduce((m, b) => Math.max(m, b.volume), 0);
			const pocIndex = sortedBars.reduce((mi, b, i) => b.volume > sortedBars[mi].volume ? i : mi, 0);
			const [vaHigh, vaLow] = computeValueArea(sortedBars, vp.valueAreaVolume);
			const barH = totalHeight / sortedBars.length;

			renderedBars = sortedBars.map((bar, i): RenderedVolumeBar => ({
				y: (y0 + i * barH) as Coordinate,
				h: barH,
				widthRatio: maxVolume > 0 ? bar.volume / maxVolume : 0,
				isPOC: i === pocIndex,
				isInValueArea: vp.showValueArea && i >= vaHigh && i <= vaLow,
			}));
		}

		this._profileRenderer.setData({
			points: [pt0, pt1],
			bars: renderedBars,
			barColor: vp.barColor,
			valueAreaColor: vp.valueAreaColor,
			pocColor: vp.pocColor,
			showPOC: vp.showPOC,
			showValueArea: vp.showValueArea,
			borderColor: vp.borderColor,
			borderWidth: vp.borderWidth,
		});

		compositeRenderer.append(this._profileRenderer);
		this._addAnchors(pt0, pt1, compositeRenderer);
		this._renderer = compositeRenderer;
	}

	protected _addAnchors(topLeft: AnchorPoint, bottomRight: AnchorPoint, renderer: CompositeRenderer): void {
		const bottomLeft = new AnchorPoint(topLeft.x, bottomRight.y, 2);
		const topRight = new AnchorPoint(bottomRight.x, topLeft.y, 3);
		const middleLeft = new AnchorPoint(topLeft.x, 0.5 * (topLeft.y + bottomRight.y), 4, true);
		const middleRight = new AnchorPoint(bottomRight.x, 0.5 * (topLeft.y + bottomRight.y), 5, true);
		const topCenter = new AnchorPoint(0.5 * (topLeft.x + bottomRight.x), topLeft.y, 6, true);
		const bottomCenter = new AnchorPoint(0.5 * (topLeft.x + bottomRight.x), bottomRight.y, 7, true);

		const xDiff = topLeft.x - bottomRight.x;
		const yDiff = topLeft.y - bottomRight.y;
		const sign = Math.sign(xDiff * yDiff);

		const pointsCursorType = [
			sign < 0 ? PaneCursorType.DiagonalNeSwResize : PaneCursorType.DiagonalNwSeResize,
			sign < 0 ? PaneCursorType.DiagonalNeSwResize : PaneCursorType.DiagonalNwSeResize,
			sign > 0 ? PaneCursorType.DiagonalNeSwResize : PaneCursorType.DiagonalNwSeResize,
			sign > 0 ? PaneCursorType.DiagonalNeSwResize : PaneCursorType.DiagonalNwSeResize,
			PaneCursorType.HorizontalResize,
			PaneCursorType.HorizontalResize,
			PaneCursorType.VerticalResize,
			PaneCursorType.VerticalResize,
		];

		renderer.append(this.createLineAnchor({
			points: [topLeft, bottomRight, bottomLeft, topRight, middleLeft, middleRight, topCenter, bottomCenter],
			pointsCursorType,
		}, 0));
	}
}
