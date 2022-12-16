import {
	BackSide,
	SphereGeometry,
	Mesh,
	ShaderMaterial,
	UniformsUtils,
	Vector3
} from 'three';

import * as THREE from 'three';

class Sky extends Mesh {
	constructor() {
		const shader = Sky.SkyShader;

		const material = new ShaderMaterial({
			fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
			uniforms: UniformsUtils.clone(shader.uniforms),
			side: BackSide,
      transparent: true,
			depthWrite: false
		});
		super(new SphereGeometry(8000, 32, 32), material);
	}
}

Sky.prototype.isSky = true;

Sky.SkyShader = {
	uniforms: {
		uTime: {
      value: 0
    },
    sunPosition: {
      value: new Vector3()
    },
    skyBoxRadius: {
      value: null
    },
    starTexture: {
      value: null
    },
    noiseTexture: {
      value: null
    },
    galaxyTexture: {
      value: null
    },
    noiseTexture2: {
      value: null
    },
    skyTexture: {
      value: null
    },
    flowMapTexture: {
      value: null
    },
	},

	vertexShader: `\
  ${THREE.ShaderChunk.common}
  ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    vWorldPosition = modelPosition.xyz;
    gl_Position = projectedPosition;
    ${THREE.ShaderChunk.logdepthbuf_vertex}
  }`,
 
	fragmentShader: `\
  ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform vec3 sunPosition;
  uniform sampler2D starTexture;
  uniform sampler2D noiseTexture;
  uniform sampler2D galaxyTexture;
  uniform sampler2D noiseTexture2;
  uniform sampler2D skydomeCloudTexture;
  uniform sampler2D flowMapTexture;
  uniform sampler2D skyTexture;
  
  uniform float skyBoxRadius;
  uniform float uTime;

  vec3 FlowUVW (vec2 uv, vec2 flowVector, float flowOffset, float t, bool flowB) {
    float phaseOffset = flowB ? 0.5 : 0.;
    float speed = 0.1;
    float time = t * speed;
    float strength = 0.02;

    float progress = fract(time + phaseOffset);
    vec3 uvw;
    uvw.xy = uv + flowVector * strength * (progress + flowOffset);
    // uvw.xy += (time - progress);
    uvw.z = 1. - abs(1. - 2. * progress);
    return uvw;
  }

  void main() {
    // //################################################## Sun light color ################################################## 
    float sunSize = 1000.;
    float sunInnerBound = 0.1;
    float sunOuterBound = 0.8;
    vec4 sunColor = vec4(1.0, 0.9, 0.8, 1.0);

    float sunDist = distance(vWorldPosition, sunPosition);
    float sunArea = 1. - sunDist / sunSize;
    sunArea = smoothstep(sunInnerBound, sunOuterBound, sunArea);
    vec3 fallSunColor = sunColor.rgb * 0.4;
    vec3 finalSunColor = mix(fallSunColor, sunColor.rgb, smoothstep(-0.03, 0.03, sunPosition.y)) * sunArea;

    //################################################## Sky color ################################################## 
    vec3 dayBottomColor = vec3(0.72, 0.82, 0.96);
    vec3 dayMidColor = vec3(0.35, 0.83, 0.95) * 0.6;
    vec3 dayTopColor = vec3(0.03, 0.43, 0.98) * 0.7;

    vec3 gradientDay = mix(dayBottomColor, dayMidColor, clamp(vUv.y, 0.0, 1.0)) * step(0.0, -vUv.y)
                       + mix(dayMidColor, dayTopColor, clamp(vUv.y, 0.0, 1.0)) * step(0.0, vUv.y);
   
    vec3 skyGradients = gradientDay;

    //################################################## Horizon Color ################################################## 
    float dayHorWidth = 0.53;
    float dayHorStrenth = 15.;

    vec3 dayHorColor = vec3(0.7, 0.7, 0.7);
    
    float horWidth = dayHorWidth;
    float horStrenth = dayHorStrenth;
    float horLineMask = smoothstep(-horWidth, 0., vUv.y) * smoothstep(-horWidth, 0., -vUv.y);
    vec3 horLineGradients = dayHorColor;
    vec3 finalSkyColor = skyGradients * (1. - horLineMask) + horLineGradients * horLineMask * horStrenth;

    //################################################## Galaxy color (add noise texture 2 times) ################################################## 
    vec4 galaxyColor1 = vec4(0.11, 0.38, 0.98, 1.0);
    vec4 galaxyColor = vec4(0.62, 0.11, 0.74, 1.0);

    vec4 galaxyNoiseTex = texture2D(
      noiseTexture2,
      vUv * 2.5 + uTime * 0.001
    );
    vec4 galaxy = texture2D(
      galaxyTexture,
      vec2(
        (vWorldPosition.x) * 0.00006 + (galaxyNoiseTex.r - 0.5) * 0.3,
        vWorldPosition.y * 0.00007 + (galaxyNoiseTex.g - 0.5) * 0.3
      )
    );
    vec4 finalGalaxyColor =  (galaxyColor * (-galaxy.r + galaxy.g) + galaxyColor1 * galaxy.r) * smoothstep(0., 0.2, 1. - galaxy.g);

    galaxyNoiseTex = texture2D(
      noiseTexture2,
      vec2(
        vUv.x * 2. + uTime * 0.002,
        vUv.y * 2. + uTime * 0.003
      )
    );
    galaxy = texture2D(
      galaxyTexture,
      vec2(
        (vWorldPosition.x) * 0.00006 + (galaxyNoiseTex.r - 0.5) * 0.3,
        vWorldPosition.y * 0.00007 + (galaxyNoiseTex.g - 0.5) * 0.3
      )
    );
    finalGalaxyColor +=  (galaxyColor * (-galaxy.r + galaxy.g) + galaxyColor1 * galaxy.r) * smoothstep(0., 0.3, 1. - galaxy.g);
    finalGalaxyColor *= 0.1;

    //################################################## Star color ################################################## 
    vec4 starTex = texture2D(
      starTexture, 
      vWorldPosition.xz * 0.0002
    );
    vec4 starNoiseTex = texture2D(
      noiseTexture,
      vec2(
        vUv.x * 5. + uTime * 0.01,
        vUv.y * 5. + uTime * 0.02
      )
    );
    
    float starPos = smoothstep(0.21, 0.31, starTex.r);
    float starBright = smoothstep(0.513, 0.9, starNoiseTex.a);
    starPos = vUv.y > 0.6 ? starPos : starPos * clamp(pow(vUv.y, 5.), 0., 1.0);
    float finalStarColor = starPos * starBright;
    finalStarColor = finalStarColor * finalGalaxyColor.b * 5. + finalStarColor * (1. - finalGalaxyColor.b) * 0.7;
    
    gl_FragColor.rgb += finalSunColor + finalSkyColor + (vec3(finalStarColor * 0.6) + finalGalaxyColor.rgb);
    gl_FragColor.a = 1.0;

    vec2 flowVector = texture2D(flowMapTexture, vUv).rg * 2. - 1.;
			
    float noise = texture2D(noiseTexture, vUv).r;
    float time = uTime + noise * 10.;
    float flowOffset = 0.;

    vec3 uvwA = FlowUVW(vUv, flowVector, flowOffset, time, false);
    vec3 uvwB = FlowUVW(vUv, flowVector, flowOffset, time, true);

    vec4 texA = texture2D(skyTexture, uvwA.xy) * uvwA.z;
    vec4 texB = texture2D(skyTexture, uvwB.xy) * uvwB.z;

    vec4 skyColor = texA + texB;

    gl_FragColor.rgb += skyColor.rgb;
    
    ${THREE.ShaderChunk.logdepthbuf_fragment}
  }`
};

export {Sky};