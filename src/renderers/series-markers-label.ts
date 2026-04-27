import { generateContrastColors } from '../helpers/color';

import { Coordinate } from '../model/coordinate';

import { shapeSize } from './series-markers-utils';

// Vertical share of the total marker height taken by the upward pointer.
const POINTER_HEIGHT_RATIO = 0.22;
// Body width as a fraction of body height — slightly narrower than tall.
const BODY_WIDTH_RATIO = 0.95;
// Bottom-corner radius as a fraction of body height. Top corners are sharp
// because the pointer's base sits across the full body width.
const CORNER_RADIUS_RATIO = 0.22;
// Letter height as a fraction of body height — leaves a small breathing
// margin on either side.
const LETTER_SIZE_RATIO = 0.6;

interface LabelGeometry {
	bodyLeft: number;
	bodyRight: number;
	bodyTop: number;
	bodyBottom: number;
	pointerApexX: number;
	pointerApexY: number;
	cornerRadius: number;
}

function labelGeometry(totalHeight: number, centerX: number, centerY: number): LabelGeometry {
	const half = totalHeight / 2;
	const pointerHeight = totalHeight * POINTER_HEIGHT_RATIO;
	const bodyTop = centerY - half + pointerHeight;
	const bodyBottom = centerY + half;
	const bodyHeight = bodyBottom - bodyTop;
	const bodyWidth = bodyHeight * BODY_WIDTH_RATIO;
	return {
		bodyLeft: centerX - bodyWidth / 2,
		bodyRight: centerX + bodyWidth / 2,
		bodyTop,
		bodyBottom,
		pointerApexX: centerX,
		pointerApexY: centerY - half,
		cornerRadius: bodyHeight * CORNER_RADIUS_RATIO,
	};
}

function buildLabelPath(ctx: CanvasRenderingContext2D, g: LabelGeometry): void {
	const bodyHeight = g.bodyBottom - g.bodyTop;
	const bodyWidth = g.bodyRight - g.bodyLeft;
	const r = Math.max(0, Math.min(g.cornerRadius, bodyHeight / 2, bodyWidth / 2));

	// Single closed path: pointer apex → down the right side of the triangle
	// to the body's top-right corner → straight down → rounded bottom-right →
	// across to rounded bottom-left → straight up → diagonal back to apex.
	ctx.beginPath();
	ctx.moveTo(g.pointerApexX, g.pointerApexY);
	ctx.lineTo(g.bodyRight, g.bodyTop);
	ctx.lineTo(g.bodyRight, g.bodyBottom - r);
	ctx.quadraticCurveTo(g.bodyRight, g.bodyBottom, g.bodyRight - r, g.bodyBottom);
	ctx.lineTo(g.bodyLeft + r, g.bodyBottom);
	ctx.quadraticCurveTo(g.bodyLeft, g.bodyBottom, g.bodyLeft, g.bodyBottom - r);
	ctx.lineTo(g.bodyLeft, g.bodyTop);
	ctx.closePath();
}

export function drawLabel(
	ctx: CanvasRenderingContext2D,
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	letter: string | undefined,
	fontFamily: string
): void {
	const totalHeight = shapeSize('label', size);
	if (totalHeight <= 0) {
		return;
	}
	const g = labelGeometry(totalHeight, centerX, centerY);

	buildLabelPath(ctx, g);
	ctx.fill();
	if (ctx.strokeStyle !== 'transparent') {
		ctx.stroke();
	}

	if (letter !== undefined && letter.length > 0) {
		const bodyHeight = g.bodyBottom - g.bodyTop;
		const letterPx = Math.max(8, Math.round(bodyHeight * LETTER_SIZE_RATIO));

		// Pick a foreground that reads against the marker color (which is the
		// current fill style). `generateContrastColors` only takes a string,
		// so fall back to white if the fill is a gradient/pattern.
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

		// Restore so the marker stroke that runs after this draw doesn't
		// inherit the letter font / alignment. Fill is restored by the
		// renderer before each item.
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
	y: Coordinate
): boolean {
	const totalHeight = shapeSize('label', size);
	if (totalHeight <= 0) {
		return false;
	}
	const g = labelGeometry(totalHeight, centerX, centerY);
	// Bounding-rect approximation that includes the pointer apex above the
	// body. Same shortcut taken by `triangle` and `pin`.
	return x >= g.bodyLeft && x <= g.bodyRight && y >= g.pointerApexY && y <= g.bodyBottom;
}
