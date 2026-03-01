import { TrendBasedFibTimePaneView } from '../views/pane/trend-based-fib-time-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, TrendBasedFibTimeToolOptions } from './line-tool-options';

export class LineToolTrendBasedFibTime extends LineTool<'TrendBasedFibTime'> {
	protected override readonly _toolType: LineToolType = 'TrendBasedFibTime';

	public constructor(model: ChartModel, options: TrendBasedFibTimeToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new TrendBasedFibTimePaneView(this, model)]);
	}

	public pointsCount(): number {
		return 3;
	}
}
