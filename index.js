import * as THREE from 'three';
import { Lensflare, LensflareElement } from './Lensflare.js';

import metaversefile from 'metaversefile';
import {Sky} from './sky.js';

const {useApp, useFrame, useInternals, useLightsManager} = metaversefile;
const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');
const textureLoader = new THREE.TextureLoader();

const starTexture = textureLoader.load(baseUrl + `./textures/star3.png`);
starTexture.wrapS = starTexture.wrapT = THREE.RepeatWrapping;
const noiseTexture = textureLoader.load(baseUrl + `./textures/noise.png`);
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

const galaxyTexture = textureLoader.load(baseUrl + `./textures/galaxy.png`);

const noiseTexture2 = textureLoader.load(baseUrl + `./textures/noise2.png`);
noiseTexture2.wrapS = noiseTexture2.wrapT = THREE.RepeatWrapping;

const textureFlare0 = textureLoader.load(baseUrl + `./textures/Flare32.png`);
const textureFlare3 = textureLoader.load(baseUrl + `./textures/lensflare3.png`);

const skyTexture = textureLoader.load(baseUrl + `./textures/sky1.png`);
skyTexture.wrapS = skyTexture.wrapT = THREE.RepeatWrapping;

const flowMapTexture = textureLoader.load(baseUrl + `./textures/cloudFlowMap3.png`);
flowMapTexture.wrapS = flowMapTexture.wrapT = THREE.RepeatWrapping;


export default () => {
  const app = useApp();
  const {camera} = useInternals();
  const lightsManager = useLightsManager();
  
  
  // ######################################## set component ################################################################
  const ambientLight = new THREE.AmbientLight('#fff', 0.5);
  app.add(ambientLight);
  const _setAmbientLight = (value) => {
    const args = value.args;
    ambientLight.color.set(ambientLight.color.fromArray(args[0]).multiplyScalar(1 / 255).getHex());
    ambientLight.intensity = args[1];
  }

  

  const sunPosition = new THREE.Vector3(1, 10, 3);
  sunPosition.normalize();
  let sunColor = new THREE.Color(0xffffff);
  let sunColorHex = '#' + sunColor.getHexString();
  let sunIntensity = 6;
  const _setSunLight = (value) => {
    const args = value.args;
    sunColorHex = '#' + sunColor.fromArray(args[0]).multiplyScalar(1 / 255).getHexString();
    sunIntensity = args[1];
    sunPosition.set(value.position[0], value.position[1], value.position[2]);
    sunPosition.normalize();
    const light = new THREE.DirectionalLight(
      new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
      args[1]
    );
    lightsManager.addLight(light, 'directional', value.shadow, value.position);
    app.add(light);
  }
  

  

  for (const component of app.components) {
    switch (component.key) {
      case 'sunLight': {
        _setSunLight(component.value)
        break;
      }
      case 'ambientLight': {
        _setAmbientLight(component.value)
        break;
      }
      default: {
        break;
      }
    }
  }
  

  //############################################################## sky ##############################################################
  {
    const skyBoxRadius = 8000;
    const sunMoonRotationRadius = skyBoxRadius / 2;

    const sky = new Sky();
    app.add(sky);

    sky.material.uniforms.skyBoxRadius.value = skyBoxRadius;
    sky.material.uniforms.starTexture.value = starTexture;
    sky.material.uniforms.noiseTexture.value = noiseTexture;
    sky.material.uniforms.galaxyTexture.value = galaxyTexture;
    sky.material.uniforms.noiseTexture2.value = noiseTexture2;
    
    sky.material.uniforms.skyTexture.value = skyTexture;
    sky.material.uniforms.flowMapTexture.value = flowMapTexture;
    
    const sun = new THREE.PointLight(0xffffff, 100, 2000);
    const lensflare = new Lensflare();
    const mainFlare = new LensflareElement(textureFlare0, 500, 0, sun.color, 0.2);
    lensflare.addElement(mainFlare);
    lensflare.addElement(new LensflareElement(textureFlare3, 48, 0.6));
    lensflare.addElement(new LensflareElement(textureFlare3, 56, 0.7));
    lensflare.addElement(new LensflareElement(textureFlare3, 96, 0.9));
    lensflare.addElement(new LensflareElement(textureFlare3, 56, 1));
    sun.add( lensflare );
    app.add( sun );
    
    sun.position.set(sunPosition.x, sunPosition.y, sunPosition.z).multiplyScalar(sunMoonRotationRadius);
    

    sky.material.uniforms.sunPosition.value.set(sunPosition.x, sunPosition.y, sunPosition.z)
                                              .multiplyScalar(skyBoxRadius);
    

    useFrame(({timestamp}) => {
      mainFlare.rotation = camera.rotation.y;
      sky.material.uniforms.uTime.value = timestamp / 1000;
    });
    
  }
  
  app.setComponent('renderPriority', 'high');
  
  return app;
};
