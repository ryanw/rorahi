import { Chart, Gradient } from 'rorahi';

const SIZE = 100;
const SCALE = 0.2;

function generateData(t: number = 0): Float32Array {
	const data = new Float32Array(SIZE * SIZE);
	const o = SIZE / 2;
	for (let y = 0; y < SIZE; y++) {
		for (let x = 0; x < SIZE; x++) {
			const i = x + y * SIZE;
			const xo = x - o;
			const yo = y - o;
			const distance = Math.sqrt(xo * xo + yo * yo);
			const height = 1.0 - ((distance / SIZE) * Math.PI) / 2;
			data[i] = Math.sin(t + distance * SCALE) * height;
		}
	}
	return data;
}

function main() {
	const chart = new Chart({
		data: generateData(),
		dataWidth: SIZE,
		dataRange: [-1, 1],
		height: 0.5,
	});

	let t = 0;
	setInterval(() => {
		chart.data = generateData((t += 0.1));
	}, 1000 / 30);
	chart.attach('#example-graph');
}

window.addEventListener('DOMContentLoaded', main);
