/**
 * Strategy Engine Service
 * Orchestrates multiple strategies and generates aggregated signals
 */

import pino from 'pino';
import { Strategy } from '../core/Strategy.js';
import { MarketData, Signal, StrategyConfig } from '../types/index.js';
import { MACrossoverStrategy } from '../strategies/examples/MACrossoverStrategy.js';
import { RSIOversoldStrategy } from '../strategies/examples/RSIOversoldStrategy.js';

export class StrategyEngine {
  private logger: pino.Logger;
  private strategies: Map<string, Strategy>;

  constructor() {
    this.logger = pino({ name: 'strategy-engine' });
    this.strategies = new Map();
  }

  /**
   * Register a strategy
   */
  registerStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.getName(), strategy);
    this.logger.info(`Registered strategy: ${strategy.getName()}`);
  }

  /**
   * Initialize all registered strategies
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing strategies...');
    const promises = Array.from(this.strategies.values()).map((s) => s.initialize());
    await Promise.all(promises);
    this.logger.info(`Initialized ${this.strategies.size} strategies`);
  }

  /**
   * Analyze market data with all enabled strategies
   */
  async analyze(data: MarketData): Promise<Map<string, Signal>> {
    const signals = new Map<string, Signal>();

    for (const [name, strategy] of this.strategies.entries()) {
      if (!strategy.isEnabled()) {
        continue;
      }

      try {
        const signal = await strategy.analyze(data);
        signals.set(name, signal);
      } catch (error) {
        this.logger.error(`Error in strategy ${name}: ${error}`);
      }
    }

    return signals;
  }

  /**
   * Aggregate signals from multiple strategies using weighted conviction scoring
   */
  aggregateSignals(signals: Map<string, Signal>, threshold: number = 0.5): Signal {
    let totalBuyConviction = 0;
    let totalSellConviction = 0;
    let totalWeight = 0;

    for (const [name, signal] of signals.entries()) {
      const strategy = this.strategies.get(name);
      if (!strategy) continue;

      const weight = strategy.getWeight();
      totalWeight += weight;

      if (signal.direction === 'BUY') {
        totalBuyConviction += signal.conviction * weight;
      } else if (signal.direction === 'SELL') {
        totalSellConviction += signal.conviction * weight;
      }
    }

    // Normalize by total weight
    if (totalWeight === 0) {
      return {
        direction: 'HOLD',
        conviction: 0,
        metadata: { reason: 'No active strategies' },
      };
    }

    const avgBuyConviction = totalBuyConviction / totalWeight;
    const avgSellConviction = totalSellConviction / totalWeight;

    // Determine final signal using configurable threshold
    if (avgBuyConviction > avgSellConviction && avgBuyConviction > threshold) {
      return {
        direction: 'BUY',
        conviction: avgBuyConviction,
        metadata: {
          buyConviction: avgBuyConviction,
          sellConviction: avgSellConviction,
          strategiesCount: signals.size,
        },
      };
    } else if (avgSellConviction > avgBuyConviction && avgSellConviction > threshold) {
      return {
        direction: 'SELL',
        conviction: avgSellConviction,
        metadata: {
          buyConviction: avgBuyConviction,
          sellConviction: avgSellConviction,
          strategiesCount: signals.size,
        },
      };
    } else {
      return {
        direction: 'HOLD',
        conviction: Math.abs(avgBuyConviction - avgSellConviction),
        metadata: {
          buyConviction: avgBuyConviction,
          sellConviction: avgSellConviction,
          strategiesCount: signals.size,
        },
      };
    }
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Cleanup all strategies
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up strategies...');
    const promises = Array.from(this.strategies.values()).map((s) => s.cleanup());
    await Promise.all(promises);
    this.strategies.clear();
  }
}

/**
 * Create and configure default strategies
 */
export function createDefaultStrategies(enabledStrategies: string[]): Strategy[] {
  const strategies: Strategy[] = [];

  if (enabledStrategies.includes('ma-crossover')) {
    const config: StrategyConfig = {
      name: 'ma-crossover',
      enabled: true,
      symbols: ['BTC/USDT', 'ETH/USDT'],
      timeframes: ['1h', '4h'],
      weight: 1.0,
      parameters: {
        fastPeriod: 20,
        slowPeriod: 50,
      },
    };
    strategies.push(new MACrossoverStrategy(config));
  }

  if (enabledStrategies.includes('rsi-oversold')) {
    const config: StrategyConfig = {
      name: 'rsi-oversold',
      enabled: true,
      symbols: ['BTC/USDT', 'ETH/USDT'],
      timeframes: ['1h', '4h'],
      weight: 1.0,
      parameters: {
        period: 14,
        oversoldLevel: 30,
        overboughtLevel: 70,
      },
    };
    strategies.push(new RSIOversoldStrategy(config));
  }

  return strategies;
}
