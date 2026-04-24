import { LineToolType } from './line-tool-options';
import { LineToolTradeLineBase } from './line-tool-trade-line-base';

export class LineToolTradeStopLossLine extends LineToolTradeLineBase<'TradeStopLossLine'> {
	protected override readonly _toolType: LineToolType = 'TradeStopLossLine';
}
