import { TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { HitTestType } from '../../model/hit-test-result';
import { LineTool, LineToolHitTestData, LineToolOptionsInternal } from '../../model/line-tool';
import { LineToolType, VolumeProfileBar } from '../../model/line-tool-options';
import { Point } from '../../model/point';

import { CompositeRenderer } from '../../renderers/composite-renderer';
import { FixedRangeVolumeProfileRenderer, RenderedVolumeBar } from '../../renderers/fixed-range-volume-profile-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';

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
				this._pressedAnchorIndex = (hitResult.data() as LineToolHitTestData | null)?.pointIndex ?? null;
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
		} else {
			const ownerSource = this._source.ownerSource();
			const firstValue = ownerSource?.firstValue();
			if (!firstValue) { return; }

			// Sort bars high-to-low price (top of chart = highest price)
			const sortedBars = [...vp.bars].sort((a, b) => b.price - a.price);

			if (sortedBars.length > 0) {
				const maxVolume = sortedBars.reduce((m, b) => Math.max(m, b.volume), 0);
				const pocIndex = sortedBars.reduce((mi, b, i) => b.volume > sortedBars[mi].volume ? i : mi, 0);
				const [vaHigh, vaLow] = computeValueArea(sortedBars, vp.valueAreaVolume);

				let binSizePrice = 0;
				if (sortedBars.length > 1) {
					binSizePrice = Math.abs(sortedBars[0].price - sortedBars[1].price);
				} else {
					binSizePrice = sortedBars[0].price * 0.001; // fallback
				}

				const renderedBars = sortedBars.map((bar, i): RenderedVolumeBar => {
					const barTopPrice = bar.price + binSizePrice / 2;
					const barBottomPrice = bar.price - binSizePrice / 2;
					const topY = priceScale.priceToCoordinate(barTopPrice, firstValue.value);
					const bottomY = priceScale.priceToCoordinate(barBottomPrice, firstValue.value);

					return {
						y: Math.min(topY, bottomY) as Coordinate,
						h: Math.abs(bottomY - topY),
						widthRatio: maxVolume > 0 ? bar.volume / maxVolume : 0,
						isPOC: i === pocIndex,
						isInValueArea: vp.showValueArea && i >= vaHigh && i <= vaLow,
					};
				});

				const topExtreme = Math.max(...vp.bars.map(b => b.price)) + binSizePrice / 2;
				const bottomExtreme = Math.min(...vp.bars.map(b => b.price)) - binSizePrice / 2;
				const topY = priceScale.priceToCoordinate(topExtreme, firstValue.value);
				const bottomY = priceScale.priceToCoordinate(bottomExtreme, firstValue.value);

				const topLeft = new AnchorPoint(x0, Math.min(topY, bottomY) as Coordinate, 0);
				const bottomRight = new AnchorPoint(x1, Math.max(topY, bottomY) as Coordinate, 1);

				this._profileRenderer.setData({
					points: [topLeft, bottomRight],
					bars: renderedBars,
					barColor: vp.barColor,
					valueAreaColor: vp.valueAreaColor,
					pocColor: vp.pocColor,
					showPOC: vp.showPOC,
					showValueArea: vp.showValueArea,
					borderColor: vp.borderColor,
					borderWidth: vp.borderWidth,
					backgroundColor: vp.backgroundColor,
				});

				compositeRenderer.append(this._profileRenderer);
			}

			this.addAnchors(compositeRenderer);
		}

		this._renderer = compositeRenderer;
	}
}
