import { Matrix4, Point2, Point3, Rect } from './geom';
import { Camera } from './camera';
import { Heightmap } from './elements/heightmap';
import { Walls } from './elements/walls';
import { AxisMarkers, Axis, LabelAnchor } from './elements/axis_markers';
import { RGB } from './color';
import { Gradient } from './gradient';

type ExtWheelEvent = WheelEvent & { wheelDelta: number; axis: number; HORIZONTAL_AXIS: 0x01; VERTICAL_AXIS: 0x02 };

export interface AxisOptions {
	label?: string;
	range?: [number, number];

	/**
	 * For X and Z axes; how far up the Y axis to draw the markers.
	 * For the Y axis; how far along the X and Z axes to draw the markers.
	 * Values range from 0.0 for the start, and 1.0 for the end
	 */
	position?: number;
}

/**
 * Configuration options for the {@link Chart}.
 */
export interface ChartOptions {
	/**
	 * The data used to generate the heightmap.
	 * Either a flat Array of 2D data, or a greyscale image
	 */
	data?: ArrayLike<number> | HTMLImageElement;

	/**
	 * How many `data` elements make up a single row in the 2D dataset
	 */
	dataWidth?: number;

	/**
	 * The minimum and maximum values found inside `data`. Used to
	 * control how high and low the heightmap goes.
	 */
	dataRange?: [number, number];

	/**
	 * How detailed the 3D geometry should be. Higher numbers look
	 * smoother, but lower numbers perform better.
	 */
	resolution?: number;

	/**
	 * A list of colours to uses for the heightmap
	 */
	gradient?: Gradient | RGB[];

	/**
	 * Which 2D section of the `data` to use to draw the heightmap
	 */
	region?: Rect;

	/**
	 * How wide the 3D heightmap will be drawn
	 */
	width?: number;

	/**
	 * How high (up) the 3D heightmap will be drawn
	 */
	height?: number;

	/**
	 * How deep (forward) the 3D heightmap will be drawn
	 */
	depth?: number;

	/**
	 * Whether to show contour lines on the heightmap
	 */
	showContours?: boolean;

	/**
	 * Whether to show a grid on the heightmap
	 */
	showGrid?: boolean;

	/**
	 * Whether to show walls behind the chart
	 */
	showWalls?: boolean;

	/**
	 * How much spacing there is between grid lines
	 */
	gridSize?: number | [number, number];

	/**
	 * Whether to show a flattened heightmap on the floor
	 */
	showFloor?: boolean;

	/**
	 * Whether to show a flattened heightmap on the ceiling
	 */
	showCeiling?: boolean;

	/**
	 * Configuration for drawing the Axis markers and labels
	 */
	axes?: {
		x?: AxisOptions;
		y?: AxisOptions;
		z?: AxisOptions;
	};
}

/**
 * Anything that can be drawn inside the chart
 */
export interface ChartElement {
	update?(gl: WebGLRenderingContext): void;
	draw?(gl: WebGLRenderingContext, camera: Camera): void;
	hidden?: boolean;
}

const DEFAULT_COLORS: RGB[] = [
	[0.5, 0.0, 0.0],
	[1.0, 0.0, 0.0],
	[1.0, 1.0, 0.0],
	[0.0, 1.0, 0.0],
	[0.0, 1.0, 1.0],
	[0.0, 0.0, 1.0],
	[1.0, 0.0, 1.0],
	[0.5, 0.0, 0.5],
	[0.0, 0.0, 0.0],
];

/**
 * The main Chart class.
 */
export class Chart {
	private _data: ArrayLike<number>;
	private _dataWidth: number;
	private _canvas: HTMLCanvasElement;
	private _container: HTMLElement;
	private _gl: WebGLRenderingContext;
	private _elements: ChartElement[] = [];
	private _resizeObserver: ResizeObserver;
	private _mouseEnabled = true;
	private _region: Rect = [0, 0, 0, 0];
	private _gridSize = [5.0, 5.0];
	private _dataRange = [0.0, 1.0];
	private _resolution = 128;
	private _heightmap: Heightmap;
	private _showContours = false;
	private _showGrid = false;
	private _showWalls = false;
	private _width = 1.0;
	private _height = 1.0;
	private _depth = 1.0;
	private _showFloor = false;
	private _showCeiling = false;
	gradient: Gradient;
	camera = new Camera({ rotation: [Math.PI / 4, -Math.PI / 6], distance: 2 });

