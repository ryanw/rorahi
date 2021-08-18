import { Chart, ChartElement } from '../chart';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';
import { Program } from '../program';
import { createQuad } from '../meshes';
import { RGB, RGBA } from '../color';
import LabelVertexShader from '../shaders/label.vert.glsl';
import LabelFragmentShader from '../shaders/label.frag.glsl';

const UVS = [0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1];

function nextPow2(v: number): number {
	v--;
	v |= v >> 1;
	v |= v >> 2;
	v |= v >> 4;
	v |= v >> 8;
	v |= v >> 16;
	v++;
	return v;
}

export enum LabelAlign {
	LEFT,
	CENTER,
	RIGHT,
}

export interface LabelOptions {
	text: string;
	align?: LabelAlign;
	fontSize?: number;
	transform?: Matrix4;
	color?: RGB | RGBA;
	orthographic?: boolean;
}

// Reuse shaders per GL context
const PROGRAMS: Map<WebGLRenderingContext, Program> = new Map();

export class Label implements ChartElement {
	private _positionBuffer: WebGLBuffer;
	private _offsetBuffer: WebGLBuffer;
	private _uvBuffer: WebGLBuffer;
	private _text: string;
	private _textureSize = [0, 0];
	private _texture: WebGLTexture;
	private _textSize = [0, 0];
	private _fontSize = 128;
	private _align = LabelAlign.LEFT;
	private _quadHeight = 0.2;
	private _color: RGBA = [0.0, 0.0, 0.0, 1.0];
	private _orthographic = false;
	private _chart: Chart;
	private _canvas = document.createElement('canvas');
	private _previousCameraSize: [number, number] = [0, 0];
	hidden: boolean = false;
	transform = Matrix4.identity();

	constructor(chart: Chart, textOrOptions: string | LabelOptions) {
		this._chart = chart;
		const options = typeof textOrOptions === 'string' ? { text: textOrOptions } : textOrOptions;

		this._text = options.text;
		if (options.transform) {
			this.transform = options.transform;
		}
		if (options.fontSize) {
			this._fontSize = options.fontSize;
		}
		if (options.align) {
			this._align = options.align;
		}
		if (options.orthographic) {
			this._orthographic = options.orthographic;
		}
		if (options.color) {
			if (options.color.length === 3) {
				this._color = [...options.color, 1.0];
			} else {
				this._color = [...options.color];
			}
		}
	}

	get text(): string {
		return this._text;
	}

	set text(text: string) {
		if (this._text === text) return;
		this._text = text;
		this.updateQuad();
	}

	get fontSize(): number {
		return this._fontSize;
	}

	get deviceFontSize(): number {
		return this._fontSize * window.devicePixelRatio;
	}

	set fontSize(fontSize: number) {
		if (this._fontSize === fontSize) return;
		this._fontSize = fontSize;
		this.updateQuad();
	}

	private compileShaders(gl: WebGLRenderingContext) {
		const program = new Program(gl, LabelVertexShader, LabelFragmentShader);
		program.compile();
		PROGRAMS.set(gl, program);
	}

	private updateTexture() {
		const fontSize = this.deviceFontSize;
		const gl = this._chart.gl;
		const pad = (fontSize * 0.2) | 0;
		const canvas = this._canvas;
		const ctx = canvas.getContext('2d');
		ctx.font = `${fontSize}px sans-serif`;
		ctx.textBaseline = 'top';

		const size = ctx.measureText(this._text);
		const textWidth = size.width;
		const textHeight = fontSize + pad;
		const imgWidth = nextPow2(textWidth);
		const imgHeight = nextPow2(textHeight);

		canvas.width = imgWidth;
		canvas.height = imgHeight;
		ctx.font = `${fontSize}px sans-serif`;
		ctx.textBaseline = 'top';
		ctx.fillStyle = `rgba(${this._color.map((c) => c * 255).join(',')})`;
		ctx.fillText(this._text, 0, pad);
		this._textureSize = [imgWidth, imgHeight];
		this._textSize = [textWidth, textHeight];

		this._texture = gl.createTexture();
		const textureUnit = 1;
		gl.activeTexture(gl.TEXTURE0 + textureUnit);
		gl.bindTexture(gl.TEXTURE_2D, this._texture);

		const [w, h] = this._textureSize;
		const pixels = ctx.getImageData(0, 0, w, h);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Update UVs to match text size

		if (!this._uvBuffer) {
			this._uvBuffer = gl.createBuffer();
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuffer);

		const xr = this._textureSize[0] / this._textSize[0];
		const yr = this._textureSize[1] / this._textSize[1];
		const uvs = new Float32Array(UVS.length);
		for (let i = 0; i < UVS.length; i++) {
			if (i % 2 === 0) {
				// X
				uvs[i] = UVS[i] / xr;
			} else {
				// Y
				uvs[i] = UVS[i] / yr;
			}
		}
		gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
	}

