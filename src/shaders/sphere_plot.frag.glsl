precision highp float;

varying vec3 v_normal;
varying vec3 v_color;

void main(void) {
	vec3 color = v_color;
	vec3 lightDir = normalize(vec3(0.4, 0.7, 1.0));
	float ambient = 0.2;
	float light = max(0.0, dot(v_normal, lightDir)) + ambient;
	color *= light;
	gl_FragColor = vec4(color, 1.0);
}
