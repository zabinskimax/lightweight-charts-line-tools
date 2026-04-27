import { ensureNever } from '../helpers/assertions';
import { ceiledEven, ceiledOdd } from '../helpers/mathex';

import { SeriesMarkerShape } from '../model/series-markers';

const enum Constants {
	MinShapeSize = 12,
	MaxShapeSize = 30,
	MinShapeMargin = 3,
	// Default total height (px) for fixed-size shapes. Used by `label`, which
	// is intended for pattern/badge icons that should not scale with zoom.
	LabelFixedSize = 22,
}

function size(barSpacing: number, coeff: number): number {
	const result = Math.min(Math.max(barSpacing, Constants.MinShapeSize), Constants.MaxShapeSize) * coeff;
	return ceiledOdd(result);
}

export function shapeSize(shape: SeriesMarkerShape, originalSize: number): number {
	switch (shape) {
		case 'arrowDown':
		case 'arrowUp':
		case 'triangle':
		case 'star':
			return size(originalSize, 1);
		case 'circle':
			return size(originalSize, 0.8);
		case 'square':
		case 'cross':
			return size(originalSize, 0.7);
		case 'diamond':
			return size(originalSize, 0.85);
		case 'flag':
			return size(originalSize, 1.3);
		case 'pin':
			return size(originalSize, 1.2);
		case 'label':
			// Pane-view supplies the absolute label size in `originalSize`,
			// so the bar-spacing clamp in `size()` is bypassed. `ceiledOdd`
			// keeps the rendered value pixel-aligned.
			return ceiledOdd(Math.max(0, originalSize));
	}

	ensureNever(shape);
	return size(originalSize, 1);
}

export function labelFixedSize(): number {
	return Constants.LabelFixedSize;
}

export function calculateShapeHeight(barSpacing: number): number {
	return ceiledEven(size(barSpacing, 1));
}

export function shapeMargin(barSpacing: number): number {
	return Math.max(size(barSpacing, 0.1), Constants.MinShapeMargin);
}
