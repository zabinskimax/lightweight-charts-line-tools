import { SeriesItemsIndexesRange } from '../model/time-data';

import { LinePoint, LineType } from './draw-line';
import { ScaledRenderer } from './scaled-renderer';
import { walkLine } from './walk-line';

export interface PolygonFillRendererData {
	topItems: LinePoint[];
	bottomItems: LinePoint[];
	lineType: LineType;
	fillColor: string;
	topVisibleRange: SeriesItemsIndexesRange | null;
	bottomVisibleRange: SeriesItemsIndexesRange | null;
}

export class PolygonFillRenderer extends ScaledRenderer {
	private _data: PolygonFillRendererData | null = null;

	public setData(data: PolygonFillRendererData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		const data = this._data;
		if (
			data === null ||
			data.topItems.length === 0 ||
			data.bottomItems.length === 0 ||
			data.topVisibleRange === null ||
			data.bottomVisibleRange === null
		) {
			return;
		}

		ctx.beginPath();

		// Walk the top line forward
		walkLine(ctx, data.topItems, data.lineType, data.topVisibleRange);

		// Line down to the last visible bottom point
		const bottomTo = data.bottomVisibleRange.to - 1;
		ctx.lineTo(data.bottomItems[bottomTo].x, data.bottomItems[bottomTo].y);

		// Walk the bottom line backward
		for (let i = bottomTo - 1; i >= data.bottomVisibleRange.from; --i) {
			if (data.lineType === LineType.WithSteps) {
				const nextX = data.bottomItems[i + 1].x;
				ctx.lineTo(nextX, data.bottomItems[i].y);
			}
			ctx.lineTo(data.bottomItems[i].x, data.bottomItems[i].y);
		}

		// Close back up to the first visible top point
		ctx.lineTo(data.topItems[data.topVisibleRange.from].x, data.topItems[data.topVisibleRange.from].y);

		ctx.closePath();
		ctx.fillStyle = data.fillColor;
		ctx.fill();
	}
}
