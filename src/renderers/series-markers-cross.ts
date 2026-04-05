import { Coordinate } from '../model/coordinate';

import { shapeSize } from './series-markers-utils';

export function drawCross(
	ctx: CanvasRenderingContext2D,
	centerX: Coordinate,
	centerY: Coordinate,
	size: number
): void {
	const crossSize = shapeSize('cross', size);
	const halfSize = (crossSize - 1) / 2;
	const thickness = Math.max(Math.round(crossSize * 0.3), 3);
	const halfThickness = thickness / 2;

	ctx.beginPath();
	// Horizontal bar
	ctx.rect(centerX - halfSize, centerY - halfThickness, crossSize, thickness);
	// Vertical bar
	ctx.rect(centerX - halfThickness, centerY - halfSize, thickness, crossSize);
	ctx.fill();

	if (ctx.strokeStyle !== 'transparent') {
		ctx.stroke();
	}
}

export function hitTestCross(
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	x: Coordinate,
	y: Coordinate
): boolean {
	const crossSize = shapeSize('cross', size);
	const halfSize = (crossSize - 1) / 2;
	const thickness = Math.max(Math.round(crossSize * 0.3), 3);
	const halfThickness = thickness / 2;

	// Hit if within horizontal or vertical bar
	const inHorizontal = x >= centerX - halfSize && x <= centerX + halfSize &&
		y >= centerY - halfThickness && y <= centerY + halfThickness;
	const inVertical = x >= centerX - halfThickness && x <= centerX + halfThickness &&
		y >= centerY - halfSize && y <= centerY + halfSize;

	return inHorizontal || inVertical;
}
