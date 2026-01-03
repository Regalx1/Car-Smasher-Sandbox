import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';

// --- ASSETS CONFIG ---
const ASSETS = {
    cars: [
        { id: 'sedan', name: 'Sedan', src: 'car_sedan.png', l: 4.8, w: 2, h: 1.5, color: 0x2244aa, front: 'front_sedan.png', unlockAt: 0 },
        { id: 'truck', name: 'Pickup', src: 'car_truck.png', l: 5.5, w: 2.2, h: 1.8, color: 0x333333, front: 'front_truck.png', type: 'truck', unlockAt: 0 },
        { id: 'sports', name: 'Sports Car', src: 'car_sports.png', l: 4.5, w: 2, h: 1.2, color: 0xcc0000, front: 'front_supercar.png', unlockAt: 5 },
        { id: 'garbage', name: 'Garbage Truck', src: 'garbage_truck.png', l: 9, w: 2.8, h: 3.2, color: 0x228822, front: 'front_truck.png', type: 'truck', unlockAt: 10 },
        { id: 'bus', name: 'Bus', src: 'bus.png', l: 12, w: 3, h: 3.5, color: 0xffcc00, front: 'front_bus.png', unlockAt: 15 },
        { id: 'lambo', name: 'Lambo', src: 'car_lambo.png', l: 4.6, w: 2.1, h: 1.1, color: 0xffff00, front: 'front_supercar.png', unlockAt: 25 },
        { id: 'cybertruck', name: 'Cybertruck', src: 'car_cybertruck.png', l: 5.8, w: 2.2, h: 1.9, color: 0xc0c0c0, front: 'front_sedan.png', unlockAt: 35 },
        { id: 'bugatti', name: 'Bugatti', src: 'car_bugatti.png', l: 4.7, w: 2.1, h: 1.2, color: 0x0000ff, front: 'front_supercar.png', unlockAt: 50 }
    ],
    trains: [
        { id: 'nyc', name: 'NYC Subway', src: 'train_nyc.png', l: 14, w: 3.2, h: 3.8, special: 'nyc', type: 'train', unlockAt: 0 },
        { id: 'nyc_modern', name: 'Modern R211', src: 'train_modern.png', l: 15, w: 3.2, h: 3.8, type: 'train', front: 'front_modern.png', unlockAt: 15 },
        { id: 'nyc_vintage', name: 'Redbird', src: 'train_redbird.png', l: 14, w: 3.2, h: 3.8, type: 'train', front: 'front_redbird.png', unlockAt: 30 },
        { id: 'nyc_express', name: 'Express Train', src: 'train_nyc.png', l: 14, w: 3.2, h: 3.8, special: 'nyc', type: 'train', color: 0xcc0000, unlockAt: 45 },
        { id: 'nyc_cargo', name: 'Cargo Train', src: 'train_nyc.png', l: 16, w: 3.2, h: 3.8, special: 'nyc', type: 'train', color: 0x333333, unlockAt: 60 },
        { id: 'nyc_gold', name: 'Golden Train', src: 'train_nyc.png', l: 14, w: 3.2, h: 3.8, special: 'nyc', type: 'train', color: 0xffd700, unlockAt: 100 }
    ],
    air: [
        { id: 'helicopter', name: 'Helicopter', src: 'helicopter.png', l: 10, w: 3, h: 4, fly: true, color: 0xffffff, unlockAt: 15 },
        { id: 'plane', name: 'Plane', src: 'plane.png', l: 15, w: 10, h: 4, fly: true, color: 0xffffff, unlockAt: 60 },
        { id: 'jet', name: 'Fighter Jet', src: 'fighter_jet.png', l: 12, w: 8, h: 3, fly: true, effect: 'fire', color: 0x666666, unlockAt: 120 }
    ],
    boats: [
        { id: 'speedboat', name: 'Speedboat', src: 'boat_speedboat.png', l: 6, w: 2.5, h: 2, type: 'boat', color: 0xffffff, unlockAt: 10 },
        { id: 'yacht', name: 'Yacht', src: 'boat_yacht.png', l: 12, w: 4, h: 5, type: 'boat', color: 0xeeeeee, unlockAt: 40 }
    ],
    disasters: [
        { id: 'tornado', name: 'Tornado', type: 'disaster', src: 'asset_lock_overlay.png', unlockAt: 5 },
        { id: 'meteor', name: 'Meteor', type: 'disaster', src: 'asset_lock_overlay.png', unlockAt: 15 },
        { id: 'tsunami', name: 'Tsunami', type: 'disaster', src: 'asset_lock_overlay.png', unlockAt: 30 }
    ]
};

const SOUNDS = {
    smash: new Audio('smash.mp3'),
    click: new Audio('click.mp3'),
    glass: new Audio('glass_break.mp3'),
    explosion: new Audio('explosion.mp3')
};

// --- GAME STATE ---
let scene, camera, renderer, world;
let controls;
let objects = []; // { mesh, body, type }
let isDarkMode = true;
let destructionCount = 0;
let textureLoader;
let particles = [];
let waterMesh = null;
let trees = [];
let selectedBody = null; // Currently controlled vehicle for driving
let menuSelectedObj = null; // Object selected for menu actions
let selectionHelper = null;
let isDriving = false; // Manual drive toggle
let disasters = []; // Active disasters
let objectsToRemove = []; // Safe removal queue

// Diorama variables
let dioramaScene = null;

const keys = { w: false, a: false, s: false, d: false };

// Triple Tap State
let lastTapTime = 0;
let tapCount = 0;
const TAP_DELAY = 400; // ms

// Physics time step
const timeStep = 1 / 60;

