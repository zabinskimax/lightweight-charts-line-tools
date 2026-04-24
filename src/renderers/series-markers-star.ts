import { Coordinate } from '../model/coordinate';

import { shapeSize } from './series-markers-utils';

const STAR_POINTS = 5;
// Inner radius as a fraction of the outer radius. 0.4 matches the canonical
// "favorite" star proportions.
const STAR_INNER_RATIO = 0.4;

export function drawStar(
	ctx: CanvasRenderingContext2D,
	centerX: Coordinate,
	centerY: Coordinate,
	size: number
): void {
	const starSize = shapeSize('star', size);
	const outerR = (starSize - 1) / 2;
	if (outerR <= 0) {
		return;
	}
	const innerR = outerR * STAR_INNER_RATIO;

	ctx.beginPath();
	for (let i = 0; i < STAR_POINTS * 2; i++) {
		const r = i % 2 === 0 ? outerR : innerR;
		// Start at the top point (-π/2) and step around clockwise.
		const angle = -Math.PI / 2 + (i * Math.PI) / STAR_POINTS;
		const px = centerX + Math.cos(angle) * r;
		const py = centerY + Math.sin(angle) * r;
		if (i === 0) {
			ctx.moveTo(px, py);
		} else {
			ctx.lineTo(px, py);
		}
	}
	ctx.closePath();

	ctx.fill();
	if (ctx.strokeStyle !== 'transparent') {
		ctx.stroke();
	}
}

export function hitTestStar(
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	x: Coordinate,
	y: Coordinate
): boolean {
	// Approximate with the outer circle. False-positives at the concavities
	// are sub-pixel noise at normal marker sizes.
	const starSize = shapeSize('star', size);
	const outerR = (starSize - 1) / 2;
	const dx = x - centerX;
	const dy = y - centerY;

	return dx * dx + dy * dy <= outerR * outerR;
}
