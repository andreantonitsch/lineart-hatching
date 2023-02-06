#include <packing>

layout(location = 0) out vec4 diffuseColor;

uniform sampler2D tDiffuse;
uniform sampler2D tNormal;
uniform sampler2D tUV;
uniform sampler2D tDepth;

varying vec2 vUv;


vec3 get_derivs(const sampler2D tex, const vec2 offset, const vec2 position){
    vec3 derivs;
    vec3 center_color = texture2D(tex, position).xyz;
    derivs = texture2D(tex, position + offset * vec2(1.0, 0.0)).xyz - center_color;
    //derivs.y = texture2D(tex, position + offset * vec2(0.0, 1.0)).xyz - center_color;
    
    return derivs;
}

uniform float uLineWidth;
uniform float uLineSpacing;
uniform float uDoubleLineThreshold;
uniform float uSingleLineThreshold;
uniform float uLightThreshold;

uniform vec4 uLightViewDir;

void main()
{
    ivec2 screen_size = textureSize(tDiffuse,0);
    float aspect = float(screen_size.y) / float( screen_size.x) ;
    float texel_size = 1.0 / float(screen_size.x);

    //diffuseColor.xyz = dFdx(texture2D(tNormal, vUv).xyz);
    //diffuseColor.xyz = vec3(norm_normal);
    //diffuseColor.xyz = vec3(1.0);
    diffuseColor.a = 1.0;

    //view space normal
    vec3 normal = normalize(texture2D(tNormal, vUv).xyz * 2.0 - vec3(1.0));
    vec3 light = normalize(uLightViewDir.xyz * 2.0 - vec3(1.0));

    float vert_line = step(uLineWidth, mod(vUv.x * uLineSpacing, 1.0));
    float hor_line = step(uLineWidth, mod(vUv.y * aspect *  uLineSpacing, 1.0));
    float line_pattern = 1.0 - max(vert_line, hor_line);
    //diffuseColor.xyz = vec3(line);

    float illumination =dot(normal, light);

    vec3 shadow = vec3(0.0);

    shadow = mix(shadow, vec3(line_pattern), step(uDoubleLineThreshold, illumination));
    shadow = mix(shadow, vec3(1.0 - vert_line), step(uSingleLineThreshold, illumination));
    shadow = mix(shadow, vec3(1.0), step(uLightThreshold, illumination));
    diffuseColor.xyz = min(texture2D(tDiffuse, vUv).xyz, shadow);
    diffuseColor = mix(vec4(1.0), diffuseColor, float(texture2D(tDepth, vUv).x < 1.0) );

}

