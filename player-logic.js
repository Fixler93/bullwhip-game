// player-logic.js
// AI decision-making logic and player strategy patterns

export class PlayerLogic {
  static STRATEGIES = {
    LEAN: 'lean',
    BALANCED: 'balanced',
    AGGRESSIVE: 'aggressive',
    REACTIVE: 'reactive',
    PREDICTIVE: 'predictive'
  };

  static calculateOptimalOrder(currentState, strategy = PlayerLogic.STRATEGIES.BALANCED) {
    const {
      inventory,
      incomingOrder,
      orderHistory = [],
      incomingShipments = [],
      round
    } = currentState;

    switch (strategy) {
      case PlayerLogic.STRATEGIES.LEAN:
        return PlayerLogic.leanStrategy(currentState);
      
      case PlayerLogic.STRATEGIES.BALANCED:
        return PlayerLogic.balancedStrategy(currentState);
      
      case PlayerLogic.STRATEGIES.AGGRESSIVE:
        return PlayerLogic.aggressiveStrategy(currentState);
      
      case PlayerLogic.STRATEGIES.REACTIVE:
        return PlayerLogic.reactiveStrategy(currentState);
      
      case PlayerLogic.STRATEGIES.PREDICTIVE:
        return PlayerLogic.predictiveStrategy(currentState);
      
      default:
        return incomingOrder || 0;
    }
  }

  static leanStrategy(state) {
    // Minimize inventory - order only what's needed
    const { inventory, incomingOrder = 0, incomingShipments = [] } = state;
    
    // Calculate expected inventory after shipments arrive
    const expectedInventory = inventory + incomingShipments.reduce((a, b) => a + b, 0);
    
    // Order only enough to cover demand minus expected inventory
    const orderQuantity = Math.max(0, incomingOrder - expectedInventory);
    
    return Math.round(orderQuantity);
  }

  static balancedStrategy(state) {
    // Maintain moderate buffer
    const { inventory, incomingOrder = 0, incomingShipments = [] } = state;
    const TARGET_BUFFER = 5;
    
    const expectedInventory = inventory + incomingShipments.reduce((a, b) => a + b, 0);
    const orderQuantity = Math.max(0, incomingOrder + TARGET_BUFFER - expectedInventory);
    
    return Math.round(orderQuantity);
  }

  static aggressiveStrategy(state) {
    // Build large buffer to prevent stockouts
    const { inventory, incomingOrder = 0, orderHistory = [] } = state;
    const TARGET_BUFFER = 15;
    
    // Also consider recent demand trends
    const recentAvg = orderHistory.length > 0
      ? orderHistory.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, orderHistory.length)
      : incomingOrder;
    
    const orderQuantity = Math.max(incomingOrder, recentAvg) + TARGET_BUFFER - inventory;
    
