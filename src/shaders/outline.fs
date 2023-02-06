#include <packing>

layout(location = 0) out vec4 diffuseColor;

uniform sampler2D tDepth;
uniform sampler2D tDiffuse;
uniform sampler2D tNormal;

uniform float cameraNear;
uniform float cameraFar;

varying vec2 vUv;

float getDepth( sampler2D tex, const in vec2 screenPosition ) 
{
    #if DEPTH_PACKING == 1
       return unpackRGBAToDepth( texture2D( tex, screenPosition ) );
    #else
        return texture2D( tex, screenPosition ).x;
    #endif
}

float getViewZ( const in float depth ) 
{
	#if PERSPECTIVE_CAMERA == 1
	   return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
	#else
	    return orthographicDepthToViewZ( depth, cameraNear, cameraFar );
	#endif
}

float readDepth( sampler2D depthSampler, vec2 coord ) {
                float fragCoordZ = texture2D( depthSampler, coord ).x;
                float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
                return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

float max2 (vec2 v) {
  return max (v.x, v.y);
}

float max3 (vec3 v) {
  return max (max (v.x, v.y), v.z);
}

float min3 (vec3 v) {
  return min (min (v.x, v.y), v.z);
}



vec2 get_derivs(const sampler2D tex, const vec2 offset, const vec2 position){
    vec2 derivs;
    vec3 center_color = texture2D(tex, position).xyz;
    derivs.x = max3(abs(texture2D(tex, position + offset * vec2(1.0, 0.0)).xyz - center_color));
    derivs.y = max3(abs(texture2D(tex, position + offset * vec2(0.0, 1.0)).xyz - center_color));
    
    return derivs  / offset;
}

uniform float uBorderWidth;

uniform float uDepthDerivMin;
uniform float uDepthDerivMax;

uniform float uDiffDerivMin;
uniform float uDiffDerivMax;

uniform float uNormalDerivMin;
uniform float uNormalDerivMax;

uniform vec3 uLightViewDir;

void main()
{
    ivec2 textureSize2d = textureSize(tDepth,0);
    float texel_size = 1.0 / float(textureSize2d.x);

    vec2 tex_offset = vec2(texel_size) * uBorderWidth;

    // // //Depth
    // vec2 derivs = get_derivs(tDepth, tex_offset, vUv);
    // float depth_edge = max2(smoothstep(uDepthDerivMin, uDepthDerivMax, derivs));

    // //Diffuse
    // vec2 derivs_diff = get_derivs(tDiffuse, tex_offset, vUv);
    // float diff_edge = max2(smoothstep(uDiffDerivMin, uDiffDerivMax, derivs_diff));

    // //Normal
    // vec2 normal_diff = get_derivs(tNormal, tex_offset,vUv);
    // float normal_edge = max2(smoothstep(uNormalDerivMin, uNormalDerivMax, normal_diff));

    // //Depth
    vec2 derivs = get_derivs(tDepth, tex_offset, vUv);
    float depth_edge = max2(smoothstep(uDepthDerivMin, uDepthDerivMax, derivs));

    //Diffuse
    vec3 diffuse = texture2D(tDiffuse, vUv).xyz;
    vec2 derivs_diff = vec2(max3(dFdx(diffuse)), max3(dFdy(diffuse)));
    float diff_edge = max2(smoothstep(uDiffDerivMin, uDiffDerivMax, derivs_diff));

    //Normal
    vec3 normal = texture2D(tNormal, vUv).xyz;
    float normal_ddx = dFdx(dot(normal, vec3(1.0, 0.0, 0.0)));
    float normal_ddy = dFdy(dot(normal, vec3(0.0, 1.0, 0.0)));
    float normal_edge = max2(
                          smoothstep(uNormalDerivMin,
                                    uNormalDerivMax,
                                     vec2(normal_ddx, normal_ddy)));


    float depth_normal_edge = max(depth_edge,normal_edge);

    //diffuseColor.xyz = vec3(max(depth_normal_edge,diff_edge), vec2(depth_normal_edge));
    diffuseColor.xyz = vec3(1.0 - max(depth_normal_edge,diff_edge));
    diffuseColor.a = 1.0;
    //diffuseColor = mix(vec4(1.0), diffuseColor, float(texture2D(tDepth, vUv).x < 0.9) );

}

