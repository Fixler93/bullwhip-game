// game-engine.js
// Core game logic and state management for the Bullwhip Effect simulation

export class GameEngine {
  constructor(roles, playerName) {
    this.roles = roles;
    this.playerName = playerName;
    this.currentRound = 0;
    this.playerRoleHistory = [];
    
    // Initialize supply chain entities
    this.entities = {};
    roles.forEach(role => {
      this.entities[role.id] = {
        id: role.id,
        name: role.name,
        inventory: 12,
        incomingOrders: [],
        outgoingOrders: [],
        incomingShipments: [],
        outgoingShipments: [],
        orderHistory: [],
        inventoryHistory: [12],
        stockoutCosts: 0,
        holdingCosts: 0,
        unfulfilledDemand: 0
      };
    });
    
    // Customer demand generator
    this.demandTrend = this.generateDemandTrend();
    this.currentDemandPhase = 0;
  }

  generateDemandTrend() {
    // Create a realistic demand pattern with phases
    const trend = [];
    
    // Phase 1: Stable low demand (rounds 1-5)
    for (let i = 0; i < 5; i++) {
      trend.push({ min: 4, max: 6, volatility: 0.1 });
    }
    
    // Phase 2: Gradual increase (rounds 6-9)
    for (let i = 0; i < 4; i++) {
      trend.push({ min: 5 + i, max: 7 + i, volatility: 0.15 });
    }
    
    // Phase 3: Peak demand (rounds 10-12)
    for (let i = 0; i < 3; i++) {
      trend.push({ min: 8, max: 12, volatility: 0.2 });
    }
    
    // Phase 4: Sharp drop (rounds 13-15)
    for (let i = 0; i < 3; i++) {
      trend.push({ min: 6 - i, max: 8 - i, volatility: 0.15 });
    }
    
    // Phase 5: Stabilization (rounds 16-18)
    for (let i = 0; i < 3; i++) {
      trend.push({ min: 4, max: 6, volatility: 0.1 });
    }
    
    // Phase 6: Final spike (rounds 19-20)
    for (let i = 0; i < 2; i++) {
      trend.push({ min: 7, max: 10, volatility: 0.2 });
    }
    
    return trend;
  }

  getCustomerDemand(round) {
    if (round < 1 || round > 20) return 0;
    
    const phase = this.demandTrend[round - 1];
    const base = Math.floor(Math.random() * (phase.max - phase.min + 1)) + phase.min;
    const noise = (Math.random() - 0.5) * 2 * phase.volatility * base;
    
    return Math.max(0, Math.round(base + noise));
  }

  assignRandomRole(round) {
    const availableRoles = [...this.roles];
    const randomIndex = Math.floor(Math.random() * availableRoles.length);
    const selectedRole = availableRoles[randomIndex];
    
    this.playerRoleHistory.push({ round, role: selectedRole.id });
    return selectedRole;
  }

  getRoundState(round, roleId) {
    const entity = this.entities[roleId];
    
    return {
      inventory: entity.inventory,
      pendingOrders: entity.incomingOrders.slice(0, 1),
      incomingShipments: entity.incomingShipments,
      orderHistory: entity.orderHistory.slice(-10)
    };
  }

  processPlayerOrder(roleId, quantity, round) {
    const entity = this.entities[roleId];
    
    // Process incoming order (from downstream)
    const incomingOrder = entity.incomingOrders.shift() || 0;
    
    // Fulfill as much as possible from inventory
    const fulfilled = Math.min(incomingOrder, entity.inventory);
    const unfulfilled = incomingOrder - fulfilled;
    
    entity.inventory -= fulfilled;
    entity.unfulfilledDemand += unfulfilled;
    
    // Receive incoming shipments (2-round delay)
    if (entity.incomingShipments.length >= 2) {
      const shipment = entity.incomingShipments.shift();
      entity.inventory += shipment;
    }
    
    // Place order upstream
    entity.outgoingOrders.push(quantity);
    entity.orderHistory.push(incomingOrder);
    
    // Calculate costs
    const stockoutCost = unfulfilled * 1.0;
    const holdingCost = entity.inventory * 0.5;
    
    entity.stockoutCosts += stockoutCost;
    entity.holdingCosts += holdingCost;
    entity.inventoryHistory.push(entity.inventory);
    
    // Process AI entities
    this.processAIEntities(round, roleId);
    
    return {
      newInventory: entity.inventory,
      stockoutCost,
      holdingCost,
      fulfilled,
      unfulfilled
    };
  }

