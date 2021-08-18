import { Chart, Gradient } from 'rorahi';

const COLORS = new Gradient(
	[
		[1.0, 1.0, 1.0],
		[0.996, 0.996, 0.996],
		[0.619, 0.568, 0.537],
		[0.47, 0.113, 0.043],
		[0.584, 0.054, 0.039],
		[0.996, 0.76, 0.152],
		[0.992, 0.996, 0.682],
		[0.419, 0.988, 0.043],
		[0.215, 0.635, 0.011],
		[0.192, 0.427, 0.058],

		[0.564, 0.737, 0.87],
		[0.478, 0.678, 0.854],
		[0.396, 0.627, 0.854],
		[0.396, 0.627, 0.854],
		[0.29, 0.513, 0.8],
		[0.278, 0.333, 0.678],
		[0.278, 0.333, 0.678],
	],
	true
);

function main() {
	const elevation = new Image();
	elevation.src = 'elevation.png';

	const chart = new Chart({
		data: elevation,
		height: 0.2,
		resolution: 512,
		gradient: COLORS,
		showContours: true,
		axes: {
			x: { position: 0.5 },
			z: { position: 0.5 },
		},
	});
	chart.attach('#example-graph');
}

window.addEventListener('DOMContentLoaded', main);
