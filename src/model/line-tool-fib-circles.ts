import { FibCirclesPaneView } from '../views/pane/fib-circles-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { FibCirclesToolOptions, LineToolType } from './line-tool-options';

export class LineToolFibCircles extends LineTool<'FibCircles'> {
	protected override readonly _toolType: LineToolType = 'FibCircles';

	public constructor(model: ChartModel, options: FibCirclesToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new FibCirclesPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
