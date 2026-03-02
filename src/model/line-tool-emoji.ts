import { EmojiPaneView } from '../views/pane/emoji-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { EmojiToolOptions, LineToolType } from './line-tool-options';
import { Point } from './point';
import { UTCTimestamp } from './time-data';

export class LineToolEmoji extends LineTool<'Emoji'> {
	protected override readonly _toolType: LineToolType = 'Emoji';

	public constructor(model: ChartModel, options: EmojiToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new EmojiPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}

	public override addPoint(point: LineToolPoint): void {
		if (this._points.length === 0) {
			super.addPoint(point);
			// Auto-spawn second point with default size (50px square)
			const p1Screen = this.pointToScreenPoint(point);
			if (p1Screen) {
				const p2Screen = new Point(p1Screen.x + 50, p1Screen.y + 50);
				const p2Coord = this.screenPointToPoint(p2Screen);
				if (p2Coord) {
					super.addPoint(p2Coord);
				} else {
					super.addPoint({
						price: point.price * 0.95,
						timestamp: (point.timestamp + 86400 * 5) as UTCTimestamp,
					});
				}
			} else {
				super.addPoint({
					price: point.price * 0.95,
					timestamp: (point.timestamp + 86400 * 5) as UTCTimestamp,
				});
			}

			this.tryFinish();
			return;
		}
		super.addPoint(point);
	}

	public override setPoint(index: number, point: LineToolPoint): void {
		if (index === 8) { // Rotation
			this._rotateEmoji(point);
			return;
		}

		if (index >= 0 && index <= 3) {
			this._resizeEmoji(index, point);
			return;
		}

		super.setPoint(index, point);
	}

	public override getPoint(index: number): LineToolPoint | null {
		if (index < 2) { return super.getPoint(index); }
		return this._getAnchorPointForIndex(index);
	}

	protected _getAnchorPointForIndex(index: number): LineToolPoint {
		const start = this.points()[0];
		const end = this.points()[1];

		const p1s = this.pointToScreenPoint(start);
		const p2s = this.pointToScreenPoint(end);

		if (!p1s || !p2s) { return start; }

		const centerX = (p1s.x + p2s.x) / 2;
		const centerY = (p1s.y + p2s.y) / 2;
		const width = Math.abs(p2s.x - p1s.x);
		const height = Math.abs(p2s.y - p1s.y);
		const size = Math.max(width, height);
		const halfSize = size / 2;

		const angle = this.options().emoji.angle;
		const center = new Point(centerX, centerY);

		const points = [
			this._rotatePoint(new Point(centerX - halfSize, centerY - halfSize), center, angle), // 0: TL
			this._rotatePoint(new Point(centerX + halfSize, centerY + halfSize), center, angle), // 1: BR
			this._rotatePoint(new Point(centerX - halfSize, centerY + halfSize), center, angle), // 2: BL
			this._rotatePoint(new Point(centerX + halfSize, centerY - halfSize), center, angle), // 3: TR
		];

		if (index < 4) {
			const p = this.screenPointToPoint(points[index]);
			return p || start;
		}

		if (index === 8) {
			const rotRelative = new Point(centerX, centerY - halfSize - size * 0.2);
			const rot = this._rotatePoint(rotRelative, center, angle);
			const p = this.screenPointToPoint(rot);
			return p || start;
		}

		return start;
	}

	private _rotateEmoji(point: LineToolPoint): void {
		const p1 = this.pointToScreenPoint(this._points[0]);
		const p2 = this.pointToScreenPoint(this._points[1]);
		const pTarget = this.pointToScreenPoint(point);

		if (p1 && p2 && pTarget) {
			const center = {
				x: (p1.x + p2.x) / 2,
				y: (p1.y + p2.y) / 2,
			};
			const angle = Math.atan2(pTarget.y - center.y, pTarget.x - center.x) + Math.PI / 2;
			this.applyOptions({
				emoji: { angle: angle },
			});
		}
	}

	private _resizeEmoji(index: number, point: LineToolPoint): void {
		const p1s = this.pointToScreenPoint(this._points[0]);
		const p2s = this.pointToScreenPoint(this._points[1]);
		const pMoveScreen = this.pointToScreenPoint(point);
		if (!p1s || !p2s || !pMoveScreen) { return; }

		const centerX = (p1s.x + p2s.x) / 2;
		const centerY = (p1s.y + p2s.y) / 2;
		const center = new Point(centerX, centerY);
		const angle = this.options().emoji.angle;

		// Rotate mouse coordinate into "unrotated space" relative to center
		const pMoveLocal = this._rotatePoint(pMoveScreen, center, -angle);

		// Reference point (opposite corner) in unrotated space is static relative to old bounds
		// Since we always enforce Square, we can derive it from the unrotated P1/P2
		const width = Math.abs(p2s.x - p1s.x);
		const height = Math.abs(p2s.y - p1s.y);
		const halfSize = Math.max(width, height) / 2;

		const refUnrotated = this._getRefUnrotated(index, centerX, centerY, halfSize);
		const dx = pMoveLocal.x - refUnrotated.x;
		const dy = pMoveLocal.y - refUnrotated.y;
		const newSize = Math.max(Math.abs(dx), Math.abs(dy));

		// New axis-aligned corners in unrotated space
		const newHalfSize = newSize / 2;
		const newCenterLocal = new Point(
			refUnrotated.x + (Math.sign(dx) || 1) * newHalfSize,
			refUnrotated.y + (Math.sign(dy) || 1) * newHalfSize
		);

		// Transform back to screen space and finally to coordinates
		// To keep P1/P2 simple, we treat them as the TL/BR corners of the unrotated box
		const p1NewLocal = new Point(newCenterLocal.x - newHalfSize, newCenterLocal.y - newHalfSize);
		const p2NewLocal = new Point(newCenterLocal.x + newHalfSize, newCenterLocal.y + newHalfSize);

		// Important: LineTool P1/P2 are axis-aligned logically.
		// We update them so the unrotated box is consistent with the new size/center.
		// These points need to be rotated by 'angle' back to world space? No,
		// the renderer handles rotation. We just update the unit metrics.
		const coord1 = this.screenPointToPoint(p1NewLocal);
		const coord2 = this.screenPointToPoint(p2NewLocal);

		if (coord1 && coord2) {
			this._points[0].timestamp = coord1.timestamp;
			this._points[0].price = coord1.price;
			this._points[1].timestamp = coord2.timestamp;
			this._points[1].price = coord2.price;
			this.model().updateSource(this);
		}
	}

	private _getRefUnrotated(index: number, cx: number, cy: number, hs: number): Point {
		switch (index) {
			case 0: return new Point(cx + hs, cy + hs); // TL -> BR
			case 1: return new Point(cx - hs, cy - hs); // BR -> TL
			case 2: return new Point(cx + hs, cy - hs); // BL -> TR
			case 3: return new Point(cx - hs, cy + hs); // TR -> BL
			default: return new Point(cx + hs, cy + hs);
		}
	}

	private _rotatePoint(p: Point, center: Point, angle: number): Point {
		const s = Math.sin(angle);
		const c = Math.cos(angle);

		const px = p.x - center.x;
		const py = p.y - center.y;

		const nx = px * c - py * s;
		const ny = px * s + py * c;

		return new Point(nx + center.x, ny + center.y);
	}
}
