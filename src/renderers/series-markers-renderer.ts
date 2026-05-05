import { ensureNever } from '../helpers/assertions';
import { makeFont } from '../helpers/make-font';

import { Coordinate } from '../model/coordinate';
import { HitTestResult, HitTestType } from '../model/hit-test-result';
import {
	SeriesMarkerAnchor,
	SeriesMarkerShape,
	SeriesMarkerStroke,
	SeriesMarkerTooltip,
} from '../model/series-markers';
import { TextWidthCache } from '../model/text-width-cache';
import { SeriesItemsIndexesRange, TimedValue } from '../model/time-data';

import { ScaledRenderer } from './scaled-renderer';
import { drawArrow, hitTestArrow } from './series-markers-arrow';
import { drawCircle, hitTestCircle } from './series-markers-circle';
import { drawCross, hitTestCross } from './series-markers-cross';
import { drawDiamond, hitTestDiamond } from './series-markers-diamond';
import { drawFlag, hitTestFlag } from './series-markers-flag';
import { drawLabel, hitTestLabel, LabelOrientation } from './series-markers-label';
import { drawPin, hitTestPin } from './series-markers-pin';
import { drawSquare, hitTestSquare } from './series-markers-square';
import { drawStar, hitTestStar } from './series-markers-star';
import { drawText, hitTestText } from './series-markers-text';
import { drawTriangle, hitTestTriangle } from './series-markers-triangle';
import { drawWarning, hitTestWarning } from './series-markers-warning';
import { drawXCircle, hitTestXCircle } from './series-markers-xcircle';

/**
 * Payload returned from the marker renderer's hit test. Matches the shape
 * consumed by `HoveredObject` in chart-model so the pane-widget adapter can
 * pass it through directly.
 */
export interface SeriesMarkerHoverData {
	hitTestData: number;
	externalId?: string;
}

export interface SeriesMarkerText {
	content: string;
	y: Coordinate;
	width: number;
	height: number;
}

export interface SeriesMarkerRendererDataItem extends TimedValue {
	y: Coordinate;
	size: number;
	shape: SeriesMarkerShape;
	stroke?: SeriesMarkerStroke;
	anchor?: SeriesMarkerAnchor;
	rotation?: number;
	color: string;
	internalId: number;
	externalId?: string;
	text?: SeriesMarkerText;
	tooltip?: string | SeriesMarkerTooltip;
	// Set for `shape: 'label'`. Controls whether the body sits above or below
	// the anchor point — derived from `marker.position` (aboveBar → 'down',
	// everything else → 'up') so labels point at the candle they tag.
	labelOrientation?: LabelOrientation;
	// Cached body width measured in the bold label font during the draw pass.
	// Read by hit-testing so the hit rect matches the rendered shape.
	labelBodyWidth?: number;
}

export interface SeriesMarkerRendererData {
	items: SeriesMarkerRendererDataItem[];
	visibleRange: SeriesItemsIndexesRange | null;
}

export class SeriesMarkersRenderer extends ScaledRenderer {
	private _data: SeriesMarkerRendererData | null = null;
	private _textWidthCache: TextWidthCache = new TextWidthCache();
	private _fontSize: number = -1;
	private _fontFamily: string = '';
	private _font: string = '';

	public setData(data: SeriesMarkerRendererData): void {
		this._data = data;
	}

	public setParams(fontSize: number, fontFamily: string): void {
		if (this._fontSize !== fontSize || this._fontFamily !== fontFamily) {
			this._fontSize = fontSize;
			this._fontFamily = fontFamily;
			this._font = makeFont(fontSize, fontFamily);
			this._textWidthCache.reset();
		}
	}

	public hitTest(x: Coordinate, y: Coordinate): HitTestResult<SeriesMarkerHoverData> | null {
		if (this._data === null || this._data.visibleRange === null) {
			return null;
		}

		for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
			const item = this._data.items[i];
			if (hitTestItem(item, x, y)) {
				return new HitTestResult<SeriesMarkerHoverData>(HitTestType.Custom, {
					hitTestData: item.internalId,
					externalId: item.externalId,
				});
			}
		}

