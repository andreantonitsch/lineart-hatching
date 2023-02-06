layout(location = 0) out vec4 diffuseColor;
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
    diffuseColor.xyz = view_normal;
    diffuseColor.a = 1.0;
}