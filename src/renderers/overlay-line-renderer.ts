import { Coordinate } from '../model/coordinate';

import { LineStyle, LineWidth, setLineStyle } from './draw-line';
import { ScaledRenderer } from './scaled-renderer';

export interface OverlayLineRendererData {
	x1: Coordinate;
	y1: Coordinate;
	x2: Coordinate;
	y2: Coordinate;
	color: string;
	lineWidth: LineWidth;
	lineStyle: LineStyle;
}

export class OverlayLineRenderer extends ScaledRenderer {
	private _data: OverlayLineRendererData | null = null;

	public setData(data: OverlayLineRendererData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		const data = this._data;
		if (data === null) {
			return;
		}
		ctx.strokeStyle = data.color;
		ctx.lineWidth = data.lineWidth;
		ctx.lineCap = 'butt';
		setLineStyle(ctx, data.lineStyle);

		ctx.beginPath();
		ctx.moveTo(data.x1, data.y1);
		ctx.lineTo(data.x2, data.y2);
		ctx.stroke();
	}
}
