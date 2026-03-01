import { FibChannelPaneView } from '../views/pane/fib-channel-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { FibChannelToolOptions, LineToolType } from './line-tool-options';

export class LineToolFibChannel extends LineTool<'FibChannel'> {
	protected override readonly _toolType: LineToolType = 'FibChannel';

	public constructor(model: ChartModel, options: FibChannelToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new FibChannelPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 3;
	}
}
