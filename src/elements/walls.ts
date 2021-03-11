import { Chart, ChartElement } from '../chart';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import { createFace } from '../meshes';
import { Program } from '../program';
import WallsVertexShader from '../shaders/walls.vert.glsl';
import WallsFragmentShader from '../shaders/walls.frag.glsl';

export class Walls implements ChartElement {
	private _positionBuffer: WebGLBuffer;
	private _barycentricBuffer: WebGLBuffer;
	private _program: Program;
	private _chart: Chart<any>;
	transform = Matrix4.identity();

	constructor(chart: Chart<any>) {
		this._chart = chart;
	}

	private compileShaders(gl: WebGLRenderingContext) {
		this._program = new Program(gl, WallsVertexShader, WallsFragmentShader);
		this._program.compile();
	}

	update(gl: WebGLRenderingContext) {
		if (!this._program) {
			this.compileShaders(gl);
		}

		if (this._positionBuffer) return;
		this._positionBuffer = gl.createBuffer();
		this._barycentricBuffer = gl.createBuffer();

		const scale = Matrix4.scaling(0.5)
		const [p0, b0] = createFace([1.0, 0.0, 0.0], scale);
		const [p1, b1] = createFace([-1.0, 0.0, 0.0], scale);
		const [p2, b2] = createFace([0.0, 0.0, 1.0], scale);
		const [p3, b3] = createFace([0.0, 0.0, -1.0], scale);

		const positions = [...p0, ...p1, ...p2, ...p3];
		const barycentrics = [...b0, ...b1, ...b2, ...b3];

		gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._barycentricBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(barycentrics), gl.STATIC_DRAW);
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		const prog = this._program;
		prog.use();

		const colors = this._chart.gradient.colors;

		// attribute vec3 position
		prog.bindPositionBuffer(this._positionBuffer);

		// attribute vec3 barycentric
		prog.bindAttribute('barycentric', this._barycentricBuffer, 3);

		// Camera uniforms
		prog.setCamera(camera);
		prog.setUniform('u_model', this.transform);

		prog.setUniform('u_intervalCount', colors.length, gl.INT);

		const vertexCount = 6 * 4;

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.FRONT);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}
}
