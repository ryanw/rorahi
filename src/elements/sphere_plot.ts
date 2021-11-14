import { RGB } from '../color';
import { PlotChart } from '../plot_chart';
import { ChartElement } from '../chart';
import { Matrix4, normalize } from '../geom';
import { Camera } from '../camera';
import { Program } from '../program';
import SpherePlotVertexShader from '../shaders/sphere_plot.vert.glsl';
import SpherePlotFragmentShader from '../shaders/sphere_plot.frag.glsl';

const PI_2 = Math.PI / 2;

export class SpherePlot<T> implements ChartElement {
	private _vertexBuffer: WebGLBuffer;
	private _indexBuffer: WebGLBuffer;
	private _positionBuffer: WebGLBuffer;
	private _colorBuffer: WebGLBuffer;
	private _sizeBuffer: WebGLBuffer;
	private _instanceCount: number = 0;
	private _program: Program;
	private _chart: PlotChart<T>;
	private _resolution: number = 4;
	transform: Matrix4 = Matrix4.scaling(0.02);

	constructor(chart: PlotChart<T>) {
		this._chart = chart;
	}

	private compileShaders(gl: WebGLRenderingContext) {
		this._program = new Program(gl, SpherePlotVertexShader, SpherePlotFragmentShader);
		this._program.compile();
	}

	private buildMesh() {
		const gl = this._chart.gl;
		if (!this._vertexBuffer) {
			this._vertexBuffer = gl.createBuffer();
		}
		if (!this._indexBuffer) {
			this._indexBuffer = gl.createBuffer();
		}

		// Extra row/col of vertices for the edge triangles
		const width = this._resolution;
		const height = this._resolution;
		const w = width + 1;
		const h = height + 1;

		// Build our plane
		const vertexSize = 3; // x, y, z
		const triangles = new Uint32Array(width * height * 6 * 6);
		const vertices = new Float32Array(w * h * vertexSize * 6);
		const z = 0.0;
		let tri = 0;

		function addFace(offset: number = 0, trans: Matrix4): number {
			let c = offset;
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					c += 1;
					const idx = offset + x + y * w;
					const i = idx * vertexSize;
					const p = trans.transformPoint3(normalize([x / width - 0.5, y / height - 0.5, z - 0.5]));
					vertices[i + 0] = p[0];
					vertices[i + 1] = p[1];
					vertices[i + 2] = p[2];

					// Add 2 triangles for each quad
					if (x < width && y < height) {
						triangles[tri++] = idx;
						triangles[tri++] = idx + w + 1;
						triangles[tri++] = idx + w;
						triangles[tri++] = idx;
						triangles[tri++] = idx + 1;
						triangles[tri++] = idx + w + 1;
					}
				}
			}
			return c;
		}

		let offset = 0;
		offset = addFace(offset, Matrix4.rotation(0, PI_2 * 0, 0));
		offset = addFace(offset, Matrix4.rotation(0, PI_2 * 1, 0));
		offset = addFace(offset, Matrix4.rotation(0, PI_2 * 2, 0));
		offset = addFace(offset, Matrix4.rotation(0, PI_2 * 3, 0));
		offset = addFace(offset, Matrix4.rotation(PI_2 * 1, 0, 0));
		offset = addFace(offset, Matrix4.rotation(PI_2 * 3, 0, 0));

		// Send to GPU
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		this.updateInstances(gl);
	}

	private updateInstances(gl: WebGLRenderingContext) {
		// Enable instanced drawing
		const ext = gl.getExtension('ANGLE_instanced_arrays');
		if (!ext) {
			throw 'ANGLE_instanced_arrays not supported by your browser :(';
		}

		if (!this._positionBuffer) {
			this._positionBuffer = gl.createBuffer();
		}
		if (!this._colorBuffer) {
			this._colorBuffer = gl.createBuffer();
		}
		if (!this._sizeBuffer) {
			this._sizeBuffer = gl.createBuffer();
		}

		const positions = this._chart.positions();
		this._instanceCount = positions.length;

		const positionData = new Float32Array(positions.flat());
		gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.DYNAMIC_DRAW);

		const colorData = new Float32Array(positions.map(randomColor).flat());
		gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.DYNAMIC_DRAW);

		const sizeData = new Float32Array(positions.map(() => 0.5 + Math.random() * 1.5).flat());
		gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, sizeData, gl.DYNAMIC_DRAW);
	}

	update(gl: WebGLRenderingContext) {
		if (!this._program) {
			this.compileShaders(gl);
		}
		if (this._vertexBuffer) return;
		this.buildMesh();
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		const prog = this._program;
		prog.use();
		const ext = gl.getExtension('ANGLE_instanced_arrays');

		// attribute vec3 position
		prog.bindPositionBuffer(this._vertexBuffer, this._indexBuffer);

		// attribute vec3 instancePosition
		const instPosition = prog.getAttribLocation('instancePosition');
		gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
		gl.enableVertexAttribArray(instPosition);
		gl.vertexAttribPointer(instPosition, 3, gl.FLOAT, false, 0, 0);
		ext.vertexAttribDivisorANGLE(instPosition, 1);

		// attribute vec3 instanceColor
		const instColor = prog.getAttribLocation('instanceColor');
		gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuffer);
		gl.enableVertexAttribArray(instColor);
		gl.vertexAttribPointer(instColor, 3, gl.FLOAT, false, 0, 0);
		ext.vertexAttribDivisorANGLE(instColor, 1);

		// attribute float instanceSize
		const instSize = prog.getAttribLocation('instanceSize');
		gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
		gl.enableVertexAttribArray(instSize);
		gl.vertexAttribPointer(instSize, 1, gl.FLOAT, false, 0, 0);
		ext.vertexAttribDivisorANGLE(instSize, 1);

		// Camera uniforms
		prog.setCamera(camera);
		prog.setUniform('u_model', this.transform);

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.FRONT);

		const vertexCount = this._resolution * this._resolution * 6 * 6;
		ext.drawElementsInstancedANGLE(gl.TRIANGLES, vertexCount, gl.UNSIGNED_INT, 0, this._instanceCount);
		ext.vertexAttribDivisorANGLE(instPosition, 0);
		ext.vertexAttribDivisorANGLE(instColor, 0);
	}
}

function sphericalToCartesian(lon: number, lat: number): [number, number, number] {
	return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
}

function randomColor(): RGB {
	return [Math.random(), Math.random(), Math.random()];
}
