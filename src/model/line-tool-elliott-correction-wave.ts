import { PatternPaneView } from '../views/pane/pattern-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, PatternToolOptions } from './line-tool-options';

export class LineToolElliottCorrectionWave extends LineTool<'ElliottCorrectionWave'> {
	protected override readonly _toolType: LineToolType = 'ElliottCorrectionWave';

	public constructor(model: ChartModel, options: PatternToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new PatternPaneView(this, model, ['0', '(A)', '(B)', '(C)'], false)]);
	}

	public pointsCount(): number {
		return 4;
	}
}