// Init
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 20, 100);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 20);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Light
    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    // Physics World
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
    });

    // Texture Loader
    textureLoader = new THREE.TextureLoader();

    // Selection Helper
    selectionHelper = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1,1,1)), 0xffff00);
    selectionHelper.material.depthTest = false;
    selectionHelper.material.transparent = true;
    selectionHelper.visible = false;
    scene.add(selectionHelper);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Window Resize
    window.addEventListener('resize', onWindowResize);

    // Controls Listeners
    window.addEventListener('keydown', (e) => {
        if(e.key.toLowerCase() === 'w') keys.w = true;
        if(e.key.toLowerCase() === 'a') keys.a = true;
        if(e.key.toLowerCase() === 's') keys.s = true;
        if(e.key.toLowerCase() === 'd') keys.d = true;
    });
    window.addEventListener('keyup', (e) => {
        if(e.key.toLowerCase() === 'w') keys.w = false;
        if(e.key.toLowerCase() === 'a') keys.a = false;
        if(e.key.toLowerCase() === 's') keys.s = false;
        if(e.key.toLowerCase() === 'd') keys.d = false;
    });

    // Load Progress
    loadProgress();

    // Add Drive Button Logic
    const driveBtn = document.getElementById('drive-btn');
    driveBtn.onclick = () => {
        isDriving = !isDriving;
        driveBtn.classList.toggle('active-drive');
        
        if (isDriving) {
            // Find nearest vehicle if none selected
            if (!selectedBody && objects.length > 0) {
                 // Simple pick first for now
                 selectedBody = objects[0].body;
                 updateSelectionVisual();
            }
        }
    };

    // Start Loop
    animate();
}

function loadProgress() {
    const saved = localStorage.getItem('smashSandboxProgress');
    if (saved) {
        destructionCount = parseInt(saved, 10);
        if (isNaN(destructionCount)) destructionCount = 0;
    }
    updateDestructionDisplay();
}

function saveProgress() {
    localStorage.setItem('smashSandboxProgress', destructionCount.toString());
    updateDestructionDisplay();
    renderInventory(); // Refresh locks
}

function incrementDestruction() {
    destructionCount++;
    saveProgress();
}

function updateDestructionDisplay() {
    const scoreEl = document.getElementById('score-display');
    if(scoreEl) scoreEl.textContent = `Destroyed: ${destructionCount}`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- MAP MANAGEMENT ---
function loadMap(type) {
    // Clear old objects
    objects.forEach(obj => {
        scene.remove(obj.mesh);
        world.removeBody(obj.body);
    });
    objects = [];
    objectsToRemove = [];

    // Clear Diorama objects
    if (dioramaScene) {
        dioramaScene.objects.forEach(d => {
            scene.remove(d.mesh);
            world.removeBody(d.body);
        });
        dioramaScene = null;
    }
    
    // Clear simple arrays
    waterMesh = null;
    trees = [];

    // Clear static map objects (except lights/cameras)
    scene.children = scene.children.filter(c => c.isLight || c.isCamera);

    // Add Floor
    const groundMat = new CANNON.Material();
    let groundColor = isDarkMode ? 0x222222 : 0x888888;
    let floorTexture = null;
    
    // Custom Map Logic
    if (type === 'city' || type === 'nyc' || type === 'la') {
        createCityEnvironment(type);
    } else if (type === 'racetrack') {
        createRacetrack();
        groundColor = 0x333333;
    } else if (type === 'subway') {
        createSubwayEnvironment();
        groundColor = 0x111111;
    } else if (type === 'beach') {
        createBeachEnvironment();
        groundColor = 0xffffff;
        floorTexture = textureLoader.load('sand.png');
        if(floorTexture) {
            floorTexture.wrapS = THREE.RepeatWrapping;
            floorTexture.wrapT = THREE.RepeatWrapping;
            floorTexture.repeat.set(10, 10);
        }
    } else {
        // Plane/Empty
    }

    // Base Floor (Infinite-ish)
    let floorGeo = new THREE.PlaneGeometry(200, 200);
    
    // Globe Map Exception
    if (type === 'globe') {
        floorGeo = new THREE.SphereGeometry(40, 32, 32);
        const globeMat = new THREE.MeshStandardMaterial({ color: 0x228822, flatShading: true });
        const globeMesh = new THREE.Mesh(floorGeo, globeMat);
        globeMesh.receiveShadow = true;
        scene.add(globeMesh);
        
        const globeBody = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(40) });
        world.addBody(globeBody);
        
        // No plane floor for globe
    } else {
        const floorMeshMat = new THREE.MeshStandardMaterial({ 
            color: groundColor, 
            roughness: 0.8,
            map: floorTexture
        });
        
        const floorMesh = new THREE.Mesh(floorGeo, floorMeshMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        scene.add(floorMesh);

        const groundBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
            material: groundMat
        });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(groundBody);
    }
    
    // Create "TV on the wall" (Diorama)
    createDiorama();
    
    if (type === 'house') {
        createHouseEnvironment();
    }
    
    // Animate texture if it's sand (hacky check)
    if(type === 'beach' && floorTexture) {
         // sand doesn't need much animation, but okay
    }
}

function createCityEnvironment(type) {
    const buildingTex = textureLoader.load('building.png');
    buildingTex.wrapS = THREE.RepeatWrapping;
    buildingTex.wrapT = THREE.RepeatWrapping;

    // Random buildings
    for(let i=0; i<30; i++) {
        const h = 10 + Math.random() * 30;
        const w = 5 + Math.random() * 10;
        const d = 5 + Math.random() * 10;
        const x = (Math.random() - 0.5) * 150;
        const z = (Math.random() - 0.5) * 150;
        
        // Don't spawn in center
        if(Math.abs(x) < 20 && Math.abs(z) < 20) continue;

        const body = new CANNON.Body({
            mass: 0, // Static
            position: new CANNON.Vec3(x, h/2, z),
            shape: new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2))
        });
        world.addBody(body);

        // Adjust texture repeat based on size
        const instanceTex = buildingTex.clone();
        instanceTex.repeat.set(1, h/5);

        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ 
                color: 0x888899,
                map: instanceTex
            })
        );
        mesh.position.copy(body.position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }
}

