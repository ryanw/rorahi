import { Chart, ChartElement } from '../chart';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import { Program } from '../program';
import HeightmapVertexShader from '../shaders/heightmap.vert.glsl';
import HeightmapFragmentShader from '../shaders/heightmap.frag.glsl';

export class Heightmap<T extends ArrayLike<number>> implements ChartElement {
	private _vertexBuffer: WebGLBuffer;
	private _indexBuffer: WebGLBuffer;
	private _resolution: number;
	private _program: Program;
	private _heightTexture: WebGLTexture;
	private _chart: Chart<T>;
	private _useFloatTextures: boolean = false;
	private _useLinearFilter: boolean = true;
	transform: Matrix4 = Matrix4.identity();

	constructor(chart: Chart<T>, resolution: number) {
		if (resolution < 1) {
			throw `Heightmap must have resolution > 0`;
		}
		this._chart = chart;
		this._resolution = resolution;
	}

	get resolution(): number {
		return this._resolution;
	}

	set resolution(resolution: number) {
		this._resolution = resolution;
		this.buildMesh();
	}

	private compileShaders(gl: WebGLRenderingContext) {
		// Enable float textures if supported, 32bit per channel instead of 8bit
		this._useFloatTextures = Boolean(gl.getExtension('OES_texture_float'));
		this._useLinearFilter = Boolean(gl.getExtension('OES_texture_float_linear'));

		this._program = new Program(gl, HeightmapVertexShader, HeightmapFragmentShader);
		this._program.compile();
	}

	update(gl: WebGLRenderingContext) {
		if (!this._program) {
			this.compileShaders(gl);
		}

		this.updateHeightTexture(gl);
		if (this._vertexBuffer) return;
		this.buildMesh();
	}

	private buildMesh() {
		console.log("BUILDING MESH!");
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
		const triangles = new Uint16Array(width * height * 6);
		const vertices = new Float32Array(w * h * vertexSize);
		const z = 0.0;
		let tri = 0;
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const idx = x + y * w;
				const i = idx * vertexSize;
				vertices[i + 0] = x / width - 0.5;
				vertices[i + 1] = y / height - 0.5;
				vertices[i + 2] = z;

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

		// Send to GPU
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	private updateHeightTexture(gl: WebGLRenderingContext) {
		if (!this._heightTexture) {
			this._heightTexture = gl.createTexture();
		}
		const { region: [sx, sy, width, height] } = this._chart;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._heightTexture);

		let pixels: Float32Array | Uint8ClampedArray;
		if (this._useFloatTextures) {
			// 32bit textures
			pixels = new Float32Array(width * height * 4);
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const i = (x + y * width) * 4;
					pixels[i + 0] = this._chart.getNormalizedData(x, y);
					pixels[i + 1] = 0;
					pixels[i + 2] = 0;
					pixels[i + 3] = 0;
				}
			}
		} else {
			// 8bit textures
			pixels = new Uint8ClampedArray(width * height * 4);
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const i = (x + y * width) * 4;
					pixels[i + 0] = this._chart.getNormalizedData(x, y) * 255;
					pixels[i + 1] = 0;
					pixels[i + 2] = 0;
					pixels[i + 3] = 0;
				}
			}
		}

		//const image = new ImageData(pixels, width);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			width,
			height,
			0,
			gl.RGBA,
			this._useFloatTextures ? gl.FLOAT : gl.UNSIGNED_BYTE,
			pixels
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._useLinearFilter ? gl.LINEAR : gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this._useLinearFilter ? gl.LINEAR : gl.NEAREST);
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		const prog = this._program;
		prog.use();

		const colors = this._chart.gradient.colors;

		// attribute vec3 position
		prog.bindPositionBuffer(this._vertexBuffer, this._indexBuffer);

		// Camera uniforms
		prog.setCamera(camera);
		prog.setUniform('u_model', this.transform);

		// Colour intervals
		prog.setUniform('u_intervalCount', colors.length, gl.INT);
		for (let i = 0; i < colors.length; i++) {
			prog.setUniform(`u_intervals[${i}]`, colors[i]);
		}

		// Height map texture
		const textureUnit = 0;
		prog.setUniform('u_heights', textureUnit, gl.INT);
		gl.activeTexture(gl.TEXTURE0 + textureUnit);
		gl.bindTexture(gl.TEXTURE_2D, this._heightTexture);



		// Grid size
		const region = this._chart.region;
		const gridScale = 5.0;
		const gridSize = [
			(1.0 / region[2]) * gridScale,
			(1.0 / region[3]) * gridScale,
		];
		const gridOffset = [
			region[0] / gridScale,
			region[1] / gridScale,
		]
		prog.setUniform('u_gridSize', gridSize);
		prog.setUniform('u_gridOffset', gridOffset);

		prog.setUniform('u_smoothGradient', this._chart.gradient.smooth);



		const vertexCount = this._resolution * this._resolution * 6;

		gl.disable(gl.CULL_FACE);

		// Draw 3D surface
		prog.setUniform('u_flat', false);
		gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);

		// Draw flat projections
		prog.setUniform('u_flat', true);

		// Floor
		let flatTransform = Matrix4.translation(0, -0.5, 0).multiply(this.transform);
		prog.setUniform('u_model', flatTransform);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);

		// Ceiling
		flatTransform = Matrix4.translation(0, 0.5, 0).multiply(this.transform);
		prog.setUniform('u_model', flatTransform);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.FRONT);
		gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);
	}
}
