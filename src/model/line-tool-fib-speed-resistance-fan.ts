import { FibSpeedResistanceFanPaneView } from '../views/pane/fib-speed-resistance-fan-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { FibSpeedResistanceFanToolOptions, LineToolType } from './line-tool-options';

export class LineToolFibSpeedResistanceFan extends LineTool<'FibSpeedResistanceFan'> {
	protected override readonly _toolType: LineToolType = 'FibSpeedResistanceFan';

	public constructor(model: ChartModel, options: FibSpeedResistanceFanToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new FibSpeedResistanceFanPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