function createBeachEnvironment() {
    // Water
    const waterTex = textureLoader.load('water_texture.png');
    waterTex.wrapS = THREE.RepeatWrapping;
    waterTex.wrapT = THREE.RepeatWrapping;
    waterTex.repeat.set(5, 2);

    const waterGeo = new THREE.PlaneGeometry(200, 100, 64, 32);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0088ff,
        map: waterTex,
        transparent: true,
        opacity: 0.8,
        roughness: 0.05,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, -0.5, -60);
    scene.add(waterMesh);
    
    // Add Water Physics plane (sensor)
    // We don't add a solid body because we want things to float or sink, handled in update

    // Tan Sand
    // We assume the floor map is set, but let's override ground color
    scene.children.forEach(c => {
        if(c.geometry && c.geometry.type === 'PlaneGeometry' && c !== waterMesh) {
            c.material.color.setHex(0xd2b48c); // Tan
        }
    });

    // Palm Trees (Hard Wind)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22aa22, side: THREE.DoubleSide });

    for(let i=0; i<15; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() * 40) + 10; 

        const h = 6 + Math.random() * 4;
        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(x, h/2, z),
            shape: new CANNON.Box(new CANNON.Vec3(0.5, h/2, 0.5))
        });
        world.addBody(body);

        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, h, 8);
        const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
        trunkMesh.position.copy(body.position);
        trunkMesh.castShadow = true;
        scene.add(trunkMesh);

        const leavesGroup = new THREE.Group();
        leavesGroup.position.set(0, h/2, 0);
        trunkMesh.add(leavesGroup);

        for(let l=0; l<6; l++) {
            const leafGeo = new THREE.PlaneGeometry(3, 1);
            leafGeo.translate(1.5, 0, 0);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.rotation.y = (l / 6) * Math.PI * 2;
            leaf.rotation.z = 0.2;
            leavesGroup.add(leaf);
        }
        
        trees.push({ group: leavesGroup, offset: Math.random() * 100, type: 'palm' });
    }
}

function createHouseEnvironment() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x654321 });

    // Walls
    const walls = [
        { x: 0, z: -20, w: 40, d: 2 },
        { x: 0, z: 20, w: 40, d: 2 },
        { x: -20, z: 0, w: 2, d: 40 },
        { x: 20, z: 0, w: 2, d: 40 }
    ];

    walls.forEach(cfg => {
        const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(cfg.x, 2.5, cfg.z) });
        body.addShape(new CANNON.Box(new CANNON.Vec3(cfg.w/2, 2.5, cfg.d/2)));
        world.addBody(body);
        
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, 5, cfg.d), wallMat);
        mesh.position.copy(body.position);
        mesh.castShadow = true;
        scene.add(mesh);
    });
    
    // Furniture Obstacles
    for(let i=0; i<5; i++) {
        const size = 2 + Math.random()*2;
        const x = (Math.random()-0.5)*30;
        const z = (Math.random()-0.5)*30;
        const body = new CANNON.Body({ mass: 10, position: new CANNON.Vec3(x, size/2, z) });
        body.addShape(new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2)));
        world.addBody(body);
        
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({color: 0x553311}));
        mesh.position.copy(body.position);
        mesh.castShadow = true;
        scene.add(mesh);
        objects.push({mesh, body, data: {type: 'prop'}});
    }
}

function createDiorama() {
    // "TV on the wall" - A box room floating nearby that acts as the "screen"
    // Position it at a location visible from center but restricted
    const pos = new THREE.Vector3(0, 15, -60); // In the sky or wall
    
    // The "Frame"
    const frameGeo = new THREE.BoxGeometry(42, 26, 2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.copy(pos);
    scene.add(frame);
    
    // The "Screen" / Glass
    const screenGeo = new THREE.PlaneGeometry(40, 24);
    const screenMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.1, 
        transmission: 0.9, 
        roughness: 0 
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.copy(pos);
    screenMesh.position.z += 1.1;
    scene.add(screenMesh);
    
    // The "Room" behind
    const roomGeo = new THREE.BoxGeometry(40, 24, 20);
    // Invert normal? No, just a box behind.
    const roomMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, side: THREE.BackSide });
    const roomBox = new THREE.Mesh(roomGeo, roomMat);
    roomBox.position.copy(pos);
    roomBox.position.z -= 10; // Behind frame
    scene.add(roomBox);
    
    // Invisible Wall Collision
    const wallBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(pos.x, pos.y, pos.z + 2) });
    wallBody.addShape(new CANNON.Box(new CANNON.Vec3(25, 25, 1)));
    world.addBody(wallBody);
    
    // Spawn chaotic elements inside the Diorama
    // These are purely visual or simple physics bodies that don't interact with main game
    // For simplicity, we'll just spawn regular objects into the world but constrain them to that box
    // and make them do crazy stuff in update
    
    dioramaScene = {
        center: new CANNON.Vec3(pos.x, pos.y, pos.z - 10),
        bounds: { x: 20, y: 12, z: 10 },
        objects: []
    };
    
    // Add some random vehicles to the diorama
    for(let i=0; i<5; i++) {
        spawnDioramaObject();
    }
}

function spawnDioramaObject() {
    if(!dioramaScene) return;
    const types = ['sedan', 'truck', 'bus', 'boat'];
    const type = types[Math.floor(Math.random()*types.length)];
    // Just reuse spawnVehicle logic but force position? No, spawnVehicle adds to main objects.
    // We want separate tracking.
    // Let's manually create lightweight bodies.
    const size = 2;
    const body = new CANNON.Body({ mass: 100, position: dioramaScene.center.clone() });
    body.position.x += (Math.random()-0.5)*10;
    body.position.y += (Math.random()-0.5)*5;
    body.addShape(new CANNON.Box(new CANNON.Vec3(1,1,1)));
    world.addBody(body);
    
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2,2,2), 
        new THREE.MeshStandardMaterial({ color: Math.random()*0xffffff })
    );
    scene.add(mesh);
    
    dioramaScene.objects.push({ mesh, body });
}

function createRacetrack() {
    // Simple oval walls
    const wallShape = new CANNON.Box(new CANNON.Vec3(20, 2, 1));
    const wallGeo = new THREE.BoxGeometry(40, 4, 2);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x992222 });

    // Inner and Outer loops approximated by blocks
    // Just 4 walls for simplicity in sandbox
    const walls = [
        { x: 0, z: -30, w: 80, d: 2 },
        { x: 0, z: 30, w: 80, d: 2 },
        { x: -40, z: 0, w: 2, d: 60 },
        { x: 40, z: 0, w: 2, d: 60 }
    ];

    walls.forEach(cfg => {
        const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(cfg.x, 2, cfg.z) });
        body.addShape(new CANNON.Box(new CANNON.Vec3(cfg.w/2, 2, cfg.d/2)));
        world.addBody(body);
        
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, 4, cfg.d), wallMat);
        mesh.position.copy(body.position);
        mesh.castShadow = true;
        scene.add(mesh);
    });
}

