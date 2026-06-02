// Portfolio 3D Scene with PlayCanvas
// Low poly motorcyclist driving through mountains and deserts

const canvas = document.getElementById('application-canvas');

// Check for WebGL support
function checkWebGLSupport() {
    try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        if (!gl) {
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

if (!checkWebGLSupport()) {
    document.getElementById('loading-text').textContent =
        'WebGL is not supported or enabled. Please enable WebGL in Firefox settings or try another browser.';
    document.querySelector('.loading-content h1').textContent = 'WebGL Not Available';
    throw new Error('WebGL not supported');
}

const app = new pc.Application(canvas, {
    graphicsDeviceOptions: {
        alpha: false,
        depth: true,
        stencil: false,
        antialias: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false
    },
    mouse: new pc.Mouse(canvas),
    keyboard: new pc.Keyboard(window),
    touch: new pc.TouchDevice(canvas)
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

window.addEventListener('resize', () => app.resizeCanvas());

// Loading progress
let loadingProgress = 0;
const updateLoadingProgress = (progress, text) => {
    loadingProgress = progress;
    document.getElementById('loading-progress').style.width = progress + '%';
    document.getElementById('loading-text').textContent = text;
};

// Scene setup with fog
app.scene.ambientLight = new pc.Color(0.5, 0.5, 0.6);
app.scene.fog = pc.FOG_LINEAR;
app.scene.fogColor = new pc.Color(0.7, 0.8, 0.9);
app.scene.fogStart = 50;
app.scene.fogEnd = 200;

// Create camera entity
const camera = new pc.Entity('camera');
camera.addComponent('camera', {
    clearColor: new pc.Color(0.7, 0.8, 0.9),
    farClip: 1000
});
app.root.addChild(camera);
camera.setPosition(0, 15, 25);
camera.lookAt(0, 0, 0);

// Directional light (sun) - warmer, more intense
const light = new pc.Entity('light');
light.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1, 0.9, 0.7),
    intensity: 1.5,
    castShadows: true,
    shadowBias: 0.1,
    shadowDistance: 150,
    normalOffsetBias: 0.05
});
app.root.addChild(light);
light.setEulerAngles(50, 45, 0);

// Add fill light (ambient sky light)
const fillLight = new pc.Entity('fill-light');
fillLight.addComponent('light', {
    type: 'directional',
    color: new pc.Color(0.5, 0.6, 0.8),
    intensity: 0.4,
    castShadows: false
});
app.root.addChild(fillLight);
fillLight.setEulerAngles(-30, -45, 0);

updateLoadingProgress(10, 'Creating terrain...');

// Helper function to create low poly materials
const createLowPolyMaterial = (color, emissive = new pc.Color(0, 0, 0)) => {
    const material = new pc.StandardMaterial();
    material.diffuse = color;
    material.emissive = emissive;
    material.specular = new pc.Color(0.1, 0.1, 0.1);
    material.shininess = 10;
    material.update();
    return material;
};

// Define the road path - a scenic highway through desert and mountains
const roadPath = [];
const numRoadPoints = 200;

for (let i = 0; i < numRoadPoints; i++) {
    const t = (i / numRoadPoints) * Math.PI * 2;

    // Create a more interesting path with straights and curves
    // Main oval with varying radius
    const radiusVariation = 70 + Math.sin(t * 3) * 25;
    const angleOffset = Math.sin(t * 2) * 0.8; // Creates S-curves

    const x = Math.sin(t + angleOffset) * radiusVariation;
    const z = Math.cos(t + angleOffset) * radiusVariation * 0.7; // Oval shape

    // Add some interesting detours
    const detourX = Math.sin(t * 5) * 15 * Math.sin(t);
    const detourZ = Math.cos(t * 4) * 12 * Math.cos(t);

    // Height varies dramatically - creates mountain passes and desert valleys
    let y = 1;

    // Desert valley (0 to 0.25)
    if (t < Math.PI * 0.5) {
        y = 1 + Math.sin(t * 4) * 2;
    }
    // Climbing to mountains (0.25 to 0.5)
    else if (t < Math.PI) {
        const climb = (t - Math.PI * 0.5) / (Math.PI * 0.5);
        y = 1 + climb * climb * 30; // Exponential climb
    }
    // Mountain plateau with dips (0.5 to 0.75)
    else if (t < Math.PI * 1.5) {
        y = 30 + Math.sin((t - Math.PI) * 8) * 5;
    }
    // Descending back to desert (0.75 to 1.0)
    else {
        const descend = (t - Math.PI * 1.5) / (Math.PI * 0.5);
        y = 30 - descend * descend * 29;
    }

    roadPath.push(new pc.Vec3(x + detourX, y, z + detourZ));
}

// Function to get position and direction on road at parameter t (0 to 1)
const getRoadPoint = (t) => {
    t = t % 1;
    const index = Math.floor(t * roadPath.length);
    const nextIndex = (index + 1) % roadPath.length;
    const localT = (t * roadPath.length) % 1;

    const p1 = roadPath[index];
    const p2 = roadPath[nextIndex];

    return {
        position: new pc.Vec3(
            p1.x + (p2.x - p1.x) * localT,
            p1.y + (p2.y - p1.y) * localT,
            p1.z + (p2.z - p1.z) * localT
        ),
        direction: new pc.Vec3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize()
    };
};

// Create road mesh with center line markings
const createRoad = () => {
    const road = new pc.Entity('road');
    const roadWidth = 4;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colors = [];

    for (let i = 0; i < roadPath.length; i++) {
        const p1 = roadPath[i];
        const p2 = roadPath[(i + 1) % roadPath.length];

        const forward = new pc.Vec3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();
        const right = new pc.Vec3(-forward.z, 0, forward.x).normalize();

        const left = new pc.Vec3(
            p1.x + right.x * roadWidth,
            p1.y + 0.05,
            p1.z + right.z * roadWidth
        );
        const center = new pc.Vec3(p1.x, p1.y + 0.05, p1.z);
        const rightPos = new pc.Vec3(
            p1.x - right.x * roadWidth,
            p1.y + 0.05,
            p1.z - right.z * roadWidth
        );

        positions.push(left.x, left.y, left.z);
        positions.push(center.x, center.y, center.z);
        positions.push(rightPos.x, rightPos.y, rightPos.z);

        normals.push(0, 1, 0);
        normals.push(0, 1, 0);
        normals.push(0, 1, 0);

        uvs.push(0, i / roadPath.length);
        uvs.push(0.5, i / roadPath.length);
        uvs.push(1, i / roadPath.length);

        // Dark asphalt with yellow center line dashes
        const isLineSegment = (i % 6 < 3); // Dashed line pattern
        colors.push(0.15, 0.15, 0.15, 1);
        colors.push(isLineSegment ? 0.9 : 0.15, isLineSegment ? 0.8 : 0.15, isLineSegment ? 0.1 : 0.15, 1);
        colors.push(0.15, 0.15, 0.15, 1);
    }

    for (let i = 0; i < roadPath.length; i++) {
        const i0 = i * 3;
        const i1 = i0 + 1;
        const i2 = i0 + 2;
        const i3 = ((i + 1) % roadPath.length) * 3;
        const i4 = i3 + 1;
        const i5 = i3 + 2;

        indices.push(i0, i3, i1);
        indices.push(i1, i3, i4);
        indices.push(i1, i4, i2);
        indices.push(i2, i4, i5);
    }

    const mesh = pc.createMesh(app.graphicsDevice, positions, {
        normals: normals,
        uvs: uvs,
        colors: colors,
        indices: indices
    });

    road.addComponent('render', {
        type: 'asset',
        meshInstances: [new pc.MeshInstance(mesh, createLowPolyMaterial(new pc.Color(0.15, 0.15, 0.15)))]
    });

    app.root.addChild(road);
    return road;
};

const road = createRoad();

// Terrain generation - low poly mountains and desert
const createTerrain = () => {
    const terrain = new pc.Entity('terrain');

    const size = 250;
    const segments = 60;
    const heights = [];

    // Generate heightmap with simplex-like noise
    for (let z = 0; z <= segments; z++) {
        for (let x = 0; x <= segments; x++) {
            const px = (x / segments - 0.5) * 2;
            const pz = (z / segments - 0.5) * 2;

            // Multi-octave noise approximation
            let height = 0;
            height += Math.sin(px * 1.5) * Math.cos(pz * 1.5) * 4;
            height += Math.sin(px * 3 + pz * 3) * 2;
            height += Math.sin(px * 6) * Math.cos(pz * 6) * 0.5;

            // Create mountain ranges
            const dist = Math.sqrt(px * px + pz * pz);
            if (dist > 0.5) {
                height += (dist - 0.5) * 20;
            }

            heights.push(Math.max(0, height));
        }
    }

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colors = [];

    for (let z = 0; z <= segments; z++) {
        for (let x = 0; x <= segments; x++) {
            const idx = z * (segments + 1) + x;
            const height = heights[idx];

            const px = (x / segments - 0.5) * size;
            const pz = (z / segments - 0.5) * size;

            positions.push(px, height, pz);
            normals.push(0, 1, 0);
            uvs.push(x / segments, z / segments);

            // Color based on height (sand to rock to snow)
            let r, g, b;
            if (height < 5) {
                // Sandy desert
                r = 0.76 + Math.random() * 0.1;
                g = 0.7 + Math.random() * 0.1;
                b = 0.5 + Math.random() * 0.1;
            } else if (height < 15) {
                // Rocky
                r = 0.5 + Math.random() * 0.1;
                g = 0.45 + Math.random() * 0.1;
                b = 0.4 + Math.random() * 0.1;
            } else {
                // Mountain (darker rock)
                r = 0.35 + Math.random() * 0.1;
                g = 0.3 + Math.random() * 0.1;
                b = 0.25 + Math.random() * 0.1;
            }
            colors.push(r, g, b, 1);
        }
    }

    for (let z = 0; z < segments; z++) {
        for (let x = 0; x < segments; x++) {
            const i0 = z * (segments + 1) + x;
            const i1 = i0 + 1;
            const i2 = i0 + segments + 1;
            const i3 = i2 + 1;

            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    const mesh = pc.createMesh(app.graphicsDevice, positions, {
        normals: normals,
        uvs: uvs,
        colors: colors,
        indices: indices
    });

    terrain.addComponent('render', {
        type: 'asset',
        meshInstances: [new pc.MeshInstance(mesh, createLowPolyMaterial(new pc.Color(0.76, 0.7, 0.5)))]
    });

    app.root.addChild(terrain);
    return terrain;
};

const terrain = createTerrain();
updateLoadingProgress(25, 'Adding desert vegetation...');

// Add cacti in desert areas
const createCactus = (x, z, scale = 1) => {
    const cactus = new pc.Entity('cactus');

    // Main trunk
    const trunk = new pc.Entity('trunk');
    trunk.addComponent('render', {
        type: 'cylinder',
        material: createLowPolyMaterial(new pc.Color(0.2, 0.5, 0.2))
    });
    trunk.setLocalScale(0.3 * scale, 2 * scale, 0.3 * scale);
    trunk.setLocalPosition(0, 1 * scale, 0);

    // Left arm
    const leftArm = new pc.Entity('left-arm');
    leftArm.addComponent('render', {
        type: 'cylinder',
        material: createLowPolyMaterial(new pc.Color(0.2, 0.5, 0.2))
    });
    leftArm.setLocalScale(0.2 * scale, 0.8 * scale, 0.2 * scale);
    leftArm.setLocalPosition(-0.4 * scale, 1.2 * scale, 0);
    leftArm.setLocalEulerAngles(0, 0, 70);

    // Right arm
    const rightArm = new pc.Entity('right-arm');
    rightArm.addComponent('render', {
        type: 'cylinder',
        material: createLowPolyMaterial(new pc.Color(0.2, 0.5, 0.2))
    });
    rightArm.setLocalScale(0.2 * scale, 0.7 * scale, 0.2 * scale);
    rightArm.setLocalPosition(0.4 * scale, 1.5 * scale, 0);
    rightArm.setLocalEulerAngles(0, 0, -80);

    cactus.addChild(trunk);
    cactus.addChild(leftArm);
    cactus.addChild(rightArm);
    cactus.setPosition(x, 0, z);

    app.root.addChild(cactus);
    return cactus;
};

// Add rocks
const createRock = (x, z, scale = 1) => {
    const rock = new pc.Entity('rock');
    rock.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.4 + Math.random() * 0.1, 0.35 + Math.random() * 0.1, 0.3 + Math.random() * 0.1))
    });
    rock.setLocalScale(scale * (1 + Math.random() * 0.5), scale * (0.5 + Math.random() * 0.3), scale * (1 + Math.random() * 0.5));
    rock.setPosition(x, scale * 0.3, z);
    rock.setEulerAngles(Math.random() * 30, Math.random() * 360, Math.random() * 20);

    app.root.addChild(rock);
    return rock;
};

