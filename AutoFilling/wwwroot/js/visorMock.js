import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let objetos = [];

// === CONFIGURACIÓN FÍSICA (Escala 1:1 en metros virtuales) ===
const CELL_SIZE = 2;        // Tamaño de la casilla
const ALTURA_BASE = 0.8;    // Grosor de la colchoneta/trampolín
const ALTURA_MALLA = 2.0;   // Altura de la red roja
const ALTURA_POSTE = 2.4;   // Altura de los tubos verticales
const GROSOR_MALLA = 0.05;

export function init(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0); 

    // Ayuda visual: Suelo gris con rejilla
    const gridHelper = new THREE.GridHelper(100, 50, 0xaaaaaa, 0xdddddd);
    gridHelper.position.y = -0.01; 
    scene.add(gridHelper);

    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(15, 20, 15);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;

    // Iluminación
    const luzSol = new THREE.DirectionalLight(0xffffff, 0.8);
    luzSol.position.set(10, 30, 10);
    luzSol.castShadow = true;
    scene.add(luzSol);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer) renderer.render(scene, camera);
}

// === FÁBRICA DE PIEZAS 3D ===

function crearGeometria(item) {
    const grupo = new THREE.Group();
    const { Tipo, Subtipo, Rotacion, Details } = item;

    if (Tipo === "Lona") {
        // Bloque Azul Central
        const geo = new THREE.BoxGeometry(CELL_SIZE * 0.98, ALTURA_BASE, CELL_SIZE * 0.98);
        geo.translate(0, ALTURA_BASE / 2, 0);
        const mat = new THREE.MeshStandardMaterial({ color: 0x42a5f5 });
        grupo.add(new THREE.Mesh(geo, mat));
    } 
    else if (Tipo === "Pad") {
        // Bloque Amarillo de Borde
        const geo = new THREE.BoxGeometry(CELL_SIZE, ALTURA_BASE, CELL_SIZE);
        geo.translate(0, ALTURA_BASE / 2, 0); 
        const mat = new THREE.MeshStandardMaterial({ color: 0xffeb3b });
        grupo.add(new THREE.Mesh(geo, mat));

        // --- RESORTES (Sticks negros apuntando al centro) ---
        const matNegro = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const crearStick = (x, z, rY) => {
            const sGeo = new THREE.BoxGeometry(0.05, 0.02, 0.8);
            sGeo.translate(0, ALTURA_BASE + 0.01, 0.4);
            const sMesh = new THREE.Mesh(sGeo, matNegro);
            sMesh.rotation.y = rY;
            sMesh.position.set(x, 0, z);
            return sMesh;
        };
        if (item.StickUp)    grupo.add(crearStick(0, -0.2, Math.PI));    // Mira al Norte
        if (item.StickDown)  grupo.add(crearStick(0, 0.2, 0));          // Mira al Sur
        if (item.StickLeft)  grupo.add(crearStick(-0.2, 0, -Math.PI/2)); // Mira al Oeste
        if (item.StickRight) grupo.add(crearStick(0.2, 0, Math.PI/2));  // Mira al Este
    } 
    else if (Tipo === "Poste") {
        // CILINDROS DE ACERO
        const radio = (Subtipo === "Estructural") ? 0.15 : 0.08;
        const color = (Subtipo === "Estructural") ? 0xd32f2f : 0xffffff;
        
        const geo = new THREE.CylinderGeometry(radio, radio, ALTURA_POSTE, 16);
        // Posicionar sobre el pad
        geo.translate(0, ALTURA_BASE + ALTURA_POSTE/2, 0);
        
        // Alinear a la esquina de la celda según "Details" (TL, TR, BL, BR)
        const offset = CELL_SIZE / 2;
        if (Details?.includes("TL")) geo.translate(-offset, 0, -offset);
        if (Details?.includes("TR")) geo.translate(offset, 0, -offset);
        if (Details?.includes("BL")) geo.translate(-offset, 0, offset);
        if (Details?.includes("BR")) geo.translate(offset, 0, offset);

        grupo.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color })));
    }
    else if (Tipo === "Malla" || Tipo === "Entrada") {
        // PANELES PERIMETRALES (Rojo o Verde)
        const esEntrada = (Tipo === "Entrada");
        const hPanel = esEntrada ? 0.2 : ALTURA_MALLA;
        const geo = new THREE.BoxGeometry(CELL_SIZE, hPanel, GROSOR_MALLA);
        
        const yPos = ALTURA_BASE + (hPanel / 2);
        const borde = CELL_SIZE / 2;

        let xPos = 0, zPos = 0, rY = 0;
        // Posicionamiento manual en bordes para evitar desfasamiento por rotación
        if (Rotacion === 0)      zPos = -borde; // Norte
        else if (Rotacion === 180) zPos = borde;  // Sur
        else if (Rotacion === 90)  { xPos = -borde; rY = Math.PI / 2; } // Oeste
        else if (Rotacion === 270) { xPos = borde;  rY = Math.PI / 2; } // Este

        geo.translate(0, yPos, 0);
        
        const color = esEntrada ? 0x4caf50 : 0xff0000;
        const opacidad = esEntrada ? 1.0 : 0.35;

        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ 
            color: color, 
            transparent: !esEntrada, 
            opacity: opacidad, 
            side: THREE.DoubleSide, 
            depthWrite: esEntrada 
        }));
        
        mesh.position.set(xPos, 0, zPos);
        mesh.rotation.y = rY;
        grupo.add(mesh);

        // Si es malla normal, añadir el tubo superior de seguridad
        if (!esEntrada) {
            const tGeo = new THREE.CylinderGeometry(0.05, 0.05, CELL_SIZE, 8);
            tGeo.rotateZ(Math.PI / 2);
            const tMesh = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ color: 0x880000 }));
            tMesh.position.set(xPos, yPos + hPanel/2, zPos);
            tMesh.rotation.y = rY;
            grupo.add(tMesh);
        }

        // Marcamos este grupo para que el renderizador no le aplique rotación extra
        grupo.userData.ignoreRotation = true;
    }
    return grupo;
}

// === COMUNICACIÓN BROADCAST (Dual Monitor) ===
const canal = new BroadcastChannel('canal_grid_3d');

export function transmitirDatos(jsonString) { 
    canal.postMessage(jsonString); 
}

export function iniciarEscucha() { 
    canal.onmessage = (ev) => renderJSON(ev.data); 
}

export function renderJSON(jsonString) {
    // 1. Limpiar escena actual
    objetos.forEach(o => scene.remove(o));
    objetos = [];

    // 2. Parsear datos
    const datos = JSON.parse(jsonString);

    // 3. Reconstruir mundo
    datos.forEach(item => {
        const grupo = crearGeometria(item);
        if (grupo) {
            const pivot = new THREE.Group();
            // Posicionar en el centro de la celda
            pivot.position.set(item.X * CELL_SIZE, 0, item.Y * CELL_SIZE);
            
            // Rotar solo si la pieza no calculó su propia rotación interna (como Mallas/Entradas)
            if (!grupo.userData.ignoreRotation) {
                pivot.rotation.y = -item.Rotacion * (Math.PI / 180);
            }
            
            pivot.add(grupo);
            scene.add(pivot);
            objetos.push(pivot);
        }
    });
}