import * as THREE from "three";

/**
 * Cyan Euclidean grid (floor + walls). For immersive-ar, leave background null so passthrough
 * is visible; an opaque scene.background would hide the camera feed.
 */
export default function setupGridEnvironment(scene) {
    const gridColor = 0x00ffff;
    const gridSize = 20;
    const gridDivisions = 20;

    scene.background = null;

    // Floor grid
    const floorGrid = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    floorGrid.position.y = -1.5;
    floorGrid.material.opacity = 0.45;
    floorGrid.material.transparent = true;
    scene.add(floorGrid);

    // Back wall grid
    const backWall = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    backWall.rotation.x = Math.PI / 2;
    backWall.position.z = -gridSize / 2;
    backWall.position.y = gridSize / 2 - 1.0;
    backWall.material.opacity = 0.25;
    backWall.material.transparent = true;
    scene.add(backWall);

    // Left wall grid
    const leftWall = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    leftWall.rotation.z = Math.PI / 2;
    leftWall.position.x = -gridSize / 2;
    leftWall.position.y = gridSize / 2 - 1.0;
    leftWall.material.opacity = 0.2;
    leftWall.material.transparent = true;
    scene.add(leftWall);

    // Right wall grid
    const rightWall = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    rightWall.rotation.z = Math.PI / 2;
    rightWall.position.x = gridSize / 2;
    rightWall.position.y = gridSize / 2 - 1.0;
    rightWall.material.opacity = 0.2;
    rightWall.material.transparent = true;
    scene.add(rightWall);

    return { floorGrid, backWall, leftWall, rightWall };
}
