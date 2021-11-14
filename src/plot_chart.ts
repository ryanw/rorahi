import { SpherePlot } from './elements/sphere_plot';
import { Walls } from './elements/walls';
import { AxisOptions } from './elements/axis_markers_collection';
import { Chart } from './chart';

export type Point = [number, number, number];

export interface PlotChartOptions<T> {
	/**
	 * The data used to plot the points
	 */
	data?: Array<T>;

	/**
	 * Callback to return the 3D position of a specific data value
	 */
	read?: (value: T, index: number) => Point;

	/**
	 * The minimum and maximum values found inside `data`. Used to
	 * control how high and low the heightmap goes.
	 */
	dataRange?: [number, number];

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
	 * Whether to show walls behind the chart
	 */
	showWalls?: boolean;

	/**
	 * Configuration for drawing the Axis markers and labels
	 */
	axes?: {
		x?: AxisOptions;
		y?: AxisOptions;
		z?: AxisOptions;
	};
}

export class PlotChart<T> extends Chart {
	private _plotData: Array<T>;
	private _read: (value: T, index: number) => Point;
	protected _showWalls = false;

	positions(): Array<Point> {
		return this._plotData.map(this._read);
	}

	constructor(options?: PlotChartOptions<T>) {
		super();

		const { data = [], read = () => null } = options;
		this._plotData = data;
		this._read = read;

		if (options?.showWalls) {
			this._showWalls = options.showWalls;
		}

		this.initElements();
	}

	private initElements() {
		const plots = new SpherePlot(this);
		this._elements.push(plots);
		this.initWalls();
	}

	private initWalls() {
		const walls = new Walls({ intervalCount: 5 });
		walls.transform = this.scaleMatrix;
		walls.hidden = !this._showWalls;
		this._elements.push(walls);
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
}
