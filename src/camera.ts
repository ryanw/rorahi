import { Matrix4, Point3 } from './geom';

export class Camera {
	width: number;
	height: number;
	near: number = 0.1;
	far: number = 1000.0;
	projection: Matrix4;
	distance: number = 4.0;
	target: Point3 = [0.0, 0.0, 0.0];
	rotation = { lon: 0.0, lat: 0.0 };

	constructor() {
		this.resize(1, 1);
	}

	get view(): Matrix4 {
		const pos = this.target;
		return Matrix4.identity()
			.multiply(Matrix4.translation(pos[0], pos[1], pos[2]))
			.multiply(Matrix4.rotation(0.0, this.rotation.lon, 0.0))
			.multiply(Matrix4.rotation(this.rotation.lat, 0.0, 0.0))
			.multiply(Matrix4.translation(0.0, 0.0, this.distance));
	}

	resize(width: number, height: number): void {
		this.width = width;
		this.height = height;
		const aspect = width / height;
		this.projection = Matrix4.perspective(aspect, 45.0, this.near, this.far);
	}

	zoom(amount: number) {
		this.distance += amount;
	}

	rotate(lon: number, lat: number) {
		this.rotation = {
			lon: this.rotation.lon + lon,
			lat: this.rotation.lat + lat,
		};
		if (this.rotation.lat < -Math.PI / 2) {
			this.rotation.lat = -Math.PI / 2;
		}
		if (this.rotation.lat > Math.PI / 2) {
			this.rotation.lat = Math.PI / 2;
		}
	}
}
