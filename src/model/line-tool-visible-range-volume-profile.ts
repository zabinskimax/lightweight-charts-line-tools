import { VisibleRangeVolumeProfilePaneView } from '../views/pane/visible-range-volume-profile-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, VisibleRangeVolumeProfileToolOptions } from './line-tool-options';

export class LineToolVisibleRangeVolumeProfile extends LineTool<'VisibleRangeVolumeProfile'> {
	protected override readonly _toolType: LineToolType = 'VisibleRangeVolumeProfile';

	private readonly _onVisibleRangeChanged: () => void;

	public constructor(model: ChartModel, options: VisibleRangeVolumeProfileToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new VisibleRangeVolumeProfilePaneView(this, model)]);
		// pointsCount() === 0 puts the base constructor in a contradictory state
		// (_finished=true, _creating=true). Force it to "ready to render".
		this._creating = false;
		this._finished = true;

		this._onVisibleRangeChanged = () => {
			model.updateSource(this);
		};
		model.timeScale().visibleBarsChanged().subscribe(this._onVisibleRangeChanged);
		model.timeScale().logicalRangeChanged().subscribe(this._onVisibleRangeChanged);
	}

	public pointsCount(): number {
		return 0;
	}

	public override destroy(): void {
		this.model().timeScale().visibleBarsChanged().unsubscribe(this._onVisibleRangeChanged);
		this.model().timeScale().logicalRangeChanged().unsubscribe(this._onVisibleRangeChanged);
		super.destroy();
	}
}
