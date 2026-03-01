import { FibWedgePaneView } from '../views/pane/fib-wedge-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { FibWedgeToolOptions, LineToolType } from './line-tool-options';

export class LineToolFibWedge extends LineTool<'FibWedge'> {
	protected override readonly _toolType: LineToolType = 'FibWedge';

	public constructor(model: ChartModel, options: FibWedgeToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new FibWedgePaneView(this, model)]);
	}

	public pointsCount(): number {
		return 3;
	}
}
