import { drawScaled } from '../helpers/canvas-helpers';
import { applyAlpha } from '../helpers/color';
import { makeFont } from '../helpers/make-font';

import { HitTestResult, HitTestType } from '../model/hit-test-result';
import { BoxHorizontalAlignment } from '../model/line-tool-options';

import { IPaneRenderer } from './ipane-renderer';

export interface TradeLinePanePillRendererData {
	visible: boolean;
	text: string;
	/** Line's y coordinate in logical pane pixels. */
	y: number;
	/** Logical pane width. */
	paneWidth: number;
	alignment: BoxHorizontalAlignment;
	/** Pixel offset from the alignment anchor. Positive = rightward. */
	offsetX: number;
	background: string;
	color: string;
	fontSize: number;
	fontFamily: string;
	fontBold: boolean;
	fontItalic: boolean;
	paddingX: number;
	paddingY: number;
	showClose: boolean;
	showSpawnTP: boolean;
	showSpawnSL: boolean;
}

const CLOSE_GLYPH = '×'; // ×
const CLOSE_LEFT_PADDING = 3; // gap between the divider and the × glyph
const CLOSE_RIGHT_PADDING = 6; // gap between the × glyph and the pill's right inner edge
const TEXT_DIVIDER_GAP = 4; // extra breathing room between text end and the ×-divider line
const SEPARATOR_INSET = 3; // vertical inset for the text/× divider line
const SPAWN_TAB_GAP = 5; // vertical gap between pill edge and spawn tab
const SPAWN_TAB_PADDING_X = 6;
const SPAWN_TAB_PADDING_Y = 2;
const SPAWN_TAB_BORDER = 1;

export class TradeLinePanePillRenderer implements IPaneRenderer {
	private _data: TradeLinePanePillRendererData | null = null;
	private _hitRect: { x: number; y: number; w: number; h: number } | null = null;

	public setData(data: TradeLinePanePillRendererData): void {
		this._data = data;
		this._hitRect = null;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		const data = this._data;
		if (data === null || !data.visible || !data.text) { return; }

		const style = [data.fontBold ? 'bold' : '', data.fontItalic ? 'italic' : ''].filter((s: string) => s.length > 0).join(' ') || undefined;
		const mainFont = makeFont(data.fontSize, data.fontFamily, style);
		const spawnFontSize = Math.max(9, data.fontSize - 2);
		const spawnFont = makeFont(spawnFontSize, data.fontFamily, 'bold');

		ctx.save();
		drawScaled(ctx, pixelRatio, () => {
			ctx.font = mainFont;
			const textWidth = Math.ceil(ctx.measureText(data.text).width);
			const pillHeight = data.fontSize + data.paddingY * 2;
			const closeGlyphWidth = data.showClose ? Math.ceil(ctx.measureText(CLOSE_GLYPH).width) : 0;
			const closeAreaWidth = data.showClose ? closeGlyphWidth + CLOSE_LEFT_PADDING + CLOSE_RIGHT_PADDING : 0;
			const separatorW = data.showClose ? 1 : 0;
			const dividerGap = data.showClose ? TEXT_DIVIDER_GAP : 0;
			const pillWidth = data.paddingX + textWidth + data.paddingX + dividerGap + separatorW + closeAreaWidth;

			const centerX = this._resolveCenterX(data, pillWidth);
			const left = centerX - pillWidth / 2;
			const right = centerX + pillWidth / 2;
			const top = data.y - pillHeight / 2;
			const bottom = data.y + pillHeight / 2;
			const radius = pillHeight / 2;

			// capsule body
			ctx.fillStyle = data.background;
			ctx.beginPath();
			ctx.moveTo(left + radius, top);
			ctx.lineTo(right - radius, top);
			ctx.arc(right - radius, data.y, radius, -Math.PI / 2, Math.PI / 2);
			ctx.lineTo(left + radius, bottom);
			ctx.arc(left + radius, data.y, radius, Math.PI / 2, -Math.PI / 2);
			ctx.closePath();
			ctx.fill();

			// main label text (left-aligned within its slot)
			ctx.fillStyle = data.color;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			const textLeft = left + data.paddingX;
			ctx.fillText(data.text, textLeft, data.y);

			// X close area (purely visual)
			if (data.showClose) {
				const separatorX = textLeft + textWidth + data.paddingX + TEXT_DIVIDER_GAP;
				ctx.strokeStyle = applyAlpha(data.color, 0.4);
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(separatorX, top + SEPARATOR_INSET);
				ctx.lineTo(separatorX, bottom - SEPARATOR_INSET);
				ctx.stroke();

				ctx.fillStyle = data.color;
				ctx.textAlign = 'center';
				ctx.fillText(CLOSE_GLYPH, separatorX + separatorW + CLOSE_LEFT_PADDING + closeGlyphWidth / 2, data.y);
			}

			// outline-style spawn tabs above/below (purely visual)
			ctx.font = spawnFont;
			if (data.showSpawnTP) {
				this._drawSpawnTab(ctx, '+TP', centerX, top - SPAWN_TAB_GAP, 'above', data, spawnFontSize);
			}
			if (data.showSpawnSL) {
				this._drawSpawnTab(ctx, '+SL', centerX, bottom + SPAWN_TAB_GAP, 'below', data, spawnFontSize);
			}

			this._hitRect = { x: left, y: top, w: pillWidth, h: pillHeight };
		});
		ctx.restore();
	}

