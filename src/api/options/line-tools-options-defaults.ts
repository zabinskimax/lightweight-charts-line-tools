/* eslint-disable @typescript-eslint/tslint/config */
/* eslint-disable @typescript-eslint/naming-convention */
import { applyAlpha } from '../../helpers/color';
import { defaultFontFamily } from '../../helpers/make-font';
import { clone, merge } from '../../helpers/strict-type-checks';

import { BoxHorizontalAlignment, BoxVerticalAlignment, BrushToolOptions, CalloutToolOptions, CircleToolOptions, CrossLineToolOptions, CyclicLinesToolOptions, DateRangeToolOptions, EllipseToolOptions, FibCirclesToolOptions, FibRetracementLevel, FibRetracementToolOptions, FibSpiralToolOptions, FixedRangeVolumeProfileToolOptions, GannBoxToolOptions, GannFanToolOptions, HighlighterToolOptions, HorizontalLineToolOptions, LineJoin, LongShortPositionToolOptions, MarketDepthToolOptions, ParallelChannelToolOptions, PathToolOptions, PatternToolOptions, PitchforkToolOptions, PriceLabelToolOptions, PriceRangeToolOptions, RectangleToolOptions, TextAlignment, TextOptions, TextToolOptions, TradeEntryLineToolOptions, TradePendingOrderLineToolOptions, TradeStopLossLineToolOptions, TradeTakeProfitLineToolOptions, TrendLineToolOptions, TriangleToolOptions, VerticalLineToolOptions, TrendBasedFibExtensionToolOptions, FibChannelToolOptions, FibTimeZoneToolOptions, FibSpeedResistanceFanToolOptions, TrendBasedFibTimeToolOptions, FibWedgeToolOptions, PitchfanToolOptions, FibSpeedResistanceArcsToolOptions, EmojiToolOptions, VisibleRangeVolumeProfileToolOptions } from '../../model/line-tool-options';

import { LineEnd, LineStyle } from '../..';

export const TextDefaults: TextOptions = {
	value: '',
	padding: 0,
	wordWrapWidth: 0,
	forceTextAlign: false,
	forceCalculateMaxLineWidth: false,
	alignment: TextAlignment.Left,
	font: { family: defaultFontFamily, color: '#2962ff', size: 12, bold: false, italic: false },
	box: { scale: 1, angle: 0, alignment: { vertical: BoxVerticalAlignment.Top, horizontal: BoxHorizontalAlignment.Left } },
};

export const TrendLineOptionDefaults: TrendLineToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: {
		width: 1,
		color: '#2962ff',
		style: LineStyle.Solid,
		extend: { left: false, right: false },
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
	text: TextDefaults,
};

export const CalloutOptionDefaults: CalloutToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: {
		width: 2,
		color: 'rgba(74,144,226,1)',
		style: LineStyle.Solid,
		extend: { left: false, right: false },
		end: { left: LineEnd.Arrow, right: LineEnd.Normal },
	},
	text: {
		value: 'this is some text',
		padding: 0,
		wordWrapWidth: 150,
		forceTextAlign: false,
		forceCalculateMaxLineWidth: true,
		alignment: TextAlignment.Left,
		font: {
			family: defaultFontFamily,
			color: 'rgba(255,255,255,1)',
			size: 14,
			bold: false,
			italic: false,
		},
		box: {
			scale: 1,
			angle: 0,
			alignment: {
				vertical: BoxVerticalAlignment.Middle,
				horizontal: BoxHorizontalAlignment.Center,
			},
			offset: {
				x: 0,
				y: 0,
			},
			padding: {
				x: 0,
				y: 0,
			},
			maxHeight: 500,
			shadow: {
				blur: 0,
				color: 'rgba(255,255,255,1)',
				offset: {
					x: 0,
					y: 0,
				},
			},
			border: {
				color: 'rgba(74,144,226,1)',
				width: 4,
				radius: 20,
				highlight: false,
				style: 0,
			},
			background: {
				color: 'rgba(19,73,133,1)',
				inflation: {
					x: 10,
					y: 10,
				},
			},
		},
	},
};

export const HorizontalLineOptionDefaults: HorizontalLineToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: {
		width: 1,
		color: '#2962ff',
		style: LineStyle.Solid,
		extend: { left: true, right: true },
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
	text: TextDefaults,
};

