import { Chart, Gradient } from 'rorahi';

const COLORS = new Gradient([
	[0.8, 0.8, 0.8],
	[0.7, 0.6, 0.6],
	[0.5, 0.3, 0.2],
	[0.9, 0.7, 0.4],
	[0.6, 0.7, 0.4],
	[0.3, 0.5, 0.1],
	[0.5, 0.6, 0.4],
	[0.3, 0.4, 0.2],
	[0.5, 0.6, 0.5],
	[0.4, 0.8, 0.9],
	[0.2, 0.6, 0.9],
	[0.2, 0.6, 0.9],
	[0.1, 0.5, 0.9],
	[0.1, 0.5, 0.9],
], true);

function main() {
	const elevation = new Image();
	elevation.src = 'elevation.png';

	const chart = new Chart({
		data: elevation,
		height: 0.25,
		resolution: 1024,
		gradient: COLORS,
		showContours: true,
	});
	chart.attach('#example-graph');
}


window.addEventListener('DOMContentLoaded', main);
