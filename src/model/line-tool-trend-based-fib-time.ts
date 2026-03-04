import { TrendBasedFibTimePaneView } from '../views/pane/trend-based-fib-time-pane-view';

import { ChartModel } from './chart-model';
import { LineTool, LineToolPoint } from './line-tool';
import { LineToolType, TrendBasedFibTimeToolOptions } from './line-tool-options';

export class LineToolTrendBasedFibTime extends LineTool<'TrendBasedFibTime'> {
	protected override readonly _toolType: LineToolType = 'TrendBasedFibTime';

	public constructor(model: ChartModel, options: TrendBasedFibTimeToolOptions, points: LineToolPoint[] = []) {
		super(model, options, points);
		this._setPaneViews([new TrendBasedFibTimePaneView(this, model)]);
	}

	public pointsCount(): number {
		return 3;
	}

	public override setPoint(index: number, point: LineToolPoint): void {
		if (index === 0 && this._points.length === 3) {
			const dt = Number(point.timestamp) - Number(this._points[0].timestamp);
			const dp = point.price - this._points[0].price;

			this._points[0].timestamp = point.timestamp;
			this._points[0].price = point.price;

			this._points[1].timestamp = (Number(this._points[1].timestamp) + dt);
			this._points[1].price += dp;

			this._points[2].timestamp = (Number(this._points[2].timestamp) + dt);
			this._points[2].price += dp;
		} else {
			super.setPoint(index, point);
		}
	}

	public override setPoints(points: LineToolPoint[]): void {
		if (points.length === 3 && this._points.length === 3) {
			const dt = Number(points[0].timestamp) - Number(this._points[0].timestamp);
			const dp = points[0].price - this._points[0].price;

			this._points[0].timestamp = points[0].timestamp;
			this._points[0].price = points[0].price;

			this._points[1].timestamp = (Number(this._points[1].timestamp) + dt);
			this._points[1].price += dp;

			this._points[2].timestamp = (Number(this._points[2].timestamp) + dt);
			this._points[2].price += dp;
		} else {
			super.setPoints(points);
		}
	}
}