function createSubwayEnvironment() {
    // Tunnel
    const tunnelGeo = new THREE.CylinderGeometry(20, 20, 200, 32, 1, true);
    tunnelGeo.scale(-1, 1, 1); // Invert faces
    const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.y = 10;
    scene.add(tunnel);

    // Station Platform
    const platGeo = new THREE.BoxGeometry(60, 2, 10);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.set(0, 1, 12);
    scene.add(platform);
    
    const platBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(0, 1, 12) });
    platBody.addShape(new CANNON.Box(new CANNON.Vec3(30, 1, 5)));
    world.addBody(platBody);
    
    // Tracks
    const trackGeo = new THREE.BoxGeometry(200, 0.2, 1);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const track1 = new THREE.Mesh(trackGeo, trackMat);
    track1.position.set(0, 0.1, 0);
    scene.add(track1);
    
    const track2 = new THREE.Mesh(trackGeo, trackMat);
    track2.position.set(0, 0.1, 5);
    scene.add(track2);

    // Light repeating
    for(let i=-4; i<5; i++) {
        const pl = new THREE.PointLight(0xffaa00, 0.5, 30);
        pl.position.set(0, 18, i * 20);
        scene.add(pl);
    }
    
    // Move camera to station
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 5, 0);
}

// --- SPAWNING ---
function spawnVehicle(type) {
    let data = ASSETS.cars.find(c => c.id === type) || ASSETS.trains.find(t => t.id === type) || ASSETS.air.find(a => a.id === type);
    if (!data) return;

    // Load texture
    textureLoader.load(data.src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        
        // Materials for Box: Right, Left, Top, Bottom, Front, Back
        // Standard mapping for BoxGeometry(w, h, d):
        // 0: +x (Right)
        // 1: -x (Left)
        // 2: +y (Top)
        // 3: -y (Bottom)
        // 4: +z (Front)
        // 5: -z (Back)
        
        // Our 'Length' is X. 'Width' is Z. 'Height' is Y.
        // So Side View is on Z faces? No.
        // If the car drives along X (usually), then Side view is on Z faces.
        // Let's assume car forward is +X or -X.
        // Based on previous code: materials[4] and [5] were 'sideMat'.
        // So Z faces are sides. X faces are Front/Back.
        
        const col = data.color || 0xcccccc;
        const sideMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
        
        // Top/Bottom colors from vehicle color
        const topMat = new THREE.MeshStandardMaterial({ color: col });
        const bottomMat = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Dark chassis

        // If it's a train, put the train image on top too
        let realTopMat = topMat;
        if(data.type === 'train') {
             const trainTopTex = tex.clone();
             trainTopTex.rotation = Math.PI/2; 
             realTopMat = new THREE.MeshStandardMaterial({ map: trainTopTex });
        }
        
        // Front Texture
        let frontTexture = null;
        if(data.special === 'nyc') {
            frontTexture = textureLoader.load('IMG_4426.jpeg');
        } else if(data.front) {
            frontTexture = textureLoader.load(data.front);
        }
        
        const frontMat = frontTexture ? new THREE.MeshStandardMaterial({ map: frontTexture }) : new THREE.MeshStandardMaterial({ color: col });
        const backMat = new THREE.MeshStandardMaterial({ color: col });

        const materials = [
             frontMat, // +x (Front - assuming forward is X)
             backMat,  // -x (Back)
             realTopMat,   // +y (Top)
             bottomMat,// -y (Bottom)
             sideMat,  // +z (Right Side)
             sideMat   // -z (Left Side)
        ];
        
        // Fix texture flipping on one side so it's not mirrored
        // Cloning texture for the other side
        const texFlip = tex.clone();
        texFlip.center.set(0.5, 0.5);
        texFlip.repeat.set(-1, 1);
        materials[5] = new THREE.MeshStandardMaterial({ map: texFlip, transparent: true });

        // Geometry: Box
        const geo = new THREE.BoxGeometry(data.l, data.h, data.w); 
        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Physics Body
        const shape = new CANNON.Box(new CANNON.Vec3(data.l/2, data.h/2, data.w/2));
        const body = new CANNON.Body({
            mass: data.type === 'train' ? 5000 : 1500,
            position: new CANNON.Vec3(0, 10, 0),
        });
        body.addShape(shape);
        body.angularDamping = 0.5;
        body.linearDamping = data.fly ? 0.6 : 0.1; 

        // Spawn position Logic
        // "Wherever you go, the cars spawn" -> Raycast from center of screen
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const spawnRay = raycaster.ray;
        const spawnPos = spawnRay.at(15, new THREE.Vector3()); // Default 15 units in front
        
        // Raycast down to find ground if possible
        const downRay = new THREE.Raycaster(spawnPos, new THREE.Vector3(0, -1, 0));
        // We don't have easy access to all static meshes list efficiently here, so simple placement
        
        body.position.set(spawnPos.x, Math.max(5, spawnPos.y), spawnPos.z);
        
        // Disaster logic
        if(data.type === 'disaster') {
            activateDisaster(data.id, spawnPos);
            return; // Don't add to objects list as a vehicle
        }

        // Truck Explosion Tracking
        if(data.type === 'truck') {
            body.smashCount = 0;
            body.isExploded = false;
        }
        
        // Car break logic
        if (data.type !== 'train' && data.type !== 'truck') {
             body.breakThreshold = 25; // Speed to break
        }

        // Collision Event
        body.addEventListener('collide', (e) => {
            const relVel = e.contact.getImpactVelocityAlongNormal();
            
            // Car Shatter
            if (body.breakThreshold && Math.abs(relVel) > body.breakThreshold) {
                if (!obj.markedForRemoval) {
                    obj.markedForRemoval = true;
                    createExplosion(body);
                    objectsToRemove.push(obj);
                    SOUNDS.smash.play().catch(()=>{});
                }
            }
            
            // Train Glass Smash
            if(Math.abs(relVel) > 10) {
                // If this is a car colliding with a train
                const otherBody = e.contact.bi === body ? e.contact.bj : e.contact.bi;
                const otherObj = objects.find(o => o.body === otherBody);
                
                // Identify if 'this' is train and other is car, or vice versa
                const thisIsTrain = data.type === 'train';
                const otherIsTrain = otherObj && otherObj.data.type === 'train';
                
                if((thisIsTrain && !otherIsTrain) || (!thisIsTrain && otherIsTrain)) {
                    createGlassParticles(body.position); // Safe pos
                    if(SOUNDS.glass.paused || SOUNDS.glass.currentTime > 0.1) {
                        SOUNDS.glass.currentTime = 0;
                        SOUNDS.glass.play().catch(()=>{});
                    }
                }
            }

            // Truck Explosion
            if(data.type === 'truck' && Math.abs(relVel) > 15 && !body.isExploded) {
                body.smashCount++;
                if(body.smashCount > 10) {
                    body.isExploded = true;
                    createExplosion(body);
                    incrementDestruction(); // Count truck explosion
                    SOUNDS.explosion.currentTime = 0;
                    SOUNDS.explosion.play().catch(()=>{});
                }
            }
        });

        world.addBody(body);
        scene.add(mesh);
        
        const obj = { mesh, body, data };
        objects.push(obj);
        
        // Select newly spawned vehicle
        selectedBody = body;
    });
}