	public hitTest(x: number, y: number): HitTestResult<void> | null {
		const rect = this._hitRect;
		if (rect === null) { return null; }
		if (x < rect.x || x > rect.x + rect.w || y < rect.y || y > rect.y + rect.h) { return null; }
		return new HitTestResult(HitTestType.MovePoint);
	}

	// eslint-disable-next-line max-params
	private _drawSpawnTab(
		ctx: CanvasRenderingContext2D,
		label: string,
		centerX: number,
		anchorY: number,
		placement: 'above' | 'below',
		data: TradeLinePanePillRendererData,
		fontSize: number
	): void {
		const textWidth = Math.ceil(ctx.measureText(label).width);
		const tabWidth = textWidth + SPAWN_TAB_PADDING_X * 2;
		const tabHeight = fontSize + SPAWN_TAB_PADDING_Y * 2;
		const tabLeft = centerX - tabWidth / 2;
		const tabRight = centerX + tabWidth / 2;
		const tabTop = placement === 'above' ? anchorY - tabHeight : anchorY;
		const tabBottom = tabTop + tabHeight;
		const tabRadius = Math.min(4, tabHeight / 2);

		// rounded-rect path
		ctx.beginPath();
		ctx.moveTo(tabLeft + tabRadius, tabTop);
		ctx.lineTo(tabRight - tabRadius, tabTop);
		ctx.arcTo(tabRight, tabTop, tabRight, tabTop + tabRadius, tabRadius);
		ctx.lineTo(tabRight, tabBottom - tabRadius);
		ctx.arcTo(tabRight, tabBottom, tabRight - tabRadius, tabBottom, tabRadius);
		ctx.lineTo(tabLeft + tabRadius, tabBottom);
		ctx.arcTo(tabLeft, tabBottom, tabLeft, tabBottom - tabRadius, tabRadius);
		ctx.lineTo(tabLeft, tabTop + tabRadius);
		ctx.arcTo(tabLeft, tabTop, tabLeft + tabRadius, tabTop, tabRadius);
		ctx.closePath();

		// translucent fill behind text so the line underneath doesn't poke through
		ctx.fillStyle = applyAlpha(data.background, 0.12);
		ctx.fill();

		ctx.strokeStyle = data.background;
		ctx.lineWidth = SPAWN_TAB_BORDER;
		ctx.stroke();

		ctx.fillStyle = data.background;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(label, centerX, (tabTop + tabBottom) / 2);
	}

	private _resolveCenterX(data: TradeLinePanePillRendererData, pillWidth: number): number {
		const half = pillWidth / 2;
		let anchor: number;
		switch (data.alignment) {
			case BoxHorizontalAlignment.Left:
				anchor = half;
				break;
			case BoxHorizontalAlignment.Right:
				anchor = data.paneWidth - half;
				break;
			case BoxHorizontalAlignment.Center:
			default:
				anchor = data.paneWidth / 2;
				break;
		}
		return anchor + data.offsetX;
	}
}
