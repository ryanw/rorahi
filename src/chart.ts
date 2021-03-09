import { Matrix4 } from './geom';
import { Camera } from './camera';
import { Heightmap } from './elements/heightmap';
import { Walls } from './elements/walls';
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
	update(gl: WebGLRenderingContext): void;
	draw(gl: WebGLRenderingContext, camera: Camera): void;
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

		this._items.push(new Walls(this));

		// X axis
		this._items.push(new AxisMarkers(this, 16));
		this._items.push(new AxisMarkers(this, 16, Matrix4.rotation(0, Math.PI, 0)));

		// Z axis (forward)
		this._items.push(new AxisMarkers(this, 16, Matrix4.rotation(0, Math.PI / 2, 0)));
		this._items.push(new AxisMarkers(this, 16, Matrix4.rotation(0, -Math.PI / 2, 0)));

		// Y axis (up)
		//this._items.push(new AxisMarkers(this, this.gradient.length, Matrix4.rotation(0, 0, -Math.PI / 2)));
		this._items.push(new AxisMarkers(this, this.gradient.length, Matrix4.rotation(0, 0, -Math.PI / 2)));
	}

	get gl(): WebGLRenderingContext | null {
		if (!this._container) return null;
		if (!this._gl) {
			this.initWebGL();
		}
		return this._gl;
	}

	get data(): T {
		return this._data;
	}

	set data(newData: T) {
		this._data = newData;
		this.update();
	}

	get dataWidth(): number {
		return this._dataWidth;
	}

	get dataHeight(): number {
		return this._data.length / this._dataWidth;
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
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		this._gl = gl;
	}

	private attachListeners() {
		if ('ResizeObserver' in window) {
			this._resizeObserver = new ResizeObserver(() => this.updateSize());
			this._resizeObserver.observe(this._container);
		}
	}

	private detachListeners() {
		this._resizeObserver?.unobserve(this._container);
	}

	update() {
		for (const item of this._items) {
			item.update(this.gl);
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
		element.style.overflow = 'hidden';
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
