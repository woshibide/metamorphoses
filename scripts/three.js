// to learn
// https://threejs-journey.com/lessons/introduction#introduction

// https://github.com/mrdoob/three.js/blob/master/examples/webgpu_postprocessing_bloom_selective.html
// ^ this could be a good last sceen, but butterflies chiling


// Basic setup for Three.js with immersive camera fly-through.
// Best practices/approaches:
// 1. Use requestAnimationFrame for smooth animations.
// 2. Use GLTFLoader to import Blender-exported .glb/.gltf files.
// 3. For immersive navigation, consider FlyControls or PointerLockControls.
// 4. Organize code using modules or separate files as the project grows.

// Create scene, camera, and renderer
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
// Adjust camera starting position; tweak as needed for each scene
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lights for basic illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// NEW: Create random cubes
for (let i = 0; i < 22; i++) {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
    );
    scene.add(cube);
}

// NEW: Define a quirky camera pathway using a CatmullRomCurve3
const cameraPathPoints = [
    new THREE.Vector3(-10, 2, 0),
    new THREE.Vector3(-5, 5, -5),
    new THREE.Vector3(0, 2, 10),
    new THREE.Vector3(5, -2, -10),
    new THREE.Vector3(10, 0, 0)
];
const cameraCurve = new THREE.CatmullRomCurve3(cameraPathPoints);

// NEW: Setup scroll-controlled camera movement
let scrollProgress = 0; // normalized value between 0 and 1
const scrollFactor = 0.001; // adjust sensitivity as needed
document.addEventListener('wheel', (event) => {
    scrollProgress = THREE.MathUtils.clamp(scrollProgress + event.deltaY * scrollFactor, 0, 1);
});

// Handle responsive adjustments with window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Load Blender-exported scene or objects using GLTFLoader
// The GLTF format is recommended for Blender exports.
// Note: You must add or import GLTFLoader from https://threejs.org/examples/jsm/loaders/GLTFLoader.js
/*
const loader = new THREE.GLTFLoader();
loader.load('models/yourScene.glb', (gltf) => {
    scene.add(gltf.scene);
    // Optionally, setup animation mixer if your model includes animations:
    // const mixer = new THREE.AnimationMixer(gltf.scene);
    // mixer.clipAction(gltf.animations[0]).play();
}, undefined, (error) => {
    console.error('Error loading model:', error);
});
*/

// Placeholder for immersive controls setup:
// Option 1: FlyControls for free-flight navigation
/*
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
const controls = new FlyControls(camera, renderer.domElement);
controls.movementSpeed = 10;
controls.rollSpeed = Math.PI / 24;
controls.autoForward = false;
controls.dragToLock = true;
*/

// Option 2: PointerLockControls for first-person experience
/*
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
const controls = new PointerLockControls(camera, renderer.domElement);
document.addEventListener('click', () => {
    controls.lock();
});
*/

// Animation loop: update camera along the path based on scroll progress and render the scene
function animate() {
    requestAnimationFrame(animate);
    
    // NEW: Update camera position and orientation along the cameraCurve using scrollProgress.
    const point = cameraCurve.getPoint(scrollProgress);
    camera.position.copy(point);
    // Look ahead along the curve (offset by 0.01, clamped to 1)
    const lookAtPoint = cameraCurve.getPoint(Math.min(scrollProgress + 0.01, 1));
    camera.lookAt(lookAtPoint);
    
    // ...update controls if implemented...
    renderer.render(scene, camera);
}
animate();