// --- DRAG INTERACTION & SELECTION ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let draggedBody = null;
let mouseConstraint = null;

function onPointerDown(event) {
    if (event.target.closest('button') || event.target.closest('#inventory-scroll') || event.target.closest('.context-menu')) return;
    
    // Tap Counting
    const now = Date.now();
    if (now - lastTapTime < TAP_DELAY) {
        tapCount++;
    } else {
        tapCount = 1;
    }
    lastTapTime = now;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects.map(o => o.mesh));

    if (intersects.length > 0) {
        // Hit Object
        const obj = objects.find(o => o.mesh === intersects[0].object);
        
        if (tapCount === 3) {
            // Triple Tap on Object
            handleObjectTripleTap(obj);
            tapCount = 0; // Reset
            return;
        }

        // Drag Logic (Single Tap)
        controls.enabled = false;
        if(obj) {
            draggedBody = obj.body;
            selectedBody = obj.body; // Select for driving
            addMouseConstraint(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z, draggedBody);
        }
    } else {
        // Hit Background
        if (tapCount === 3) {
            handleBackgroundTripleTap();
            tapCount = 0;
        }
    }
}

function handleObjectTripleTap(obj) {
    if (!obj) return;
    
    if (menuSelectedObj === obj) {
        // Already selected, triple tap again -> Open Menu
        openVehicleMenu(obj);
    } else {
        // Not selected -> Select it
        menuSelectedObj = obj;
        selectedBody = obj.body; // Also set as driving target
        updateSelectionVisual();
    }
}

function handleBackgroundTripleTap() {
    // "Everybody pops up" -> Global Menu
    menuSelectedObj = null;
    updateSelectionVisual();
    document.getElementById('global-menu').classList.remove('hidden');
}

function updateSelectionVisual() {
    if (menuSelectedObj) {
        selectionHelper.setFromObject(menuSelectedObj.mesh);
        selectionHelper.visible = true;
    } else {
        selectionHelper.visible = false;
    }
}

function onPointerMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (draggedBody && mouseConstraint) {
        raycaster.setFromCamera(mouse, camera);
        const target = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, target);
        
        // Lift slightly so it doesn't scrape
        mouseConstraint.pivotB.set(target.x, target.y + 2, target.z); // Actually pivotB is in world space for this simplified logic?
        // CannonJS mouse constraint logic is complex. Simplified:
        // We update the body position directly or use a spring.
        // Let's use a spring constraint logic manually.
        
        // Better: Just update the constraint pivot
        // In cannon, pivotA is local to body, pivotB is local to bodyB (which is null/world).
        // Wait, standard mouse interaction uses a dummy body.
    }
}

function onPointerUp() {
    controls.enabled = true;
    removeMouseConstraint();
    draggedBody = null;
}

// Simple Mouse Constraint Implementation
let jointBody;
function addMouseConstraint(x, y, z, body) {
    jointBody = new CANNON.Body({ mass: 0 });
    jointBody.position.set(x, y, z);
    jointBody.collisionFilterGroup = 0;
    jointBody.collisionFilterMask = 0;
    world.addBody(jointBody);

    const localPivot = body.pointToLocalFrame(new CANNON.Vec3(x, y, z));
    mouseConstraint = new CANNON.PointToPointConstraint(body, localPivot, jointBody, new CANNON.Vec3(0, 0, 0));
    world.addConstraint(mouseConstraint);
}

function removeMouseConstraint() {
    if (mouseConstraint) {
        world.removeConstraint(mouseConstraint);
        world.removeBody(jointBody);
        mouseConstraint = null;
        jointBody = null;
    }
}

// Move joint body
function moveJointBody(x, y, z) {
    if(jointBody) {
        jointBody.position.set(x, y, z);
        jointBody.quaternion.set(0,0,0,1);
    }
}

// Re-implement move with Raycaster plane intersection
window.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', (e) => {
    onPointerMove(e);
    if(draggedBody) {
        raycaster.setFromCamera(mouse, camera);
        const intersectPoint = new THREE.Vector3();
        // Drag plane at height of object
        dragPlane.constant = -draggedBody.position.y; 
        raycaster.ray.intersectPlane(dragPlane, intersectPoint);
        if(intersectPoint) moveJointBody(intersectPoint.x, intersectPoint.y, intersectPoint.z);
    }
});
window.addEventListener('pointerup', onPointerUp);


