// import * as PIXI from "pixi.js";
// import { Spine, TextureAtlas, SpineSprite } from "pixi-spine";
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js-legacy@7.4.3/+esm';
import * as spine from 'https://cdn.jsdelivr.net/npm/pixi-spine@4.0.6/+esm';
import * as spineRuntime from 'https://cdn.jsdelivr.net/npm/@pixi-spine/runtime-3.8@4.0.6/+esm';
// console.log('spineRuntime');
// console.log(spineRuntime);

const { Spine, TextureAtlas } = spine;
const { SkeletonBinary, SkeletonJson, AtlasAttachmentLoader } = spineRuntime;

// console.log('all imported');
// console.log('PIXI');
// console.log(PIXI);
// console.log('spine');
// console.log(spine);
// console.log('spineRuntime');
// console.log(spineRuntime);
// console.log('Spine');
// console.log(Spine);
// console.log('TextureAtlas');
// console.log(TextureAtlas);
// console.log('SkeletonBinary');
// console.log(SkeletonBinary);
// console.log('SkeletonJson');
// console.log(SkeletonJson);
// console.log('AtlasAttachmentLoader');
// console.log(AtlasAttachmentLoader);

import { FileProcessor } from "./utils/FileProcessor.js";
import resourceManager from "./utils/ResourceManager.js";
import { hasRequiredFeatures } from "./utils/browserSupport.js";
import { getMessage, formatErrorMessage, SpineMessages } from "./utils/messages.js";


class SpineViewer extends HTMLElement {
  constructor() {
    super();
    this.app = null;
    this.spine = null;
    // File processing utilities
    this.fileProcessor = new FileProcessor();
    this.resourceManager = resourceManager.createScope();
    // debug skeleton drawing
    this.drawSkeleton = false;
    this.drawSkeletonFn = null; // optional custom drawer callback
    this.skeletonDebugGraphics = null;
    // (Removed persistent bone label system; names only shown in hover tooltip)
    // zoom settings
    this.zoomEnabled = true;
    this.minZoom = 0.05;
    this.maxZoom = 5.0;
    this.zoomStep = 1.1; // multiplicative factor per wheel notch (deltaY sign decides in/out)
    this._wheelListener = null;
    // interaction settings
    this.panEnabled = true;
    this.pinchZoomEnabled = true;
    this.zoomSmooth = false; // default: immediate zoom (user can enable smooth)
    this.zoomSmoothSpeed = 0.15; // lerp factor per frame
    this.zoomResetValue = 0.3;
    // internal interaction state
    this._zoomTarget = null; // number | null
    this._zoomAnchor = null; // {x,y} in local world before scaling
    this._isPanning = false;
    this._panStart = null; // {x,y}
    this._panContainerStart = null; // {x,y}
    this._activePointers = new Map(); // pointerId -> {x,y}
    this._pointerListenerCleanup = [];
    // bone hover settings
    this.boneHoverEnabled = true;
    this.boneHoverRadius = 18; // pixels in screen space
    this._boneHoverListener = null;
    this._hoveredBoneName = null;
    this._boneTooltipContainer = null;
    // bone selection state (persistent until clicking empty space)
    this._selectedBoneName = null;
    this._selectedBone = null;
    // theme / highlight (default yellow; can be changed via setters)
    this.highlightColor = 0xffcc00;
    this.boneHoverJointColor = this.highlightColor; // unified highlight
    this.boneHoverJointAlpha = 0.9;
    this.boneHoverJointRadius = 8; // base radius (will inverse-scale)
    this._boneHoverGraphics = null;
    // Themed joint hover colors (fallback, will try to derive from CSS --danger)
    this.jointOuterColor = 0xff1236;        // outer glow
    this.jointRingStrokeColor = 0xff2745;   // ring stroke
    this.jointRingFillColor = 0xff1a38;     // ring fill
    this.jointCoreColor = 0xff2d55;         // core
    // Multi-track state
    this._multiTrackEnabled = false;
    this._multiTrackSequence = null;
    this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return ["src", "animation-name", "scale"];
  }

  connectedCallback() {
    // keep default behavior (no debug skeleton) when auto-rendering
    this.render();
  }

