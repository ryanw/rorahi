import { Camera } from '../camera';
import { Chart } from '../chart';
import { Label, LabelAlign, LabelOptions } from './label';

const PI_2 = Math.PI / 2;

export class HorizontalAxisLabel extends Label {
	constructor(chart: Chart, textOrOptions: string | LabelOptions) {
		const options = typeof textOrOptions === 'string' ? { text: textOrOptions } : textOrOptions;
		super(chart, {
			fontSize: 24,
			orthographic: false,
			color: [0.0, 0.0, 0.0],
			align: LabelAlign.CENTER,
			glowAmount: 1,
			glowColor: [1.0, 1.0, 1.0],
			...options,
		});
	}

	private updateAngle(camera: Camera) {
		const { view } = camera;

		const mv = view.inverse().multiply(this.transform);
		const camPos = view.transformPoint3([0, 0, 0]);

		const pos0 = mv.transformPoint3([0.0, 0.0, 0.0]);
		const pos1 = mv.transformPoint3([0.0, 0.0, 1.0]);
		const bottom = camPos[1] - pos0[1] <= 0.0;

		const angle0 = Math.atan2(pos1[1] - pos0[1], pos1[2] - pos0[2]);
		const angle1 = PI_2 - Math.atan2(pos1[2] - pos0[2], pos1[0] - pos0[0]);
		// How fast to flatten when camera moves to the side. Smaller is faster
		const flattenSpeed = 0.5;
		const flatten = Math.min(1.0, Math.abs(angle1 / PI_2)) / flattenSpeed;
		// How much/fast to flip upside down when moving camera below the bottom. Smaller is faster
		const tiltSpeed = 0.33;
		const tilt = clamp(Math.pow(Math.abs(pos0[1] - camPos[1]), tiltSpeed), 0.0, 1.0) * (bottom ? 1 : -1);
		let angle = angle0;
		if ((bottom && angle0 <= -PI_2) || (!bottom && angle0 >= PI_2)) {
			angle = angle0 - Math.PI;
		}
		const clamped = clamp(lerp(angle, PI_2 * tilt, flatten), -PI_2, PI_2);
		this._rotation = [clamped, 0, 0];
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		this.updateAngle(camera);
		super.draw(gl, camera);
	}
}

function lerp(v0: number, v1: number, t: number): number {
	return v0 * (1 - t) + v1 * t;
}

function clamp(val: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, val));
}