function activateDisaster(type, pos) {
    if (type === 'tornado') {
        const t = { type: 'tornado', pos: pos, life: 1000 };
        disasters.push(t);
        // Visual
        const tGeo = new THREE.ConeGeometry(5, 20, 16, 1, true);
        const tMat = new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(tGeo, tMat);
        mesh.position.copy(pos);
        scene.add(mesh);
        t.mesh = mesh;
    } else if (type === 'meteor') {
        for(let i=0; i<5; i++) {
            setTimeout(() => {
                const start = pos.clone().add(new THREE.Vector3((Math.random()-0.5)*20, 50, (Math.random()-0.5)*20));
                const body = new CANNON.Body({ mass: 500, position: new CANNON.Vec3(start.x, start.y, start.z) });
                body.addShape(new CANNON.Sphere(2));
                body.velocity.set(0, -50, 0);
                world.addBody(body);
                const mesh = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff0000 }));
                scene.add(mesh);
                objects.push({ mesh, body, data: { type: 'meteor' } });
            }, i * 500);
        }
    } else if (type === 'tsunami') {
        if(waterMesh) {
            waterMesh.position.y += 10;
        }
    }
}

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    const dt = timeStep;
    world.step(dt);

    // Process removals safe from physics step
    if (objectsToRemove.length > 0) {
        objectsToRemove.forEach(obj => {
            scene.remove(obj.mesh);
            world.removeBody(obj.body);
            // Check selections
            if (selectedBody === obj.body) selectedBody = null;
            if (menuSelectedObj === obj) {
                menuSelectedObj = null;
                updateSelectionVisual();
                document.getElementById('vehicle-menu').classList.add('hidden');
            }
        });
        objects = objects.filter(o => !o.markedForRemoval);
        objectsToRemove = [];
    }

    // Sync mesh with body
    objects.forEach(obj => {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
        
        if (menuSelectedObj === obj && selectionHelper.visible) {
            selectionHelper.update();
        }

        // Anti-Gravity / Flying
        if (obj.noGravity || obj.data.fly) {
             obj.body.applyForce(new CANNON.Vec3(0, 9.82 * obj.body.mass, 0), obj.body.position);
        }

        // Boat Logic
        if (obj.data.type === 'boat') {
            // Check water level
            const inWater = obj.body.position.y < 1; // Approx
            if (inWater) {
                // Buoyancy
                obj.body.applyForce(new CANNON.Vec3(0, 15 * obj.body.mass, 0), obj.body.position);
                obj.body.linearDamping = 0.5;
                obj.body.angularDamping = 0.5;
            } else {
                // On land: Flap around
                if (obj.autoDrive || isDriving) {
                     // Jump randomly
                     if(Math.random() < 0.05) {
                         obj.body.applyImpulse(new CANNON.Vec3(0, 5 * obj.body.mass, 0), obj.body.position);
                         obj.body.torque.x += (Math.random()-0.5) * 1000 * obj.body.mass;
                     }
                }
            }
        }
        
        // Train Logic off-track
        if (obj.data.type === 'train') {
             // Simple "on track" check: is it in the subway map and near y=0? 
             // Or just check if auto driving outside.
             // If auto driving and NOT aligned, flap?
             // Prompt: "when you do auto-drive on trains, not on the train map, they don't move. They just flap around."
             // Assuming "train map" is 'subway'.
             const isSubwayMap = document.querySelector('.map-btn[data-map="subway"]')?.classList.contains('active-map'); // We don't track active map perfectly in var.
             // Let's assume if y > 5 it's not on tracks in subway
             
             if (obj.autoDrive && (obj.body.position.y > 5 || Math.abs(obj.body.position.x) > 100)) { // Arbitrary off-track check
                 if(Math.random() < 0.05) {
                     obj.body.torque.z += (Math.random()-0.5) * 5000 * obj.body.mass; // Flap
                 }
             }
        }

        // Auto Drive / Manual Drive Handling
        const isSelectedForDrive = (selectedBody === obj.body && isDriving);
        
        if (obj.autoDrive || isSelectedForDrive) {
            // Drive forward in local X
            const speedVal = isSelectedForDrive ? (keys.w ? 1 : (keys.s ? -1 : 0)) : 1;
            const turnVal = isSelectedForDrive ? (keys.a ? 1 : (keys.d ? -1 : 0)) : (Math.random() < 0.02 ? (Math.random()-0.5) : 0);
            
            if (speedVal !== 0) {
                const speed = 4000 * obj.body.mass * dt * speedVal;
                const force = new CANNON.Vec3(speed, 0, 0);
                
                // For boats in water or cars on ground
                if (obj.data.type === 'boat' && obj.body.position.y > 1) {
                    // Boat on land - no drive
                } else {
                    const worldForce = obj.body.quaternion.vmult(force);
                    obj.body.applyForce(worldForce, obj.body.position);
                }
            }
            
            if (turnVal !== 0) {
                 obj.body.torque.y += turnVal * 200 * obj.body.mass;
            }
            
            // Car Drift Logic (Side friction reduction)
            // Cannon materials are hard to update per frame, so we apply side-slip compensation manually?
            // Or just apply torque for drift.
        }
        
        // Jet Fire Effect
        if(obj.data.effect === 'fire') {
            createJetFire(obj);
        }
        
        // Break sound/logic on high impact
        const vel = obj.body.velocity.length();
        if (obj.lastVel && Math.abs(vel - obj.lastVel) > 10) { 
             if (!obj.immortal && (SOUNDS.smash.paused || SOUNDS.smash.currentTime > 0.5)) {
                SOUNDS.smash.currentTime = 0;
                SOUNDS.smash.volume = Math.min(1, Math.abs(vel - obj.lastVel) / 30);
                SOUNDS.smash.play().catch(e=>{});
            }
        }
        obj.lastVel = vel;
    });

    // Disasters Logic
    disasters.forEach(d => {
        if (d.type === 'tornado') {
            d.mesh.rotation.y += 0.2;
            // Suck objects
            objects.forEach(obj => {
                const dist = obj.body.position.vsub(d.pos);
                if (dist.length() < 30) {
                    const force = dist.clone();
                    force.normalize();
                    force.scale(-200 * obj.body.mass, force); // Pull
                    // Spin
                    const spin = new CANNON.Vec3(-dist.z, 0, dist.x);
                    spin.normalize();
                    spin.scale(200 * obj.body.mass, spin);
                    
                    obj.body.applyForce(force.vadd(spin), obj.body.position);
                    obj.body.applyForce(new CANNON.Vec3(0, 100 * obj.body.mass, 0), obj.body.position); // Lift
                }
            });
        }
    });
    
    // Update Diorama
    if (dioramaScene) {
        dioramaScene.objects.forEach(doj => {
            doj.mesh.position.copy(doj.body.position);
            doj.mesh.quaternion.copy(doj.body.quaternion);
            
            // Constrain to box
            const b = dioramaScene.bounds;
            const c = dioramaScene.center;
            const p = doj.body.position;
            
            if (p.x > c.x + b.x) doj.body.velocity.x = -10;
            if (p.x < c.x - b.x) doj.body.velocity.x = 10;
            if (p.y > c.y + b.y) doj.body.velocity.y = -10;
            if (p.y < c.y - b.y) doj.body.velocity.y = 10;
            if (p.z > c.z + b.z) doj.body.velocity.z = -10;
            if (p.z < c.z - b.z) doj.body.velocity.z = 10;
            
            // Random Chaos
            if(Math.random() < 0.1) {
                doj.body.applyImpulse(new CANNON.Vec3((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100), p);
            }
        });
    }

    // Update Particles
    updateParticles();

    // Animate Water/Trees
    const time = Date.now() * 0.001;
    if (waterMesh) {
        if(waterMesh.material.map) {
            waterMesh.material.map.offset.y += 0.002;
            waterMesh.material.map.offset.x = Math.sin(time * 0.5) * 0.05;
        }
        const pos = waterMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i); 
            const z = Math.sin(x * 0.2 + time) * 0.5 + Math.sin(y * 0.3 + time * 0.5) * 0.5;
            pos.setZ(i, z);
        }
        pos.needsUpdate = true;
    }

    if (trees.length > 0) {
        trees.forEach(tree => {
            // Hard Wind
            const wind = Math.sin(time * 5 + tree.offset) * 0.5 + 0.5; // Stronger
            tree.group.rotation.x = wind;
            tree.group.rotation.z = Math.cos(time * 3 + tree.offset) * 0.2;
        });
    }

    controls.update();
    renderer.render(scene, camera);
}



