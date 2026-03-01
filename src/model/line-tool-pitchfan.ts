import { PitchfanPaneView } from '../views/pane/pitchfan-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, PitchfanToolOptions } from './line-tool-options';

export class LineToolPitchfan extends LineTool<'Pitchfan'> {
	protected override readonly _toolType: LineToolType = 'Pitchfan';

	public constructor(model: ChartModel, options: PitchfanToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new PitchfanPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 3;
	}
}