  /**
   * Renders (or re-renders) the viewer.
   * @param {boolean|function} draw_skeleton - If truthy enables skeleton debug drawing. If a function, receives (graphics, spineInstance) each frame to perform custom drawing.
   */
  async render(draw_skeleton) {
    // 清理之前的内容
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.shadowRoot.innerHTML = "";

    // normalize draw skeleton option (store for renderSpine)
    if (typeof draw_skeleton === "function") {
      this.drawSkeleton = true;
      this.drawSkeletonFn = draw_skeleton;
    } else if (draw_skeleton) {
      this.drawSkeleton = true;
      this.drawSkeletonFn = null;
    } else {
      this.drawSkeleton = false;
      this.drawSkeletonFn = null;
    }

    const src = this.getAttribute("src");
    const animationName = this.getAttribute("animation-name") || "idle";
    const scale = parseFloat(this.getAttribute("scale")) || 0.3;

    const container = document.createElement("div");
    this.container = container;
    container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    `;
    this.shadowRoot.appendChild(container);

    // 监听窗口大小变化
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this);

    if (!src) {
      this.shadowRoot.innerHTML =
        '<div style="color: white;">選擇 .skel + .atlas + texture 開始 </div>';
      return;
    }

    await this.renderSpine({ src, animationName, scale });
  }

  async renderSpine({
    src,
    animationName = this.getAttribute("animation-name"),
    scale = this.getAttribute("scale") || 0.3,
  }) {
    if (this.app) {
      this._removeWheelZoom();
      this.app.destroy(true);
      this.app = null;
    }
    // 清理spine相关引用
    this.spine = null;
    this.spineContainer = null;
    if (this.skeletonDebugGraphics) {
      this.skeletonDebugGraphics.destroy();
      this.skeletonDebugGraphics = null;
    }
    // no persistent bone label container to clear

    try {
      // 创建PIXI应用
      this.app = new PIXI.Application({
        width: this.clientWidth || 400,
        height: this.clientHeight || 400,
        backgroundColor: 0x2b2b2b, // dark gray background to match dark theme
        backgroundAlpha: 1,
        antialias: true,
        powerPreference: "high-performance",
      });

      this.container.appendChild(this.app.view);

      // setup wheel zoom listener
      this._setupWheelZoom();
      // setup pointer interactions (pan & pinch)
      this._setupPointerInteractions();
      // setup interaction ticker (smooth zoom independent of skeleton debug)
      this._setupInteractionTicker();
      // setup bone hover detection
      this._setupBoneHover();

      // 预加载资源
      this.spine = await this.loadSpine(src);

      if (this.spine.spineData) {
        // 创建容器来包装spine
        this.spineContainer = new PIXI.Container();
        this.spineContainer.sortableChildren = true; // allow zIndex ordering (hover graphics, labels)
        this.spineContainer.addChild(this.spine);
        this.app.stage.addChild(this.spineContainer);

        // 设置动画
        if (this.spine.state.data.skeletonData.findAnimation(animationName)) {
          this.spine.state.setAnimation(0, animationName, true);
        } else {
          const animations = this.spine.spineData.animations;
          if (animations.length > 0) {
            this.spine.state.setAnimation(0, animations[0].name, true);
          }
        }

        // 获取边界并设置位置
        this.spine.skeleton.setToSetupPose();
        this.spine.update(0);
        const localRect = this.spine.getLocalBounds();
        this.spine.position.set(-localRect.x, -localRect.y);

        this.setScale(scale);

        // setup skeleton debug drawing if requested
        if (this.drawSkeleton) {
          this.enableSkeletonDebug();
        }
      }
    } catch (error) {
      console.error("Failed to load Spine animation:");
      console.error(error)

      // Use bilingual error message system
      const errorMessage = this._getDisplayErrorMessage(error);
      this._displayError(errorMessage + '<br/>Refresh the page and try again.');

      // Clean up on error
      this._cleanupOnError();
    }
  }

  async loadSpineLocal(src) {
    // Normalize expected shape from index.html's onSpineFilesSelected
    // src = { spineSkeleton: {src, format, name?}, spineAtlas: {src, format}, spineImage: {name, url, src, format} }
    if (!src) throw new Error('loadSpineLocal: source object required');
    const { spineSkeleton, spineAtlas, spineImage, spineImages } = src;
    if (!spineSkeleton || !spineAtlas) throw new Error('loadSpineLocal: spineSkeleton and spineAtlas are required');

    const decodeDataURLToUint8 = (dataUrl) => {
      const base64 = dataUrl.split(',')[1];
      const bin = atob(base64);
      return Uint8Array.from(bin, c => c.charCodeAt(0));
    };
    const dataUrlToUTF8 = (dataUrl) => new TextDecoder('utf-8').decode(decodeDataURLToUint8(dataUrl));

    // 1. Atlas text
    let atlasText = '';
    if (spineAtlas.src?.startsWith('data:')) {
      atlasText = dataUrlToUTF8(spineAtlas.src);
    } else if (spineAtlas.text) {
      atlasText = await spineAtlas.text();
    } else if (typeof spineAtlas === 'string') {
      atlasText = spineAtlas;
    } else {
      throw new Error('Unsupported atlas format for local load');
    }

    // 2. Textures: accept single or multiple
    const imageList = [];
    if (spineImage) imageList.push(spineImage);
    if (Array.isArray(spineImages)) imageList.push(...spineImages);
    const pageTextureMap = new Map();
    for (const img of imageList) {
      try {
        const texture = img.url ? PIXI.Texture.from(img.url) : (img.src ? PIXI.Texture.from(img.src) : null);
        if (!texture) continue;
        const baseName = (img.name || 'texture').replace(/\.(png|jpg|jpeg|webp|avif)$/i, '');
        pageTextureMap.set(baseName, texture);
      } catch (err) {
        console.warn('Failed to init texture for', img?.name, err);
      }
    }

    // 3. TextureAtlas
    const textureAtlas = new TextureAtlas(atlasText, (path, loaderCb) => {
      const key = path.replace(/\.(png|jpg|jpeg|webp|avif)$/i, '');
      let tex = pageTextureMap.get(key) || pageTextureMap.get(path);
      if (!tex) {
        // fallback to loading by path (may fail if local only)
        try { tex = PIXI.Texture.from(path); } catch { }
      }
      if (!tex) throw new Error(`Texture for atlas page '${path}' not found`);
      loaderCb(tex.baseTexture);
    });

    // 4. Parse skeleton
    const atlasLoader = new AtlasAttachmentLoader(textureAtlas);
    const skeletonFormat = spineSkeleton.format || (spineSkeleton.name?.match(/\.[^.]+$/)?.[0]);
    const isBinary = skeletonFormat === '.skel';
    let spineData;
    try {
      if (isBinary) {
        if (!spineSkeleton.src?.startsWith('data:')) throw new Error('Binary skeleton must provide data URL');
        const bytes = decodeDataURLToUint8(spineSkeleton.src);
        const binary = new SkeletonBinary(atlasLoader);
        spineData = binary.readSkeletonData(bytes);
      } else {
        let jsonText = '';
        if (spineSkeleton.src?.startsWith('data:')) {
          jsonText = dataUrlToUTF8(spineSkeleton.src);
        } else if (spineSkeleton.text) {
          jsonText = await spineSkeleton.text();
        } else {
          throw new Error('JSON skeleton must provide data URL or text method');
        }
        const jsonParser = new SkeletonJson(atlasLoader);
        spineData = jsonParser.readSkeletonData(JSON.parse(jsonText));
      }
    } catch (e) {
      console.error('[SpineViewer] Failed parsing local skeleton:', e);
      throw e;
    }

    return new Spine(spineData);
  }

  async loadSpineRemote(src) {
    // Original remote file loading
    const resource = await PIXI.Assets.load(src);
    if (resource && resource.spineData) {
      return new Spine(resource.spineData);
    } else {
      throw new Error("Failed to load Spine data");
    }
  }

  async loadSpine(src) {
    try {
      if (src instanceof (Object)) {
        return this.loadSpineLocal(src);
      } else {
        return this.loadSpineRemote(src);
      }
    } catch (error) {
      console.error('Resource loading failed:', error);

      // Enhanced error handling with resource-specific messages
      if (error.name === 'TypeError' || error.message.includes('network')) {
        throw new Error(getMessage('network.connection_failed'));
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        throw new Error(getMessage('network.not_found'));
      } else if (error.message.includes('timeout')) {
        throw new Error(getMessage('network.timeout'));
      } else if (error.message.includes('forbidden') || error.message.includes('403')) {
        throw new Error(getMessage('network.forbidden'));
      } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
        throw new Error(getMessage('network.unauthorized'));
      } else {
        throw new Error(getMessage('resource.load_failed', { resource: src || 'Spine data' }));
      }
    }
  }

  /**
   * Load a local file and render it in the viewer
   * @param {File} file - The local Spine file to load (.skel or .json)
   * @param {Object} options - Optional configuration
   * @param {string} options.animationName - Animation name to play
   * @param {number} options.scale - Scale factor for the animation
   * @param {boolean|function} options.drawSkeleton - Enable skeleton debug drawing
   * @returns {Promise<void>}
   */
  async loadLocalFile(file, options = {}) {
    // Check browser support with localized error message
    if (!hasRequiredFeatures()) {
      const error = new Error(getMessage('browser.feature_not_supported', { feature: 'local file loading' }));
      this._displayError(formatErrorMessage('browser.feature_not_supported', { feature: 'local file loading' }));
      throw error;
    }

    try {
      // Show loading progress
      this._showProgress(getMessage('processor.processing'));
      // Extract options with defaults
      const {
        animationName = this.getAttribute('animation-name') || 'idle',
        scale = parseFloat(this.getAttribute('scale')) || 0.3,
        drawSkeleton = false
      } = options;

      // Process the file using FileProcessor
      const processedFile = await this.fileProcessor.processSpineFile(file);

      // Create object URL for the main file
      const objectURL = processedFile.objectURL;

      // Store the URL in resource manager for cleanup
      this.resourceManager.createObjectURL(file, 'main-spine-file');

      // Check if we need to handle dependencies (atlas files, textures)
      if (processedFile.dependencies && processedFile.dependencies.missing.length > 0) {
        console.warn('SpineViewer: Missing dependencies detected:', processedFile.dependencies.missing);
        console.warn('Some textures or atlas files may not load correctly. Consider providing all related files.');
      }

      // Update the src attribute to trigger render with the blob URL
      this.setAttribute('src', objectURL);

      // Store draw skeleton option for render
      if (typeof drawSkeleton === 'function') {
        this.drawSkeleton = true;
        this.drawSkeletonFn = drawSkeleton;
      } else if (drawSkeleton) {
        this.drawSkeleton = true;
        this.drawSkeletonFn = null;
      } else {
        this.drawSkeleton = false;
        this.drawSkeletonFn = null;
      }

      // Update animation and scale attributes
      if (animationName !== this.getAttribute('animation-name')) {
        this.setAttribute('animation-name', animationName);
      }
      if (scale !== parseFloat(this.getAttribute('scale'))) {
        this.setAttribute('scale', scale.toString());
      }

      // Render the animation
      await this.renderSpine({
        src: objectURL,
        animationName,
        scale
      });

      console.debug(`SpineViewer: Successfully loaded local file: ${file.name}`);

      // Show success message briefly
      this._showProgress(getMessage('spine.load_success'), 'success');

      return {
        fileName: file.name,
        fileType: processedFile.type,
        objectURL: objectURL,
        dependencies: processedFile.dependencies
      };

    } catch (error) {
      console.error('SpineViewer: Failed to load local file:', error);

      // Use integrated error handling with bilingual messages
      const errorMessage = this._getDisplayErrorMessage(error);
      this._displayError(errorMessage);

      // Clean up resources on error
      this._cleanupOnError();

      throw error;
    }
  }

  /**
   * Load multiple local files with dependency resolution
   * @param {FileList|Array<File>} files - Array of files including main spine file and dependencies
   * @param {Object} options - Optional configuration
   * @returns {Promise<void>}
   */
  async loadLocalFiles(files, options = {}) {
    // Check browser support with localized error message
    if (!hasRequiredFeatures()) {
      const error = new Error(getMessage('browser.feature_not_supported', { feature: 'local file loading' }));
      this._displayError(formatErrorMessage('browser.feature_not_supported', { feature: 'local file loading' }));
      throw error;
    }

    try {
      // Show loading progress
      this._showProgress(getMessage('processor.processing'));
      // Process multiple files to resolve dependencies
      const result = await this.fileProcessor.processMultipleFiles(files);

      if (!result.mainFile) {
        throw new Error(getMessage('file.validation_failed', { error: getMessage('spine.invalid_extension') }));
      }

      if (result.errors.length > 0) {
        console.warn('SpineViewer: Errors during file processing:', result.errors);
        // Show warning for processing errors but continue
        this._showProgress(getMessage('file.multiple_errors'), 'warning');
      }

      // Register atlas and texture URLs in resource manager
      if (result.dependencies.atlas) {
        this.resourceManager.createObjectURL(null, 'atlas-file');
        // Note: The atlas URL is already created by FileProcessor
      }

      result.dependencies.textures.forEach((texture, index) => {
        this.resourceManager.createObjectURL(null, `texture-${index}`);
        // Note: The texture URLs are already created by FileProcessor
      });

      // Load the main file
      const mainFileURL = result.mainFile.objectURL;

      // Extract options with defaults
      const {
        animationName = this.getAttribute('animation-name') || 'idle',
        scale = parseFloat(this.getAttribute('scale')) || 0.3,
        drawSkeleton = false
      } = options;

      // Update attributes and render
      this.setAttribute('src', mainFileURL);

      if (animationName !== this.getAttribute('animation-name')) {
        this.setAttribute('animation-name', animationName);
      }
      if (scale !== parseFloat(this.getAttribute('scale'))) {
        this.setAttribute('scale', scale.toString());
      }

      // Store draw skeleton option for render
      if (typeof drawSkeleton === 'function') {
        this.drawSkeleton = true;
        this.drawSkeletonFn = drawSkeleton;
      } else if (drawSkeleton) {
        this.drawSkeleton = true;
        this.drawSkeletonFn = null;
      } else {
        this.drawSkeleton = false;
        this.drawSkeletonFn = null;
      }

      // Render the animation
      await this.renderSpine({
        src: mainFileURL,
        animationName,
        scale
      });

      console.debug(`SpineViewer: Successfully loaded ${result.processed.length} files`);

      // Show success message briefly
      this._showProgress(getMessage('spine.load_success'), 'success');

      return {
        mainFile: result.mainFile,
        dependencies: result.dependencies,
        processed: result.processed,
        errors: result.errors
      };

    } catch (error) {
      console.error('SpineViewer: Failed to load local files:', error);

      // Use integrated error handling with bilingual messages
      const errorMessage = this._getDisplayErrorMessage(error);
      this._displayError(errorMessage);

      // Clean up resources on error
      this._cleanupOnError();

      throw error;
    }
  }

  /**
   * Check if the browser supports local file loading
   * @returns {boolean} True if local file loading is supported
   */
  static supportsLocalFiles() {
    return hasRequiredFeatures();
  }

  /**
   * Get browser capability information for troubleshooting
   * @returns {Object} Browser capability details
   */
  static async getBrowserCapabilities() {
    const { getBrowserCapabilities } = await import('./utils/browserSupport.js');
    return getBrowserCapabilities();
  }

  /**
   * Clear all local file resources and reset viewer
   */
  clearLocalFiles() {
    // Clean up resources
    if (this.resourceManager) {
      this.resourceManager.cleanup();
    }
    if (this.fileProcessor) {
      this.fileProcessor.cleanupAllUrls();
    }

    // Reset src attribute
    this.removeAttribute('src');

    // Clear the viewer content
    this.shadowRoot.innerHTML = '';

    // Show reset success message
    this._showProgress(getMessage('spine.reset_success'), 'success');

    console.debug('SpineViewer: Cleared all local file resources');
  }

  centerSpine() {
    if (!this.spineContainer || !this.app || !this.spine) return;

    this.spineContainer.position.set(
      (this.app.screen.width - this.spineContainer.width) * 0.5,
      (this.app.screen.height - this.spineContainer.height) * 0.5
    );
  }

  handleResize() {
    if (!this.app || !this.spine || !this.spineContainer) return;

    this.app.renderer.resize(this.clientWidth || 400, this.clientHeight || 400);
    this.centerSpine();
  }

  // Multi-Track Animation Methods

  /**
   * Enable multi-track mode
   * @param {Object} options - Multi-track configuration options
   * @returns {MultiTrackSequence} The sequence controller
   */
  enableMultiTrack(options = {}) {
    if (this._multiTrackSequence) {
      console.warn('Multi-track mode already enabled');
      return this._multiTrackSequence;
    }

    // Lazy import to avoid loading if not needed
    import('./models/MultiTrackSequence.js').then(({ MultiTrackSequence }) => {
      this._multiTrackSequence = new MultiTrackSequence(options);
      this._multiTrackEnabled = true;

      this.dispatchEvent(new CustomEvent('multi-track-enabled', {
        detail: { sequence: this._multiTrackSequence }
      }));
    });

    return this._multiTrackSequence;
  }

  /**
   * Disable multi-track mode and revert to single-track
   */
  disableMultiTrack() {
    if (!this._multiTrackEnabled) {
      return;
    }

    this._multiTrackEnabled = false;
    this._multiTrackSequence = null;

    this.dispatchEvent(new CustomEvent('multi-track-disabled'));
  }

  /**
   * Get current multi-track sequence
   * @returns {MultiTrackSequence|null}
   */
  getMultiTrackSequence() {
    return this._multiTrackSequence || null;
  }

  /**
   * Check if multi-track mode is enabled
   * @returns {boolean}
   */
  isMultiTrackEnabled() {
    return this._multiTrackEnabled === true;
  }

  disconnectedCallback() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this._removeWheelZoom();
    this._removePointerInteractions();
    this._removeInteractionTicker();
    this._removeBoneHover();
    // Clean up local file resources
    if (this.resourceManager) {
      this.resourceManager.cleanup();
    }
    if (this.fileProcessor) {
      this.fileProcessor.cleanupAllUrls();
    }
    // Clean up multi-track
    if (this._multiTrackSequence) {
      this._multiTrackSequence.clear();
      this._multiTrackSequence = null;
    }
    if (this.app) {
      this.app.destroy(true);
    }
  }

  // 公共方法
  setAnimation(animationName, loop = true) {
    if (this.spine && this.spine.state) {
      // 设置新动画
      this.spine.state.setAnimation(0, animationName, loop);
    }
  }

  getCurrentAnimation() {
    if (this.spine && this.spine.state && this.spine.state.tracks && this.spine.state.tracks[0]) {
      const entry = this.spine.state.tracks[0];
      if (entry && entry.animation) return entry.animation.name;
    }
    return null;
  }

  getAnimations() {
    if (this.spine && this.spine.spineData) {
      return this.spine.spineData.animations.map((anim) => anim.name);
    }
    return [];
  }

  /**
   * Get detailed animation information including affected slots and bones
   * @returns {Array<{name: string, slots: Array<string>, bones: Array<string>, layers: Array<string>}>}
   */
  getAnimationsWithDetails() {
    if (!this.spine || !this.spine.spineData) {
      return [];
    }

    console.log('spine:')
    console.log(this.spine);
    console.log('Gathering animation details:');

    return this.spine.spineData.animations.map((anim) => {
      const slots = [];
      const bones = [];
      const layers = new Set();
      console.log(anim);

      // Extract timeline information
      if (anim.timelines) {
        for (const timeline of anim.timelines) {
          // Check for slot timelines
          if (timeline.slotIndex !== undefined && this.spine.skeleton.slots[timeline.slotIndex]) {
            const slotName = this.spine.skeleton.slots[timeline.slotIndex].data.name;
            if (!slots.includes(slotName)) {
              slots.push(slotName);
              layers.add('slot:' + slotName);
            }
          }
          // Check for bone timelines
          if (timeline.boneIndex !== undefined && this.spine.skeleton.bones[timeline.boneIndex]) {
            const boneName = this.spine.skeleton.bones[timeline.boneIndex].data.name;
            if (!bones.includes(boneName)) {
              bones.push(boneName);
              layers.add('bone:' + boneName);
            }
          }
        }
      }

      return {
        name: anim.name,
        duration: anim.duration,
        slots: slots,
        bones: bones,
        layers: Array.from(layers),
        slotCount: slots.length,
        boneCount: bones.length,
        totalLayers: layers.size
      };
    });
  }

  setScale(scale) {
    if (this.spineContainer && this.app && this.spine) {
      this.spineContainer.scale.set(scale, scale);
      this.centerSpine();
    }
  }

  getZoom() {
    return this.spineContainer ? this.spineContainer.scale.x : 1;
  }

  setZoom(scale) {
    if (!this.spineContainer) return;
    const clamped = Math.min(this.maxZoom, Math.max(this.minZoom, scale));
    this.setScale(clamped);
  }

  setZoomLimits(min, max) {
    if (min > 0 && max >= min) {
      this.minZoom = min;
      this.maxZoom = max;
      // adjust current zoom if outside
      if (this.spineContainer) {
        const current = this.getZoom();
        if (current < min || current > max) this.setZoom(current);
      }
    }
  }

  enableWheelZoom() { this.zoomEnabled = true; }
  disableWheelZoom() { this.zoomEnabled = false; }

  _setupWheelZoom() {
    this._removeWheelZoom();
    if (!this.app) return;
    const view = this.app.view;
    this._wheelListener = (e) => {
      if (!this.zoomEnabled || !this.spineContainer) return;
      e.preventDefault();
      const rect = view.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const before = this.getZoom();
      const factor = (e.deltaY > 0 ? 1 / this.zoomStep : this.zoomStep);
      let target = before * factor;
      target = Math.min(this.maxZoom, Math.max(this.minZoom, target));
      if (Math.abs(target - before) < 1e-6) return;
      const worldPosBefore = {
        x: (mouseX - this.spineContainer.position.x) / before,
        y: (mouseY - this.spineContainer.position.y) / before,
      };
      if (this.zoomSmooth) {
        this._zoomTarget = target;
        this._zoomAnchor = { mouseX, mouseY, worldX: worldPosBefore.x, worldY: worldPosBefore.y };
      } else {
        this.spineContainer.scale.set(target, target);
        this.spineContainer.position.set(
          mouseX - worldPosBefore.x * target,
          mouseY - worldPosBefore.y * target
        );
        if (this.skeletonDebugGraphics) {
          this.skeletonDebugGraphics.position.copyFrom(this.spine.position);
        }
        // labels removed
      }
    };
    view.addEventListener('wheel', this._wheelListener, { passive: false });
  }

  _removeWheelZoom() {
    if (this._wheelListener && this.app) {
      this.app.view.removeEventListener('wheel', this._wheelListener);
    }
    this._wheelListener = null;
  }

  _setupPointerInteractions() {
    this._removePointerInteractions();
    if (!this.app) return;
    const view = this.app.view;
    const dbl = (e) => {
      if (!this.spineContainer) return;
      this.resetZoom(true, { x: e.clientX, y: e.clientY });
    };
    view.addEventListener('dblclick', dbl);
    this._pointerListenerCleanup.push(() => view.removeEventListener('dblclick', dbl));
    const down = (e) => {
      if (!this.spineContainer) return;
      const pointerId = e.pointerId;
      this._activePointers.set(pointerId, { x: e.clientX, y: e.clientY });
      if (this._activePointers.size === 1 && this.panEnabled) {
        this._isPanning = true;
        this._panStart = { x: e.clientX, y: e.clientY };
        this._panContainerStart = { x: this.spineContainer.position.x, y: this.spineContainer.position.y };
      }
    };
    const move = (e) => {
      if (!this.spineContainer) return;
      if (this._activePointers.has(e.pointerId)) {
        this._activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      // pinch zoom if two pointers
      if (this.pinchZoomEnabled && this._activePointers.size === 2 && this.spineContainer) {
        const pts = Array.from(this._activePointers.values());
        const [p1, p2] = pts;
        if (!this._pinchStartDistance) {
          this._pinchStartDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          this._pinchStartZoom = this.getZoom();
        } else {
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (this._pinchStartDistance > 0) {
            let target = this._pinchStartZoom * (dist / this._pinchStartDistance);
            target = Math.min(this.maxZoom, Math.max(this.minZoom, target));
            const midX = (p1.x + p2.x) * 0.5;
            const midY = (p1.y + p2.y) * 0.5;
            const before = this.getZoom();
            const worldPosBefore = {
              x: (midX - this.spineContainer.position.x) / before,
              y: (midY - this.spineContainer.position.y) / before,
            };
            if (this.zoomSmooth) {
              this._zoomTarget = target;
              this._zoomAnchor = { mouseX: midX, mouseY: midY, worldX: worldPosBefore.x, worldY: worldPosBefore.y };
            } else {
              this.spineContainer.scale.set(target, target);
              this.spineContainer.position.set(
                midX - worldPosBefore.x * target,
                midY - worldPosBefore.y * target
              );
              if (this.skeletonDebugGraphics) this.skeletonDebugGraphics.position.copyFrom(this.spine.position);
              // labels removed
            }
          }
        }
        return; // skip pan when pinching
      }
      if (this._isPanning && this.panEnabled && this._panStart) {
        const dx = e.clientX - this._panStart.x;
        const dy = e.clientY - this._panStart.y;
        this.spineContainer.position.set(
          this._panContainerStart.x + dx,
          this._panContainerStart.y + dy
        );
        if (this.skeletonDebugGraphics) {
          this.skeletonDebugGraphics.position.copyFrom(this.spine.position);
        }
        // labels removed
      }
    };
    const upOrCancel = (e) => {
      if (this._activePointers.has(e.pointerId)) {
        this._activePointers.delete(e.pointerId);
      }
      if (this._activePointers.size === 0) {
        this._isPanning = false;
        this._pinchStartDistance = null;
        this._pinchStartZoom = null;
      }
    };
    view.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', upOrCancel);
    window.addEventListener('pointercancel', upOrCancel);
    this._pointerListenerCleanup.push(() => view.removeEventListener('pointerdown', down));
    this._pointerListenerCleanup.push(() => window.removeEventListener('pointermove', move));
    this._pointerListenerCleanup.push(() => window.removeEventListener('pointerup', upOrCancel));
    this._pointerListenerCleanup.push(() => window.removeEventListener('pointercancel', upOrCancel));
  }

  _removePointerInteractions() {
    if (this._pointerListenerCleanup) {
      for (const fn of this._pointerListenerCleanup) try { fn(); } catch { }
    }
    this._pointerListenerCleanup = [];
    this._activePointers.clear();
    this._isPanning = false;
    this._pinchStartDistance = null;
    this._pinchStartZoom = null;
  }

  _setupInteractionTicker() {
    this._removeInteractionTicker();
    if (!this.app) return;
    this._interactionTicker = () => {
      if (!this.spineContainer) return;
      if (this._zoomTarget != null) {
        const current = this.getZoom();
        const diff = this._zoomTarget - current;
        if (Math.abs(diff) < 1e-4) {
          const target = this._zoomTarget;
          const anchor = this._zoomAnchor;
          this.spineContainer.scale.set(target, target);
          if (anchor) {
            this.spineContainer.position.set(
              anchor.mouseX - anchor.worldX * target,
              anchor.mouseY - anchor.worldY * target
            );
          }
          this._zoomTarget = null;
          this._zoomAnchor = null;
          if (this.skeletonDebugGraphics) this.skeletonDebugGraphics.position.copyFrom(this.spine.position);
          // labels removed
        } else {
          const step = diff * this.zoomSmoothSpeed;
          const next = current + step;
          const anchor = this._zoomAnchor;
          this.spineContainer.scale.set(next, next);
          if (anchor) {
            this.spineContainer.position.set(
              anchor.mouseX - anchor.worldX * next,
              anchor.mouseY - anchor.worldY * next
            );
          }
          if (this.skeletonDebugGraphics) this.skeletonDebugGraphics.position.copyFrom(this.spine.position);
          // labels removed
        }
      }
    };
    this.app.ticker.add(this._interactionTicker);
  }

  _removeInteractionTicker() {
    if (this._interactionTicker && this.app) {
      this.app.ticker.remove(this._interactionTicker);
    }
    this._interactionTicker = null;
  }

  _setupBoneHover() {
    this._removeBoneHover();
    if (!this.app) return;
    const view = this.app.view;
    const findClosestBone = (mx, my) => {
      if (!this.spine || !this.spineContainer) return { bone: null, scale: 1, minDist: Infinity };
      const scale = this.spineContainer.scale.x || 1;
      const localX = ((mx - this.spineContainer.position.x) / scale) - this.spine.position.x;
      const localY = ((my - this.spineContainer.position.y) / scale) - this.spine.position.y;
      let closest = null; let minDist = Infinity;
      const radius = this.boneHoverRadius / scale;
      for (const bone of this.spine.skeleton.bones) {
        const dx = localX - bone.worldX;
        const dy = localY - bone.worldY;
        const d2 = dx * dx + dy * dy;
        if (d2 < (radius * radius) && d2 < minDist) { minDist = d2; closest = bone; }
      }
      return { bone: closest, scale, minDist };
    };
    const move = (e) => {
      if (!this.boneHoverEnabled || !this.spine || !this.spineContainer) return;
      // Only show hover effect when skeleton debug is active
      if (!this.drawSkeleton) return;
      const rect = view.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { bone: closest, scale, minDist } = findClosestBone(mx, my);
      const name = closest ? closest.data.name : null;
      if (name !== this._hoveredBoneName) {
        if (name) {
          console.debug('[SpineViewer] Hover bone ->', name, 'dist=', Math.sqrt(minDist).toFixed(2));
        } else if (this._hoveredBoneName) {
          console.debug('[SpineViewer] Hover bone cleared');
        }
        this._hoveredBoneName = name;
        this._updateBoneTooltip(mx, my, name);
        this._drawBoneHoverJoint(closest, scale);
      } else if (name) {
        this._drawBoneHoverJoint(closest, scale);
        this._positionBoneTooltip(mx, my);
      } else {
        // No hover, but may have selection - draw selected bone if exists
        this._drawBoneHoverJoint(this._selectedBone, scale);
      }
    };
    view.addEventListener('pointermove', move);
    const down = (e) => {
      if (!this.boneHoverEnabled || !this.spine || !this.spineContainer) return;
      if (!this.drawSkeleton) return; // respect debug toggle
      const rect = view.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { bone: closest, scale, minDist } = findClosestBone(mx, my);
      const name = closest ? closest.data.name : null;
      if (name) {
        // Click on a bone - toggle selection (click same bone to deselect)
        if (this._selectedBoneName === name) {
          // Clicking the same bone again - deselect it
          console.debug('[SpineViewer] Deselect bone ->', name);
          this._selectedBoneName = null;
          this._selectedBone = null;
          this._hoveredBoneName = name; // keep hover
          this._updateBoneTooltip(mx, my, name);
          this._drawBoneHoverJoint(closest, scale);
        } else {
          // Clicking a different bone - select it
          console.debug('[SpineViewer] Select bone ->', name, 'dist=', Math.sqrt(minDist).toFixed(2));
          this._selectedBoneName = name;
          this._selectedBone = closest;
          this._hoveredBoneName = name; // keep consistent
          this._updateBoneTooltip(mx, my, name);
          this._drawBoneHoverJoint(closest, scale);
        }
      }
    };
    view.addEventListener('pointerdown', down);
    const leave = () => {
      if (this._hoveredBoneName) console.debug('[SpineViewer] Pointer leave – clearing hover');
      this._hoveredBoneName = null;
      // Keep selection tooltip visible if bone is selected
      if (this._selectedBoneName) {
        // Keep tooltip at its last position
        // Do nothing - tooltip stays
      } else {
        this._updateBoneTooltip(0, 0, null);
      }
      // Always draw selected bone when leaving (if any)
      const scale = this.spineContainer ? this.spineContainer.scale.x || 1 : 1;
      this._drawBoneHoverJoint(this._selectedBone, scale);
    };
    view.addEventListener('pointerleave', leave);
    this._boneHoverListener = { move, leave, down };
  }

  _removeBoneHover() {
    if (this._boneHoverListener && this.app) {
      const view = this.app.view;
      view.removeEventListener('pointermove', this._boneHoverListener.move);
      view.removeEventListener('pointerleave', this._boneHoverListener.leave);
      if (this._boneHoverListener.down) view.removeEventListener('pointerdown', this._boneHoverListener.down);
    }
    this._boneHoverListener = null;
    if (this._boneTooltipContainer && this._boneTooltipContainer.parent) {
      this._boneTooltipContainer.parent.removeChild(this._boneTooltipContainer);
    }
    if (this._boneTooltipContainer) {
      this._boneTooltipContainer.destroy({ children: true });
      this._boneTooltipContainer = null;
    }
  }

  _createBoneTooltipContainer() {
    if (!this.app) return;
    if (this._boneTooltipContainer) return;
    const c = new PIXI.Container();
    const bg = new PIXI.Graphics();
    const text = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 14, fill: 0xffffff, stroke: 0x000000, strokeThickness: 3 });
    text.anchor.set(0.5, 1.2);
    c.addChild(bg);
    c.addChild(text);
    c.visible = false;
    c.zIndex = 9999;
    this.app.stage.addChild(c);
    this._boneTooltipContainer = c;
    this._boneTooltipBG = bg;
    this._boneTooltipText = text;
  }

  _updateBoneTooltip(screenX, screenY, boneName) {
    this._createBoneTooltipContainer();
    const c = this._boneTooltipContainer;
    if (!c) return;
    if (!boneName) {
      c.visible = false;
      return;
    }
    this._boneTooltipText.text = boneName;
    // draw background box
    const padding = 6;
    this._boneTooltipBG.clear();
    const metrics = this._boneTooltipText.getLocalBounds();
    const w = metrics.width + padding * 2;
    const h = metrics.height + padding * 2;
    this._boneTooltipBG.beginFill(0x000000, 0.7);
    this._boneTooltipBG.lineStyle(1, 0xffffff, 0.8);
    this._boneTooltipBG.drawRoundedRect(-w / 2, -h - 4, w, h, 6);
    this._boneTooltipBG.endFill();
    c.visible = true;
    this._positionBoneTooltip(screenX, screenY);
  }

  _positionBoneTooltip(screenX, screenY) {
    if (!this._boneTooltipContainer || !this.app) return;
    // place at screen coords relative to stage (stage origin at 0,0 inside canvas)
    this._boneTooltipContainer.position.set(screenX, screenY);
  }

  _highlightBoneLabel() { /* labels removed */ }

  _drawBoneHoverJoint(bone, scale) {
    if (!this.app || !this.spineContainer || !this.spine) return;
    if (!this._boneHoverGraphics) {
      this._boneHoverGraphics = new PIXI.Graphics();
      this._boneHoverGraphics.zIndex = 9998;
      this.spineContainer.addChild(this._boneHoverGraphics);
    }
    const g = this._boneHoverGraphics;
    if (g.position.x !== this.spine.position.x || g.position.y !== this.spine.position.y) {
      g.position.copyFrom(this.spine.position);
    }
    g.clear();
    if (!bone) return;
    const inv = 1 / (scale || 1);
    const r = this.boneHoverJointRadius * inv;
    const x = bone.worldX;
    const y = bone.worldY;
    const outerR = r * 1.8;
    g.beginFill(this.jointOuterColor, 0.18);
    g.drawCircle(x, y, outerR);
    g.endFill();
    g.lineStyle(2.5 * inv, this.jointRingStrokeColor, 0.95);
    g.beginFill(this.jointRingFillColor, 0.55);
    g.drawCircle(x, y, r * 1.25);
    g.endFill();
    g.lineStyle(0);
    g.beginFill(this.jointCoreColor, 0.95);
    g.drawCircle(x, y, r * 0.7);
    g.endFill();
  }

  enableBoneHover() { this.boneHoverEnabled = true; }
  disableBoneHover() {
    this.boneHoverEnabled = false;
    this._hoveredBoneName = null;
    this._selectedBoneName = null;
    this._selectedBone = null;
    this._updateBoneTooltip(0, 0, null);
  }

  // Public interaction APIs
  enablePan() { this.panEnabled = true; }
  disablePan() { this.panEnabled = false; }
  enablePinchZoom() { this.pinchZoomEnabled = true; }
  disablePinchZoom() { this.pinchZoomEnabled = false; }
  enableSmoothZoom() { this.zoomSmooth = true; }
  disableSmoothZoom() { this.zoomSmooth = false; this._zoomTarget = null; }
  setZoomSmoothSpeed(speed) { if (speed > 0 && speed <= 1) this.zoomSmoothSpeed = speed; }
  // Highlight color APIs
  setHighlightColor(hex) {
    if (typeof hex === 'number') {
      this.highlightColor = hex & 0xffffff;
      this.boneHoverJointColor = this.highlightColor;
    }
  }
  setHighlightColorHSL(h, s, l) {
    const hslToHex = (H, S, L) => {
      S /= 100; L /= 100;
      const k = n => (n + H / 30) % 12;
      const a = S * Math.min(L, 1 - L);
      const f = n => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      const r = Math.round(255 * f(0));
      const g = Math.round(255 * f(8));
      const b = Math.round(255 * f(4));
      return (r << 16) + (g << 8) + b;
    };
    if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
      this.setHighlightColor(hslToHex(h, s, l));
    }
  }
  setHighlightColorFromCSS() {
    if (typeof window === 'undefined') return;
    try {
      const cs = getComputedStyle(document.documentElement);
      const h = parseFloat(cs.getPropertyValue('--accent-h'));
      const s = parseFloat(cs.getPropertyValue('--accent-s'));
      const l = parseFloat(cs.getPropertyValue('--accent-l'));
      if (!Number.isNaN(h) && !Number.isNaN(s) && !Number.isNaN(l)) {
        this.setHighlightColorHSL(h, s, l);
      }
      // Derive hover joint colors from --danger (HSL) if provided
      const dangerRaw = cs.getPropertyValue('--danger').trim();
      if (dangerRaw) {
        const match = /hsl\(\s*([\d.]+)\s*[ ,]\s*([\d.]+)%\s*[ ,]\s*([\d.]+)%/i.exec(dangerRaw) || /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/i.exec(dangerRaw);
        if (match) {
          const dh = parseFloat(match[1]);
          const ds = parseFloat(match[2]);
          const dl = parseFloat(match[3]);
          if (!Number.isNaN(dh) && !Number.isNaN(ds) && !Number.isNaN(dl)) {
            const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
            const hslToHex = (H, S, L) => {
              S /= 100; L /= 100;
              const k = n => (n + H / 30) % 12;
              const a = S * Math.min(L, 1 - L);
              const f = n => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
              const r = Math.round(255 * f(0));
              const g = Math.round(255 * f(8));
              const b = Math.round(255 * f(4));
              return (r << 16) + (g << 8) + b;
            };
            const outerHex = hslToHex(dh, clamp(ds * 0.9, 0, 100), clamp(dl + 4, 0, 100));
            const ringStrokeHex = hslToHex(dh, clamp(ds * 1.25, 0, 100), clamp(dl - 12, 0, 100));
            const ringFillHex = hslToHex(dh, clamp(ds * 1.05, 0, 100), clamp(dl - 6, 0, 100));
            const coreHex = hslToHex(dh, clamp(ds * 1.35, 0, 100), clamp(dl - 18, 0, 100));
            this.jointOuterColor = outerHex;
            this.jointRingStrokeColor = ringStrokeHex;
            this.jointRingFillColor = ringFillHex;
            this.jointCoreColor = coreHex;
          }
        }
      }
    } catch (_) { /* ignore */ }
  }
  resetZoom(animated = true, pointer = null) {
    const target = this.zoomResetValue;
    if (!this.spineContainer) return;
    if (animated && this.zoomSmooth) {
      const view = this.app.view.getBoundingClientRect();
      const mouseX = pointer ? pointer.x - view.left : (view.width / 2);
      const mouseY = pointer ? pointer.y - view.top : (view.height / 2);
      const before = this.getZoom();
      const worldPosBefore = {
        x: (mouseX - this.spineContainer.position.x) / before,
        y: (mouseY - this.spineContainer.position.y) / before,
      };
      this._zoomTarget = target;
      this._zoomAnchor = { mouseX, mouseY, worldX: worldPosBefore.x, worldY: worldPosBefore.y };
    } else {
      const centerX = this.app.view.width / 2;
      const centerY = this.app.view.height / 2;
      // compute world anchor at center
      const before = this.getZoom();
      const worldPosBefore = {
        x: (centerX - this.spineContainer.position.x) / before,
        y: (centerY - this.spineContainer.position.y) / before,
      };
      this.spineContainer.scale.set(target, target);
      this.spineContainer.position.set(
        centerX - worldPosBefore.x * target,
        centerY - worldPosBefore.y * target
      );
      if (this.skeletonDebugGraphics) this.skeletonDebugGraphics.position.copyFrom(this.spine.position);
      // labels removed
    }
  }

  /**
   * Initialize a debug graphics object and register a ticker update for drawing the skeleton.
   */
  enableSkeletonDebug() {
    if (!this.app || !this.spine || !this.spineContainer) return;
    if (this.skeletonDebugGraphics) return; // already enabled
    this.skeletonDebugGraphics = new PIXI.Graphics();
    this.spineContainer.addChild(this.skeletonDebugGraphics);
    // Align with the same offset applied to the spine object so world bone positions overlay correctly.
    this.skeletonDebugGraphics.position.copyFrom(this.spine.position);

    // Always prepare bone label container when skeleton debug enabled
    this.ensureBoneLabelContainer();

    const drawDefault = (g, spineInstance) => {
      const skeleton = spineInstance.skeleton;
      g.clear();
      // Adaptive thickness: base on (average of scale.x,y) so remains visible when scaled small
      const scaleAvg = this.spineContainer ? (this.spineContainer.scale.x + this.spineContainer.scale.y) * 0.5 : 1;
      const inv = 1 / (scaleAvg || 1);
      const lineWidth = 2 * inv; // thicker and scale-compensated
      const jointRadius = 4 * inv;
      const rootRadius = 6 * inv;
      const highlight = this.highlightColor;
      g.lineStyle(lineWidth, highlight, 0.95);
      // bones
      for (const bone of skeleton.bones) {
        const length = bone.data.length;
        const x = bone.worldX;
        const y = bone.worldY;
        const rotationRad = (bone.worldRotationX || bone.rotation) * (Math.PI / 180);
        const x2 = x + Math.cos(rotationRad) * length;
        const y2 = y + Math.sin(rotationRad) * length;
        g.moveTo(x, y);
        g.lineTo(x2, y2);
        g.beginFill(highlight, 0.9);
        g.drawCircle(x, y, jointRadius);
        g.endFill();
      }
      // root indicator
      const root = skeleton.bones[0];
      if (root) {
        g.beginFill(highlight, 0.95);
        g.drawCircle(root.worldX, root.worldY, rootRadius);
        g.endFill();
      }
    };
    // ticker callback
    this._debugTicker = () => {
      if (!this.skeletonDebugGraphics || !this.spine) return;
      const g = this.skeletonDebugGraphics;
      // Keep graphics aligned if spine position changes (e.g., on resize or reflow)
      if (g.position.x !== this.spine.position.x || g.position.y !== this.spine.position.y) {
        g.position.copyFrom(this.spine.position);
      }
      if (this.drawSkeletonFn) {
        this.drawSkeletonFn(g, this.spine);
      } else {
        drawDefault(g, this.spine);
      }

      // Maintain selected bone highlight and tooltip
      if (this._selectedBone && this.spineContainer) {
        const scale = this.spineContainer.scale.x || 1;
        this._drawBoneHoverJoint(this._selectedBone, scale);

        // Update tooltip position to follow the bone
        if (this._selectedBoneName && this.app) {
          const boneWorldX = this._selectedBone.worldX + this.spine.position.x;
          const boneWorldY = this._selectedBone.worldY + this.spine.position.y;
          const screenX = boneWorldX * scale + this.spineContainer.position.x;
          const screenY = boneWorldY * scale + this.spineContainer.position.y;
          this._updateBoneTooltip(screenX, screenY, this._selectedBoneName);
        }
      }

      // Update bone name labels
      // labels removed
    };

    this.app.ticker.add(this._debugTicker);
  }

  /**
   * Public API: toggle skeleton debug drawing at runtime without reloading assets.
   * @param {boolean|function} enabled - false disables; true enables default; function enables custom drawer.
   */
  setSkeletonDebug(enabled) {
    if (!this.app || !this.spine) {
      // store intent; next render will pick up
      if (typeof enabled === "function") {
        this.drawSkeleton = true;
        this.drawSkeletonFn = enabled;
      } else {
        this.drawSkeleton = !!enabled;
        this.drawSkeletonFn = null;
      }
      return;
    }

    if (!enabled) {
      this.disableSkeletonDebug();
      return;
    }

    if (typeof enabled === "function") {
      this.drawSkeleton = true;
      this.drawSkeletonFn = enabled;
    } else {
      this.drawSkeleton = true;
      this.drawSkeletonFn = null;
    }
    this.enableSkeletonDebug();
  }

  /**
   * Remove debug graphics & ticker if present.
   */
  disableSkeletonDebug() {
    this.drawSkeleton = false;
    this.drawSkeletonFn = null;
    if (this._debugTicker && this.app) {
      this.app.ticker.remove(this._debugTicker);
    }
    if (this.skeletonDebugGraphics && this.skeletonDebugGraphics.parent) {
      this.skeletonDebugGraphics.parent.removeChild(this.skeletonDebugGraphics);
    }
    if (this.skeletonDebugGraphics) {
      this.skeletonDebugGraphics.destroy();
      this.skeletonDebugGraphics = null;
    }
    if (this._boneLabelContainer) {
      this._boneLabelContainer.destroy({ children: true });
      this._boneLabelContainer = null;
    }
    // Clear bone selection and hover graphics when disabling skeleton debug
    this._selectedBoneName = null;
    this._selectedBone = null;
    this._hoveredBoneName = null;
    this._updateBoneTooltip(0, 0, null);
    if (this._boneHoverGraphics) {
      this._boneHoverGraphics.clear();
    }
  }

  // (Removed setBoneNameLabels; labels now always shown with skeleton debug)

  /** Adjust the size factor (default 1.0). Call before enabling labels or anytime (triggers rebuild). */
  setBoneNameSizeFactor() { /* removed */ }

  /** Set min & max clamp for bone name sizes. */
  setBoneNameSizeRange() { /* removed */ }

  /** Enable / disable adaptive scaling (true = scales inversely with zoom). */
  setBoneNameAdaptive() { /* removed */ }

  /** Configure bone label theme (colors & padding). */
  setBoneNameLabelTheme() { /* removed */ }

  ensureBoneLabelContainer() { /* removed */ }

  updateBoneNameLabels() { /* removed */ }
  _drawBoneLabelBackground() { /* removed */ }
  _raiseBoneLabelToTop() { /* removed */ }

  /**
   * Gets a user-friendly error message from an error object
   * @param {Error} error - The error object
   * @returns {string} Formatted error message
   */
  _getDisplayErrorMessage(error) {
    if (!error) {
      return getMessage('ui.error');
    }

    // Check for specific error patterns and provide localized messages
    if (error.message.includes('Browser does not support')) {
      return formatErrorMessage('browser.feature_not_supported', { feature: 'required features' });
    }

    if (error.message.includes('WebGL')) {
      return formatErrorMessage('browser.webgl_not_supported');
    }

    if (error.message.includes('File API')) {
      return formatErrorMessage('browser.file_api_not_supported');
    }

    if (error.message.includes('Failed to load Spine')) {
      return formatErrorMessage('spine.load_error', { error: error.message });
    }

    if (error.message.includes('validation')) {
      return formatErrorMessage('file.validation_failed', { error: error.message });
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return formatErrorMessage('network.connection_failed');
    }

    // Default fallback with original error message
    return formatErrorMessage('ui.error') + ': ' + error.message;
  }

  /**
   * Displays an error message in the viewer
   * @param {string} message - The error message to display
   */
  _displayError(message) {
    this.shadowRoot.innerHTML = `
      <div style="
        color: red;
        padding: 20px;
        text-align: center;
        font-family: Arial, sans-serif;
        background: rgba(255, 0, 0, 0.1);
        border: 1px solid rgba(255, 0, 0, 0.3);
        border-radius: 8px;
        margin: 10px;
        word-wrap: break-word;
      ">
        ${message}
      </div>
    `;
  }

  /**
   * Shows a progress or status message
   * @param {string} message - The message to show
   * @param {string} type - The message type ('info', 'warning', 'success', 'error')
   */
  _showProgress(message, type = 'info') {
    const colors = {
      info: { color: '#2196F3', bg: 'rgba(33, 150, 243, 0.1)', border: 'rgba(33, 150, 243, 0.3)' },
      warning: { color: '#FF9800', bg: 'rgba(255, 152, 0, 0.1)', border: 'rgba(255, 152, 0, 0.3)' },
      success: { color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)', border: 'rgba(76, 175, 80, 0.3)' },
      error: { color: '#F44336', bg: 'rgba(244, 67, 54, 0.1)', border: 'rgba(244, 67, 54, 0.3)' }
    };

    const style = colors[type] || colors.info;

    // Only show progress if there's no existing content or if it's a temporary message
    if (!this.shadowRoot.querySelector('canvas')) {
      this.shadowRoot.innerHTML = `
        <div style="
          color: ${style.color};
          padding: 20px;
          text-align: center;
          font-family: Arial, sans-serif;
          background: ${style.bg};
          border: 1px solid ${style.border};
          border-radius: 8px;
          margin: 10px;
          word-wrap: break-word;
        ">
          ${message}
        </div>
      `;
    } else {
      // If content exists, just log the progress message
      console.info(`SpineViewer [${type}]:`, message);
    }
  }

  /**
   * Cleans up resources when an error occurs
   */
  _cleanupOnError() {
    try {
      // Stop any ongoing animations or tickers
      if (this.app && this.app.ticker) {
        this.app.ticker.stop();
      }

      // Clean up skeleton debug graphics
      if (this.skeletonDebugGraphics) {
        this.skeletonDebugGraphics.destroy();
        this.skeletonDebugGraphics = null;
      }

      // Clean up bone hover graphics
      if (this._boneHoverGraphics) {
        this._boneHoverGraphics.destroy();
        this._boneHoverGraphics = null;
      }

      // Clean up tooltips
      if (this._boneTooltipContainer) {
        this._boneTooltipContainer.destroy({ children: true });
        this._boneTooltipContainer = null;
      }

      // Reset interaction state
      this._activePointers.clear();
      this._isPanning = false;
      this._zoomTarget = null;
      this._zoomAnchor = null;
      this._hoveredBoneName = null;

      // Clean up local file resources if they exist
      if (this.resourceManager) {
        this.resourceManager.cleanup();
      }
      if (this.fileProcessor) {
        this.fileProcessor.cleanupAllUrls();
      }

    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
    }
  }
}

// 注册自定义元素
customElements.define("spine-viewer", SpineViewer);

export default SpineViewer;
export { SpineViewer };