    return Math.round(Math.max(0, orderQuantity));
  }

  static reactiveStrategy(state) {
    // React strongly to recent demand changes
    const { orderHistory = [], incomingOrder = 0, inventory } = state;
    
    if (orderHistory.length < 2) {
      return Math.max(0, incomingOrder - inventory);
    }
    
    // Calculate trend from recent orders
    const recentOrders = orderHistory.slice(-3);
    const trend = recentOrders[recentOrders.length - 1] - recentOrders[0];
    const avgRecent = recentOrders.reduce((a, b) => a + b, 0) / recentOrders.length;
    
    // Amplify the trend
    const projected = avgRecent + trend * 2;
    const orderQuantity = Math.max(0, projected - inventory);
    
    return Math.round(orderQuantity);
  }

  static predictiveStrategy(state) {
    // Use statistical forecasting
    const { orderHistory = [], incomingOrder = 0, inventory, round = 1 } = state;
    
    if (orderHistory.length < 3) {
      return PlayerLogic.balancedStrategy(state);
    }
    
    // Simple moving average with trend
    const windowSize = Math.min(5, orderHistory.length);
    const recentOrders = orderHistory.slice(-windowSize);
    const ma = recentOrders.reduce((a, b) => a + b, 0) / windowSize;
    
    // Linear regression for trend
    const trend = PlayerLogic.calculateTrend(recentOrders);
    
    // Forecast next period
    const forecast = ma + trend * 2;
    
    // Calculate safety stock based on variability
    const stdDev = PlayerLogic.calculateStdDev(recentOrders);
    const safetyStock = stdDev * 1.5;
    
    const targetInventory = forecast + safetyStock;
    const orderQuantity = Math.max(0, targetInventory - inventory);
    
    return Math.round(orderQuantity);
  }

  static calculateTrend(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  static calculateStdDev(data) {
    if (data.length === 0) return 0;
    
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    
    return Math.sqrt(variance);
  }

  static analyzePerformance(orderHistory, inventoryHistory, demandHistory) {
    const totalStockouts = demandHistory.reduce((sum, demand, index) => {
      const inventory = inventoryHistory[index] || 0;
      return sum + Math.max(0, demand - inventory);
    }, 0);
    
    const avgInventory = inventoryHistory.reduce((a, b) => a + b, 0) / inventoryHistory.length;
    
    const orderVariability = PlayerLogic.calculateStdDev(orderHistory);
    const demandVariability = PlayerLogic.calculateStdDev(demandHistory);
    
    const bullwhipRatio = orderVariability / (demandVariability || 1);
    
    return {
      totalStockouts,
      avgInventory,
      orderVariability,
      demandVariability,
      bullwhipRatio,
      performanceScore: PlayerLogic.calculatePerformanceScore({
        totalStockouts,
        avgInventory,
        bullwhipRatio
      })
    };
  }

  static calculatePerformanceScore(metrics) {
    const { totalStockouts, avgInventory, bullwhipRatio } = metrics;
    
    // Lower is better for all metrics
    const stockoutPenalty = totalStockouts * 10;
    const inventoryPenalty = avgInventory * 0.5;
    const bullwhipPenalty = Math.max(0, bullwhipRatio - 1) * 20;
    
    const totalPenalty = stockoutPenalty + inventoryPenalty + bullwhipPenalty;
    const baseScore = 1000;
    
    return Math.max(0, baseScore - totalPenalty);
  }

  static generateRecommendation(state, performanceHistory = []) {
    const { inventory, orderHistory = [], round } = state;
    
    const recommendations = [];
    
    // Check inventory levels
    if (inventory < 3) {
      recommendations.push({
        type: 'warning',
        message: 'Low inventory detected. Consider ordering more to prevent stockouts.',
        priority: 'high'
      });
    } else if (inventory > 20) {
      recommendations.push({
        type: 'info',
        message: 'High inventory levels. Consider reducing orders to minimize holding costs.',
        priority: 'medium'
      });
    }
    
    // Check order volatility
    if (orderHistory.length >= 3) {
      const recentOrders = orderHistory.slice(-3);
      const volatility = PlayerLogic.calculateStdDev(recentOrders);
      const avgOrder = recentOrders.reduce((a, b) => a + b, 0) / 3;
      
      if (volatility > avgOrder * 0.5) {
        recommendations.push({
          type: 'tip',
          message: 'Your order quantities vary significantly. Consistent ordering helps reduce the Bullwhip Effect.',
          priority: 'medium'
        });
      }
    }
    
    // Round-specific advice
    if (round < 5) {
      recommendations.push({
        type: 'info',
        message: 'Early game: Focus on understanding demand patterns before building large inventories.',
        priority: 'low'
      });
    } else if (round > 15) {
      recommendations.push({
        type: 'info',
        message: 'End game approaching: Consider liquidating excess inventory to minimize holding costs.',
        priority: 'low'
      });
    }
    
    return recommendations;
  }

  static getStrategyDescription(strategy) {
    const descriptions = {
      [PlayerLogic.STRATEGIES.LEAN]: {
        name: 'Lean Inventory',
        description: 'Minimize inventory by ordering only what is needed. Reduces holding costs but increases stockout risk.',
        pros: ['Low holding costs', 'Efficient capital use'],
        cons: ['Higher stockout risk', 'Sensitive to demand spikes']
      },
      [PlayerLogic.STRATEGIES.BALANCED]: {
        name: 'Balanced Approach',
        description: 'Maintain moderate buffer stock. Balances holding costs against stockout risk.',
        pros: ['Moderate costs', 'Reasonable service level'],
        cons: ['May not optimize either metric']
      },
      [PlayerLogic.STRATEGIES.AGGRESSIVE]: {
        name: 'Safety Stock',
        description: 'Build large inventory buffers. Maximizes service level but increases holding costs.',
        pros: ['Low stockout risk', 'High service level'],
        cons: ['High holding costs', 'Capital intensive']
      },
      [PlayerLogic.STRATEGIES.REACTIVE]: {
        name: 'Trend Following',
        description: 'React strongly to demand changes. Can amplify the Bullwhip Effect.',
        pros: ['Responsive to changes'],
        cons: ['Can amplify volatility', 'May overreact']
      },
      [PlayerLogic.STRATEGIES.PREDICTIVE]: {
        name: 'Forecasting',
        description: 'Use statistical forecasting with safety stock. Data-driven approach.',
        pros: ['Scientific approach', 'Accounts for variability'],
        cons: ['Requires historical data', 'Complex calculations']
      }
    };
    
    return descriptions[strategy] || descriptions[PlayerLogic.STRATEGIES.BALANCED];
  }
}

export default PlayerLogic;
