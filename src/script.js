import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as dat from 'lil-gui'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

import base_vertex_vs from './shaders/base_vertex.vs?raw'
import outline_fs from './shaders/outline.fs?raw'
import hatching_fs from './shaders/hatching.fs?raw'
import uv_fs from './shaders/uv.fs?raw'

import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'


import Stats from 'three/examples/jsm/libs/stats.module.js';

// Stats
const stats = new Stats();
document.body.appendChild(stats.dom);

/**
 * Base
 */
// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()
const textureLoader = new THREE.TextureLoader()


/**
 * Environment map
 */
const environmentMap = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.jpg',
    '/textures/environmentMaps/0/nx.jpg',
    '/textures/environmentMaps/0/py.jpg',
    '/textures/environmentMaps/0/ny.jpg',
    '/textures/environmentMaps/0/pz.jpg',
    '/textures/environmentMaps/0/nz.jpg'
])
environmentMap.encoding = THREE.sRGBEncoding

scene.background = environmentMap
scene.environment = environmentMap

/**
 * Models
*/
let meshes = []

gltfLoader.load(
    '/models/DamagedHelmet/glTF/DamagedHelmet.gltf',
    (gltf) =>
    {
        gltf.scene.scale.set(2, 2, 2)
        gltf.scene.rotation.y = Math.PI * 0.5
        gltf.scene.position.set(0, 0, -2.5)
        scene.add(gltf.scene)
        meshes.push(gltf.scene)
    }
)

gltfLoader.load(
    '/models/Suzanne/Suzanne.gltf',
    (gltf) =>
    {
        gltf.scene.scale.set(2, 2, 2)
        gltf.scene.rotation.y = Math.PI * 0.5
        gltf.scene.position.set(0, 0, 2.5)
        scene.add(gltf.scene)
        meshes.push(gltf.scene)
    }
)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(27, sizes.width / sizes.height, 1, 100)
camera.position.set(10, 1, -10)
scene.add(camera)


// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.position.set(0.25, 3, - 2.25)
scene.add(directionalLight)

const viewSpaceLightDirection = new THREE.Vector4()
const update_light = () => 
{
    camera.updateMatrix()
    viewSpaceLightDirection.set(directionalLight.position.x,
        directionalLight.position.y,
        directionalLight.position.z,
        0.0)
        viewSpaceLightDirection.applyMatrix4(camera.matrixWorldInverse).normalize()
        viewSpaceLightDirection.addScalar(1.0).multiplyScalar(0.5)
}
    
const lightFolder = gui.addFolder('Light')
lightFolder.add(directionalLight.position, 'x', -1, 1, 0.01)
lightFolder.add(directionalLight.position, 'y', -1, 1, 0.01)
lightFolder.add(directionalLight.position, 'z', -1, 1, 0.01)





/**
 * Render Targets
 */

const setup_rendertarget = (sizes, format, use_depth = false) => 
{
    const target = new THREE.WebGLRenderTarget(sizes.width, sizes.height)
    target.samples = 2
    target.texture.minFilter = THREE.LinearFilter
    target.texture.magFilter = THREE.LinearFilter
    target.texture.format = format;
    target.texture.generateMipmaps = false;
    target.stencilBuffer = false;
    target.texture.type = THREE.UnsignedByteType
    target.depthBuffer = true;
    if(use_depth){
        target.depthTexture = new THREE.DepthTexture()
    }
    return target
}


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 1.5
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Post Processing
 */
const composer = new EffectComposer(renderer)
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)


/**
 * outline Shader
 */


const outline_shader = new THREE.ShaderMaterial({
    defines: {
        'PERSPECTIVE_CAMERA' : 1,
		'NORMAL_TEXTURE': 0,
		'DIFFUSE_TEXTURE': 0,
		'DEPTH_PACKING': 0
	},
    uniforms : 
    {
        'tDiffuse' : {value : null},
        'tDepth' : {value : null},
        'tNormal' : {value : null},
        'cameraNear': { value: camera.near },
		'cameraFar': { value: camera.far },
        'uDepthDerivMin' : {value : 5}, 
        'uDepthDerivMax' : {value : 10},
        'uDiffDerivMin' : {value : 0.0}, 
        'uDiffDerivMax' : {value : 0.23},
        'uNormalDerivMin' : {value : 0.02}, 
        'uNormalDerivMax' : {value : 0.09},
        'uBorderWidth' : {value : 3.0},
        'uLightViewDir' : {value : viewSpaceLightDirection}
    },
    vertexShader : base_vertex_vs,
    fragmentShader : outline_fs,
    glslVersion: THREE.GLSL3
})

const depth_target  = setup_rendertarget(sizes, THREE.RGBAFormat, true)
const normal_target  = setup_rendertarget(sizes, THREE.RGBAFormat)
const uv_target  = setup_rendertarget(sizes, THREE.RGBAFormat)

