#extension GL_OES_standard_derivatives : enable

precision highp float;
uniform int u_intervalCount;

varying vec3 v_barycentric;
varying vec2 v_uv;

vec3 faceColor = vec3(1.0);
vec3 lineColor = vec3(0.6);

float edgeDistance(vec3 barycentric) {
	vec3 d = fwidth(barycentric);
	vec3 a = smoothstep(vec3(0.0), d * 2.0, barycentric);
	return min(min(a.x, a.y), a.z);
}

void main(void) {
	float div = float(u_intervalCount);
	float lineWidth = 0.02;
	float d = edgeDistance(v_barycentric);
	vec3 color = faceColor;
	if (d < 1.0) {
		color = mix(lineColor, faceColor, d);
	}

	float seg = cos(v_uv.y * div * 3.14 * 2.);
	seg = smoothstep(1.0 - lineWidth, 1.0, seg);
	color = mix(color, lineColor, seg);

	gl_FragColor = vec4(color, 1.0);
}
