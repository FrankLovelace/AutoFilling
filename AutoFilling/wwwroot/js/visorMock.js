import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let objetos = [];
const CELL_SIZE = 2; 

export function init(canvasId) {
    const canvas = document.getElementById(canvasId);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    scene.add(new THREE.GridHelper(50, 50));

    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    controls = new OrbitControls(camera, renderer.domElement);
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function crearGeometria(tipo, subtipo) {
    let geo, mat;

    if (tipo === "Lona") {
        geo = new THREE.BoxGeometry(CELL_SIZE * 0.9, 0.2, CELL_SIZE * 0.9);
        mat = new THREE.MeshStandardMaterial({ color: 0x42a5f5 }); // Azul
    } 
    else if (tipo === "Pad") {
        geo = new THREE.CylinderGeometry(CELL_SIZE / 2, CELL_SIZE / 2, 0.2, 32);
        mat = new THREE.MeshStandardMaterial({ color: 0xffeb3b }); 
    } 
    else if (tipo === "Poste") {
        const altura = 2.5;
        const ancho = subtipo === "Estructural" ? 0.3 : 0.15; 
        geo = new THREE.BoxGeometry(ancho, altura, ancho);
        mat = new THREE.MeshStandardMaterial({ color: 0xd32f2f }); 
        
        geo.translate(0, altura / 2, 0);
        geo.translate(-CELL_SIZE/2, 0, -CELL_SIZE/2);
    }
    else if (tipo === "Malla") {
        geo = new THREE.BoxGeometry(CELL_SIZE, 2, 0.05);
        geo.translate(0, 1, -CELL_SIZE/2); 
        mat = new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });
    }

    return new THREE.Mesh(geo, mat);
}

export function renderJSON(jsonString) {
    objetos.forEach(o => scene.remove(o));
    objetos = [];

    const datos = JSON.parse(jsonString);

    datos.forEach(item => {
        const mesh = crearGeometria(item.Tipo, item.Subtipo);
        if (mesh) {
            const pivot = new THREE.Group();
            
            pivot.position.set(item.X * CELL_SIZE, 0, item.Y * CELL_SIZE);
            
            pivot.rotation.y = -item.Rotacion * (Math.PI / 180);

            pivot.add(mesh);
            scene.add(pivot);
            objetos.push(pivot);
        }
    });
}
const canal = new BroadcastChannel('canal_grid_3d');

export function transmitirDatos(jsonString) {
    canal.postMessage(jsonString);
}

export function iniciarEscucha() {
    canal.onmessage = (evento) => {
        const jsonRecibido = evento.data;
        renderJSON(jsonRecibido); 
    };
}