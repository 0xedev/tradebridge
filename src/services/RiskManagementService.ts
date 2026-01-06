/**
 * Risk Management Service
 * Handles position sizing, stop-loss, and risk limits
 */

import pino from 'pino';
import { RiskConfig, Signal, Account } from '../types/index.js';

export class RiskManagementService {
  private logger: pino.Logger;
  private config: RiskConfig;
  private dailyLoss: number = 0;
  private consecutiveLosses: number = 0;
  private isPaused: boolean = false;

  constructor(config: RiskConfig) {
    this.logger = pino({ name: 'risk-management' });
    this.config = config;
  }

  /**
   * Check if trading is allowed based on risk limits
   */
  canTrade(account: Account): { allowed: boolean; reason?: string } {
    // Check if paused
    if (this.isPaused) {
      return { allowed: false, reason: 'Trading is paused due to risk limits' };
    }

    // Check daily loss limit
    const dailyLossPercent = (this.dailyLoss / account.balance) * 100;
    if (dailyLossPercent >= this.config.maxDailyLossPercent) {
      this.isPaused = true;
      return {
        allowed: false,
        reason: `Daily loss limit reached (${dailyLossPercent.toFixed(2)}%)`,
      };
    }

    // Check consecutive losses
    if (this.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.isPaused = true;
      return {
        allowed: false,
        reason: `Max consecutive losses reached (${this.consecutiveLosses})`,
      };
    }

    // Check drawdown
    const drawdown = ((account.balance - account.equity) / account.balance) * 100;
    if (drawdown >= this.config.maxDrawdownPercent) {
      this.isPaused = true;
      return {
        allowed: false,
        reason: `Max drawdown reached (${drawdown.toFixed(2)}%)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Calculate position size based on account balance and risk parameters
   */
  calculatePositionSize(
    account: Account,
    signal: Signal,
    currentPrice: number
  ): number {
    const { balance } = account;

    // Base position size as percentage of balance
    let positionValue = (balance * this.config.positionSizePercent) / 100;

    // Adjust by signal conviction
    positionValue *= signal.conviction;

    // Apply max position size limit
    positionValue = Math.min(positionValue, this.config.maxPositionSize);

    // Convert to quantity
    const quantity = positionValue / currentPrice;

    this.logger.info(
      `Calculated position size: ${quantity.toFixed(8)} (${positionValue.toFixed(2)} USD)`
    );

    return quantity;
  }

  /**
   * Calculate stop-loss price
   */
  calculateStopLoss(
    entryPrice: number,
    side: 'BUY' | 'SELL',
    atr?: number
  ): number {
    let stopLoss: number;

    switch (this.config.stopLossType) {
      case 'FIXED':
        // Fixed percentage stop loss
        const percent = this.config.stopLossValue / 100;
        stopLoss =
          side === 'BUY'
            ? entryPrice * (1 - percent)
            : entryPrice * (1 + percent);
        break;

      case 'ATR':
        // ATR-based stop loss
        if (!atr) {
          // Fallback to configured percentage if ATR not available
          const fallbackPercent = (this.config.fallbackStopLossPercent || 2) / 100;
          stopLoss =
            side === 'BUY'
              ? entryPrice * (1 - fallbackPercent)
              : entryPrice * (1 + fallbackPercent);
        } else {
          stopLoss =
            side === 'BUY'
              ? entryPrice - atr * this.config.stopLossValue
              : entryPrice + atr * this.config.stopLossValue;
        }
        break;

      case 'TRAILING':
        // Initial trailing stop
        const trailPercent = this.config.stopLossValue / 100;
        stopLoss =
          side === 'BUY'
            ? entryPrice * (1 - trailPercent)
            : entryPrice * (1 + trailPercent);
        break;

      default:
        stopLoss = side === 'BUY' ? entryPrice * 0.98 : entryPrice * 1.02;
    }

    return stopLoss;
  }

  /**
   * Record a trade result
   */
  recordTrade(pnl: number): void {
    this.dailyLoss += pnl < 0 ? Math.abs(pnl) : 0;

    if (pnl < 0) {
      this.consecutiveLosses++;
      this.logger.warn(`Consecutive losses: ${this.consecutiveLosses}`);
    } else {
      this.consecutiveLosses = 0;
    }

    this.logger.info(`Trade recorded: PnL = ${pnl.toFixed(2)}`);
  }

  /**
   * Reset daily counters (call at start of new trading day)
   */
  resetDaily(): void {
    this.dailyLoss = 0;
    this.logger.info('Daily risk counters reset');
  }

  /**
   * Resume trading (after manual review)
   */
  resume(): void {
    this.isPaused = false;
    this.consecutiveLosses = 0;
    this.logger.info('Trading resumed');
  }

  /**
   * Pause trading
   */
  pause(): void {
    this.isPaused = true;
    this.logger.warn('Trading paused');
  }

  /**
   * Get current risk status
   */
  getStatus(): {
    dailyLoss: number;
    consecutiveLosses: number;
    isPaused: boolean;
  } {
    return {
      dailyLoss: this.dailyLoss,
      consecutiveLosses: this.consecutiveLosses,
      isPaused: this.isPaused,
    };
  }
}
