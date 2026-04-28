import { expect } from 'chai';
import { describe, it } from 'mocha';

import { ChartModel } from '../../src/model/chart-model';
import { Delegate } from '../../src/helpers/delegate';
import { LineToolVisibleRangeVolumeProfile } from '../../src/model/line-tool-visible-range-volume-profile';
import { VisibleRangeVolumeProfileToolOptions } from '../../src/model/line-tool-options';

interface FakeTimeScale {
	visibleBarsChanged: () => Delegate;
	logicalRangeChanged: () => Delegate;
}

interface FakeModel {
	visibleBarsDelegate: Delegate;
	logicalRangeDelegate: Delegate;
	updateSourceCalls: number;
	timeScale: () => FakeTimeScale;
	updateSource: () => void;
	serieses: () => unknown[];
	panes: () => unknown[];
}

function buildFakeModel(): FakeModel {
	const visibleBarsDelegate = new Delegate();
	const logicalRangeDelegate = new Delegate();
	const fake: FakeModel = {
		visibleBarsDelegate,
		logicalRangeDelegate,
		updateSourceCalls: 0,
		timeScale: () => ({
			visibleBarsChanged: () => visibleBarsDelegate,
			logicalRangeChanged: () => logicalRangeDelegate,
		}),
		updateSource: () => { fake.updateSourceCalls++; },
		serieses: () => [],
		panes: () => [{ rightPriceScale: () => null }],
	};
	return fake;
}

function minimalOptions(): VisibleRangeVolumeProfileToolOptions {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return {
		visible: true,
		editable: false,
		locked: false,
		line: { width: 2, color: '#2962ff', style: 0 },
		volumeProfile: {
			bars: [],
			bins: 24,
			barColor: '#000',
			valueAreaColor: '#111',
			buyColor: '#0a0',
			sellColor: '#a00',
			pocColor: '#f00',
			valueAreaVolume: 0.7,
			showPOC: true,
			showValueArea: true,
			borderColor: '#888',
			backgroundColor: '#222',
			borderWidth: 0,
			pocExpansion: 'right',
			barWidthRatio: 0.3,
			barAnchorSide: 'right',
		},
	} as VisibleRangeVolumeProfileToolOptions;
}

describe('LineToolVisibleRangeVolumeProfile — auto-re-anchor on viewport change', () => {
	it('subscribes to both visibleBarsChanged and logicalRangeChanged on construction', () => {
		const model = buildFakeModel();
		new LineToolVisibleRangeVolumeProfile(model as unknown as ChartModel, minimalOptions(), []);

		expect(model.visibleBarsDelegate.hasListeners()).to.be.equal(true, 'visibleBarsChanged must have a listener');
		expect(model.logicalRangeDelegate.hasListeners()).to.be.equal(true, 'logicalRangeChanged must have a listener');
	});

	it('invalidates the source when logicalRangeChanged fires (pan/zoom)', () => {
		const model = buildFakeModel();
		new LineToolVisibleRangeVolumeProfile(model as unknown as ChartModel, minimalOptions(), []);

		const before = model.updateSourceCalls;
		model.logicalRangeDelegate.fire(undefined, undefined);

		expect(model.updateSourceCalls).to.be.equal(before + 1);
	});

	it('invalidates the source when visibleBarsChanged fires (playback tick)', () => {
		const model = buildFakeModel();
		new LineToolVisibleRangeVolumeProfile(model as unknown as ChartModel, minimalOptions(), []);

		const before = model.updateSourceCalls;
		model.visibleBarsDelegate.fire(undefined, undefined);

		expect(model.updateSourceCalls).to.be.equal(before + 1);
	});

	it('handles repeated viewport changes (rapid pan/zoom) without dropping events', () => {
		const model = buildFakeModel();
		new LineToolVisibleRangeVolumeProfile(model as unknown as ChartModel, minimalOptions(), []);

		for (let i = 0; i < 25; i++) {
			model.logicalRangeDelegate.fire(undefined, undefined);
			model.visibleBarsDelegate.fire(undefined, undefined);
		}

		expect(model.updateSourceCalls).to.be.equal(50);
	});

	it('unsubscribes both delegates on destroy() (no leak)', () => {
		const model = buildFakeModel();
		const tool = new LineToolVisibleRangeVolumeProfile(model as unknown as ChartModel, minimalOptions(), []);

		expect(model.visibleBarsDelegate.hasListeners()).to.be.equal(true);
		expect(model.logicalRangeDelegate.hasListeners()).to.be.equal(true);

		tool.destroy();

		expect(model.visibleBarsDelegate.hasListeners()).to.be.equal(false, 'visibleBarsChanged listener must be removed on destroy');
		expect(model.logicalRangeDelegate.hasListeners()).to.be.equal(false, 'logicalRangeChanged listener must be removed on destroy');
	});

	it('does not fire updateSource after destroy()', () => {
		const model = buildFakeModel();
		const tool = new LineToolVisibleRangeVolumeProfile(model as unknown as ChartModel, minimalOptions(), []);

		tool.destroy();
		const before = model.updateSourceCalls;

		// Even if a stale event fires, no listener should remain.
		model.logicalRangeDelegate.fire(undefined, undefined);
		model.visibleBarsDelegate.fire(undefined, undefined);

		expect(model.updateSourceCalls).to.be.equal(before);
	});
});