export const TradeEntryLineOptionDefaults: TradeEntryLineToolOptions = {
	visible: true,
	editable: true,
	// Entry is historical — non-draggable. Drag check in line-tool-pane-view
	// short-circuits on `locked`, so this alone is enough to make it fixed.
	locked: true,
	tradeId: '',
	labelText: 'Entry',
	valueText: '',
	isActive: true,
	pillAlignment: BoxHorizontalAlignment.Right,
	pillOffsetX: -12,
	pillPaddingX: 10,
	pillPaddingY: 4,
	showCloseButton: true,
	showSpawnTP: true,
	showSpawnSL: true,
	line: {
		width: 2,
		color: '#2962FF',
		style: LineStyle.Solid,
		extend: { left: true, right: true },
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
	text: clone(TextDefaults),
};

export const TradeTakeProfitLineOptionDefaults: TradeTakeProfitLineToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	tradeId: '',
	labelText: 'TP',
	valueText: '',
	isActive: true,
	pillAlignment: BoxHorizontalAlignment.Right,
	pillOffsetX: -12,
	pillPaddingX: 10,
	pillPaddingY: 4,
	showCloseButton: false,
	showSpawnTP: false,
	showSpawnSL: false,
	line: {
		width: 2,
		color: '#26A69A',
		style: LineStyle.Dashed,
		extend: { left: true, right: true },
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
	text: clone(TextDefaults),
};

export const TradePendingOrderLineOptionDefaults: TradePendingOrderLineToolOptions = {
	visible: true,
	editable: true,
	// Pending orders are draggable so the user can adjust the trigger price.
	locked: false,
	tradeId: '',
	labelText: 'Order',
	valueText: '',
	isActive: true,
	pillAlignment: BoxHorizontalAlignment.Right,
	pillOffsetX: -12,
	pillPaddingX: 10,
	pillPaddingY: 4,
	// Same affordances as the Entry line — typical workflow is to place TP/SL
	// around the order before it fills. Hide via applyOptions once your app
	// has created the TP/SL tools.
	showCloseButton: true,
	showSpawnTP: true,
	showSpawnSL: true,
	line: {
		width: 2,
		color: '#FB8C00',
		style: LineStyle.Dashed,
		extend: { left: true, right: true },
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
	text: clone(TextDefaults),
};

export const TradeStopLossLineOptionDefaults: TradeStopLossLineToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	tradeId: '',
	labelText: 'SL',
	valueText: '',
	isActive: true,
	pillAlignment: BoxHorizontalAlignment.Right,
	pillOffsetX: -12,
	pillPaddingX: 10,
	pillPaddingY: 4,
	showCloseButton: false,
	showSpawnTP: false,
	showSpawnSL: false,
	line: {
		width: 2,
		color: '#EF5350',
		style: LineStyle.Dashed,
		extend: { left: true, right: true },
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
	text: clone(TextDefaults),
};

export const ParallelChannelOptionDefaults: ParallelChannelToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	showMiddleLine: true,
	extend: { left: false, right: false },
	background: { color: applyAlpha('#2962ff', 0.2) },
	middleLine: { width: 1, color: '#2962ff', style: LineStyle.Dashed },
	channelLine: { width: 1, color: '#2962ff', style: LineStyle.Solid },
};

const FibTimeZoneLevels: FibRetracementLevel[] = [
	{ color: '#787b86', coeff: 0, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#f23645', coeff: 1, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#81c784', coeff: 2, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#4caf50', coeff: 3, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#089981', coeff: 5, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#64b5f6', coeff: 8, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#787b86', coeff: 13, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#2962ff', coeff: 21, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#f23645', coeff: 34, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#9c27b0', coeff: 55, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	{ color: '#e91e63', coeff: 89, opacity: 0.2, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
];

export const FibRetracementOptionDefaults: FibRetracementToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	extend: { left: false, right: false },
	line: { width: 1, style: LineStyle.Solid },
	levels: [
		{ color: '#787b86', coeff: 0, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#f23645', coeff: 0.236, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#81c784', coeff: 0.382, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#4caf50', coeff: 0.5, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#089981', coeff: 0.618, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#64b5f6', coeff: 0.786, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#787b86', coeff: 1, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#2962ff', coeff: 1.618, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#f23645', coeff: 2.618, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#9c27b0', coeff: 3.618, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#e91e63', coeff: 4.236, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	],
	tradeStrategy: {
		enabled: false,
		longOrShort: '',
		fibBracketOrders: [
			{
				uniqueId: null,
				conditionLevelCoeff: null,
				conditionLevelPrice: 0,
				entryLevelCoeff: null,
				entryLevelPrice: 0,
				stopMethod: 'fib',
				stopLevelCoeff: null,
				stopPriceInput: null,
				stopPointsInput: null,
				finalStopPrice: 0,
				ptMethod: 'fib',
				ptLevelCoeff: null,
				ptPriceInput: null,
				ptPointsInput: null,
				finalPtPrice: 0,
				isMoveStopToEnabled: false,
				moveStopToMethod: 'fib',
				moveStopToLevelCoeff: null,
				moveStopToPriceInput: null,
				moveStopToPointsInput: null,
				finalMoveStopToPrice: 0,
				triggerBracketUniqueId: null,
			},
		],
	},
};

export const BrushOptionDefaults: BrushToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: {
		width: 1,
		color: '#00bcd4',
		join: LineJoin.Round,
		style: LineStyle.Solid,
		end: { left: LineEnd.Normal, right: LineEnd.Normal },
	},
};

export const RectangleOptionDefaults: RectangleToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	rectangle: {
		extend: { left: false, right: false, up: false, down: false },
		background: { color: applyAlpha('#9c27b0', 0.2) },
		border: { width: 1, style: LineStyle.Solid, color: '#9c27b0' },
	},
	text: TextDefaults,
};

export const LongShortPositionOptionDefaults: LongShortPositionToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	showAutoText: true,
	entryStopLossRectangle: {
		background: { color: applyAlpha('red', 0.2) },
		border: { width: 1, style: LineStyle.Solid, color: 'red' },
		extend: { left: false, right: false, up: false, down: false },
	},
	entryTpRectangle: {
		background: { color: applyAlpha('green', 0.2) },
		border: { width: 1, style: LineStyle.Solid, color: 'green' },
		extend: { left: false, right: false, up: false, down: false },
	},
	entryStopLossText: clone(TextDefaults),
	entryTpText: clone(TextDefaults),
};

