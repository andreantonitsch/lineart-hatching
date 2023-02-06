#include  <common>

varying vec2 vUv;
varying vec3 view_normal; 
// inverse of transpose of upper33 martix of modelview matrix
// threejs uniform
uniform mat3 normalMatrix;

void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    view_normal = projectionMatrix * vec4(normalMatrix * normal, 0.0);
    vUv = uv;
}
