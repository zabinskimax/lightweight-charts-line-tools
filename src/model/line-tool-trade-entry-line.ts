import { LineToolType } from './line-tool-options';
import { LineToolTradeLineBase } from './line-tool-trade-line-base';

export class LineToolTradeEntryLine extends LineToolTradeLineBase<'TradeEntryLine'> {
	protected override readonly _toolType: LineToolType = 'TradeEntryLine';
}