export const CircleOptionDefaults: CircleToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	circle: {
		extend: { left: false, right: false },
		background: { color: applyAlpha('#9c27b0', 0.2) },
		border: { width: 1, style: LineStyle.Solid, color: '#9c27b0' },
	},
	text: TextDefaults,
};

export const PriceRangeOptionDefaults: PriceRangeToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	priceRange: {
		extend: { left: false, right: false },
		background: { color: applyAlpha('#9c27b0', 0.2) },
		border: { width: 1, style: LineStyle.Solid, color: '#9c27b0' },
		showCenterHorizontalLine: true,
		showCenterVerticalLine: true,
		centerHorizontalLineWidth: 1,
		centerHorizontalLineStyle: LineStyle.Dotted,
	},
	text: TextDefaults,
};

export const MarketDepthOptionDefaults: MarketDepthToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	marketDepth: {
		lineWidth: 1,
		lineStyle: LineStyle.Solid,
		lineOffset: 30,
		lineLength: 300,
		lineBidColor: applyAlpha('#2a7a81', 1),
		lineAskColor: applyAlpha('#d24949', 1),
		timestampStartOffset: 50,
		totalBidAskCalcMethod: 'combined',
		marketDepthData: {
			Bids: [],
			Asks: [],
		},
	},
	text: TextDefaults,
};

export const TriangleOptionDefaults: TriangleToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	triangle: {
		background: { color: applyAlpha('#f57c00', 0.2) },
		border: { width: 1, style: LineStyle.Solid, color: '#f57c00' },
	},
	text: TextDefaults,
};

export const VerticalLineOptionDefaults: VerticalLineToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	text: TextDefaults,
	line: { width: 1, color: '#2962ff', style: LineStyle.Solid },
};

export const PathOptionDefaults: PathToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: {
		width: 1,
		color: '#2962ff',
		style: LineStyle.Solid,
		end: { left: LineEnd.Normal, right: LineEnd.Arrow },
	},
};

export const CrossLineOptionDefaults: CrossLineToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: { width: 1, color: '#2962ff', style: LineStyle.Solid },
};

export const HighlighterOptionDefaults: HighlighterToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: { color: applyAlpha('#f23645', 0.15) },
};