	constructor(options?: ChartOptions) {
		this._canvas = document.createElement('canvas');
		if ('length' in options?.data) {
			this.data = options.data;
		} else if (options?.data instanceof HTMLImageElement) {
			this.dataImage = options.data;
			if (!options.dataRange) {
				this._dataRange = [0, 255];
			}
		}

		if (options?.dataWidth) {
			this._dataWidth = options.dataWidth;
		}

		if (options?.dataRange) {
			this._dataRange = [...options.dataRange];
		}

		if (options?.width) {
			this._width = options.width;
		}

		if (options?.height) {
			this._height = options.height;
		}

		if (options?.depth) {
			this._depth = options.depth;
		}

		if (options?.region) {
			this._region = [...options.region];
		} else if ('length' in options?.data && options?.dataWidth) {
			this._region = [0, 0, options.dataWidth, options.data.length / options.dataWidth];
		}

		if (options?.gradient) {
			if (options.gradient instanceof Gradient) {
				this.gradient = options.gradient;
			} else {
				this.gradient = new Gradient(options.gradient);
			}
		} else {
			this.gradient = new Gradient(DEFAULT_COLORS, true);
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

		if (options?.showWalls) {
			this._showWalls = options.showWalls;
		}

		if (options?.showFloor) {
			this._showFloor = options.showFloor;
		}

		if (options?.showCeiling) {
			this._showCeiling = options.showCeiling;
		}

		if (options?.gridSize) {
			if (typeof options.gridSize === 'number') {
				this._gridSize = [options.gridSize, options.gridSize];
			} else {
				this._gridSize = [...options.gridSize];
			}
		}

		const scale = Matrix4.scaling(this._width, this._height, this._depth);
		// Heightmap visualisation
		const heightmap = new Heightmap(this, this._resolution);
		heightmap.transform = scale.multiply(Matrix4.rotation(-Math.PI / 2, 0, 0));
		this._elements.push(heightmap);
		this._heightmap = heightmap;

		// Walls
		const walls = new Walls(this);
		walls.transform = scale.clone();
		walls.hidden = !this._showWalls;
		this._elements.push(walls);

		// X axis
		this._elements.push(
			new AxisMarkers(
				this,
				Axis.X,
				LabelAnchor.RIGHT,
				scale.multiply(Matrix4.translation(0.0, options?.axes?.x?.position || 0, 0.02)),
				options?.axes?.x?.range
			)
		);
		this._elements.push(
			new AxisMarkers(
				this,
				Axis.X,
				LabelAnchor.LEFT,
				scale.multiply(Matrix4.translation(0.0, options?.axes?.x?.position || 0, -1.02)),
				options?.axes?.x?.range
			)
		);

		// Z axis (forward)
		this._elements.push(
			new AxisMarkers(
				this,
				Axis.Z,
				LabelAnchor.RIGHT,
				scale
					.multiply(Matrix4.rotation(0, -Math.PI / 2, 0))
					.multiply(Matrix4.translation(0.0, options?.axes?.z?.position || 0, 0.02)),
				options?.axes?.z?.range
			)
		);
		this._elements.push(
			new AxisMarkers(
				this,
				Axis.Z,
				LabelAnchor.LEFT,
				scale
					.multiply(Matrix4.rotation(0, -Math.PI / 2, 0))
					.multiply(Matrix4.translation(0.0, options?.axes?.z?.position || 0, -1.02)),
				options?.axes?.z?.range
			)
		);

		// Y axis (up)
		this._elements.push(
			new AxisMarkers(
				this,
				Axis.Y,
				LabelAnchor.RIGHT,
				scale.multiply(Matrix4.rotation(0, 0, -Math.PI / 2)).multiply(Matrix4.translation(0.0, 0.0, 0.02)),
				options?.axes?.y?.range
			)
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

	get data(): ArrayLike<number> {
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

	get showWalls(): boolean {
		return this._showWalls;
	}

	set showWalls(showWalls: boolean) {
		this._showWalls = showWalls;
		for (let el of this._elements) {
			if (el instanceof Walls) {
				el.hidden = !this._showWalls;
			}
		}
		this.draw();
	}

	get showFloor(): boolean {
		return this._showFloor;
	}

	set showFloor(showFloor: boolean) {
		this._showFloor = showFloor;
		this.draw();
	}

	get showCeiling(): boolean {
		return this._showCeiling;
	}

	set showCeiling(showCeiling: boolean) {
		this._showCeiling = showCeiling;
		this.draw();
	}

	set region(rect: Rect) {
		this._region = [...rect];
		this.update();
		this.draw();
	}

	set data(newData: ArrayLike<number>) {
		this._data = newData;
		this.update();
		this.draw();
	}

	set dataImage(img: HTMLImageElement) {
		const loaded = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			const imgData = ctx.getImageData(0, 0, img.width, img.height);

			// Average RGB together
			const pixels = imgData.data;
			const data = new Uint8ClampedArray(pixels.length / 4);
			for (let i = 0; i < pixels.length; i += 4) {
				const z = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
				data[i / 4] = z;
			}
			this._data = data;

			this._dataWidth = imgData.width;
			if (this._region[2] === 0 && this._region[3] === 0) {
				this._region[2] = imgData.width;
				this._region[3] = imgData.height;
			}
			this.update();
			this.draw();
		};
		if (img.complete) {
			loaded();
		} else {
			img.addEventListener('load', loaded);
		}
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
		if (this._data) {
			return this._data.length / this._dataWidth;
		} else {
			return 0;
		}
	}

	get gridSize(): [number, number] {
		return [this._gridSize[0], this._gridSize[1]];
	}

	get dataRange(): [number, number] {
		return this._dataRange.slice() as [number, number];
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

		// Enable 32bit index buffers
		gl.getExtension('OES_element_index_uint');

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

		if (e.buttons & 1) {
			// Left drag
			this.camera.rotate(x, y);
		} else if (e.buttons & 4) {
			// Middle drag
			this.camera.distance *= 1.0 + y;
			if (this.camera.distance < 1) {
				this.camera.distance = 1;
			} else if (this.camera.distance > 8) {
				this.camera.distance = 8;
			}
		}
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
			if (element.hidden) continue;
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
