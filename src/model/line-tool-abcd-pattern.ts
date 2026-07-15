import { PatternPaneView } from '../views/pane/pattern-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, PatternToolOptions } from './line-tool-options';

export class LineToolABCDPattern extends LineTool<'ABCDPattern'> {
	protected override readonly _toolType: LineToolType = 'ABCDPattern';

	public constructor(model: ChartModel, options: PatternToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new PatternPaneView(this, model, ['A', 'B', 'C', 'D'], false)]);
	}

	public pointsCount(): number {
		return 4;
	}
}