		return null;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D, isHovered: boolean, hitTestData?: unknown): void {
		if (this._data === null || this._data.visibleRange === null) {
			return;
		}

		ctx.textBaseline = 'middle';
		ctx.font = this._font;

		for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
			const item = this._data.items[i];
			if (item.text !== undefined) {
				item.text.width = this._textWidthCache.measureText(ctx, item.text.content);
				item.text.height = this._fontSize;
			}
			drawItem(item, ctx, this._fontFamily);
		}

		// Tooltip goes last so it sits on top of every marker in this pass.
		if (isHovered && typeof hitTestData === 'number') {
			for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
				const item = this._data.items[i];
				if (item.internalId === hitTestData && item.tooltip !== undefined) {
					drawTooltip(ctx, item, this._fontSize, this._fontFamily);
					break;
				}
			}
		}
	}
}

function drawItem(item: SeriesMarkerRendererDataItem, ctx: CanvasRenderingContext2D, fontFamily: string): void {
	// Labels handle their up/down orientation via geometry inside `drawLabel`
	// so the letter stays upright. Rotating the canvas would also flip the
	// text, which is wrong for a readable badge.
	const rotation = item.shape === 'label'
		? 0
		: item.rotation || (item.anchor === 'bottom' ? 180 : item.anchor === 'right' ? 90 : item.anchor === 'left' ? -90 : 0);
	ctx.strokeStyle = item.stroke?.color || 'transparent';
	ctx.lineWidth = item.stroke?.width || 1;
	ctx.fillStyle = item.color;

	// `label` renders the marker text inside its body, so the standalone
	// label is skipped here to avoid duplicating it adjacent to the shape.
	if (item.text !== undefined && item.shape !== 'label') {
		drawText(ctx, item.text.content, item.x - item.text.width / 2, item.text.y);
	}

	if (rotation) {
		ctx.save();
		ctx.translate(item.x, item.y);
		ctx.rotate(rotation * (Math.PI / 180));
		ctx.translate(-item.x, -item.y);
	}

	drawShape(item, ctx, fontFamily);

	if (rotation) {
		ctx.restore();
	}
}

function drawShape(item: SeriesMarkerRendererDataItem, ctx: CanvasRenderingContext2D, fontFamily: string): void {
	if (item.size === 0) {
		return;
	}

	switch (item.shape) {
		case 'triangle':
			drawTriangle(ctx, item.x, item.y, item.size);
			return;
		case 'arrowDown':
			drawArrow(false, ctx, item.x, item.y, item.size);
			return;
		case 'arrowUp':
			drawArrow(true, ctx, item.x, item.y, item.size);
			return;
		case 'circle':
			drawCircle(ctx, item.x, item.y, item.size);
			return;
		case 'square':
			drawSquare(ctx, item.x, item.y, item.size);
			return;
		case 'cross':
			drawCross(ctx, item.x, item.y, item.size);
			return;
		case 'diamond':
			drawDiamond(ctx, item.x, item.y, item.size);
			return;
		case 'star':
			drawStar(ctx, item.x, item.y, item.size);
			return;
		case 'flag':
			drawFlag(ctx, item.x, item.y, item.size);
			return;
		case 'pin':
			drawPin(ctx, item.x, item.y, item.size);
			return;
		case 'label':
			drawLabel(ctx, item.x, item.y, item.size, item.text?.content, fontFamily, item.labelOrientation ?? 'up', item);
			return;
		case 'warning':
			drawWarning(ctx, item.x, item.y, item.size);
			return;
		case 'xCircle':
			drawXCircle(ctx, item.x, item.y, item.size);
			return;
	}

	ensureNever(item.shape);
}

