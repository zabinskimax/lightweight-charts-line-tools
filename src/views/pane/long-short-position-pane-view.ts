/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/tslint/config */
import { deepCopy } from '../../helpers/deep-copy';
import { Coordinate } from '../../model/coordinate';
import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType, TextOptions } from '../../model/line-tool-options';
import { PaneCursorType } from '../../model/pane';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { RectangleRenderer } from '../../renderers/rectangle-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { TextRenderer } from '../../renderers/text-renderer';
import { LineToolPaneView } from './line-tool-pane-view';
import { Point } from '../../model/point';
import { LineToolLongShortPosition } from '../../model/line-tool-long-short-position';
import { ensureNotNull } from '../../helpers/assertions';
import { clone } from '../../helpers/strict-type-checks';

export class LongShortPositionPaneView extends LineToolPaneView {
    // Renderers for the Entry-Stop Loss and TP rectangles
    protected _entryStopLossRenderer: RectangleRenderer = new RectangleRenderer();
    protected _tpRenderer: RectangleRenderer = new RectangleRenderer();

    // Renderers for text labels
    protected _entryStopLossLabelRenderer: TextRenderer = new TextRenderer();
    protected _tpLabelRenderer: TextRenderer = new TextRenderer();

    public constructor(source: LineTool<LineToolType>, model: ChartModel) {
        super(source, model);
        this._renderer = null;
        (source as LineToolLongShortPosition).onFinalized = (orderID: string) => {
            this.triggerAfterEdit('lineToolFinished', orderID);
        };
    }

    public triggerAfterEdit(stage: string, orderID: string): void {
        const modifiedLineTool = this._source;
        const selectedLineTool = clone(modifiedLineTool.exportLineToolToLineToolExport());
        this._model.fireLineToolsAfterEdit(selectedLineTool, stage);
    }

    protected override _updateImpl(): void {
        const options = this._source.options() as LineToolOptionsInternal<'LongShortPosition'>;

        if (!options.visible) {
            return;
        }

        this._renderer = null;
        this._invalidated = false;

        const priceScale = this._source.priceScale();
        const timeScale = this._model.timeScale();

        if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }
        const visibleTimestampRange = timeScale.timestampRangeFromVisibleLogicalRange();
        if (visibleTimestampRange === null) { return; }

        const points = this._source.points();
        if (points.length < 3) { return; }

        const point0Data = points[0];
        const point1Data = points[1];
        const point2Data = points[2];

        const ownerSource = this._source.ownerSource();
        const firstValue = ownerSource?.firstValue();
        if (!firstValue) { return; }

        const y0 = priceScale.priceToCoordinate(point0Data.price, firstValue.value);
        const y1 = priceScale.priceToCoordinate(point1Data.price, firstValue.value);
        const y2 = priceScale.priceToCoordinate(point2Data.price, firstValue.value);

        const pane = this._model.paneForSource(this._source);
        const paneHeight = pane?.height() ?? 0;

        const isOffScreenVertical = (y0 < 0 && y1 < 0 && y2 < 0) || (y0 > paneHeight && y1 > paneHeight && y2 > paneHeight);
        const minTS = Math.min(points[0].timestamp, points[1].timestamp, points[2].timestamp);
        const maxTS = Math.max(points[0].timestamp, points[1].timestamp, points[2].timestamp);
        const isOffScreenHorizontal = minTS > Number(visibleTimestampRange.to) || maxTS < Number(visibleTimestampRange.from);

