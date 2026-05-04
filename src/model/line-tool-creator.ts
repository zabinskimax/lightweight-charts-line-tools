import { LineToolsOptionDefaults } from '../api/options/line-tools-options-defaults';

import { IInputEventListener, InputEventType, TouchMouseEvent } from '../gui/mouse-event-handler';
import { PaneWidget } from '../gui/pane-widget';

import { clone, merge } from '../helpers/strict-type-checks';

import { ChartModel } from './chart-model';
import { IDataSource } from './idata-source';
import { LineTool } from './line-tool';
import { LineToolOptions, LineToolPartialOptions, LineToolPartialOptionsMap, LineToolType } from './line-tool-options';
import { LineTools } from './line-tools';

export class LineToolCreator implements IInputEventListener {
	protected _lastLineTool: LineTool<LineToolType> | null = null;
	protected _activeOptions: LineToolPartialOptions<unknown> | null = null;
	protected _activeType: LineToolType | null = null;
	protected _model: ChartModel;
	// Drawing-tool lock — when on, the most recently armed tool stays armed
	// after each completed drawing so the user can keep placing more shapes
	// without re-clicking the toolbar. Toggle via `setLocked`.
	protected _locked: boolean = false;
	protected _lockedType: LineToolType | null = null;
	protected _lockedOptions: LineToolPartialOptions<unknown> | null = null;

	public constructor(model: ChartModel) {
		this._model = model;
	}

	public setActiveLineTool<T extends LineToolType>(lineToolType: T, options?: LineToolPartialOptionsMap[T]): void {
		this._activeOptions = options || {};
		this._activeType = lineToolType;
		// Capture for re-arming when the lock is on. We always update these
		// so toggling the lock mid-session picks up the most recent tool.
		this._lockedType = lineToolType;
		this._lockedOptions = this._activeOptions;

		this._model.dataSources().forEach((source: IDataSource) => {
			if (source instanceof LineTool) {
				source.setSelected(false);
				source.setHovered(false);
				source.setEditing(false);
				source.setCreating(false);
			}
		});
		this._model.lightUpdate();
	}

	public hasActiveToolLine(): boolean {
		return this._activeType !== null;
	}

	public setLocked(locked: boolean): void {
		const wasLocked = this._locked;
		this._locked = locked;
		// On lock-off transitions, also disarm the currently active tool so
		// the next click doesn't draw one more shape with the just-disabled
		// lock. Without this, the lock's last re-arm would leak through.
		if (wasLocked && !locked) {
			this._activeType = null;
			this._activeOptions = null;
		}
	}

	public isLocked(): boolean {
		return this._locked;
	}

	public notifyToolFinished(tool: LineTool<LineToolType>): void {
		// Re-arm the same tool type/options so the next mousedown starts a
		// new drawing. We only react if the lock is on AND the finishing
		// tool is the one this creator just produced — finishes from
		// elsewhere (e.g. drag-edits on existing tools) shouldn't re-arm.
		if (!this._locked || this._lockedType === null || tool !== this._lastLineTool) {
			return;
		}
		this._activeType = this._lockedType;
		this._activeOptions = this._lockedOptions;
	}

	public onInputEvent(paneWidget: PaneWidget, ctx: CanvasRenderingContext2D, eventType: InputEventType, event: TouchMouseEvent): void {
		if (!this._activeType || !this._activeOptions) { return; }
		event.consumed = true;
		if (eventType !== InputEventType.MouseDown) { return; }

		// Drop any selection/hover state on existing tools so the previously
		// drawn shape (still highlighted from `tryFinish`) deselects the
		// moment the user starts placing the next one. Mirrors what
		// `setActiveLineTool` does on its initial arm.
		this._model.dataSources().forEach((source: IDataSource) => {
			if (source instanceof LineTool) {
				source.setSelected(false);
				source.setHovered(false);
				source.setEditing(false);
				source.setCreating(false);
			}
		});

		const priceScaleId = paneWidget.state().dataSources()[0].priceScale()?.id() || paneWidget.state().model().defaultVisiblePriceScaleId();
		const strictOptions = merge(clone(LineToolsOptionDefaults[this._activeType]), this._activeOptions || {}) as LineToolOptions<unknown>;

		this._lastLineTool = new LineTools[this._activeType](this._model, strictOptions, []);
		paneWidget.state().addDataSource(this._lastLineTool, priceScaleId);

		this._activeType = null;
		this._activeOptions = null;
	}
}
