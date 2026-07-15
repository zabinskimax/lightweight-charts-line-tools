import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType } from '../../model/line-tool-options';
import { toPercent } from '../../model/price-scale-conversions';
import { PriceScale } from '../../model/price-scale';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { PriceRangeRenderer } from '../../renderers/price-range-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

/** Formats a signed duration in seconds as a compact human string, e.g. `3d 4h`. */
export function formatDuration(seconds: number): string {
	const sign = seconds < 0 ? '-' : '';
	let rest = Math.abs(Math.round(seconds));

	const days = Math.floor(rest / 86400);
	rest -= days * 86400;
	const hours = Math.floor(rest / 3600);
	rest -= hours * 3600;
	const minutes = Math.floor(rest / 60);
	rest -= minutes * 60;

	const parts: string[] = [];
	if (days > 0) { parts.push(`${days}d`); }
	if (hours > 0) { parts.push(`${hours}h`); }
	if (minutes > 0 && days === 0) { parts.push(`${minutes}m`); }
	if (rest > 0 && days === 0 && hours === 0) { parts.push(`${rest}s`); }
	if (parts.length === 0) { parts.push('0m'); }

	return sign + parts.slice(0, 2).join(' ');
}

export class DateRangePaneView extends LineToolPaneView {
	protected _rangeRenderer: PriceRangeRenderer = new PriceRangeRenderer();
	protected _labelRenderer: TextRenderer = new TextRenderer();

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'DateRange'>;

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
		this._rangeRenderer.setData({ ...deepCopy(options.priceRange), points: this._points, hitTestBackground: false });
		compositeRenderer.append(this._rangeRenderer);

		const point0 = this._points[0];
		const point1 = this._points[1];

		const labelText = this._statsText(priceScale, points[0], points[1], point0, point1);

		if (labelText) {
			const minX = Math.min(point0.x, point1.x);
			const maxX = Math.max(point0.x, point1.x);
			const minY = Math.min(point0.y, point1.y);
			const maxY = Math.max(point0.y, point1.y);

			const labelOptions = deepCopy(options.text);
			labelOptions.value = labelText;
			labelOptions.box.alignment = {
				horizontal: BoxHorizontalAlignment.Center,
				// Drag up → label above the box; drag down (or flat) → below.
				// BoxVerticalAlignment.Top places the box fully above the pivot.
				vertical: point1.y < point0.y ? BoxVerticalAlignment.Top : BoxVerticalAlignment.Bottom,
			};
			labelOptions.box.offset = { x: 0, y: 12 };

			const pivot = point0.clone();
			pivot.x = (minX + maxX) / 2 as Coordinate;
			pivot.y = (point1.y < point0.y ? minY : maxY) as Coordinate;

			this._labelRenderer.setData({ text: labelOptions, points: [pivot] });
			compositeRenderer.append(this._labelRenderer);
		}

		this.addAnchors(compositeRenderer);
		this._renderer = compositeRenderer;
	}

	/** Bars count + duration between the anchors. */
	protected _statsText(priceScale: PriceScale, start: { price: number; timestamp: number }, end: { price: number; timestamp: number }, screen0: AnchorPoint, screen1: AnchorPoint): string {
		return this._dateStats(start, end, screen0, screen1);
	}

	protected _dateStats(start: { timestamp: number }, end: { timestamp: number }, screen0: AnchorPoint, screen1: AnchorPoint): string {
		const barSpacing = this._model.timeScale().barSpacing();
		const bars = barSpacing > 0 ? Math.round((screen1.x - screen0.x) / barSpacing) : 0;
		const duration = formatDuration(Number(end.timestamp) - Number(start.timestamp));
		return `${bars} bars, ${duration}`;
	}
}

export class DateAndPriceRangePaneView extends DateRangePaneView {
	/** Price change + percent on the first row, bars + duration on the second. */
	protected override _statsText(priceScale: PriceScale, start: { price: number; timestamp: number }, end: { price: number; timestamp: number }, screen0: AnchorPoint, screen1: AnchorPoint): string {
		const firstValue = priceScale.firstValue();
		let priceLine = '';

		if (firstValue !== null) {
			const priceDiff = end.price - start.price;
			const formattedDiff = priceScale.formatPrice(priceDiff, firstValue);
			const percent = toPercent(end.price, start.price);
			const sign = priceDiff > 0 ? '+' : '';
			priceLine = `${sign}${formattedDiff} (${sign}${percent.toFixed(2)}%)`;
		}

		const dateLine = this._dateStats(start, end, screen0, screen1);
		return priceLine ? `${priceLine}\n${dateLine}` : dateLine;
	}
}
