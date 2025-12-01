// Photo Markup Module
// Canvas-based photo annotation and markup tools
// Based on Clearances-Genie implementation

const PhotoViewport = {
  img: null,          // HTMLImageElement
  imgWidth: 0,        // naturalWidth
  imgHeight: 0,       // naturalHeight
  baseScale: 1,       // fit-to-canvas scale
  zoomFactor: 1,      // 1 = 100%, 2 = 200%, etc.
  offsetX: 0,         // canvas-space offset where image origin (0,0) is drawn
  offsetY: 0,
  annotations: [],    // each annotation in IMAGE space, not canvas space
  lat: null,
  lng: null,
  panX: 0,
  panY: 0
};

function getCurrentScale() {
  return PhotoViewport.baseScale * PhotoViewport.zoomFactor;
}

export default class PhotoMarkup {
  constructor() {
    this.canvas = document.getElementById('markup-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.currentTool = 'point';
    this.isDrawing = false;
    this.startPos = null;
    this.originalImage = null;
    this.imageData = null;

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

    // Zoom properties
    this.minScale = 0.5;
    this.maxScale = 4;

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
      initPhotoViewportWithImage(img, this.canvas);
      this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      console.log('Image loaded:', img.width, 'x', img.height);
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
    const { x, y } = this.getCanvasCoordinates(e);
    const imgPoint = canvasToImageCoords(x, y);

    this.isDrawing = true;
    this.startPos = imgPoint;

    if (this.currentTool === 'point') {
      this.addPoint(imgPoint.x, imgPoint.y);
      this.isDrawing = false;
    } else if (this.currentTool === 'text') {
      this.addText(imgPoint.x, imgPoint.y);
      this.isDrawing = false;
    } else {
      this.currentElement = {
        type: this.currentTool,
        x: imgPoint.x,
        y: imgPoint.y,
        w: 0,
        h: 0,
        color: this.currentColor,
        lineWidth: this.lineWidth
      };
    }
  }

  handleMouseMove(e) {
    if (!this.isDrawing || !this.startPos || !this.currentElement) return;

    const { x, y } = this.getCanvasCoordinates(e);
    const imgPoint = canvasToImageCoords(x, y);

    if (this.currentTool === 'rectangle') {
      this.currentElement.w = imgPoint.x - this.startPos.x;
      this.currentElement.h = imgPoint.y - this.startPos.y;
    } else if (this.currentTool === 'circle') {
      const dx = imgPoint.x - this.startPos.x;
      const dy = imgPoint.y - this.startPos.y;
      this.currentElement.r = Math.sqrt(dx * dx + dy * dy);
    } else if (this.currentTool === 'arrow') {
      this.currentElement.x2 = imgPoint.x;
      this.currentElement.y2 = imgPoint.y;
    }

    drawPhotoAndAnnotations(this.canvas);
    if (this.currentElement) {
      const scale = getCurrentScale();
      drawAnnotation(this.ctx, this.currentElement, scale, PhotoViewport.offsetX, PhotoViewport.offsetY, this.currentColor, this.lineWidth);
    }
  }

  handleMouseUp() {
    if (!this.isDrawing || !this.startPos || !this.currentElement) return;

    if (this.currentTool === 'rectangle' && (this.currentElement.w === 0 || this.currentElement.h === 0)) {
      this.resetDrawingState();
      return;
    }

    PhotoViewport.annotations.push({ ...this.currentElement });
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

    PhotoViewport.annotations.push(annotation);
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

    PhotoViewport.annotations.push(annotation);
    drawPhotoAndAnnotations(this.canvas);
  }

  redrawCanvas() {
    drawPhotoAndAnnotations(this.canvas);
  }

  clear() {
    PhotoViewport.annotations = [];
    this.redrawCanvas();
  }

  export() {
    drawPhotoAndAnnotations(this.canvas);
    return this.canvas.toDataURL('image/png');
  }

  getOriginalDataUrl() {
    // Export the original image (without markup) as a data URL
    if (!PhotoViewport.img) {
      return null;
    }

    // Create a temporary canvas to get the original image data URL
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = PhotoViewport.imgWidth;
    tempCanvas.height = PhotoViewport.imgHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(PhotoViewport.img, 0, 0);

    return tempCanvas.toDataURL('image/jpeg', 0.95);
  }

  undo() {
    if (PhotoViewport.annotations.length === 0) return;
    PhotoViewport.annotations.pop();
    this.redrawCanvas();
  }

  // Zoom controls
  zoomIn() {
    this.setZoomFactor(PhotoViewport.zoomFactor * 1.25);
  }

  zoomOut() {
    this.setZoomFactor(PhotoViewport.zoomFactor * 0.8);
  }

  zoomReset() {
    this.setZoomFactor(1);
  }

  // Pan controls (optional)
  panUp() {
    PhotoViewport.panY -= 20;
    drawPhotoAndAnnotations(this.canvas);
  }

  panDown() {
    PhotoViewport.panY += 20;
    drawPhotoAndAnnotations(this.canvas);
  }

  panLeft() {
    PhotoViewport.panX -= 20;
    drawPhotoAndAnnotations(this.canvas);
  }

  panRight() {
    PhotoViewport.panX += 20;
    drawPhotoAndAnnotations(this.canvas);
  }

  setZoomFactor(factor) {
    PhotoViewport.zoomFactor = Math.max(this.minScale, Math.min(this.maxScale, factor));
    drawPhotoAndAnnotations(this.canvas);
  }

  getAnnotations() {
    return PhotoViewport.annotations.map(ann => ({ ...ann }));
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

function initPhotoViewportWithImage(img, canvas) {
  PhotoViewport.img = img;
  PhotoViewport.imgWidth = img.naturalWidth;
  PhotoViewport.imgHeight = img.naturalHeight;
  PhotoViewport.panX = 0;
  PhotoViewport.panY = 0;

  canvas.width = canvas.clientWidth || 800;
  canvas.height = canvas.clientHeight || 450;

  const canvasW = canvas.width;
  const canvasH = canvas.height;

  const scaleX = canvasW / PhotoViewport.imgWidth;
  const scaleY = canvasH / PhotoViewport.imgHeight;

  PhotoViewport.baseScale = Math.min(scaleX, scaleY);
  PhotoViewport.zoomFactor = 1;

  const scaledW = PhotoViewport.imgWidth * PhotoViewport.baseScale;
  const scaledH = PhotoViewport.imgHeight * PhotoViewport.baseScale;

  PhotoViewport.offsetX = (canvasW - scaledW) / 2;
  PhotoViewport.offsetY = (canvasH - scaledH) / 2;

  PhotoViewport.annotations = [];

  drawPhotoAndAnnotations(canvas);
}

function drawPhotoAndAnnotations(canvas) {
  if (!PhotoViewport.img) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scale = getCurrentScale();
  const imgW = PhotoViewport.imgWidth * scale;
  const imgH = PhotoViewport.imgHeight * scale;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const imgX = centerX - imgW / 2 + PhotoViewport.panX;
  const imgY = centerY - imgH / 2 + PhotoViewport.panY;

  PhotoViewport.offsetX = imgX;
  PhotoViewport.offsetY = imgY;

  ctx.drawImage(PhotoViewport.img, imgX, imgY, imgW, imgH);

  PhotoViewport.annotations.forEach((ann) => {
    drawAnnotation(ctx, ann, scale, imgX, imgY);
  });
}

function drawAnnotation(ctx, ann, scale, imgX, imgY) {
  ctx.save();
  ctx.lineWidth = ann.lineWidth || 2;
  ctx.strokeStyle = ann.color || '#ff0000';
  ctx.fillStyle = ann.color || '#ff0000';

  const x = imgX + ann.x * scale;
  const y = imgY + ann.y * scale;

  switch (ann.type) {
    case 'point':
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'rectangle':
    case 'rect': {
      const w = (ann.w || 0) * scale;
      const h = (ann.h || 0) * scale;
      ctx.strokeRect(x, y, w, h);
      break;
    }
    case 'circle': {
      const r = (ann.r || 0) * scale;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'text': {
      ctx.font = ann.font || '16px sans-serif';
      ctx.fillText(ann.text || '', x + 4, y - 4);
      break;
    }
    case 'arrow': {
      const x2 = imgX + (ann.x2 || ann.x) * scale;
      const y2 = imgY + (ann.y2 || ann.y) * scale;
      drawArrow(ctx, x, y, x2, y2);
      break;
    }
  }

  ctx.restore();
}

function drawArrow(ctx, x1, y1, x2, y2) {
  const headLen = 10;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6),
             y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6),
             y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function canvasToImageCoords(canvasX, canvasY) {
  const scale = getCurrentScale();
  const imgX = PhotoViewport.offsetX;
  const imgY = PhotoViewport.offsetY;

  const xInImage = (canvasX - imgX) / scale;
  const yInImage = (canvasY - imgY) / scale;
  return { x: xInImage, y: yInImage };
}
