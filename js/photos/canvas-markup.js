// Photo Markup Module
// Canvas-based photo annotation and markup tools
// Based on Clearances-Genie implementation

export default class PhotoMarkup {
  constructor() {
    this.canvas = document.getElementById('markup-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.currentTool = 'point';
    this.isDrawing = false;
    this.startPos = null;
    this.originalImage = null;
    this.imageData = null;

    this.elements = []; // Stored markup elements
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
      // Set canvas size to match image
      this.canvas.width = img.width;
      this.canvas.height = img.height;

      // Draw image
      this.ctx.drawImage(img, 0, 0);

      // Store original image and data
      this.originalImage = img;
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
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    this.isDrawing = true;
    this.startPos = { x, y };

    if (this.currentTool === 'point') {
      this.drawPoint(x, y);
      this.isDrawing = false;
    } else if (this.currentTool === 'text') {
      this.addText(x, y);
      this.isDrawing = false;
    }
  }

  handleMouseMove(e) {
    if (!this.isDrawing || !this.startPos) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    // Redraw canvas with preview
    this.redrawCanvas();

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.fillStyle = this.currentColor;
    this.ctx.lineWidth = this.lineWidth;

    if (this.currentTool === 'rectangle') {
      this.previewRectangle(this.startPos.x, this.startPos.y, x, y);
    } else if (this.currentTool === 'circle') {
      this.previewCircle(this.startPos.x, this.startPos.y, x, y);
    } else if (this.currentTool === 'arrow') {
      this.previewArrow(this.startPos.x, this.startPos.y, x, y);
    }
  }

  handleMouseUp(e) {
    if (!this.isDrawing || !this.startPos) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    // Save the element
    const element = {
      type: this.currentTool,
      start: this.startPos,
      end: { x, y },
      color: this.currentColor,
      lineWidth: this.lineWidth
    };

    this.elements.push(element);
    this.redrawCanvas();

    this.isDrawing = false;
    this.startPos = null;
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

  drawPoint(x, y) {
    this.ctx.fillStyle = this.currentColor;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fill();

    // Add cross hairs
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 15, y);
    this.ctx.lineTo(x + 15, y);
    this.ctx.moveTo(x, y - 15);
    this.ctx.lineTo(x, y + 15);
    this.ctx.stroke();

    this.elements.push({
      type: 'point',
      x,
      y,
      color: this.currentColor
    });
  }

  previewRectangle(x1, y1, x2, y2) {
    this.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }

  previewCircle(x1, y1, x2, y2) {
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    this.ctx.beginPath();
    this.ctx.arc(x1, y1, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  previewArrow(x1, y1, x2, y2) {
    const headlen = 20;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    // Draw arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - headlen * Math.cos(angle - Math.PI / 6),
      y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - headlen * Math.cos(angle + Math.PI / 6),
      y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  addText(x, y) {
    const text = prompt('Enter text:');
    if (!text) return;

    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = this.currentColor;
    this.ctx.fillText(text, x, y);

    this.elements.push({
      type: 'text',
      x,
      y,
      text,
      color: this.currentColor,
      font: '20px Arial'
    });
  }

  redrawCanvas() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Redraw original image
    if (this.originalImage) {
      this.ctx.drawImage(this.originalImage, 0, 0);
    }

    // Redraw all elements
    this.elements.forEach(element => {
      this.ctx.strokeStyle = element.color;
      this.ctx.fillStyle = element.color;
      this.ctx.lineWidth = element.lineWidth || this.lineWidth;

      if (element.type === 'point') {
        this.ctx.fillStyle = element.color;
        this.ctx.beginPath();
        this.ctx.arc(element.x, element.y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = element.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(element.x - 15, element.y);
        this.ctx.lineTo(element.x + 15, element.y);
        this.ctx.moveTo(element.x, element.y - 15);
        this.ctx.lineTo(element.x, element.y + 15);
        this.ctx.stroke();
      } else if (element.type === 'rectangle') {
        this.ctx.strokeRect(
          element.start.x,
          element.start.y,
          element.end.x - element.start.x,
          element.end.y - element.start.y
        );
      } else if (element.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(element.end.x - element.start.x, 2) +
          Math.pow(element.end.y - element.start.y, 2)
        );
        this.ctx.beginPath();
        this.ctx.arc(element.start.x, element.start.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (element.type === 'arrow') {
        this.previewArrow(
          element.start.x,
          element.start.y,
          element.end.x,
          element.end.y
        );
      } else if (element.type === 'text') {
        this.ctx.font = element.font || '20px Arial';
        this.ctx.fillStyle = element.color;
        this.ctx.fillText(element.text, element.x, element.y);
      }
    });
  }

  clear() {
    this.elements = [];
    this.redrawCanvas();
  }

  export() {
    // Export as PNG data URL
    return this.canvas.toDataURL('image/png');
  }

  undo() {
    if (this.elements.length > 0) {
      this.elements.pop();
      this.redrawCanvas();
    }
  }
}
