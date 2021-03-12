export type Point4 = [number, number, number, number];
export type Point3 = [number, number, number];
export type Point2 = [number, number];
export type Vector4 = [number, number, number, number];
export type Vector3 = [number, number, number];
export type Vector2 = [number, number];
export type Rect = [number, number, number, number];
export type LonLat = [number, number];

export type Columns = [Vector4, Vector4, Vector4, Vector4];
export type Rows = [Vector4, Vector4, Vector4, Vector4];

// prettier-ignore
export class Matrix4 {
	private _data: Float32Array;

	constructor(data?: number[] | Float32Array) {
		this._data = new Float32Array(16);
		if (data) {
			for (let i = 0; i < 16; i++) {
				this._data[i] = data[i];
			}
		}
	}

	static identity(): Matrix4 {
		return new Matrix4([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		]);
	}

	static fromColumns(cols: Columns): Matrix4 {
		return new Matrix4([
			cols[0][0], cols[1][0], cols[2][0], cols[3][0],
			cols[0][1], cols[1][1], cols[2][1], cols[3][1],
			cols[0][2], cols[1][2], cols[2][2], cols[3][2],
			cols[0][3], cols[1][3], cols[2][3], cols[3][3],
		]);
	}

	static perspective(aspect: number, fov: number, near: number, far: number): Matrix4 {
		const fovRad = fov * (Math.PI / 180);
		const f = 1.0 / Math.tan(fovRad / 2.0);
		const range = 1.0 / (near - far);
		return new Matrix4([
			f / aspect, 0,                    0,                      0,
			0,          f,                    0,                      0,
			0,          0, (near + far) * range, near * far * range * 2,
			0,          0,                   -1,                      0,
		]);
	}

	static rotation(x: number, y: number, z: number): Matrix4 {
		const axisangle: Vector3 = [x, y, z];

		function cosSin(axis: number): [number, number] {
			return [Math.cos(axisangle[axis]), Math.sin(axisangle[axis])];
		}


		const [cosx, sinx] = cosSin(0);
		const [cosy, siny] = cosSin(1);
		const [cosz, sinz] = cosSin(2);
		const rotx = new Matrix4([
			1,    0,     0, 0,
			0, cosx, -sinx, 0,
			0, sinx,  cosx, 0,
			0,    0,     0, 1,
		]);
		const roty = new Matrix4([
			cosy,  0, siny, 0,
			   0,  1,    0, 0,
			-siny, 0, cosy, 0,
			    0, 0,    0, 1,
		]);
		const rotz = new Matrix4([
			cosz, -sinz, 0, 0,
			sinz,  cosz, 0, 0,
			   0,     0, 1, 0,
			   0,     0, 0, 1,
		]);

		return rotx.multiply(roty.multiply(rotz));
	}

	static translation(x: number, y: number, z: number): Matrix4 {
		return new Matrix4([
			1, 0, 0, x,
			0, 1, 0, y,
			0, 0, 1, z,
			0, 0, 0, 1,
		]);
	}

	static scaling(x: number, y?: number, z?: number): Matrix4 {
		if (y == null) y = x;
		if (z == null) z = y;

		return new Matrix4([
			x, 0, 0, 0,
			0, y, 0, 0,
			0, 0, z, 0,
			0, 0, 0, 1,
		]);
	}

	static lookAt(from: Point3, to: Point3) {
		const forward = normalize([
			from[0] - to[0],
			from[1] - to[1],
			from[2] - to[2],
		]);

		const right = cross([0.0, 1.0, 0.0], forward);

		const up = cross(forward, right);

		const view = new Matrix4([
			right[0], up[0], forward[0], from[0],
			right[1], up[1], forward[1], from[1],
			right[2], up[2], forward[2], from[2],
		         0,      0,         0,       1,
		]);

		return view;
	}

	clone(): Matrix4 {
		return new Matrix4(this._data);
	}

	toArray(): number[] {
		return Array.from(this._data);
	}


