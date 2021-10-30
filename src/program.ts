import { Matrix4, Point3, Vector3, Vector4 } from './geom';
import { Camera } from './camera';

export type UniformValue = Point3 | Vector3 | Vector4 | Matrix4 | boolean | number | number[];

export class Program {
	private _webGLProgram: WebGLProgram;
	private _gl: WebGLRenderingContext;
	vertexShader: string;
	fragmentShader: string;

	constructor(context: WebGLRenderingContext, vertexShader?: string, fragmentShader?: string) {
		this._gl = context;
		this.vertexShader = vertexShader;
		this.fragmentShader = fragmentShader;
	}

	compile() {
		const gl = this._gl;
		const program = gl.createProgram();

		const vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, this.vertexShader);
		gl.attachShader(program, vertexShader);
		gl.compileShader(vertexShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(vertexShader);
			throw `Could not compile Vertex shader: ${info}`;
		}

		const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, this.fragmentShader);
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

		this._webGLProgram = program;
	}

	use() {
		this._gl.useProgram(this._webGLProgram);
	}

	getAttribLocation(name: string) {
		return this._gl.getAttribLocation(this._webGLProgram, name);
	}

	bindAttribute(
		name: string,
		buffer: WebGLBuffer,
		size: number,
		attrType: number = WebGLRenderingContext.FLOAT,
		stride: number = 0,
		offset: number = 0
	) {
		const gl = this._gl;
		const loc = gl.getAttribLocation(this._webGLProgram, name);
		if (loc === -1) {
			console.warn(`Unable to find shader attribute: ${name}`);
			return;
		}
		gl.enableVertexAttribArray(loc);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.vertexAttribPointer(loc, size, attrType, false, stride, offset);
	}

	bindPositionBuffer(buffer: WebGLBuffer, elements?: WebGLBuffer) {
		const gl = this._gl;
		const positionAttr = this.getAttribLocation('position');
		gl.enableVertexAttribArray(positionAttr);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		if (elements) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);
		}
		gl.vertexAttribPointer(positionAttr, 3, gl.FLOAT, false, 0, 0);
	}

	setCamera(camera: Camera) {
		this.setUniform('u_view', camera.view.inverse());
		this.setUniform('u_projection', camera.projection);
	}

	setUniform(name: string, value: UniformValue, uniformType?: number) {
		const gl = this._gl;
		const loc = gl.getUniformLocation(this._webGLProgram, name);
		if (uniformType == null) {
			// Try to detect type from value type
			if (value instanceof Matrix4) {
				uniformType = gl.FLOAT_MAT4;
			} else if (Array.isArray(value)) {
				switch (value.length) {
					case 2:
						uniformType = gl.FLOAT_VEC2;
						break;
					case 3:
						uniformType = gl.FLOAT_VEC3;
						break;
					case 4:
						uniformType = gl.FLOAT_VEC4;
						break;
				}
			} else if (typeof value === 'number') {
				uniformType = gl.FLOAT;
			} else if (typeof value === 'boolean') {
				uniformType = gl.BOOL;
			}
		}

		switch (uniformType) {
			case gl.FLOAT_MAT4:
				if (value instanceof Matrix4) {
					value = value.toArray();
				}
				gl.uniformMatrix4fv(loc, false, value as number[]);
				break;

			case gl.FLOAT_VEC2:
				gl.uniform2fv(loc, value as number[]);
				break;

			case gl.FLOAT_VEC3:
				gl.uniform3fv(loc, value as number[]);
				break;

			case gl.FLOAT_VEC4:
				gl.uniform4fv(loc, value as number[]);
				break;

			case gl.FLOAT:
				gl.uniform1f(loc, value as number);
				break;

			case gl.INT:
				gl.uniform1i(loc, value as number);
				break;

			case gl.BOOL:
				gl.uniform1i(loc, value ? 1 : 0);
				break;

			default:
				throw `Uniform type ${uniformType} not implemented`;
		}
	}
}
