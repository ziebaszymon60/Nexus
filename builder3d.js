const Builder = {
    gridSize: { rows: 12, cols: 10 },
    grid: [],
    parts: [],


    init: function () {
        this.renderGrid();
        this.setupDragDrop();
        this.updateStats();

        // Init 3D Preview
        Preview3D.init();
    },

    renderGrid: function () {
        const gridContainer = document.getElementById('buildGrid');
        gridContainer.innerHTML = '';
        this.grid = [];

        for (let r = 0; r < this.gridSize.rows; r++) {
            const row = [];
            for (let c = 0; c < this.gridSize.cols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('click', () => this.handleCellClick(r, c));
                gridContainer.appendChild(cell);
                row.push(null);
            }
            this.grid.push(row);
        }
    },

    setupDragDrop: function () {
        const parts = document.querySelectorAll('.part-item');
        const cells = document.querySelectorAll('.grid-cell');

        parts.forEach(part => {
            part.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('type', part.dataset.type);
                e.dataTransfer.setData('id', part.dataset.id);
                e.dataTransfer.setData('weight', part.dataset.weight);
                e.dataTransfer.setData('thrust', part.dataset.thrust || 0);
                e.dataTransfer.setData('fuelcap', part.dataset.fuelcap || 0);
                e.dataTransfer.setData('svg', part.dataset.svg);
            });
        });

        cells.forEach(cell => {
            cell.addEventListener('dragover', (e) => e.preventDefault());
            cell.addEventListener('drop', (e) => this.handleDrop(e, cell));
        });
    },

    handleDrop: function (e, cell) {
        e.preventDefault();
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);

        if (this.grid[r][c]) return;

        const partData = {
            type: e.dataTransfer.getData('type'),
            id: e.dataTransfer.getData('id'),
            weight: parseInt(e.dataTransfer.getData('weight')),
            thrust: parseInt(e.dataTransfer.getData('thrust')),
            fuelcap: parseInt(e.dataTransfer.getData('fuelcap')),
            svg: e.dataTransfer.getData('svg'),
            row: r,
            col: c
        };

        this.placePart(partData);
    },

    placePart: function (part) {
        this.grid[part.row][part.col] = part;
        this.parts.push(part);

        const cell = document.querySelector(`.grid-cell[data-row="${part.row}"][data-col="${part.col}"]`);

        // Render SVG
        cell.innerHTML = `<svg><use href="#${part.svg}"></use></svg>`;
        cell.classList.add('filled');

        this.updateStats();
        Preview3D.update(this.parts);
    },

    handleCellClick: function (r, c) {
        if (!this.grid[r][c]) return;

        const part = this.grid[r][c];
        this.grid[r][c] = null;
        this.parts = this.parts.filter(p => p !== part);

        const cell = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
        cell.innerHTML = '';
        cell.classList.remove('filled');

        this.updateStats();
        Preview3D.update(this.parts);
    },

    clearGrid: function () {
        this.parts = [];
        this.renderGrid();
        this.setupDragDrop();
        this.updateStats();
        Preview3D.update(this.parts);
    },

    updateStats: function () {
        let totalWeight = 0;
        let totalThrust = 0;
        let totalFuelCap = 0;

        // Base Fuel
        totalFuelCap = 100;

        this.parts.forEach(p => {
            totalWeight += p.weight;
            totalThrust += p.thrust;
            if (p.fuelcap) totalFuelCap += p.fuelcap;
        });

        // Calculations
        // Thrust is in kN. Weight in kg.
        // F = ma. a = F / m.
        // Gravity is approx 10 m/s^2.
        // We need Thrust (N) > Weight (kg) * 9.8 to lift off.
        const gravityForce = totalWeight * 9.8;
        const thrustForce = totalThrust * 1000; // kN to N

        const twRatio = totalWeight > 0 ? thrustForce / gravityForce : 0;
        const maxSpeed = twRatio * 2; // Artificial Mach number estimate

        // DOM Updates
        document.getElementById('statWeight').innerText = `${totalWeight} kg`;
        document.getElementById('barWeight').style.width = `${Math.min(totalWeight / 1000 * 100, 100)}%`;

        document.getElementById('statThrust').innerText = `${totalThrust} kN`;
        document.getElementById('barThrust').style.width = `${Math.min(totalThrust / 5000 * 100, 100)}%`;

        document.getElementById('statFuel').innerText = `${totalFuelCap} L`;
        document.getElementById('barFuel').style.width = `${Math.min(totalFuelCap / 2000 * 100, 100)}%`;

        document.getElementById('statSpeed').innerText = `${maxSpeed.toFixed(1)} Mach`;
        document.getElementById('barSpeed').style.width = `${Math.min(maxSpeed / 10 * 100, 100)}%`;

        // Launch Validation
        const launchBtn = document.getElementById('launchBtn');
        const hasCockpit = this.parts.some(p => p.type === 'cockpit');
        const hasEngine = this.parts.some(p => p.type === 'engine');

        if (hasCockpit && hasEngine && twRatio > 1.0) {
            launchBtn.disabled = false;
            launchBtn.onclick = () => Simulation.start(this.parts, totalWeight, totalThrust, totalFuelCap);
            document.getElementById('buildMessage').innerHTML = '<span style="color: #10B981">SYSTEMS GREEN. READY FOR LAUNCH.</span>';
        } else {
            launchBtn.disabled = true;
            let msg = '❌ STATUS: ';
            if (!hasCockpit) msg += 'NO COCKPIT. ';
            if (!hasEngine) msg += 'NO ENGINE. ';
            if (hasEngine && twRatio <= 1.0) msg += 'T/W RATIO < 1 (TOO HEAVY).';
            document.getElementById('buildMessage').innerHTML = `<span style="color: #EF4444">${msg}</span>`;
        }
    }
};

