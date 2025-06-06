const DEVELOPMENT = false; // changed from development = true and renamed from DEVELOPMENT

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

/* texture width for simulation */
const WIDTH = 64;
const BIRDS = WIDTH * WIDTH;


/* bake animation into texture and create geometry from base model */
const BirdGeometry = new THREE.BufferGeometry();
let textureAnimation, durationAnimation, birdMesh, materialShader, indicesPerBird;

function nextPowerOf2( n ) {

	return Math.pow( 2, Math.ceil( Math.log( n ) / Math.log( 2 ) ) );

}

Math.lerp = function ( value1, value2, amount ) {

	amount = Math.max( Math.min( amount, 1 ), 0 );
	return value1 + ( value2 - value1 ) * amount;

};

const gltfs = [ './3d/Parrot.glb', './3d/minimal-butterfly.glb' ]; 
const colors = [ 0xFDFFE0, 0xffdeff ];
const sizes = [ 0.2, 0.1 ];
// const selectmodel = math.floor( math.random() * gltfs.length );
const selectModel = 0;
new GLTFLoader().load( gltfs[ selectModel ], function ( gltf ) {

	const animations = gltf.animations;
	durationAnimation = Math.round( animations[ 0 ].duration * 60 );
	const birdGeo = gltf.scene.children[ 0 ].geometry;
	const morphAttributes = birdGeo.morphAttributes.position;

	// check if morphattributes and its position attribute exist
	if ( !morphAttributes ) {

		if (DEVELOPMENT) console.debug( 'the selected model does not have morph targets at .morphattributes.position' ); // changed to DEVELOPMENT
		// you might want to return or handle this case,
		// as the rest of the animation baking will fail or produce incorrect results.
		return;

	}

	const tHeight = nextPowerOf2( durationAnimation );
	const tWidth = nextPowerOf2( birdGeo.getAttribute( 'position' ).count );
	indicesPerBird = birdGeo.index.count;
	const tData = new Float32Array( 4 * tWidth * tHeight );

	for ( let i = 0; i < tWidth; i ++ ) {

		for ( let j = 0; j < tHeight; j ++ ) {

			const offset = j * tWidth * 4;

			const curMorph = Math.floor( j / durationAnimation * morphAttributes.length );
			const nextMorph = ( Math.floor( j / durationAnimation * morphAttributes.length ) + 1 ) % morphAttributes.length;
			const lerpAmount = j / durationAnimation * morphAttributes.length % 1;

			if ( j < durationAnimation ) {

				let d0, d1;

				d0 = morphAttributes[ curMorph ].array[ i * 3 ];
				d1 = morphAttributes[ nextMorph ].array[ i * 3 ];

				if ( d0 !== undefined && d1 !== undefined ) tData[ offset + i * 4 ] = Math.lerp( d0, d1, lerpAmount );

				d0 = morphAttributes[ curMorph ].array[ i * 3 + 1 ];
				d1 = morphAttributes[ nextMorph ].array[ i * 3 + 1 ];

				if ( d0 !== undefined && d1 !== undefined ) tData[ offset + i * 4 + 1 ] = Math.lerp( d0, d1, lerpAmount );

				d0 = morphAttributes[ curMorph ].array[ i * 3 + 2 ];
				d1 = morphAttributes[ nextMorph ].array[ i * 3 + 2 ];

				if ( d0 !== undefined && d1 !== undefined ) tData[ offset + i * 4 + 2 ] = Math.lerp( d0, d1, lerpAmount );

				tData[ offset + i * 4 + 3 ] = 1;

			}

		}

	}

	textureAnimation = new THREE.DataTexture( tData, tWidth, tHeight, THREE.RGBAFormat, THREE.FloatType );
	textureAnimation.needsUpdate = true;

	const vertices = [], color = [], reference = [], seeds = [], indices = [];
	const totalVertices = birdGeo.getAttribute( 'position' ).count * 3 * BIRDS;
	for ( let i = 0; i < totalVertices; i ++ ) {

		const bIndex = i % ( birdGeo.getAttribute( 'position' ).count * 3 );
		vertices.push( birdGeo.getAttribute( 'position' ).array[ bIndex ] );
		color.push( birdGeo.getAttribute( 'color' ).array[ bIndex ] );

	}

	let r = Math.random();
	for ( let i = 0; i < birdGeo.getAttribute( 'position' ).count * BIRDS; i ++ ) {

		const bIndex = i % ( birdGeo.getAttribute( 'position' ).count );
		const bird = Math.floor( i / birdGeo.getAttribute( 'position' ).count );
		if ( bIndex == 0 ) r = Math.random();
		const j = ~ ~ bird;
		const x = ( j % WIDTH ) / WIDTH;
		const y = ~ ~ ( j / WIDTH ) / WIDTH;
		reference.push( x, y, bIndex / tWidth, durationAnimation / tHeight );
		seeds.push( bird, r, Math.random(), Math.random() );

	}

	for ( let i = 0; i < birdGeo.index.array.length * BIRDS; i ++ ) {

		const offset = Math.floor( i / birdGeo.index.array.length ) * ( birdGeo.getAttribute( 'position' ).count );
		indices.push( birdGeo.index.array[ i % birdGeo.index.array.length ] + offset );

	}

	BirdGeometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( vertices ), 3 ) );
	BirdGeometry.setAttribute( 'birdColor', new THREE.BufferAttribute( new Float32Array( color ), 3 ) );
	BirdGeometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array( color ), 3 ) );
	BirdGeometry.setAttribute( 'reference', new THREE.BufferAttribute( new Float32Array( reference ), 4 ) );
	BirdGeometry.setAttribute( 'seeds', new THREE.BufferAttribute( new Float32Array( seeds ), 4 ) );

	BirdGeometry.setIndex( indices );

	init();

} );

