/**
 * Backtesting Engine
 * Event-driven backtesting for strategy validation
 */

import pino from 'pino';
import { Strategy } from '../core/Strategy.js';
import { Candle, MarketData, Signal, Position } from '../types/index.js';
import { RiskManagementService } from './RiskManagementService.js';

export interface BacktestConfig {
  initialCapital: number;
  commission: number; // Percentage fee per trade
  slippage: number; // Percentage slippage per trade
  startDate?: number;
  endDate?: number;
  minConviction?: number; // Minimum conviction to enter trade (default: 0.4)
}

export interface BacktestResult {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  largestWin: number;
  largestLoss: number;
  averageWin: number;
  averageLoss: number;
  trades: Trade[];
  equityCurve: EquityPoint[];
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;
}

export class BacktestEngine {
  private logger: pino.Logger;
  private config: BacktestConfig;
  private strategy: Strategy;
  private riskService: RiskManagementService;
  
  private cash: number;
  private equity: number;
  private position: Position | null = null;
  private trades: Trade[] = [];
  private equityCurve: EquityPoint[] = [];
  private peakEquity: number;

  constructor(
    strategy: Strategy,
    config: BacktestConfig,
    riskService: RiskManagementService
  ) {
    this.logger = pino({ name: 'backtest-engine' });
    this.config = config;
    this.strategy = strategy;
    this.riskService = riskService;
    this.cash = config.initialCapital;
    this.equity = config.initialCapital;
    this.peakEquity = config.initialCapital;
  }

  /**
   * Run backtest on historical data
   */
  async runBacktest(
    symbol: string,
    timeframe: string,
    candles: Candle[]
  ): Promise<BacktestResult> {
    this.logger.info(
      `Starting backtest for ${symbol} with ${candles.length} candles`
    );

    await this.strategy.initialize();

    // Process each candle
    for (let i = 50; i < candles.length; i++) {
      const marketData: MarketData = {
        symbol,
        exchange: 'backtest',
        timeframe: timeframe as any,
        candles: candles.slice(Math.max(0, i - 100), i + 1),
        timestamp: candles[i].timestamp,
      };

      const currentPrice = candles[i].close;

      // Update equity
      this.updateEquity(currentPrice);

      // Check if we have an open position
      if (this.position) {
        // Check stop loss or take profit
        if (this.shouldClosePosition(candles[i])) {
          this.closePosition(candles[i]);
        }
      } else {
        // No position, check for entry signal
        try {
          const signal = await this.strategy.analyze(marketData);

          const minConviction = this.config.minConviction || 0.4;
          if (signal.direction !== 'HOLD' && signal.conviction > minConviction) {
            this.openPosition(signal, candles[i]);
          }
        } catch (error) {
          this.logger.error(`Error analyzing market data: ${error}`);
        }
      }

      // Record equity point
      this.recordEquityPoint(candles[i].timestamp);
    }

    // Close any open position at the end
    if (this.position) {
      this.closePosition(candles[candles.length - 1]);
    }

    await this.strategy.cleanup();

    return this.calculateResults();
  }

  /**
   * Open a new position based on signal
   */
  private openPosition(signal: Signal, candle: Candle): void {
    const account = {
      id: 'backtest',
      name: 'Backtest Account',
      balance: this.cash,
      equity: this.equity,
      marginUsed: 0,
      marginAvailable: this.cash,
      positions: [],
      openOrders: [],
    };

    // Calculate position size
    const quantity = this.riskService.calculatePositionSize(
      account,
      signal,
      candle.close
    );

    // Apply slippage
    const slippagePercent = this.config.slippage / 100;
    const entryPrice =
      signal.direction === 'BUY'
        ? candle.close * (1 + slippagePercent)
        : candle.close * (1 - slippagePercent);

    const positionValue = quantity * entryPrice;
    const commission = positionValue * (this.config.commission / 100);

    // Check if we have enough cash
    if (positionValue + commission > this.cash) {
      this.logger.warn('Insufficient cash for position');
      return;
    }

    // Calculate stop loss
    const stopLoss = this.riskService.calculateStopLoss(
      entryPrice,
      signal.direction as 'BUY' | 'SELL'
    );

    this.position = {
      symbol: 'BACKTEST',
      side: signal.direction as 'BUY' | 'SELL',
      quantity,
      entryPrice,
      currentPrice: entryPrice,
      unrealizedPnL: 0,
      realizedPnL: 0,
      timestamp: candle.timestamp,
    };

    this.cash -= positionValue + commission;

    this.logger.info(
      `Opened ${signal.direction} position: ${quantity.toFixed(8)} @ ${entryPrice.toFixed(2)}, SL: ${stopLoss.toFixed(2)}`
    );
  }

