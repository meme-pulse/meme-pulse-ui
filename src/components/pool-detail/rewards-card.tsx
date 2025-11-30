import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function RewardsCard() {
  const rewardData = {
    token: 'MOE',
    rewardsPerDay: '4.113 MOE',
    rewardRange: '+/- 0% (1 bin)',
    currentRange: '0.5808 - 0.5808 USDT per MNT',
    rangeTVL: '$10,342',
    rewardsAPR: '309.65%',
    timeRemaining: 'N/A',
  };

  const claimableRewards = {
    balance: '$0.0243',
    tokenAmount: '1.13819',
    tokenSymbol: 'MOE',
    usdValue: '$0.0243',
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-card rounded-2xl shadow-lg space-y-6">
      {/* Rewards Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-foreground">Rewards</h2>
        <p className="text-muted-foreground text-sm mb-6">Earn rewards for providing liquidity within specified price range.</p>

        {/* Rewards Information */}
        <Card className="bg-muted border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Token:</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">M</span>
                </div>
                <span className="font-medium text-foreground">{rewardData.token}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Rewards per day:</span>
              <span className="font-medium text-foreground">{rewardData.rewardsPerDay}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Reward range:</span>
              <span className="font-medium text-foreground">{rewardData.rewardRange}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Current range:</span>
              <span className="font-medium text-foreground">{rewardData.currentRange}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Range TVL:</span>
              <span className="font-medium text-foreground">{rewardData.rangeTVL}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Rewards APR:</span>
              <span className="font-medium text-accent-primary">{rewardData.rewardsAPR}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Time remaining:</span>
              <span className="font-medium text-foreground">{rewardData.timeRemaining}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claimable Rewards Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">Claimable Rewards</h3>
          <span className="text-sm text-muted-foreground">Balance: {claimableRewards.balance}</span>
        </div>

        {/* Claimable Token Display */}
        <Card className="bg-muted border-border mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">M</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  {claimableRewards.tokenAmount} {claimableRewards.tokenSymbol}
                </div>
                <div className="text-sm text-muted-foreground">{claimableRewards.usdValue}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claim Button */}
        <Button className="w-full h-12 text-lg bg-primary hover:bg-primary text-primary-foreground">Claim Rewards</Button>
      </div>
    </div>
  );
}
