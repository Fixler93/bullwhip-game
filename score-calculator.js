// score-calculator.js
// Calculates scores, costs, and performance metrics

export class ScoreCalculator {
  static COST_STOCKOUT = 1.0;
  static COST_HOLDING = 0.5;

  static calculateRoundCosts(inventory, unfulfilled) {
    return {
      stockout: unfulfilled * ScoreCalculator.COST_STOCKOUT,
      holding: inventory * ScoreCalculator.COST_HOLDING,
      total: (unfulfilled * ScoreCalculator.COST_STOCKOUT) + (inventory * ScoreCalculator.COST_HOLDING)
    };
  }

  static calculateTotalCosts(costHistory) {
    return costHistory.reduce((total, round) => ({
      stockout: total.stockout + round.stockout,
      holding: total.holding + round.holding,
      total: total.total + round.total
    }), { stockout: 0, holding: 0, total: 0 });
  }

  static calculateResponsibilityScore(roleId, entities, roleOrder) {
    const roleIndex = roleOrder.indexOf(roleId);
    const entity = entities[roleId];
    
    if (!entity) return 0;
    
    let responsibilityScore = 0;
    
    // For each round where this entity had stockouts
    entity.stockoutHistory?.forEach((stockout, round) => {
      if (stockout > 0) {
        // Check if downstream entities also had stockouts in subsequent rounds
        for (let i = roleIndex - 1; i >= 0; i--) {
          const downstreamId = roleOrder[i];
          const downstreamEntity = entities[downstreamId];
          
          // Check rounds after this one (due to delay)
          const affectedRound = round + (roleIndex - i) * 2; // Account for shipment delays
          
          if (downstreamEntity.stockoutHistory?.[affectedRound] > 0) {
            // This entity's stockout likely contributed to downstream stockout
            responsibilityScore += Math.min(stockout, downstreamEntity.stockoutHistory[affectedRound]);
          }
        }
      }
    });
    
    return responsibilityScore;
  }

  static calculateServiceLevel(fulfilled, total) {
    if (total === 0) return 100;
    return (fulfilled / total) * 100;
  }

  static calculateInventoryTurnover(avgInventory, totalDemand, periods) {
    if (avgInventory === 0) return 0;
    return totalDemand / avgInventory;
  }

  static calculateFillRate(ordersFilled, totalOrders) {
    if (totalOrders === 0) return 100;
    return (ordersFilled / totalOrders) * 100;
  }

  static generatePerformanceReport(entityData, roleId, roleName) {
    const {
      inventoryHistory,
      orderHistory,
      stockoutHistory,
      costHistory
    } = entityData;

    const totalRounds = inventoryHistory.length;
    const avgInventory = inventoryHistory.reduce((a, b) => a + b, 0) / totalRounds;
    const maxInventory = Math.max(...inventoryHistory);
    const minInventory = Math.min(...inventoryHistory);
    
    const totalDemand = orderHistory.reduce((a, b) => a + b, 0);
    const avgDemand = totalDemand / totalRounds;
    
    const totalStockouts = stockoutHistory.reduce((a, b) => a + b, 0);
    const stockoutRounds = stockoutHistory.filter(s => s > 0).length;
    
    const totalCosts = ScoreCalculator.calculateTotalCosts(costHistory);
    
    const inventoryTurnover = ScoreCalculator.calculateInventoryTurnover(
      avgInventory,
      totalDemand,
      totalRounds
    );

    const serviceLevel = ScoreCalculator.calculateServiceLevel(
      totalDemand - totalStockouts,
      totalDemand
    );

    return {
      roleId,
      roleName,
      summary: {
        totalCosts: totalCosts.total,
        stockoutCosts: totalCosts.stockout,
        holdingCosts: totalCosts.holding,
        avgInventory,
        maxInventory,
        minInventory,
        totalStockouts,
        stockoutRounds,
        serviceLevel: serviceLevel.toFixed(1),
        inventoryTurnover: inventoryTurnover.toFixed(2)
      },
      details: {
        inventoryHistory,
        orderHistory,
        stockoutHistory,
        costHistory
      }
    };
  }

  static rankEntities(entities, roleOrder) {
    const rankings = Object.keys(entities).map(roleId => {
      const entity = entities[roleId];
      const totalCosts = entity.stockoutCosts + entity.holdingCosts;
      
      return {
        roleId,
        roleName: roleOrder.find(r => r === roleId) || roleId,
        totalCosts,
        stockoutCosts: entity.stockoutCosts,
        holdingCosts: entity.holdingCosts,
        responsibilityScore: ScoreCalculator.calculateResponsibilityScore(
          roleId,
          entities,
          roleOrder
        ),
        avgInventory: entity.inventoryHistory.reduce((a, b) => a + b, 0) / entity.inventoryHistory.length,
        totalStockouts: entity.unfulfilledDemand
      };
    });

    // Sort by total costs (ascending - lower is better)
    rankings.sort((a, b) => a.totalCosts - b.totalCosts);
    
    return rankings.map((rank, index) => ({
      ...rank,
      rank: index + 1
    }));
  }

