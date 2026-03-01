import { FibTimeZonePaneView } from '../views/pane/fib-time-zone-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { FibTimeZoneToolOptions, LineToolType } from './line-tool-options';

export class LineToolFibTimeZone extends LineTool<'FibTimeZone'> {
	protected override readonly _toolType: LineToolType = 'FibTimeZone';

	public constructor(model: ChartModel, options: FibTimeZoneToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new FibTimeZonePaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
