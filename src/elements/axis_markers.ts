import { Chart, ChartElement } from '../chart';
import { Matrix4, Point3 } from '../geom';
import { Camera } from '../camera';
import { createFace } from '../meshes';
import MarkersVertexShader from '../shaders/markers.vert.glsl';
import MarkersFragmentShader from '../shaders/markers.frag.glsl';

export class AxisMarkers implements ChartElement {
	private _positionBuffer: WebGLBuffer;
	private _program: WebGLProgram;
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
		const program = gl.createProgram();

		const vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, MarkersVertexShader);
		gl.attachShader(program, vertexShader);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(vertexShader);
			throw `Could not compile Vertex shader: ${info}`;
		}

		const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, MarkersFragmentShader);
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
		const transform = Matrix4.identity()
			.multiply(Matrix4.translation(0, -1, 0.52))
			.multiply(Matrix4.scaling(1.01, 1.0, 0.3))
			.multiply(Matrix4.translation(0, 0, 0.5));
		const [positions] = createFace([0, 1, 0], transform);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		gl.useProgram(this._program);

		// attribute vec3 position
		const positionAttr = gl.getAttribLocation(this._program, 'position');
		gl.enableVertexAttribArray(positionAttr);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
		gl.vertexAttribPointer(positionAttr, 3, gl.FLOAT, false, 0, 0);

		// Camera uniforms
		const modelUniform = gl.getUniformLocation(this._program, 'u_model');
		gl.uniformMatrix4fv(modelUniform, false, this.transform.toArray());
		const viewUniform = gl.getUniformLocation(this._program, 'u_view');
		gl.uniformMatrix4fv(viewUniform, false, camera.view.inverse().toArray());
		const projUniform = gl.getUniformLocation(this._program, 'u_projection');
		gl.uniformMatrix4fv(projUniform, false, camera.projection.toArray());

		// Tick count
		const tickUniform = gl.getUniformLocation(this._program, 'u_tickCount');
		gl.uniform1i(tickUniform, this._tickCount);

		const vertexCount = 6;

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}
}
