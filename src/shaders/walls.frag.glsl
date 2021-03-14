#extension GL_OES_standard_derivatives : enable

precision highp float;
uniform int u_intervalCount;

varying vec3 v_barycentric;
varying vec2 v_uv;

vec3 faceColor = vec3(1.0);
vec3 lineColor = vec3(0.6);

float contourPixel(float uv) {
	uv *= float(u_intervalCount);
	float line = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);

	return 1.0 - min(line, 1.0);
}

float edgePixel(vec3 uv) {
	vec3 grid = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
	float line = min(min(grid.x, grid.y), grid.z);

	return 1.0 - min(line, 1.0);
}

void main(void) {
	vec3 color = faceColor;
	color = mix(color, lineColor, contourPixel(v_uv.y));
	color = mix(color, lineColor, edgePixel(v_barycentric));
	gl_FragColor = vec4(color, 1.0);
}