function hitTestItem(item: SeriesMarkerRendererDataItem, x: Coordinate, y: Coordinate): boolean {
	// `label` draws its text inside the body — its shape hit test already
	// covers that region, and `text.y` for label is positioned at the body
	// center (inside the shape), so the standalone text test would either
	// duplicate the hit or test against an irrelevant location.
	if (item.text !== undefined && item.shape !== 'label' && hitTestText(item.x, item.text.y, item.text.width, item.text.height, x, y)) {
		return true;
	}

	return hitTestShape(item, x, y);
}

// eslint-disable-next-line complexity
function hitTestShape(item: SeriesMarkerRendererDataItem, x: Coordinate, y: Coordinate): boolean {
	if (item.size === 0) {
		return false;
	}

	// Rotation is applied around the shape center at draw time; undo it on the
	// test point so the shape-local helpers see unrotated coordinates. Labels
	// don't canvas-rotate (see `drawItem`), so skip the inverse here too.
	const rotationDeg = item.shape === 'label'
		? 0
		: item.rotation || (item.anchor === 'bottom' ? 180 : item.anchor === 'right' ? 90 : item.anchor === 'left' ? -90 : 0);
	let tx = x as number;
	let ty = y as number;
	if (rotationDeg) {
		const rad = -rotationDeg * (Math.PI / 180);
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		const dx = (x as number) - item.x;
		const dy = (y as number) - item.y;
		tx = item.x + dx * cos - dy * sin;
		ty = item.y + dx * sin + dy * cos;
	}
	const px = tx as Coordinate;
	const py = ty as Coordinate;

	switch (item.shape) {
		case 'arrowDown':
			return hitTestArrow(false, item.x, item.y, item.size, px, py);
		case 'arrowUp':
			return hitTestArrow(true, item.x, item.y, item.size, px, py);
		case 'circle':
			return hitTestCircle(item.x, item.y, item.size, px, py);
		case 'square':
			return hitTestSquare(item.x, item.y, item.size, px, py);
		case 'triangle':
			return hitTestTriangle(item.x, item.y, item.size, px, py);
		case 'cross':
			return hitTestCross(item.x, item.y, item.size, px, py);
		case 'diamond':
			return hitTestDiamond(item.x, item.y, item.size, px, py);
		case 'star':
			return hitTestStar(item.x, item.y, item.size, px, py);
		case 'flag':
			return hitTestFlag(item.x, item.y, item.size, px, py);
		case 'pin':
			return hitTestPin(item.x, item.y, item.size, px, py);
		case 'label':
			return hitTestLabel(item.x, item.y, item.size, px, py, item.labelBodyWidth);
		case 'warning':
			return hitTestWarning(item.x, item.y, item.size, px, py);
		case 'xCircle':
			return hitTestXCircle(item.x, item.y, item.size, px, py);
	}

	ensureNever(item.shape);
	return false;
}

interface ResolvedTooltip {
	text: string;
	background: string;
	color: string;
	borderColor: string;
	borderWidth: number;
	borderRadius: number;
	fontSize: number;
	fontFamily: string;
	bold: boolean;
	paddingX: number;
	paddingY: number;
	lineHeight: number;
	shadow: boolean;
	pointer: boolean;
	placement: 'auto' | 'above' | 'below';
	offset: number;
}

const TOOLTIP_STATIC_DEFAULTS = {
	background: 'rgba(19, 23, 34, 0.92)',
	color: '#ffffff',
	borderColor: 'rgba(255, 255, 255, 0.08)',
	borderWidth: 1,
	borderRadius: 6,
	bold: false,
	paddingX: 10,
	paddingY: 6,
	lineHeight: 1.35,
	shadow: true,
	pointer: true,
	placement: 'auto' as const,
	offset: 10,
};