let container, stats;
let camera, scene, renderer;
let mouseX = 0, mouseY = 0;
let guiInstance; // for storing the lil-gui instance

let windowHalfX = window.innerWidth / 10;
let windowHalfY = window.innerHeight / 10;

const BOUNDS = 20, BOUNDS_HALF = BOUNDS / 2;

let last = performance.now();

let gpuCompute;
let velocityVariable;
let positionVariable;
let positionUniforms;
let velocityUniforms;

function init() {

	container = document.getElementById( 'threejs' ); 

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 3000 );
	// TODO: camera position away, fog adjusted, cover with element on top
	camera.position.z = 350;

	scene = new THREE.Scene();
	scene.background = new THREE.Color( colors[ selectModel ] );
	scene.fog = new THREE.Fog( colors[ selectModel ], 100, 3000 );

    /* 
        lights
    */
	const hemiLight = new THREE.HemisphereLight( colors[ selectModel ], 0xffffff, 4.5 );
	hemiLight.color.setHSL( 0.6, 1, 0.6, THREE.SRGBColorSpace );
	hemiLight.groundColor.setHSL( 0.095, 1, 0.75, THREE.SRGBColorSpace );
	hemiLight.position.set( 0, 50, 0 );
	scene.add( hemiLight );

	const dirLight = new THREE.DirectionalLight( 0x00CED1, 2.0 );
	dirLight.color.setHSL( 0.1, 1, 0.95, THREE.SRGBColorSpace );
	dirLight.position.set( - 1, 1.75, 1 );
	dirLight.position.multiplyScalar( 30 );
	scene.add( dirLight );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	container.appendChild( renderer.domElement );

	initComputeRenderer();

	// stats handling
	if (DEVELOPMENT) {
		if (!stats) { // if stats object doesn't exist, create it
			stats = new Stats();
		}
		// ensure stats.dom is in the correct container and visible
		if (stats.dom.parentNode !== container) {
		    if (stats.dom.parentNode) { // if attached elsewhere, remove it first
		        stats.dom.parentNode.removeChild(stats.dom);
		    }
		    container.appendChild(stats.dom); // append to the correct container
		}
		stats.dom.style.display = ''; // make it visible
	} else {
		// DEVELOPMENT is false, ensure stats is hidden/removed
		if (stats && stats.dom) { // if stats object and its dom element exist
			stats.dom.style.display = 'none'; // hide first
			if (stats.dom.parentNode) { // if it's in the dom
				stats.dom.parentNode.removeChild(stats.dom); // then remove
			}
		}
	}

	// gui controls handling
	// first, destroy any existing gui instance
	if (guiInstance) {
		guiInstance.destroy();
		guiInstance = null; // clear the reference
	}
	// always attempt to find and remove/hide lil-gui elements directly from dom
	// this is crucial if DEVELOPMENT is false, or if guiinstance was not set properly
	const existingGuis = document.querySelectorAll('.lil-gui');
	existingGuis.forEach(guiElement => {
		guiElement.style.display = 'none'; // hide first
		if (guiElement.parentNode) {
			guiElement.parentNode.removeChild(guiElement); // then remove
		}
	});

	// define effectcontroller with desired base/default values.
	// these values will be used for simulation uniforms regardless of development mode.
	let effectController = {
		separation: 20.0,
		alignment: 20.0,
		cohesion: 20.0,
		freedom: 0.75,
		size: sizes[selectModel],
		count: Math.floor(BIRDS / 4)
	};

	// define valueschanger to update uniforms and drawing based on effectcontroller.
	// this function is called initially and when gui controls change (if development mode is on).
	const valuesChanger = function () {
		if (velocityUniforms) { // ensure velocityuniforms is initialized
			velocityUniforms['separationDistance'].value = effectController.separation;
			velocityUniforms['alignmentDistance'].value = effectController.alignment;
			velocityUniforms['cohesionDistance'].value = effectController.cohesion;
			velocityUniforms['freedomFactor'].value = effectController.freedom;
		}
		if (materialShader) { // ensure materialshader is initialized
			materialShader.uniforms['size'].value = effectController.size;
		}
		// ensure indicesperbird is defined and birdgeometry exists
		if (typeof indicesPerBird !== 'undefined' && BirdGeometry) {
			BirdGeometry.setDrawRange(0, indicesPerBird * effectController.count);
		}
	};

	// apply the initial effectcontroller values to the simulation's uniforms and settings.
	valuesChanger();

	// if in development mode, set up the gui.
	// the general gui cleanup is handled before this block (lines 207-219).
	if (DEVELOPMENT) {
		guiInstance = new GUI(); // create and store the new gui instance

		guiInstance.add(effectController, 'separation', 0.0, 100.0, 1.0).onChange(valuesChanger);
		guiInstance.add(effectController, 'alignment', 0.0, 100, 0.001).onChange(valuesChanger);
		guiInstance.add(effectController, 'cohesion', 0.0, 100, 0.025).onChange(valuesChanger);
		guiInstance.add(effectController, 'size', 0, 1, 0.01).onChange(valuesChanger);
		guiInstance.add(effectController, 'count', 0, BIRDS, 1).onChange(valuesChanger);
		// note: 'freedom' is part of effectcontroller but not exposed in the gui by default.
	}

	initBirds( effectController ); // effectcontroller will be undefined if !DEVELOPMENT

	container.style.touchAction = 'none';
	container.addEventListener( 'pointermove', onPointerMove );

	window.addEventListener( 'resize', onWindowResize );

}

