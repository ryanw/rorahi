import { Chart, ChartElement } from '../chart';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import HeightmapVertexShader from '../shaders/heightmap.vert.glsl';
import HeightmapFragmentShader from '../shaders/heightmap.frag.glsl';

export class Heightmap<T extends ArrayLike<number>> implements ChartElement {
	private _vertexBuffer: WebGLBuffer;
	private _indexBuffer: WebGLBuffer;
	private _width: number;
	private _height: number;
	private _program: WebGLProgram;
	private _heightTexture: WebGLTexture;
	private _chart: Chart<T>;
	private _useFloatTextures: boolean = false;
	transform: Matrix4 = Matrix4.identity();

	constructor(chart: Chart<T>, width: number, height: number) {
		if (width < 1 || height < 1) {
			throw `Heightmap must have a positive size`;
		}
		this._chart = chart;
		this._width = width;
		this._height = height;
	}

	private compileShaders(gl: WebGLRenderingContext) {
		// Enable float textures if supported, 32bit per channel instead of 8bit
		const ext = gl.getExtension('OES_texture_float');
		this._useFloatTextures = Boolean(ext);

		const program = gl.createProgram();

		const vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, HeightmapVertexShader);
		gl.attachShader(program, vertexShader);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(vertexShader);
			throw `Could not compile Vertex shader: ${info}`;
		}

		const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, HeightmapFragmentShader);
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

		this.updateHeightTexture(gl);
		if (this._vertexBuffer) return;
		this._vertexBuffer = gl.createBuffer();
		this._indexBuffer = gl.createBuffer();

		// Extra row/col of vertices for the edge triangles
		const w = this._width + 1;
		const h = this._height + 1;

		// Build our plane
		const vertexSize = 3; // x, y, z
		const triangles = new Uint16Array(this._width * this._height * 6);
		const vertices = new Float32Array(w * h * vertexSize);
		const z = 0.0;
		let tri = 0;
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const idx = x + y * w;
				const i = idx * vertexSize;
				vertices[i + 0] = x / this._width - 0.5;
				vertices[i + 1] = y / this._height - 0.5;
				vertices[i + 2] = z;

				// Add 2 triangles for each quad
				if (x < this._width && y < this._height) {
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
		const width = this._chart.dataWidth;
		const height = this._chart.dataHeight;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._heightTexture);

		let pixels: Float32Array | Uint8ClampedArray;
		if (this._useFloatTextures) {
			// 32bit textures
			pixels = new Float32Array(width * height * 4);
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const i = (x + y * width) * 4;
					pixels[i + 0] = this._chart.getData(x, y);
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
					pixels[i + 0] = this._chart.getData(x, y) * 255;
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
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		gl.useProgram(this._program);

		const colors = this._chart.gradient.colors;

		// attribute vec3 position
		const positionAttr = gl.getAttribLocation(this._program, 'position');
		gl.enableVertexAttribArray(positionAttr);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
		gl.vertexAttribPointer(positionAttr, 3, gl.FLOAT, false, 0, 0);

		// Camera uniforms
		const modelUniform = gl.getUniformLocation(this._program, 'u_model');
		gl.uniformMatrix4fv(modelUniform, false, this.transform.toArray());
		const viewUniform = gl.getUniformLocation(this._program, 'u_view');
		gl.uniformMatrix4fv(viewUniform, false, camera.view.inverse().toArray());
		const projUniform = gl.getUniformLocation(this._program, 'u_projection');
		gl.uniformMatrix4fv(projUniform, false, camera.projection.toArray());

		// Colour intervals
		const intervalCountUniform = gl.getUniformLocation(this._program, 'u_intervalCount');
		gl.uniform1i(intervalCountUniform, colors.length);
		for (let i = 0; i < colors.length; i++) {
			const intervalsUniform = gl.getUniformLocation(this._program, `u_intervals[${i}]`);
			gl.uniform3fv(intervalsUniform, colors[i]);
		}

		// Height map texture
		const heightsUniform = gl.getUniformLocation(this._program, 'u_heights');
		gl.uniform1i(heightsUniform, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._heightTexture);

		const vertexCount = this._width * this._height * 6;

		gl.disable(gl.CULL_FACE);

		const flatUniform = gl.getUniformLocation(this._program, 'u_flat');

		// Draw 3D surface
		gl.uniform1i(flatUniform, 0);
		gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);

		// Draw flat projection
		gl.uniform1i(flatUniform, 1);
		const flatTransform = Matrix4.translation(0, -0.5, 0).multiply(this.transform);
		gl.uniformMatrix4fv(modelUniform, false, flatTransform.toArray());
		gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);
	}
}
