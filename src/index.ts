/**
 * TradeBridge - Main Application Entry Point
 * Enterprise-Grade AI-Powered Multi-Asset Trading Platform
 */

import pino from 'pino';
import { tradingConfig, serverConfig } from './config/index.js';
import { DataIngestionService } from './services/DataIngestionService.js';
import { StrategyEngine, createDefaultStrategies } from './services/StrategyEngine.js';
import { RiskManagementService } from './services/RiskManagementService.js';
import { MarketData } from './types/index.js';

// Initialize logger
const logger = pino({
  name: 'tradebridge',
  level: serverConfig.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

/**
 * Main TradeBridge Application
 */
class TradeBridge {
  private dataService: DataIngestionService;
  private strategyEngine: StrategyEngine;
  private riskService: RiskManagementService;
  private isRunning: boolean = false;

  constructor() {
    logger.info('Initializing TradeBridge...');

    // Initialize services
    this.dataService = new DataIngestionService('binance', true);
    this.strategyEngine = new StrategyEngine();
    this.riskService = new RiskManagementService(tradingConfig.risk);

    // Register strategies
    const strategies = createDefaultStrategies(tradingConfig.enabledStrategies);
    strategies.forEach((strategy) => this.strategyEngine.registerStrategy(strategy));
  }

  /**
   * Start the trading platform
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting TradeBridge...');
      logger.info(`Paper Trading: ${tradingConfig.paperTrading}`);
      logger.info(`Initial Capital: $${tradingConfig.initialCapital}`);
      logger.info(`Enabled Strategies: ${tradingConfig.enabledStrategies.join(', ')}`);

      // Initialize strategies
      await this.strategyEngine.initialize();

      // Subscribe to market data for configured symbols
      for (const symbol of tradingConfig.symbols) {
        for (const timeframe of tradingConfig.timeframes) {
          this.dataService.subscribeToMarketData(symbol, timeframe, async (candles) => {
            await this.processMarketData({
              symbol,
              exchange: 'binance',
              timeframe,
              candles,
              timestamp: Date.now(),
            });
          });
        }
      }

      this.isRunning = true;
      logger.info('TradeBridge is now running! 🚀');
      logger.info('Press Ctrl+C to stop');
    } catch (error) {
      logger.error(`Error starting TradeBridge: ${error}`);
      throw error;
    }
  }

  /**
   * Process incoming market data
   */
  private async processMarketData(data: MarketData): Promise<void> {
    try {
      // Analyze with all strategies
      const signals = await this.strategyEngine.analyze(data);

      if (signals.size === 0) {
        return;
      }

      // Aggregate signals
      const aggregatedSignal = this.strategyEngine.aggregateSignals(signals);

      // Log signals
      logger.info(`\n=== ${data.symbol} @ ${data.timeframe} ===`);
      for (const [name, signal] of signals.entries()) {
        logger.info(
          `  ${name}: ${signal.direction} (conviction: ${(signal.conviction * 100).toFixed(1)}%)`
        );
      }

      logger.info(
        `  AGGREGATED: ${aggregatedSignal.direction} (conviction: ${(aggregatedSignal.conviction * 100).toFixed(1)}%)`
      );

      // In paper trading mode, just log what would be done
      if (tradingConfig.paperTrading && aggregatedSignal.direction !== 'HOLD') {
        const mockAccount = {
          id: 'paper-account',
          name: 'Paper Trading Account',
          balance: tradingConfig.initialCapital,
          equity: tradingConfig.initialCapital,
          marginUsed: 0,
          marginAvailable: tradingConfig.initialCapital,
          positions: [],
          openOrders: [],
        };

        // Check risk limits
        const canTradeResult = this.riskService.canTrade(mockAccount);
        if (!canTradeResult.allowed) {
          logger.warn(`Trading not allowed: ${canTradeResult.reason}`);
          return;
        }

        // Calculate position size
        const currentPrice = data.candles[data.candles.length - 1].close;
        const positionSize = this.riskService.calculatePositionSize(
          mockAccount,
          aggregatedSignal,
          currentPrice
        );

        // Calculate stop loss
        const stopLoss = this.riskService.calculateStopLoss(
          currentPrice,
          aggregatedSignal.direction as 'BUY' | 'SELL'
        );

        logger.info(
          `  [PAPER TRADE] Would ${aggregatedSignal.direction} ${positionSize.toFixed(8)} ${data.symbol} @ ${currentPrice}`
        );
        logger.info(`  Stop Loss: ${stopLoss.toFixed(2)}`);
      }
    } catch (error) {
      logger.error(`Error processing market data: ${error}`);
    }
  }

  /**
   * Stop the trading platform
   */
  async stop(): Promise<void> {
    logger.info('Stopping TradeBridge...');
    this.isRunning = false;

    // Cleanup services
    this.dataService.cleanup();
    await this.strategyEngine.cleanup();

    logger.info('TradeBridge stopped');
  }

  /**
   * Check if platform is running
   */
  isAlive(): boolean {
    return this.isRunning;
  }
}

// Application entry point
async function main() {
  const app = new TradeBridge();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('\nReceived SIGINT, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('\nReceived SIGTERM, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  // Start the platform
  await app.start();

  // Keep the process running
  process.stdin.resume();
}

// Run the application
main().catch((error) => {
  logger.error(`Fatal error: ${error}`);
  process.exit(1);
});
