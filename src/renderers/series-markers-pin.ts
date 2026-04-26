import { Coordinate } from '../model/coordinate';

import { hitTestSquare } from './series-markers-square';
import { shapeSize } from './series-markers-utils';

// Pin proportions. The head occupies the upper portion; the tip sits at the
// bottom of the shape's vertical extent.
const HEAD_RADIUS_RATIO = 0.35;

export function drawPin(
	ctx: CanvasRenderingContext2D,
	centerX: Coordinate,
	centerY: Coordinate,
	size: number
): void {
	const pinSize = shapeSize('pin', size);
	if (pinSize <= 0) {
		return;
	}
	const half = (pinSize - 1) / 2;
	const headR = pinSize * HEAD_RADIUS_RATIO;
	const headCY = centerY - half + headR;
	const tipY = centerY + half;

	// Outline path: left side of head → curve down to tip → curve up to right
	// side of head → arc back across the top. Quadratic control points sit
	// just below the head to give the neck a natural taper.
	const neckControlOffsetY = headR * 1.2;
	const leftNeckX = centerX - headR * 0.55;
	const rightNeckX = centerX + headR * 0.55;

	ctx.beginPath();
	ctx.moveTo(centerX - headR, headCY);
	ctx.quadraticCurveTo(leftNeckX, headCY + neckControlOffsetY, centerX, tipY);
	ctx.quadraticCurveTo(rightNeckX, headCY + neckControlOffsetY, centerX + headR, headCY);
	ctx.arc(centerX, headCY, headR, 0, Math.PI, true);
	ctx.closePath();

	ctx.fill();
	if (ctx.strokeStyle !== 'transparent') {
		ctx.stroke();
	}
}

export function hitTestPin(
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	x: Coordinate,
	y: Coordinate
): boolean {
	// Bounding-square approximation — same shortcut `triangle` takes. Precise
	// teardrop hit-testing is possible but adds math for little user-facing
	// gain at typical marker sizes.
	return hitTestSquare(centerX, centerY, size, x, y);
}