// --- PARTICLES ---
function createJetFire(obj) {
    if(Math.random() > 0.3) return; // Limit spawn rate
    
    // Jet is Box(12, 3, 8). 
    // Assumes forward is +X. Back is -X.
    // Spawn at local (-6, 0, 0).
    const localPos = new CANNON.Vec3(-6, 0, 0);
    const worldPos = obj.body.pointToWorldFrame(localPos);
    
    const p = {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 })
        ),
        life: 1.0,
        vel: new THREE.Vector3(0,0,0)
    };
    p.mesh.position.copy(worldPos);
    scene.add(p.mesh);
    particles.push(p);
}

function createExplosion(body) {
    for(let i=0; i<30; i++) {
        const p = {
            mesh: new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 1 })
            ),
            life: 2.0 + Math.random(),
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 1,
                (Math.random()) * 1,
                (Math.random() - 0.5) * 1
            )
        };
        p.mesh.position.copy(body.position);
        p.mesh.position.x += (Math.random()-0.5)*2;
        p.mesh.position.z += (Math.random()-0.5)*2;
        scene.add(p.mesh);
        particles.push(p);
    }
}

function createGlassParticles(pos) {
    if(!pos) return;
    for(let i=0; i<10; i++) {
        const p = {
            mesh: new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 0.2),
                new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6 })
            ),
            life: 1.5,
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            )
        };
        p.mesh.position.copy(pos);
        scene.add(p.mesh);
        particles.push(p);
    }
}

