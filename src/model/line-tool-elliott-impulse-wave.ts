import { PatternPaneView } from '../views/pane/pattern-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, PatternToolOptions } from './line-tool-options';

export class LineToolElliottImpulseWave extends LineTool<'ElliottImpulseWave'> {
	protected override readonly _toolType: LineToolType = 'ElliottImpulseWave';

	public constructor(model: ChartModel, options: PatternToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new PatternPaneView(this, model, ['0', '(1)', '(2)', '(3)', '(4)', '(5)'], false)]);
	}

	public pointsCount(): number {
		return 6;
	}
}
