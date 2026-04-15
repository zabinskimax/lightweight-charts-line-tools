import { TextLabelDataSource } from '../model/text-label-data-source';
import { TextLabelInternalOptions } from '../views/pane/text-label-pane-view';

import { ITextLabelApi, TextLabelPartialOptions } from './itext-label-api';

export class TextLabelApi implements ITextLabelApi {
	private readonly _source: TextLabelDataSource;
	private _options: TextLabelInternalOptions;

	public constructor(source: TextLabelDataSource, options: TextLabelInternalOptions) {
		this._source = source;
		this._options = options;
	}

	public source(): TextLabelDataSource {
		return this._source;
	}

	public applyOptions(options: TextLabelPartialOptions): void {
		this._options = { ...this._options, ...options };
		this._source.setOptions(this._options);
		this._source.model().lightUpdate();
	}
}
