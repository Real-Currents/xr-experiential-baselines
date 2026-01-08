import * as THREE from 'three';

import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory";

import { HTMLMesh } from "three/addons/interactive/HTMLMesh";
import Stats from "three/addons/libs/stats.module";

// IWSDK Integration - Step 1: Add imports
import { IWSDKBootstrap } from './iwsdk/IWSDKBootstrap';
// import { EnhancedControllerManager } from './iwsdk/EnhancedControllerManager';

import loadManager from "./setup/setupLoadManager";
import setupScene from "./setup/setupScene";
// import setupPortalClippingPlanes from "./setup/setupPortalClippingPlanes";
import setupVideoLayerManager from "./setup/setupVideoLayerManager";
import { checkControllerAction } from "./controllers";

let currentSession = null;
let initXRLayers = true;
let waiting_for_confirmation = false;

// IWSDK instances
let iwsdkBootstrap = null;
let enhancedControllerManager = null;

setTimeout(function init () {

    console.log("Initiate WebXR Layers scene with IWSDK integration!");

    let camera, controls, renderer, player, video, videoLayerManager;

    const body = document.body;

    const container = document.createElement('div');

    body.appendChild(container);

    const clock = new THREE.Clock();

    const canvas = window.document.createElement('canvas');

    const previewWindow = {
        width: window.innerWidth, // / 2, // 640,
        height: window.innerHeight + 10, // 480,
    };
    container.style = `display: block; background-color: #000; max-width: ${previewWindow.width}px; max-height: ${previewWindow.height}px; overflow: hidden;`;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( previewWindow.width, previewWindow.height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local');

    container.appendChild( renderer.domElement );

    camera = new THREE.PerspectiveCamera( 70, previewWindow.width / previewWindow.height, 1, 2000 );
    camera.layers.enable( 1 ); // render left view when no stereo available
    camera.position.set(0.0, 0.0, 0.0);

    window.addEventListener('resize', function () {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );

    }, false);

    controls = new OrbitControls(camera, container);
    controls.target.set(0, 0.0, -0.5);

    player = new THREE.Group();

    const scene = new THREE.Scene();
    const controllerModelFactory = new XRControllerModelFactory();
    const controllers = {
        left: null,
        right: null,
    };

    // IWSDK Integration - Step 2: Replace manual controller setup
    // (We'll keep the existing approach for now and enhance it gradually)

    for (let i = 0; i < 2; i++) {
        const raySpace = renderer.xr.getController(i);
        const gripSpace = renderer.xr.getControllerGrip(i);
        const mesh = controllerModelFactory.createControllerModel(gripSpace);

        gripSpace.add(mesh);

        gripSpace.addEventListener('connected', (e) => {

            raySpace.visible = true;
            gripSpace.visible = true;
            const handedness = e.data.handedness;
            controllers[handedness] = {
                gamepad: new GamepadWrapper(e.data.gamepad),
                raySpace,
                gripSpace,
                mesh
            };

            // IWSDK Enhancement: Notify IWSDK systems of controller connection
            console.log(`Controller connected: ${handedness}, integrating with IWSDK...`);
        });

        gripSpace.addEventListener('disconnected', (e) => {
            raySpace.visible = false;
            gripSpace.visible = false;
            for (const h in controllers) {
                if (controllers[h] !== null) controllers[h] = null;
            }

            // IWSDK Enhancement: Notify IWSDK systems of controller disconnection
            console.log('Controller disconnected, updating IWSDK...');
        });

        player.add(raySpace, gripSpace);
    }

    // Setup Stats
    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.maxWidth = "64px";
    stats.dom.style.minWidth = "60px";
    stats.dom.style.backgroundColor = "black";
    document.body.appendChild(stats.dom);

    const statsMesh = new HTMLMesh( stats.dom );
    statsMesh.position.set(-1.5, 0.5, -2.0);
    statsMesh.rotation.y = Math.PI / 4;
    statsMesh.scale.setScalar(4);
    statsMesh.material.colorWrite = true;
    statsMesh.material.transparent = false;

    // video
    video = document.getElementById( 'video' );

    container.addEventListener( 'click', function () {
        video.play();
    });

    videoLayerManager = setupVideoLayerManager(video, 2064, 2208, 0.090579710, 0.0, -2.5);

    container.append(loadManager.div);

    async function setupEnvironment (renderer, scene, videoLayerManager) {

        scene.add(player);
        scene.add(statsMesh);

        currentSession = null;
        videoLayerManager.initVideoLayer(false, renderer, scene, currentSession);

        // IWSDK Integration - Step 3: Initialize IWSDK systems
        try {
            console.log('Initializing IWSDK Bootstrap...');
            iwsdkBootstrap = new IWSDKBootstrap(scene, camera, renderer);
            await iwsdkBootstrap.initialize();
            console.log('IWSDK Bootstrap initialized successfully');
        } catch (error) {
            console.error('Failed to initialize IWSDK Bootstrap:', error);
            console.log('Continuing with traditional WebXR setup...');
        }

        const updateScene = await setupScene(scene, camera, controllers, player, videoLayerManager);

        renderer.setAnimationLoop(function render (t, frame ) {

            const data = {};
            const delta = clock.getDelta();
            const time = clock.getElapsedTime();

            const xr = renderer.xr;
            const gl = renderer.getContext();

            // Layer management logic (unchanged)
            if (!xr.isPresenting) {
                camera.layers.mask = 3;
            } else {
                camera.layers.mask = 1;
            }

            if (currentSession && xr.isPresenting) {
                const xrCamera = xr.getCamera(camera);
                if (xrCamera.cameras.length > 1) {
                    xrCamera.cameras[0].layers.mask = 3;
                    xrCamera.cameras[1].layers.mask = 5;
                }
            }

            waiting_for_confirmation = checkControllerAction(controllers, data, currentSession, waiting_for_confirmation);

            stats.begin();

            // XR Layers logic (unchanged)
            let guiLayer,
                equirectLayer,
                quadLayerPlain,
                quadLayerMips,
                quadLayerVideo;

            if (
                currentSession !== null
                && currentSession.renderState.layers !== undefined
                && currentSession.hasMediaLayer === undefined
                && initXRLayers && (
                    typeof XRWebGLBinding !== 'undefined'
                    && 'createProjectionLayer' in XRWebGLBinding.prototype
                )
            ) {

                console.log("Initialize media layer on currentSession:", currentSession);

                currentSession.hasMediaLayer = true;

                gl.makeXRCompatible().then(() => {

                    const glBinding = xr.getBinding();

                    currentSession.requestReferenceSpace('local-floor').then((refSpace) => {

                     guiLayer = glBinding.createQuadLayer({
                        width: statsMesh.geometry.parameters.width,
                        height: statsMesh.geometry.parameters.height,
                        viewPixelWidth: statsMesh.material.map.image.width,
                        viewPixelHeight: statsMesh.material.map.image.height,
                        space: refSpace,
                        transform: new XRRigidTransform(statsMesh.position, statsMesh.quaternion)
                     });
                     
                     quadLayerVideo = videoLayerManager.initVideoLayer(true, renderer, scene, currentSession, refSpace);

                     videoLayerManager.videoLayerInitialized = true;

                     currentSession.updateRenderState({
                        layers: (!!currentSession.renderState.layers.length > 0) ? [
                            quadLayerVideo,
                            guiLayer,
                            currentSession.renderState.layers[0]
                        ] : [
                            quadLayerVideo,
                            guiLayer
                        ]
                     });

                  });
               });

            }

            if (currentSession !== null && !!guiLayer && (guiLayer.needsRedraw || guiLayer.needsUpdate)) {

               const glayer = xr.getBinding().getSubImage(guiLayer, frame);
               renderer.state.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
               gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
               const canvas = statsMesh.material.map.image;
               gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
               guiLayer.needsUpdate = false;

            }

            // IWSDK Integration - Step 4: Update IWSDK systems in render loop
            // XRInputManager.update() requires (xrManager, delta, time) parameters
            if (iwsdkBootstrap) {
                iwsdkBootstrap.update(xr, delta, time);
            }

            updateScene(
                currentSession,
                delta,
                time,
                (data.hasOwnProperty("action")) ? data : null,
                null
            );

            renderer.render(scene, camera);

            stats.end();

            statsMesh.material.map.update();
        });

        return renderer;
    }

    // Session management (enhanced with IWSDK integration)
    async function getXRSession (xr) {

        console.log("xr", `${JSON.stringify(xr)}`);

        let session = null;

        const useXRLayers =  initXRLayers && (typeof XRWebGLBinding !== 'undefined' && 'createProjectionLayer' in XRWebGLBinding.prototype);
        try {
            if (!useXRLayers) {
                session = await (xr.requestSession("immersive-vr", {
                    optionalFeatures: [
                        "local-floor"
                    ]
                }));
            } else {
                session = await (xr.requestSession("immersive-ar", {
                    optionalFeatures: [
                        "layers"
                    ],
                    requiredFeatures: [
                        "local-floor"
                    ]
                }));
            }
        } catch (e) {
            session = await (xr.requestSession("immersive-vr", {
                optionalFeatures: [
                    "local-floor"
                ]
            }));
        } finally {

            previewWindow.width = window.innerWidth;
            previewWindow.height = window.innerHeight;

            renderer.setSize(previewWindow.width, previewWindow.height);

            camera.aspect = previewWindow.width / previewWindow.height;
            camera.updateProjectionMatrix();

            session.requestReferenceSpace("local").then((xrReferenceSpace) => {
                session.requestAnimationFrame((time, xrFrame) => {
                    const viewer = xrFrame.getViewerPose(xrReferenceSpace);

                    const tick = time % 3333;

                    if (tick < 1) try {
                        for (const xrView of viewer.views) {
                            const xrViewport = XRWebGLLayer.getViewport(xrView);
                            console.log({
                                xrReferenceSpace,
                                xrView,
                                xrViewport
                            });
                        }
                    } catch (e) {
                        console.log({
                            error: e
                        });
                    }
                });
            });

            return session;
        }
    }

    async function onSessionStarted (session, config) {
        try {
            await renderer.xr.setSession(session, config.useXRLayers);
        } catch (e) {
            console.log("Error:", e);
        }
        currentSession = session;
        currentSession["config"] = config;
        currentSession.addEventListener("end", onSessionEnded);

        // IWSDK Integration - Step 5: Notify IWSDK of session start
        if (iwsdkBootstrap) {
            iwsdkBootstrap.onSessionStarted(session);
        }

        if (!!config && config.useXRLayers && !!config.videoLayerManager) {
            config.videoLayerManager.clearVideoLayer(!config.useXRLayers, renderer, scene, session);
        }

        console.log("Init video layer: ", config.videoLayerManager.videoLayerInitialized)

        video.play();
    }

    function onSessionEnded (session) {

        const config = currentSession["config"];

        console.log("Ended WebXR session!", session, config);

        currentSession.removeEventListener("end", onSessionEnded);
        currentSession = null;

        // IWSDK Integration - Step 6: Notify IWSDK of session end
        if (iwsdkBootstrap) {
            iwsdkBootstrap.onSessionEnded();
        }

        if (videoLayerManager.videoLayerInitialized && !!config.videoLayerManager) {
            console.log("Clear video layer");
            config.videoLayerManager.clearVideoLayer(true, renderer, scene, session);
            console.log("Init video layer");
            config.videoLayerManager.initVideoLayer(false, renderer, scene, session);
        }
    }

    const xr_button = document.createElement("button");
    xr_button.className = "xr-button";
    xr_button.disabled = true;
    xr_button.innerHTML = "Preparing...";
    xr_button.addEventListener('click', async () => {

        console.log("XR Button clicked");

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Does xr object exist?
        let nativeWebXRSupport = "xr" in navigator;

        try {

            if (nativeWebXRSupport) nativeWebXRSupport = (
                // Does xr object support sessions?
                await navigator.xr.isSessionSupported( 'immersive-ar' ) ||
                await navigator.xr.isSessionSupported('immersive-vr') ||
                nativeWebXRSupport
            )

        } catch (e) {
            console.log(e.message, navigator);
        }

        // If no XR/VR available, setup Immersive Web Emulation Runtime (iwer) and emulated XR device (@iwer/devui)
        if (!nativeWebXRSupport) {
            const xrDevice = new XRDevice(metaQuest3);
            xrDevice.installRuntime();
            xrDevice.fovy = (75 / 180) * Math.PI;
            xrDevice.ipd = 0;
            window.xrdevice = xrDevice;
            xrDevice.controllers.right.position.set(0.15649, 1.43474, -0.38368);
            xrDevice.controllers.right.quaternion.set(
                0.14766305685043335,
                0.02471366710960865,
                -0.0037767395842820406,
                0.9887216687202454,
            );
            xrDevice.controllers.left.position.set(-0.15649, 1.43474, -0.38368);
            xrDevice.controllers.left.quaternion.set(
                0.14766305685043335,
                0.02471366710960865,
                -0.0037767395842820406,
                0.9887216687202454,
            );
            new DevUI(xrDevice);

        }

        const useXRLayers =  initXRLayers && (typeof XRWebGLBinding !== 'undefined' && 'createProjectionLayer' in XRWebGLBinding.prototype);

        const session = await getXRSession(navigator.xr);

        await onSessionStarted(session, { useXRLayers, videoLayerManager });

        camera.position.y = 0;
        player.position.y = camera.position.y;
        player.position.z = camera.position.z;

        xr_button.innerHTML = "Reload";
        xr_button.onclick = function () {
            xr_button.disabled = true;
            window.location.reload();
        };
    });

    document.body.appendChild(xr_button);

    xr_button.innerHTML = "Enter XR";
    xr_button.style.opacity = 0.75;
    xr_button.disabled = false;
    delete xr_button.disabled;

    canvas.addEventListener("webglcontextlost", (event) => {
        event.canceled = true;
        console.log("webglcontextlost");
    });

    canvas.addEventListener("webglcontextrestored", (event) => {
        setupEnvironment(renderer, scene, videoLayerManager);
        console.log("webglcontextrestored");
    });

    setupEnvironment(renderer, scene, videoLayerManager)
        .then((renderer) => {
            console.log("WebXR has been initialized with IWSDK integration: ", renderer);
        });

}, 533);
