import { GannFanPaneView } from '../views/pane/gann-fan-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { GannFanToolOptions, LineToolType } from './line-tool-options';

export class LineToolGannFan extends LineTool<'GannFan'> {
	protected override readonly _toolType: LineToolType = 'GannFan';

	public constructor(model: ChartModel, options: GannFanToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new GannFanPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
