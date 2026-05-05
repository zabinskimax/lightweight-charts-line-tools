import { Coordinate } from '../model/coordinate';

import { shapeSize } from './series-markers-utils';

// Triangle height as a fraction of total height — leaves a small visual
// margin so the stroke doesn't bleed against the marker's bounding box.
const TRIANGLE_HEIGHT_RATIO = 0.92;
// Stroke width in CSS pixels for the triangle outline and exclamation mark.
const STROKE_WIDTH = 1.75;
// Vertex radius as a fraction of triangle height. Geometry-rounded — each
// corner of the path is pulled back by this distance and joined with a
// quadratic curve, so the rounding is visible at any stroke width.
const CORNER_RADIUS_RATIO = 0.18;
// Vertical extent of the exclamation bar as a fraction of total height.
const BAR_HEIGHT_RATIO = 0.28;
// Diameter of the exclamation dot as a fraction of total height.
const DOT_DIAMETER_RATIO = 0.11;

function tracePolygonRounded(
	ctx: CanvasRenderingContext2D,
	vertices: readonly (readonly [number, number])[],
	radius: number
): void {
	const n = vertices.length;
	ctx.beginPath();
	for (let i = 0; i < n; i++) {
		const prev = vertices[(i + n - 1) % n];
		const curr = vertices[i];
		const next = vertices[(i + 1) % n];

		// Vector from current vertex toward previous, normalized → entry
		// point on the incoming edge, pulled back by `radius`.
		const dxIn = prev[0] - curr[0];
		const dyIn = prev[1] - curr[1];
		const lenIn = Math.hypot(dxIn, dyIn) || 1;
		const r = Math.min(radius, lenIn / 2);
		const inX = curr[0] + (dxIn / lenIn) * r;
		const inY = curr[1] + (dyIn / lenIn) * r;

		// Same for the outgoing edge.
		const dxOut = next[0] - curr[0];
		const dyOut = next[1] - curr[1];
		const lenOut = Math.hypot(dxOut, dyOut) || 1;
		const rOut = Math.min(radius, lenOut / 2);
		const outX = curr[0] + (dxOut / lenOut) * rOut;
		const outY = curr[1] + (dyOut / lenOut) * rOut;

		if (i === 0) {
			ctx.moveTo(inX, inY);
		} else {
			ctx.lineTo(inX, inY);
		}
		// Round the vertex with a quadratic curve through it.
		ctx.quadraticCurveTo(curr[0], curr[1], outX, outY);
	}
	ctx.closePath();
}

export function drawWarning(
	ctx: CanvasRenderingContext2D,
	centerX: Coordinate,
	centerY: Coordinate,
	size: number
): void {
	const total = shapeSize('warning', size);
	if (total <= 0) {
		return;
	}

	const half = total / 2;
	const triHeight = total * TRIANGLE_HEIGHT_RATIO;
	// Equilateral-ish: half-base = height * tan(30°). Slightly squat so the
	// "!" has room without crowding the apex.
	const triHalfBase = triHeight * Math.tan(Math.PI / 6);
	const apexY = centerY - half + (total - triHeight) / 2;
	const baseY = apexY + triHeight;
	// Centroid of an equilateral triangle is 2/3 from apex along the median.
	const centroidY = apexY + triHeight * 2 / 3;

	// `marker.color` arrives via fillStyle; mirror it onto strokeStyle so the
	// outline picks up the user's color. Restore at the end so the renderer's
	// stroke state for downstream items isn't disturbed.
	const fill = ctx.fillStyle;
	const prevStroke = ctx.strokeStyle;
	const prevWidth = ctx.lineWidth;
	const prevJoin = ctx.lineJoin;
	const prevCap = ctx.lineCap;
	const colorStroke = typeof fill === 'string' ? fill : '#ff8800';

	ctx.strokeStyle = colorStroke;
	ctx.lineWidth = STROKE_WIDTH;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	// Triangle outline with geometry-rounded corners.
	const cornerRadius = triHeight * CORNER_RADIUS_RATIO;
	tracePolygonRounded(
		ctx,
		[
			[centerX, apexY],
			[centerX + triHalfBase, baseY],
			[centerX - triHalfBase, baseY],
		],
		cornerRadius
	);
	ctx.stroke();

	// Exclamation: vertical bar + dot below it. Bar centered on the centroid,
	// dot one stroke-width gap below the bar.
	const barH = total * BAR_HEIGHT_RATIO;
	const dotR = total * DOT_DIAMETER_RATIO / 2;
	const gap = STROKE_WIDTH;
	const barTop = centroidY - barH / 2 - dotR / 2;
	const barBottom = barTop + barH;
	const dotCY = barBottom + gap + dotR;

	ctx.beginPath();
	ctx.moveTo(centerX, barTop);
	ctx.lineTo(centerX, barBottom);
	ctx.stroke();

	ctx.beginPath();
	ctx.arc(centerX, dotCY, dotR, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = prevStroke;
	ctx.lineWidth = prevWidth;
	ctx.lineJoin = prevJoin;
	ctx.lineCap = prevCap;
}

export function hitTestWarning(
	centerX: Coordinate,
	centerY: Coordinate,
	size: number,
	x: Coordinate,
	y: Coordinate
): boolean {
	const total = shapeSize('warning', size);
	if (total <= 0) {
		return false;
	}
	const half = total / 2;
	// Bounding-square approximation, same shortcut taken by `triangle` and
	// `pin`. Triangle-precise hit-testing isn't worth the math at icon sizes.
	return x >= centerX - half && x <= centerX + half && y >= centerY - half && y <= centerY + half;
}
