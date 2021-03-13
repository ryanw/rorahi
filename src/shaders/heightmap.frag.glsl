#extension GL_OES_standard_derivatives : enable

precision highp float;

uniform sampler2D u_heights;
uniform int u_intervalCount;
uniform vec3 u_intervals[64];
uniform bool u_flat;
uniform vec2 u_gridSize;
uniform vec2 u_gridOffset;
uniform bool u_smoothGradient;

varying vec2 v_uv;
varying float v_height;

vec3 lineColor = vec3(0.0);
float heightLineOpacity = 0.66;
float gridLineOpacity = 0.33;

float gridPixel(vec2 uv) {
	uv /= u_gridSize;
	uv += u_gridOffset;
	vec2 grid = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
	float line = min(grid.x, grid.y);

	return 1.0 - min(line, 1.0);
}

float contourPixel(float uv) {
	uv *= float(u_intervalCount);
	float line = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);

	return 1.0 - min(line, 1.0);
}

void main(void) {
	vec3 color = vec3(1.0, 0.0, 1.0);

	// Vertical color gradient
	if (u_smoothGradient) {
		float idx = v_height / (1.0 / float(u_intervalCount)) - 0.5;
		int b = int(ceil(idx));
		int t = int(floor(idx));
		// Exact colour
		if (b == t) {
			int interval = int(idx);
			for (int i = 0; i < 64; i++) {
				if (i == interval) {
					color = u_intervals[i];
				}
			}
		}
		else {
			vec3 topColor = vec3(0.0);
			vec3 bottomColor = vec3(0.0);
			for (int i = 0; i < 64; i++) {
				if (i == t) {
					topColor = u_intervals[i];
				}
				if (i == b) {
					bottomColor = u_intervals[i];
				}
			}

			color = mix(topColor, bottomColor, fract(idx));
		}
	} else {
		int interval = int(v_height / (1.0 / float(u_intervalCount)));
		for (int i = 0; i < 64; i++) {
			if (i == interval) {
				color = u_intervals[i];
			}
		}
	}

	if (!u_flat) {
		// Add lighting to 3D surface
		float area = 0.05;
		float l = texture2D(u_heights, vec2(v_uv.x - area, v_uv.y)).x;
		float r = texture2D(u_heights, vec2(v_uv.x + area, v_uv.y)).x;
		float b = texture2D(u_heights, vec2(v_uv.x, v_uv.y - area)).y;
		float t = texture2D(u_heights, vec2(v_uv.x, v_uv.y + area)).y;
		vec3 normal = normalize(vec3(
			(l - r) / (2. * area),
			(t - b) / (2. * area),
			1.0
		));

		vec3 lightDir = normalize(vec3(0.4, 0.7, 1.0));
		float ambient = 0.08;
		float light = max(0.0, dot(normal, lightDir)) + ambient;
		color *= light;
	}

	// Grid lines
	color = mix(color, lineColor, contourPixel(v_height) * heightLineOpacity);
	color = mix(color, lineColor, gridPixel(v_uv) * gridLineOpacity);

	// Color magic
	color = sqrt(color);
	gl_FragColor = vec4(color, 1.0);
}