	setAt(col: number, row: number, value: number) {
		const idx = row * 4 + col;
		this._data[idx] = value;
	}

	at(col: number, row: number): number {
		const idx = row * 4 + col;
		return this._data[idx];
	}

	column(axis: number): Vector4 {
		const d = this._data;
		return [
			d[axis + 0],
			d[axis + 4],
			d[axis + 8],
			d[axis + 12],
		];
	}

	row(axis: number): Vector4 {
		const d = this._data;
		const o = 4 * axis;
		return [
			d[o + 0],
			d[o + 1],
			d[o + 2],
			d[o + 3],
		];
	}

	get columns(): Columns {
		return [
			this.column(0),
			this.column(1),
			this.column(2),
			this.column(3),
		];
	}

	get rows(): Rows {
		return [
			this.row(0),
			this.row(1),
			this.row(2),
			this.row(3),
		];
	}

	multiply(other: Matrix4): Matrix4 {
		const [colx, coly, colz, colw] = other.columns;
		const columns: Columns = [
			this.multiplyVector4(colx),
			this.multiplyVector4(coly),
			this.multiplyVector4(colz),
			this.multiplyVector4(colw),
		];
		return Matrix4.fromColumns(columns);
	}

	multiplyVector4(vec: Vector4): Vector4 {
		const cols = this.columns;

		const x = scaleVector4(cols[0], vec[0]);
		const y = scaleVector4(cols[1], vec[1]);
		const z = scaleVector4(cols[2], vec[2]);
		const w = scaleVector4(cols[3], vec[3]);
		return [
			(x[0] + y[0] + z[0] + w[0]),
			(x[1] + y[1] + z[1] + w[1]),
			(x[2] + y[2] + z[2] + w[2]),
			(x[3] + y[3] + z[3] + w[3]),
		];
	}

	transformPoint3(point: Point3): Point3 {
		const vec = this.multiplyVector4([point[0], point[1], point[2], 1]);

		return [
			vec[0] / vec[3],
			vec[1] / vec[3],
			vec[2] / vec[3],
		];
	}

