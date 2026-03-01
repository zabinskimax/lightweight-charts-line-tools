import { FibSpeedResistanceArcsPaneView } from '../views/pane/fib-speed-resistance-arcs-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { FibSpeedResistanceArcsToolOptions, LineToolType } from './line-tool-options';

export class LineToolFibSpeedResistanceArcs extends LineTool<'FibSpeedResistanceArcs'> {
	protected override readonly _toolType: LineToolType = 'FibSpeedResistanceArcs';

	public constructor(model: ChartModel, options: FibSpeedResistanceArcsToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new FibSpeedResistanceArcsPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