// Outline 
const outline_pass = new ShaderPass(outline_shader)
outline_pass.uniforms.tDepth.value = depth_target.depthTexture;
outline_pass.uniforms.tNormal.value = normal_target.texture;
outline_pass.uniforms.uLightViewDir.value = viewSpaceLightDirection
composer.addPass(outline_pass)

const outline_folder = gui.addFolder('Outline')
outline_folder.add(outline_pass, 'enabled', true)
outline_folder.add(outline_pass.uniforms.uDepthDerivMin, 'value', 0.0, 50, 0.01).name('depth deriv min')
outline_folder.add(outline_pass.uniforms.uDepthDerivMax, 'value', 0.0, 50, 0.01).name('depth deriv max')
outline_folder.add(outline_pass.uniforms.uBorderWidth, 'value', 0.0, 5.0, 0.01).name('border width')
outline_folder.add(outline_pass.uniforms.uDiffDerivMin, 'value', 0.0, 3, 0.01).name('diff deriv min')
outline_folder.add(outline_pass.uniforms.uDiffDerivMax, 'value', 0.0, 3, 0.01).name('diff deriv max')
outline_folder.add(outline_pass.uniforms.uNormalDerivMin, 'value', -1.0, 1, 0.01).name('normal deriv min')
outline_folder.add(outline_pass.uniforms.uNormalDerivMax, 'value', -1.0, 1, 0.01).name('normal deriv max')


// Hatching Shader
const hatching_shader = new THREE.ShaderMaterial({

    uniforms : 
    {
        'tDiffuse' : {value : null},
        'tDepth' : {value : null},
        'tNormal' : {value : null},
        'tUV' : {value : null},
        'uLineWidth' : {value : 0.47},
        'uLineSpacing' : {value : 400}, 
        'uDoubleLineThreshold' : {value : - 0.61},
        'uSingleLineThreshold' : {value : -0.17},
        'uLightThreshold' : {value : 0.15},
        'uLightViewDir' : {value : viewSpaceLightDirection}
    },
    vertexShader : base_vertex_vs,
    fragmentShader : hatching_fs,
    glslVersion: THREE.GLSL3
})

// Hatching
const hatching_pass = new ShaderPass(hatching_shader)
hatching_pass.uniforms.tDepth.value = depth_target.depthTexture;
hatching_pass.uniforms.tNormal.value = normal_target.texture;
hatching_pass.uniforms.tUV.value = uv_target.texture;
hatching_pass.uniforms.uLightViewDir.value = viewSpaceLightDirection
composer.addPass(hatching_pass)


const hatching_folder = gui.addFolder('hatching')
hatching_folder.add(hatching_pass, 'enabled', true)
hatching_folder.add(hatching_pass.uniforms.uLineWidth, 'value', 0.0, 1, 0.01).name('line width')
hatching_folder.add(hatching_pass.uniforms.uLineSpacing, 'value', 0.0, 400, 0.01).name('line spacing')
hatching_folder.add(hatching_pass.uniforms.uDoubleLineThreshold, 'value', -1.0, 1, 0.01).name('double line')
hatching_folder.add(hatching_pass.uniforms.uSingleLineThreshold, 'value', -1.0, 1, 0.01).name('single line')
hatching_folder.add(hatching_pass.uniforms.uLightThreshold, 'value', -1.0, 1, 0.01).name('light')



const gamma_pass = new ShaderPass(GammaCorrectionShader)
composer.addPass(gamma_pass)


const black = new THREE.Color(0x00000000)
const normal_material = new THREE.MeshNormalMaterial()
const render_normal = () =>
{
    renderer.setRenderTarget(normal_target)
    scene.overrideMaterial = normal_material
    const bg = scene.background 
    scene.background = black
    renderer.render(scene, camera)
    scene.overrideMaterial = null
    scene.background = bg
}

const render_depth = () =>
{
    renderer.setRenderTarget(depth_target)
    renderer.render(scene, camera)
}

const uv_shader = { uniforms: {'tDiffuse' : {value : null}},
                    fragmentShader : uv_fs,
                    vertexShader : base_vertex_vs,
                    glslVersion: THREE.GLSL3}

const uv_material = new THREE.ShaderMaterial(uv_shader)

const render_uv = () =>
{
    renderer.setRenderTarget(uv_target)
    scene.overrideMaterial = uv_material
    const bg = scene.background 
    scene.background = black
    renderer.render(scene, camera)
    scene.overrideMaterial = null
    scene.background = bg
}


window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    
    // Update renderer
    composer.setSize(sizes.width, sizes.height)
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})



/**
 * Animate
 */
const clock = new THREE.Clock()
let flag = true
const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()
    

    // Render
    // render depth
    update_light()
    render_depth()
    render_normal()
    render_uv()

    //renderer.render(scene, camera)
    // using the effect composer
    composer.render()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)

    stats.update()
}

tick()