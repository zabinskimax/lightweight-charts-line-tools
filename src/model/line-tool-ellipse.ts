import { EllipsePaneView } from '../views/pane/ellipse-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { EllipseToolOptions, LineToolType } from './line-tool-options';

export class LineToolEllipse extends LineTool<'Ellipse'> {
	protected override readonly _toolType: LineToolType = 'Ellipse';

	public constructor(model: ChartModel, options: EllipseToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new EllipsePaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
