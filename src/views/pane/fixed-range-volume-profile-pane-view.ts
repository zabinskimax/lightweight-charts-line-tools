import { TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { HitTestType } from '../../model/hit-test-result';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { FixedRangeVolumeProfileOptions, LineToolType, VolumeProfileBar } from '../../model/line-tool-options';
import { Point } from '../../model/point';
import { PriceScale } from '../../model/price-scale';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import {
	FixedRangeVolumeProfileRenderer,
	FixedRangeVolumeProfileRendererData,
	RenderedVolumeBar,
} from '../../renderers/fixed-range-volume-profile-renderer';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';

import { LineToolPaneView } from './line-tool-pane-view';
import { BarPriceExtent, resolveBarPriceExtents } from './volume-profile-bar-extents';

/**
 * Value area rows of a profile sorted high-to-low price, as `[high, low]` indices
 * (the value area's highest and lowest row). TradingView's rule: start with the
 * POC, then keep taking the larger of the next row above and the next row below;
 * a tie goes to the row closer to the POC, then to the row above. Stop before a
 * row would take the value area past `targetFraction` of the total volume.
 */
export function computeValueArea(bars: VolumeProfileBar[], targetFraction: number): [number, number] {
	if (bars.length === 0) { return [0, 0]; }
	const totalVolume = bars.reduce((s: number, b: VolumeProfileBar) => s + b.volume, 0);
	const pocIndex = bars.reduce((mi: number, b: VolumeProfileBar, i: number) => b.volume > bars[mi].volume ? i : mi, 0);
	let remaining = totalVolume * targetFraction - bars[pocIndex].volume;
	let vaHigh = pocIndex;
	let vaLow = pocIndex;

	for (;;) {
		const hasAbove = vaHigh > 0;
		const hasBelow = vaLow < bars.length - 1;
		if (!hasAbove && !hasBelow) { break; }
		const above = hasAbove ? bars[vaHigh - 1].volume : 0;
		const below = hasBelow ? bars[vaLow + 1].volume : 0;
		let takeAbove: boolean;
		if (!hasBelow || !hasAbove) {
			takeAbove = hasAbove;
		} else if (above !== below) {
			takeAbove = above > below;
		} else {
			takeAbove = pocIndex - (vaHigh - 1) <= (vaLow + 1) - pocIndex;
		}
		const volume = takeAbove ? above : below;
		if (volume > remaining) { break; }
		remaining -= volume;
		if (takeAbove) {
			vaHigh--;
		} else {
			vaLow++;
		}
	}

	return [vaHigh, vaLow];
}

/**
 * Renderer data for a profile drawn in the box from `x0` to `x1`, or null when
 * the profile has no bars. Shared by the fixed-range, visible-range and anchored
 * volume profiles; they differ only in where the box sits.
 */
export function volumeProfileRendererData(
	vp: FixedRangeVolumeProfileOptions,
	priceScale: PriceScale,
	baseValue: number,
	x0: number,
	x1: number
): FixedRangeVolumeProfileRendererData | null {
	// Sort bars high-to-low price (top of chart = highest price)
	const sortedBars = [...vp.bars].sort((a: VolumeProfileBar, b: VolumeProfileBar) => b.price - a.price);
	if (sortedBars.length === 0) { return null; }

	const isTwoTone = sortedBars.some((b: VolumeProfileBar) => b.buyVolume !== undefined && b.sellVolume !== undefined);
	const maxVolume = sortedBars.reduce((m: number, b: VolumeProfileBar) => Math.max(m, b.volume), 0);
	const pocIndex = sortedBars.reduce((mi: number, b: VolumeProfileBar, i: number) => b.volume > sortedBars[mi].volume ? i : mi, 0);
	const [vaHigh, vaLow] = computeValueArea(sortedBars, vp.valueAreaVolume);

	const extents = resolveBarPriceExtents(sortedBars);

	const renderedBars = sortedBars.map((bar: VolumeProfileBar, i: number): RenderedVolumeBar => {
		const { top, bottom } = extents[i];
		const topY = priceScale.priceToCoordinate(top, baseValue);
		const bottomY = priceScale.priceToCoordinate(bottom, baseValue);

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
	const topY = priceScale.priceToCoordinate(topExtreme, baseValue);
	const bottomY = priceScale.priceToCoordinate(bottomExtreme, baseValue);

	return {
		points: [
			new AnchorPoint(x0, Math.min(topY, bottomY), 0),
			new AnchorPoint(x1, Math.max(topY, bottomY), 1),
		],
		bars: renderedBars,
		barColor: vp.barColor,
		valueAreaColor: vp.valueAreaColor,
		buyColor: vp.buyColor,
		sellColor: vp.sellColor,
		isTwoTone,
		pocColor: vp.pocColor,
		showPOC: vp.showPOC,
		showValueArea: vp.showValueArea,
		showValueAreaLines: vp.showValueAreaLines,
		valueAreaLineColor: vp.valueAreaLineColor,
		borderColor: vp.borderColor,
		borderWidth: vp.borderWidth,
		backgroundColor: vp.backgroundColor,
		pocExpansion: vp.pocExpansion,
		barWidthRatio: vp.barWidthRatio,
		barAnchorSide: vp.barAnchorSide,
	};
}

export class FixedRangeVolumeProfilePaneView extends LineToolPaneView {
	protected _profileRenderer: FixedRangeVolumeProfileRenderer = new FixedRangeVolumeProfileRenderer();
	private _lineRenderer: SegmentRenderer = new SegmentRenderer();
	// Anchor index recorded at mousedown so that slight mouse movement off the
	// circle during a drag still targets the correct anchor.
	private _pressedAnchorIndex: number | null = null;

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _onMouseDown(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		this._pressedAnchorIndex = null;
		const result = super._onMouseDown(paneWidget, ctx, originPoint, appliedPoint, event);
		if (this._source.finished()) {
			const hitResult = this._hitTest(paneWidget, ctx, originPoint);
			if (hitResult !== null && hitResult.type() === HitTestType.ChangePoint) {
				this._pressedAnchorIndex = hitResult.data()?.pointIndex ?? null;
			}
		}
		return result;
	}

	// Only anchor handle drags are allowed. Body presses do not move the whole tool.
	protected override _onPressedMouseMove(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, originPoint: Point, appliedPoint: Point, event: TouchMouseEvent): boolean {
		if (!this._source.editing()) {
			if (this._pressedAnchorIndex === null) {
				return false;
			}
			// Pre-set the anchor index so super uses it even if the mouse has moved
			// slightly off the anchor circle since the initial press.
			this._editedPointIndex = this._pressedAnchorIndex;
		}
		return super._onPressedMouseMove(paneWidget, ctx, originPoint, appliedPoint, event);
	}

	protected override _updateImpl(height?: number, width?: number): void {
		this._renderer = null;
		this._invalidated = false;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();
		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }

		super._updateImpl();
		this._renderer = this._toolRenderer(priceScale, height ?? 0, width ?? 0);
	}

	/** The tool's renderer once its points are laid out. The anchored profile overrides it. */
	protected _toolRenderer(priceScale: PriceScale, height: number, width: number): IPaneRenderer | null {
		if (this._points.length < 2) { return null; }

		const options = this._source.options() as LineToolOptionsInternal<'FixedRangeVolumeProfile'>;
		const vp = options.volumeProfile;

		const [pt0, pt1] = this._points;
		const x0 = Math.min(pt0.x, pt1.x);
		const x1 = Math.max(pt0.x, pt1.x);

		const compositeRenderer = new CompositeRenderer();

		if (this._source.creating()) {
			// During drawing: show a non-interactive line as a visual guide.
			// It is only visible while the user is placing anchor points and
			// disappears once the tool is finalized.
			const lineStart = new AnchorPoint(pt0.x, pt0.y, 0);
			const lineEnd = new AnchorPoint(pt1.x, pt1.y, 1);
			this._lineRenderer.setData({
				line: { color: vp.borderColor, width: 1 },
				points: [lineStart, lineEnd],
			});
			compositeRenderer.append(this._lineRenderer);
			return compositeRenderer;
		}

		const firstValue = this._source.ownerSource()?.firstValue();
		if (!firstValue) { return null; }

		const data = volumeProfileRendererData(vp, priceScale, firstValue.value, x0, x1);
		if (data !== null) {
			this._profileRenderer.setData(data);
			compositeRenderer.append(this._profileRenderer);
		}

		this.addAnchors(compositeRenderer);
		return compositeRenderer;
	}
}