  processAIEntities(round, playerRoleId) {
    const roleOrder = ['retailer', 'distributor', 'wholesaler', 'manufacturer', 'supplier'];
    
    roleOrder.forEach(roleId => {
      if (roleId === playerRoleId) return; // Skip player's role
      
      const entity = this.entities[roleId];
      const strategy = this.getAIStrategy(roleId, round);
      
      // Get incoming order
      let incomingOrder;
      if (roleId === 'retailer') {
        incomingOrder = this.getCustomerDemand(round);
      } else {
        const downstreamRoleId = roleOrder[roleOrder.indexOf(roleId) - 1];
        const downstreamEntity = this.entities[downstreamRoleId];
        incomingOrder = downstreamEntity.outgoingOrders.shift() || 0;
      }
      
      entity.incomingOrders.push(incomingOrder);
      
      // Process this round's order
      const orderToProcess = entity.incomingOrders.shift() || 0;
      const fulfilled = Math.min(orderToProcess, entity.inventory);
      const unfulfilled = orderToProcess - fulfilled;
      
      entity.inventory -= fulfilled;
      entity.unfulfilledDemand += unfulfilled;
      
      // Receive shipments
      if (entity.incomingShipments.length >= 2) {
        const shipment = entity.incomingShipments.shift();
        entity.inventory += shipment;
      }
      
      // AI decision making
      const orderQuantity = this.calculateAIOrder(entity, strategy, orderToProcess, round);
      entity.outgoingOrders.push(orderQuantity);
      entity.orderHistory.push(orderToProcess);
      
      // Calculate costs
      entity.stockoutCosts += unfulfilled * 1.0;
      entity.holdingCosts += entity.inventory * 0.5;
      entity.inventoryHistory.push(entity.inventory);
      
      // Send shipment downstream (if not retailer)
      if (roleId !== 'retailer') {
        const downstreamRoleId = roleOrder[roleOrder.indexOf(roleId) - 1];
        const downstreamEntity = this.entities[downstreamRoleId];
        downstreamEntity.incomingShipments.push(fulfilled);
      }
    });
    
    // Handle supplier shipments to manufacturer
    const supplierEntity = this.entities['supplier'];
    const manufacturerEntity = this.entities['manufacturer'];
    const supplierOrder = supplierEntity.incomingOrders[supplierEntity.incomingOrders.length - 1] || 0;
    manufacturerEntity.incomingShipments.push(supplierOrder);
  }

  getAIStrategy(roleId, round) {
    // Different AI strategies based on round and role
    const strategies = ['conservative', 'balanced', 'aggressive', 'reactive'];
    
    // Earlier rounds: more conservative
    if (round < 5) return 'conservative';
    
    // Mid game: vary by role
    if (round < 12) {
      const roleStrategies = {
        'retailer': 'reactive',
        'distributor': 'balanced',
        'wholesaler': 'balanced',
        'manufacturer': 'conservative',
        'supplier': 'aggressive'
      };
      return roleStrategies[roleId] || 'balanced';
    }
    
    // Late game: more reactive
    return 'reactive';
  }

