import { FibSpiralPaneView } from '../views/pane/fib-spiral-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { FibSpiralToolOptions, LineToolType } from './line-tool-options';

export class LineToolFibSpiral extends LineTool<'FibSpiral'> {
	protected override readonly _toolType: LineToolType = 'FibSpiral';

	public constructor(model: ChartModel, options: FibSpiralToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new FibSpiralPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
