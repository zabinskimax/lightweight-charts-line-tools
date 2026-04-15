import { Coordinate } from '../model/coordinate';

import { LineStyle, LineWidth, setLineStyle } from './draw-line';
import { ScaledRenderer } from './scaled-renderer';

export interface OverlayBoxRendererData {
	x1: Coordinate;
	y1: Coordinate;
	x2: Coordinate;
	y2: Coordinate;
	fillColor?: string;
	borderColor?: string;
	borderWidth: LineWidth;
	borderStyle: LineStyle;
}

export class OverlayBoxRenderer extends ScaledRenderer {
	private _data: OverlayBoxRendererData | null = null;

	public setData(data: OverlayBoxRendererData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		const data = this._data;
		if (data === null) {
			return;
		}
		const left = Math.min(data.x1, data.x2);
		const right = Math.max(data.x1, data.x2);
		const top = Math.min(data.y1, data.y2);
		const bottom = Math.max(data.y1, data.y2);
		const width = right - left;
		const height = bottom - top;
		if (width <= 0 || height <= 0) {
			return;
		}

		if (data.fillColor !== undefined) {
			ctx.fillStyle = data.fillColor;
			ctx.fillRect(left, top, width, height);
		}

		if (data.borderColor !== undefined && data.borderWidth > 0) {
			ctx.strokeStyle = data.borderColor;
			ctx.lineWidth = data.borderWidth;
			setLineStyle(ctx, data.borderStyle);
			ctx.strokeRect(left, top, width, height);
		}
	}
}
