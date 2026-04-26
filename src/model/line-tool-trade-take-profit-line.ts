import { LineToolType } from './line-tool-options';
import { LineToolTradeLineBase } from './line-tool-trade-line-base';

export class LineToolTradeTakeProfitLine extends LineToolTradeLineBase<'TradeTakeProfitLine'> {
	protected override readonly _toolType: LineToolType = 'TradeTakeProfitLine';
}
