#extension GL_OES_standard_derivatives : enable

precision highp float;
uniform float u_gridSize;
uniform float u_gridOffset;

varying vec2 v_uv;
varying float v_length;

vec4 faceColor = vec4(0.0);
vec4 lineColor = vec4(0.0, 0.0, 0.0, 1.0);

float tickPixel(float uv) {
	uv /= u_gridSize;
	uv += u_gridOffset;
	float line = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);

	return 1.0 - min(line, 1.0);
}

void main(void) {
	vec4 color = faceColor;
	color = mix(color, lineColor, tickPixel(v_length));
	gl_FragColor = color;
}
