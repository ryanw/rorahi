import { Chart, ChartElement } from '../chart';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import { createFace } from '../meshes';
import { Program } from '../program';
import { Label, LabelAlign } from './label';
import MarkersVertexShader from '../shaders/markers.vert.glsl';
import MarkersFragmentShader from '../shaders/markers.frag.glsl';

export enum Axis {
	X = 0,
	Y,
	Z,
}

export class AxisMarkers implements ChartElement {
	private _positionBuffer: WebGLBuffer;
	private _program: Program;
	private _chart: Chart;
	private _axis: Axis;
	private _labelCount = 10;
	private _labels: Label[] = [];
	transform: Matrix4 = Matrix4.identity();

	constructor(chart: Chart, axis: Axis, transform?: Matrix4) {
		this._chart = chart;
		this._axis = axis;
		if (transform) {
			this.transform = transform;
		}
		if (axis !== 0) return;

		for (let i = 0; i < this._labelCount + 2; i++) {
			const label = new Label(chart, {
				text: `${i}`,
				fontSize: 16,
				orthographic: true,
				color: [1.0, 0.0, 0.0],
				align: LabelAlign.RIGHT,
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
		const region = this._chart.region;
		switch (this._axis) {
			case Axis.X:
				return region[2] / this._labelCount;

			case Axis.Z:
				return region[3] / this._labelCount;

			default:
				return 0;
		}
	}

	private updateLabels() {
		const region = this._chart.region;
		const spacing = this.spacing;
		const gridSize = [(1.0 / region[2]) * spacing, (1.0 / region[3]) * spacing];

		for (let i = 0; i < this._labels.length; i++) {
			const label = this._labels[i];
			label.text = Math.floor(Math.floor(region[0] / spacing) * spacing + i * spacing).toString();
			let x = -0.5;
			let y = -0.5;

			switch (this._axis) {
				case Axis.X:
					x = -0.5 - (region[0] % spacing) / region[2] + (i * gridSize[0]);
					// If outside the chart, hide it
					if (x < -0.51 || x > 0.51) {
						label.hidden = true;
						continue;
					}
					break;

				case Axis.Z:
					y = -0.5 - (region[1] % spacing) / region[3] + (i * gridSize[1]);
					// If outside the chart, hide it
					if (y < -0.51 || y > 0.51) {
						label.hidden = true;
						continue;
					}
					break;
			}


			label.hidden = false;
			const labelTrans = this.transform
				.multiply(Matrix4.translation(x, y, 0.53))
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
				prog.setUniform('u_gridSize', 1 / this._chart.gradient.length);
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
