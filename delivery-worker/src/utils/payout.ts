import type { BonusRule, Tier } from 'src/schemas/tier.schema';
import type { PayoutLineItem } from 'src/schemas/rider-payment.schema';

export interface PayoutComputation {
  basePayoutGhs: number;
  bonusBreakdown: PayoutLineItem[];
  totalPayoutGhs: number;
}

/**
 * Compute the rider's payout for the order they're about to accept. The
 * rule's "Nth order" is interpreted against the rider's todays-delivered
 * count, treating the order being offered as `count + 1`. Result is locked
 * onto the notification at issue time so the rider can decide with the
 * payout in hand, and it's later stamped onto the performance record.
 */
export function computePayout(
  tier: Pick<Tier, 'basePayoutGhs' | 'bonusRules'>,
  todayDeliveredCount: number,
): PayoutComputation {
  const upcomingOrderNumber = todayDeliveredCount + 1;
  const base = tier.basePayoutGhs ?? 0;
  const breakdown: PayoutLineItem[] = [];

  for (const rule of tier.bonusRules ?? []) {
    const matches =
      rule.trigger === 'on_nth'
        ? upcomingOrderNumber === rule.threshold
        : rule.trigger === 'every_after_nth'
          ? upcomingOrderNumber > rule.threshold
          : false;
    if (!matches) continue;

    const amount =
      rule.mode === 'percent' ? base * (rule.amount / 100) : rule.amount;
    breakdown.push({
      description: rule.description ?? defaultRuleDescription(rule),
      amount: round2(amount),
    });
  }

  const totalPayoutGhs = round2(
    base + breakdown.reduce((sum, b) => sum + b.amount, 0),
  );
  return { basePayoutGhs: round2(base), bonusBreakdown: breakdown, totalPayoutGhs };
}

function defaultRuleDescription(rule: BonusRule): string {
  const value =
    rule.mode === 'percent' ? `+${rule.amount}%` : `+GHS ${rule.amount}`;
  return rule.trigger === 'on_nth'
    ? `${value} on order #${rule.threshold}`
    : `${value} for every order after #${rule.threshold}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
