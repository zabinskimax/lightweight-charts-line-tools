import { PitchforkPaneView } from '../views/pane/pitchfork-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, PitchforkToolOptions } from './line-tool-options';

export class LineToolPitchfork extends LineTool<'Pitchfork'> {
	protected override readonly _toolType: LineToolType = 'Pitchfork';

	public constructor(model: ChartModel, options: PitchforkToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new PitchforkPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 3;
	}
}
