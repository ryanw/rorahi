import { Chart, Gradient } from 'rorahi';
import SimplexNoise from '../simplex-noise';

function hexToColor(hex: string): [number, number, number] {
	const matches = hex.match(/#(..)(..)(..)/)
	const r = matches[1];
	const g = matches[2];
	const b = matches[3];
	return [
		parseInt(r, 16) / 255,
		parseInt(g, 16) / 255,
		parseInt(b, 16) / 255,
	];
}

const SIZE = 200;
function main() {
	const width = parseFloat((document.querySelector('#x-scale') as HTMLInputElement).value);
	const height = parseFloat((document.querySelector('#y-scale') as HTMLInputElement).value);
	const xOffset = parseFloat((document.querySelector('#x-offset') as HTMLInputElement).value);
	const yOffset = parseFloat((document.querySelector('#y-offset') as HTMLInputElement).value);
	const resolution = parseFloat((document.querySelector('#resolution') as HTMLInputElement).value);
	const smooth = (document.querySelector('#smooth') as HTMLInputElement).checked;
	const showContours = (document.querySelector('#contours') as HTMLInputElement).checked;
	const showGrid = (document.querySelector('#grid') as HTMLInputElement).checked;
	const showFloor = (document.querySelector('#floor') as HTMLInputElement).checked;
	const showCeiling = (document.querySelector('#ceiling') as HTMLInputElement).checked;

	const colorInputs = Array.from(document.querySelectorAll('.gradient input[type="color"]')) as HTMLInputElement[];
	const colors = colorInputs.map(input => hexToColor(input.value));

	const data = generateData(0, 0, SIZE, SIZE, 1.0);
	const chart = new Chart({
		data,
		dataWidth: SIZE,
		dataRange: [0.0, 1.0],
		resolution,
		region: [xOffset, yOffset, width, height],
		showContours,
		showGrid,
		showFloor,
		showCeiling,
		gridSize: [10, 20],
		axes: {
			x: {
				label: 'Foo',
				range: [10, 100],
			},
			y: {
				label: 'Bar',
				range: [40, 1000],
			},
			z: {
				label: 'Woop',
				range: [-100, 100],
			},
		},
		gradient: new Gradient(colors, smooth),
	});
	chart.attach('#example-graph');

	// Time adjustment
	document.querySelector('#time-range').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.data = generateData(0, 0, SIZE, SIZE, value);
	});

	document.querySelector('#x-scale').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.xScale = value;
	});

	document.querySelector('#y-scale').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.yScale = value;
	});

	document.querySelector('#x-offset').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.xOffset = value;
	});

	document.querySelector('#y-offset').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.yOffset = value;
	});

	document.querySelector('#resolution').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = parseFloat(el.value);
		chart.resolution = value;
	});

	document.querySelector('#smooth').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.gradient.smooth = value;
		chart.draw();
	});

	document.querySelector('#contours').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.showContours = value;
	});

	document.querySelector('#grid').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.showGrid = value;
	});

	document.querySelector('#floor').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.showFloor = value;
	});

	document.querySelector('#ceiling').addEventListener('input', (e: InputEvent) => {
		const el = e.target as HTMLInputElement;
		const value = el.checked;
		chart.showCeiling = value;
	});

	for (const input of colorInputs) {
		input.addEventListener('input', () => {
			const colors = colorInputs.map(input => hexToColor(input.value));
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
		n *= 1.0 - simplex2.noise3D(x / scale * 2, y / scale * 2, t) / 3;

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
