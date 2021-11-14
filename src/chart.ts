import { Matrix4, Point2, Point3 } from './geom';
import { Camera } from './camera';

type ExtWheelEvent = WheelEvent & { wheelDelta: number; axis: number; HORIZONTAL_AXIS: 0x01; VERTICAL_AXIS: 0x02 };

/**
 * Anything that can be drawn inside the chart
 */
export interface ChartElement {
	update?(gl: WebGLRenderingContext): void;
	draw?(gl: WebGLRenderingContext, camera: Camera): void;
	hidden?: boolean;
}

/**
 * The base Chart class.
 */
export class Chart {
	protected _canvas: HTMLCanvasElement;
	protected _container: HTMLElement;
	protected _gl: WebGLRenderingContext;
	protected _elements: ChartElement[] = [];
	protected _resizeObserver: ResizeObserver;
	protected _mouseEnabled = true;
	protected _width = 1.0;
	protected _height = 1.0;
	protected _depth = 1.0;
	public camera = new Camera({ rotation: [Math.PI / 4, -Math.PI / 6], distance: 3 });

	constructor() {
		this._canvas = document.createElement('canvas');
	}

	get scaleMatrix(): Matrix4 {
		return Matrix4.scaling(this._width, this._height, this._depth);
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

	addElement(el: ChartElement) {
		this._elements.push(el);
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
