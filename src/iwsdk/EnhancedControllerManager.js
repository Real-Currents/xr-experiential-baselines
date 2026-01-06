import { XRInputManager, XRControllerVisualAdapter } from '@iwsdk/xr-input';
import { GamepadWrapper, XR_BUTTONS } from 'gamepad-wrapper';

/**
 * Enhanced Controller Manager that bridges IWSDK XR Input with existing gamepad-wrapper approach
 * Maintains compatibility while adding IWSDK benefits
 */
export class EnhancedControllerManager {
  constructor(world, scene, renderer) {
    this.world = world;
    this.scene = scene;
    this.renderer = renderer;
    
    // IWSDK XR Input Manager
    this.iwsdkInputManager = null;
    
    // Legacy controller compatibility
    this.controllers = {
      left: null,
      right: null
    };
    
    // Visual adapters for controller models
    this.controllerAdapters = new Map();
    
    // Event handlers
    this._eventHandlers = {};
    
    console.log('Enhanced Controller Manager initialized');
  }

  async initialize() {
    console.log('Initializing Enhanced Controller Manager...');
    
    // Initialize IWSDK Input Manager
    this.iwsdkInputManager = new XRInputManager({
      world: this.world,
      scene: this.scene
    });

    await this.iwsdkInputManager.initialize();
    
    // Set up IWSDK event handlers
    this.setupIWSDKEvents();
    
    // Set up legacy compatibility
    this.setupLegacyCompatibility();
    
    console.log('Enhanced Controller Manager ready');
  }

  setupIWSDKEvents() {
    // Controller connection events
    this.iwsdkInputManager.on('controllerAdded', (controller) => {
      console.log(`IWSDK Controller added: ${controller.hand}`);
      
      // Create visual adapter
      const adapter = new XRControllerVisualAdapter(controller);
      this.controllerAdapters.set(controller.id, adapter);
      this.scene.add(adapter.mesh);
      
      // Update legacy controller object
      this.updateLegacyController(controller);
      
      this.emit('controllerConnected', controller);
    });

    this.iwsdkInputManager.on('controllerRemoved', (controller) => {
      console.log(`IWSDK Controller removed: ${controller.hand}`);
      
      // Remove visual adapter
      const adapter = this.controllerAdapters.get(controller.id);
      if (adapter) {
        this.scene.remove(adapter.mesh);
        adapter.dispose();
        this.controllerAdapters.delete(controller.id);
      }
      
      // Clear legacy controller
      this.controllers[controller.hand] = null;
      
      this.emit('controllerDisconnected', controller);
    });

    // Input events
    this.iwsdkInputManager.on('trigger', (event) => {
      this.emit('trigger', event);
    });

    this.iwsdkInputManager.on('squeeze', (event) => {
      this.emit('squeeze', event);
    });

    this.iwsdkInputManager.on('thumbstick', (event) => {
      this.emit('thumbstick', event);
    });

    this.iwsdkInputManager.on('button', (event) => {
      this.emit('button', event);
    });
  }

  setupLegacyCompatibility() {
    // This maintains compatibility with existing checkControllerAction logic
    this.iwsdkInputManager.on('controllerAdded', (controller) => {
      const legacyController = {
        gamepad: new GamepadWrapper(controller.gamepad),
        raySpace: controller.raySpace,
        gripSpace: controller.gripSpace,
        mesh: controller.mesh,
        hand: controller.hand,
        // IWSDK enhancements
        iwsdkController: controller
      };
      
      this.controllers[controller.hand] = legacyController;
    });
  }

  updateLegacyController(iwsdkController) {
    const hand = iwsdkController.hand;
    if (this.controllers[hand]) {
      // Update the gamepad wrapper with latest gamepad data
      if (iwsdkController.gamepad) {
        this.controllers[hand].gamepad = new GamepadWrapper(iwsdkController.gamepad);
      }
    }
  }

  // Legacy compatibility methods
  getController(hand) {
    return this.controllers[hand];
  }

  getControllers() {
    return this.controllers;
  }

  // Enhanced IWSDK methods
  getIWSDKController(hand) {
    const legacy = this.controllers[hand];
    return legacy ? legacy.iwsdkController : null;
  }

  getAllIWSDKControllers() {
    return this.iwsdkInputManager ? this.iwsdkInputManager.getControllers() : [];
  }

  setIntersectableObjects(objects) {
    if (this.iwsdkInputManager) {
      this.iwsdkInputManager.setIntersectableObjects(objects);
    }
  }

  update(deltaTime) {
    if (this.iwsdkInputManager) {
      this.iwsdkInputManager.update(deltaTime);
    }
    
    // Update controller adapters
    this.controllerAdapters.forEach(adapter => {
      adapter.update(deltaTime);
    });
  }

  // Event system
  on(eventName, callback) {
    if (!this._eventHandlers[eventName]) {
      this._eventHandlers[eventName] = [];
    }
    this._eventHandlers[eventName].push(callback);
  }

  emit(eventName, data) {
    if (this._eventHandlers[eventName]) {
      this._eventHandlers[eventName].forEach(callback => callback(data));
    }
  }

  dispose() {
    console.log('Disposing Enhanced Controller Manager');
    
    // Dispose visual adapters
    this.controllerAdapters.forEach(adapter => {
      this.scene.remove(adapter.mesh);
      adapter.dispose();
    });
    this.controllerAdapters.clear();
    
    // Dispose IWSDK input manager
    if (this.iwsdkInputManager) {
      this.iwsdkInputManager.dispose();
    }
    
    // Clear controllers
    this.controllers.left = null;
    this.controllers.right = null;
    
    // Clear event handlers
    this._eventHandlers = {};
  }
}

export default EnhancedControllerManager;
