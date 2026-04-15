import { Coordinate } from '../model/coordinate';

import { ScaledRenderer } from './scaled-renderer';

export interface BarColorOverlayItem {
	x: Coordinate;
	color: string;
}

export interface BarColorOverlayRendererData {
	items: BarColorOverlayItem[];
	barSpacing: number;
	widthRatio: number;
	height: number;
}

export class BarColorOverlayRenderer extends ScaledRenderer {
	private _data: BarColorOverlayRendererData | null = null;

	public setData(data: BarColorOverlayRendererData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		const data = this._data;
		if (data === null || data.items.length === 0) {
			return;
		}
		const width = Math.max(1, data.barSpacing * data.widthRatio);
		const halfWidth = width / 2;

		for (const item of data.items) {
			ctx.fillStyle = item.color;
			ctx.fillRect(item.x - halfWidth, 0, width, data.height);
		}
	}
}
