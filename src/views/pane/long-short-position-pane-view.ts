/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/tslint/config */
import { deepCopy } from '../../helpers/deep-copy';
import { Coordinate } from '../../model/coordinate';
import { ChartModel, PositionToolOptions } from '../../model/chart-model';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolType, LongShortPositionSideStats, TextAlignment, TextFontOptions, TextOptions } from '../../model/line-tool-options';
import { PaneCursorType } from '../../model/pane';
import { PlotRow, PlotRowValueIndex } from '../../model/plot-data';
import { Series } from '../../model/series';
import { UTCTimestamp } from '../../model/time-data';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { LineStyle } from '../../renderers/draw-line';
import { RectangleRenderer } from '../../renderers/rectangle-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';
import { LineToolPaneView } from './line-tool-pane-view';
import { Point } from '../../model/point';
import { LineToolLongShortPosition } from '../../model/line-tool-long-short-position';
import { ensureNotNull } from '../../helpers/assertions';
import { clone } from '../../helpers/strict-type-checks';

type PositionOptions = LineToolOptionsInternal<'LongShortPosition'>;

// Center label colour while no P&L is shown, and the dashed entry-to-exit line.
const NEUTRAL_COLOR = 'rgba(120, 123, 134, 1)';
// Longest stretch of bars the P&L tracking walks (an extended-right tool far back in history).
const MAX_TRACKED_BARS = 20000;

// The simulated position: still open at the last bar, or closed at the stop/target.
interface PositionTrack {
    closed: boolean;
    openTime: number;
    endTime: number;
    endPrice: number;
}

// Rounded levels and the derived size of the position.
interface PositionNumbers {
    entry: number;
    risk: number;
    reward: number;
    qty: number | null;
}

interface LabelData {
    text: TextOptions;
    point: Point;
}

// Up to 2 decimals without trailing zeros: 20, 20.5, 10.25.
function trimNumber(value: number): string {
    return String(Number(value.toFixed(2)));
}

