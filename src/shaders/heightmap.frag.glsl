#extension GL_OES_standard_derivatives : enable

precision highp float;

uniform sampler2D u_heights;
uniform int u_intervalCount;
uniform vec3 u_intervals[64];
uniform bool u_flat;

varying vec2 v_uv;
varying float v_height;

vec3 lineColor = vec3(0.0);
float lineOpacity = 0.6;
float lineWidth = 0.02;
float gridSize = 32.0;

void main(void) {
	float pixelSize = length(fwidth(gl_FragCoord.xyz));
	lineWidth = pixelSize * lineWidth;

	float div = float(u_intervalCount);
	float seg = cos(v_height * div * 3.14 * 2.);
	seg = smoothstep(1.0 - lineWidth, 1.0, seg);

	int interval = int(v_height / (1.0 / div) - lineWidth * 0.75);
	vec3 color = vec3(0.0);
	for (int i = 0; i < 64; i++) {
		if (i == interval) {
			color = u_intervals[i];
		}
	}

	if (!u_flat) {
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
	color = mix(color, lineColor, seg * lineOpacity);
	color = sqrt(color);


	vec2 uv = fract(v_uv * gridSize) + 0.5;
	float gridLineWidth = u_flat ? 0.1 : 0.05;
	float l = 0.5 - gridLineWidth;
	float r = 0.5 + gridLineWidth;
	if ((uv.x > l && uv.x < r) || (uv.y > l && uv.y < r)) {
		color = mix(color, lineColor, 0.15);
	}
	gl_FragColor = vec4(color, 1.0);
}