export const TextOptionDefaults: TextToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	text: merge(clone(TextDefaults), { value: 'Text' }) as TextOptions,
};

export const EmojiOptionDefaults: EmojiToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	emoji: {
		value: '😀',
		angle: 0,
		flipH: false,
		flipV: false,
	},
};

export const TrendBasedFibExtensionOptionDefaults: TrendBasedFibExtensionToolOptions = clone(FibRetracementOptionDefaults);
export const FibChannelOptionDefaults: FibChannelToolOptions = clone(FibRetracementOptionDefaults);
export const FibTimeZoneOptionDefaults: FibTimeZoneToolOptions = merge(clone(FibRetracementOptionDefaults), { levels: FibTimeZoneLevels, extend: { left: false, right: false } }) as unknown as FibTimeZoneToolOptions;
export const FibSpeedResistanceFanOptionDefaults: FibSpeedResistanceFanToolOptions = merge(clone(FibRetracementOptionDefaults), { extend: { left: false, right: false } }) as unknown as FibSpeedResistanceFanToolOptions;
export const TrendBasedFibTimeOptionDefaults: TrendBasedFibTimeToolOptions = merge(clone(FibRetracementOptionDefaults), {
	levels: FibRetracementOptionDefaults.levels.map((l: FibRetracementLevel) => merge(clone(l), { opacity: 0.2 })),
	extend: { left: false, right: false },
}) as unknown as TrendBasedFibTimeToolOptions;
export const FibCirclesOptionDefaults: FibCirclesToolOptions = merge(clone(FibRetracementOptionDefaults), { extend: { left: false, right: false } }) as unknown as FibCirclesToolOptions;
export const FibSpiralOptionDefaults: FibSpiralToolOptions = merge(clone(FibRetracementOptionDefaults), { extend: { left: false, right: false } }) as unknown as FibSpiralToolOptions;
export const FibSpeedResistanceArcsOptionDefaults: FibSpeedResistanceArcsToolOptions = merge(clone(FibRetracementOptionDefaults), { extend: { left: false, right: false } }) as unknown as FibSpeedResistanceArcsToolOptions;
export const FibWedgeOptionDefaults: FibWedgeToolOptions = merge(clone(FibRetracementOptionDefaults), { extend: { left: false, right: false } }) as unknown as FibWedgeToolOptions;
export const PitchfanOptionDefaults: PitchfanToolOptions = merge(clone(FibRetracementOptionDefaults), { extend: { left: false, right: false } }) as unknown as PitchfanToolOptions;

export const TrendAngleOptionDefaults: TrendLineToolOptions = merge(clone(TrendLineOptionDefaults), {
	line: { color: '#089981' },
}) as TrendLineToolOptions;

export const InfoLineOptionDefaults: TrendLineToolOptions = clone(TrendLineOptionDefaults);