// Randomly place cacti and rocks
for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 80;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    // Add cacti in flatter areas
    if (Math.random() > 0.5) {
        createCactus(x, z, 0.8 + Math.random() * 0.4);
    } else {
        createRock(x, z, 0.8 + Math.random() * 1.2);
    }
}

updateLoadingProgress(35, 'Creating motorcyclist...');

// Create improved low poly motorcyclist
const createMotorcyclist = () => {
    const biker = new pc.Entity('motorcyclist');

    // Motorcycle body - main frame
    const bikeBody = new pc.Entity('bike-body');
    bikeBody.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.15, 0.15, 0.15))
    });
    bikeBody.setLocalScale(1.5, 0.6, 0.8);
    bikeBody.setLocalPosition(0, 0.5, 0);

    // Gas tank
    const gasTank = new pc.Entity('gas-tank');
    gasTank.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.1, 0.1, 0.1))
    });
    gasTank.setLocalScale(0.8, 0.5, 0.6);
    gasTank.setLocalPosition(0, 0.9, 0);

    // Handlebars
    const handlebars = new pc.Entity('handlebars');
    handlebars.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.3, 0.3, 0.3))
    });
    handlebars.setLocalScale(0.1, 0.1, 1.2);
    handlebars.setLocalPosition(0.6, 1, 0);

    // Front wheel
    const frontWheel = new pc.Entity('front-wheel');
    frontWheel.addComponent('render', {
        type: 'cylinder',
        material: createLowPolyMaterial(new pc.Color(0.05, 0.05, 0.05))
    });
    frontWheel.setLocalScale(0.5, 0.18, 0.5);
    frontWheel.setLocalPosition(0.9, 0.25, 0);
    frontWheel.setLocalEulerAngles(0, 0, 90);

    // Back wheel
    const backWheel = new pc.Entity('back-wheel');
    backWheel.addComponent('render', {
        type: 'cylinder',
        material: createLowPolyMaterial(new pc.Color(0.05, 0.05, 0.05))
    });
    backWheel.setLocalScale(0.55, 0.18, 0.55);
    backWheel.setLocalPosition(-0.9, 0.25, 0);
    backWheel.setLocalEulerAngles(0, 0, 90);

    // Exhaust pipe
    const exhaust = new pc.Entity('exhaust');
    exhaust.addComponent('render', {
        type: 'cylinder',
        material: createLowPolyMaterial(new pc.Color(0.4, 0.4, 0.4))
    });
    exhaust.setLocalScale(0.1, 0.6, 0.1);
    exhaust.setLocalPosition(-0.5, 0.3, -0.5);
    exhaust.setLocalEulerAngles(0, 0, 80);

    // Rider torso
    const riderBody = new pc.Entity('rider-body');
    riderBody.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.2, 0.4, 0.7))
    });
    riderBody.setLocalScale(0.6, 0.9, 0.5);
    riderBody.setLocalPosition(-0.1, 1.5, 0);

    // Rider arms
    const leftArm = new pc.Entity('left-arm');
    leftArm.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.2, 0.4, 0.7))
    });
    leftArm.setLocalScale(0.15, 0.6, 0.15);
    leftArm.setLocalPosition(0.2, 1.3, 0.4);
    leftArm.setLocalEulerAngles(45, 0, 0);

    const rightArm = new pc.Entity('right-arm');
    rightArm.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.2, 0.4, 0.7))
    });
    rightArm.setLocalScale(0.15, 0.6, 0.15);
    rightArm.setLocalPosition(0.2, 1.3, -0.4);
    rightArm.setLocalEulerAngles(45, 0, 0);

    // Rider head
    const riderHead = new pc.Entity('rider-head');
    riderHead.addComponent('render', {
        type: 'sphere',
        material: createLowPolyMaterial(new pc.Color(0.85, 0.65, 0.55))
    });
    riderHead.setLocalScale(0.35, 0.35, 0.35);
    riderHead.setLocalPosition(-0.1, 2.1, 0);

    // Helmet with visor
    const helmet = new pc.Entity('helmet');
    helmet.addComponent('render', {
        type: 'sphere',
        material: createLowPolyMaterial(new pc.Color(0.9, 0.1, 0.1))
    });
    helmet.setLocalScale(0.42, 0.38, 0.42);
    helmet.setLocalPosition(-0.1, 2.15, 0);

    // Visor
    const visor = new pc.Entity('visor');
    visor.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.1, 0.1, 0.1))
    });
    visor.setLocalScale(0.38, 0.2, 0.35);
    visor.setLocalPosition(0.05, 2.1, 0);

    biker.addChild(bikeBody);
    biker.addChild(gasTank);
    biker.addChild(handlebars);
    biker.addChild(frontWheel);
    biker.addChild(backWheel);
    biker.addChild(exhaust);
    biker.addChild(riderBody);
    biker.addChild(leftArm);
    biker.addChild(rightArm);
    biker.addChild(riderHead);
    biker.addChild(helmet);
    biker.addChild(visor);

    app.root.addChild(biker);
    biker.setPosition(0, 2, 0);

    return biker;
};

