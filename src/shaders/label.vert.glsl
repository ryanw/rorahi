uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform bool u_orthgraphic;

attribute vec3 position;
attribute vec2 offset;
attribute vec2 uv;

varying vec2 v_uv;

void main(void) {
	v_uv = uv;
	if (u_orthgraphic) {
		mat4 mvp = u_model * u_view * u_projection;
		vec4 pos4 = vec4(position, 1.0) * mvp;
		vec3 pos3 = pos4.xyz / pos4.w;
		pos3.x += offset.x;
		pos3.y += offset.y;
		gl_Position = vec4(pos3, 1.0);
	}
	else {
		mat4 mvp = u_model * u_view * u_projection;
		vec4 pos = vec4(position, 1.0) * mvp;
		gl_Position = pos;
	}
}

