# Changelog

All notable changes to this fork of `lightweight-charts` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.9.0] - 2026-04-28

Volume Profile extensions to support buy/sell visualization and a viewport-anchored
profile variant for the React app's Volume Profile indicator. All changes are
additive and backward-compatible — existing single-color `FixedRangeVolumeProfile`
callers continue to render unchanged.

### Added

- **Two-tone (buy/sell) bar rendering on `FixedRangeVolumeProfile`.** Each
  `VolumeProfileBar` now accepts optional `buyVolume` and `sellVolume` fields.
  When both are present on any bar in a profile, every bin renders as two
  horizontally-stacked segments coloured with `buyColor` (interior side) and
  `sellColor` (edge side). Bars without buy/sell splits keep rendering in
  single-color mode using the existing `barColor`.
- **`buyColor` and `sellColor` options** on `FixedRangeVolumeProfileOptions`.
  Defaults: `buyColor = rgba(38,166,154,0.7)` (teal), `sellColor = rgba(239,83,80,0.7)`
  (red), matching conventional buy/sell colour conventions.
- **`barAnchorSide: 'left' | 'right'` option** controlling which side of the
  profile box the histogram bars hang from. Defaults to `'left'` for
  `FixedRangeVolumeProfile` (preserving existing behaviour) and `'right'` for
  the new `VisibleRangeVolumeProfile`.
- **New `VisibleRangeVolumeProfile` line tool.** A passive, viewport-anchored
  variant of the volume profile that automatically spans the chart's visible
  time range. The profile recomputes its anchor extent on pan and zoom and
  stays glued to the right edge of the visible range as new bars stream in
  during playback. Internally it subscribes to `timeScale.visibleBarsChanged()`
  and `timeScale.logicalRangeChanged()`; subscriptions are torn down via
  `destroy()` (called from `pane.removeDataSource`) so removing the tool leaves
  no leaked listeners.
- `pane.removeDataSource` now invokes `source.destroy()` if the source defines
  one, mirroring the series-removal pattern in `chart-model.removeSeries`. This
  is what gives the visible-range tool a deterministic cleanup hook; existing
  tools whose `destroy()` is a no-op are unaffected.

### Changed

- `applyOptions({ volumeProfile: { bars: ... } })` continues to handle live
  updates without flicker or leaks. The `merge()` helper already trims the
  destination array when a shorter `bars` array is supplied (no stale tail);
  this is now covered by unit tests at
  `tests/unittests/merge-volume-profile-bars.spec.ts`.

### Documentation

- The four public coordinate APIs (`series.priceToCoordinate`,
  `series.coordinateToPrice`, `chart.timeScale().timeToCoordinate`,
  `chart.timeScale().coordinateToTime`) are exported and documented in
  `dist/typings.d.ts`. No signature changes — this release simply confirms the
  contract.

### Tests

- Added `tests/unittests/merge-volume-profile-bars.spec.ts` covering shrink,
  grow, replace, and rapid-sequential-update semantics on the `bars` array.
- Added `tests/unittests/visible-range-volume-profile-subscription.spec.ts`
  covering subscription on construction, re-anchor on `visibleBarsChanged` and
  `logicalRangeChanged`, repeated rapid events, and clean unsubscribe on
  `destroy()`.

[3.9.0]: https://github.com/tradingview/lightweight-charts/compare/v3.8.0...v3.9.0