const Preview3D = {
    scene: null,
    camera: null,
    renderer: null,
    rocketGroup: null,

    init: function () {
        const container = document.getElementById('rocketPreview');
        if (!container) return;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0F172A); // Match dark theme

        this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 50, 100);
        this.camera.lookAt(0, 40, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 20);
        this.scene.add(dirLight);

        // Ground Grid
        const grid = new THREE.GridHelper(100, 10, 0x334155, 0x1E293B);
        this.scene.add(grid);

        this.animate();
    },

    update: function (parts) {
        if (!this.scene) return;

        if (this.rocketGroup) {
            this.scene.remove(this.rocketGroup);
        }

        this.rocketGroup = new THREE.Group();

        // Exact same logic as Simulation.buildRocket3D but for preview
        // We reuse the logic by duplicating it or making it shared. 
        // For now, let's duplicate the simple mapping for safety and autonomy
        parts.forEach(part => {
            let mesh;
            const yPos = (11 - part.row) * 15; // Map grid row to Y height

            // Materials
            const hullMat = new THREE.MeshStandardMaterial({ color: 0xEEEEEE, roughness: 0.4, metalness: 0.6 });
            const engineMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
            const noseMat = new THREE.MeshStandardMaterial({ color: 0xCC3333, roughness: 0.3 });
            const shuttleNoseMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3 });
            const tankMat = new THREE.MeshStandardMaterial({ color: 0xF97316, roughness: 0.5 });

            if (part.type === 'cockpit') {
                const geo = new THREE.ConeGeometry(5, 15, 32);
                const isShuttle = (part.id || '').toLowerCase().includes('shuttle') || (part.id || '').toLowerCase().includes('mk1');
                mesh = new THREE.Mesh(geo, isShuttle ? shuttleNoseMat : noseMat);
            } else if (part.type === 'engine') {
                const geo = new THREE.CylinderGeometry(2, 4, 10, 32);
                mesh = new THREE.Mesh(geo, engineMat);
            } else if (part.type === 'hull') {
                const geo = new THREE.CylinderGeometry(5, 5, 15, 32);
                mesh = new THREE.Mesh(geo, part.id.includes('Tank') ? tankMat : hullMat);
            } else if (part.type === 'wing') {
                const geo = new THREE.BoxGeometry(10, 15, 2);
                mesh = new THREE.Mesh(geo, hullMat);
                if (part.id.includes('L')) mesh.position.x = -8;
                if (part.id.includes('R')) mesh.position.x = 8;
            }

            if (mesh) {
                const xOffset = (part.col - 4.5) * 10;
                mesh.position.set(xOffset, yPos, 0);
                this.rocketGroup.add(mesh);
            }
        });

        // Center visual
        const box = new THREE.Box3().setFromObject(this.rocketGroup);
        if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            this.camera.position.set(0, center.y, size.y * 2 + 50); // Adjust zoom
            this.camera.lookAt(0, center.y, 0);
        }

        this.scene.add(this.rocketGroup);
    },

    animate: function () {
        requestAnimationFrame(() => this.animate());
        if (this.rocketGroup) {
            this.rocketGroup.rotation.y += 0.01;
        }
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Builder.init();
});
