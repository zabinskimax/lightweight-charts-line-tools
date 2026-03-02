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
		const p1s = this.pointToScreenPoint(this._points[0]);
		const p2s = this.pointToScreenPoint(this._points[1]);
		const pTarget = this.pointToScreenPoint(point);

		if (p1s && p2s && pTarget) {
			const center = {
				x: (p1s.x + p2s.x) / 2,
				y: (p1s.y + p2s.y) / 2,
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
		const pDrag = this.pointToScreenPoint(point);
		if (!p1s || !p2s || !pDrag) { return; }

		const angle = this.options().emoji.angle;
		const centerX = (p1s.x + p2s.x) / 2;
		const centerY = (p1s.y + p2s.y) / 2;
		const center = new Point(centerX, centerY);

		// 1. Vector from FIXED center to mouse drag point
		const dragVector = new Point(pDrag.x - center.x, pDrag.y - center.y);
		// 2. Transformed drag vector into emoji's local (unrotated) space
		const dragLocal = this._rotateVector(dragVector, -angle);

		// 3. Symmetric resizing: center is fixed, we just update the halfSize (hs)
		const newHS = Math.max(Math.abs(dragLocal.x), Math.abs(dragLocal.y));
		if (newHS < 1) { return; }

		// 4. Determine flipping based on mouse quadrant relative to the starting handle
		// TL(0): x<0, y<0 | BR(1): x>0, y>0 | BL(2): x<0, y>0 | TR(3): x>0, y<0
		const expectedSignX = (index === 0 || index === 2) ? -1 : 1;
		const expectedSignY = (index === 0 || index === 3) ? -1 : 1;

		const currentSignX = Math.sign(dragLocal.x) || expectedSignX;
		const currentSignY = Math.sign(dragLocal.y) || expectedSignY;

		const flipH = currentSignX !== expectedSignX;
		const flipV = currentSignY !== expectedSignY;

		// 5. Update axis-aligned model points (P1/P2) centered on the fixed coordinate
		const coord1 = this.screenPointToPoint(new Point(centerX - newHS, centerY - newHS));
		const coord2 = this.screenPointToPoint(new Point(centerX + newHS, centerY + newHS));

		if (coord1 && coord2) {
			this._points[0].timestamp = coord1.timestamp;
			this._points[0].price = coord1.price;
			this._points[1].timestamp = coord2.timestamp;
			this._points[1].price = coord2.price;
			this.applyOptions({
				emoji: { flipH, flipV },
			});
			this.model().updateSource(this);
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

	private _rotateVector(v: Point, angle: number): Point {
		const s = Math.sin(angle);
		const c = Math.cos(angle);
		return new Point(v.x * c - v.y * s, v.x * s + v.y * c);
	}
}
