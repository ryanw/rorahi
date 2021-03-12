import { Matrix4, Point2, Point3 } from './geom';
import { Camera } from './camera';
import { Heightmap } from './elements/heightmap';
import { Walls } from './elements/walls';
import { Html } from './elements/html';
import { Label, LabelAlign } from './elements/label';
import { AxisMarkers } from './elements/axis_markers';
import { RGB } from './color';
import { Gradient } from './gradient';

export interface AxisOptions {
	label?: string;
	range?: [number, number];
}

export interface ChartOptions<T extends ArrayLike<number>> {
	data?: T;
	dataWidth?: number;
	origin?: [number, number, number];
	resolution?: number;
	gradient?: Gradient | RGB[];
	axes?: {
		x?: AxisOptions;
		y?: AxisOptions;
		z?: AxisOptions;
	};
}

export interface ChartElement {
	update?(gl: WebGLRenderingContext): void;
	draw?(gl: WebGLRenderingContext, camera: Camera): void;
}

const DEFAULT_COLORS: RGB[] = [
	[1.0, 0.0, 0.0],
	[1.0, 1.0, 0.0],
	[0.0, 1.0, 0.0],
	[0.0, 1.0, 1.0],
	[0.0, 0.0, 1.0],
	[1.0, 0.0, 1.0],
];

export class Chart<T extends ArrayLike<number>> {
	private _data: T;
	private _dataWidth: number;
	private _canvas: HTMLCanvasElement;
	private _container: HTMLElement;
	private _gl: WebGLRenderingContext;
	private _items: ChartElement[] = [];
	private _resizeObserver: ResizeObserver;
	private _mouseEnabled = true;
	readonly gradient: Gradient;
	camera = new Camera();

	constructor(options?: ChartOptions<T>) {
		this._canvas = document.createElement('canvas');
		if (options?.data) {
			this.data = options.data;
		}
		if (options?.dataWidth) {
			this._dataWidth = options.dataWidth;
		}
		if (options?.gradient) {
			if (options.gradient instanceof Gradient) {
				this.gradient = options.gradient;
			} else {
				this.gradient = new Gradient(options.gradient);
			}
		}
		else {
			this.gradient = new Gradient(DEFAULT_COLORS);
		}

		const res = options?.resolution || 64;

		// Heightmap visualisation
		const heightmap = new Heightmap(this, res, res);
		heightmap.transform = Matrix4.rotation(-Math.PI / 2, 0, 0);
		this._items.push(heightmap);

		// Walls
		this._items.push(new Walls(this));

		// X Marker Labels
		for (let i = 0; i < 17; i++) {
			const labelTrans = Matrix4.identity()
				.multiply(Matrix4.translation(-0.5 + (i * (1/16)), -0.5, 0.55))
				.multiply(Matrix4.rotation(0, 0, Math.PI / 2))
				.multiply(Matrix4.rotation(0, Math.PI / 2, 0));
			const label = new Label({
				text: `${i}`,
				fontSize: 48,
				color: [1.0, 0.0, 0.0],
				align: LabelAlign.RIGHT,
				transform: labelTrans,
			});
			this._items.push(label);
		}

		// Y (up) Marker Labels
		for (let i = 1; i < 10; i++) {
			const labelTrans = Matrix4.identity()
				.multiply(Matrix4.translation(-0.5, -0.5 + (i * (1/9)), 0.55))
				//.multiply(Matrix4.rotation(0, 0, Math.PI / 2))
				.multiply(Matrix4.rotation(0, Math.PI / 2, 0));
			const label = new Label({
				text: `${i}`,
				fontSize: 48,
				color: [0.0, 0.6, 0.0],
				align: LabelAlign.RIGHT,
				transform: labelTrans,
			});
			this._items.push(label);
		}

		// Z (forward) Marker Labels
		for (let i = 0; i < 17; i++) {
			const labelTrans = Matrix4.identity()
				.multiply(Matrix4.translation(0.57, -0.5, 0.50 - (i * (1/16))))
				.multiply(Matrix4.rotation(0, 0, Math.PI / 2))
				.multiply(Matrix4.rotation(0, Math.PI / 2, 0));
			const label = new Label({
				text: `${i}`,
				fontSize: 48,
				color: [0.0, 0.0, 1.0],
				align: LabelAlign.CENTER,
				transform: labelTrans,
			});
			this._items.push(label);
		}

		// X axis
		this._items.push(new AxisMarkers(this, 16));
		this._items.push(new AxisMarkers(this, 16, Matrix4.rotation(0, Math.PI, 0)));

		// Z axis (forward)
		this._items.push(new AxisMarkers(this, 16, Matrix4.rotation(0, Math.PI / 2, 0)));
		this._items.push(new AxisMarkers(this, 16, Matrix4.rotation(0, -Math.PI / 2, 0)));

		// Y axis (up)
		//this._items.push(new AxisMarkers(this, this.gradient.length, Matrix4.rotation(0, 0, -Math.PI / 2)));
		this._items.push(new AxisMarkers(this, this.gradient.length, Matrix4.rotation(0, 0, -Math.PI / 2)));

		const el = document.createElement('div');
		el.className = 'test-label';
		el.innerHTML = 'Test Label 😝 <button type="button">Clicky</button>';
		this._items.push(new Html(this, el, Matrix4.translation(-0.5, 0.5, 0.5)));
	}

