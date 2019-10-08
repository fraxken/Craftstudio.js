"use strict";

/**
 * ORIGINAL CODE CREATED BY Elisee MAURER
 * https://github.com/elisee/CraftStudio.js
 */

// Require Third-party Dependencies
import * as THREE from "three";

type CSJSVector3 = [number, number, number];

interface CSJSModel {
    title: string;
    tree: CSJSBox[];
    transparent?: any;
}

interface CSJSBox {
    name: string;
    position: CSJSVector3;
    offsetFromPivot: CSJSVector3;
    size: CSJSVector3;
    rotation: CSJSVector3;
    texOffset: [number, number];
    children: CSJSBox[];
    vertexCoords?: CSJSVector3[];
}

export interface ModelBox {
    name: string;
    parent?: ModelBox;
    position: THREE.Vector3;
    orientation: THREE.Quaternion;
    offsetFromPivot: THREE.Vector3;
    size: THREE.Vector3;
    texOffset: [number, number];
    vertexCoords: THREE.Vector3[];
    children: ModelBox[];
    isRootBox: boolean;
}

export default class Model {
    public texture: THREE.Texture;
    public rootBoxes: ModelBox[] = [];
    public boxesByName: Map<string, ModelBox> = new Map();
    public transparent: boolean;

    static CSJSVector(vector: CSJSVector3) {
        return new THREE.Vector3(vector[0], vector[1], vector[2]);
    }

    constructor(modelDef: CSJSModel, texture: THREE.Texture) {
        const { tree, transparent = false } = modelDef;

        // Our model properties
        this.texture = texture;
        this.transparent = transparent;

        // Iterate the CraftStudio JSON Model tree and transform each node in a valid THREE.js node
        for (const boxDefinition of tree) {
            for (const modelBox of Model.buildCSJSBox(boxDefinition)) {
                if (modelBox.isRootBox) {
                    this.rootBoxes.push(modelBox);
                }
                else {
                    this.boxesByName.get(modelBox.parent.name).children.push(modelBox);
                }
                this.boxesByName.set(modelBox.name, modelBox);
            }
        }
    }

    get boxCount() {
        return this.boxesByName.size;
    }

    dispose(): void {
        this.texture.dispose();
        this.texture = null;
        this.rootBoxes = null;
        this.boxesByName = null;
    }

    static *buildCSJSBox(boxDef: CSJSBox, parent?: ModelBox): IterableIterator<ModelBox> {
        const box: ModelBox = {
            name: boxDef.name,
            parent,
            position: Model.CSJSVector(boxDef.position),
            orientation: new THREE.Quaternion().setFromEuler(
                new THREE.Euler(...boxDef.rotation.map((value) => THREE.Math.degToRad(value)))
            ),
            offsetFromPivot: Model.CSJSVector(boxDef.offsetFromPivot),
            size: Model.CSJSVector(boxDef.size),
            texOffset: boxDef.texOffset,
            children: [],
            vertexCoords: null,
            isRootBox: typeof parent === "undefined"
        };

        if (Object.prototype.hasOwnProperty.call(boxDef, "vertexCoords")) {
            box.vertexCoords = boxDef.vertexCoords.map((csjsVector) => Model.CSJSVector(csjsVector));
        }
        else {
            const [x, y, z] = [box.size.x / 2, box.size.y / 2, box.size.z / 2];

            box.vertexCoords = [
                new THREE.Vector3(-x, y, -z),
                new THREE.Vector3(x, y, -z),
                new THREE.Vector3(x, -y, -z),
                new THREE.Vector3(-x, -y, -z),
                new THREE.Vector3(x, y, z),
                new THREE.Vector3(-x, y, z),
                new THREE.Vector3(-x, -y, z),
                new THREE.Vector3(x, -y, z)
            ];
        }

        yield box;
        for (const child of boxDef.children) {
            yield* Model.buildCSJSBox(child, box);
        }
    }
}
