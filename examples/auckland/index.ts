import { Chart, Gradient } from 'rorahi';

const COLORS = new Gradient([
	[1.000, 1.000, 1.000],
	[0.996, 0.996, 0.996],
	[0.619, 0.568, 0.537],
	[0.470, 0.113, 0.043],
	[0.584, 0.054, 0.039],
	[0.996, 0.760, 0.152],
	[0.992, 0.996, 0.682],
	[0.419, 0.988, 0.043],
	[0.215, 0.635, 0.011],
	[0.192, 0.427, 0.058],

	[0.564, 0.737, 0.870],
	[0.478, 0.678, 0.854],
	[0.396, 0.627, 0.854],
	[0.396, 0.627, 0.854],
	[0.290, 0.513, 0.800],
	[0.278, 0.333, 0.678],
	[0.278, 0.333, 0.678],
], true);


function main() {
	const elevation = new Image();
	elevation.src = 'elevation.png';

	const chart = new Chart({
		data: elevation,
		height: 0.2,
		resolution: 512,
		gradient: COLORS,
		showContours: true,
	});
	chart.attach('#example-graph');
}


window.addEventListener('DOMContentLoaded', main);