	get gl(): WebGLRenderingContext | null {
		if (!this._container) return null;
		if (!this._gl) {
			this.initWebGL();
		}
		return this._gl;
	}

	get container(): HTMLElement | null {
		return this._container;
	}

	get data(): T {
		return this._data;
	}

	set data(newData: T) {
		this._data = newData;
		this.update?.();
	}

	get dataWidth(): number {
		return this._dataWidth;
	}

	get dataHeight(): number {
		return this._data.length / this._dataWidth;
	}

	pointToPixel(p: Point3): Point2 {
		const proj = this.camera.projection;
		const view = this.camera.view.inverse();
		const viewProj = proj.multiply(view);
		const pixel = viewProj.transformPoint3(p);
		const { clientWidth: width, clientHeight: height } = this._container;

		const hw = width / 2;
		const hh = height / 2;
		const x = pixel[0];
		const y = pixel[1];
		return [x * hw + hw, -y * hh + hh];
	}

	enableMouse() {
		this._mouseEnabled = true;
		this.attachMouseListeners();
	}

	disableMouse() {
		this._mouseEnabled = false;
		this.detachMouseListeners();
	}

	getData(x: number, y: number): number {
		const i = x + y * this._dataWidth;
		return this.data[i];
	}

	private initWebGL() {
		console.debug('Initializing WebGL');
		const options = { antialias: true };

		const gl = this._canvas.getContext('webgl', options) as WebGLRenderingContext;
		if (!gl) {
			throw 'Failed to create WebGL context';
		}

		// Enable `fwidth` in shader
		gl.getExtension('OES_standard_derivatives');

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

		this._gl = gl;
	}

	private attachListeners() {
		this.detachListeners();
		if ('ResizeObserver' in window) {
			this._resizeObserver = new ResizeObserver(() => this.updateSize());
			this._resizeObserver.observe(this._container);
		}
		if (this._mouseEnabled) {
			this.attachMouseListeners();
		}
	}

	private detachListeners() {
		this._resizeObserver?.unobserve(this._container);
		this.detachMouseListeners();
	}

	private attachMouseListeners() {
		if (!this._canvas) return;
		this._canvas.addEventListener('mousedown', this.onMouseDown);
	}

	private detachMouseListeners() {
		this._canvas.removeEventListener('mousedown', this.onMouseDown);
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	}

	private onMouseDown = () => {
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
	}

	private onMouseUp = () => {
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	}

	private onMouseMove = (e: MouseEvent) => {
		const mouseSpeed = 0.005;
		const { movementX: mX, movementY: mY } = e;
		const x = -mX * mouseSpeed;
		const y = -mY * mouseSpeed;

		this.camera.rotate(x, y);
	}

	update() {
		for (const item of this._items) {
			item.update?.(this.gl);
		}
	}

	draw() {
		const gl = this.gl;
		gl.clearDepth(1.0);
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		for (const item of this._items) {
			item.draw(gl, this.camera);
		}
	}

	attach(element: HTMLElement | string) {
		if (typeof element === 'string') {
			element = document.querySelector(element) as HTMLElement;
		}
		this._container = element;
		this.updateSize();
		element.appendChild(this._canvas);
		this.attachListeners();
		this.update();
		this.draw();
	}

	detach() {
		if (!this._container) return;
		this._container.removeChild(this._canvas);
		this._container = null;
		this.detachListeners();
	}

	updateSize() {
		if (!this._container) return;
		const { clientWidth: width, clientHeight: height } = this._container;
		const deviceWidth = width * window.devicePixelRatio;
		const deviceHeight = height * window.devicePixelRatio;
		this._canvas.style.width = `${width}px`;
		this._canvas.style.height = `${height}px`;
		this._canvas.width = deviceWidth;
		this._canvas.height = deviceHeight;
		this.camera.resize(deviceWidth, deviceHeight);
		this.gl.viewport(0, 0, deviceWidth, deviceHeight);
	}
}