export const PitchforkOptionDefaults: PitchforkToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: { width: 1, style: LineStyle.Solid },
	median: { color: '#f23645', width: 1, style: LineStyle.Solid },
	extend: { left: false, right: true },
	variant: 'original',
	levels: [
		{ color: '#f23645', coeff: 0.25, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: false },
		{ color: '#81c784', coeff: 0.382, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: false },
		{ color: '#089981', coeff: 0.5, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#64b5f6', coeff: 0.618, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: false },
		{ color: '#2962ff', coeff: 0.75, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: false },
		{ color: '#f23645', coeff: 1, opacity: 0.1, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#9c27b0', coeff: 1.5, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: false },
		{ color: '#e91e63', coeff: 2, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: false },
	],
};

export const GannBoxOptionDefaults: GannBoxToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: { width: 1, style: LineStyle.Solid },
	extend: { left: false, right: false },
	showLabels: true,
	priceLevels: [
		{ color: '#787b86', coeff: 0, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#f23645', coeff: 0.25, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#089981', coeff: 0.5, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#2962ff', coeff: 0.75, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#787b86', coeff: 1, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	],
	timeLevels: [
		{ color: '#787b86', coeff: 0, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#f23645', coeff: 0.25, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#089981', coeff: 0.5, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#2962ff', coeff: 0.75, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#787b86', coeff: 1, opacity: 0, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	],
};

export const GannFanOptionDefaults: GannFanToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: { width: 1, style: LineStyle.Solid },
	showLabels: true,
	levels: [
		{ color: '#f23645', coeff: 8, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#81c784', coeff: 4, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#089981', coeff: 3, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#64b5f6', coeff: 2, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#2962ff', coeff: 1, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#64b5f6', coeff: 0.5, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#089981', coeff: 1 / 3, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#81c784', coeff: 0.25, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
		{ color: '#f23645', coeff: 0.125, opacity: 0.05, distanceFromCoeffEnabled: false, distanceFromCoeff: 0, visible: true },
	],
};

export const EllipseOptionDefaults: EllipseToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	ellipse: {
		extend: { left: false, right: false },
		background: { color: applyAlpha('#9c27b0', 0.2) },
		border: { width: 1, style: LineStyle.Solid, color: '#9c27b0' },
	},
	text: TextDefaults,
};

export const DateRangeOptionDefaults: DateRangeToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	priceRange: {
		extend: { left: false, right: false },
		background: { color: applyAlpha('#2962ff', 0.1) },
		border: { width: 1, style: LineStyle.Solid, color: '#2962ff' },
		showCenterHorizontalLine: false,
		showCenterVerticalLine: true,
		centerHorizontalLineWidth: 1,
		centerHorizontalLineStyle: LineStyle.Dotted,
	},
	text: merge(clone(TextDefaults), {
		font: { color: '#ffffff', size: 12 },
		box: {
			alignment: { vertical: BoxVerticalAlignment.Bottom, horizontal: BoxHorizontalAlignment.Center },
			background: { color: applyAlpha('#2962ff', 0.9), inflation: { x: 8, y: 6 } },
		},
	}) as TextOptions,
};

export const DateAndPriceRangeOptionDefaults: DateRangeToolOptions = merge(clone(DateRangeOptionDefaults), {
	priceRange: {
		showCenterHorizontalLine: true,
		showCenterVerticalLine: true,
	},
}) as DateRangeToolOptions;

const patternDefaultsBase: PatternToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: { width: 2, color: '#2962ff', style: LineStyle.Solid },
	background: { color: applyAlpha('#2962ff', 0.15) },
	showLabels: true,
};

export const XABCDPatternOptionDefaults: PatternToolOptions = clone(patternDefaultsBase);
export const ABCDPatternOptionDefaults: PatternToolOptions = merge(clone(patternDefaultsBase), {
	line: { color: '#089981' },
	background: { color: applyAlpha('#089981', 0) },
}) as PatternToolOptions;
export const ElliottImpulseWaveOptionDefaults: PatternToolOptions = merge(clone(patternDefaultsBase), {
	line: { width: 1, color: '#2962ff' },
	background: { color: applyAlpha('#2962ff', 0) },
}) as PatternToolOptions;
export const ElliottCorrectionWaveOptionDefaults: PatternToolOptions = merge(clone(patternDefaultsBase), {
	line: { width: 1, color: '#f23645' },
	background: { color: applyAlpha('#f23645', 0) },
}) as PatternToolOptions;

export const CyclicLinesOptionDefaults: CyclicLinesToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: { width: 1, color: '#2962ff', style: LineStyle.Solid },
};

export const PriceLabelOptionDefaults: PriceLabelToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	text: merge(clone(TextDefaults), {
		font: { color: '#131722', size: 12 },
		box: {
			// Top alignment puts the bubble fully above the anchor point.
			alignment: { vertical: BoxVerticalAlignment.Top, horizontal: BoxHorizontalAlignment.Center },
			offset: { x: 0, y: 14 },
			background: { color: 'rgba(255, 255, 255, 0.9)', inflation: { x: 8, y: 5 } },
			border: { color: '#2962ff', width: 1, radius: 10, highlight: false, style: LineStyle.Solid },
		},
	}) as TextOptions,
};

export const FixedRangeVolumeProfileOptionDefaults: FixedRangeVolumeProfileToolOptions = {
	visible: true,
	editable: true,
	locked: false,
	line: { width: 2, color: '#2962ff', style: LineStyle.Solid },
	volumeProfile: {
		bars: [],
		bins: 24,
		barColor: applyAlpha('#2196F3', 0.5),
		valueAreaColor: applyAlpha('#2196F3', 0.85),
		buyColor: applyAlpha('#26a69a', 0.7),
		sellColor: applyAlpha('#ef5350', 0.7),
		pocColor: applyAlpha('#FF5252', 1),
		valueAreaVolume: 0.7,
		showPOC: true,
		showValueArea: true,
		borderColor: applyAlpha('#969696', 0.8),
		backgroundColor: applyAlpha('#2196F3', 0.1),
		borderWidth: 0,
		pocExpansion: 'right',
		barWidthRatio: 0.3,
		barAnchorSide: 'left',
	},
};

