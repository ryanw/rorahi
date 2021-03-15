import { Matrix4, Point2, Point3, Rect } from './geom';
import { Camera } from './camera';
import { Heightmap } from './elements/heightmap';
import { Walls } from './elements/walls';
import { Html } from './elements/html';
import { Label, LabelAlign } from './elements/label';
import { AxisMarkers, Axis } from './elements/axis_markers';
import { RGB } from './color';
import { Gradient } from './gradient';

type ExtWheelEvent = WheelEvent & { wheelDelta: number; axis: number; HORIZONTAL_AXIS: 0x01; VERTICAL_AXIS: 0x02 };

export interface AxisOptions {
	label?: string;
	range?: [number, number];
}

export interface ChartOptions<T extends ArrayLike<number>> {
	data?: T;
	dataWidth?: number;
	dataRange?: [number, number];
	resolution?: number;
	gradient?: Gradient | RGB[];
	region?: Rect;
	showContours?: boolean;
	showGrid?: boolean;
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
	private _elements: ChartElement[] = [];
	private _resizeObserver: ResizeObserver;
	private _mouseEnabled = true;
	private _region: Rect = [0, 0, 0, 0];
	private _dataRange = [0.0, 1.0];
	private _resolution = 64;
	private _heightmap: Heightmap<T>;
	private _showContours = false;
	private _showGrid = false;
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

		if (options?.dataRange) {
			this._dataRange = [...options.dataRange];
		}

		if (options?.region) {
			this._region = [...options.region];
		} else if (options?.data && options?.dataWidth) {
			this._region = [0, 0, options.dataWidth, options.data.length / options.dataWidth];
		}

		if (options?.gradient) {
			if (options.gradient instanceof Gradient) {
				this.gradient = options.gradient;
			} else {
				this.gradient = new Gradient(options.gradient);
			}
		} else {
			this.gradient = new Gradient(DEFAULT_COLORS);
		}

		if (options?.resolution) {
			this._resolution = options.resolution;
		}

		if (options?.showContours) {
			this._showContours = options.showContours;
		}

		if (options?.showGrid) {
			this._showGrid = options.showGrid;
		}

		// Heightmap visualisation
		const heightmap = new Heightmap(this, this._resolution);
		heightmap.transform = Matrix4.rotation(-Math.PI / 2, 0, 0);
		this._elements.push(heightmap);
		this._heightmap = heightmap;

		// Walls
		this._elements.push(new Walls(this));

		/*
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
			this._elements.push(label);
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
			this._elements.push(label);
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
			this._elements.push(label);
		}
		*/

		// X axis
		this._elements.push(new AxisMarkers(this, Axis.X, Matrix4.translation(0.0, 0.0, 0.02)));
		this._elements.push(new AxisMarkers(this, Axis.X, Matrix4.translation(0.0, 0.0, -1.02)));

		// Z axis (forward)
		this._elements.push(
			new AxisMarkers(this, Axis.Z, Matrix4.rotation(0, Math.PI / 2, 0).multiply(Matrix4.translation(0.0, 0.0, 0.02)))
		);
		this._elements.push(
			new AxisMarkers(this, Axis.Z, Matrix4.rotation(0, Math.PI / 2, 0).multiply(Matrix4.translation(0.0, 0.0, -1.02)))
		);

		// Y axis (up)
		this._elements.push(
			new AxisMarkers(this, Axis.Y, Matrix4.rotation(0, 0, -Math.PI / 2).multiply(Matrix4.translation(0.0, 0.0, 0.02)))
		);
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

	get region(): Rect {
		return [...this._region];
	}

	get resolution(): number {
		return this._resolution;
	}

	set resolution(resolution: number) {
		this._resolution = resolution;
		this._heightmap.resolution = resolution;
		this.draw();
	}

	get showContours(): boolean {
		return this._showContours;
	}

	set showContours(showContours: boolean) {
		this._showContours = showContours;
		this.draw();
	}