const motorcyclist = createMotorcyclist();
updateLoadingProgress(50, 'Building billboards...');

// Create billboard for projects with improved design
const createBillboard = (title, description, roadT, offset, color) => {
    const billboard = new pc.Entity('billboard-' + title);

    const roadPoint = getRoadPoint(roadT);
    const basePos = roadPoint.position;

    // Offset to the side of the road
    const right = new pc.Vec3(-roadPoint.direction.z, 0, roadPoint.direction.x).normalize();
    const pos = new pc.Vec3(
        basePos.x + right.x * offset,
        basePos.y,
        basePos.z + right.z * offset
    );

    // Double post for stability
    const post1 = new pc.Entity('post1');
    post1.addComponent('render', {
        type: 'cylinder',
        material: createLowPolyMaterial(new pc.Color(0.3, 0.25, 0.2))
    });
    post1.setLocalScale(0.25, 3.5, 0.25);
    post1.setLocalPosition(-1.5, 1.75, 0);

    const post2 = new pc.Entity('post2');
    post2.addComponent('render', {
        type: 'cylinder',
        material: createLowPolyMaterial(new pc.Color(0.3, 0.25, 0.2))
    });
    post2.setLocalScale(0.25, 3.5, 0.25);
    post2.setLocalPosition(1.5, 1.75, 0);

    // Sign board background
    const board = new pc.Entity('board');
    board.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(color, new pc.Color(color.r * 0.15, color.g * 0.15, color.b * 0.15))
    });
    board.setLocalScale(5, 3, 0.3);
    board.setLocalPosition(0, 4.5, 0);

    // Frame around the board
    const frameColor = new pc.Color(0.9, 0.9, 0.9);
    const createFramePiece = (name, scaleX, scaleY, posX, posY) => {
        const piece = new pc.Entity(name);
        piece.addComponent('render', {
            type: 'box',
            material: createLowPolyMaterial(frameColor)
        });
        piece.setLocalScale(scaleX, scaleY, 0.35);
        piece.setLocalPosition(posX, posY, 0);
        return piece;
    };

    const frameTop = createFramePiece('frame-top', 5.2, 0.15, 0, 6.075);
    const frameBottom = createFramePiece('frame-bottom', 5.2, 0.15, 0, 2.925);
    const frameLeft = createFramePiece('frame-left', 0.15, 3, -2.575, 4.5);
    const frameRight = createFramePiece('frame-right', 0.15, 3, 2.575, 4.5);

    // Store data
    board.billboardData = { title, description };

    billboard.addChild(post1);
    billboard.addChild(post2);
    billboard.addChild(board);
    billboard.addChild(frameTop);
    billboard.addChild(frameBottom);
    billboard.addChild(frameLeft);
    billboard.addChild(frameRight);
    billboard.setPosition(pos.x, pos.y, pos.z);

    // Rotate to face the road
    const angle = Math.atan2(roadPoint.direction.x, roadPoint.direction.z) * pc.math.RAD_TO_DEG;
    billboard.setEulerAngles(0, angle + 180, 0);

    app.root.addChild(billboard);
    return billboard;
};

