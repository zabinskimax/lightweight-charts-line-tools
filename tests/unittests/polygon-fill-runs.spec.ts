import { expect } from 'chai';
import { describe, it } from 'mocha';

import { buildPolygonFillRuns } from '../../src/views/pane/polygon-fill-pane-view';

describe('buildPolygonFillRuns', () => {
	it('returns empty runs when colors is undefined', () => {
		const result = buildPolygonFillRuns(undefined, '#f00', 10, 10);
		expect(result.runs).to.deep.equal([]);
		expect(result.truncated).to.equal(false);
	});

	it('returns empty runs when colors is an empty array', () => {
		const result = buildPolygonFillRuns([], '#f00', 10, 10);
		expect(result.runs).to.deep.equal([]);
		expect(result.truncated).to.equal(false);
	});

	it('returns empty runs when either items array has zero length', () => {
		const result = buildPolygonFillRuns(['#f00', '#f00'], '#0f0', 0, 5);
		expect(result.runs).to.deep.equal([]);
	});

	it('emits a single run when all colors are the same string', () => {
		const colors = ['#f00', '#f00', '#f00', '#f00'];
		const result = buildPolygonFillRuns(colors, '#000', 4, 4);
		expect(result.runs).to.deep.equal([
			{ fromIndex: 0, toIndex: 3, color: '#f00' },
		]);
		expect(result.truncated).to.equal(false);
	});

	it('emits a single run when all colors null with identical fallback', () => {
		const colors = [null, null, undefined, null];
		const result = buildPolygonFillRuns(colors, '#abc', 4, 4);
		expect(result.runs).to.deep.equal([
			{ fromIndex: 0, toIndex: 3, color: '#abc' },
		]);
	});

	it('emits adjacent runs that share the boundary vertex on color change', () => {
		const colors = ['#a', '#a', '#a', '#b', '#b'];
		const result = buildPolygonFillRuns(colors, '#000', 5, 5);
		expect(result.runs).to.deep.equal([
			{ fromIndex: 0, toIndex: 3, color: '#a' },
			{ fromIndex: 3, toIndex: 4, color: '#b' },
		]);
		for (let i = 1; i < result.runs.length; i++) {
			expect(result.runs[i].fromIndex).to.equal(result.runs[i - 1].toIndex);
		}
	});

	it('emits N runs for fully alternating colors', () => {
		const colors = ['#a', '#b', '#a', '#b'];
		const result = buildPolygonFillRuns(colors, '#000', 4, 4);
		expect(result.runs).to.deep.equal([
			{ fromIndex: 0, toIndex: 1, color: '#a' },
			{ fromIndex: 1, toIndex: 2, color: '#b' },
			{ fromIndex: 2, toIndex: 3, color: '#a' },
			{ fromIndex: 3, toIndex: 3, color: '#b' },
		]);
	});

	it('resolves null and undefined entries to the fallback color at build time', () => {
		const colors = ['#a', null, undefined, '#a'];
		const result = buildPolygonFillRuns(colors, '#fff', 4, 4);
		expect(result.runs).to.deep.equal([
			{ fromIndex: 0, toIndex: 1, color: '#a' },
			{ fromIndex: 1, toIndex: 3, color: '#fff' },
			{ fromIndex: 3, toIndex: 3, color: '#a' },
		]);
	});

	it('changes the materialized fallback when rebuilding with a different fillColor', () => {
		const colors = ['#a', null, null, '#a'];
		const first = buildPolygonFillRuns(colors, '#000', 4, 4);
		const second = buildPolygonFillRuns(colors, '#fff', 4, 4);
		expect(first.runs[1].color).to.equal('#000');
		expect(second.runs[1].color).to.equal('#fff');
	});

	it('flags truncation when colors is longer than items and clamps the last run', () => {
		const colors = ['#a', '#a', '#b', '#b', '#c', '#c'];
		const result = buildPolygonFillRuns(colors, '#000', 4, 4);
		expect(result.truncated).to.equal(true);
		expect(result.runs).to.deep.equal([
			{ fromIndex: 0, toIndex: 2, color: '#a' },
			{ fromIndex: 2, toIndex: 3, color: '#b' },
		]);
	});

	it('clamps to the shorter of the two items arrays', () => {
		const colors = ['#a', '#a', '#a', '#a', '#a'];
		const result = buildPolygonFillRuns(colors, '#000', 5, 3);
		expect(result.runs).to.deep.equal([
			{ fromIndex: 0, toIndex: 2, color: '#a' },
		]);
		expect(result.truncated).to.equal(true);
	});

	it('does not flag truncation when colors is shorter than items', () => {
		const colors = ['#a', '#a'];
		const result = buildPolygonFillRuns(colors, '#000', 5, 5);
		expect(result.truncated).to.equal(false);
		expect(result.runs).to.deep.equal([
			{ fromIndex: 0, toIndex: 1, color: '#a' },
		]);
	});

	it('handles length 1 cleanly', () => {
		const result = buildPolygonFillRuns(['#a'], '#000', 1, 1);
		expect(result.runs).to.deep.equal([
			{ fromIndex: 0, toIndex: 0, color: '#a' },
		]);
	});
});
