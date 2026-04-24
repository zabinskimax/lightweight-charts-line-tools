import { Coordinate } from '../model/coordinate';

import { shapeSize } from './series-markers-utils';

export function drawDiamond(
	ctx: CanvasRenderingContext2D,
	centerX: Coordinate,
	centerY: Coordinate,
	size: number
): void {
	const diamondSize = shapeSize('diamond', size);
	const halfSize = (diamondSize - 1) / 2;

	ctx.beginPath();
	ctx.moveTo(centerX, centerY - halfSize);
	ctx.lineTo(centerX + halfSize, centerY);
	ctx.lineTo(centerX, centerY + halfSize);
	ctx.lineTo(centerX - halfSize, centerY);
	ctx.closePath();

	ctx.fill();
	if (ctx.strokeStyle !== 'transparent') {
		ctx.stroke();
	}
}

export function hitTestDiamond(
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	x: Coordinate,
	y: Coordinate
): boolean {
	const diamondSize = shapeSize('diamond', size);
	const halfSize = (diamondSize - 1) / 2;
	if (halfSize <= 0) {
		return false;
	}

	// Point-in-rhombus: L1 distance (scaled) to the center must be ≤ 1.
	const dx = Math.abs(x - centerX) / halfSize;
	const dy = Math.abs(y - centerY) / halfSize;

	return dx + dy <= 1;
}
