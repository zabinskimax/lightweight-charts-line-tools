import { TextLabelHAlign, TextLabelVAlign } from '../renderers/text-label-renderer';

import { Time } from './data-consumer';

/**
 * Options for a free-floating text label. All fields are optional on apply.
 */
export interface TextLabelOptions {
	time: Time;
	price: number;
	text: string;
	color: string;
	fontSize: number;
	fontFamily: string;
	bold: boolean;
	italic: boolean;
	horzAlign: TextLabelHAlign;
	vertAlign: TextLabelVAlign;
	backgroundColor?: string;
	paddingX: number;
	paddingY: number;
}

export type TextLabelPartialOptions = Partial<TextLabelOptions>;

/**
 * Represents the interface to control a free-floating text label.
 */
export interface ITextLabelApi {
	applyOptions(options: TextLabelPartialOptions): void;
}
