import { PriceLabelPaneView } from '../views/pane/price-label-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, PriceLabelToolOptions } from './line-tool-options';

export class LineToolPriceLabel extends LineTool<'PriceLabel'> {
	protected override readonly _toolType: LineToolType = 'PriceLabel';

	public constructor(model: ChartModel, options: PriceLabelToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new PriceLabelPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 1;
	}
}