export const VisibleRangeVolumeProfileOptionDefaults: VisibleRangeVolumeProfileToolOptions = merge(
	clone(FixedRangeVolumeProfileOptionDefaults),
	{
		// Viewport-anchored profile is rendered as a passive overlay — no selection,
		// no draggable handles. Bars hang from the right edge of the visible range.
		editable: false,
		volumeProfile: { barAnchorSide: 'right' },
	}
) as unknown as VisibleRangeVolumeProfileToolOptions;

/** @public */
export const LineToolsOptionDefaults = {
	Ray: merge(clone(TrendLineOptionDefaults), { line: { extend: { right: true } } }),
	Arrow: merge(clone(TrendLineOptionDefaults), { line: { end: { right: LineEnd.Arrow } } }),
	ExtendedLine: merge(clone(TrendLineOptionDefaults), { line: { extend: { right: true, left: true } } }),
	HorizontalRay: merge(clone(HorizontalLineOptionDefaults), { line: { extend: { left: false } } }),
	TrendAngle: TrendAngleOptionDefaults,
	InfoLine: InfoLineOptionDefaults,

	Pitchfork: PitchforkOptionDefaults,
	GannBox: GannBoxOptionDefaults,
	GannFan: GannFanOptionDefaults,
	Ellipse: EllipseOptionDefaults,
	DateRange: DateRangeOptionDefaults,
	DateAndPriceRange: DateAndPriceRangeOptionDefaults,
	XABCDPattern: XABCDPatternOptionDefaults,
	ABCDPattern: ABCDPatternOptionDefaults,
	ElliottImpulseWave: ElliottImpulseWaveOptionDefaults,
	ElliottCorrectionWave: ElliottCorrectionWaveOptionDefaults,
	CyclicLines: CyclicLinesOptionDefaults,
	PriceLabel: PriceLabelOptionDefaults,

	FibRetracement: FibRetracementOptionDefaults,
	TrendBasedFibExtension: TrendBasedFibExtensionOptionDefaults,
	FibChannel: FibChannelOptionDefaults,
	FibTimeZone: FibTimeZoneOptionDefaults,
	FibSpeedResistanceFan: FibSpeedResistanceFanOptionDefaults,
	TrendBasedFibTime: TrendBasedFibTimeOptionDefaults,
	FibCircles: FibCirclesOptionDefaults,
	FibSpiral: FibSpiralOptionDefaults,
	FibSpeedResistanceArcs: FibSpeedResistanceArcsOptionDefaults,
	FibWedge: FibWedgeOptionDefaults,
	Pitchfan: PitchfanOptionDefaults,
	ParallelChannel: ParallelChannelOptionDefaults,
	HorizontalLine: HorizontalLineOptionDefaults,
	TradeEntryLine: TradeEntryLineOptionDefaults,
	TradeTakeProfitLine: TradeTakeProfitLineOptionDefaults,
	TradeStopLossLine: TradeStopLossLineOptionDefaults,
	TradePendingOrderLine: TradePendingOrderLineOptionDefaults,
	VerticalLine: VerticalLineOptionDefaults,
	Highlighter: HighlighterOptionDefaults,
	CrossLine: CrossLineOptionDefaults,
	TrendLine: TrendLineOptionDefaults,
	Callout: CalloutOptionDefaults,
	Rectangle: RectangleOptionDefaults,
	LongShortPosition: LongShortPositionOptionDefaults,
	Circle: CircleOptionDefaults,
	PriceRange: PriceRangeOptionDefaults,
	Triangle: TriangleOptionDefaults,
	Brush: BrushOptionDefaults,
	Path: PathOptionDefaults,
	Text: TextOptionDefaults,
	Emoji: EmojiOptionDefaults,
	MarketDepth: MarketDepthOptionDefaults,
	FixedRangeVolumeProfile: FixedRangeVolumeProfileOptionDefaults,
	VisibleRangeVolumeProfile: VisibleRangeVolumeProfileOptionDefaults,
};
