import { LineToolType } from './line-tool-options';
import { LineToolTradeLineBase } from './line-tool-trade-line-base';

export class LineToolTradePendingOrderLine extends LineToolTradeLineBase<'TradePendingOrderLine'> {
	protected override readonly _toolType: LineToolType = 'TradePendingOrderLine';
}
