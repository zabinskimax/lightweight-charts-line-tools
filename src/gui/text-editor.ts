import { TextOptions } from '../model/line-tool-options';
import { DeepPartial } from '../helpers/strict-type-checks';

export interface TextEditorOptions {
    text: DeepPartial<TextOptions>;
    pixelRatio: number;
    container: HTMLElement;
    onBlur: (text: string) => void;
    onCancel: () => void;
    rect: {
        left: number;
        top: number;
        width: number;
        height: number;
    };
    pivotX: number;
    pivotY: number;
    alignment: string;
}

export class TextEditor {
    private _textarea: HTMLTextAreaElement;
    private _ghostSpan: HTMLSpanElement;
    private _options: TextEditorOptions;
    private _pivotX: number = 0;
    private _alignment: 'left' | 'center' | 'right';

    public constructor(options: TextEditorOptions) {
        this._options = options;
        this._pivotX = options.pivotX;

        // Normalize alignment
        const a = (options.alignment || 'left').toLowerCase();
        if (a === 'center') {
            this._alignment = 'center';
        } else if (a === 'right' || a === 'end') {
            this._alignment = 'right';
        } else {
            this._alignment = 'left';
        }

        this._textarea = document.createElement('textarea');
        this._textarea.spellcheck = false;
        this._ghostSpan = document.createElement('span');
        this._applyStyle();

        this._textarea.value = options.text.value || '';

        this._textarea.addEventListener('blur', this._onBlur);
        this._textarea.addEventListener('keydown', this._onKeyDown);
        this._textarea.addEventListener('input', this._adjustSize);

        options.container.appendChild(this._textarea);
        options.container.appendChild(this._ghostSpan);

        this._adjustSize();

        // Focus and select all text
        setTimeout(() => {
            this._textarea.focus();
            this._textarea.select();
        }, 0);
    }

    public destroy(): void {
        this._textarea.removeEventListener('blur', this._onBlur);
        this._textarea.removeEventListener('keydown', this._onKeyDown);
        this._textarea.removeEventListener('input', this._adjustSize);
        if (this._textarea.parentElement) {
            this._textarea.parentElement.removeChild(this._textarea);
        }
        if (this._ghostSpan.parentElement) {
            this._ghostSpan.parentElement.removeChild(this._ghostSpan);
        }
    }

    private _applyStyle(): void {
        const { rect, text } = this._options;
        const s = this._textarea.style;

        s.position = 'absolute';
        s.left = `${this._pivotX}px`;
        s.top = `${rect.top}px`;

        if (this._alignment === 'center') {
            s.transform = 'translateX(-50%)';
        } else if (this._alignment === 'right') {
            s.transform = 'translateX(-100%)';
        }

        s.width = `${rect.width}px`;
        s.height = `${rect.height}px`;
        s.zIndex = '1000';
        s.boxSizing = 'border-box';
        s.margin = '0';
        s.padding = '2px'; // Small padding to prevent cutoff
        s.border = '2px solid #2962FF';
        s.outline = 'none';
        s.background = 'transparent';
        s.color = text.font?.color || 'black';
        s.fontFamily = text.font?.family || 'Trebuchet MS, Roboto, Ubuntu, sans-serif';
        s.fontSize = `${(text.font?.size || 12)}px`;
        s.fontWeight = text.font?.bold ? 'bold' : 'normal';
        s.fontStyle = text.font?.italic ? 'italic' : 'normal';
        s.lineHeight = '1.2';
        s.textAlign = this._options.alignment as any;
        s.overflow = 'hidden';
        s.resize = 'none';

        // Ghost span style
        const gs = this._ghostSpan.style;
        gs.position = 'absolute';
        gs.visibility = 'hidden';
        gs.whiteSpace = 'pre';
        gs.fontFamily = s.fontFamily;
        gs.fontSize = s.fontSize;
        gs.fontWeight = s.fontWeight;
        gs.fontStyle = s.fontStyle;
        gs.padding = '0'; // No padding for ghost span
        gs.display = 'inline-block';
        gs.lineHeight = s.lineHeight;
    }

    private _adjustSize = () => {
        const text = this._textarea.value || '';
        const lines = text.split('\n');

        // Handle width
        this._ghostSpan.style.whiteSpace = 'pre';
        this._ghostSpan.style.width = 'auto';
        let maxWidth = 0;
        for (const line of lines) {
            this._ghostSpan.textContent = line || ' ';
            maxWidth = Math.max(maxWidth, this._ghostSpan.getBoundingClientRect().width);
        }

        const paddingW = 8; // 2px padding + 2px border each side
        const newWidth = Math.ceil(maxWidth + paddingW);

        this._textarea.style.width = `${newWidth}px`;
        this._textarea.style.textAlign = this._alignment;

        // Handle height
        this._ghostSpan.textContent = text || ' ';
        this._ghostSpan.style.width = this._textarea.style.width;
        this._ghostSpan.style.whiteSpace = 'pre-wrap';
        const newHeight = Math.ceil(this._ghostSpan.getBoundingClientRect().height) + 4; // 2px padding each side
        this._textarea.style.height = `${newHeight}px`;
    };

    private _onBlur = () => {
        this._options.onBlur(this._textarea.value);
    };

    private _onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this._options.onBlur(this._textarea.value);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this._options.onCancel();
        }
    };
}
