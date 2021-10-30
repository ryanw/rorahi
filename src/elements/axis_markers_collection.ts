import { Chart, ChartElement } from '../chart';
import { RGB } from '../color';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import { AxisMarkers, Axis, LabelAnchor } from './axis_markers';

export interface AxisOptions {
	label?: string;
	range?: [number, number];

	/**
	 * The color of the text next to each tick
	 */
	tickFontColor?: RGB;

	/**
	 * For X and Z axes; how far up the Y axis to draw the markers.
	 * For the Y axis; how far along the X and Z axes to draw the markers.
	 * Values range from 0.0 for the start, and 1.0 for the end
	 */
	position?: number;
}

export interface Options {
	axes?: {
		x?: AxisOptions;
		y?: AxisOptions;
		z?: AxisOptions;
	};
}

export class AxisMarkersCollection implements ChartElement {
	private _chart: Chart;
	private _axisMarkers: Array<AxisMarkers>;
	hidden = false;

	constructor(chart: Chart, options?: Options) {
		this._chart = chart;
		this._axisMarkers = [];
		this.initMarkers(options);
	}

	private initMarkers(options?: Options) {
		const scale = this._chart.scaleMatrix;

		// X axis
		this._axisMarkers.push(
			new AxisMarkers(
				this._chart,
				Axis.X,
				LabelAnchor.RIGHT,
				scale.multiply(Matrix4.translation(0.0, options?.axes?.x?.position || 0, 0.02)),
				options?.axes?.x?.range,
				options?.axes?.x?.tickFontColor
			)
		);
		this._axisMarkers.push(
			new AxisMarkers(
				this._chart,
				Axis.X,
				LabelAnchor.LEFT,
				scale.multiply(Matrix4.translation(0.0, options?.axes?.x?.position || 0, -1.02)),
				options?.axes?.x?.range,
				options?.axes?.x?.tickFontColor
			)
		);

		// Z axis (forward)
		this._axisMarkers.push(
			new AxisMarkers(
				this._chart,
				Axis.Z,
				LabelAnchor.RIGHT,
				scale
					.multiply(Matrix4.rotation(0, -Math.PI / 2, 0))
					.multiply(Matrix4.translation(0.0, options?.axes?.z?.position || 0, 0.02)),
				options?.axes?.z?.range,
				options?.axes?.z?.tickFontColor
			)
		);
		this._axisMarkers.push(
			new AxisMarkers(
				this._chart,
				Axis.Z,
				LabelAnchor.LEFT,
				scale
					.multiply(Matrix4.rotation(0, -Math.PI / 2, 0))
					.multiply(Matrix4.translation(0.0, options?.axes?.z?.position || 0, -1.02)),
				options?.axes?.z?.range,
				options?.axes?.z?.tickFontColor
			)
		);

		// Y axis (up)
		this._axisMarkers.push(
			new AxisMarkers(
				this._chart,
				Axis.Y,
				LabelAnchor.RIGHT,
				scale.multiply(Matrix4.rotation(0, 0, -Math.PI / 2)).multiply(Matrix4.translation(0.0, 0.0, 0.02)),
				options?.axes?.y?.range,
				options?.axes?.y?.tickFontColor
			)
		);
	}

	update(gl: WebGLRenderingContext) {
		for (const el of this._axisMarkers) {
			el.update(gl);
		}
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		for (const el of this._axisMarkers) {
			el.draw(gl, camera);
		}
	}
}
