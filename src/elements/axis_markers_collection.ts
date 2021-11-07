import { Chart, ChartElement } from '../chart';
import { RGB } from '../color';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import { AxisMarkers, Axis, LabelAnchor } from './axis_markers';
import { HorizontalAxisLabel } from './horizontal_axis_label';
import { VerticalAxisLabel } from './vertical_axis_label';
import { Label } from './label';

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
	private _axisLabels: Array<Label>;
	hidden = false;

	constructor(chart: Chart, options?: Options) {
		this._chart = chart;
		this._axisMarkers = [];
		this._axisLabels = [];
		this.initMarkers(options);
		this.initLabels(options);
	}

	private initLabels(options?: Options) {
		let label: Label;
		if (options?.axes?.x?.label) {
			label = new HorizontalAxisLabel(this._chart, {
				text: options.axes.x.label,
				transform: Matrix4.translation(0, -0.5, 0.7),
			});
			this._axisLabels.push(label);
			this._chart.addElement(label);

			label = new HorizontalAxisLabel(this._chart, {
				text: options.axes.x.label,
				transform: Matrix4.translation(0, -0.5, -0.7).multiply(Matrix4.rotation(0, Math.PI, 0)),
			});
			this._axisLabels.push(label);
			this._chart.addElement(label);
		}

		if (options?.axes?.y?.label) {
			label = new VerticalAxisLabel(this._chart, {
				text: options.axes.y.label,
				transform: Matrix4.translation(-0.5, 0.0, 0.7).multiply(Matrix4.rotation(0, 0, -Math.PI / 2)),
			});
			this._axisLabels.push(label);
			this._chart.addElement(label);
		}

		if (options?.axes?.z?.label) {
			label = new HorizontalAxisLabel(this._chart, {
				text: options.axes.z.label,
				transform: Matrix4.translation(0.7, -0.5, 0.0).multiply(Matrix4.rotation(0, Math.PI / 2, 0)),
			});
			this._axisLabels.push(label);
			this._chart.addElement(label);

			label = new HorizontalAxisLabel(this._chart, {
				text: options.axes.z.label,
				transform: Matrix4.translation(-0.7, -0.5, 0.0).multiply(Matrix4.rotation(0, -Math.PI / 2, 0)),
			});
			this._axisLabels.push(label);
			this._chart.addElement(label);
		}
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