function initComputeRenderer() {

	gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, renderer );

	const dtPosition = gpuCompute.createTexture();
	const dtVelocity = gpuCompute.createTexture();
	fillPositionTexture( dtPosition );
	fillVelocityTexture( dtVelocity );

	velocityVariable = gpuCompute.addVariable( 'textureVelocity', document.getElementById( 'fragmentShaderVelocity' ).textContent, dtVelocity );
	positionVariable = gpuCompute.addVariable( 'texturePosition', document.getElementById( 'fragmentShaderPosition' ).textContent, dtPosition );

	gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable, velocityVariable ] );
	gpuCompute.setVariableDependencies( positionVariable, [ positionVariable, velocityVariable ] );

	positionUniforms = positionVariable.material.uniforms;
	velocityUniforms = velocityVariable.material.uniforms;


	// pathways variables
	positionUniforms[ 'time' ] = { value: 0.0 };
	positionUniforms[ 'delta' ] = { value: 0.0 };
	velocityUniforms[ 'time' ] = { value: 1.0 };
	velocityUniforms[ 'delta' ] = { value: 0.0 };
	velocityUniforms[ 'testing' ] = { value: 1.0 };
	velocityUniforms[ 'separationDistance' ] = { value: 1.0 };
	velocityUniforms[ 'alignmentDistance' ] = { value: 1.0 };
	velocityUniforms[ 'cohesionDistance' ] = { value: 1.0 };
	velocityUniforms[ 'freedomFactor' ] = { value: 1.0 };
	velocityUniforms[ 'predator' ] = { value: new THREE.Vector3() };
	velocityVariable.material.defines.BOUNDS = BOUNDS.toFixed( 2 );

	velocityVariable.wrapS = THREE.RepeatWrapping;
	velocityVariable.wrapT = THREE.RepeatWrapping;
	positionVariable.wrapS = THREE.RepeatWrapping;
	positionVariable.wrapT = THREE.RepeatWrapping;

	const error = gpuCompute.init();

	if ( error !== null ) {

		if (DEVELOPMENT) console.debug( error ); // changed to DEVELOPMENT

	}

}

