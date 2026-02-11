import * as THREE from "three";

/**
 * Creates a dark void environment with cyan Euclidean grid lines
 * on the floor and surrounding walls.
 */
export default function setupGridEnvironment(scene) {
    const gridColor = 0x00ffff;
    const gridSize = 20;
    const gridDivisions = 20;

    // Dark background
    scene.background = new THREE.Color(0x050505);

    // Floor grid
    const floorGrid = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    floorGrid.position.y = -1.0;
    floorGrid.material.opacity = 0.3;
    floorGrid.material.transparent = true;
    scene.add(floorGrid);

    // Back wall grid
    const backWall = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    backWall.rotation.x = Math.PI / 2;
    backWall.position.z = -gridSize / 2;
    backWall.position.y = gridSize / 2 - 1.0;
    backWall.material.opacity = 0.15;
    backWall.material.transparent = true;
    scene.add(backWall);

    // Left wall grid
    const leftWall = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    leftWall.rotation.z = Math.PI / 2;
    leftWall.position.x = -gridSize / 2;
    leftWall.position.y = gridSize / 2 - 1.0;
    leftWall.material.opacity = 0.1;
    leftWall.material.transparent = true;
    scene.add(leftWall);

    // Right wall grid
    const rightWall = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    rightWall.rotation.z = Math.PI / 2;
    rightWall.position.x = gridSize / 2;
    rightWall.position.y = gridSize / 2 - 1.0;
    rightWall.material.opacity = 0.1;
    rightWall.material.transparent = true;
    scene.add(rightWall);

    return { floorGrid, backWall, leftWall, rightWall };
}