  calculateAIOrder(entity, strategy, currentOrder, round) {
    const recentOrders = entity.orderHistory.slice(-3);
    const avgRecentOrder = recentOrders.length > 0 
      ? recentOrders.reduce((a, b) => a + b, 0) / recentOrders.length 
      : currentOrder;
    
    let orderQuantity;
    
    switch (strategy) {
      case 'conservative':
        // Order exactly what was demanded, maintain minimal inventory
        orderQuantity = currentOrder;
        break;
        
      case 'balanced':
        // Order current demand plus a small buffer
        orderQuantity = Math.round(currentOrder + (currentOrder * 0.2));
        break;
        
      case 'aggressive':
        // Order significantly more to build inventory
        orderQuantity = Math.round(currentOrder * 1.5);
        if (entity.inventory < 5) {
          orderQuantity += 5; // Emergency buffer
        }
        break;
        
      case 'reactive':
        // React strongly to recent trends
        const trend = recentOrders.length >= 2 
          ? recentOrders[recentOrders.length - 1] - recentOrders[0]
          : 0;
        orderQuantity = Math.round(avgRecentOrder + trend * 1.5);
        break;
        
      default:
        orderQuantity = currentOrder;
    }
    
    // Add some randomness
    const variance = Math.floor((Math.random() - 0.5) * 2 * 2);
    orderQuantity = Math.max(0, orderQuantity + variance);
    
    // Consider inventory position
    if (entity.inventory > 20) {
      orderQuantity = Math.floor(orderQuantity * 0.7); // Reduce orders if overstocked
    } else if (entity.inventory < 3) {
      orderQuantity = Math.ceil(orderQuantity * 1.3); // Increase if understocked
    }
    
    return Math.round(orderQuantity);
  }

  generateForecast(roleId, round) {
    const entity = this.entities[roleId];
    const recentOrders = entity.orderHistory.slice(-3);
    
    if (recentOrders.length === 0) {
      return [4, 8];
    }
    
    const avg = recentOrders.reduce((a, b) => a + b, 0) / recentOrders.length;
    const trend = recentOrders.length >= 2 
      ? (recentOrders[recentOrders.length - 1] - recentOrders[0]) / recentOrders.length
      : 0;
    
    const forecast = avg + trend * 2;
    const min = Math.max(0, Math.floor(forecast * 0.8));
    const max = Math.ceil(forecast * 1.2);
    
    return [min, max];
  }

  getAnimationsForRound(round) {
    // Generate animation data for shipments in transit
    const animations = [];
    
    // This would be expanded to show actual shipments moving
    // For now, return empty array
    return animations;
  }

  calculateResponsibilityScore(roleId) {
    const roleOrder = ['supplier', 'manufacturer', 'wholesaler', 'distributor', 'retailer'];
    const roleIndex = roleOrder.indexOf(roleId);
    
    let responsibilityScore = 0;
    const entity = this.entities[roleId];
    
    // For each unfulfilled order, check if it caused downstream stockouts
    if (entity.unfulfilledDemand > 0 && roleIndex < roleOrder.length - 1) {
      for (let i = roleIndex + 1; i < roleOrder.length; i++) {
        const downstreamEntity = this.entities[roleOrder[i]];
        if (downstreamEntity.unfulfilledDemand > 0) {
          responsibilityScore += Math.min(entity.unfulfilledDemand, downstreamEntity.unfulfilledDemand);
        }
      }
    }
    
    return responsibilityScore;
  }

  getFinalResults() {
    const rankings = Object.keys(this.entities).map(roleId => {
      const entity = this.entities[roleId];
      const role = this.roles.find(r => r.id === roleId);
      
      return {
        roleId,
        role: role.name,
        totalCost: entity.stockoutCosts + entity.holdingCosts,
        stockoutCosts: entity.stockoutCosts,
        holdingCosts: entity.holdingCosts,
        responsibilityScore: this.calculateResponsibilityScore(roleId),
        avgInventory: entity.inventoryHistory.reduce((a, b) => a + b, 0) / entity.inventoryHistory.length
      };
    });
    
    // Sort by total cost
    rankings.sort((a, b) => a.totalCost - b.totalCost);
    
    // Compile inventory history
    const inventoryHistory = {};
    Object.keys(this.entities).forEach(roleId => {
      inventoryHistory[roleId] = this.entities[roleId].inventoryHistory;
    });
    
    // Compile order history
    const orderHistory = {};
    Object.keys(this.entities).forEach(roleId => {
      orderHistory[roleId] = this.entities[roleId].orderHistory;
    });
    
    return {
      rankings,
      inventoryHistory,
      orderHistory,
      playerRoleHistory: this.playerRoleHistory
    };
  }
}
