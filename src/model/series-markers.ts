/**
 * Represents the position of a series marker relative to a bar.
 */
export type SeriesMarkerPosition = 'aboveBar' | 'belowBar' | 'inBar' | 'price';

/**
 * Represents the shape of a series marker.
 */
export type SeriesMarkerShape = 'circle' | 'square' | 'arrowUp' | 'arrowDown' | 'triangle' | 'cross' | 'diamond' | 'star' | 'flag' | 'pin';

/**
 * Represents the anchor of a series marker.
 */
export type SeriesMarkerAnchor = 'top' | 'bottom' | 'left' | 'right' | 'center';

/**
 * Represents the stroke of a series marker.
 */
export interface SeriesMarkerStroke {
	color: string;
	width?: number;
}

/**
 * Where the tooltip sits relative to the marker.
 *
 * `auto` prefers above, flips below when clipped.
 */
export type SeriesMarkerTooltipPlacement = 'auto' | 'above' | 'below';

/**
 * Styled tooltip shown when the mouse hovers the marker.
 *
 * Pass a string for the default style, or this object to customize.
 */
export interface SeriesMarkerTooltip {
	/**
	 * Tooltip text. Split by `\n` for multi-line.
	 */
	text: string;
	/**
	 * Background color of the tooltip box.
	 *
	 * @defaultValue `'rgba(19, 23, 34, 0.92)'`
	 */
	background?: string;
	/**
	 * Text color.
	 *
	 * @defaultValue `'#ffffff'`
	 */
	color?: string;
	/**
	 * Border color.
	 *
	 * @defaultValue `'rgba(255, 255, 255, 0.08)'`
	 */
	borderColor?: string;
	/**
	 * Border width in pixels. Set `0` to disable the border.
	 *
	 * @defaultValue `1`
	 */
	borderWidth?: number;
	/**
	 * Corner radius in pixels.
	 *
	 * @defaultValue `6`
	 */
	borderRadius?: number;
	/**
	 * Font size in pixels. Defaults to the chart layout font size.
	 */
	fontSize?: number;
	/**
	 * Font family. Defaults to the chart layout font family.
	 */
	fontFamily?: string;
	/**
	 * Bold text.
	 *
	 * @defaultValue `false`
	 */
	bold?: boolean;
	/**
	 * Horizontal padding in pixels.
	 *
	 * @defaultValue `10`
	 */
	paddingX?: number;
	/**
	 * Vertical padding in pixels.
	 *
	 * @defaultValue `6`
	 */
	paddingY?: number;
	/**
	 * Line-height multiplier for multi-line text.
	 *
	 * @defaultValue `1.35`
	 */
	lineHeight?: number;
	/**
	 * Draw a subtle drop shadow behind the tooltip.
	 *
	 * @defaultValue `true`
	 */
	shadow?: boolean;
	/**
	 * Draw a small pointer triangle from the tooltip toward the marker.
	 *
	 * @defaultValue `true`
	 */
	pointer?: boolean;
	/**
	 * Placement relative to the marker.
	 *
	 * @defaultValue `'auto'`
	 */
	placement?: SeriesMarkerTooltipPlacement;
	/**
	 * Gap between the marker and the tooltip in pixels.
	 *
	 * @defaultValue `10`
	 */
	offset?: number;
}

/**
 * Represents a series marker.
 */
export interface SeriesMarker<TimeType> {
	/**
	 * The time of the marker.
	 */
	time: TimeType;
	/**
	 * The position of the marker.
	 */
	position: SeriesMarkerPosition;
	/**
	 * The shape of the marker.
	 */
	shape: SeriesMarkerShape;
	/**
	 * The color of the marker.
	 */
	color: string;
	/**
	 * The ID of the marker.
	 */
	id?: string;
	/**
	 * The optional text of the marker.
	 */
	text?: string;
	/**
	 * The optional size of the marker.
	 *
	 * @defaultValue `1`
	 */
	size?: number;
	/**
	 * The price position of the marker.
	 */
	price?: number;
	/**
	 * The anchor of the marker.
	 */
	anchor?: SeriesMarkerAnchor;
	/**
	 * The stroke of the marker.
	 */
	stroke?: SeriesMarkerStroke;
	/**
	 * The rotation of the marker.
	 */
	rotation?: number;
	/**
	 * Optional tooltip shown on hover. Pass a string for the default style,
	 * or a {@link SeriesMarkerTooltip} object to customize.
	 */
	tooltip?: string | SeriesMarkerTooltip;
}

export interface InternalSeriesMarker<TimeType> extends SeriesMarker<TimeType> {
	internalId: number;
}
