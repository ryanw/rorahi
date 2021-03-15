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

	clone(): Camera {
		const camera = new Camera();
		camera.width = this.width;
		camera.height = this.height;
		camera.near = this.near;
		camera.far = this.far;
		camera.distance = this.distance;
		camera.projection = this.projection.clone();
		camera.target = [...this.target];
		camera.rotation = { lon: this.rotation.lon, lat: this.rotation.lat };

		return camera;
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

	cssTransform(trans: Matrix4 = Matrix4.identity()): Matrix4 {
		const hw = this.width / 2;
		const hh = this.height / 2;
		const ratio = hw / hh;
		const view = this.view.inverse();
		const proj = this.projection;
		const viewProj = proj.multiply(view);
		trans = trans.multiply(Matrix4.scaling(1 / hw, 1 / -hh, 1));
		trans = trans.multiply(Matrix4.scaling(ratio, 1, 1));
		trans = viewProj.multiply(trans);
		trans = Matrix4.scaling(hw, -hh, 1).multiply(trans);

		return trans;
	}
}
