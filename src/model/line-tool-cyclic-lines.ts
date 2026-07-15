import { CyclicLinesPaneView } from '../views/pane/cyclic-lines-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { CyclicLinesToolOptions, LineToolType } from './line-tool-options';

export class LineToolCyclicLines extends LineTool<'CyclicLines'> {
	protected override readonly _toolType: LineToolType = 'CyclicLines';

	public constructor(model: ChartModel, options: CyclicLinesToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new CyclicLinesPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
