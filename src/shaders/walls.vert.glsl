uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

attribute vec3 position;
attribute vec3 barycentric;

varying vec3 v_barycentric;
varying vec2 v_uv;

void main(void) {
	mat4 mvp = u_model * u_view * u_projection;
	gl_Position = vec4(position, 1.0) * mvp;
	v_uv = vec2(position.x, position.y + 0.5);
	v_barycentric = barycentric;
}
