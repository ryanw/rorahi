import { Chart, Camera } from 'rorahi';
import SimplexNoise from './simplex-noise';

const SIZE = 128;
function main() {
	const data = generateData(0, 0, SIZE, SIZE);
	console.debug("DATA", data);
	const chart = new Chart({
		data,
		dataWidth: SIZE,
		origin: [0, 0, 0],
		resolution: 64,
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
		gradient: [
			[1.0, 0.0, 0.0],
			[1.0, 0.5, 0.0],
			[1.0, 1.0, 0.0],
			[0.0, 1.0, 0.0],
			[0.0, 1.0, 1.0],
			[0.0, 0.5, 1.0],
			[0.0, 0.0, 1.0],
			[0.5, 0.0, 1.0],
			[1.0, 0.0, 1.0],
		],
	});
	chart.attach('#example-graph');

	const camera: Camera = chart.camera;
	camera.distance = 2;
	camera.rotate(0, -Math.PI * 0.2);
	camera.rotate(Math.PI * 0.1, 0);
	let dt = 0;
	let start = performance.now();
	let end = performance.now();
	function animate() {
		chart.draw();
		end = performance.now();
		chart.data = generateData(0, 0, SIZE, SIZE, performance.now() / 14000);
		window.requestAnimationFrame(animate);
		dt = (end - start) / 1000;
		start = end;
	}
	animate();
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
		let n = simplex.noise3D(x / scale, y / scale, t);
		n *= 1.0 - simplex2.noise3D(x / scale * 2, y / scale * 2, t) / 2;

		return n * 0.5 + 0.5;
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
