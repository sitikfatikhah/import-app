import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useRef } from "react";

declare global {
    interface Window {
        THREE: any;
        Globe: any;
    }
}

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
                <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
            </Head>

            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">

                {/* HEADER */}
                <header className="mb-6 w-full max-w-[335px] text-sm lg:max-w-4xl">
                    <nav className="flex items-center justify-end gap-4">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm text-[#1b1b18] hover:border-[#19140035] dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
                                >
                                    Log in
                                </Link>

                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                    >
                                        Register
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </header>

                {/* MAIN CONTENT */}
                <div className="w-full max-w-4xl flex justify-center">
                    <Globe />
                </div>

            </div>
        </>
    );
}

/* ==========================
   GLOBE COMPONENT
========================== */

function Globe() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Cek THREE.js sudah ada
        if (!window.THREE) {
            console.error("Three.js belum dimuat!");
            return;
        }

        // Cek canvas ada
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Renderer
        const renderer = new window.THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

        // Scene & Camera
        const scene = new window.THREE.Scene();
        const camera = new window.THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);

        // Globe
        const geometry = new window.THREE.SphereGeometry(2, 32, 32);
        const material = new window.THREE.MeshPhongMaterial({ color: 0x4499ff });
        const globe = new window.THREE.Mesh(geometry, material);
        scene.add(globe);

        // Lighting
        const light = new window.THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);

        scene.add(new window.THREE.AmbientLight(0x404040));

        // Fetch data dari GlobeController (GET tidak butuh CSRF token)
        fetch('/geo', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Data received from GlobeController:', data);

                if (data.type === 'FeatureCollection' && data.features) {
                    // Process setiap feature/negara
                    data.features.forEach((feature: any) => {
                        if (feature.geometry && feature.geometry.coordinates) {
                            // Buat outline untuk setiap negara
                            drawCountryBorders(feature, scene);
                        }
                    });

                    console.log(`Loaded ${data.features.length} countries`);
                }
            })
            .catch(error => {
                console.error('Error fetching globe data:', error);
            });

        // Function untuk menggambar border negara
        function drawCountryBorders(feature: any, scene: any) {
            const coordinates = feature.geometry.coordinates;

            // Convert lat/lng to 3D coordinates
            function latLngToVector3(lng: number, lat: number, radius: number) {
                const phi = (90 - lat) * (Math.PI / 180);
                const theta = (lng + 180) * (Math.PI / 180);

                const x = -(radius * Math.sin(phi) * Math.cos(theta));
                const y = radius * Math.cos(phi);
                const z = radius * Math.sin(phi) * Math.sin(theta);

                return new window.THREE.Vector3(x, y, z);
            }

            // Handle different geometry types
            if (feature.geometry.type === 'Polygon') {
                drawPolygon(coordinates[0], 2.01);
            } else if (feature.geometry.type === 'MultiPolygon') {
                coordinates.forEach((polygon: any) => {
                    drawPolygon(polygon[0], 2.01);
                });
            }

            function drawPolygon(coords: any[], radius: number) {
                const points: any[] = [];
                coords.forEach(coord => {
                    const [lng, lat] = coord;
                    points.push(latLngToVector3(lng, lat, radius));
                });

                // Buat line untuk border
                const lineGeometry = new window.THREE.BufferGeometry().setFromPoints(points);
                const lineMaterial = new window.THREE.LineBasicMaterial({
                    color: 0xffffff,
                    linewidth: 1,
                    opacity: 0.5,
                    transparent: true
                });
                const line = new window.THREE.Line(lineGeometry, lineMaterial);
                scene.add(line);
            }
        }

        // Animate
        let animationId: number;
        const animate = () => {
            globe.rotation.y += 0.003;
            renderer.render(scene, camera);
            animationId = requestAnimationFrame(animate);
        };
        animate();

        // Cleanup saat komponen di-unmount
        return () => cancelAnimationFrame(animationId);

    }, []);

    return (
        <canvas
            ref={canvasRef}
            id="globe-canvas"
            className="w-[600px] h-[600px] border border-gray-300"
        />
    );
}
