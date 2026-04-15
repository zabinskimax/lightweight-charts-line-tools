import { Coordinate } from '../model/coordinate';

import { ScaledRenderer } from './scaled-renderer';

export interface BackgroundBandRendererData {
	x1: Coordinate;
	x2: Coordinate;
	height: number;
	color: string;
}

export class BackgroundBandRenderer extends ScaledRenderer {
	private _data: BackgroundBandRendererData | null = null;

	public setData(data: BackgroundBandRendererData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		const data = this._data;
		if (data === null) {
			return;
		}
		const left = Math.min(data.x1, data.x2);
		const right = Math.max(data.x1, data.x2);
		const width = right - left;
		if (width <= 0) {
			return;
		}
		ctx.fillStyle = data.color;
		ctx.fillRect(left, 0, width, data.height);
	}
}