function resolveTooltip(
	tooltip: string | SeriesMarkerTooltip,
	defaultFontSize: number,
	defaultFontFamily: string
): ResolvedTooltip {
	const obj: SeriesMarkerTooltip = typeof tooltip === 'string' ? { text: tooltip } : tooltip;
	// Copy each field by explicit assignment instead of spreading `obj`. The
	// ts-transformer-properties-rename pass rewrites property accesses on the
	// internal `ResolvedTooltip` type (e.g. `background` → `_internal_background`)
	// but leaves keys on the public `SeriesMarkerTooltip` alone — a spread of
	// `obj` would carry user values under their public names onto a result the
	// renderer reads via the renamed internal names, silently dropping every
	// user override. Field-by-field assignment lets the transformer rename the
	// destination key for each line.
	const overrides: Partial<ResolvedTooltip> = {
		background: obj.background,
		color: obj.color,
		borderColor: obj.borderColor,
		borderWidth: obj.borderWidth,
		borderRadius: obj.borderRadius,
		fontSize: obj.fontSize,
		fontFamily: obj.fontFamily,
		bold: obj.bold,
		paddingX: obj.paddingX,
		paddingY: obj.paddingY,
		lineHeight: obj.lineHeight,
		shadow: obj.shadow,
		pointer: obj.pointer,
		placement: obj.placement,
		offset: obj.offset,
	};
	// `text` is re-applied last so its return type stays `string` — a
	// Partial spread would widen it back to `string | undefined`.
	return {
		...TOOLTIP_STATIC_DEFAULTS,
		fontSize: defaultFontSize,
		fontFamily: defaultFontFamily,
		...stripUndefined(overrides),
		text: obj.text,
	};
}

function stripUndefined<T>(obj: T): Partial<T> {
	const out: Partial<T> = {};
	for (const key of Object.keys(obj as Record<string, unknown>) as (keyof T)[]) {
		const value = obj[key] as T[keyof T] | undefined;
		if (value !== undefined) {
			out[key] = value;
		}
	}
	return out;
}

