import { SurfaceChart, Gradient } from 'rorahi';
import SimplexNoise from '../simplex-noise';

function hexToColor(hex: string): [number, number, number] {
	const matches = hex.match(/#(..)(..)(..)/);
	const r = matches[1];
	const g = matches[2];
	const b = matches[3];
	return [parseInt(r, 16) / 255, parseInt(g, 16) / 255, parseInt(b, 16) / 255];
}

const SIZE = 200;
function main() {
	const qs = document.querySelector.bind(document);
	const width = parseFloat((qs('#x-scale') as HTMLInputElement).value);
	const height = parseFloat((qs('#y-scale') as HTMLInputElement).value);
	const xOffset = parseFloat((qs('#x-offset') as HTMLInputElement).value);
	const yOffset = parseFloat((qs('#y-offset') as HTMLInputElement).value);
	const resolution = parseFloat((qs('#resolution') as HTMLInputElement).value);
	const smooth = (qs('#smooth') as HTMLInputElement).checked;
	const showContours = (qs('#contours') as HTMLInputElement).checked;
	const showGrid = (qs('#grid') as HTMLInputElement).checked;
	const showWalls = (qs('#walls') as HTMLInputElement).checked;
	const showFloor = (qs('#floor') as HTMLInputElement).checked;
	const showCeiling = (qs('#ceiling') as HTMLInputElement).checked;

	const colorInputs = Array.from(document.querySelectorAll('.gradient input[type="color"]')) as HTMLInputElement[];
	const colors = colorInputs.map((input) => hexToColor(input.value));

	const data = generateData(0, 0, SIZE, SIZE, 1.0);
	const chart = new SurfaceChart({
		data,
		dataWidth: SIZE,
		dataRange: [0.0, 1.0],
		resolution,
		region: [xOffset, yOffset, width, height],
		showContours,
		showGrid,
		showWalls,
		showFloor,
		showCeiling,
		gridSize: [10, 10],
		axes: {
			x: {
				label: 'Some Values',
				range: [100, 1000],
				position: 0.0,
				tickFontColor: hexToColor('#0000ff'),
			},
			y: {
				label: 'How big',
				range: [40, 1000],
				position: 1.0,
				tickFontColor: [1.0, 0.0, 0.0],
			},
			z: {
				label: 'Thingies',
				range: [-100, 100],
				position: 0.0,
				tickFontColor: [0.0, 0.4, 0.0],
			},
		},
		gradient: new Gradient(colors, smooth),
	});
	chart.attach('#example-graph');

	// Time adjustment
	qs('#time-range').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.data = generateData(0, 0, SIZE, SIZE, value);
	});

	qs('#x-scale').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.xScale = value;
	});

	qs('#y-scale').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.yScale = value;
	});

	qs('#x-offset').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.xOffset = value;
	});

	qs('#y-offset').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.yOffset = value;
	});

	qs('#resolution').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.resolution = value;
	});

	qs('#smooth').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.gradient.smooth = value;
		chart.draw();
	});

	qs('#contours').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.showContours = value;
	});

	qs('#grid').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.showGrid = value;
	});

	qs('#walls').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.showWalls = value;
	});

	qs('#floor').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.showFloor = value;
	});

	qs('#ceiling').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.showCeiling = value;
	});

	for (const input of colorInputs) {
		input.addEventListener('input', () => {
			const colors = colorInputs.map((input) => hexToColor(input.value));
			chart.gradient = new Gradient(colors, chart.gradient.smooth);
			chart.draw();
		});
	}
}

const seed1 = Math.random().toString();
const seed2 = Math.random().toString();
/**
 * Generate some random noise
 */
function generateData(startX: number, startY: number, width: number, height: number, t: number = 0): Float32Array {
	const data = new Float32Array(width * height);
	const simplex = new SimplexNoise(seed1);
	const simplex2 = new SimplexNoise(seed2);

	const scale = 40;
	function noise(x: number, y: number): number {
		let n = simplex.noise3D(x / scale, y / scale, t) * 1.5;
		n *= 1.0 - simplex2.noise3D((x / scale) * 2, (y / scale) * 2, t) / 3;

		return n * 0.3 + 0.5;
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = x + y * width;
			data[i] = noise(x + startX, y + startY);
		}
	}

	return data;
}

window.addEventListener('DOMContentLoaded', main);
