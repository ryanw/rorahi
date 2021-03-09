#extension GL_OES_standard_derivatives : enable

precision highp float;
uniform int u_tickCount;

varying vec2 v_uv;

vec3 faceColor = vec3(1.0);
vec3 lineColor = vec3(0.0);

void main(void) {
	vec3 color = faceColor;
	float divisions = float(u_tickCount);
	float thickness = 0.04;
	float delta = 0.05 / 2.0;

	float x = fract((v_uv.x + 0.497) * divisions);
	x = min(x, 1.0 - x);

	float xdelta = fwidth(x);
	x = smoothstep(x - xdelta, x + xdelta, thickness);

	float c = clamp(x, 0.0, 1.0);

	if (v_uv.y < 0.54) {
		gl_FragColor = vec4(lineColor, c);
	}
	else {
		gl_FragColor = vec4(0.0);
	}
}