// "$1,071.71"; signed adds "+" / "-" ("-$250.00").
function formatMoney(value: number, currency: string, signed: boolean): string {
    const rounded = Math.round(value * 100) / 100;
    let sign = rounded < 0 ? '-' : '';
    if (signed && rounded > 0) { sign = '+'; }
    return sign + currency + Math.abs(rounded).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export class LongShortPositionPaneView extends LineToolPaneView {
    // Renderers for the Entry-Stop Loss and TP rectangles
    protected _entryStopLossRenderer: RectangleRenderer = new RectangleRenderer();
    protected _tpRenderer: RectangleRenderer = new RectangleRenderer();

    // Tracked position: shaded P&L zone and the dashed entry-to-exit line
    protected _pnlZoneRenderer: RectangleRenderer = new RectangleRenderer();
    protected _pnlLineRenderer: SegmentRenderer = new SegmentRenderer();

    // Renderers for text labels
    protected _entryStopLossLabelRenderer: TextRenderer = new TextRenderer();
    protected _tpLabelRenderer: TextRenderer = new TextRenderer();
    // Center label on the entry line (P&L, qty, entry, RR).
    protected _entryLineLabelRenderer: TextRenderer = new TextRenderer();

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
        const options = this._source.options() as PositionOptions;

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
            options.entryStopLossRectangle.extend.up || options.entryStopLossRectangle.extend.down ||
            options.entryTpRectangle.extend.left || options.entryTpRectangle.extend.right ||
            options.entryTpRectangle.extend.up || options.entryTpRectangle.extend.down) {
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

            if (options.showAutoText) {
                this._appendStats(compositeRenderer, options);
            } else {
                // Free text typed into the tool, placed as a plain box label
                this._appendCustomText(compositeRenderer, this._entryStopLossLabelRenderer, options.entryStopLossText, entryStopLossPoints);
                this._appendCustomText(compositeRenderer, this._tpLabelRenderer, options.entryTpText, tpPoints);
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

    // Target, stop and center labels (TradingView-style pills), plus the tracked P&L.
    private _appendStats(renderer: CompositeRenderer, options: PositionOptions): void {
        const priceScale = ensureNotNull(this._source.priceScale());
        const firstValue = ensureNotNull(priceScale.firstValue());
        const tool = this._source as LineToolLongShortPosition;
        const sourcePoints = this._source.points();
        const entry = Number(priceScale.formatPrice(sourcePoints[0].price, firstValue));
        const stop = Number(priceScale.formatPrice(sourcePoints[1].price, firstValue));
        const target = Number(priceScale.formatPrice(sourcePoints[2].price, firstValue));
        const isLong = tool.isCurrentLong();
        const risk = Math.abs(entry - stop);
        const reward = Math.abs(target - entry);
        const stats = options.stats;

        const extendRight = options.entryStopLossRectangle.extend.right || options.entryTpRectangle.extend.right;
        const track = stats.pnl ? this._trackPosition(entry, stop, target, isLong, extendRight) : null;
        if (track !== null) {
            this._appendTrack(renderer, options, track, entry, isLong);
        }

        if (!stats.alwaysShow && !this.areAnchorsVisible()) { return; }

        const numbers: PositionNumbers = { entry, risk, reward, qty: this._quantity(risk) };
        const targetColor = options.entryTpRectangle.border.color;
        const stopColor = options.entryStopLossRectangle.border.color;
        const centerX = (this._points[0].x + this._points[1].x) / 2 as Coordinate;

        const targetText = this._sideText('Target', stats.target, target, reward, numbers, options);
        if (targetText !== '') {
            const anchor = new Point(centerX, this._points[2].y);
            this._appendLabel(renderer, this._tpLabelRenderer, this._pill(targetText, options.entryTpText.font, targetColor, targetColor, anchor, isLong ? BoxVerticalAlignment.Top : BoxVerticalAlignment.Bottom));
        }

        const stopText = this._sideText('Stop', stats.stop, stop, risk, numbers, options);
        if (stopText !== '') {
            const anchor = new Point(centerX, this._points[1].y);
            this._appendLabel(renderer, this._entryStopLossLabelRenderer, this._pill(stopText, options.entryStopLossText.font, stopColor, stopColor, anchor, isLong ? BoxVerticalAlignment.Bottom : BoxVerticalAlignment.Top));
        }

        // Center label: coloured by the tracked P&L, neutral before the position opens
        const move = track === null ? 0 : (track.endPrice - entry) * (isLong ? 1 : -1);
        const centerText = this._centerText(options, track, move, numbers);
        if (centerText !== '') {
            let color = NEUTRAL_COLOR;
            if (move > 0) { color = targetColor; } else if (move < 0) { color = stopColor; }
            const anchor = new Point(centerX, this._points[0].y);
            this._appendLabel(renderer, this._entryLineLabelRenderer, this._pill(centerText, options.entryTpText.font, color, options.entryTpText.font.color, anchor, BoxVerticalAlignment.Middle));
        }
    }

    // "Target: 1.08900, 40 pips (0.37%), Amount: $200.00" / compact "1.08900 · 40 pips (0.37%) · $200.00"
    private _sideText(title: string, sideStats: LongShortPositionSideStats, level: number, move: number, numbers: PositionNumbers, options: PositionOptions): string {
        const compact = options.stats.compact;
        const entry = numbers.entry;
        const parts: string[] = [];
        if (sideStats.price) { parts.push(this._formatPrice(level)); }
        const distance = sideStats.distance ? this._formatDistance(move) : '';
        const percent = sideStats.percent && entry !== 0 ? `${(move / entry * 100).toFixed(2)}%` : '';
        if (distance !== '' && percent !== '') {
            parts.push(`${distance} (${percent})`);
        } else if (distance !== '' || percent !== '') {
            parts.push(distance + percent);
        }
        if (sideStats.amount && numbers.qty !== null) {
            const context = this._context();
            const value = formatMoney(numbers.qty * move * context.pointValue, context.currency, false);
            parts.push(compact ? value : `Amount: ${value}`);
        }
        if (parts.length === 0) { return ''; }
        return compact ? parts.join(' · ') : `${title}: ${parts.join(', ')}`;
    }

    // "Open P&L: +$85.20, Qty: 1.5 lots" over "Entry: 1.08500, RR 1:2"; compact puts it all on one line.
    private _centerText(options: PositionOptions, track: PositionTrack | null, move: number, numbers: PositionNumbers): string {
        const { entry, risk, reward, qty } = numbers;
        const context = this._context();
        const stats = options.stats;
        const compact = stats.compact;
        const first: string[] = [];
        const second: string[] = [];

        if (track !== null) {
            // Money with sizing, else the distance ("+12.5 pips")
            let pnl: string;
            if (qty !== null) {
                pnl = formatMoney(qty * move * context.pointValue, context.currency, true);
            } else {
                let sign = '';
                if (move > 0) { sign = '+'; } else if (move < 0) { sign = '-'; }
                pnl = sign + this._formatDistance(Math.abs(move));
            }
            first.push(compact ? pnl : `${track.closed ? 'Closed' : 'Open'} P&L: ${pnl}`);
        }
        if (stats.qty && qty !== null) {
            const qtyText = `${this._formatQty(qty)} ${context.qtyUnit}`;
            first.push(compact ? qtyText : `Qty: ${qtyText}`);
        }
        if (stats.entryPrice) {
            const entryText = this._formatPrice(entry);
            second.push(compact ? entryText : `Entry: ${entryText}`);
        }
        if (stats.riskReward) {
            const lockedRatio = (this._source as LineToolLongShortPosition).lockedRiskRewardRatio();
            if (lockedRatio !== null) {
                second.push(`RR 1:${trimNumber(lockedRatio)} (locked)`);
            } else if (risk > 0) {
                second.push(`RR 1:${trimNumber(reward / risk)}`);
            }
        }

        if (compact) { return first.concat(second).join(' · '); }
        return [first.join(', '), second.join(', ')].filter((line: string) => line !== '').join('\n');
    }

    // Solid rounded label, centered on `anchor`: above it (Top), below it (Bottom) or across it (Middle).
    private _pill(value: string, font: TextFontOptions, color: string, borderColor: string, anchor: Point, vertical: BoxVerticalAlignment): LabelData {
        return {
            point: anchor,
            text: {
                value,
                alignment: TextAlignment.Center,
                font: { ...font },
                padding: Math.round(font.size / 4),
                wordWrapWidth: 0,
                forceTextAlign: false,
                forceCalculateMaxLineWidth: false,
                box: {
                    alignment: { vertical, horizontal: BoxHorizontalAlignment.Center },
                    angle: 0,
                    scale: 1,
                    offset: { x: 0, y: 4 },
                    padding: { x: Math.round(font.size / 2), y: Math.round(font.size / 4) },
                    background: { color, inflation: { x: 0, y: 0 } },
                    border: { color: borderColor, width: 1, radius: 4, highlight: false, style: LineStyle.Solid },
                },
            },
        };
    }

    private _appendLabel(renderer: CompositeRenderer, labelRenderer: TextRenderer, label: LabelData): void {
        labelRenderer.setData({ text: label.text, points: [label.point] });
        renderer.append(labelRenderer);
    }

    // Shades the P&L area from the open to the exit (or the last bar) and draws the dashed entry-to-exit line.
    private _appendTrack(renderer: CompositeRenderer, options: PositionOptions, track: PositionTrack, entry: number, isLong: boolean): void {
        const priceScale = ensureNotNull(this._source.priceScale());
        const firstValue = ensureNotNull(ensureNotNull(this._source.ownerSource()).firstValue());
        const timeScale = this._model.timeScale();
        const x0 = timeScale.timeToCoordinate({ timestamp: track.openTime as UTCTimestamp });
        const x1 = timeScale.timeToCoordinate({ timestamp: track.endTime as UTCTimestamp });
        const yEntry = priceScale.priceToCoordinate(entry, firstValue.value);
        const yEnd = priceScale.priceToCoordinate(track.endPrice, firstValue.value);
        const inProfit = (track.endPrice - entry) * (isLong ? 1 : -1) >= 0;
        const zone = inProfit ? options.entryTpRectangle : options.entryStopLossRectangle;

        this._pnlZoneRenderer.setData({
            points: [new AnchorPoint(x0, yEntry, 0), new AnchorPoint(x1, yEnd, 1)],
            background: zone.background,
            border: { width: 0 },
            extend: { left: false, right: false, up: false, down: false },
            hitTestBackground: false,
        });
        this._pnlLineRenderer.setData({
            points: [new AnchorPoint(x0, yEntry, 0), new AnchorPoint(x1, yEnd, 1)],
            line: { color: NEUTRAL_COLOR, width: 1, style: LineStyle.Dashed },
        });
        renderer.append(this._pnlZoneRenderer);
        renderer.append(this._pnlLineRenderer);
    }

    // Walks the bars inside the tool: the position opens on the first bar that trades through
    // the entry, then closes on the first later bar that reaches the stop or the target
    // (the stop wins when one bar reaches both). Null until the entry is reached.
    private _trackPosition(entry: number, stop: number, target: number, isLong: boolean, extendRight: boolean): PositionTrack | null {
        const rows = this._barRows();
        if (rows === null || rows.length === 0) { return null; }

        const sourcePoints = this._source.points();
        const startTime = Math.min(sourcePoints[0].timestamp, sourcePoints[1].timestamp);
        const endTime = extendRight ? Infinity : Math.max(sourcePoints[0].timestamp, sourcePoints[1].timestamp);

        // First bar at or after the tool's left edge
        let low = 0;
        let high = rows.length;
        while (low < high) {
            const mid = (low + high) >> 1;
            if (rows[mid].time.timestamp < startTime) { low = mid + 1; } else { high = mid; }
        }

        let openTime: number | null = null;
        let lastRow: PlotRow | null = null;
        const limit = Math.min(rows.length, low + MAX_TRACKED_BARS);
        for (let i = low; i < limit; i++) {
            const row = rows[i];
            if (row.time.timestamp > endTime) { break; }
            const barHigh = row.value[PlotRowValueIndex.High];
            const barLow = row.value[PlotRowValueIndex.Low];
            if (openTime === null) {
                // Exits are only checked from the next bar: inside the opening bar the order is unknown
                if (barLow <= entry && entry <= barHigh) {
                    openTime = row.time.timestamp;
                    lastRow = row;
                }
                continue;
            }
            lastRow = row;
            if (isLong ? barLow <= stop : barHigh >= stop) {
                return { closed: true, openTime, endTime: row.time.timestamp, endPrice: stop };
            }
            if (isLong ? barHigh >= target : barLow <= target) {
                return { closed: true, openTime, endTime: row.time.timestamp, endPrice: target };
            }
        }

        if (openTime === null || lastRow === null) { return null; }
        return { closed: false, openTime, endTime: lastRow.time.timestamp, endPrice: lastRow.value[PlotRowValueIndex.Close] };
    }

    // Bars of the series the tool sits on (the first series if its owner was removed).
    // Typed as Series (type-only import) so the build's property renaming matches the real class.
    private _barRows(): readonly PlotRow[] | null {
        const serieses = this._model.serieses();
        const owner = this._source.ownerSource() as unknown as Series | null;
        const series = owner !== null && serieses.indexOf(owner) !== -1 ? owner : serieses[0];
        if (series === undefined || typeof series.bars !== 'function') { return null; }
        return series.bars().rows();
    }

    // Instrument and account numbers, set chart-wide by the app.
    private _context(): PositionToolOptions {
        return this._model.options().positionTool;
    }

    // Position size that loses `riskAmount` at the stop, floored to the size grid
    // like the trade ticket does. Null without sizing.
    private _quantity(risk: number): number | null {
        const { riskAmount, pointValue, qtyStep } = this._context();
        if (!(riskAmount > 0) || !(pointValue > 0) || !(risk > 0)) { return null; }
        const raw = riskAmount / (risk * pointValue);
        if (qtyStep > 0) {
            return Math.max(1, Math.floor(raw / qtyStep + 1e-9)) * qtyStep;
        }
        return Number(raw.toPrecision(4));
    }

    private _formatQty(qty: number): string {
        const step = this._context().qtyStep;
        if (step > 0) {
            const decimals = (String(step).split('.')[1] || '').length;
            return String(Number(qty.toFixed(decimals)));
        }
        return String(qty);
    }

    private _formatPrice(price: number): string {
        const priceScale = ensureNotNull(this._source.priceScale());
        return priceScale.formatPrice(price, ensureNotNull(priceScale.firstValue()));
    }

    // "40 pips" with a pip size, else the plain price offset ("0.00400").
    private _formatDistance(move: number): string {
        const { pipSize, pipLabel } = this._context();
        if (pipSize > 0) { return `${trimNumber(move / pipSize)} ${pipLabel}`; }
        return ensureNotNull(this._source.priceScale()).formatPriceAbsolute(move);
    }

    private _appendCustomText(renderer: CompositeRenderer, labelRenderer: TextRenderer, textOptions: TextOptions, points: AnchorPoint[]): void {
        if (!textOptions.value) { return; }
        this._appendLabel(renderer, labelRenderer, this._getText(textOptions, points));
    }

    private _getText(textOptions: TextOptions, points: AnchorPoint[]): LabelData {
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

        return { text: labelOptions, point: pivot };
    }
}
