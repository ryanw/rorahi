import { PlotChart } from 'rorahi';

interface Plot {
	x: number;
	y: number;
	z: number;
	size: number;
	weight: number;
}

function randomPlot(): Plot {
	const plot = {
		x: (Math.random() * 20 - 10) | 0,
		y: (Math.random() * 20 - 10) | 0,
		z: 0,
		size: (Math.random() * 1000) | 0,
		weight: (Math.random() * 1000) | 0,
	};
	plot.z = plot.x * plot.y;
	return plot;
}

function generatePlots(count: number = 100): Plot[] {
	const data = new Array(count);
	for (let i = 0; i < count; i++) {
		data[i] = randomPlot();
	}
	return data;
}

function main() {
	const chart = new PlotChart({
		data: generatePlots(),
		read(p) {
			return [p.x / 20, p.z / 200, p.y / 20];
		},
		dataRange: [-100, 100],
		showWalls: true,
	});

	chart.attach('#example-graph');
}

window.addEventListener('DOMContentLoaded', main);
