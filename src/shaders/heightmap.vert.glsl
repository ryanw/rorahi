uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform sampler2D u_heights;
uniform bool u_flat;

attribute vec3 position;

varying vec2 v_uv;
varying float v_height;

void main(void) {
	mat4 mvp = u_model * u_view * u_projection;
	vec3 pos = position;
	v_uv = vec2(position.x, position.y) + 0.5;
	vec3 color = texture2D(u_heights, v_uv).rgb;
	if (!u_flat) {
		pos.z = color.r - 0.5;
	}
	v_height = color.r;
	gl_Position = vec4(pos, 1.0) * mvp;
}
