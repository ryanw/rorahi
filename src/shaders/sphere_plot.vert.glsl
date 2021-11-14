uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

attribute vec3 position;
attribute vec3 instancePosition;
attribute vec3 instanceColor;
attribute float instanceSize;

varying vec3 v_normal;
varying vec3 v_color;

mat4 translate(vec3 amount) {
	return mat4(
		vec4(1.0, 0.0, 0.0, amount.x),
		vec4(0.0, 1.0, 0.0, amount.y),
		vec4(0.0, 0.0, 1.0, amount.z),
		vec4(0.0, 0.0, 0.0, 1.0)
	);
}

mat4 scale(float amount) {
	return mat4(
		vec4(amount, 0.0, 0.0, 0.0),
		vec4(0.0, amount, 0.0, 0.0),
		vec4(0.0, 0.0, amount, 0.0),
		vec4(0.0, 0.0, 0.0, 1.0)
	);
}

void main(void) {
	mat4 mvp =  u_model * scale(instanceSize) * translate(instancePosition) * u_view * u_projection;
	gl_Position = vec4(position, 1.0) * mvp;
	v_normal = normalize(position);
	v_color = instanceColor;
}