	inverse(): Matrix4 {
		const inv = new Array(16);
		const m = this.toArray();

		inv[0] = m[5]*m[10]*m[15] -
			m[5]*m[14]*m[11] -
			m[6]*m[9]*m[15] +
			m[6]*m[13]*m[11] +
			m[7]*m[9]*m[14] -
			m[7]*m[13]*m[10];

		inv[1] = -m[1]*m[10]*m[15] +
			m[1]*m[14]*m[11] +
			m[2]*m[9]*m[15] -
			m[2]*m[13]*m[11] -
			m[3]*m[9]*m[14] +
			m[3]*m[13]*m[10];

		inv[2] = m[1]*m[6]*m[15] -
			m[1]*m[14]*m[7] -
			m[2]*m[5]*m[15] +
			m[2]*m[13]*m[7] +
			m[3]*m[5]*m[14] -
			m[3]*m[13]*m[6];

		inv[3] = -m[1]*m[6]*m[11] +
			m[1]*m[10]*m[7] +
			m[2]*m[5]*m[11] -
			m[2]*m[9]*m[7] -
			m[3]*m[5]*m[10] +
			m[3]*m[9]*m[6];

		inv[4] = -m[4]*m[10]*m[15] +
			m[4]*m[14]*m[11] +
			m[6]*m[8]*m[15] -
			m[6]*m[12]*m[11] -
			m[7]*m[8]*m[14] +
			m[7]*m[12]*m[10];

		inv[5] = m[0]*m[10]*m[15] -
			m[0]*m[14]*m[11] -
			m[2]*m[8]*m[15] +
			m[2]*m[12]*m[11] +
			m[3]*m[8]*m[14] -
			m[3]*m[12]*m[10];

		inv[6] = -m[0]*m[6]*m[15] +
			m[0]*m[14]*m[7] +
			m[2]*m[4]*m[15] -
			m[2]*m[12]*m[7] -
			m[3]*m[4]*m[14] +
			m[3]*m[12]*m[6];

		inv[7] = m[0]*m[6]*m[11] -
			m[0]*m[10]*m[7] -
			m[2]*m[4]*m[11] +
			m[2]*m[8]*m[7] +
			m[3]*m[4]*m[10] -
			m[3]*m[8]*m[6];

		inv[8] = m[4]*m[9]*m[15] -
			m[4]*m[13]*m[11] -
			m[5]*m[8]*m[15] +
			m[5]*m[12]*m[11] +
			m[7]*m[8]*m[13] -
			m[7]*m[12]*m[9];

		inv[9] = -m[0]*m[9]*m[15] +
			m[0]*m[13]*m[11] +
			m[1]*m[8]*m[15] -
			m[1]*m[12]*m[11] -
			m[3]*m[8]*m[13] +
			m[3]*m[12]*m[9];

		inv[10] = m[0]*m[5]*m[15] -
			m[0]*m[13]*m[7] -
			m[1]*m[4]*m[15] +
			m[1]*m[12]*m[7] +
			m[3]*m[4]*m[13] -
			m[3]*m[12]*m[5];

		inv[11] = -m[0]*m[5]*m[11] +
			m[0]*m[9]*m[7] +
			m[1]*m[4]*m[11] -
			m[1]*m[8]*m[7] -
			m[3]*m[4]*m[9] +
			m[3]*m[8]*m[5];

		inv[12] = -m[4]*m[9]*m[14] +
			m[4]*m[13]*m[10] +
			m[5]*m[8]*m[14] -
			m[5]*m[12]*m[10] -
			m[6]*m[8]*m[13] +
			m[6]*m[12]*m[9];

		inv[13] = m[0]*m[9]*m[14] -
			m[0]*m[13]*m[10] -
			m[1]*m[8]*m[14] +
			m[1]*m[12]*m[10] +
			m[2]*m[8]*m[13] -
			m[2]*m[12]*m[9];

		inv[14] = -m[0]*m[5]*m[14] +
			m[0]*m[13]*m[6] +
			m[1]*m[4]*m[14] -
			m[1]*m[12]*m[6] -
			m[2]*m[4]*m[13] +
			m[2]*m[12]*m[5];

		inv[15] = m[0]*m[5]*m[10] -
			m[0]*m[9]*m[6] -
			m[1]*m[4]*m[10] +
			m[1]*m[8]*m[6] +
			m[2]*m[4]*m[9] -
			m[2]*m[8]*m[5];

		const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
		if (det == 0) {
			return null;
		}

		return new Matrix4(inv);
	}

	extractTranslation(): Matrix4 {
		const x = this._data[3];
		const y = this._data[7];
		const z = this._data[11];
		return Matrix4.translation(x, y, z);
	}

	extractScaling(): Matrix4 {
		const x = 0;
		const y = 0;
		const z = 0;
		return Matrix4.scaling(x, y, z);
	}

	extractRotation(): Matrix4 {
		const x = 0;
		const y = 0;
		const z = 0;
		return Matrix4.rotation(x, y, z);
	}

	eulerAngles(): Vector3 {
		const sy = Math.sqrt(this.at(0, 0) * this.at(0, 0) + this.at(1, 0) * this.at(1, 0));
		const singular = sy < 1e-6;

		let x = 0.0;
		let y = 0.0;
		let z = 0.0;

		if (singular) {
			x = Math.atan2(this.at(1, 2), this.at(1, 1));
			y = Math.atan2(this.at(2, 0), sy);
			z = 0;
		} else {
			x = Math.atan2(-this.at(2, 1), this.at(2, 2));
			y = Math.atan2(this.at(2, 0), sy);
			z = Math.atan2(-this.at(1, 0), this.at(0, 0));
		}

		return [x, y, z];
	}
}

export function scaleVector4(vec: Vector4, scale: number): Vector4 {
	return [vec[0] * scale, vec[1] * scale, vec[2] * scale, vec[3] * scale];
}

