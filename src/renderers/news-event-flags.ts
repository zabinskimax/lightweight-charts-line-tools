/*!
 * @license
 * Flag artwork for the news-event icons: flag-icons 7.2.3, 1x1 set
 * (https://github.com/lipis/flag-icons), trimmed to the calendar currencies.
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2013 Panayiotis Lipiridis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Keyed by currency code. A Map (not an object literal) so the build's
// properties-rename pass never touches the codes.
const flagSvgs: Map<string, string> = new Map<string, string>([
	['USD', '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#bd3d44" d="M0 0h512v512H0"/><path stroke="#fff" stroke-width="40" d="M0 58h512M0 137h512M0 216h512M0 295h512M0 374h512M0 453h512"/><path fill="#192f5d" d="M0 0h390v275H0z"/><marker id="us-a" markerHeight="30" markerWidth="30"><path fill="#fff" d="m15 0 9.3 28.6L0 11h30L5.7 28.6"/></marker><path fill="none" marker-mid="url(#us-a)" d="m0 0 18 11h65 65 65 65 66L51 39h65 65 65 65L18 66h65 65 65 65 66L51 94h65 65 65 65L18 121h65 65 65 65 66L51 149h65 65 65 65L18 177h65 65 65 65 66L51 205h65 65 65 65L18 232h65 65 65 65 66z"/></svg>'],
	['EUR', '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"><defs><g id="eu-d"><g id="eu-b"><path id="eu-a" d="m0-1-.3 1 .5.1z"/><use xlink:href="#eu-a" transform="scale(-1 1)"/></g><g id="eu-c"><use xlink:href="#eu-b" transform="rotate(72)"/><use xlink:href="#eu-b" transform="rotate(144)"/></g><use xlink:href="#eu-c" transform="scale(-1 1)"/></g></defs><path fill="#039" d="M0 0h512v512H0z"/><g fill="#fc0" transform="translate(256 258.4)scale(25.28395)"><use xlink:href="#eu-d" width="100%" height="100%" y="-6"/><use xlink:href="#eu-d" width="100%" height="100%" y="6"/><g id="eu-e"><use xlink:href="#eu-d" width="100%" height="100%" x="-6"/><use xlink:href="#eu-d" width="100%" height="100%" transform="rotate(-144 -2.3 -2.1)"/><use xlink:href="#eu-d" width="100%" height="100%" transform="rotate(144 -2.1 -2.3)"/><use xlink:href="#eu-d" width="100%" height="100%" transform="rotate(72 -4.7 -2)"/><use xlink:href="#eu-d" width="100%" height="100%" transform="rotate(72 -5 .5)"/></g><use xlink:href="#eu-e" width="100%" height="100%" transform="scale(-1 1)"/></g></svg>'],
	['GBP', '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#012169" d="M0 0h512v512H0z"/><path fill="#FFF" d="M512 0v64L322 256l190 187v69h-67L254 324 68 512H0v-68l186-187L0 74V0h62l192 188L440 0z"/><path fill="#C8102E" d="m184 324 11 34L42 512H0v-3zm124-12 54 8 150 147v45zM512 0 320 196l-4-44L466 0zM0 1l193 189-59-8L0 49z"/><path fill="#FFF" d="M176 0v512h160V0zM0 176v160h512V176z"/><path fill="#C8102E" d="M0 208v96h512v-96zM208 0v512h96V0z"/></svg>'],
	['JPY', '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><clipPath id="jp-a"><path fill-opacity=".7" d="M177.2 0h708.6v708.7H177.2z"/></clipPath></defs><g fill-rule="evenodd" stroke-width="1pt" clip-path="url(#jp-a)" transform="translate(-128)scale(.72249)"><path fill="#fff" d="M0 0h1063v708.7H0z"/><circle cx="523.1" cy="344.1" r="194.9" fill="#bc002d" transform="translate(-59.7 -34.5)scale(1.1302)"/></g></svg>'],
	['CHF', '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g fill-rule="evenodd" stroke-width="1pt"><path fill="red" d="M0 0h512v512H0z"/><g fill="#fff"><path d="M96 208h320v96H96z"/><path d="M208 96h96v320h-96z"/></g></g></svg>'],
	['CAD', '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M81.1 0h362.3v512H81.1z"/><path fill="#d52b1e" d="M-100 0H81.1v512H-100zm543.4 0h181.1v512H443.4zM135.3 247.4l-14 4.8 65.4 57.5c5 14.8-1.7 19.1-6 26.9l71-9-1.8 71.5 14.8-.5-3.3-70.9 71.2 8.4c-4.4-9.3-8.3-14.2-4.3-29l65.4-54.5-11.4-4.1c-9.4-7.3 4-34.8 6-52.2 0 0-38.1 13.1-40.6 6.2l-9.9-18.5-34.6 38c-3.8 1-5.4-.6-6.3-3.8l16-79.7-25.4 14.3c-2.1.9-4.2 0-5.6-2.4l-24.5-49-25.2 50.9c-1.9 1.8-3.8 2-5.4.8l-24.2-13.6 14.5 79.2c-1.1 3-3.9 4-7.1 2.3l-33.3-37.8c-4.3 7-7.3 18.4-13 21-5.7 2.3-25-4.9-37.9-7.7 4.4 15.9 18.2 42.3 9.5 51z"/></svg>'],
	['AUD', '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#00008B" d="M0 0h512v512H0z"/><path fill="#fff" d="M256 0v32l-95 96 95 93.5V256h-33.5L127 162l-93 94H0v-34l93-93.5L0 37V0h31l96 94 93-94z"/><path fill="red" d="m92 162 5.5 17L21 256H0v-1.5zm62-6 27 4 75 73.5V256zM256 0l-96 98-2-22 75-76zM0 .5 96.5 95 67 91 0 24.5z"/><path fill="#fff" d="M88 0v256h80V0zM0 88v80h256V88z"/><path fill="red" d="M0 104v48h256v-48zM104 0v256h48V0z"/><path fill="#fff" d="m202 402.8-45.8 5.4 4.6 45.9-32.8-32.4-33 32.2 4.9-45.9-45.8-5.8L93 377.4 69 338l43.6 15 15.8-43.4 15.5 43.5 43.7-14.7-24.3 39.2 38.8 25.1Zm222.7 8-20.5 2.6 2.2 20.5-14.8-14.4-14.7 14.5 2-20.5-20.5-2.4 17.3-11.2-10.9-17.5 19.6 6.5 6.9-19.5 7.1 19.4 19.5-6.7-10.7 17.6zM415 293.6l2.7-13-9.8-9 13.2-1.5 5.5-12.1 5.5 12.1 13.2 1.5-9.8 9 2.7 13-11.6-6.6zm-84.1-60-20.3 2.2 1.8 20.3-14.4-14.5-14.8 14.1 2.4-20.3-20.2-2.7 17.3-10.8-10.5-17.5 19.3 6.8 7.2-19.1 6.7 19.3 19.4-6.3-10.9 17.3zm175.8-32.8-20.9 2.7 2.3 20.9-15.1-14.7-15 14.8 2.1-21-20.9-2.4 17.7-11.5-11.1-17.9 20 6.7 7-19.8 7.2 19.8 19.9-6.9-11 18zm-82.1-83.5-20.7 2.3 1.9 20.8-14.7-14.8L376 140l2.4-20.7-20.7-2.8 17.7-11-10.7-17.9 19.7 6.9 7.3-19.5 6.8 19.7 19.8-6.5-11.1 17.6z"/></svg>'],
	['NZD', '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"><defs><g id="nz-b"><g id="nz-a"><path d="M0-.3v.5l1-.5z"/><path d="M.2.3 0-.1l1-.2z"/></g><use xlink:href="#nz-a" transform="scale(-1 1)"/><use xlink:href="#nz-a" transform="rotate(72 0 0)"/><use xlink:href="#nz-a" transform="rotate(-72 0 0)"/><use xlink:href="#nz-a" transform="scale(-1 1)rotate(72)"/></g></defs><path fill="#00247d" fill-rule="evenodd" d="M0 0h512v512H0z"/><g transform="translate(-148.7 90.5)scale(.60566)"><use xlink:href="#nz-b" width="100%" height="100%" fill="#fff" transform="translate(900 120)scale(45.4)"/><use xlink:href="#nz-b" width="100%" height="100%" fill="#cc142b" transform="matrix(30 0 0 30 900 120)"/></g><g transform="rotate(82 418.7 105.1)scale(.60566)"><use xlink:href="#nz-b" width="100%" height="100%" fill="#fff" transform="rotate(-82 519 -457.7)scale(40.4)"/><use xlink:href="#nz-b" width="100%" height="100%" fill="#cc142b" transform="rotate(-82 519 -457.7)scale(25)"/></g><g transform="rotate(82 418.7 105.1)scale(.60566)"><use xlink:href="#nz-b" width="100%" height="100%" fill="#fff" transform="rotate(-82 668.6 -327.7)scale(45.4)"/><use xlink:href="#nz-b" width="100%" height="100%" fill="#cc142b" transform="rotate(-82 668.6 -327.7)scale(30)"/></g><g transform="translate(-148.7 90.5)scale(.60566)"><use xlink:href="#nz-b" width="100%" height="100%" fill="#fff" transform="translate(900 480)scale(50.4)"/><use xlink:href="#nz-b" width="100%" height="100%" fill="#cc142b" transform="matrix(35 0 0 35 900 480)"/></g><path fill="#012169" d="M0 0h256v256H0z"/><path fill="#fff" d="M256 0v32l-95 96 95 93.5V256h-33.5L127 162l-93 94H0v-34l93-93.5L0 37V0h31l96 94 93-94z"/><path fill="#c8102e" d="m92 162 5.5 17L21 256H0v-1.5zm62-6 27 4 75 73.5V256zM256 0l-96 98-2-22 75-76zM0 .5 96.5 95 67 91 0 24.5z"/><path fill="#fff" d="M88 0v256h80V0zM0 88v80h256V88z"/><path fill="#c8102e" d="M0 104v48h256v-48zM104 0v256h48V0z"/></svg>'],
	['CNY', '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"><defs><path id="cn-a" fill="#ff0" d="M1-.3-.7.8 0-1 .6.8-1-.3z"/></defs><path fill="#ee1c25" d="M0 0h512v512H0z"/><use xlink:href="#cn-a" width="30" height="20" transform="translate(128 128)scale(76.8)"/><use xlink:href="#cn-a" width="30" height="20" transform="rotate(-121 142.6 -47)scale(25.5827)"/><use xlink:href="#cn-a" width="30" height="20" transform="rotate(-98.1 198 -82)scale(25.6)"/><use xlink:href="#cn-a" width="30" height="20" transform="rotate(-74 272.4 -114)scale(25.6137)"/><use xlink:href="#cn-a" width="30" height="20" transform="matrix(16 -19.968 19.968 16 256 230.4)"/></svg>'],
]);

type FlagListener = () => void;

interface FlagEntry {
	image: HTMLImageElement;
	ready: boolean;
	listeners: FlagListener[];
}

// Decoded once per page and shared by every chart.
const flagCache: Map<string, FlagEntry> = new Map();

export function hasFlag(currency: string): boolean {
	return flagSvgs.has(currency);
}

/**
 * The flag of a currency code (e.g. `USD`) as an image URL, for use outside the chart such as
 * an `<img>` in a hover card. Null for codes without a flag.
 */
export function newsFlagUrl(currency: string): string | null {
	const svg = flagSvgs.get(currency.toUpperCase());
	return svg === undefined ? null : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * The flag image for a currency code. Returns null while the image is still
 * decoding (`onReady` fires once it can be drawn) and for codes with no flag.
 */
export function flagImage(currency: string, onReady: FlagListener): HTMLImageElement | null {
	const url = newsFlagUrl(currency);
	if (url === null) {
		return null;
	}

	let entry = flagCache.get(currency);
	if (entry === undefined) {
		const created: FlagEntry = { image: new Image(), ready: false, listeners: [] };
		created.image.onload = () => {
			created.ready = true;
			const listeners = created.listeners;
			created.listeners = [];
			listeners.forEach((listener: FlagListener) => listener());
		};
		created.image.src = url;
		flagCache.set(currency, created);
		entry = created;
	}

	if (entry.ready) {
		return entry.image;
	}
	if (entry.listeners.indexOf(onReady) < 0) {
		entry.listeners.push(onReady);
	}
	return null;
}