        if (!isOffScreenVertical && !isOffScreenHorizontal ||
            options.entryStopLossRectangle.extend.left || options.entryStopLossRectangle.extend.right ||
            options.entryTpRectangle.extend.left || options.entryTpRectangle.extend.right) {
            super._updateImpl();

            if (this._points.length < 3) { return; }

            const compositeRenderer = new CompositeRenderer();

            // Prepare points
            const entryStopLossPoints = [this._points[0], this._points[1]];
            const tpPoints = [this._points[0], this._points[2]];

            // Entry to Stop Loss Rectangle
            this._entryStopLossRenderer.setData({
                points: entryStopLossPoints,
                background: options.entryStopLossRectangle.background,
                border: options.entryStopLossRectangle.border,
                extend: options.entryStopLossRectangle.extend,
                hitTestBackground: true,
            });

            // Entry to TP Rectangle
            this._tpRenderer.setData({
                points: tpPoints,
                background: options.entryTpRectangle.background,
                border: options.entryTpRectangle.border,
                extend: options.entryTpRectangle.extend,
                hitTestBackground: true,
            });

            compositeRenderer.append(this._entryStopLossRenderer);
            compositeRenderer.append(this._tpRenderer);

            // Entry to Stop Loss Text
            const entryStopLossTextData = this._getText(options.entryStopLossText, entryStopLossPoints, false);
            if (options.entryStopLossText.value || entryStopLossTextData.text.value !== '') {
                this._entryStopLossLabelRenderer.setData({
                    text: entryStopLossTextData.text,
                    points: [entryStopLossTextData.point],
                });
                compositeRenderer.append(this._entryStopLossLabelRenderer);
            }

            // Entry to TP Text
            const entryTpTextData = this._getText(options.entryTpText, tpPoints, true);
            if (options.entryTpText.value || entryTpTextData.text.value !== '') {
                this._tpLabelRenderer.setData({
                    text: entryTpTextData.text,
                    points: [entryTpTextData.point],
                });
                compositeRenderer.append(this._tpLabelRenderer);
            }

            this._addAnchors(compositeRenderer);
            this._renderer = compositeRenderer;
        }
    }

    protected _addAnchors(renderer: CompositeRenderer): void {
        renderer.append(this.createLineAnchor({
            points: [this._points[0], this._points[1], this._points[2]],
            pointsCursorType: [
                PaneCursorType.DiagonalNwSeResize,
                PaneCursorType.DiagonalNeSwResize,
                PaneCursorType.VerticalResize,
            ],
        }, 0));
    }

    private _getText(textOptions: TextOptions, points: AnchorPoint[], isTpRectangle: boolean = false): { text: TextOptions; point: Point } {
        const point0 = points[0];
        const point1 = points[1];
        const minX = Math.min(point0.x, point1.x);
        const maxX = Math.max(point0.x, point1.x);
        const minY = Math.min(point0.y, point1.y);
        const maxY = Math.max(point0.y, point1.y);
        const pivot = point0.clone();
        const textHalfSize = textOptions.font.size / 3;
        let horizontalPadding = 0;

        switch (textOptions.box.alignment.vertical) {
            case BoxVerticalAlignment.Middle:
                pivot.y = (minY + maxY) / 2 as Coordinate;
                horizontalPadding = textHalfSize;
                break;
            case BoxVerticalAlignment.Top:
                pivot.y = minY as Coordinate;
                break;
            case BoxVerticalAlignment.Bottom:
                pivot.y = maxY as Coordinate;
        }

        switch (textOptions.box.alignment.horizontal) {
            case BoxHorizontalAlignment.Center:
                pivot.x = (minX + maxX) / 2 as Coordinate;
                break;
            case BoxHorizontalAlignment.Left:
                pivot.x = minX as Coordinate;
                break;
            case BoxHorizontalAlignment.Right:
                pivot.x = maxX as Coordinate;
        }

        const labelOptions = deepCopy(textOptions);
        labelOptions.box = { ...labelOptions.box, padding: { y: textHalfSize, x: horizontalPadding } };

        if (textOptions.box.alignment.vertical === BoxVerticalAlignment.Middle) {
            labelOptions.box.maxHeight = maxY - minY;
        }

        const options = this._source.options() as LineToolOptionsInternal<'LongShortPosition'>;

        if (options.showAutoText) {
            const priceScale = ensureNotNull(this._source.priceScale());
            const firstValue = ensureNotNull(priceScale.firstValue());

            if (!isTpRectangle) {
                const entryPrice = Number(priceScale.formatPrice(this._source.points()[0].price, firstValue));
                const stopPrice = Number(priceScale.formatPrice(this._source.points()[1].price, firstValue));
                const percentChange = ((stopPrice - entryPrice) / entryPrice) * 100;

                labelOptions.value =
                    'Entry: ' + priceScale.formatPrice(this._source.points()[0].price, firstValue) + '\n' +
                    'Stop: ' + priceScale.formatPrice(this._source.points()[1].price, firstValue) + '\n' +
                    `(${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%)`;
            } else {
                const entryPrice = Number(priceScale.formatPrice(this._source.points()[0].price, firstValue));
                const tpPrice = Number(priceScale.formatPrice(this._source.points()[2].price, firstValue));
                const percentChange = ((tpPrice - entryPrice) / entryPrice) * 100;

                labelOptions.value =
                    'TP: ' + priceScale.formatPrice(this._source.points()[2].price, firstValue) + '\n' +
                    `(${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%)`;
            }

            labelOptions.font = {
                family: 'Arial',
                size: 14,
                color: 'rgba(255, 255, 255, 1)',
                bold: false,
                italic: false,
            };

            const isLong = (this._source as LineToolLongShortPosition).isCurrentLong();
            if (isLong) {
                if (!isTpRectangle) {
                    labelOptions.box.alignment = { vertical: BoxVerticalAlignment.Bottom, horizontal: BoxHorizontalAlignment.Center };
                } else {
                    labelOptions.box.alignment = { vertical: BoxVerticalAlignment.Top, horizontal: BoxHorizontalAlignment.Center };
                }
            } else {
                if (!isTpRectangle) {
                    labelOptions.box.alignment = { vertical: BoxVerticalAlignment.Top, horizontal: BoxHorizontalAlignment.Center };
                } else {
                    labelOptions.box.alignment = { vertical: BoxVerticalAlignment.Bottom, horizontal: BoxHorizontalAlignment.Center };
                }
            }

            // RECALCULATE PIVOT
            switch (labelOptions.box.alignment.horizontal) {
                case BoxHorizontalAlignment.Center: pivot.x = (minX + maxX) / 2 as Coordinate; break;
                case BoxHorizontalAlignment.Left: pivot.x = minX as Coordinate; break;
                case BoxHorizontalAlignment.Right: pivot.x = maxX as Coordinate; break;
            }
            switch (labelOptions.box.alignment.vertical) {
                case BoxVerticalAlignment.Middle: pivot.y = (minY + maxY) / 2 as Coordinate; break;
                case BoxVerticalAlignment.Top: pivot.y = minY as Coordinate; break;
                case BoxVerticalAlignment.Bottom: pivot.y = maxY as Coordinate; break;
            }
        }

        return { text: labelOptions, point: pivot };
    }
}
