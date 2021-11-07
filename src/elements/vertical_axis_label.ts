import { Camera } from '../camera';
import { Chart } from '../chart';
import { Label, LabelAlign, LabelOptions } from './label';

const PI_2 = Math.PI / 2;

export class VerticalAxisLabel extends Label {
	constructor(chart: Chart, textOrOptions: string | LabelOptions) {
		const options = typeof textOrOptions === 'string' ? { text: textOrOptions } : textOrOptions;
		super(chart, {
			fontSize: 24,
			orthographic: false,
			color: [0.0, 0.0, 0.0],
			glowAmount: 1,
			glowColor: [1.0, 1.0, 1.0],
			align: LabelAlign.CENTER,
			...options,
		});
	}

	private updateAngle(camera: Camera) {
		const { view } = camera;

		const camPos = view.transformPoint3([0, 0, 0]);
		const pos = this.transform.transformPoint3([0.0, 0.0, 0.0]);

		const angle = Math.atan2(camPos[2] - pos[2], camPos[0] - pos[0]) - PI_2;
		this._rotation = [angle, 0, 0];
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		this.updateAngle(camera);
		super.draw(gl, camera);
	}
}
