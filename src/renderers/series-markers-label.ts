import { generateContrastColors } from '../helpers/color';

import { Coordinate } from '../model/coordinate';

import { shapeSize } from './series-markers-utils';

// Vertical share of the total marker height taken by the pointer.
const POINTER_HEIGHT_RATIO = 0.22;
// Body width as a fraction of body height — the floor used for short letters
// like "D" so the label still reads as a square badge.
const MIN_BODY_WIDTH_RATIO = 0.95;
// Corner radius as a fraction of body height. The corners that meet the
// pointer's base stay sharp; the opposite-side corners are rounded.
const CORNER_RADIUS_RATIO = 0.22;
// Letter height as a fraction of body height.
const LETTER_SIZE_RATIO = 0.6;
// Horizontal padding from the body edge to the letter, in CSS pixels.
const LETTER_PADDING_X = 4;

export type LabelOrientation = 'up' | 'down';

interface LabelGeometry {
	bodyLeft: number;
	bodyRight: number;
	bodyTop: number;
	bodyBottom: number;
	pointerApexX: number;
	pointerApexY: number;
	cornerRadius: number;
	orientation: LabelOrientation;
}

interface LabelLayout {
	bodyWidth: number;
	letterPx: number;
}

interface LabelWidthCache {
	labelBodyWidth?: number;
}

function computeLabelLayout(
	ctx: CanvasRenderingContext2D,
	totalHeight: number,
	letter: string | undefined,
	fontFamily: string
): LabelLayout {
	const pointerHeight = totalHeight * POINTER_HEIGHT_RATIO;
	const bodyHeight = totalHeight - pointerHeight;
	const minBodyWidth = bodyHeight * MIN_BODY_WIDTH_RATIO;
	const letterPx = Math.max(8, Math.round(bodyHeight * LETTER_SIZE_RATIO));

	let bodyWidth = minBodyWidth;
	if (letter !== undefined && letter.length > 0) {
		// Measure with the same bold font used to draw the letter so the body
		// expansion is accurate. Restore the previous font afterwards so the
		// caller's draw context is untouched.
		const prevFont = ctx.font;
		ctx.font = `bold ${letterPx}px ${fontFamily}`;
		const textWidth = ctx.measureText(letter).width;
		ctx.font = prevFont;
		bodyWidth = Math.max(minBodyWidth, textWidth + LETTER_PADDING_X * 2);
	}
	return { bodyWidth, letterPx };
}

function labelGeometry(
	totalHeight: number,
	centerX: number,
	centerY: number,
	bodyWidth: number,
	orientation: LabelOrientation
): LabelGeometry {
	const half = totalHeight / 2;
	const pointerHeight = totalHeight * POINTER_HEIGHT_RATIO;
	let bodyTop: number;
	let bodyBottom: number;
	let pointerApexY: number;
	if (orientation === 'up') {
		// Apex at the top, body hangs below — pointer points up at whatever
		// the marker is anchored to (e.g. a bar's low when belowBar).
		bodyTop = centerY - half + pointerHeight;
		bodyBottom = centerY + half;
		pointerApexY = centerY - half;
	} else {
		// Apex at the bottom, body sits above — pointer points down at the
		// anchor (e.g. a bar's high when aboveBar).
		bodyTop = centerY - half;
		bodyBottom = centerY + half - pointerHeight;
		pointerApexY = centerY + half;
	}
	const bodyHeight = bodyBottom - bodyTop;
	return {
		bodyLeft: centerX - bodyWidth / 2,
		bodyRight: centerX + bodyWidth / 2,
		bodyTop,
		bodyBottom,
		pointerApexX: centerX,
		pointerApexY,
		cornerRadius: bodyHeight * CORNER_RADIUS_RATIO,
		orientation,
	};
}