	private updateQuad() {
		const gl = this._chart.gl;
		if (!this._positionBuffer) {
			this._positionBuffer = gl.createBuffer();
		}
		if (!this._offsetBuffer) {
			this._offsetBuffer = gl.createBuffer();
		}

		this.updateTexture();

		const ratio = this._textSize[0] / this._textSize[1];

		if (this._orthographic) {
			// prettier-ignore
			const positions = new Float32Array([
				0, 0, 0,
				0, 0, 0,
				0, 0, 0,
				0, 0, 0,
				0, 0, 0,
				0, 0, 0,
			]);
			gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

			const pixelWidth = 1.0 / this._chart.camera.width;
			const pixelHeight = 1.0 / this._chart.camera.height;
			const fontWidth = pixelWidth * this._textSize[0];
			const fontHeight = pixelHeight * this._textSize[1];
			const w = fontWidth;
			const h = fontHeight;
			// prettier-ignore
			const offsets = new Float32Array([
				-w, 0,
				-w, -h * 2,
				w, 0,
				w, -h * 2,
				w, 0,
				-w, -h * 2,
			]);
			gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.STATIC_DRAW);
		} else {
			const positions = createQuad([0, 0, 1], Matrix4.scaling(ratio * this._quadHeight, this._quadHeight, 1.0));
			gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
		}
	}

	update(gl: WebGLRenderingContext) {
		if (!PROGRAMS.get(gl)) {
			this.compileShaders(gl);
		}

		if (!this._orthographic && this._positionBuffer) return;

		// If window is resized, update quad shape
		if (
			this._previousCameraSize[0] != this._chart.camera.width ||
			this._previousCameraSize[1] != this._chart.camera.height
		) {
			this._previousCameraSize = [this._chart.camera.width, this._chart.camera.height];
			this.updateQuad();
		}
	}

	draw(gl: WebGLRenderingContext, camera: Camera) {
		const prog = PROGRAMS.get(gl);
		prog.use();

		prog.bindAttribute('position', this._positionBuffer, 3);
		if (this._orthographic) {
			prog.bindAttribute('offset', this._offsetBuffer, 2);
		}
		prog.bindAttribute('uv', this._uvBuffer, 2);
		prog.setCamera(camera);

		// Scale quad to fit font
		const scale = this.deviceFontSize * 0.002;
		const ratio = this._textSize[0] / this._textSize[1];
		let trans = this.transform;
		trans = trans.multiply(Matrix4.scaling(scale, scale, 1));
		switch (this._align) {
			case LabelAlign.LEFT:
				trans = trans.multiply(Matrix4.translation(this._quadHeight * ratio, 0, 0));
				break;
			case LabelAlign.RIGHT:
				trans = trans.multiply(Matrix4.translation(-this._quadHeight * ratio, 0, 0));
				break;
		}
		prog.setUniform('u_model', trans);
		prog.setUniform('u_orthgraphic', this._orthographic);

		const textureUnit = 1;
		prog.setUniform('u_texture', textureUnit, gl.INT);
		gl.activeTexture(gl.TEXTURE0 + textureUnit);
		gl.bindTexture(gl.TEXTURE_2D, this._texture);

		const vertexCount = 6;

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}
}
