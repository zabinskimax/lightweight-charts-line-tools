import { expect } from 'chai';
import { describe, it } from 'mocha';

import { merge } from '../../src/helpers/strict-type-checks';

interface Bar {
	price: number;
	volume: number;
	buyVolume?: number;
	sellVolume?: number;
}

describe('merge() — volume-profile bars array semantics', () => {
	it('replaces values when the new bars array is the same length', () => {
		const dst = { volumeProfile: { bars: [{ price: 100, volume: 5 }, { price: 101, volume: 6 }] as Bar[] } };
		const src = { volumeProfile: { bars: [{ price: 100, volume: 50 }, { price: 101, volume: 60 }] as Bar[] } };

		merge(dst, src);

		expect(dst.volumeProfile.bars).to.have.length(2);
		expect(dst.volumeProfile.bars[0].volume).to.equal(50);
		expect(dst.volumeProfile.bars[1].volume).to.equal(60);
	});

	it('grows the destination array when the new bars array is longer', () => {
		const dst = { volumeProfile: { bars: [{ price: 100, volume: 5 }] as Bar[] } };
		const src = { volumeProfile: { bars: [{ price: 100, volume: 5 }, { price: 101, volume: 6 }, { price: 102, volume: 7 }] as Bar[] } };

		merge(dst, src);

		expect(dst.volumeProfile.bars).to.have.length(3);
		expect(dst.volumeProfile.bars[2].price).to.equal(102);
		expect(dst.volumeProfile.bars[2].volume).to.equal(7);
	});

	it('shrinks the destination array when the new bars array is shorter (no stale tail)', () => {
		const dst = { volumeProfile: { bars: [{ price: 100, volume: 5 }, { price: 101, volume: 6 }, { price: 102, volume: 7 }] as Bar[] } };
		const src = { volumeProfile: { bars: [{ price: 100, volume: 50 }] as Bar[] } };

		merge(dst, src);

		expect(dst.volumeProfile.bars).to.have.length(1);
		expect(dst.volumeProfile.bars[0].volume).to.equal(50);
	});

	it('preserves and updates buy/sell fields on existing bars', () => {
		const dst = { volumeProfile: { bars: [{ price: 100, volume: 10, buyVolume: 4, sellVolume: 6 }] as Bar[] } };
		const src = { volumeProfile: { bars: [{ price: 100, volume: 20, buyVolume: 12, sellVolume: 8 }] as Bar[] } };

		merge(dst, src);

		expect(dst.volumeProfile.bars[0].volume).to.equal(20);
		expect(dst.volumeProfile.bars[0].buyVolume).to.equal(12);
		expect(dst.volumeProfile.bars[0].sellVolume).to.equal(8);
	});

	it('handles rapid sequential updates without stale state', () => {
		const dst = { volumeProfile: { bars: [] as Bar[] } };

		// Simulate playback: 50 successive updates with shrinking/growing payloads
		for (let i = 0; i < 50; i++) {
			const len = (i % 5) + 1;
			const src = {
				volumeProfile: {
					bars: Array.from({ length: len }, (_, j) => ({
						price: 100 + j,
						volume: i * 10 + j,
						buyVolume: i * 4 + j,
						sellVolume: i * 6,
					})) as Bar[],
				},
			};
			merge(dst, src);
			expect(dst.volumeProfile.bars).to.have.length(len);
		}

		// Last iteration: i=49, len = (49 % 5) + 1 = 5
		expect(dst.volumeProfile.bars).to.have.length(5);
		expect(dst.volumeProfile.bars[0].volume).to.equal(490);
	});
});