function initBirds( effectController ) { // effectcontroller is now optional

	const geometry = BirdGeometry;

	const m = new THREE.MeshStandardMaterial( {
		vertexColors: true,
		flatShading: true,
		roughness: 1,
		metalness: 0
	} );

	m.onBeforeCompile = ( shader ) => {

		shader.uniforms.texturePosition = { value: null };
		shader.uniforms.textureVelocity = { value: null };
		shader.uniforms.textureAnimation = { value: textureAnimation };
		shader.uniforms.time = { value: 1.0 };
		shader.uniforms.size = { value: effectController ? effectController.size : sizes[selectModel] }; // use default if no controller
		shader.uniforms.delta = { value: 0.0 };

		let token = '#define STANDARD';

		let insert = `
			attribute vec4 reference;
			attribute vec4 seeds;
			attribute vec3 birdColor;
			uniform sampler2D texturePosition;
			uniform sampler2D textureVelocity;
			uniform sampler2D textureAnimation;
			uniform float size;
			uniform float time;
		`;

		shader.vertexShader = shader.vertexShader.replace( token, token + insert );

		token = '#include <begin_vertex>';

		insert = `
			vec4 tmpPos = texture2D( texturePosition, reference.xy );

			vec3 pos = tmpPos.xyz;
			vec3 velocity = normalize(texture2D( textureVelocity, reference.xy ).xyz);
			vec3 aniPos = texture2D( textureAnimation, vec2( reference.z, mod( time + ( seeds.x ) * ( ( 0.0004 + seeds.y / 10000.0) + normalize( velocity ) / 20000.0 ), reference.w ) ) ).xyz;
			vec3 newPosition = position;

			newPosition = mat3( modelMatrix ) * ( newPosition + aniPos );
			newPosition *= size + seeds.y * size * 0.2;

			velocity.z *= -1.;
			float xz = length( velocity.xz );
			float xyz = 1.;
			float x = sqrt( 1. - velocity.y * velocity.y );

			float cosry = velocity.x / xz;
			float sinry = velocity.z / xz;

			float cosrz = x / xyz;
			float sinrz = velocity.y / xyz;

			mat3 maty =  mat3( cosry, 0, -sinry, 0    , 1, 0     , sinry, 0, cosry );
			mat3 matz =  mat3( cosrz , sinrz, 0, -sinrz, cosrz, 0, 0     , 0    , 1 );

			newPosition =  maty * matz * newPosition;
			newPosition += pos;

			vec3 transformed = vec3( newPosition );
		`;

		shader.vertexShader = shader.vertexShader.replace( token, insert );

		materialShader = shader;

	};

	birdMesh = new THREE.Mesh( geometry, m );
	birdMesh.rotation.y = Math.PI / 2;

	birdMesh.castShadow = true;
	birdMesh.receiveShadow = true;

	scene.add( birdMesh );

}

