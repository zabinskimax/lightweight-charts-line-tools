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

		const points = [
			this.screenPointToPoint(new Point(centerX - halfSize, centerY - halfSize)), // 0: TL
			this.screenPointToPoint(new Point(centerX + halfSize, centerY + halfSize)), // 1: BR
			this.screenPointToPoint(new Point(centerX - halfSize, centerY + halfSize)), // 2: BL
			this.screenPointToPoint(new Point(centerX + halfSize, centerY - halfSize)), // 3: TR
		];

		if (index < 4) {
			const p = points[index];
			return p || start;
		}

		if (index === 8) {
			const rot = new Point(centerX, centerY - halfSize - size * 0.2);
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
		const refIndex = this._getRefIndex(index);
		const pRefPt = this.getPoint(refIndex);
		if (!pRefPt) { return; }

		const pRefScreen = this.pointToScreenPoint(pRefPt);
		const pMoveScreen = this.pointToScreenPoint(point);

		if (pRefScreen && pMoveScreen) {
			const dx = pMoveScreen.x - pRefScreen.x;
			const dy = pMoveScreen.y - pRefScreen.y;
			const size = Math.max(Math.abs(dx), Math.abs(dy));

			const pNewScreen = new Point(
                pRefScreen.x + Math.sign(dx) * size,
                pRefScreen.y + Math.sign(dy) * size
            );

			const coord = this.screenPointToPoint(pNewScreen);
			if (coord) {
				this._updatePointsFromCoord(index, coord);
				this.model().updateSource(this);
			}
		}
	}

	private _getRefIndex(index: number): number {
		switch (index) {
			case 0: return 1; // TL -> BR
			case 1: return 0; // BR -> TL
			case 2: return 3; // BL -> TR
			case 3: return 2; // TR -> BL
			default: return 1;
		}
	}

	private _updatePointsFromCoord(index: number, coord: LineToolPoint): void {
		const p1 = this._points[0];
		const p2 = this._points[1];

		const leftIdx = p1.timestamp <= p2.timestamp ? 0 : 1;
		const rightIdx = 1 - leftIdx;
		const topIdx = p1.price >= p2.price ? 0 : 1;
		const bottomIdx = 1 - topIdx;

		if (index === 0) { // TL
			this._points[leftIdx].timestamp = coord.timestamp;
			this._points[topIdx].price = coord.price;
		} else if (index === 1) { // BR
			this._points[rightIdx].timestamp = coord.timestamp;
			this._points[bottomIdx].price = coord.price;
		} else if (index === 2) { // BL
			this._points[leftIdx].timestamp = coord.timestamp;
			this._points[bottomIdx].price = coord.price;
		} else if (index === 3) { // TR
			this._points[rightIdx].timestamp = coord.timestamp;
			this._points[topIdx].price = coord.price;
		}
	}
}
