import { TrendBasedFibExtensionPaneView } from '../views/pane/trend-based-fib-extension-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, TrendBasedFibExtensionToolOptions } from './line-tool-options';

export class LineToolTrendBasedFibExtension extends LineTool<'TrendBasedFibExtension'> {
	protected override readonly _toolType: LineToolType = 'TrendBasedFibExtension';

	public constructor(model: ChartModel, options: TrendBasedFibExtensionToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new TrendBasedFibExtensionPaneView(this, model)]);
	}

	public pointsCount(): number {
		return 3;
	}
}
