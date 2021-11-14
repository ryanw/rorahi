import { Chart, ChartElement } from '../chart';
import { SurfaceChart } from '../surface_chart';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import { createFace } from '../meshes';
import { Program } from '../program';
import { RGB } from '../color';
import { Label, LabelAlign } from './label';
import MarkersVertexShader from '../shaders/markers.vert.glsl';
import MarkersFragmentShader from '../shaders/markers.frag.glsl';

function remap(value: number, low0: number, high0: number, low1: number, high1: number): number {
	return low1 + ((high1 - low1) * (value - low0)) / (high0 - low0);
}

/**
 * Which axis this {@link AxisMarkers} is for
 */
export enum Axis {
	X = 0,
	Y,
	Z,
}

/**
 * How to align the text used in the value labels
 */
export enum LabelAnchor {
	LEFT,
	RIGHT,
}

/**
 * Value labels and marker lines drawn along the edges of the chart
 */
export class AxisMarkers implements ChartElement {
	private _positionBuffer: WebGLBuffer;
	private _program: Program;
	private _chart: SurfaceChart;
	private _axis: Axis;
	private _labelCount = 10;
	private _tickLimit = 8;
	private _labels: Label[] = [];
	private _labelAnchor: LabelAnchor;
	private _range: [number, number];
	transform: Matrix4 = Matrix4.identity();

	constructor(
		chart: SurfaceChart,
		axis: Axis,
		labelAnchor: LabelAnchor = LabelAnchor.LEFT,
		transform?: Matrix4,
		range?: [number, number],
		color?: RGB
	) {
		this._chart = chart;
		this._axis = axis;
		this._range = range ? [...range] : null;
		if (transform) {
			this.transform = transform;
		}
		this._labelAnchor = labelAnchor;

		for (let i = 0; i < this._labelCount; i++) {
			const label = new Label(chart, {
				text: `${i}`,
				fontSize: 16,
				orthographic: true,
				color: color || [1.0, 0.0, 0.0],
				glowAmount: 1,
				glowColor: [1.0, 1.0, 1.0],
				align: labelAnchor === LabelAnchor.LEFT ? LabelAlign.LEFT : LabelAlign.RIGHT,
			});
			this._labels.push(label);
			this._chart.addElement(label);
		}
	}

	private compileShaders(gl: WebGLRenderingContext) {
		this._program = new Program(gl, MarkersVertexShader, MarkersFragmentShader);
		this._program.compile();
	}

	update(gl: WebGLRenderingContext) {
		if (!this._program) {
			this.compileShaders(gl);
		}

		this.updateLabels();

		if (this._positionBuffer) return;
		this._positionBuffer = gl.createBuffer();
		const transform = Matrix4.identity()
			.multiply(Matrix4.translation(0, -1, 0.5))
			.multiply(Matrix4.scaling(1.0, 1.0, 0.02))
			.multiply(Matrix4.scaling(0.5));
		const [positions] = createFace([0, 1, 0], transform);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	}

	get spacing(): number {
		const grid = this._chart.gridSize;
		const region = this._chart.region;
		let interval;
		switch (this._axis) {
			case Axis.X:
				interval = (this._tickLimit * grid[0]) / region[2];
				if (interval >= 1) {
					interval = Math.floor(interval);
				} else {
					interval = 1 / Math.floor(1 / interval);
				}
				return grid[0] / interval;

			case Axis.Y:
				return 1 / this._chart.gradient.length;

			case Axis.Z:
				interval = (this._tickLimit * grid[1]) / region[3];
				if (interval >= 1) {
					interval = Math.floor(interval);
				} else {
					interval = 1 / Math.floor(1 / interval);
				}
				return grid[1] / interval;

			default:
				return 0;
		}
	}

	get range(): [number, number] {
		if (!this._range) {
			switch (this._axis) {
				case Axis.X: {
					return [0, this._chart.dataWidth];
				}

				case Axis.Y: {
					return this._chart.dataRange;
				}

				case Axis.Z: {
					return [0, this._chart.dataHeight];
				}
			}
		} else {
			return this._range;
		}
	}

	private updateLabels() {
		const { dataWidth, dataHeight, region } = this._chart;
		const { spacing, range } = this;
		const gridSize = [(1.0 / region[2]) * spacing, (1.0 / region[3]) * spacing];

		for (let i = 0; i < this._labels.length; i++) {
			const label = this._labels[i];
			let x = -0.5;
			let y = -0.49;

			switch (this._axis) {
				case Axis.X: {
					const value = Math.floor(Math.floor(region[0] / spacing) * spacing + i * spacing);
					label.text = remap(value, 0, dataWidth, range[0], range[1]).toString();
					x = -0.5 - (region[0] % spacing) / region[2] + i * gridSize[0];
					break;
				}

				case Axis.Y: {
					const dataRange = this._chart.dataRange;
					const value = dataRange[0] + i * spacing * (dataRange[1] - dataRange[0]);
					label.text = remap(value, dataRange[0], dataRange[1], range[0], range[1]).toFixed(0);
					x = -0.5 + value;
					break;
				}

				case Axis.Z: {
					const value = Math.floor(Math.floor(region[1] / spacing) * spacing + i * spacing);
					label.text = remap(value, 0, dataHeight, range[0], range[1]).toString();
					x = -0.5 - (region[1] % spacing) / region[3] + i * gridSize[1];
					break;
				}
			}
			// If outside the chart, hide it
			if (x < -0.51 || x > 0.51) {
				label.hidden = true;
				continue;
			}

			label.hidden = false;
			const labelTrans = this.transform
				.multiply(Matrix4.translation(x, y, this._labelAnchor === LabelAnchor.LEFT ? 0.45 : 0.55))
				.multiply(Matrix4.rotation(0, 0, Math.PI / 2))
				.multiply(Matrix4.rotation(0, Math.PI / 2, 0));

			label.transform = labelTrans;
		}
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		const prog = this._program;
		prog.use();

		// Grid size
		// FIXME DRY THIS
		const region = this._chart.region;
		const spacing = this.spacing;
		const gridSize = [(1.0 / region[2]) * spacing, (1.0 / region[3]) * spacing];
		const gridOffset = [region[0] / spacing, region[1] / spacing];
		switch (this._axis) {
			case Axis.X:
				prog.setUniform('u_gridSize', gridSize[0]);
				prog.setUniform('u_gridOffset', gridOffset[0]);
				break;

			case Axis.Y:
				prog.setUniform('u_gridSize', spacing);
				prog.setUniform('u_gridOffset', 0);
				break;

			case Axis.Z:
				prog.setUniform('u_gridSize', gridSize[1]);
				prog.setUniform('u_gridOffset', gridOffset[1]);
				break;
		}

		prog.bindAttribute('position', this._positionBuffer, 3);
		prog.setCamera(camera);
		prog.setUniform('u_model', this.transform);

		const vertexCount = 6;

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}
}