function updateParticles() {
    for(let i=particles.length-1; i>=0; i--) {
        const p = particles[i];
        p.life -= 0.05;
        p.mesh.scale.multiplyScalar(0.95);
        p.mesh.material.opacity = Math.min(1, p.life);
        if(p.vel) {
            p.mesh.position.add(p.vel);
            p.vel.y -= 0.01; // Gravity
        }
        if(p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}


// --- UI LOGIC ---

// Menu Flow
const menuLayer = document.getElementById('menu-layer');
const mainMenu = document.getElementById('main-menu');
const mapSel = document.getElementById('map-selection');
const gameUI = document.getElementById('game-ui');

document.getElementById('play-btn').onclick = () => {
    mainMenu.classList.add('hidden');
    mapSel.classList.remove('hidden');
};

document.getElementById('back-btn').onclick = () => {
    mapSel.classList.add('hidden');
    mainMenu.classList.remove('hidden');
};

document.querySelectorAll('.map-btn').forEach(btn => {
    btn.onclick = () => {
        const mapType = btn.dataset.map;
        menuLayer.classList.add('hidden');
        gameUI.classList.remove('hidden');
        loadMap(mapType);
    };
});

document.getElementById('exit-btn').onclick = () => {
    gameUI.classList.add('hidden');
    menuLayer.classList.remove('hidden');
    mainMenu.classList.remove('hidden');
    mapSel.classList.add('hidden');
};

// Inventory Generation
const inventoryGrid = document.getElementById('inventory-grid');
const tabs = document.querySelectorAll('.tab-btn');
let currentCategory = 'cars';

function renderInventory() {
    inventoryGrid.innerHTML = '';
    const items = ASSETS[currentCategory];

    items.forEach(item => {
        const isLocked = destructionCount < (item.unlockAt || 0);
        const div = document.createElement('div');
        div.className = 'inv-item';
        
        if (isLocked) {
            div.classList.add('locked');
            div.innerHTML = `
                <img src="lock_overlay.png" alt="Locked">
                <span style="color: #ff4444">Kills: ${item.unlockAt}</span>
            `;
            // No onclick for locked items
        } else {
            div.innerHTML = `
                <img src="${item.src}" alt="${item.name}">
                <span>${item.name}</span>
            `;
            div.onclick = () => {
                SOUNDS.click.currentTime = 0;
                SOUNDS.click.play().catch(e => {});
                spawnVehicle(item.id);
            };
        }
        inventoryGrid.appendChild(div);
    });
}

tabs.forEach(tab => {
    tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.category;
        renderInventory();
    };
});

document.getElementById('reset-btn').onclick = () => {
    resetAll();
};

function resetAll() {
    objects.forEach(obj => {
        scene.remove(obj.mesh);
        world.removeBody(obj.body);
    });
    objects = [];
    menuSelectedObj = null;
    updateSelectionVisual();
    document.getElementById('vehicle-menu').classList.add('hidden');
    document.getElementById('global-menu').classList.add('hidden');
}

// --- MENU ACTIONS ---

// Close Buttons
document.querySelectorAll('.close-menu-btn').forEach(btn => {
    btn.onclick = () => {
        document.getElementById('vehicle-menu').classList.add('hidden');
        document.getElementById('global-menu').classList.add('hidden');
    };
});

// Vehicle Menu Functions
function openVehicleMenu(obj) {
    const menu = document.getElementById('vehicle-menu');
    menu.classList.remove('hidden');
    
    // Update button states
    updateMenuButtonState('vm-freeze', obj.body.type === CANNON.Body.STATIC);
    updateMenuButtonState('vm-drive', obj.autoDrive);
    updateMenuButtonState('vm-visible', !obj.mesh.visible); // Button says Invisible, active if not visible
    updateMenuButtonState('vm-immortal', obj.immortal);
    updateMenuButtonState('vm-gravity', obj.noGravity);
    updateMenuButtonState('vm-collision', !obj.body.collisionResponse);
    
    // Assign Click Handlers
    document.getElementById('vm-freeze').onclick = () => {
        if(obj.body.type === CANNON.Body.STATIC) {
            obj.body.type = CANNON.Body.DYNAMIC;
            obj.body.mass = obj.data.type === 'train' ? 5000 : 1500; // Restore mass
            obj.body.updateMassProperties();
            obj.body.wakeUp();
            updateMenuButtonState('vm-freeze', false);
        } else {
            obj.body.type = CANNON.Body.STATIC;
            obj.body.mass = 0;
            obj.body.updateMassProperties();
            obj.body.velocity.set(0,0,0);
            obj.body.angularVelocity.set(0,0,0);
            updateMenuButtonState('vm-freeze', true);
        }
    };
    
    document.getElementById('vm-destroy').onclick = () => {
        scene.remove(obj.mesh);
        world.removeBody(obj.body);
        objects = objects.filter(o => o !== obj);
        menuSelectedObj = null;
        updateSelectionVisual();
        menu.classList.add('hidden');
        incrementDestruction(); // Count manual destroy
    };
    
    document.getElementById('vm-explode').onclick = () => {
        createExplosion(obj.body);
        incrementDestruction(); // Count manual explode
        SOUNDS.explosion.currentTime = 0;
        SOUNDS.explosion.play().catch(()=>{});
        // Apply force to neighbors
        objects.forEach(other => {
            if(other !== obj) {
                const dist = other.body.position.vsub(obj.body.position);
                const len = dist.length();
                if(len < 20) {
                    dist.normalize();
                    other.body.applyImpulse(dist.scale(50000 / (len+1)), other.body.position);
                }
            }
        });
        // Throw self up
        if(!obj.body.type === CANNON.Body.STATIC) {
             obj.body.applyImpulse(new CANNON.Vec3(0, 50000, 0), obj.body.position);
             obj.body.angularVelocity.set(Math.random()*10, Math.random()*10, Math.random()*10);
        }
    };
    
    document.getElementById('vm-drive').onclick = () => {
        obj.autoDrive = !obj.autoDrive;
        updateMenuButtonState('vm-drive', obj.autoDrive);
    };
    
    document.getElementById('vm-visible').onclick = () => {
        obj.mesh.visible = !obj.mesh.visible;
        updateMenuButtonState('vm-visible', !obj.mesh.visible);
    };
    
    document.getElementById('vm-immortal').onclick = () => {
        obj.immortal = !obj.immortal;
        updateMenuButtonState('vm-immortal', obj.immortal);
    };
    
    document.getElementById('vm-gravity').onclick = () => {
        obj.noGravity = !obj.noGravity;
        updateMenuButtonState('vm-gravity', obj.noGravity);
        if(!obj.noGravity) obj.body.wakeUp();
    };
    
    document.getElementById('vm-collision').onclick = () => {
        obj.body.collisionResponse = !obj.body.collisionResponse;
        updateMenuButtonState('vm-collision', !obj.body.collisionResponse);
    };
}

function updateMenuButtonState(id, isActive) {
    const btn = document.getElementById(id);
    if(isActive) btn.classList.add('active-state');
    else btn.classList.remove('active-state');
}

// Global Menu Functions
document.getElementById('gm-pop').onclick = () => {
    // "Everyone pops up" - Literal Jump
    objects.forEach(obj => {
        if(obj.body.type !== CANNON.Body.STATIC) {
             obj.body.applyImpulse(new CANNON.Vec3(0, obj.body.mass * 15, 0), obj.body.position);
             obj.body.angularVelocity.x += (Math.random()-0.5) * 5;
        }
    });
    document.getElementById('global-menu').classList.add('hidden');
};

document.getElementById('gm-explode').onclick = () => {
    objects.forEach(obj => {
        createExplosion(obj.body);
        incrementDestruction(); // Count all explosions
        if(obj.body.type !== CANNON.Body.STATIC && !obj.immortal) {
             const randDir = new CANNON.Vec3(Math.random()-0.5, Math.random(), Math.random()-0.5);
             randDir.normalize();
             obj.body.applyImpulse(randDir.scale(obj.body.mass * 50), obj.body.position);
        }
    });
    SOUNDS.explosion.currentTime = 0;
    SOUNDS.explosion.play().catch(()=>{});
    document.getElementById('global-menu').classList.add('hidden');
};

document.getElementById('gm-reset').onclick = () => {
    resetAll();
};


// Theme
document.getElementById('theme-btn').onclick = () => {
    isDarkMode = !isDarkMode;
    document.getElementById('theme-btn').textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    scene.background = new THREE.Color(isDarkMode ? 0x111111 : 0xcccccc);
    scene.fog.color = new THREE.Color(isDarkMode ? 0x111111 : 0xcccccc);
};

// Init Everything
init();
renderInventory();