function fillPositionTexture( texture ) {

	const theArray = texture.image.data;

	for ( let k = 0, kl = theArray.length; k < kl; k += 4 ) {

		const x = Math.random() * BOUNDS - BOUNDS_HALF;
		const y = Math.random() * BOUNDS - BOUNDS_HALF;
		const z = Math.random() * BOUNDS - BOUNDS_HALF;

		theArray[ k + 0 ] = x;
		theArray[ k + 1 ] = y;
		theArray[ k + 2 ] = z;
		theArray[ k + 3 ] = 1;

	}

}

function fillVelocityTexture( texture ) {

	const theArray = texture.image.data;

	for ( let k = 0, kl = theArray.length; k < kl; k += 4 ) {

		const x = Math.random() - 0.5;
		const y = Math.random() - 0.5;
		const z = Math.random() - 0.5;

		theArray[ k + 0 ] = x * 10;
		theArray[ k + 1 ] = y * 10;
		theArray[ k + 2 ] = z * 10;
		theArray[ k + 3 ] = 1;

	}

}

function onWindowResize() {

	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function onPointerMove( event ) {

	if ( event.isPrimary === false ) return;

	mouseX = event.clientX - windowHalfX;
	mouseY = event.clientY - windowHalfY;

}


function animate() {

	render();

	// stats handling in animate
	if (DEVELOPMENT && stats) {
		stats.update();
	} else if (!DEVELOPMENT && stats && stats.dom) {
		// if not in development, and stats.dom exists, ensure it's hidden and removed
        stats.dom.style.display = 'none'; // hide first
		if (stats.dom.parentNode) { // if it's still in the dom
			stats.dom.parentNode.removeChild(stats.dom); // then remove
		}
	}

	// gui handling in animate for !DEVELOPMENT
	if (!DEVELOPMENT) {
		const existingGuisInAnimate = document.querySelectorAll('.lil-gui');
		if (existingGuisInAnimate.length > 0) {
			existingGuisInAnimate.forEach(guiElement => {
				guiElement.style.display = 'none'; // hide first
				if (guiElement.parentNode) { // if it's still in the dom
					guiElement.parentNode.removeChild(guiElement); // then remove
				}
			});
		}
	}

}

function render() {

	const now = performance.now();
	let delta = ( now - last ) / 1000;

	if ( delta > 1 ) delta = 1; // safety cap on large deltas
	last = now;

	positionUniforms[ 'time' ].value = now;
	positionUniforms[ 'delta' ].value = delta;
	velocityUniforms[ 'time' ].value = now;
	velocityUniforms[ 'delta' ].value = delta;
	if ( materialShader ) materialShader.uniforms[ 'time' ].value = now / 1000;
	if ( materialShader ) materialShader.uniforms[ 'delta' ].value = delta;

	velocityUniforms[ 'predator' ].value.set( 0.5 * mouseX / windowHalfX, - 0.5 * mouseY / windowHalfY, 0 );

	mouseX = 10000;
	mouseY = 10000;

	gpuCompute.compute();

	if ( materialShader ) materialShader.uniforms[ 'texturePosition' ].value = gpuCompute.getCurrentRenderTarget( positionVariable ).texture;
	if ( materialShader ) materialShader.uniforms[ 'textureVelocity' ].value = gpuCompute.getCurrentRenderTarget( velocityVariable ).texture;

	renderer.render( scene, camera );

}
