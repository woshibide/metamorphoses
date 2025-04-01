// for importing objects into the scene
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// for positioning of objects inside the scene
//import { TransformControls } from 'three/addons/controls/TransformControls.js';

let debugMode = true;
let isEditMode = false;


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
// initial camera position TBC
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// basic illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// random cubes
if (debugMode){
    for (let i = 0; i < 202; i++) {
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
}



const cameraPathPoints = [];

// just a path using sine/cosine functions
if (debugMode){
    for (let i = 0; i < 50; i++) {
        const t = i / 49; // normalized
        
        const x = 15 * Math.sin(t * Math.PI * 2);
        const y = 5 * Math.sin(t * Math.PI * 4) + 2;
        const z = 15 * Math.cos(t * Math.PI * 2);
        
        cameraPathPoints.push(new THREE.Vector3(x, y, z));
    }
}

const cameraCurve = new THREE.CatmullRomCurve3(cameraPathPoints);

// scroll-controlled camera movement along the path
let scrollProgress = 0; // normalized value between 0 and 1
const scrollFactor = 0.0001; // adjust sensitivity as needed
document.addEventListener('wheel', (event) => {
    if (debugMode){
        console.log('scrollProgress', scrollProgress);
    }
    scrollProgress = THREE.MathUtils.clamp
                                      // clamp to 0.99 to avoid overshooting
                     (scrollProgress + event.deltaY * scrollFactor, 0, 0.99);
});



///////////////////////
// keyboard controls
///////////////////////
document.addEventListener('keydown', (event) => {
    if (event.key === 'd') {
        debugMode = !debugMode;
        console.log('Debug mode:', debugMode ? 'enabled' : 'disabled');
    } else if (event.key === 'e') {
        isEditMode = !isEditMode;
        console.log('Edit mode:', isEditMode ? 'enabled' : 'disabled');
    }
});

///////////////////////
// animation loop
///////////////////////
function animate() {
    requestAnimationFrame(animate);
    
    // camera based of scroll position
    const point = cameraCurve.getPoint(scrollProgress);
    camera.position.copy(point);
    // look ahead along the curve (offset by 0.01, clamped to 1)
    const lookAtPoint = cameraCurve.getPoint(Math.min(scrollProgress + 0.01, 1));
    camera.lookAt(lookAtPoint);
    

    renderer.render(scene, camera);
}

// responsivness with window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();


// relies on GLTFLoader from https://threejs.org/examples/jsm/loaders/GLTFLoader.js

// const loader = new THREE.GLTFLoader();
// loader.load('models/yourScene.glb', (gltf) => {
//     scene.add(gltf.scene);
//     // Optionally, setup animation mixer if your model includes animations:
//     // const mixer = new THREE.AnimationMixer(gltf.scene);
//     // mixer.clipAction(gltf.animations[0]).play();
// }, undefined, (error) => {
//     console.error('Error loading model:', error);
// });



// TODO: FlyControls for free-flight navigation

// import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
// const controls = new FlyControls(camera, renderer.domElement);
// controls.movementSpeed = 10;
// controls.rollSpeed = Math.PI / 24;
// controls.autoForward = false;
// controls.dragToLock = true;
