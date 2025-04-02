import './css/style.css'
import './css/normalize.css'

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { getProject, types } from '@theatre/core'
import studio from '@theatre/studio'
import projectState from './state.json'

///////////////////////
// setup
///////////////////////

let debugMode = true;

// ----- camera on scroll ----- 
// TODO: implement
let scrollProgress = 0; 
const scrollFactor = 0.0001; // sensitivity

// ----- 3d files -----
const camButterfly = './src/objects/minimal-butterfly.glb';

// ----- three js ----- 
let butterflyMixer: THREE.AnimationMixer;
const loader = new GLTFLoader()



///////////////////////
// theatre
///////////////////////

studio.initialize()

const project = getProject('Metamorphoses KABK \'25', {state: projectState})
const sheet = project.sheet('scene one')



///////////////////////
// camera
///////////////////////

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  10,
  200,
)

camera.position.z = 50


const tCamera = sheet.object('camera', {
  position: {x: 0, y: 0, z: 0},
  rotation: {x: 0, y: 0, z: 0},
  fov: 50,
  near: 0.1,
  far: 1000,
})

tCamera.onValuesChange((v) => {
  camera.position.set(v.position.x, v.position.y, v.position.z)
  camera.rotation.set(v.rotation.x, v.rotation.y, v.rotation.z)
  camera.fov = v.fov
  camera.near = v.near
  camera.far = v.far
})

///////////////////////
// scene
///////////////////////

const scene = new THREE.Scene()

// ----------- torus knot example -----------
// const geometry = new THREE.TorusKnotGeometry(10, 3, 300, 16)
// const material = new THREE.MeshStandardMaterial({color: '#f00'})
// material.color = new THREE.Color('#049ef4')
// material.roughness = 0.5

// const mesh = new THREE.Mesh(geometry, material)
// mesh.castShadow = true
// mesh.receiveShadow = true
// scene.add(mesh)
// // Theatre.js object with the props you want to animate
// const torusKnotObj = sheet.object('Torus Knot', {
//   // rotation is in radians
//   // (full rotation: 2 * Math.PI)
//   rotation: types.compound({
//     x: types.number(mesh.rotation.x, { range: [-2, 2] }),
//     y: types.number(mesh.rotation.y, { range: [-2, 2] }),
//     z: types.number(mesh.rotation.z, { range: [-2, 2] }),
//   }),
// })

// torusKnotObj.onValuesChange((values) => {
//   const { x, y, z } = values.rotation
//   mesh.rotation.set(x * Math.PI, y * Math.PI, z * Math.PI)
// })


// Import butterfly model
let butterflyModel: THREE.Group

loader.load(
  camButterfly,
  (gltf) => {
    butterflyModel = gltf.scene
    butterflyModel.scale.set(5, 5, 5) 
    butterflyModel.position.set(10, 0, 0) 
    butterflyModel.castShadow = true
    butterflyModel.receiveShadow = false
    scene.add(butterflyModel)
    

    butterflyMixer = new THREE.AnimationMixer(butterflyModel);

    // if there are animations play all animations
    if (gltf.animations && gltf.animations.length) {
      gltf.animations.forEach((clip) => {
        const action = butterflyMixer.clipAction(clip);
        action.play();
        if (debugMode) console.log(`animation: ${clip.name} from ${camButterfly} is playing`);
      });
    }

    // butterfly animations
    const butterflyObj = sheet.object('Butterfly', {
      rotation: types.compound({
        x: types.number(0, { range: [-2, 2] }),
        y: types.number(0, { range: [-2, 2] }),
        z: types.number(0, { range: [-2, 2] }),
      }),
      position: types.compound({
        x: types.number(10, { range: [-20, 20] }),
        y: types.number(0, { range: [-20, 20] }),
        z: types.number(0, { range: [-20, 20] }),
      })
    })

    butterflyObj.onValuesChange((values) => {
      const { x: rotX, y: rotY, z: rotZ } = values.rotation
      const { x: posX, y: posY, z: posZ } = values.position
      
      // Apply rotation and position
      butterflyModel.rotation.set(rotX * Math.PI, rotY * Math.PI, rotZ * Math.PI)
      butterflyModel.position.set(posX, posY, posZ)
      })
  },
  (progress) => {
    if (debugMode) console.log('Loading butterfly model:', (progress.loaded / progress.total * 100).toFixed(2) + '%')
  },
  (error) => {
    console.error('Error loading butterfly model:', error)
  }
)

///////////////////////
// lights
///////////////////////

// Ambient Light
const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)
scene.add(ambientLight)

// Point light
const directionalLight = new THREE.DirectionalLight('#ff0000', 30 /* , 0, 1 */)
directionalLight.position.y = 20
directionalLight.position.z = 20

directionalLight.castShadow = true

directionalLight.shadow.mapSize.width = 2048
directionalLight.shadow.mapSize.height = 2048
directionalLight.shadow.camera.far = 50
directionalLight.shadow.camera.near = 1
directionalLight.shadow.camera.top = 20
directionalLight.shadow.camera.right = 20
directionalLight.shadow.camera.bottom = -20
directionalLight.shadow.camera.left = -20

scene.add(directionalLight)

// RectAreaLight
const rectAreaLight = new THREE.RectAreaLight('#ff0', 1, 50, 50)

rectAreaLight.position.z = 10
rectAreaLight.position.y = -40
rectAreaLight.position.x = -20
rectAreaLight.lookAt(new THREE.Vector3(0, 0, 0))

scene.add(rectAreaLight)

///////////////////////
// render
///////////////////////

const renderer = new THREE.WebGLRenderer({antialias: true})

renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.render(scene, camera)

document.body.appendChild(renderer.domElement)


///////////////////////
// input
///////////////////////

document.addEventListener('wheel', (event) => {
    scrollProgress = THREE.MathUtils.clamp
                    // clamp to 0.99 to avoid overshooting
                     (scrollProgress + event.deltaY * scrollFactor, 0, 0.99);
    if (debugMode){
      console.log('scrollProgress', scrollProgress);
    }
});


document.addEventListener('keydown', (event) => {
  if (event.key === 'd') {
      debugMode = !debugMode;
      console.log('Debug mode:', debugMode ? 'enabled' : 'disabled');
   } //else if (event.key === 'e') {
  //     isEditMode = !isEditMode;
  //     console.log('Edit mode:', isEditMode ? 'enabled' : 'disabled');
  // }
});



///////////////////////
// update
///////////////////////

function tick(): void {
  // Add this line to update animations
  if (butterflyMixer) butterflyMixer.update(0.032); // Approximately 60fps

  renderer.render(scene, camera)

  window.requestAnimationFrame(tick)
}

tick()

///////////////////////
// responsivness
///////////////////////

window.addEventListener(
  'resize',
  function () {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  },
  false,
)

///////////////////////
// animation
///////////////////////

project.ready.then(() => sheet.sequence.play({ iterationCount: Infinity }))
