import { expect } from 'chai';
import { describe, it } from 'mocha';

import { VolumeProfileBar } from '../../src/model/line-tool-options';
import { deriveFallbackBinSize, resolveBarPriceExtents } from '../../src/views/pane/volume-profile-bar-extents';

describe('resolveBarPriceExtents()', () => {
	it('uses uniform fallback derived from first two bars when no extents are supplied', () => {
		// Sorted high-to-low (matches pane-view sort), uniform spacing of 1.0.
		const bars: VolumeProfileBar[] = [
			{ price: 103, volume: 1 },
			{ price: 102, volume: 2 },
			{ price: 101, volume: 3 },
			{ price: 100, volume: 4 },
		];

		const extents = resolveBarPriceExtents(bars);

		expect(extents).to.have.length(4);
		for (let i = 0; i < extents.length; i++) {
			expect(extents[i].top - extents[i].bottom).to.be.closeTo(1.0, 1e-9);
			expect((extents[i].top + extents[i].bottom) / 2).to.be.closeTo(bars[i].price, 1e-9);
		}
	});

	it('uses explicit priceLow / priceHigh per bar for non-uniform (log-spaced) layouts', () => {
		// Logarithmic spacing over a 10x price range. Each bar carries its actual
		// bin edges; renderer must honour them rather than derive a uniform extent.
		const bars: VolumeProfileBar[] = [
			{ price: 7.4767, priceLow: 4.6416, priceHigh: 10.0000, volume: 1 },
			{ price: 3.4700, priceLow: 2.1544, priceHigh: 4.6416, volume: 2 },
			{ price: 1.6107, priceLow: 1.0000, priceHigh: 2.1544, volume: 3 },
		];

		const extents = resolveBarPriceExtents(bars);

		expect(extents).to.have.length(3);
		expect(extents[0]).to.deep.equal({ top: 10.0000, bottom: 4.6416 });
		expect(extents[1]).to.deep.equal({ top: 4.6416, bottom: 2.1544 });
		expect(extents[2]).to.deep.equal({ top: 2.1544, bottom: 1.0000 });

		// Span is non-uniform — exactly the property the feature exists to support.
		const spans = extents.map((e: { top: number; bottom: number }) => e.top - e.bottom);
		expect(spans[0]).to.not.be.closeTo(spans[1], 1e-3);
		expect(spans[1]).to.not.be.closeTo(spans[2], 1e-3);
	});

	it('mixes explicit and implicit bars in the same array', () => {
		// First two bars have explicit extents (define a non-uniform pair); the
		// third lacks them and falls back to price ± fallback / 2 where the
		// fallback is derived from the first two `price` values (|105 - 102| = 3).
		const bars: VolumeProfileBar[] = [
			{ price: 105, priceLow: 103, priceHigh: 107, volume: 1 },
			{ price: 102, priceLow: 100, priceHigh: 103, volume: 2 },
			{ price: 99, volume: 3 },
		];

		const extents = resolveBarPriceExtents(bars);

		expect(extents[0]).to.deep.equal({ top: 107, bottom: 103 });
		expect(extents[1]).to.deep.equal({ top: 103, bottom: 100 });
		expect(extents[2].top).to.be.closeTo(99 + 3 / 2, 1e-9);
		expect(extents[2].bottom).to.be.closeTo(99 - 3 / 2, 1e-9);
	});

	it('swaps inverted priceLow / priceHigh defensively', () => {
		const bars: VolumeProfileBar[] = [
			{ price: 100, priceLow: 105, priceHigh: 95, volume: 1 },
		];

		const extents = resolveBarPriceExtents(bars);

		expect(extents[0].top).to.equal(105);
		expect(extents[0].bottom).to.equal(95);
	});

	it('treats a half-specified bar (only priceLow set) as if extents were absent', () => {
		const bars: VolumeProfileBar[] = [
			{ price: 102, volume: 1 },
			{ price: 100, priceLow: 99, volume: 2 }, // priceHigh missing
		];

		const extents = resolveBarPriceExtents(bars);

		// Fallback bin size = |102 - 100| = 2; both bars use price ± 1.
		expect(extents[1].top).to.be.closeTo(101, 1e-9);
		expect(extents[1].bottom).to.be.closeTo(99, 1e-9);
	});

	it('uses explicit extents on a single-bar array (skipping the price * 0.001 fallback)', () => {
		const bars: VolumeProfileBar[] = [
			{ price: 100, priceLow: 80, priceHigh: 120, volume: 1 },
		];

		const extents = resolveBarPriceExtents(bars);

		expect(extents[0]).to.deep.equal({ top: 120, bottom: 80 });
	});

	it('falls back to price * 0.001 for a single-bar array without extents (backward compat)', () => {
		const bars: VolumeProfileBar[] = [
			{ price: 100, volume: 1 },
		];

		const extents = resolveBarPriceExtents(bars);

		expect(extents[0].top).to.be.closeTo(100 + 0.05, 1e-9);
		expect(extents[0].bottom).to.be.closeTo(100 - 0.05, 1e-9);
	});

	it('returns an empty array for an empty input', () => {
		expect(resolveBarPriceExtents([])).to.deep.equal([]);
	});
});

describe('deriveFallbackBinSize()', () => {
	it('returns the absolute spacing of the first two bars when length > 1', () => {
		expect(deriveFallbackBinSize([
			{ price: 105, volume: 0 },
			{ price: 100, volume: 0 },
		])).to.equal(5);
	});

	it('returns price * 0.001 for a single-bar array', () => {
		expect(deriveFallbackBinSize([{ price: 100, volume: 0 }])).to.be.closeTo(0.1, 1e-9);
	});

	it('returns 0 for an empty array', () => {
		expect(deriveFallbackBinSize([])).to.equal(0);
	});
});
