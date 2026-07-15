import { InfoLinePaneView } from '../views/pane/info-line-pane-view';

import { ChartModel } from './chart-model';
import { LineToolPoint } from './line-tool';
import { LineToolType, TrendLineToolOptions } from './line-tool-options';
import { LineToolTrendLine } from './line-tool-trend-line';

export class LineToolInfoLine extends LineToolTrendLine {
	protected override readonly _toolType: LineToolType = 'InfoLine';

	public constructor(model: ChartModel, options: TrendLineToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new InfoLinePaneView(this, model)]);
	}
}