	get showGrid(): boolean {
		return this._showGrid;
	}

	set showGrid(showGrid: boolean) {
		this._showGrid = showGrid;
		this.draw();
	}

	set region(rect: Rect) {
		this._region = [...rect];
		this.update();
		this.draw();
	}

	set data(newData: T) {
		this._data = newData;
		this.update();
		this.draw();
	}

	set xOffset(value: number) {
		this._region[0] = value;
		this.update();
		this.draw();
	}

	set yOffset(value: number) {
		this._region[1] = value;
		this.update();
		this.draw();
	}

	set xScale(value: number) {
		this._region[2] = value;
		this.update();
		this.draw();
	}

	set yScale(value: number) {
		this._region[3] = value;
		this.update();
		this.draw();
	}

	get dataWidth(): number {
		return this._dataWidth;
	}

	get dataHeight(): number {
		return this._data.length / this._dataWidth;
	}

	addElement(el: ChartElement) {
		this._elements.push(el);
	}

	calculateDataRange() {
		let min = Number.MAX_VALUE;
		let max = Number.MIN_VALUE;
		for (let i = 0; i < this._data.length; i++) {
			const v = this._data[i];
			if (v < min) {
				min = v;
			}
			if (v > max) {
				max = v;
			}
		}

		this._dataRange = [min, max];
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
		if (x > this._region[2]) return null;
		if (y > this._region[3]) return null;
		x += this._region[0];
		y += this._region[1];
		if (x > this.dataWidth) return null;
		if (y > this.dataHeight) return null;
		const i = x + y * this._dataWidth;
		return this.data[i];
	}

	getNormalizedData(x: number, y: number): number {
		return this.normalizeData(this.getData(x, y));
	}

	private normalizeData(value: number): number {
		const [srcMin, srcMax] = this._dataRange;
		const [dstMin, dstMax] = [0.0, 1.0];
		return ((value - srcMin) * (dstMax - dstMin)) / (srcMax - srcMin) + dstMin;
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
		this._canvas.addEventListener('wheel', this.onWheel);
		this._canvas.addEventListener('DOMMouseScroll', this.onWheel);
	}

	private detachMouseListeners() {
		this._canvas.removeEventListener('mousedown', this.onMouseDown);
		this._canvas.removeEventListener('wheel', this.onWheel);
		this._canvas.removeEventListener('DOMMouseScroll', this.onWheel);
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	}

	private onMouseDown = () => {
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
	};

	private onMouseUp = () => {
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	};

	private onMouseMove = (e: MouseEvent) => {
		const mouseSpeed = 0.005;
		const { movementX: mX, movementY: mY } = e;
		const x = -mX * mouseSpeed;
		const y = -mY * mouseSpeed;

		this.camera.rotate(x, y);
		this.draw();
	};

	private onWheel = (e: ExtWheelEvent) => {
		// Ignore Firefox 'onwheel'
		if (!e.axis && !e.wheelDelta) return;
		e.preventDefault();

		let dx = 0;
		let dy = 0;

		if (!e.wheelDelta && e.detail) {
			// Firefox (DOMMouseScroll)
			const amount = (e.detail * 53) / 3;
			if (e.axis === e.HORIZONTAL_AXIS) {
				dx = amount;
			} else {
				dy = amount;
			}
		} else {
			// Proper wheel event
			dx = e.deltaX;
			dy = e.deltaY;
		}

		this.camera.distance *= 1.0 + dy * 0.003;
		if (this.camera.distance < 1) {
			this.camera.distance = 1;
		} else if (this.camera.distance > 8) {
			this.camera.distance = 8;
		}
		this.draw();
	};

	update() {
		for (const element of this._elements) {
			element.update?.(this.gl);
		}
	}

	draw() {
		const gl = this.gl;
		if (!gl) return;
		gl.clearDepth(1.0);
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		for (const element of this._elements) {
			element.draw(gl, this.camera);
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
		this.update();
		this.draw();
	}
}