function buildLabelPath(ctx: CanvasRenderingContext2D, g: LabelGeometry): void {
	const bodyHeight = g.bodyBottom - g.bodyTop;
	const bodyWidth = g.bodyRight - g.bodyLeft;
	const r = Math.max(0, Math.min(g.cornerRadius, bodyHeight / 2, bodyWidth / 2));

	ctx.beginPath();
	if (g.orientation === 'up') {
		// Sharp top corners (triangle base spans the body width), rounded bottom.
		ctx.moveTo(g.pointerApexX, g.pointerApexY);
		ctx.lineTo(g.bodyRight, g.bodyTop);
		ctx.lineTo(g.bodyRight, g.bodyBottom - r);
		ctx.quadraticCurveTo(g.bodyRight, g.bodyBottom, g.bodyRight - r, g.bodyBottom);
		ctx.lineTo(g.bodyLeft + r, g.bodyBottom);
		ctx.quadraticCurveTo(g.bodyLeft, g.bodyBottom, g.bodyLeft, g.bodyBottom - r);
		ctx.lineTo(g.bodyLeft, g.bodyTop);
	} else {
		// Rounded top corners, sharp bottom — the triangle hangs off the body's
		// bottom edge with apex pointing down.
		ctx.moveTo(g.bodyLeft, g.bodyTop + r);
		ctx.quadraticCurveTo(g.bodyLeft, g.bodyTop, g.bodyLeft + r, g.bodyTop);
		ctx.lineTo(g.bodyRight - r, g.bodyTop);
		ctx.quadraticCurveTo(g.bodyRight, g.bodyTop, g.bodyRight, g.bodyTop + r);
		ctx.lineTo(g.bodyRight, g.bodyBottom);
		ctx.lineTo(g.pointerApexX, g.pointerApexY);
		ctx.lineTo(g.bodyLeft, g.bodyBottom);
	}
	ctx.closePath();
}

export function drawLabel(
	ctx: CanvasRenderingContext2D,
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	letter: string | undefined,
	fontFamily: string,
	orientation: LabelOrientation,
	cache: LabelWidthCache
): void {
	const totalHeight = shapeSize('label', size);
	if (totalHeight <= 0) {
		return;
	}

	const { bodyWidth, letterPx } = computeLabelLayout(ctx, totalHeight, letter, fontFamily);
	// Stash the resolved width so hitTestLabel can use the same bounds —
	// hit-testing has no canvas context to re-measure with.
	cache.labelBodyWidth = bodyWidth;

	const g = labelGeometry(totalHeight, centerX, centerY, bodyWidth, orientation);

	buildLabelPath(ctx, g);
	ctx.fill();
	if (ctx.strokeStyle !== 'transparent') {
		ctx.stroke();
	}

	if (letter !== undefined && letter.length > 0) {
		// Pick a foreground that reads against the marker color (the current
		// fill style). `generateContrastColors` only handles strings, so fall
		// back to white for gradients/patterns.
		const fill = ctx.fillStyle;
		const foreground = typeof fill === 'string' ? generateContrastColors(fill).foreground : '#ffffff';

		const prevFont = ctx.font;
		const prevAlign = ctx.textAlign;
		const prevBaseline = ctx.textBaseline;

		ctx.font = `bold ${letterPx}px ${fontFamily}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = foreground;
		ctx.fillText(letter, centerX, (g.bodyTop + g.bodyBottom) / 2);

		ctx.fillStyle = fill;
		ctx.font = prevFont;
		ctx.textAlign = prevAlign;
		ctx.textBaseline = prevBaseline;
	}
}

export function hitTestLabel(
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	x: Coordinate,
	y: Coordinate,
	bodyWidth: number | undefined
): boolean {
	const totalHeight = shapeSize('label', size);
	if (totalHeight <= 0) {
		return false;
	}
	const half = totalHeight / 2;
	const pointerHeight = totalHeight * POINTER_HEIGHT_RATIO;
	const bodyHeight = totalHeight - pointerHeight;
	// First-frame fallback: if the draw pass hasn't measured yet, use the
	// minimum (square-badge) width so a hit test before paint still works.
	const w = bodyWidth ?? bodyHeight * MIN_BODY_WIDTH_RATIO;
	// Bounding rect spans the full marker height (apex extends in either
	// orientation). Same shortcut taken by `triangle` and `pin`.
	return x >= centerX - w / 2 && x <= centerX + w / 2 && y >= centerY - half && y <= centerY + half;
}
