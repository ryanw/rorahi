import { RGB } from './color';

export class Gradient {
	private _colors: RGB[];
	smooth = true;

	constructor(colors: RGB[], smooth: boolean = false) {
		this.colors = colors;
		this.smooth = smooth;
	}

	get length() {
		return this._colors.length;
	}

	get colors() {
		return [...this._colors];
	}

	set colors(colors: RGB[]) {
		this._colors = [...colors];
	}
}
