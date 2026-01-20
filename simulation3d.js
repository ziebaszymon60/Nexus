/**
 * 🚀 ROCKET SIMULATION - TRUE 3D EDITION (Three.js)
 * Now with 100% more z-axis!
 */

const Simulation = {
    // Three.js Core
    scene: null,
    camera: null,
    renderer: null,
    active: false,

    // Objects
    rocketGroup: null,
    earth: null,
    stars: null,
    sunLight: null,

    // Physics & Game State
    rocket: {
        altitude: 0,
        velocity: 0,
        fuel: 100,
        maxFuel: 100,
        thrust: 0,
        maxThrust: 0,
        weight: 0,
        tiltX: 0, // Tilt forward/back
        tiltZ: 0  // Tilt left/right
    },

    // Controls
    keys: { w: false, a: false, s: false, d: false, space: false },

    init: function () {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.00002);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000000);
        this.camera.position.set(0, 100, 200);
        this.camera.lookAt(0, 50, 0);

        // Renderer
        const canvas = document.getElementById('simCanvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4); // Darker ambient for contrast
        this.scene.add(ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.position.set(100, 500, 200);
        this.sunLight.castShadow = true;
        this.scene.add(this.sunLight);

        // Hemisphere light for nice ground/sky gradient
        const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x000000, 0.3);
        this.scene.add(hemiLight);

        // Environment
        this.createEarth();
        this.createStars();
        this.createLaunchPad();

        // Handle Resize
        window.addEventListener('resize', () => {
            if (!this.active) return;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.bindControls();
    },

    // --- PROCEDURAL TEXTURES ---
    generateNoiseTexture: function (width, height, opacity = 1) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            const val = Math.floor(Math.random() * 255);
            data[i] = val;     // R
            data[i + 1] = val;   // G
            data[i + 2] = val;   // B
            data[i + 3] = opacity * 255; // Alpha
        }

        ctx.putImageData(imgData, 0, 0);
        return new THREE.CanvasTexture(canvas);
    },

    createEarth: function () {
        // High-res sphere
        const geometry = new THREE.SphereGeometry(600000, 256, 256);

        // Procedural Planet Material
        // We use a noisy normal map + specular map to fake continents/ocean reflection
        const noiseTex = this.generateNoiseTexture(1024, 1024, 1);
        noiseTex.wrapS = THREE.RepeatWrapping;
        noiseTex.wrapT = THREE.RepeatWrapping;
        noiseTex.repeat.set(10, 10);

        const material = new THREE.MeshPhongMaterial({
            color: 0x1E4099, // Deep Ocean Blue
            emissive: 0x000510,
            specular: 0x222222,
            shininess: 25,
            bumpMap: noiseTex,
            bumpScale: 500,
            map: noiseTex // Use noise as color variation too to fake clouds/land
        });

        // Hack to make land green/brown by mixing colors (simple tinting via vertex colors is hard here without shaders)
        // Let's stick to a "Blue Marble" style with the noise adding cloud layers
        material.color.setHex(0x2255AA);

        this.earth = new THREE.Mesh(geometry, material);
        this.earth.position.y = -600010;
        this.earth.receiveShadow = true;
        this.earth.rotation.z = 0.4; // Tilt
        this.scene.add(this.earth);

        // Atmosphere Halo
        const atmosGeo = new THREE.SphereGeometry(610000, 64, 64);
        const atmosMat = new THREE.MeshBasicMaterial({
            color: 0x6699FF,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
        atmosphere.position.y = -600010;
        this.scene.add(atmosphere);
    },

    createStars: function () {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        for (let i = 0; i < 5000; i++) {
            const x = (Math.random() - 0.5) * 200000;
            const y = (Math.random() - 0.5) * 100000 + 50000; // Mostly above
            const z = (Math.random() - 0.5) * 200000;
            vertices.push(x, y, z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 200, sizeAttenuation: true });
        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    },

    createLaunchPad: function () {
        // Concrete base
        const geometry = new THREE.CylinderGeometry(40, 50, 10, 32);
        const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const pad = new THREE.Mesh(geometry, material);
        pad.position.y = 5; // Half height
        pad.receiveShadow = true;
        this.scene.add(pad);

        // Launch Tower (Simple)
        const towerGeo = new THREE.BoxGeometry(10, 200, 10);
        const towerMat = new THREE.MeshLambertMaterial({ color: 0xCC3333 }); // Red
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(-40, 100, 0);
        tower.castShadow = true;
        this.scene.add(tower);
    },

    start: function (parts, weight, maxThrust, fuelCap) {
        if (!this.renderer) this.init();

        document.getElementById('simOverlay').style.display = 'flex';
        this.active = true;

        // AUDIO START
        if (typeof AudioSys !== 'undefined') {
            AudioSys.init();
            AudioSys.startEngine();
        }

        // Build the rocket from parts
        this.buildRocket3D(parts);

        // Reset Stats
        this.rocket.altitude = 0;
        this.rocket.velocity = 0;
        this.rocket.fuel = fuelCap;
        this.rocket.maxFuel = fuelCap;
        this.rocket.maxThrust = maxThrust * 1000; // kN -> N
        this.rocket.weight = weight;
        this.rocket.tiltX = 0;
        this.rocket.tiltZ = 0;

        // Start loop
        this.lastTime = performance.now();
        this.loop();
    },

    buildRocket3D: function (parts) {
        if (this.rocketGroup) {
            this.scene.remove(this.rocketGroup);
        }

        this.rocketGroup = new THREE.Group();

        // Create 3D meshes for each 2D part
        // Simple mapping for now
        parts.forEach(part => {
            let mesh;
            const yPos = (11 - part.row) * 15; // Map grid row to Y height

            // Materials
            const hullMat = new THREE.MeshStandardMaterial({ color: 0xEEEEEE, roughness: 0.4, metalness: 0.6 });
            const engineMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
            const noseMat = new THREE.MeshStandardMaterial({ color: 0xCC3333, roughness: 0.3 });
            const shuttleNoseMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3 }); // White shuttle
            const tankMat = new THREE.MeshStandardMaterial({ color: 0xF97316, roughness: 0.5 }); // Orange tank

            if (part.type === 'cockpit') {
                // Cone
                const geo = new THREE.ConeGeometry(5, 15, 32);
                const isShuttle = (part.id || '').toLowerCase().includes('shuttle') || (part.id || '').toLowerCase().includes('mk1');
                mesh = new THREE.Mesh(geo, isShuttle ? shuttleNoseMat : noseMat);
            } else if (part.type === 'engine') {
                // Cylinder + Cone
                const geo = new THREE.CylinderGeometry(2, 4, 10, 32);
                mesh = new THREE.Mesh(geo, engineMat);
            } else if (part.type === 'hull') {
                // Cylinder
                const geo = new THREE.CylinderGeometry(5, 5, 15, 32);
                mesh = new THREE.Mesh(geo, part.id.includes('Tank') ? tankMat : hullMat);
            } else if (part.type === 'wing') {
                // Flat box
                const geo = new THREE.BoxGeometry(10, 15, 2);
                mesh = new THREE.Mesh(geo, hullMat);
                if (part.id.includes('L')) mesh.position.x = -8;
                if (part.id.includes('R')) mesh.position.x = 8;
            }

            if (mesh) {
                // Assuming all parts are stacked vertically for this simple MVP
                // Real builder logic needs smarter coordinate mapping, but let's stack them based on row
                // Actually, the grid is 2D. Let's map grid (row, col) to (y, x)
                // Grid center is col 4 & 5 (0-9). 
                const xOffset = (part.col - 4.5) * 10;

                mesh.position.set(xOffset, yPos, 0);
                mesh.castShadow = true;
                this.rocketGroup.add(mesh);
            }
        });

        // Center the group
        const box = new THREE.Box3().setFromObject(this.rocketGroup);
        const center = box.getCenter(new THREE.Vector3());
        // Adjust pivot to bottom center
        this.rocketGroup.position.y = 10; // Sit on pad

        this.scene.add(this.rocketGroup);
    },

    stop: function () {
        this.active = false;
        document.getElementById('simOverlay').style.display = 'none';
    },

    bindControls: function () {
        window.onkeydown = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w') this.keys.w = true;
            if (k === 'a') this.keys.a = true;
            if (k === 's') this.keys.s = true;
            if (k === 'd') this.keys.d = true;
            if (k === 'escape') this.stop();
        };
        window.onkeyup = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w') this.keys.w = false;
            if (k === 'a') this.keys.a = false;
            if (k === 's') this.keys.s = false;
            if (k === 'd') this.keys.d = false;
        };
    },

    loop: function () {
        if (!this.active) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.updatePhysics(dt);
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(() => this.loop());
    },

    updatePhysics: function (dt) {
        // Physics Logic (Simplified from original)
        const g = 9.8;

        // Thrust
        if (this.keys.w && this.rocket.fuel > 0) {
            this.rocket.thrust = Math.min(this.rocket.thrust + this.rocket.maxThrust * dt, this.rocket.maxThrust);
            this.rocket.fuel -= 10 * dt; // Consumption
        } else {
            this.rocket.thrust = Math.max(0, this.rocket.thrust - this.rocket.maxThrust * dt);
        }

        // AUDIO UPDATE
        if (typeof AudioSys !== 'undefined') {
            // Thrust percentage 0-1
            const thrustPct = this.rocket.thrust / (this.rocket.maxThrust || 1);
            AudioSys.update(thrustPct, this.rocket.velocity, this.rocket.altitude);
        }

        // Acceleration (F=ma => a=F/m)
        const force = this.rocket.thrust;
        const accel = (force / this.rocket.weight) - g;

        // Velocity & Position
        if (this.rocket.altitude > 0 || accel > 0) {
            this.rocket.velocity += accel * dt;
            this.rocket.altitude += this.rocket.velocity * dt;
        }

        // Ground Collision
        if (this.rocket.altitude < 0) {
            this.rocket.altitude = 0;
            this.rocket.velocity = 0;
            this.rocket.thrust = 0;
        }

        // Apply to 3D Object
        if (this.rocketGroup) {
            this.rocketGroup.position.y = 10 + this.rocket.altitude;

            // Tilting
            if (this.keys.a) this.rocket.tiltZ = Math.min(this.rocket.tiltZ + dt, 0.5);
            else if (this.keys.d) this.rocket.tiltZ = Math.max(this.rocket.tiltZ - dt, -0.5);
            else this.rocket.tiltZ *= 0.95; // Auto-center

            this.rocketGroup.rotation.z = this.rocket.tiltZ;
            this.rocketGroup.position.x -= this.rocket.tiltZ * 100 * dt; // Strafe based on tilt
        }

        // Update Earth Rotation
        if (this.earth) {
            this.earth.rotation.y += 0.0001;
        }

        // HUD Update (Basic)
        document.getElementById('simAlt').textContent = Math.floor(this.rocket.altitude);
        document.getElementById('simSpd').textContent = Math.floor(this.rocket.velocity);
        document.getElementById('simFuel').textContent = Math.floor(this.rocket.fuel);
        const fuelBar = document.getElementById('fuelBar');
        if (fuelBar) fuelBar.style.width = (this.rocket.fuel / this.rocket.maxFuel) * 100 + '%';

        // Phase Text
        const phase = this.rocket.altitude > 50000 ? 'SPACE' : (this.rocket.altitude > 1000 ? 'ATMOSPHERE' : 'LIFTOFF');
        document.getElementById('simPhase').textContent = phase;
    },

    updateCamera: function () {
        if (!this.rocketGroup) return;

        // Camera follows smooth
        const targetY = this.rocketGroup.position.y + 50;
        const currentY = this.camera.position.y;
        this.camera.position.y = currentY + (targetY - currentY) * 0.1;

        this.camera.lookAt(this.rocketGroup.position);
    }
};
