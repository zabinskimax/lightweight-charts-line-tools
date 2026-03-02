import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { LineToolType } from '../../model/line-tool-options';
import { Point } from '../../model/point';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { EmojiRenderer } from '../../renderers/emoji-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';

import { LineToolPaneView } from './line-tool-pane-view';

export class EmojiPaneView extends LineToolPaneView {
	protected _emojiRenderer: EmojiRenderer = new EmojiRenderer();

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	protected override _updateImpl(): void {
		const options = this._source.options() as LineToolOptionsInternal<'Emoji'>;

		if (!options.visible) {
			return;
		}

		this._renderer = null;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();
		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }

		super._updateImpl();
		if (this._points.length < 1) { return; }

		const p1 = this._points[0];
		const p2 = this._points.length >= 2 ? this._points[1] : this.currentPoint();
		if (!p2) { return; }

		this._emojiRenderer.setData({
			emoji: options.emoji,
			p1: p1,
			p2: p2,
		});

		const compositeRenderer = new CompositeRenderer();
		compositeRenderer.append(this._emojiRenderer);

        // Add rotated anchors
		this._addRotatedAnchors(p1, p2, options.emoji.angle, compositeRenderer);

		this._renderer = compositeRenderer;
	}

	private _addRotatedAnchors(p1: Point, p2: Point, angle: number, renderer: CompositeRenderer): void {
		const centerX = (p1.x + p2.x) / 2;
		const centerY = (p1.y + p2.y) / 2;
		const width = Math.abs(p2.x - p1.x);
		const height = Math.abs(p2.y - p1.y);
		const size = Math.max(width, height);

		const rotate = (x: number, y: number): Point => {
			const dx = x - centerX;
			const dy = y - centerY;
			const cos = Math.cos(angle);
			const sin = Math.sin(angle);
			return new Point(
                (centerX + dx * cos - dy * sin) as Coordinate,
                (centerY + dx * sin + dy * cos) as Coordinate
            );
		};

		const halfSize = size / 2;

        // Corners (Strictly Square relative to center)
		const tl = rotate(centerX - halfSize, centerY - halfSize);
		const br = rotate(centerX + halfSize, centerY + halfSize);
		const bl = rotate(centerX - halfSize, centerY + halfSize);
		const tr = rotate(centerX + halfSize, centerY - halfSize);

        // Rotation handle (Top Center + Offset relative to size)
		const rot = rotate(centerX, centerY - halfSize - size * 0.2);

		const anchorPoints = [
			new AnchorPoint(tl.x, tl.y, 0),
			new AnchorPoint(br.x, br.y, 1),
			new AnchorPoint(bl.x, bl.y, 2),
			new AnchorPoint(tr.x, tr.y, 3),
			new AnchorPoint(rot.x, rot.y, 8), // Index 8 for rotation
		];

		const anchorData = {
			points: anchorPoints,
		};

		renderer.append(this.createLineAnchor(anchorData, 0));
	}
}
