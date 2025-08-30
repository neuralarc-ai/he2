'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PricingSection } from '@/components/home/sections/pricing-section';
import { CreditBalanceDisplay, CreditPurchaseModal } from '@/components/billing/credit-purchase';
import { isLocalMode } from '@/lib/config';
import {
    getSubscription,
    createPortalSession,
    SubscriptionStatus,
} from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Zap } from 'lucide-react';

interface BillingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    returnUrl?: string;
    showUsageLimitAlert?: boolean;
}

export function BillingModal({ open, onOpenChange, returnUrl = typeof window !== 'undefined' ? window?.location?.href || '/' : '/', showUsageLimitAlert = false }: BillingModalProps) {
    const { session, isLoading: authLoading } = useAuth();
    const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManaging, setIsManaging] = useState(false);
    const [showCreditPurchaseModal, setShowCreditPurchaseModal] = useState(false);

    useEffect(() => {
        async function fetchSubscription() {
            if (!open || authLoading || !session) return;

            try {
                setIsLoading(true);
                const data = await getSubscription();
                setSubscriptionData(data);
                setError(null);
            } catch (err) {
                console.error('Failed to get subscription:', err);
                setError(err instanceof Error ? err.message : 'Failed to load subscription data');
            } finally {
                setIsLoading(false);
            }
        }

        fetchSubscription();
    }, [open, session, authLoading]);

    const handleManageSubscription = async () => {
        try {
            setIsManaging(true);
            const { url } = await createPortalSession({ return_url: returnUrl });
            window.location.href = url;
        } catch (err) {
            console.error('Failed to create portal session:', err);
            setError(err instanceof Error ? err.message : 'Failed to create portal session');
        } finally {
            setIsManaging(false);
        }
    };

    // Local mode content
    if (isLocalMode()) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Billing & Subscription</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                            Running in local development mode - billing features are disabled
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            All premium features are available in this environment
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Upgrade Your Plan</DialogTitle>
                </DialogHeader>

                {isLoading || authLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : error ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                        <p className="text-sm text-destructive">Error loading billing status: {error}</p>
                    </div>
                ) : (
                    <>
                        {/* Usage Limit Alert */}
                        {showUsageLimitAlert && (
                            <div className="mb-6">
                                <div className="flex items-start p-3 sm:p-4 bg-destructive/5 border border-destructive/50 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                                        </div>
                                        <div className="text-xs sm:text-sm min-w-0">
                                            <p className="font-medium text-destructive">Usage Limit Reached</p>
                                            <p className="text-destructive break-words">
                                                Your current plan has been exhausted for this billing period.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {subscriptionData && (
                            <div className="mb-6">
                                <div className="rounded-lg border bg-background p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-foreground/90">
                                            Agent Usage This Month
                                        </span>
                                        <span className="text-sm font-medium">
                                            {Math.round((subscriptionData.current_usage || 0) * 100)} credits /{' '}
                                            {Math.round((subscriptionData.cost_limit || 0) * 100)} credits
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Credit Balance Display - Only show for users who can purchase credits */}
                        {subscriptionData?.can_purchase_credits && (
                            <div className="mb-6">
                                <CreditBalanceDisplay 
                                    balance={subscriptionData.credit_balance || 0}
                                    canPurchase={subscriptionData.can_purchase_credits}
                                    onPurchaseClick={() => setShowCreditPurchaseModal(true)}
                                />
                            </div>
                        )}

                        <PricingSection returnUrl={returnUrl} showTitleAndTabs={false} />

                        {subscriptionData && (
                            <Button
                                onClick={handleManageSubscription}
                                disabled={isManaging}
                                className="max-w-xs mx-auto w-full bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all mt-4"
                            >
                                {isManaging ? 'Loading...' : 'Manage Subscription'}
                            </Button>
                        )}
                    </>
                )}
            </DialogContent>
            
            {/* Credit Purchase Modal */}
            <CreditPurchaseModal
                open={showCreditPurchaseModal}
                onOpenChange={setShowCreditPurchaseModal}
                currentBalance={subscriptionData?.credit_balance_credits || Math.round((subscriptionData?.credit_balance || 0) * 100)}
                canPurchase={subscriptionData?.can_purchase_credits || false}
                onPurchaseComplete={() => {
                    // Refresh subscription data
                    getSubscription().then(setSubscriptionData);
                    setShowCreditPurchaseModal(false);
                }}
            />
        </Dialog>
    );
} 