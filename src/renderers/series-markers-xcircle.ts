import { Coordinate } from '../model/coordinate';

import { shapeSize } from './series-markers-utils';

const STROKE_WIDTH = 1.75;
// Half-extent of the X arms as a fraction of the circle's radius. Smaller
// values pull the X further inside the circle, away from the outline.
const X_ARM_RATIO = 0.5;

export function drawXCircle(
	ctx: CanvasRenderingContext2D,
	centerX: Coordinate,
	centerY: Coordinate,
	size: number
): void {
	const total = shapeSize('xCircle', size);
	if (total <= 0) {
		return;
	}
	// Pull the radius in by half the stroke width so the outline fits inside
	// the marker's bounding square without clipping.
	const r = (total - STROKE_WIDTH) / 2;

	const fill = ctx.fillStyle;
	const prevStroke = ctx.strokeStyle;
	const prevWidth = ctx.lineWidth;
	const prevCap = ctx.lineCap;
	const colorStroke = typeof fill === 'string' ? fill : '#dc3545';

	ctx.strokeStyle = colorStroke;
	ctx.lineWidth = STROKE_WIDTH;
	ctx.lineCap = 'round';

	// Circle outline.
	ctx.beginPath();
	ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
	ctx.stroke();

	// X — two diagonals. Drawing as primitives instead of a font glyph keeps
	// the strokes pixel-aligned and consistent with the circle outline.
	const arm = r * X_ARM_RATIO;
	ctx.beginPath();
	ctx.moveTo(centerX - arm, centerY - arm);
	ctx.lineTo(centerX + arm, centerY + arm);
	ctx.moveTo(centerX + arm, centerY - arm);
	ctx.lineTo(centerX - arm, centerY + arm);
	ctx.stroke();

	ctx.strokeStyle = prevStroke;
	ctx.lineWidth = prevWidth;
	ctx.lineCap = prevCap;
}

export function hitTestXCircle(
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	x: Coordinate,
	y: Coordinate
): boolean {
	const total = shapeSize('xCircle', size);
	if (total <= 0) {
		return false;
	}
	const r = total / 2;
	const dx = (x as number) - centerX;
	const dy = (y as number) - centerY;
	return dx * dx + dy * dy <= r * r;
}
