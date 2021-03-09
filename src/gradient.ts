import { RGB } from './color';

export class Gradient {
	private _colors: RGB[];

	constructor(colors: RGB[]) {
		this.colors = colors;
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
