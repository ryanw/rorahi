import { Vector3, Matrix4, cross, addVector3, multiplyVector3, normalize, scaleVector3 } from './geom';

export function createFace(up: Vector3, transform?: Matrix4): [number[], number[]] {
	const axisA: Vector3 = [up[1], up[2], up[0]];
	const axisB = normalize(cross(up, axisA));

	const positions: number[] = [];

	// prettier-ignore
	const barycentrics = [
		1.0, 0.0, 0.0,
		1.0, 1.0, 0.0,
		0.0, 0.0, 1.0,
		1.0, 0.0, 0.0,
		1.0, 1.0, 0.0,
		0.0, 0.0, 1.0,
	];

	const size = 1.0;
	const quad = [
		[size, size],
		[-size, size],
		[size, -size],
		[-size, -size],
		[size, -size],
		[-size, size],
	];

	for (const p of quad) {
		let pos = up;
		pos = addVector3(pos, multiplyVector3([p[0], p[0], p[0]], axisA));
		pos = addVector3(pos, multiplyVector3([p[1], p[1], p[1]], axisB));
		if (transform) {
			pos = transform.transformPoint3(pos);
		}
		positions.push(pos[0]);
		positions.push(pos[1]);
		positions.push(pos[2]);
	}

	return [positions, barycentrics];
}

export function createQuad(up: Vector3, transform?: Matrix4): number[] {
	const axisA: Vector3 = [up[1], up[2], up[0]];
	const axisB = normalize(cross(up, axisA));

	const positions: number[] = [];

	const size = 1.0;
	const quad = [
		[size, size],
		[-size, size],
		[size, -size],
		[-size, -size],
		[size, -size],
		[-size, size],
	];

	for (const p of quad) {
		let pos = addVector3([0, 0, 0], multiplyVector3([p[0], p[0], p[0]], axisA));
		pos = addVector3(pos, multiplyVector3([p[1], p[1], p[1]], axisB));
		if (transform) {
			pos = transform.transformPoint3(pos);
		}
		positions.push(pos[0]);
		positions.push(pos[1]);
		positions.push(pos[2]);
	}

	return positions;
}