// eslint-disable-next-line complexity
function drawTooltip(
	ctx: CanvasRenderingContext2D,
	item: SeriesMarkerRendererDataItem,
	defaultFontSize: number,
	defaultFontFamily: string
): void {
	if (item.tooltip === undefined) {
		return;
	}
	const cfg = resolveTooltip(item.tooltip, defaultFontSize, defaultFontFamily);
	if (cfg.text.length === 0) {
		return;
	}

	ctx.save();

	const fontSpec = `${cfg.bold ? 'bold ' : ''}${cfg.fontSize}px ${cfg.fontFamily}`;
	ctx.font = fontSpec;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'left';

	const lines = cfg.text.split('\n');
	let maxLineWidth = 0;
	for (const line of lines) {
		const w = ctx.measureText(line).width;
		if (w > maxLineWidth) {
			maxLineWidth = w;
		}
	}

	const lineStep = cfg.fontSize * cfg.lineHeight;
	const contentHeight = lines.length === 1 ? cfg.fontSize : (lines.length - 1) * lineStep + cfg.fontSize;
	const boxW = maxLineWidth + cfg.paddingX * 2;
	const boxH = contentHeight + cfg.paddingY * 2;

	// The marker's visual half-extent — determines where the tooltip sits so
	// it doesn't overlap the shape.
	const markerHalf = item.size / 2;
	const pointerH = cfg.pointer ? 6 : 0;
	const pointerW = cfg.pointer ? 10 : 0;
	const gap = cfg.offset + markerHalf;

	const canvasW = ctx.canvas.width / getCanvasDevicePixelRatio(ctx);
	const canvasH = ctx.canvas.height / getCanvasDevicePixelRatio(ctx);

	// Placement: above by default, flip below if clipped at the top.
	const spaceAbove = item.y - gap - boxH - pointerH;
	const spaceBelow = canvasH - (item.y + gap + boxH + pointerH);
	let placeAbove: boolean;
	if (cfg.placement === 'above') {
		placeAbove = true;
	} else if (cfg.placement === 'below') {
		placeAbove = false;
	} else {
		placeAbove = spaceAbove >= 0 || spaceAbove >= spaceBelow;
	}

	let boxTop: number;
	if (placeAbove) {
		boxTop = item.y - gap - pointerH - boxH;
	} else {
		boxTop = item.y + gap + pointerH;
	}

	// Horizontally center on the marker, then clamp to the canvas with 4px margin.
	let boxLeft = item.x - boxW / 2;
	const margin = 4;
	if (boxLeft < margin) {
		boxLeft = margin;
	}
	if (boxLeft + boxW > canvasW - margin) {
		boxLeft = canvasW - margin - boxW;
	}

	if (cfg.shadow) {
		ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
		ctx.shadowBlur = 10;
		ctx.shadowOffsetY = placeAbove ? 2 : -2;
	}

	// Background.
	roundedRectPath(ctx, boxLeft, boxTop, boxW, boxH, cfg.borderRadius);
	ctx.fillStyle = cfg.background;
	ctx.fill();

	// Shadow only on the fill — switch it off for the stroke and pointer.
	ctx.shadowColor = 'transparent';
	ctx.shadowBlur = 0;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;

	if (cfg.borderWidth > 0) {
		ctx.lineWidth = cfg.borderWidth;
		ctx.strokeStyle = cfg.borderColor;
		ctx.stroke();
	}

	// Pointer triangle from the tooltip edge toward the marker. Clamp its x
	// inside the box so it still looks attached after edge clamping.
	if (cfg.pointer) {
		const pointerCenterX = Math.max(
			boxLeft + cfg.borderRadius + pointerW / 2,
			Math.min(boxLeft + boxW - cfg.borderRadius - pointerW / 2, item.x)
		);
		ctx.beginPath();
		if (placeAbove) {
			const baseY = boxTop + boxH;
			ctx.moveTo(pointerCenterX - pointerW / 2, baseY);
			ctx.lineTo(pointerCenterX + pointerW / 2, baseY);
			ctx.lineTo(pointerCenterX, baseY + pointerH);
		} else {
			const baseY = boxTop;
			ctx.moveTo(pointerCenterX - pointerW / 2, baseY);
			ctx.lineTo(pointerCenterX + pointerW / 2, baseY);
			ctx.lineTo(pointerCenterX, baseY - pointerH);
		}
		ctx.closePath();
		ctx.fillStyle = cfg.background;
		ctx.fill();
		if (cfg.borderWidth > 0) {
			// Redraw the two triangle sides (not the tooltip-adjacent base) so
			// they match the border.
			ctx.beginPath();
			if (placeAbove) {
				const baseY = boxTop + boxH;
				ctx.moveTo(pointerCenterX - pointerW / 2, baseY);
				ctx.lineTo(pointerCenterX, baseY + pointerH);
				ctx.lineTo(pointerCenterX + pointerW / 2, baseY);
			} else {
				const baseY = boxTop;
				ctx.moveTo(pointerCenterX - pointerW / 2, baseY);
				ctx.lineTo(pointerCenterX, baseY - pointerH);
				ctx.lineTo(pointerCenterX + pointerW / 2, baseY);
			}
			ctx.lineWidth = cfg.borderWidth;
			ctx.strokeStyle = cfg.borderColor;
			ctx.stroke();
		}
	}

	// Text — re-apply font because we stroked/filled in between.
	ctx.font = fontSpec;
	ctx.fillStyle = cfg.color;
	const textX = boxLeft + cfg.paddingX;
	const firstLineY = boxTop + cfg.paddingY + cfg.fontSize / 2;
	for (let i = 0; i < lines.length; i++) {
		ctx.fillText(lines[i], textX, firstLineY + i * lineStep);
	}

	ctx.restore();
}

function roundedRectPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
): void {
	const radius = Math.max(0, Math.min(r, w / 2, h / 2));
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + w - radius, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
	ctx.lineTo(x + w, y + h - radius);
	ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
	ctx.lineTo(x + radius, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

// ScaledRenderer already applies ctx.scale(pixelRatio, pixelRatio), so the
// canvas' backing-store dimensions need to be divided by the transform's x
// scale to recover CSS-pixel extents.
function getCanvasDevicePixelRatio(ctx: CanvasRenderingContext2D): number {
	const transform = ctx.getTransform();
	return transform.a || 1;
}
