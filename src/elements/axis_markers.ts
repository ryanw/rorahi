import { Chart, ChartElement } from '../chart';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import { createFace } from '../meshes';
import { Program } from '../program';
import MarkersVertexShader from '../shaders/markers.vert.glsl';
import MarkersFragmentShader from '../shaders/markers.frag.glsl';

export class AxisMarkers implements ChartElement {
	private _positionBuffer: WebGLBuffer;
	private _program: Program;
	private _chart: Chart<any>;
	private _tickCount: number;
	transform: Matrix4 = Matrix4.identity();

	constructor(chart: Chart<any>, ticks: number, transform?: Matrix4) {
		this._chart = chart;
		this._tickCount = ticks;
		if (transform) {
			this.transform = transform;
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

		if (this._positionBuffer) return;
		this._positionBuffer = gl.createBuffer();
		const transform = Matrix4.identity()
			.multiply(Matrix4.translation(0, -1, 0.52))
			.multiply(Matrix4.scaling(1.01, 1.0, 0.3))
			.multiply(Matrix4.translation(0, 0, 0.5));
		const [positions] = createFace([0, 1, 0], transform);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		const prog = this._program;
		prog.use();

		prog.bindAttribute('position', this._positionBuffer, 3);
		prog.setCamera(camera);
		prog.setUniform('u_model', this.transform);
		prog.setUniform('u_tickCount', this._tickCount, gl.INT);

		const vertexCount = 6;

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}
}