// Create project billboards along the road at key scenic points
const billboards = [
    createBillboard(
        'Robotic Cleaners',
        'Autonomous cleaning robots with advanced navigation and IoT integration',
        0.15, // Desert valley
        18,
        new pc.Color(0.2, 0.6, 0.9)
    ),
    createBillboard(
        'AWS IoT Solutions',
        'Cloud-connected devices and real-time data processing at scale',
        0.35, // Mountain climb
        -18,
        new pc.Color(0.9, 0.5, 0.2)
    ),
    createBillboard(
        'Edge Computing',
        'Distributed computing solutions for real-time processing',
        0.62, // Mountain plateau
        18,
        new pc.Color(0.5, 0.2, 0.8)
    ),
    createBillboard(
        'Mobile Offroading',
        'Work from anywhere with Starlink connectivity and rugged truck setup',
        0.85, // Descending back to desert
        -18,
        new pc.Color(0.8, 0.2, 0.2)
    )
];

updateLoadingProgress(70, 'Adding red truck...');

// Create improved red truck with mobile work setup
const createTruck = () => {
    const truck = new pc.Entity('red-truck');

    // Truck cab - main body
    const cab = new pc.Entity('cab');
    cab.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.85, 0.1, 0.1))
    });
    cab.setLocalScale(2.5, 2.2, 2.5);
    cab.setLocalPosition(0, 1.6, 0);

    // Cab roof
    const cabRoof = new pc.Entity('cab-roof');
    cabRoof.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.75, 0.08, 0.08))
    });
    cabRoof.setLocalScale(2.5, 0.3, 2.2);
    cabRoof.setLocalPosition(0, 2.85, 0.1);

    // Windshield
    const windshield = new pc.Entity('windshield');
    windshield.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.2, 0.3, 0.4))
    });
    windshield.setLocalScale(2.3, 1.5, 0.1);
    windshield.setLocalPosition(0, 2.2, 1.2);
    windshield.setLocalEulerAngles(15, 0, 0);

    // Grille
    const grille = new pc.Entity('grille');
    grille.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.15, 0.15, 0.15))
    });
    grille.setLocalScale(2.2, 0.8, 0.15);
    grille.setLocalPosition(0, 0.9, 1.3);

    // Truck bed
    const bed = new pc.Entity('bed');
    bed.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.75, 0.08, 0.08))
    });
    bed.setLocalScale(2.5, 1.2, 3.5);
    bed.setLocalPosition(0, 1.2, -2.7);

    // Bed sides
    const bedSideL = new pc.Entity('bed-side-left');
    bedSideL.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.7, 0.08, 0.08))
    });
    bedSideL.setLocalScale(0.1, 0.8, 3.5);
    bedSideL.setLocalPosition(1.3, 1.8, -2.7);

    const bedSideR = new pc.Entity('bed-side-right');
    bedSideR.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.7, 0.08, 0.08))
    });
    bedSideR.setLocalScale(0.1, 0.8, 3.5);
    bedSideR.setLocalPosition(-1.3, 1.8, -2.7);

    // Tailgate
    const tailgate = new pc.Entity('tailgate');
    tailgate.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.7, 0.08, 0.08))
    });
    tailgate.setLocalScale(2.5, 0.8, 0.1);
    tailgate.setLocalPosition(0, 1.8, -4.5);

    // Starlink dish with mount
    const starlinkMount = new pc.Entity('starlink-mount');
    starlinkMount.addComponent('render', {
        type: 'cylinder',
        material: createLowPolyMaterial(new pc.Color(0.3, 0.3, 0.3))
    });
    starlinkMount.setLocalScale(0.15, 0.8, 0.15);
    starlinkMount.setLocalPosition(0.7, 2.2, -3);

    const starlink = new pc.Entity('starlink');
    starlink.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.95, 0.95, 0.95))
    });
    starlink.setLocalScale(1.2, 0.12, 1.2);
    starlink.setLocalPosition(0.7, 2.9, -2.8);
    starlink.setLocalEulerAngles(30, 10, 0);

    // Work desk/table setup
    const workTable = new pc.Entity('work-table');
    workTable.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.35, 0.3, 0.25))
    });
    workTable.setLocalScale(1.2, 0.08, 0.8);
    workTable.setLocalPosition(-0.5, 1.9, -2.5);

    // Laptop
    const laptop = new pc.Entity('laptop');
    laptop.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.2, 0.2, 0.2), new pc.Color(0.1, 0.3, 0.6))
    });
    laptop.setLocalScale(0.6, 0.05, 0.5);
    laptop.setLocalPosition(-0.5, 2, -2.5);
    laptop.setLocalEulerAngles(5, 0, 0);

    // Laptop screen
    const screen = new pc.Entity('screen');
    screen.addComponent('render', {
        type: 'box',
        material: createLowPolyMaterial(new pc.Color(0.2, 0.2, 0.2), new pc.Color(0.1, 0.4, 0.7))
    });
    screen.setLocalScale(0.58, 0.45, 0.05);
    screen.setLocalPosition(-0.5, 2.15, -2.7);
    screen.setLocalEulerAngles(70, 0, 0);

    // Wheels with better detail
    const wheelPositions = [
        [1.3, 0.5, 1.2], [-1.3, 0.5, 1.2],
        [1.3, 0.5, -0.5], [-1.3, 0.5, -0.5],
        [1.3, 0.5, -3.2], [-1.3, 0.5, -3.2]
    ];

    wheelPositions.forEach((pos, i) => {
        const wheel = new pc.Entity('wheel-' + i);
        wheel.addComponent('render', {
            type: 'cylinder',
            material: createLowPolyMaterial(new pc.Color(0.08, 0.08, 0.08))
        });
        wheel.setLocalScale(0.65, 0.45, 0.65);
        wheel.setLocalPosition(pos[0], pos[1], pos[2]);
        wheel.setLocalEulerAngles(0, 0, 90);
        truck.addChild(wheel);
    });

    truck.addChild(cab);
    truck.addChild(cabRoof);
    truck.addChild(windshield);
    truck.addChild(grille);
    truck.addChild(bed);
    truck.addChild(bedSideL);
    truck.addChild(bedSideR);
    truck.addChild(tailgate);
    truck.addChild(starlinkMount);
    truck.addChild(starlink);
    truck.addChild(workTable);
    truck.addChild(laptop);
    truck.addChild(screen);

    // Position truck near the Mobile Offroading billboard
    const truckRoadPoint = getRoadPoint(0.85);
    const truckRight = new pc.Vec3(-truckRoadPoint.direction.z, 0, truckRoadPoint.direction.x).normalize();

    truck.setPosition(
        truckRoadPoint.position.x + truckRight.x * 22,
        truckRoadPoint.position.y,
        truckRoadPoint.position.z + truckRight.z * 22
    );

    const truckAngle = Math.atan2(truckRoadPoint.direction.x, truckRoadPoint.direction.z) * pc.math.RAD_TO_DEG;
    truck.setEulerAngles(0, truckAngle + 25, 0);

    app.root.addChild(truck);
    return truck;
};

