import { TradeLinePaneView } from '../views/pane/trade-line-pane-view';
import { ITimeAxisView } from '../views/time-axis/itime-axis-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolOptionsInternal, LineToolPoint } from './line-tool';

export type TradeLineToolType = 'TradeEntryLine' | 'TradeTakeProfitLine' | 'TradeStopLossLine' | 'TradePendingOrderLine';

export abstract class LineToolTradeLineBase<T extends TradeLineToolType> extends LineTool<T> {
	public constructor(model: ChartModel, options: LineToolOptionsInternal<T>, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new TradeLinePaneView(this, model)]);
	}

	public pointsCount(): number {
		return 1;
	}

	public override timeAxisViews(): ITimeAxisView[] {
		return [];
	}

	public override timeAxisPoints(): LineToolPoint[] {
		return [];
	}

	public override priceAxisLabelColor(): string | null {
		return this.options().line.color;
	}
}
