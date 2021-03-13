#extension GL_OES_standard_derivatives : enable

precision highp float;

uniform sampler2D u_heights;
uniform int u_intervalCount;
uniform vec3 u_intervals[64];
uniform bool u_flat;
uniform vec2 u_gridSize;
uniform vec2 u_gridOffset;

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

float heightPixel(float uv) {
	uv *= float(u_intervalCount);
	float line = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);

	return 1.0 - min(line, 1.0);
}

void main(void) {
	// Vertical color gradient
	int interval = int(v_height / (1.0 / float(u_intervalCount)));
	vec3 color = vec3(1.0, 0.0, 0.0);
	for (int i = 0; i < 64; i++) {
		if (i == interval) {
			color = u_intervals[i];
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
	color = mix(color, lineColor, heightPixel(v_height) * heightLineOpacity);
	color = mix(color, lineColor, gridPixel(v_uv) * gridLineOpacity);

	// Color magic
	color = sqrt(color);
	gl_FragColor = vec4(color, 1.0);
}

