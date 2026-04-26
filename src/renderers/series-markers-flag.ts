import { Coordinate } from '../model/coordinate';

import { shapeSize } from './series-markers-utils';

// Flag proportions relative to the shape's total height. Tuned to read as a
// recognizable flag-on-pole at 12–30 px marker sizes.
const POLE_WIDTH_RATIO = 0.1;
const FLAG_WIDTH_RATIO = 0.7;
const FLAG_HEIGHT_RATIO = 0.55;

function flagGeometry(totalHeight: number, centerX: number, centerY: number): {
	poleX: number; poleTop: number; poleBottom: number; poleWidth: number;
	flagLeft: number; flagTop: number; flagWidth: number; flagHeight: number;
} {
	const half = totalHeight / 2;
	const poleWidth = Math.max(1, Math.round(totalHeight * POLE_WIDTH_RATIO));
	const poleX = centerX - poleWidth / 2;
	const poleTop = centerY - half;
	const poleBottom = centerY + half;

	const flagWidth = totalHeight * FLAG_WIDTH_RATIO;
	const flagHeight = totalHeight * FLAG_HEIGHT_RATIO;
	const flagLeft = poleX + poleWidth;
	const flagTop = poleTop;

	return { poleX, poleTop, poleBottom, poleWidth, flagLeft, flagTop, flagWidth, flagHeight };
}

export function drawFlag(
	ctx: CanvasRenderingContext2D,
	centerX: Coordinate,
	centerY: Coordinate,
	size: number
): void {
	const totalHeight = shapeSize('flag', size);
	if (totalHeight <= 0) {
		return;
	}
	const g = flagGeometry(totalHeight, centerX, centerY);

	// Pole.
	ctx.fillRect(g.poleX, g.poleTop, g.poleWidth, g.poleBottom - g.poleTop);

	// Banner.
	ctx.fillRect(g.flagLeft, g.flagTop, g.flagWidth, g.flagHeight);

	if (ctx.strokeStyle !== 'transparent') {
		ctx.strokeRect(g.poleX, g.poleTop, g.poleWidth, g.poleBottom - g.poleTop);
		ctx.strokeRect(g.flagLeft, g.flagTop, g.flagWidth, g.flagHeight);
	}
}

export function hitTestFlag(
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	x: Coordinate,
	y: Coordinate
): boolean {
	const totalHeight = shapeSize('flag', size);
	if (totalHeight <= 0) {
		return false;
	}
	const g = flagGeometry(totalHeight, centerX, centerY);

	const inPole = x >= g.poleX && x <= g.poleX + g.poleWidth && y >= g.poleTop && y <= g.poleBottom;
	const inFlag = x >= g.flagLeft && x <= g.flagLeft + g.flagWidth && y >= g.flagTop && y <= g.flagTop + g.flagHeight;

	return inPole || inFlag;
}
