import { TrendAnglePaneView } from '../views/pane/trend-angle-pane-view';

import { ChartModel } from './chart-model';
import { LineToolPoint } from './line-tool';
import { LineToolType, TrendLineToolOptions } from './line-tool-options';
import { LineToolTrendLine } from './line-tool-trend-line';

export class LineToolTrendAngle extends LineToolTrendLine {
	protected override readonly _toolType: LineToolType = 'TrendAngle';

	public constructor(model: ChartModel, options: TrendLineToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new TrendAnglePaneView(this, model)]);
	}
}
