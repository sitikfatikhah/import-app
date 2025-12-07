// Function untuk inisialisasi globe
function initGlobe() {
    // Pastikan THREE sudah ada
    if (typeof THREE === "undefined") {
        console.error("THREE.js belum dimuat. Tambahkan CDN di HTML atau React.");
        return;
    }

    const canvas = document.getElementById("globe-canvas");

    if (!canvas) {
        console.error("Canvas #globe-canvas tidak ditemukan!");
    } else {
        // Renderer
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

        // Scene
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(
            45,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 5);

        // Globe geometry
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0x4499ff,
            wireframe: false,
            shininess: 20,
        });
        const globe = new THREE.Mesh(geometry, material);
        scene.add(globe);

        // Lighting
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);

        const ambient = new THREE.AmbientLight(0x404040);
        scene.add(ambient);

        // Fetch data dari GlobeController
        fetch('/geo')
            .then(response => response.json())
            .then(data => {
                console.log('Data received from GlobeController:', data);

                if (data.type === 'FeatureCollection' && data.features) {
                    // Process setiap feature/negara
                    data.features.forEach(feature => {
                        if (feature.geometry && feature.geometry.coordinates) {
                            // Buat outline untuk setiap negara
                            drawCountryBorders(feature, globe);
                        }
                    });

                    console.log(`Loaded ${data.features.length} countries`);
                }
            })
            .catch(error => {
                console.error('Error fetching globe data:', error);
            });

        // Function untuk menggambar border negara
        function drawCountryBorders(feature, globe) {
            const coordinates = feature.geometry.coordinates;
            const countryName = feature.properties?.name || 'Unknown';

            // Convert lat/lng to 3D coordinates
            function latLngToVector3(lng, lat, radius) {
                const phi = (90 - lat) * (Math.PI / 180);
                const theta = (lng + 180) * (Math.PI / 180);

                const x = -(radius * Math.sin(phi) * Math.cos(theta));
                const y = radius * Math.cos(phi);
                const z = radius * Math.sin(phi) * Math.sin(theta);

                return new THREE.Vector3(x, y, z);
            }

            // Handle different geometry types
            if (feature.geometry.type === 'Polygon') {
                drawPolygon(coordinates[0], 2.01);
            } else if (feature.geometry.type === 'MultiPolygon') {
                coordinates.forEach(polygon => {
                    drawPolygon(polygon[0], 2.01);
                });
            }

            function drawPolygon(coords, radius) {
                const points = [];
                coords.forEach(coord => {
                    const [lng, lat] = coord;
                    points.push(latLngToVector3(lng, lat, radius));
                });

                // Buat line untuk border
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0xffffff,
                    linewidth: 1,
                    opacity: 0.5,
                    transparent: true
                });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                scene.add(line);
            }
        }

        // Animation Loop
        function animate() {
            requestAnimationFrame(animate);

            // Rotasi globe
            globe.rotation.y += 0.003;

            renderer.render(scene, camera);
        }

        animate();
    }
}

// Tunggu DOM dan THREE.js siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Tunggu sedikit untuk memastikan THREE.js sudah dimuat dari CDN
        setTimeout(initGlobe, 100);
    });
} else {
    // DOM sudah siap
    setTimeout(initGlobe, 100);
}
