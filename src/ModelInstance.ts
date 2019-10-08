"use strict";

/**
 * ORIGINAL CODE CREATED BY Elisee MAURER
 * https://github.com/elisee/CraftStudio.js
 */

// Require Third-party Dependencies
import * as THREE from "three";

// Require Internal Dependencies
import * as Model from "./Model";
import ModelAnimation from "./ModelAnimation";

// Variables
const leftTopBack = new THREE.Vector3();
const rightTopBack = new THREE.Vector3();
const rightBottomBack = new THREE.Vector3();
const leftBottomBack = new THREE.Vector3();
const rightTopFront = new THREE.Vector3();
const leftTopFront = new THREE.Vector3();
const leftBottomFront = new THREE.Vector3();
const rightBottomFront = new THREE.Vector3();

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();

const frontNormal = new THREE.Vector3();
const backNormal = new THREE.Vector3();
const rightNormal = new THREE.Vector3();
const bottomNormal = new THREE.Vector3();
const leftNormal = new THREE.Vector3();
const topNormal = new THREE.Vector3();

export default class ModelInstance {
    public model: Model.default;
    public material: THREE.MeshBasicMaterial;
    public geometry: THREE.BufferGeometry;

    constructor(model: Model.default) {
        if (!(model instanceof Model.default)) {
            throw new TypeError("model must be an instanceof Model");
        }

        this.model = model;
        this.geometry = ModelInstance.createGeometry(this.model.boxCount);
        this.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0xffffff),
            map: this.model.texture,
            alphaTest: 0.01,
            side: THREE.DoubleSide,
            transparent: model.transparent,
            blending: THREE.NormalBlending
        });
        // this.resetPose();
    }

    dispose(): void {
        this.model.dispose();
        this.model = null;
        this.geometry.dispose();
        this.geometry = null;
        this.material.dispose();
        this.material = null;
    }

    resetPose(): void {
        this.setPose(null, 0);
    }

    setPose(modelAnimation: ModelAnimation = null, frame: number): void {
        let boxIndex = 0;
        for (const box of this.model.rootBoxes) {
            boxIndex += ModelInstance.poseBoxRecurse(
                this.geometry, boxIndex, box, new THREE.Matrix4(), this.material.map, modelAnimation, frame
            );
        }

        // this.geometry.getAttribute("position").needsUpdate = true;
        // this.geometry.getAttribute("normal").needsUpdate = true;
        // this.geometry.getAttribute("uv").needsUpdate = true;
    }

    getBoxTransform(boxName: string, modelAnimation: ModelAnimation = null, frame: number) {
        const transform = {
            position: new THREE.Vector3(), orientation: new THREE.Quaternion()
        };
        if (!this.model.boxesByName.has(boxName)) {
            return transform;
        }

        const globalBoxMatrix = new THREE.Matrix4();
        let box: Model.ModelBox = this.model.boxesByName.get(boxName);

        while (box !== null) {
            let { position, orientation } = box;
            if (modelAnimation !== null) {
                position = box.position.clone().add(modelAnimation.getPositionDelta(box.name, frame));
                orientation = new THREE.Quaternion().multiplyQuaternions(
                    modelAnimation.getOrientationDelta(box.name, frame), box.orientation
                );
            }

            const origin = box.offsetFromPivot.clone().applyQuaternion(orientation).add(position);
            const boxMatrix = new THREE.Matrix4().makeRotationFromQuaternion(orientation).setPosition(origin);
            globalBoxMatrix.multiplyMatrices(boxMatrix, globalBoxMatrix);
            box = box.parent;
        }
        globalBoxMatrix.decompose(transform.position, transform.orientation, new THREE.Vector3());

        return transform;
    }

    static poseBoxRecurse(geometry, boxIndex, box, parentMatrix, texture, modelAnimation = null, frame) {
        let { position, orientation } = box;
        if (modelAnimation !== null) {
            position = box.position.clone().add(modelAnimation.getPositionDelta(box.name, frame));
            orientation = new THREE.Quaternion().multiplyQuaternions(
                modelAnimation.getOrientationDelta(box.name, frame),
                box.orientation
            );
        }

        const origin = box.offsetFromPivot.clone().applyQuaternion(orientation).add(position);
        const boxMatrix = new THREE.Matrix4().makeRotationFromQuaternion(orientation).setPosition(origin);
        boxMatrix.multiplyMatrices(parentMatrix, boxMatrix);

        // Vertex positions
        leftTopBack.copy(box.vertexCoords[0]).applyMatrix4(boxMatrix);
        rightTopBack.copy(box.vertexCoords[1]).applyMatrix4(boxMatrix);
        rightBottomBack.copy(box.vertexCoords[2]).applyMatrix4(boxMatrix);
        leftBottomBack.copy(box.vertexCoords[3]).applyMatrix4(boxMatrix);
        rightTopFront.copy(box.vertexCoords[4]).applyMatrix4(boxMatrix);
        leftTopFront.copy(box.vertexCoords[5]).applyMatrix4(boxMatrix);
        leftBottomFront.copy(box.vertexCoords[6]).applyMatrix4(boxMatrix);
        rightBottomFront.copy(box.vertexCoords[7]).applyMatrix4(boxMatrix);

        // Face normals
        frontNormal
            .crossVectors(v1.subVectors(leftBottomFront, leftTopFront), v2.subVectors(rightTopFront, leftTopFront))
            .normalize();
        backNormal
            .crossVectors(v1.subVectors(rightBottomBack, rightTopBack), v2.subVectors(leftTopBack, rightTopBack))
            .normalize();
        rightNormal
            .crossVectors(v1.subVectors(rightBottomFront, rightTopFront), v2.subVectors(rightTopBack, rightTopFront))
            .normalize();
        bottomNormal
            .crossVectors(v1.subVectors(leftBottomBack, leftBottomFront), v2.subVectors(rightBottomFront, leftBottomFront))
            .normalize();
        leftNormal
            .crossVectors(v1.subVectors(leftBottomBack, leftTopBack), v2.subVectors(leftTopFront, leftTopBack))
            .normalize();
        topNormal
            .crossVectors(v1.subVectors(leftTopFront, leftTopBack), v2.subVectors(rightTopBack, leftTopBack))
            .normalize();

        // Setup faces
        const positions = geometry.getAttribute("position").array;
        const normals = geometry.getAttribute("normal").array;

        ModelInstance.setupFace(positions, normals, boxIndex * 24 + 0 * 4,
            rightTopFront, leftTopFront, leftBottomFront, rightBottomFront, frontNormal);
        ModelInstance.setupFace(positions, normals, boxIndex * 24 + 1 * 4,
            leftTopBack, rightTopBack, rightBottomBack, leftBottomBack, backNormal);
        ModelInstance.setupFace(positions, normals, boxIndex * 24 + 2 * 4,
            rightTopBack, rightTopFront, rightBottomFront, rightBottomBack, rightNormal);
        ModelInstance.setupFace(positions, normals, boxIndex * 24 + 3 * 4,
            rightBottomFront, leftBottomFront, leftBottomBack, rightBottomBack, bottomNormal);
        ModelInstance.setupFace(positions, normals, boxIndex * 24 + 4 * 4,
            leftTopFront, leftTopBack, leftBottomBack, leftBottomFront, leftNormal);
        ModelInstance.setupFace(positions, normals, boxIndex * 24 + 5 * 4,
            rightTopBack, leftTopBack, leftTopFront, rightTopFront, topNormal);

        // UVs
        const faceOffsets = [
            [box.size.z, box.size.z],
            [box.size.z * 2 + box.size.x, box.size.z],
            [box.size.z + box.size.x, box.size.z],
            [box.size.z + box.size.x, 0],
            [0, box.size.z],
            [box.size.z, 0]
        ];

        const faceSizes = [
            [box.size.x, box.size.y],
            [box.size.x, box.size.y],
            [box.size.z, box.size.y],
            [box.size.x, box.size.z],
            [box.size.z, box.size.y],
            [box.size.x, box.size.z]
        ];

        const uvs = geometry.getAttribute("uv").array;
        const { width, height } = texture.image;
        for (let i = 0; i < 6; i++) {
            uvs[(boxIndex * 6 + i) * 8 + 0 * 2 + 0] = (faceOffsets[i][0] + box.texOffset[0] + faceSizes[i][0]) / width;
            uvs[(boxIndex * 6 + i) * 8 + 0 * 2 + 1] = 1 - (faceOffsets[i][1] + box.texOffset[1] + 0) / height;

            uvs[(boxIndex * 6 + i) * 8 + 1 * 2 + 0] = (faceOffsets[i][0] + box.texOffset[0] + 0) / width;
            uvs[(boxIndex * 6 + i) * 8 + 1 * 2 + 1] = 1 - (faceOffsets[i][1] + box.texOffset[1] + 0) / height;

            uvs[(boxIndex * 6 + i) * 8 + 2 * 2 + 0] = (faceOffsets[i][0] + box.texOffset[0] + 0) / width;
            uvs[(boxIndex * 6 + i) * 8 + 2 * 2 + 1] = 1 - (faceOffsets[i][1] + box.texOffset[1] + faceSizes[i][1]) / height;

            uvs[(boxIndex * 6 + i) * 8 + 3 * 2 + 0] = (faceOffsets[i][0] + box.texOffset[0] + faceSizes[i][0]) / width;
            uvs[(boxIndex * 6 + i) * 8 + 3 * 2 + 1] = 1 - (faceOffsets[i][1] + box.texOffset[1] + faceSizes[i][1]) / height;
        }

        // Recurse
        boxIndex++;
        let boxCount = 1;
        for (const childBox of box.children) {
            const childBoxCount = ModelInstance.poseBoxRecurse(
                geometry, boxIndex, childBox, boxMatrix, texture, modelAnimation, frame);
            boxIndex += childBoxCount;
            boxCount += childBoxCount;
        }

        return boxCount;
    }

    static createGeometry(boxCount: number): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();

        {
            const indexAttribute = new THREE.BufferAttribute(new Uint16Array(boxCount * 36), 1);
            indexAttribute.dynamic = true;

            const positionAttribute = new THREE.BufferAttribute(new Uint16Array(boxCount * 72), 3);
            positionAttribute.dynamic = true;

            const normalAttribute = new THREE.BufferAttribute(new Uint16Array(boxCount * 72), 3);
            normalAttribute.dynamic = true;

            const uvAttribute = new THREE.BufferAttribute(new Uint16Array(boxCount * 48), 2);
            uvAttribute.dynamic = true;

            geometry.setIndex(indexAttribute);
            geometry.addAttribute("position", positionAttribute);
            geometry.addAttribute("normal", normalAttribute);
            geometry.addAttribute("uv", uvAttribute);
        }

        // Split indices in groups for GPU submission
        // FIXME: Why 6, past me? because quad?
        const bufChunkDivider = 6;
        const bufChunkSize = Math.floor((0xffff + 1) / bufChunkDivider);
        const indices = geometry.getIndex().array;

        const quads = boxCount * 6;
        const asc = quads >= 0;
        for (let i = 0; asc ? i < quads : i > quads; asc ? i++ : i--) {
            indices[i * 6 + 0] = (i * 4 + 0) % (bufChunkSize * bufChunkDivider);
            indices[i * 6 + 1] = (i * 4 + 1) % (bufChunkSize * bufChunkDivider);
            indices[i * 6 + 2] = (i * 4 + 2) % (bufChunkSize * bufChunkDivider);
            indices[i * 6 + 3] = (i * 4 + 0) % (bufChunkSize * bufChunkDivider);
            indices[i * 6 + 4] = (i * 4 + 2) % (bufChunkSize * bufChunkDivider);
            indices[i * 6 + 5] = (i * 4 + 3) % (bufChunkSize * bufChunkDivider);
        }

        const triangles = quads * 2;
        const offsets = (triangles * 3) / (((bufChunkSize * bufChunkDivider) / 4) * 6);

        const asc1 = offsets >= 0;
        for (let i = 0; asc1 ? i < offsets : i > offsets; asc1 ? i++ : i--) {
            const materialIndex = i * bufChunkSize * bufChunkDivider;
            const start = ((i * bufChunkSize * bufChunkDivider) / 4) * 6;
            const count = Math.min(
                ((bufChunkSize * bufChunkDivider) / 4) * 6,
                triangles * 3 - ((i * bufChunkSize * bufChunkDivider) / 4) * 6
            );

            geometry.addGroup(start, count, materialIndex);
        }

        return geometry;
    }

    static setupFace(positions, normals, offset, pos0, pos1, pos2, pos3, normal) {
        positions[(offset + 0) * 3 + 0] = pos0.x;
        positions[(offset + 0) * 3 + 1] = pos0.y;
        positions[(offset + 0) * 3 + 2] = pos0.z;

        positions[(offset + 1) * 3 + 0] = pos1.x;
        positions[(offset + 1) * 3 + 1] = pos1.y;
        positions[(offset + 1) * 3 + 2] = pos1.z;

        positions[(offset + 2) * 3 + 0] = pos2.x;
        positions[(offset + 2) * 3 + 1] = pos2.y;
        positions[(offset + 2) * 3 + 2] = pos2.z;

        positions[(offset + 3) * 3 + 0] = pos3.x;
        positions[(offset + 3) * 3 + 1] = pos3.y;
        positions[(offset + 3) * 3 + 2] = pos3.z;

        normals[(offset + 0) * 3 + 0] = normal.x;
        normals[(offset + 0) * 3 + 1] = normal.y;
        normals[(offset + 0) * 3 + 2] = normal.z;

        normals[(offset + 1) * 3 + 0] = normal.x;
        normals[(offset + 1) * 3 + 1] = normal.y;
        normals[(offset + 1) * 3 + 2] = normal.z;

        normals[(offset + 2) * 3 + 0] = normal.x;
        normals[(offset + 2) * 3 + 1] = normal.y;
        normals[(offset + 2) * 3 + 2] = normal.z;

        normals[(offset + 3) * 3 + 0] = normal.x;
        normals[(offset + 3) * 3 + 1] = normal.y;
        normals[(offset + 3) * 3 + 2] = normal.z;
    }
}
