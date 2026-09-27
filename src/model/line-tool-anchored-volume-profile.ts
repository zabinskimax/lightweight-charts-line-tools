import { AnchoredVolumeProfilePaneView } from '../views/pane/anchored-volume-profile-pane-view';
import { PriceAxisView } from '../views/price-axis/price-axis-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { AnchoredVolumeProfileToolOptions, LineToolType } from './line-tool-options';

/**
 * One click sets the anchor bar; the host fills `volumeProfile.bars` with the
 * profile from that bar to the last bar. Only the anchor's time matters, so the
 * tool shows no price label.
 */
export class LineToolAnchoredVolumeProfile extends LineTool<'AnchoredVolumeProfile'> {
	protected override readonly _toolType: LineToolType = 'AnchoredVolumeProfile';

	public constructor(model: ChartModel, options: AnchoredVolumeProfileToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new AnchoredVolumeProfilePaneView(this, model)]);
	}

	public pointsCount(): number {
		return 1;
	}

	public override priceAxisViews(): PriceAxisView[] {
		return [];
	}

	public override priceAxisPoints(): LineToolPoint[] {
		return [];
	}
}
