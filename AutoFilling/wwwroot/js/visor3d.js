import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let objetosEnEscena = []; 

const TAMANO_CELDA = 2; 
const ALTURA_POSTE = 2.5;
const ALTURA_MALLA = 2;

export function iniciarVisor(canvasId) {
    const canvas = document.getElementById(canvasId);
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0); 
    
    const gridHelper = new THREE.GridHelper(100, 50);
    scene.add(gridHelper);

    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(10, 15, 10); 
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(10, 0, 10); 

    const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(luzAmbiente);
    const luzDir = new THREE.DirectionalLight(0xffffff, 0.8);
    luzDir.position.set(10, 20, 10);
    scene.add(luzDir);

    function animar() {
        requestAnimationFrame(animar);
        controls.update();
        renderer.render(scene, camera);
    }
    animar();
}

function crearModeloMock(tipo, modelo) {
    let mesh = null;
    let material = null;

    switch (tipo) {
        case "Suelo":
            const color = modelo.includes("Lona") ? 0x42a5f5 : 0xffeb3b; 
            
            const geoSuelo = new THREE.BoxGeometry(TAMANO_CELDA * 0.95, 0.1, TAMANO_CELDA * 0.95);
            material = new THREE.MeshStandardMaterial({ color: color });
            mesh = new THREE.Mesh(geoSuelo, material);
   
            mesh.position.y = 0.05; 
            break;

        case "Poste":
            const esRojo = modelo.includes("Estructural");
            const colorPoste = esRojo ? 0xd32f2f : 0xffffff;
            const radio = esRojo ? 0.15 : 0.1; 
            
            const geoPoste = new THREE.CylinderGeometry(radio, radio, ALTURA_POSTE, 16);
            material = new THREE.MeshStandardMaterial({ color: colorPoste });
            if (!esRojo) material.border = true; 
            mesh = new THREE.Mesh(geoPoste, material);
            
            mesh.position.y = ALTURA_POSTE / 2;
            
            mesh.position.x = -TAMANO_CELDA / 2;
            mesh.position.z = -TAMANO_CELDA / 2;
            break;

        case "Malla":
            const geoMalla = new THREE.BoxGeometry(TAMANO_CELDA, ALTURA_MALLA, 0.05);
            material = new THREE.MeshStandardMaterial({ 
                color: 0xd32f2f, 
                transparent: true, 
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            mesh = new THREE.Mesh(geoMalla, material);
            
            mesh.position.y = ALTURA_MALLA / 2;
            mesh.position.z = -TAMANO_CELDA / 2; 
            break;
    }

    return mesh;
}

export function renderizarParque(jsonString) {
    objetosEnEscena.forEach(obj => scene.remove(obj));
    objetosEnEscena = [];

    const datos = JSON.parse(jsonString);

    datos.forEach(item => {
        const objeto3D = crearModeloMock(item.Tipo, item.Modelo);

        if (objeto3D) {
            const pivot = new THREE.Group();
            
            pivot.position.set(item.X * TAMANO_CELDA, 0, item.Y * TAMANO_CELDA);

            pivot.rotation.y = -item.Rotacion * (Math.PI / 180);

            pivot.add(objeto3D);
            scene.add(pivot);
            objetosEnEscena.push(pivot);
        }
    });
}