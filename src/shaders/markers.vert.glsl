uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

attribute vec3 position;

varying vec2 v_uv;
varying float v_length;

void main(void) {
	mat4 mvp = u_model * u_view * u_projection;
	gl_Position = vec4(position, 1.0) * mvp;
	v_uv = vec2(position.x, position.z);
	v_length = position.x + 0.5;
}

