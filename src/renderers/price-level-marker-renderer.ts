import { Coordinate } from '../model/coordinate';

import { LineStyle, LineWidth, setLineStyle } from './draw-line';
import { ScaledRenderer } from './scaled-renderer';

export type PriceLevelMarkerShape = 'diamond' | 'circle' | 'square';

export interface PriceLevelMarkerRendererData {
	x: Coordinate;
	y: Coordinate;
	paneWidth: number;
	color: string;
	textColor: string;
	text: string;
	shape: PriceLevelMarkerShape;
	markerSize: number;
	showLine: boolean;
	showLabel: boolean;
	lineStyle: LineStyle;
	lineWidth: LineWidth;
	fontSize: number;
	fontFamily: string;
	bold: boolean;
	labelPaddingX: number;
	labelPaddingY: number;
	labelTailSize: number;
}

export class PriceLevelMarkerRenderer extends ScaledRenderer {
	private _data: PriceLevelMarkerRendererData | null = null;

	public setData(data: PriceLevelMarkerRendererData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		const data = this._data;
		if (data === null) {
			return;
		}

		const { x, y, paneWidth } = data;

		// --- Measure label first so we know its left edge ---
		let labelLeft = paneWidth;
		let labelWidth = 0;
		let labelHeight = 0;

		if (data.showLabel && data.text.length > 0) {
			const fontStyle = `${data.bold ? 'bold ' : ''}${data.fontSize}px ${data.fontFamily}`;
			ctx.font = fontStyle;
			ctx.textBaseline = 'alphabetic';
			const metrics = ctx.measureText(data.text);
			labelWidth = Math.ceil(metrics.width) + 2 * data.labelPaddingX;
			labelHeight = data.fontSize + 2 * data.labelPaddingY;
			// Label sits flush against the right edge of the pane.
			labelLeft = paneWidth - labelWidth - data.labelTailSize;
		}

		// --- Horizontal connector line ---
		if (data.showLine) {
			ctx.save();
			ctx.strokeStyle = data.color;
			ctx.lineWidth = data.lineWidth;
			ctx.lineCap = 'butt';
			setLineStyle(ctx, data.lineStyle);
			ctx.beginPath();
			ctx.moveTo(x, y);
			const lineRight = data.showLabel && data.text.length > 0 ? labelLeft : paneWidth;
			ctx.lineTo(lineRight, y);
			ctx.stroke();
			ctx.restore();
		}

		// --- Anchor marker ---
		this._drawMarker(ctx, x, y, data);

		// --- Label pill ---
		if (data.showLabel && data.text.length > 0) {
			this._drawLabel(ctx, labelLeft, y, labelWidth, labelHeight, data);
		}
	}

	private _drawMarker(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		data: PriceLevelMarkerRendererData
	): void {
		const size = data.markerSize;
		const half = size / 2;

		ctx.save();
		ctx.fillStyle = data.color;

		switch (data.shape) {
			case 'diamond': {
				ctx.beginPath();
				ctx.moveTo(x, y - half);
				ctx.lineTo(x + half, y);
				ctx.lineTo(x, y + half);
				ctx.lineTo(x - half, y);
				ctx.closePath();
				ctx.fill();
				break;
			}
			case 'circle': {
				ctx.beginPath();
				ctx.arc(x, y, half, 0, 2 * Math.PI);
				ctx.fill();
				break;
			}
			case 'square': {
				ctx.fillRect(x - half, y - half, size, size);
				break;
			}
		}

		ctx.restore();
	}

	private _drawLabel(
		ctx: CanvasRenderingContext2D,
		left: number,
		y: number,
		width: number,
		height: number,
		data: PriceLevelMarkerRendererData
	): void {
		const halfH = height / 2;
		const top = y - halfH;
		const bottom = y + halfH;
		const right = left + width;
		const tailTip = right + data.labelTailSize;
		// Left-pointing tail merged into the pill: tail apex points LEFT at (left - tail, y)
		// but we want the tail pointing toward the chart (left side). Actually the image
		// shows the tail on the LEFT side. Adjust: shift the pill right by tailSize and
		// let the tail protrude left toward the anchor.
		const pillLeft = left + data.labelTailSize;
		const pillRight = tailTip;

		ctx.save();
		ctx.fillStyle = data.color;
		ctx.beginPath();
		ctx.moveTo(left, y); // tail tip (pointing toward chart)
		ctx.lineTo(pillLeft, top);
		ctx.lineTo(pillRight, top);
		ctx.lineTo(pillRight, bottom);
		ctx.lineTo(pillLeft, bottom);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = data.textColor;
		const fontStyle = `${data.bold ? 'bold ' : ''}${data.fontSize}px ${data.fontFamily}`;
		ctx.font = fontStyle;
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(
			data.text,
			pillLeft + data.labelPaddingX,
			top + data.labelPaddingY + data.fontSize * 0.85
		);
		ctx.restore();
	}
}
