import { Chart } from './chart';
import { Matrix4, Rect } from './geom';
import { Heightmap } from './elements/heightmap';
import { Walls } from './elements/walls';
import { AxisMarkersCollection, AxisOptions } from './elements/axis_markers_collection';
import { RGB } from './color';
import { Gradient } from './gradient';

/**
 * Configuration options for the {@link SurfaceChart}.
 */
export interface SurfaceChartOptions {
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
export class SurfaceChart extends Chart {
	protected _data: ArrayLike<number>;
	protected _dataWidth: number;
	protected _region: Rect = [0, 0, 0, 0];
	protected _gridSize = [5.0, 5.0];
	protected _dataRange = [0.0, 1.0];
	protected _resolution = 128;
	protected _heightmap: Heightmap;
	protected _showContours = false;
	protected _showGrid = false;
	protected _showWalls = false;
	protected _showFloor = false;
	protected _showCeiling = false;
	public gradient: Gradient;

	constructor(options?: SurfaceChartOptions) {
		super();

		if (options?.data && 'length' in options.data) {
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
		} else if (options?.data && options?.dataWidth && 'length' in options.data) {
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

		this.initElements(options);
	}

	private initElements(options?: SurfaceChartOptions) {
		this.initHeightmap();
		this.initWalls();
		this.initAxisMarkers(options);
	}

	private initHeightmap() {
		const scale = this.scaleMatrix;
		const heightmap = new Heightmap(this, this._resolution);
		heightmap.transform = scale.multiply(Matrix4.rotation(-Math.PI / 2, 0, 0));
		this._elements.push(heightmap);
		this._heightmap = heightmap;
	}

	private initWalls() {
		const walls = new Walls({ intervalCount: this.gradient.colors.length });
		walls.transform = this.scaleMatrix;
		walls.hidden = !this._showWalls;
		this._elements.push(walls);
	}

	private initAxisMarkers(options?: SurfaceChartOptions) {
		const markers = new AxisMarkersCollection(this, { axes: options?.axes });
		this._elements.push(markers);
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
}
