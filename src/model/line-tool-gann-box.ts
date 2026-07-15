import { GannBoxPaneView } from '../views/pane/gann-box-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { GannBoxToolOptions, LineToolType } from './line-tool-options';

export class LineToolGannBox extends LineTool<'GannBox'> {
	protected override readonly _toolType: LineToolType = 'GannBox';

	public constructor(model: ChartModel, options: GannBoxToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new GannBoxPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
