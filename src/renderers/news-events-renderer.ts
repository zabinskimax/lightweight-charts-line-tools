import { NewsEventImpact, NewsEventsColors } from '../api/inews-events-api';

import { makeFont } from '../helpers/make-font';

import { Coordinate } from '../model/coordinate';
import { HitTestResult, HitTestType } from '../model/hit-test-result';
import { clusterAtPoint, iconX, NewsCluster, NewsEventItem } from '../model/news-events-layout';

import { flagImage, hasFlag } from './news-event-flags';
import { ScaledRenderer } from './scaled-renderer';

export interface NewsEventsRendererData {
	clusters: NewsCluster[];
	/**
	 * Vertical center of the icons.
	 */
	y: number;
	/**
	 * Radius of the flag inside each icon.
	 */
	radius: number;
	colors: NewsEventsColors;
	/**
	 * Chart background: fills the ring gap so candles and volume do not show through.
	 */
	background: string;
	upcomingOpacity: number;
	fontFamily: string;
	hoveredId: string | null;
	/**
	 * Icon the caller keeps highlighted, e.g. while its card is open. The guide line stays on it
	 * while other icons are hovered, so line and card never point at different icons.
	 */
	activeId: string | null;
	guideLine: boolean;
	onFlagReady: () => void;
}

/**
 * Payload of a hit on an icon; `hitTestData` is the icon's id.
 */
export interface NewsEventsHoverData {
	hitTestData: string;
}

// Shown instead of a flag for codes without one.
const currencySymbols: Map<string, string> = new Map<string, string>([
	['USD', '$'], ['EUR', '€'], ['GBP', '£'], ['JPY', '¥'], ['CHF', 'Fr'],
	['CAD', 'C$'], ['AUD', 'A$'], ['NZD', 'N$'], ['CNY', '¥'],
]);

function impactColor(colors: NewsEventsColors, impact: NewsEventImpact): string {
	return impact === 'high' ? colors.high : impact === 'medium' ? colors.medium : colors.low;
}

function circlePath(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
}

/**
 * One icon: the event's flag in a thin ring of its impact color, on a disc of `background`.
 */
// eslint-disable-next-line max-params
function drawIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	event: NewsEventItem,
	color: string,
	background: string,
	fontFamily: string,
	onFlagReady: () => void
): void {
	circlePath(ctx, x, y, radius + 2);
	ctx.fillStyle = background;
	ctx.fill();

	const image = flagImage(event.currency, onFlagReady);
	if (image !== null) {
		ctx.save();
		circlePath(ctx, x, y, radius);
		ctx.clip();
		ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
		ctx.restore();
	} else if (!hasFlag(event.currency) && event.currency.length > 0) {
		// A flag that is still decoding leaves the disc empty for a frame; a code
		// with no flag gets its symbol instead.
		const glyph = currencySymbols.get(event.currency) ?? event.currency.charAt(0);
		ctx.fillStyle = color;
		ctx.font = makeFont(Math.round(radius * (glyph.length > 1 ? 1.05 : 1.35)), fontFamily, 'bold');
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(glyph, x, y + 0.5);
	}

	circlePath(ctx, x, y, radius + 1.5);
	ctx.lineWidth = 1;
	ctx.strokeStyle = color;
	ctx.stroke();
}

// eslint-disable-next-line max-params
function drawCountBadge(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, color: string, background: string, fontFamily: string): void {
	const text = count > 9 ? '9+' : String(count);
	circlePath(ctx, x, y, 5);
	ctx.fillStyle = color;
	ctx.fill();
	ctx.lineWidth = 1;
	ctx.strokeStyle = background;
	ctx.stroke();
	ctx.fillStyle = background;
	ctx.font = makeFont(text.length > 1 ? 7 : 8, fontFamily, 'bold');
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(text, x, y + 0.5);
}

export class NewsEventsRenderer extends ScaledRenderer {
	private _data: NewsEventsRendererData | null = null;

	public setData(data: NewsEventsRendererData): void {
		this._data = data;
	}

	public hitTest(x: Coordinate, y: Coordinate): HitTestResult<NewsEventsHoverData> | null {
		const data = this._data;
		const cluster = data === null ? null : clusterAtPoint(data.clusters, data.y, data.radius, x, y);
		return cluster === null ? null : new HitTestResult<NewsEventsHoverData>(HitTestType.Custom, { hitTestData: cluster.key });
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		const data = this._data;
		if (data === null || data.clusters.length === 0) {
			return;
		}

		// Dashed guide from the active (else hovered) icon up through the bar it belongs to,
		// drawn first so the icon sits on top of it.
		const guideId = data.activeId ?? data.hoveredId;
		if (data.guideLine && guideId !== null) {
			for (const cluster of data.clusters) {
				if (cluster.key !== guideId) {
					continue;
				}
				const x = iconX(cluster);
				ctx.save();
				ctx.globalAlpha = 0.7;
				ctx.strokeStyle = impactColor(data.colors, cluster.top.impact);
				ctx.lineWidth = 1;
				ctx.setLineDash([4, 3]);
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, data.y - data.radius - 3);
				ctx.stroke();
				ctx.restore();
				break;
			}
		}

		for (const cluster of data.clusters) {
			const x = iconX(cluster);
			const color = impactColor(data.colors, cluster.top.impact);
			const highlighted = cluster.key === data.hoveredId || cluster.key === data.activeId;
			ctx.globalAlpha = cluster.upcoming && !highlighted ? data.upcomingOpacity : 1;
			drawIcon(ctx, x, data.y, data.radius, cluster.top, color, data.background, data.fontFamily, data.onFlagReady);
			if (cluster.events.length > 1) {
				drawCountBadge(ctx, x + data.radius, data.y - data.radius, cluster.events.length, color, data.background, data.fontFamily);
			}
		}
		ctx.globalAlpha = 1;
	}
}
