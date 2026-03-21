import { FixedRangeVolumeProfilePaneView } from '../views/pane/fixed-range-volume-profile-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { FixedRangeVolumeProfileToolOptions, LineToolType } from './line-tool-options';


export class LineToolFixedRangeVolumeProfile extends LineTool<'FixedRangeVolumeProfile'> {
	protected override readonly _toolType: LineToolType = 'FixedRangeVolumeProfile';

	public constructor(model: ChartModel, options: FixedRangeVolumeProfileToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new FixedRangeVolumeProfilePaneView(this, model)]);
	}

	public pointsCount(): number {
		return 2;
	}
}
