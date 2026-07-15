import { PatternPaneView } from '../views/pane/pattern-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, PatternToolOptions } from './line-tool-options';

export class LineToolXABCDPattern extends LineTool<'XABCDPattern'> {
	protected override readonly _toolType: LineToolType = 'XABCDPattern';

	public constructor(model: ChartModel, options: PatternToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new PatternPaneView(this, model, ['X', 'A', 'B', 'C', 'D'], true)]);
	}

	public pointsCount(): number {
		return 5;
	}
}
