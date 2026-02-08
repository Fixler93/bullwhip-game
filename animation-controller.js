// animation-controller.js
// Manages all visual animations in the supply chain

export class AnimationController {
  constructor() {
    this.activeAnimations = [];
    this.animationQueue = [];
  }

  createShipmentAnimation(fromRole, toRole, quantity, delay = 0) {
    const positions = {
      'supplier': { x: 650, y: 50 },
      'manufacturer': { x: 500, y: 200 },
      'wholesaler': { x: 200, y: 200 },
      'distributor': { x: 200, y: 380 },
      'retailer': { x: 500, y: 380 }
    };

    const from = positions[fromRole];
    const to = positions[toRole];

    return {
      id: `${fromRole}-${toRole}-${Date.now()}`,
      type: 'shipment',
      fromRole,
      toRole,
      quantity,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      progress: 0,
      duration: 2000, // 2 seconds
      delay,
      color: this.getShipmentColor(fromRole)
    };
  }

  createOrderAnimation(fromRole, toRole, quantity) {
    const positions = {
      'supplier': { x: 650, y: 50 },
      'manufacturer': { x: 500, y: 200 },
      'wholesaler': { x: 200, y: 200 },
      'distributor': { x: 200, y: 380 },
      'retailer': { x: 500, y: 380 }
    };

    const from = positions[fromRole];
    const to = positions[toRole];

    return {
      id: `order-${fromRole}-${toRole}-${Date.now()}`,
      type: 'order',
      fromRole,
      toRole,
      quantity,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      progress: 0,
      duration: 1000, // 1 second for orders (faster)
      delay: 0,
      color: '#FFD700' // Gold for orders
    };
  }

  getShipmentColor(fromRole) {
    const colors = {
      'supplier': '#10B981',
      'manufacturer': '#F59E0B',
      'wholesaler': '#EC4899',
      'distributor': '#8B5CF6',
      'retailer': '#3B82F6'
    };
    return colors[fromRole] || '#6B7280';
  }

  addAnimation(animation) {
    this.animationQueue.push(animation);
  }

  update(deltaTime) {
    // Move animations from queue to active after delay
    this.animationQueue = this.animationQueue.filter(anim => {
      if (anim.delay <= 0) {
        this.activeAnimations.push(anim);
        return false;
      }
      anim.delay -= deltaTime;
      return true;
    });

    // Update active animations
    this.activeAnimations = this.activeAnimations.filter(anim => {
      anim.progress += deltaTime / anim.duration;
      
      if (anim.progress >= 1) {
        return false; // Remove completed animations
      }
      
      return true;
    });
  }

  getActiveAnimations() {
    return this.activeAnimations.map(anim => ({
      ...anim,
      currentX: anim.fromX + (anim.toX - anim.fromX) * anim.progress,
      currentY: anim.fromY + (anim.toY - anim.fromY) * anim.progress
    }));
  }

  clear() {
    this.activeAnimations = [];
    this.animationQueue = [];
  }

  createTruckAnimation(fromX, fromY, toX, toY, type = 'small') {
    return {
      id: `truck-${Date.now()}`,
      type: 'truck',
      vehicleType: type, // 'small' or 'large'
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      duration: 2500
    };
  }

  createShipAnimation(fromX, fromY, toX, toY) {
    return {
      id: `ship-${Date.now()}`,
      type: 'ship',
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      duration: 3000 // Ships are slower
    };
  }

  createPackageAnimation(fromX, fromY, toX, toY, packageType = 'box') {
    return {
      id: `package-${Date.now()}`,
      type: 'package',
      packageType, // 'box', 'barrel', 'crate'
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      duration: 2000
    };
  }
}

export class AnimationRenderer {
  static renderShipment(animation, svgRef) {
    const x = animation.currentX;
    const y = animation.currentY;
    const size = Math.min(8, 4 + animation.quantity * 0.5);

    return (
      <g key={animation.id}>
        <circle
          cx={x}
          cy={y}
          r={size}
          fill={animation.color}
          opacity={0.8}
        />
        <text
          x={x}
          y={y - size - 5}
          textAnchor="middle"
          className="text-xs font-bold"
          fill={animation.color}
        >
          {animation.quantity}
        </text>
      </g>
    );
  }

  static renderTruck(animation) {
    const x = animation.fromX + (animation.toX - animation.fromX) * animation.progress;
    const y = animation.fromY + (animation.toY - animation.fromY) * animation.progress;
    const rotation = Math.atan2(animation.toY - animation.fromY, animation.toX - animation.fromX) * 180 / Math.PI;

    return (
      <g key={animation.id} transform={`translate(${x}, ${y}) rotate(${rotation})`}>
        <rect x="-10" y="-5" width="20" height="10" fill="#4B5563" rx="2" />
        <circle cx="-6" cy="6" r="2" fill="#1F2937" />
        <circle cx="6" cy="6" r="2" fill="#1F2937" />
      </g>
    );
  }

  static renderShip(animation) {
    const x = animation.fromX + (animation.toX - animation.fromX) * animation.progress;
    const y = animation.fromY + (animation.toY - animation.fromY) * animation.progress;

    return (
      <g key={animation.id} transform={`translate(${x}, ${y})`}>
        <path d="M -15,0 L -10,-10 L 10,-10 L 15,0 L 10,5 L -10,5 Z" fill="#3B82F6" opacity="0.8" />
        <rect x="-8" y="-15" width="16" height="5" fill="#60A5FA" />
      </g>
    );
  }

  static renderPackage(animation) {
    const x = animation.fromX + (animation.toX - animation.fromX) * animation.progress;
    const y = animation.fromY + (animation.toY - animation.fromY) * animation.progress;

    return (
      <g key={animation.id} transform={`translate(${x}, ${y})`}>
        <rect x="-6" y="-6" width="12" height="12" fill="#8B4513" stroke="#654321" strokeWidth="1" />
        <line x1="-6" y1="0" x2="6" y2="0" stroke="#654321" strokeWidth="1" />
        <line x1="0" y1="-6" x2="0" y2="6" stroke="#654321" strokeWidth="1" />
      </g>
    );
  }
}
