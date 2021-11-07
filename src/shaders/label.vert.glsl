uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform bool u_orthgraphic;

attribute vec3 position;
attribute vec2 offset;
attribute vec2 uv;

varying vec2 v_uv;

void main(void) {
	mat4 mv = u_model * u_view;
	mat4 mvp = mv * u_projection;
	v_uv = uv;
	if (u_orthgraphic) {
		vec4 pos = vec4(position, 1.0) * mvp;
		pos.xy += offset * pos.w;
		gl_Position = pos;
	}
	else {
		vec4 center = vec4(vec3(0.0), 1.0) * mv;
		float scale = length(center);
		vec4 pos = vec4(position * scale, 1.0) * mvp;
		gl_Position = pos;
	}
}