export function addVector4(vec: Vector4, other: Vector4): Vector4 {
	return [vec[0] + other[0], vec[1] + other[1], vec[2] + other[2], vec[3] + other[3]];
}

export function subtractVector4(vec: Vector4, other: Vector4): Vector4 {
	return [vec[0] - other[0], vec[1] - other[1], vec[2] - other[2], vec[3] - other[3]];
}

export function multiplyVector4(vec: Vector4, other: Vector4): Vector4 {
	return [vec[0] * other[0], vec[1] * other[1], vec[2] * other[2], vec[3] * other[3]];
}

export function scaleVector3(vec: Vector3, scale: number): Vector3 {
	return [vec[0] * scale, vec[1] * scale, vec[2] * scale];
}

export function addVector3(vec: Vector3, other: Vector3): Vector3 {
	return [vec[0] + other[0], vec[1] + other[1], vec[2] + other[2]];
}

export function subtractVector3(vec: Vector3, other: Vector3): Vector3 {
	return [vec[0] - other[0], vec[1] - other[1], vec[2] - other[2]];
}

export function multiplyVector3(vec: Vector3, other: Vector3): Vector3 {
	return [vec[0] * other[0], vec[1] * other[1], vec[2] * other[2]];
}

export function distanceVector3(vec: Vector3, other: Vector3): number {
	const diff = subtractVector3(vec, other);
	return Math.abs(magnitude(diff));
}

export function cross(p0: Vector3, p1: Vector3): Vector3 {
	const x = p0[1] * p1[2] - p0[2] * p1[1];
	const y = p0[2] * p1[0] - p0[0] * p1[2];
	const z = p0[0] * p1[1] - p0[1] * p1[0];
	return [x, y, z];
}

export function dot(p0: Vector3, p1: Vector3): number {
	const x = p0[0] * p1[0];
	const y = p0[1] * p1[1];
	const z = p0[2] * p1[2];
	return x + y + z;
}

export function normalize(v: Vector3): Vector3 {
	const norm = magnitude(v);
	return [v[0] / norm, v[1] / norm, v[2] / norm];
}

export function magnitude(v: Vector3): number {
	return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function raySphereIntersection(
	center: Point3,
	radius: number,
	origin: Point3,
	direction: Vector3
): Point3 | null {
	const p: Vector3 = [origin[0] - center[0], origin[1] - center[1], origin[2] - center[2]];

	const a = Math.pow(magnitude(direction), 2);
	const b = dot(direction, p);
	const c = Math.pow(magnitude(p), 2) - radius * radius;
	const delta = b * b - a * c;
	if (delta < 0) {
		return null;
	}

	const deltaSqrt = Math.sqrt(delta);

	const tmin = (-b - deltaSqrt) / a;
	const tmax = (-b + deltaSqrt) / a;

	if (tmax < 0) {
		return null;
	}

	const t = tmin >= 0 ? tmin : tmax;

	return [origin[0] + t * direction[0], origin[1] + t * direction[1], origin[2] + t * direction[2]];
}

export function pointToLonLat(point: Point3): LonLat {
	const v = normalize(point);
	const p = normalize([v[0], 0, v[2]]);
	let lat = Math.acos(dot(p, v));
	if (v[1] < 0) {
		lat *= -1;
	}
	let lon = -Math.atan2(-v[2], -v[0]) - Math.PI / 2;
	if (lon < -Math.PI) {
		lon += Math.PI * 2;
	}

	return [lon, lat];
}

export function lonLatToPoint(ll: LonLat, radius: number = 1): Point3 {
	const lon = ll[0] - Math.PI;
	const lat = ll[1] - Math.PI / 2;

	const x = radius * Math.sin(lat) * Math.sin(lon);
	const y = radius * Math.cos(lat);
	const z = radius * Math.sin(lat) * Math.cos(lon);

	return [x, y, z];
}
