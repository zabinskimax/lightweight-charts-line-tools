import { LineStyle, LineWidth } from '../renderers/draw-line';
import { PriceLevelMarkerShape } from '../renderers/price-level-marker-renderer';

import { Time } from './data-consumer';

export interface PriceLevelMarkerOptions {
	time: Time;
	price: number;
	/** Optional custom label text. Defaults to formatted price. */
	text?: string;
	/** Fill color for the marker, line, and label pill. */
	color: string;
	/** Text color inside the label pill. */
	textColor: string;
	/** Shape of the anchor marker. */
	shape: PriceLevelMarkerShape;
	/** Size of the anchor marker in pixels. */
	markerSize: number;
	showLine: boolean;
	showLabel: boolean;
	lineStyle: LineStyle;
	lineWidth: LineWidth;
	fontSize: number;
	fontFamily: string;
	bold: boolean;
	labelPaddingX: number;
	labelPaddingY: number;
	/** Size of the leftward-pointing tail on the label. */
	labelTailSize: number;
}

export type PriceLevelMarkerPartialOptions = Partial<PriceLevelMarkerOptions>;

export interface IPriceLevelMarkerApi {
	applyOptions(options: PriceLevelMarkerPartialOptions): void;
}
