// Require Node.js Dependencies
import { promises as fs } from "fs";
import { join } from "path";

// Require Third-party Dependencies
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// Require Internal Dependencies
import Model from "./Model";
import ModelInstance from "./ModelInstance";

// CONSTANTS
const kAssetsDir = join(__dirname, "..", "assets");

async function loadJSONAsset(name) {
    const buf = await fs.readFile(join(kAssetsDir, `${name}.csjsmodel`));

    return JSON.parse(buf.toString());
}

function loadImage(imagePath): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imagePath;
        img.addEventListener("load", () => resolve(img), false);
    });
}

document.addEventListener("DOMContentLoaded", async() => {
    const csjsModelDefinition = await loadJSONAsset("HerbeVerte");

    const img = await loadImage(join(kAssetsDir, "HerbeVerte.png"));
    const texture = new THREE.Texture(img, void 0, void 0, void 0, THREE.NearestFilter, THREE.NearestFilter, void 0, void 0, 0);
    texture.needsUpdate = true;

    THREE.Euler.DefaultOrder = "YXZ";
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(200, 100, 0);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableKeys = true;
    controls.keyPanSpeed = 20;

    document.body.appendChild(renderer.domElement);

    const currentScene = new THREE.Scene();
    currentScene.add(new THREE.AmbientLight(new THREE.Color("white"), 1));
    currentScene.background = new THREE.Color("white");
    currentScene.add(new THREE.GridHelper(200, 10));

    const CSModel = new ModelInstance(new Model(csjsModelDefinition, texture));
    const mesh = new THREE.Mesh(CSModel.geometry, CSModel.material);
    mesh.scale.set(1.0 / 16, 1.0 / 16, 1.0 / 16);
    mesh.position.set(0, 0, 0);
    currentScene.add(mesh);
    mesh.geometry.computeBoundingSphere();
    // console.log(CSModel);

    // const plane = new THREE.Mesh(
    //     new THREE.PlaneGeometry(200, 200),
    //     new THREE.MeshStandardMaterial({ map : texture, transparent: true })
    // );
    // plane.position.set(0, 0, 0);
    // currentScene.add(plane);

    function updateSize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(currentScene, camera);
    }

    animate();
    window.onresize = () => updateSize();
})
