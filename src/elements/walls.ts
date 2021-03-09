import { Chart, ChartElement } from '../chart';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import { createFace } from '../meshes';
import WallsVertexShader from '../shaders/walls.vert.glsl';
import WallsFragmentShader from '../shaders/walls.frag.glsl';

export class Walls implements ChartElement {
	private _positionBuffer: WebGLBuffer;
	private _barycentricBuffer: WebGLBuffer;
	private _program: WebGLProgram;
	private _chart: Chart<any>;
	transform = Matrix4.identity();

	constructor(chart: Chart<any>) {
		this._chart = chart;
	}

	private compileShaders(gl: WebGLRenderingContext) {
		const program = gl.createProgram();

		const vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, WallsVertexShader);
		gl.attachShader(program, vertexShader);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(vertexShader);
			throw `Could not compile Vertex shader: ${info}`;
		}

		const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, WallsFragmentShader);
		gl.attachShader(program, fragmentShader);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(fragmentShader);
			throw `Could not compile Fragment shader: ${info}`;
		}

		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const info = gl.getProgramInfoLog(program);
			throw `Could not link WebGL program: ${info}`;
		}

		this._program = program;
	}

	update(gl: WebGLRenderingContext) {
		if (!this._program) {
			this.compileShaders(gl);
		}

		if (this._positionBuffer) return;
		this._positionBuffer = gl.createBuffer();
		this._barycentricBuffer = gl.createBuffer();

		const [p0, b0] = createFace([1.0, 0.0, 0.0]);
		const [p1, b1] = createFace([-1.0, 0.0, 0.0]);
		const [p2, b2] = createFace([0.0, 1.0, 0.0]);
		const [p3, b3] = createFace([0.0, -1.0, 0.0]);
		const [p4, b4] = createFace([0.0, 0.0, 1.0]);
		const [p5, b5] = createFace([0.0, 0.0, -1.0]);

		const positions = [...p0, ...p1, ...p2, ...p3, ...p4, ...p5];
		const barycentrics = [...b0, ...b1, ...b2, ...b3, ...b4, ...b5];

		gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._barycentricBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(barycentrics), gl.STATIC_DRAW);
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		gl.useProgram(this._program);

		const colors = this._chart.gradient.colors;

		// attribute vec3 position
		const positionAttr = gl.getAttribLocation(this._program, 'position');
		gl.enableVertexAttribArray(positionAttr);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
		gl.vertexAttribPointer(positionAttr, 3, gl.FLOAT, false, 0, 0);

		// attribute vec3 barycentric
		const barycentricAttr = gl.getAttribLocation(this._program, 'barycentric');
		gl.enableVertexAttribArray(barycentricAttr);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._barycentricBuffer);
		gl.vertexAttribPointer(barycentricAttr, 3, gl.FLOAT, false, 0, 0);

		// Camera uniforms
		const modelUniform = gl.getUniformLocation(this._program, 'u_model');
		gl.uniformMatrix4fv(modelUniform, false, this.transform.toArray());
		const viewUniform = gl.getUniformLocation(this._program, 'u_view');
		gl.uniformMatrix4fv(viewUniform, false, camera.view.inverse().toArray());
		const projUniform = gl.getUniformLocation(this._program, 'u_projection');
		gl.uniformMatrix4fv(projUniform, false, camera.projection.toArray());

		const intervalCountUniform = gl.getUniformLocation(this._program, 'u_intervalCount');
		gl.uniform1i(intervalCountUniform, colors.length);

		const vertexCount = 6 * 6;

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.FRONT);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}
}
