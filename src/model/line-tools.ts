/* eslint-disable @typescript-eslint/naming-convention */
import { LineTool } from './line-tool';
import { LineToolArrow } from './line-tool-arrow';
import { LineToolBrush } from './line-tool-brush';
import { LineToolCallout } from './line-tool-callout';
import { LineToolCircle } from './line-tool-circle';
import { LineToolCrossLine } from './line-tool-cross-line';
import { LineToolExtendedLine } from './line-tool-extended-line';
import { LineToolFibChannel } from './line-tool-fib-channel';
import { LineToolFibCircles } from './line-tool-fib-circles';
import { LineToolFibRetracement } from './line-tool-fib-retracement';
import { LineToolFibSpeedResistanceArcs } from './line-tool-fib-speed-resistance-arcs';
import { LineToolFibSpeedResistanceFan } from './line-tool-fib-speed-resistance-fan';
import { LineToolFibSpiral } from './line-tool-fib-spiral';
import { LineToolFibTimeZone } from './line-tool-fib-time-zone';
import { LineToolFibWedge } from './line-tool-fib-wedge';
import { LineToolHighlighter } from './line-tool-highlighter';
import { LineToolHorizontalLine } from './line-tool-horizontal-line';
import { LineToolHorizontalRay } from './line-tool-horizontal-ray';
import { LineToolLongShortPosition } from './line-tool-long-short-position';
import { LineToolMarketDepth } from './line-tool-market-depth';
import { LineToolType } from './line-tool-options';
import { LineToolParallelChannel } from './line-tool-parallel-channel';
import { LineToolPath } from './line-tool-path';
import { LineToolPitchfan } from './line-tool-pitchfan';
import { LineToolPriceRange } from './line-tool-price-range';
import { LineToolRay } from './line-tool-ray';
import { LineToolRectangle } from './line-tool-rectangle';
import { LineToolText } from './line-tool-text';
import { LineToolTrendBasedFibExtension } from './line-tool-trend-based-fib-extension';
import { LineToolTrendBasedFibTime } from './line-tool-trend-based-fib-time';
import { LineToolTrendLine } from './line-tool-trend-line';
import { LineToolTriangle } from './line-tool-triangle';
import { LineToolVerticalLine } from './line-tool-vertical-line';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LineTools: Record<LineToolType, new (...args: any) => LineTool<LineToolType>> = {
	FibRetracement: LineToolFibRetracement,
	TrendBasedFibExtension: LineToolTrendBasedFibExtension,
	FibChannel: LineToolFibChannel,
	FibTimeZone: LineToolFibTimeZone,
	FibSpeedResistanceFan: LineToolFibSpeedResistanceFan,
	TrendBasedFibTime: LineToolTrendBasedFibTime,
	FibCircles: LineToolFibCircles,
	FibSpiral: LineToolFibSpiral,
	FibSpeedResistanceArcs: LineToolFibSpeedResistanceArcs,
	FibWedge: LineToolFibWedge,
	Pitchfan: LineToolPitchfan,
	ParallelChannel: LineToolParallelChannel,
	HorizontalLine: LineToolHorizontalLine,
	VerticalLine: LineToolVerticalLine,
	Highlighter: LineToolHighlighter,
	CrossLine: LineToolCrossLine,
	TrendLine: LineToolTrendLine,
	Callout: LineToolCallout,
	Rectangle: LineToolRectangle,
	LongShortPosition: LineToolLongShortPosition,
	Circle: LineToolCircle,
	PriceRange: LineToolPriceRange,
	Triangle: LineToolTriangle,
	Brush: LineToolBrush,
	Path: LineToolPath,
	Text: LineToolText,

	Ray: LineToolRay,
	Arrow: LineToolArrow,
	ExtendedLine: LineToolExtendedLine,
	HorizontalRay: LineToolHorizontalRay,
	MarketDepth: LineToolMarketDepth,
};
