/**
 * Base Strategy Interface
 * All trading strategies must implement this interface
 */

import { MarketData, Signal, StrategyConfig } from '../types/index.js';
import pino from 'pino';

export abstract class Strategy {
  protected logger: pino.Logger;
  public config: StrategyConfig;

  constructor(config: StrategyConfig) {
    this.config = config;
    this.logger = pino({
      name: `strategy:${config.name}`,
      level: process.env.LOG_LEVEL || 'info',
    });
  }

  /**
   * Analyze market data and generate trading signal
   */
  abstract analyze(data: MarketData): Promise<Signal>;

  /**
   * Initialize strategy (load models, warm up indicators, etc.)
   */
  async initialize(): Promise<void> {
    this.logger.info(`Initializing strategy: ${this.config.name}`);
  }

  /**
   * Cleanup strategy resources
   */
  async cleanup(): Promise<void> {
    this.logger.info(`Cleaning up strategy: ${this.config.name}`);
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Check if strategy is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get strategy weight for conviction scoring
   */
  getWeight(): number {
    return this.config.weight;
  }
}