const redTruck = createTruck();
updateLoadingProgress(85, 'Setting up controls...');

// Camera and movement controls
let cameraAngleX = 0;
let cameraAngleY = 0.3;
let cameraDistance = 25;

const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Mouse controls
let mouseDown = false;
canvas.addEventListener('mousedown', () => mouseDown = true);
canvas.addEventListener('mouseup', () => mouseDown = false);
canvas.addEventListener('mousemove', (e) => {
    if (mouseDown) {
        cameraAngleX -= e.movementX * 0.003;
        cameraAngleY = Math.max(-Math.PI/3, Math.min(Math.PI/3, cameraAngleY - e.movementY * 0.003));
    }
});

// Touch controls for mobile
let lastTouchX = 0;
let lastTouchY = 0;
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
});
canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;
        cameraAngleX -= deltaX * 0.003;
        cameraAngleY = Math.max(-Math.PI/3, Math.min(Math.PI/3, cameraAngleY - deltaY * 0.003));
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
    e.preventDefault();
});

// Scroll to zoom
canvas.addEventListener('wheel', (e) => {
    cameraDistance = Math.max(10, Math.min(60, cameraDistance + e.deltaY * 0.01));
    e.preventDefault();
});

// Billboard interaction
app.mouse.on('mousedown', (event) => {
    const cameraComponent = camera.camera;
    const from = cameraComponent.screenToWorld(event.x, event.y, cameraComponent.nearClip);
    const to = cameraComponent.screenToWorld(event.x, event.y, cameraComponent.farClip);

    const result = app.systems.rigidbody.raycastFirst(from, to);
    if (result && result.entity.billboardData) {
        const data = result.entity.billboardData;
        alert(`${data.title}\n\n${data.description}`);
    }
});

