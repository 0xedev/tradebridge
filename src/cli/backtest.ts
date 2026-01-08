#!/usr/bin/env node
/**
 * Backtest CLI
 * Run backtests on historical data
 */

import { BacktestEngine, BacktestConfig } from '../services/BacktestEngine.js';
import { MACrossoverStrategy } from '../strategies/examples/MACrossoverStrategy.js';
import { RiskManagementService } from '../services/RiskManagementService.js';
import { DemoDataGenerator } from '../utils/DemoDataGenerator.js';
import { StrategyConfig } from '../types/index.js';
import pino from 'pino';

const logger = pino({
  name: 'backtest-cli',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

async function runBacktest() {
  logger.info('Starting backtest...');

  // Generate historical data (in production, load from database)
  const generator = new DemoDataGenerator(50000, 0.02, 0.0002);
  const candles = generator.generateCandles(1000, '1h');

  // Create strategy
  const strategyConfig: StrategyConfig = {
    name: 'ma-crossover',
    enabled: true,
    symbols: ['BTC/USDT'],
    timeframes: ['1h'],
    weight: 1.0,
    parameters: {
      fastPeriod: 10,
      slowPeriod: 30,
      convictionNormalizer: 0.02,
    },
  };

  const strategy = new MACrossoverStrategy(strategyConfig);

  // Create risk management service
  const riskService = new RiskManagementService({
    maxDailyLossPercent: 5,
    maxDrawdownPercent: 20,
    positionSizePercent: 2,
    maxPositionSize: 1000,
    maxConsecutiveLosses: 3,
    stopLossType: 'ATR',
    stopLossValue: 2,
    fallbackStopLossPercent: 2,
  });

  // Create backtest configuration
  const config: BacktestConfig = {
    initialCapital: 10000,
    commission: 0.1, // 0.1% per trade
    slippage: 0.05, // 0.05% slippage
    minConviction: 0.4, // Lower threshold for entry
  };

  // Run backtest
  const engine = new BacktestEngine(strategy, config, riskService);
  const result = await engine.runBacktest('BTC/USDT', '1h', candles);

  // Print results
  logger.info('\n=== BACKTEST RESULTS ===\n');
  logger.info(`Initial Capital: $${config.initialCapital.toFixed(2)}`);
  logger.info(`Final Equity: $${(config.initialCapital + result.totalReturn).toFixed(2)}`);
  logger.info(`Total Return: $${result.totalReturn.toFixed(2)} (${result.totalReturnPercent.toFixed(2)}%)`);
  logger.info(`Sharpe Ratio: ${result.sharpeRatio.toFixed(2)}`);
  logger.info(`Max Drawdown: ${result.maxDrawdown.toFixed(2)}%`);
  logger.info(`\nTrades: ${result.totalTrades}`);
  logger.info(`Win Rate: ${result.winRate.toFixed(2)}%`);
  logger.info(`Profit Factor: ${result.profitFactor.toFixed(2)}`);
  logger.info(`\nWinning Trades: ${result.winningTrades}`);
  logger.info(`Losing Trades: ${result.losingTrades}`);
  logger.info(`Average Win: $${result.averageWin.toFixed(2)}`);
  logger.info(`Average Loss: $${result.averageLoss.toFixed(2)}`);
  logger.info(`Largest Win: $${result.largestWin.toFixed(2)}`);
  logger.info(`Largest Loss: $${result.largestLoss.toFixed(2)}`);

  // Print sample trades
  logger.info('\n=== SAMPLE TRADES (First 5) ===\n');
  result.trades.slice(0, 5).forEach((trade, idx) => {
    logger.info(`Trade ${idx + 1}:`);
    logger.info(`  ${trade.side} ${trade.quantity.toFixed(8)} @ ${trade.entryPrice.toFixed(2)}`);
    logger.info(`  Exit: ${trade.exitPrice.toFixed(2)}`);
    logger.info(`  P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
    logger.info(`  Duration: ${((trade.exitTime - trade.entryTime) / 3600000).toFixed(1)}h`);
  });

  logger.info('\nBacktest complete!');
}

// Run the backtest
runBacktest().catch((error) => {
  logger.error(`Backtest failed: ${error}`);
  process.exit(1);
});
