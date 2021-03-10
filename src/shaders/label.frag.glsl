#extension GL_OES_standard_derivatives : enable

precision highp float;

uniform sampler2D u_texture;

varying vec2 v_uv;

void main(void) {
	vec4 color = texture2D(u_texture, v_uv);
	gl_FragColor = color;
}