  /**
   * Check if position should be closed
   */
  private shouldClosePosition(candle: Candle): boolean {
    if (!this.position) return false;

    // Simple stop loss check (implement more sophisticated logic as needed)
    const stopLossPercent = 0.02; // 2%
    
    if (this.position.side === 'BUY') {
      const stopLoss = this.position.entryPrice * (1 - stopLossPercent);
      if (candle.low <= stopLoss) {
        return true;
      }
    } else {
      const stopLoss = this.position.entryPrice * (1 + stopLossPercent);
      if (candle.high >= stopLoss) {
        return true;
      }
    }

    return false;
  }

  /**
   * Close the current position
   */
  private closePosition(candle: Candle): void {
    if (!this.position) return;

    // Apply slippage
    const slippagePercent = this.config.slippage / 100;
    const exitPrice =
      this.position.side === 'BUY'
        ? candle.close * (1 - slippagePercent)
        : candle.close * (1 + slippagePercent);

    const positionValue = this.position.quantity * exitPrice;
    const entryValue = this.position.quantity * this.position.entryPrice;
    const commission = positionValue * (this.config.commission / 100);

    // Calculate P&L (commission is paid on both entry and exit)
    let pnl: number;
    if (this.position.side === 'BUY') {
      pnl = positionValue - entryValue - commission * 2;
    } else {
      pnl = entryValue - positionValue - commission * 2;
    }

    const pnlPercent = (pnl / entryValue) * 100;

    // Add cash back
    this.cash += positionValue - commission;

    // Record trade
    const trade: Trade = {
      entryTime: this.position.timestamp,
      exitTime: candle.timestamp,
      symbol: this.position.symbol,
      side: this.position.side,
      entryPrice: this.position.entryPrice,
      exitPrice,
      quantity: this.position.quantity,
      pnl,
      pnlPercent,
      commission: commission * 2,
      slippage: Math.abs(exitPrice - candle.close),
    };

    this.trades.push(trade);
    this.riskService.recordTrade(pnl);

    this.logger.info(
      `Closed ${this.position.side} position: ${this.position.quantity.toFixed(8)} @ ${exitPrice.toFixed(2)}, P&L: ${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`
    );

    this.position = null;
  }

  /**
   * Update equity based on current price
   */
  private updateEquity(currentPrice: number): void {
    if (this.position) {
      const positionValue = this.position.quantity * currentPrice;
      const entryValue = this.position.quantity * this.position.entryPrice;
      
      let unrealizedPnL: number;
      if (this.position.side === 'BUY') {
        unrealizedPnL = positionValue - entryValue;
      } else {
        unrealizedPnL = entryValue - positionValue;
      }

      // Equity = cash + unrealized P&L (not cash + positionValue + unrealizedPnL)
      this.equity = this.cash + entryValue + unrealizedPnL;
      this.position.unrealizedPnL = unrealizedPnL;
      this.position.currentPrice = currentPrice;
    } else {
      this.equity = this.cash;
    }

    // Update peak equity
    if (this.equity > this.peakEquity) {
      this.peakEquity = this.equity;
    }
  }

  /**
   * Record equity point for equity curve
   */
  private recordEquityPoint(timestamp: number): void {
    const drawdown = ((this.peakEquity - this.equity) / this.peakEquity) * 100;

    this.equityCurve.push({
      timestamp,
      equity: this.equity,
      drawdown,
    });
  }

  /**
   * Calculate backtest results
   */
  private calculateResults(): BacktestResult {
    const totalReturn = this.equity - this.config.initialCapital;
    const totalReturnPercent = (totalReturn / this.config.initialCapital) * 100;

    const winningTrades = this.trades.filter((t) => t.pnl > 0);
    const losingTrades = this.trades.filter((t) => t.pnl < 0);

    const winRate =
      this.trades.length > 0
        ? (winningTrades.length / this.trades.length) * 100
        : 0;

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    const largestWin =
      winningTrades.length > 0
        ? Math.max(...winningTrades.map((t) => t.pnl))
        : 0;
    const largestLoss =
      losingTrades.length > 0
        ? Math.min(...losingTrades.map((t) => t.pnl))
        : 0;

    const averageWin =
      winningTrades.length > 0
        ? totalWins / winningTrades.length
        : 0;
    const averageLoss =
      losingTrades.length > 0
        ? totalLosses / losingTrades.length
        : 0;

    const maxDrawdown = Math.max(...this.equityCurve.map((p) => p.drawdown));

    // Calculate Sharpe Ratio (simplified)
    const returns = this.equityCurve.map((p, i) =>
      i > 0 ? (p.equity - this.equityCurve[i - 1].equity) / this.equityCurve[i - 1].equity : 0
    );
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      totalReturn,
      totalReturnPercent,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      largestWin,
      largestLoss,
      averageWin,
      averageLoss,
      trades: this.trades,
      equityCurve: this.equityCurve,
    };
  }
}