  static calculateBullwhipMetrics(entities, roleOrder) {
    const metrics = {};
    
    roleOrder.forEach((roleId, index) => {
      const entity = entities[roleId];
      if (!entity || !entity.orderHistory || entity.orderHistory.length === 0) {
        metrics[roleId] = { variance: 0, ratio: 1 };
        return;
      }
      
      const orders = entity.orderHistory;
      const mean = orders.reduce((a, b) => a + b, 0) / orders.length;
      const variance = orders.reduce((sum, order) => {
        return sum + Math.pow(order - mean, 2);
      }, 0) / orders.length;
      
      metrics[roleId] = {
        mean,
        variance,
        stdDev: Math.sqrt(variance),
        coefficientOfVariation: mean > 0 ? Math.sqrt(variance) / mean : 0
      };
      
      // Calculate bullwhip ratio (variance ratio between adjacent stages)
      if (index > 0) {
        const downstreamRoleId = roleOrder[index - 1];
        const downstreamVariance = metrics[downstreamRoleId]?.variance || 1;
        metrics[roleId].bullwhipRatio = variance / (downstreamVariance || 1);
      } else {
        metrics[roleId].bullwhipRatio = 1;
      }
    });
    
    return metrics;
  }

  static generateInsights(rankings, bullwhipMetrics, playerRoleHistory) {
    const insights = [];
    
    // Overall performance insight
    const playerPerformance = rankings.find(r => r.isPlayer);
    if (playerPerformance) {
      if (playerPerformance.rank === 1) {
        insights.push({
          type: 'success',
          title: 'Excellent Performance!',
          message: 'You achieved the lowest total costs in the supply chain. Great job managing inventory and demand!'
        });
      } else if (playerPerformance.rank <= 2) {
        insights.push({
          type: 'good',
          title: 'Strong Performance',
          message: 'You performed well, though there\'s room for optimization in balancing inventory and stockouts.'
        });
      } else {
        insights.push({
          type: 'info',
          title: 'Learning Opportunity',
          message: 'Consider strategies to better balance inventory levels and order quantities to reduce costs.'
        });
      }
    }
    
    // Bullwhip effect insight
    const maxBullwhip = Math.max(...Object.values(bullwhipMetrics).map(m => m.bullwhipRatio || 1));
    if (maxBullwhip > 2) {
      insights.push({
        type: 'warning',
        title: 'Strong Bullwhip Effect Detected',
        message: `Order variance amplified by ${maxBullwhip.toFixed(1)}x up the supply chain. This demonstrates how small demand changes cascade into larger fluctuations.`
      });
    } else if (maxBullwhip > 1.5) {
      insights.push({
        type: 'info',
        title: 'Moderate Bullwhip Effect',
        message: 'The supply chain showed typical variance amplification. Better information sharing could reduce this.'
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Controlled Variance',
        message: 'The supply chain maintained relatively stable order quantities, minimizing the Bullwhip Effect.'
      });
    }
    
    // Responsibility insight
    const highResponsibility = rankings.filter(r => r.responsibilityScore > 10);
    if (highResponsibility.length > 0) {
      insights.push({
        type: 'info',
        title: 'Upstream Impact',
        message: `${highResponsibility.map(r => r.roleName).join(', ')} had high responsibility scores, meaning their stockouts cascaded downstream.`
      });
    }
    
    // Cost distribution insight
    const avgStockoutRatio = rankings.reduce((sum, r) => {
      return sum + (r.stockoutCosts / (r.stockoutCosts + r.holdingCosts));
    }, 0) / rankings.length;
    
    if (avgStockoutRatio > 0.7) {
      insights.push({
        type: 'tip',
        title: 'High Stockout Costs',
        message: 'Most costs came from stockouts. Consider maintaining higher safety stock levels.'
      });
    } else if (avgStockoutRatio < 0.3) {
      insights.push({
        type: 'tip',
        title: 'High Holding Costs',
        message: 'Most costs came from excess inventory. Consider more aggressive inventory reduction.'
      });
    }
    
    return insights;
  }

  static exportResults(entities, rankings, bullwhipMetrics, playerName) {
    return {
      timestamp: new Date().toISOString(),
      playerName,
      summary: {
        totalRounds: 20,
        rankings: rankings.map(r => ({
          rank: r.rank,
          role: r.roleName,
          totalCosts: r.totalCosts,
          responsibilityScore: r.responsibilityScore
        }))
      },
      detailedMetrics: {
        costBreakdown: rankings.map(r => ({
          role: r.roleName,
          stockoutCosts: r.stockoutCosts,
          holdingCosts: r.holdingCosts,
          total: r.totalCosts
        })),
        bullwhipEffect: bullwhipMetrics,
        inventoryProfiles: Object.keys(entities).map(roleId => ({
          role: roleId,
          avgInventory: entities[roleId].inventoryHistory.reduce((a, b) => a + b, 0) / entities[roleId].inventoryHistory.length,
          maxInventory: Math.max(...entities[roleId].inventoryHistory),
          minInventory: Math.min(...entities[roleId].inventoryHistory)
        }))
      }
    };
  }
}

export default ScoreCalculator;
