import { Coordinate } from '../model/coordinate';

import { ScaledRenderer } from './scaled-renderer';

export type TextLabelHAlign = 'left' | 'center' | 'right';
export type TextLabelVAlign = 'top' | 'middle' | 'bottom';

export interface TextLabelRendererData {
	x: Coordinate;
	y: Coordinate;
	text: string;
	color: string;
	fontSize: number;
	fontFamily: string;
	bold: boolean;
	italic: boolean;
	horzAlign: TextLabelHAlign;
	vertAlign: TextLabelVAlign;
	backgroundColor?: string;
	paddingX: number;
	paddingY: number;
}

export class TextLabelRenderer extends ScaledRenderer {
	private _data: TextLabelRendererData | null = null;

	public setData(data: TextLabelRendererData): void {
		this._data = data;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		const data = this._data;
		if (data === null || data.text.length === 0) {
			return;
		}

		const fontStyle = `${data.italic ? 'italic ' : ''}${data.bold ? 'bold ' : ''}${data.fontSize}px ${data.fontFamily}`;
		ctx.font = fontStyle;
		ctx.textBaseline = 'alphabetic';

		const metrics = ctx.measureText(data.text);
		const textWidth = metrics.width;
		const textHeight = data.fontSize;

		let boxX: number;
		switch (data.horzAlign) {
			case 'left':
				boxX = data.x;
				break;
			case 'right':
				boxX = data.x - textWidth - 2 * data.paddingX;
				break;
			case 'center':
			default:
				boxX = data.x - textWidth / 2 - data.paddingX;
				break;
		}

		let boxY: number;
		switch (data.vertAlign) {
			case 'top':
				boxY = data.y;
				break;
			case 'bottom':
				boxY = data.y - textHeight - 2 * data.paddingY;
				break;
			case 'middle':
			default:
				boxY = data.y - textHeight / 2 - data.paddingY;
				break;
		}

		const boxWidth = textWidth + 2 * data.paddingX;
		const boxHeight = textHeight + 2 * data.paddingY;

		if (data.backgroundColor !== undefined) {
			ctx.fillStyle = data.backgroundColor;
			ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
		}

		ctx.fillStyle = data.color;
		// draw text with alphabetic baseline at boxY + padding + fontSize
		ctx.fillText(data.text, boxX + data.paddingX, boxY + data.paddingY + textHeight * 0.85);
	}
}
