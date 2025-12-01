// Photo Markup Module
// Canvas-based photo annotation and markup tools
// Stabilised version: Fixed 1:1 scale, no zoom/pan transforms
// All annotations stored and drawn in CANVAS coordinates for consistency

const PhotoState = {
  img: null,          // HTMLImageElement
  imgWidth: 0,        // naturalWidth
  imgHeight: 0,       // naturalHeight
  scale: 1,           // Fixed scale (no zoom for stability)
  annotations: []     // Annotations stored in CANVAS coordinates
};

// Maximum canvas width to prevent huge canvases
const MAX_CANVAS_WIDTH = 900;

export default class PhotoMarkup {
  constructor() {
    this.canvas = document.getElementById('markup-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.currentTool = 'point';
    this.isDrawing = false;
    this.startPos = null;
    this.originalImage = null;

    this.currentElement = null;

    this.colors = {
      red: '#ef4444',
      green: '#10b981',
      blue: '#3b82f6',
      orange: '#f59e0b',
      black: '#000000',
      white: '#ffffff'
    };

    this.currentColor = this.colors.red;
    this.lineWidth = 3;

    this.setupCanvas();
  }

  setupCanvas() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  loadImage(imageSource) {
    const img = new Image();

    if (imageSource instanceof Blob) {
      img.src = URL.createObjectURL(imageSource);
    } else {
      img.src = imageSource;
    }

    img.onload = () => {
      this.originalImage = img;
      loadPhotoIntoCanvas(img, this.canvas);
      console.log('Image loaded:', img.naturalWidth, 'x', img.naturalHeight, '-> canvas:', this.canvas.width, 'x', this.canvas.height);
    };
  }

  setTool(tool) {
    this.currentTool = tool;
    console.log('Tool selected:', tool);
  }

  setColor(color) {
    this.currentColor = this.colors[color] || color;
  }

  handleMouseDown(e) {
    // Use direct canvas coordinates (no transform conversion)
    const { x, y } = this.getCanvasCoordinates(e);

    this.isDrawing = true;
    this.startPos = { x, y };

    if (this.currentTool === 'point') {
      this.addPoint(x, y);
      this.isDrawing = false;
    } else if (this.currentTool === 'text') {
      this.addText(x, y);
      this.isDrawing = false;
    } else {
      this.currentElement = {
        type: this.currentTool,
        x: x,
        y: y,
        w: 0,
        h: 0,
        color: this.currentColor,
        lineWidth: this.lineWidth
      };
    }
  }

  handleMouseMove(e) {
    if (!this.isDrawing || !this.startPos || !this.currentElement) return;

    // Use direct canvas coordinates
    const { x, y } = this.getCanvasCoordinates(e);

    if (this.currentTool === 'rectangle') {
      this.currentElement.w = x - this.startPos.x;
      this.currentElement.h = y - this.startPos.y;
    } else if (this.currentTool === 'circle') {
      const dx = x - this.startPos.x;
      const dy = y - this.startPos.y;
      this.currentElement.r = Math.sqrt(dx * dx + dy * dy);
    } else if (this.currentTool === 'arrow') {
      this.currentElement.x2 = x;
      this.currentElement.y2 = y;
    }

    // Redraw everything including preview
    drawPhotoAndAnnotations(this.canvas);
    if (this.currentElement) {
      drawAnnotation(this.ctx, this.currentElement);
    }
  }

  handleMouseUp() {
    if (!this.isDrawing || !this.startPos || !this.currentElement) return;

    // Only save if the shape has meaningful size
    if (this.currentTool === 'rectangle' && (Math.abs(this.currentElement.w) < 3 || Math.abs(this.currentElement.h) < 3)) {
      this.resetDrawingState();
      drawPhotoAndAnnotations(this.canvas);
      return;
    }
    if (this.currentTool === 'circle' && (!this.currentElement.r || this.currentElement.r < 3)) {
      this.resetDrawingState();
      drawPhotoAndAnnotations(this.canvas);
      return;
    }
    if (this.currentTool === 'arrow') {
      const dx = (this.currentElement.x2 || this.currentElement.x) - this.currentElement.x;
      const dy = (this.currentElement.y2 || this.currentElement.y) - this.currentElement.y;
      if (Math.sqrt(dx * dx + dy * dy) < 5) {
        this.resetDrawingState();
        drawPhotoAndAnnotations(this.canvas);
        return;
      }
    }

    PhotoState.annotations.push({ ...this.currentElement });
    this.resetDrawingState();
    drawPhotoAndAnnotations(this.canvas);
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  handleTouchEnd(e) {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    this.canvas.dispatchEvent(mouseEvent);
  }

  addPoint(x, y) {
    const annotation = {
      type: 'point',
      x,
      y,
      color: this.currentColor
    };

    PhotoState.annotations.push(annotation);
    drawPhotoAndAnnotations(this.canvas);
  }

  addText(x, y) {
    const text = prompt('Enter text:');
    if (!text) return;

    const annotation = {
      type: 'text',
      x,
      y,
      text,
      color: this.currentColor,
      font: '16px sans-serif'
    };

    PhotoState.annotations.push(annotation);
    drawPhotoAndAnnotations(this.canvas);
  }

  redrawCanvas() {
    drawPhotoAndAnnotations(this.canvas);
  }

  clear() {
    PhotoState.annotations = [];
    this.redrawCanvas();
  }

  export() {
    drawPhotoAndAnnotations(this.canvas);
    return this.canvas.toDataURL('image/png');
  }

  getOriginalDataUrl() {
    // Export the original image (without markup) as a data URL
    if (!PhotoState.img) {
      return null;
    }

    // Create a temporary canvas to get the original image data URL
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = PhotoState.imgWidth;
    tempCanvas.height = PhotoState.imgHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(PhotoState.img, 0, 0);

    return tempCanvas.toDataURL('image/jpeg', 0.95);
  }

  undo() {
    if (PhotoState.annotations.length === 0) return;
    PhotoState.annotations.pop();
    this.redrawCanvas();
  }

  // Zoom controls - DISABLED for stability
  // These are no-ops to prevent transforms from breaking annotation coordinates
  zoomIn() {
    console.log('Zoom disabled for canvas stability');
    // No-op: zoom disabled to stabilize canvas
  }

  zoomOut() {
    console.log('Zoom disabled for canvas stability');
    // No-op: zoom disabled to stabilize canvas
  }

  zoomReset() {
    console.log('Zoom disabled for canvas stability');
    // No-op: just redraw at current fixed scale
    drawPhotoAndAnnotations(this.canvas);
  }

  // Pan controls - DISABLED for stability
  panUp() {
    console.log('Pan disabled for canvas stability');
    // No-op: pan disabled to stabilize canvas
  }

  panDown() {
    console.log('Pan disabled for canvas stability');
    // No-op: pan disabled to stabilize canvas
  }

  panLeft() {
    console.log('Pan disabled for canvas stability');
    // No-op: pan disabled to stabilize canvas
  }

  panRight() {
    console.log('Pan disabled for canvas stability');
    // No-op: pan disabled to stabilize canvas
  }

  getAnnotations() {
    return PhotoState.annotations.map(ann => ({ ...ann }));
  }

  getCanvasCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  resetDrawingState() {
    this.isDrawing = false;
    this.startPos = null;
    this.currentElement = null;
  }
}

/**
 * Load photo into canvas with a simple, fixed scale
 * No fancy transforms - just fit the image to canvas size
 */
function loadPhotoIntoCanvas(img, canvas) {
  PhotoState.img = img;
  PhotoState.imgWidth = img.naturalWidth;
  PhotoState.imgHeight = img.naturalHeight;

  // Calculate scale to fit image within max width, preserving aspect ratio
  const scale = Math.min(1, MAX_CANVAS_WIDTH / PhotoState.imgWidth);
  PhotoState.scale = scale;

  // Set canvas size to match scaled image exactly
  canvas.width = PhotoState.imgWidth * scale;
  canvas.height = PhotoState.imgHeight * scale;

  // Clear annotations for new image
  PhotoState.annotations = [];

  drawPhotoAndAnnotations(canvas);
}

/**
 * Draw the photo and all annotations
 * Uses simple 1:1 transform - no zoom/pan offsets
 */
function drawPhotoAndAnnotations(canvas) {
  if (!PhotoState.img) return;
  const ctx = canvas.getContext('2d');

  // Reset any previous transforms so nothing "drifts"
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw image at (0,0) filling the canvas
  ctx.drawImage(
    PhotoState.img,
    0,
    0,
    PhotoState.imgWidth * PhotoState.scale,
    PhotoState.imgHeight * PhotoState.scale
  );

  // Re-draw all annotations in pure canvas coordinates
  PhotoState.annotations.forEach((ann) => {
    drawAnnotation(ctx, ann);
  });
}

/**
 * Draw a single annotation
 * Coordinates are already in canvas space - no conversion needed
 */
function drawAnnotation(ctx, ann) {
  ctx.save();
  ctx.lineWidth = ann.lineWidth || 3;
  ctx.strokeStyle = ann.color || '#ef4444';
  ctx.fillStyle = ann.color || '#ef4444';

  const x = ann.x;
  const y = ann.y;

  switch (ann.type) {
    case 'point':
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      // Add a white outline for visibility
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case 'rectangle':
    case 'rect': {
      const w = ann.w || 0;
      const h = ann.h || 0;
      ctx.strokeRect(x, y, w, h);
      break;
    }
    case 'circle': {
      const r = ann.r || 0;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'text': {
      ctx.font = ann.font || '16px sans-serif';
      // Add background for text visibility
      const textMetrics = ctx.measureText(ann.text || '');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(x, y - 14, textMetrics.width + 8, 20);
      ctx.fillStyle = ann.color || '#ef4444';
      ctx.fillText(ann.text || '', x + 4, y);
      break;
    }
    case 'arrow': {
      const x2 = ann.x2 || ann.x;
      const y2 = ann.y2 || ann.y;
      drawArrow(ctx, x, y, x2, y2);
      break;
    }
  }

  ctx.restore();
}

/**
 * Draw an arrow from (x1,y1) to (x2,y2)
 */
function drawArrow(ctx, x1, y1, x2, y2) {
  const headLen = 12;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  
  // Draw the line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  
  // Draw the arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6),
             y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6),
             y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}