// Motorcycle control variables
let bikeYaw = 0; // Current heading angle
let bikeSpeed = 0; // Current speed
let bikeVelocity = new pc.Vec3(0, 0, 0);
let bikeTurnRate = 0; // For banking calculation
let wheelRotation = 0;

const maxSpeed = 40;
const acceleration = 25;
const deceleration = 15;
const turnSpeed = 120;
const gravity = 30;

// Start position
motorcyclist.setPosition(0, 5, 0);

updateLoadingProgress(100, 'Ready!');

// Hide loading screen
setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
}, 500);

// Helper function to get terrain height at position
const getTerrainHeight = (x, z) => {
    // Simple approximation - matches terrain generation logic
    const px = (x / 250);
    const pz = (z / 250);

    let height = 0;
    height += Math.sin(px * 1.5 * Math.PI * 2) * Math.cos(pz * 1.5 * Math.PI * 2) * 4;
    height += Math.sin((px * 3 + pz * 3) * Math.PI * 2) * 2;
    height += Math.sin(px * 6 * Math.PI * 2) * Math.cos(pz * 6 * Math.PI * 2) * 0.5;

    const dist = Math.sqrt(px * px + pz * pz);
    if (dist > 0.5) {
        height += (dist - 0.5) * 20;
    }

    return Math.max(0, height);
};

