import { Coordinate } from '../model/coordinate';
import { HitTestResult, HitTestType } from '../model/hit-test-result';
import { EmojiOptions } from '../model/line-tool-options';
import { Point } from '../model/point';

import { IPaneRenderer } from './ipane-renderer';

export interface EmojiRendererData {
	emoji: EmojiOptions;
	p1: Point | null;
	p2: Point | null;
}

export class EmojiRenderer implements IPaneRenderer {
	private _data: EmojiRendererData | null = null;
	private _hitTest: HitTestResult<void> = new HitTestResult(HitTestType.MovePoint);

	public setData(data: EmojiRendererData): void {
		this._data = data;
	}

	public hitTest(x: Coordinate, y: Coordinate, ctx: CanvasRenderingContext2D): HitTestResult<void> | null {
		if (!this._data || !this._data.p1 || !this._data.p2) {
			return null;
		}

		const { p1, p2, emoji } = this._data;
		const centerX = (p1.x + p2.x) / 2;
		const centerY = (p1.y + p2.y) / 2;
		const width = Math.abs(p2.x - p1.x);
		const height = Math.abs(p2.y - p1.y);
		const size = Math.max(width, height);

        // Transform hit test point to local space
		const dx = x - centerX;
		const dy = y - centerY;
		const cos = Math.cos(-emoji.angle);
		const sin = Math.sin(-emoji.angle);
		const localX = dx * cos - dy * sin;
		const localY = dx * sin + dy * cos;

		if (Math.abs(localX) <= size / 2 && Math.abs(localY) <= size / 2) {
			return this._hitTest;
		}

		return null;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (!this._data || !this._data.p1 || !this._data.p2) {
			return;
		}

		const { p1, p2, emoji } = this._data;
		const centerX = (p1.x + p2.x) / 2;
		const centerY = (p1.y + p2.y) / 2;
		const width = Math.abs(p2.x - p1.x);
		const height = Math.abs(p2.y - p1.y);
		const size = Math.max(width, height);

		ctx.save();
		ctx.translate(centerX * pixelRatio, centerY * pixelRatio);
		ctx.rotate(emoji.angle);

        // Draw border/box (Always a square on the canvas)
		ctx.strokeStyle = '#2196F3'; // TradingView blue
		ctx.lineWidth = Math.max(1, Math.floor(pixelRatio));
		ctx.strokeRect(-size / 2 * pixelRatio, -size / 2 * pixelRatio, size * pixelRatio, size * pixelRatio);

        // Draw connector line to rotation handle
		ctx.beginPath();
		ctx.moveTo(0, -size / 2 * pixelRatio);
		ctx.lineTo(0, (-size / 2 - size * 0.2) * pixelRatio); // 20% of size offset
		ctx.stroke();

		const fontSize = size * pixelRatio;
		ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

        // Add a small vertical offset to account for common emoji baseline shifts
        // (usually they are shifted slightly up in most fonts)
		const verticalOffset = fontSize * 0.08;
		ctx.fillText(emoji.value, 0, verticalOffset);

		ctx.restore();
	}
}