// Update loop
app.on('update', (dt) => {
    // Handle input
    let targetSpeed = 0;
    let turning = 0;

    if (keys['w'] || keys['arrowup']) {
        targetSpeed = maxSpeed;
    }
    if (keys['s'] || keys['arrowdown']) {
        targetSpeed = -maxSpeed * 0.5;
    }
    if (keys['a'] || keys['arrowleft']) {
        turning = 1;
    }
    if (keys['d'] || keys['arrowright']) {
        turning = -1;
    }

    // Accelerate/decelerate
    if (targetSpeed > bikeSpeed) {
        bikeSpeed = Math.min(targetSpeed, bikeSpeed + acceleration * dt);
    } else if (targetSpeed < bikeSpeed) {
        bikeSpeed = Math.max(targetSpeed, bikeSpeed - deceleration * dt);
    } else {
        // Natural deceleration when no input
        if (bikeSpeed > 0) {
            bikeSpeed = Math.max(0, bikeSpeed - deceleration * 0.5 * dt);
        } else if (bikeSpeed < 0) {
            bikeSpeed = Math.min(0, bikeSpeed + deceleration * 0.5 * dt);
        }
    }

    // Turn motorcycle
    const speedFactor = Math.abs(bikeSpeed) / maxSpeed;
    bikeTurnRate = turning * turnSpeed * speedFactor * dt;
    bikeYaw += bikeTurnRate;

    // Calculate velocity
    const yawRad = bikeYaw * pc.math.DEG_TO_RAD;
    bikeVelocity.x = Math.sin(yawRad) * bikeSpeed;
    bikeVelocity.z = Math.cos(yawRad) * bikeSpeed;

    // Update position
    const currentPos = motorcyclist.getPosition();
    const newX = currentPos.x + bikeVelocity.x * dt;
    const newZ = currentPos.z + bikeVelocity.z * dt;

    // Get terrain height and apply gravity
    const terrainHeight = getTerrainHeight(newX, newZ);
    let newY = currentPos.y;

    // Simple gravity
    bikeVelocity.y -= gravity * dt;
    newY += bikeVelocity.y * dt;

    // Collision with terrain
    if (newY < terrainHeight + 0.5) {
        newY = terrainHeight + 0.5;
        bikeVelocity.y = 0;
    }

    motorcyclist.setPosition(newX, newY, newZ);

    // Calculate banking based on turn rate
    const bankAngle = -turning * 30 * speedFactor;

    // Calculate pitch from terrain
    const lookAheadDist = 2;
    const futureX = newX + Math.sin(yawRad) * lookAheadDist;
    const futureZ = newZ + Math.cos(yawRad) * lookAheadDist;
    const futureHeight = getTerrainHeight(futureX, futureZ);
    const pitchAngle = Math.atan2(futureHeight - terrainHeight, lookAheadDist) * pc.math.RAD_TO_DEG;

    // Apply rotation
    motorcyclist.setEulerAngles(pitchAngle, bikeYaw, bankAngle);

    // Update camera to follow behind motorcycle
    const camDistance = cameraDistance;
    const camHeight = 8;
    const camX = newX - Math.sin(yawRad) * camDistance * Math.cos(cameraAngleY);
    const camY = newY + camHeight + Math.sin(cameraAngleY) * camDistance;
    const camZ = newZ - Math.cos(yawRad) * camDistance * Math.cos(cameraAngleY);

    camera.setPosition(camX, camY, camZ);
    camera.lookAt(newX, newY + 2, newZ);

    // Animate wheels
    wheelRotation += bikeSpeed * dt * 50;
    motorcyclist.findByName('front-wheel').setLocalEulerAngles(wheelRotation, 0, 90);
    motorcyclist.findByName('back-wheel').setLocalEulerAngles(wheelRotation, 0, 90);
});

app.start();
