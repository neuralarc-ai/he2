'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { useUsageLogs } from '@/hooks/react-query/subscriptions/use-billing';
import { UsageLogEntry } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface DailyUsage {
  date: string;
  logs: UsageLogEntry[];
  totalTokens: number;
  totalCompletionTokens: number;
  totalPromptTokens: number;
  totalCost: number;
  requestCount: number;
  models: string[];
}

interface Props {
  accountId: string;
}

export default function UsageLogs({ accountId }: Props) {
  const [page, setPage] = useState(0);
  const [allLogs, setAllLogs] = useState<UsageLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  
  const ITEMS_PER_PAGE = 1000;

  // Use React Query hook for the current page
  const { data: currentPageData, isLoading, error, refetch } = useUsageLogs(page, ITEMS_PER_PAGE);

  // Update accumulated logs when new data arrives
  useEffect(() => {
    if (currentPageData) {
      if (page === 0) {
        // First page - replace all logs
        setAllLogs(currentPageData.logs || []);
      } else {
        // Subsequent pages - append to existing logs
        setAllLogs(prev => [...prev, ...(currentPageData.logs || [])]);
      }
      setHasMore(currentPageData.has_more || false);
    }
  }, [currentPageData, page]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTokenCount = (count: number) => {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    } else if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatCredits = (credits: number) => {
    return `${credits.toLocaleString()} credits`;
  };

  const formatRequestCount = (count: number) => {
    return `${count} request${count !== 1 ? 's' : ''}`;
  };

  const formatCost = (cost: number | string) => {
    if (typeof cost === 'string' || cost === 0) {
      return typeof cost === 'string' ? cost : '0 credits';
    }
    // Convert dollar cost to credits (assuming 1 credit = $0.01)
    const credits = Math.round(cost * 100);
    return `${credits.toLocaleString()} credits`;
  };

  const formatCreditAmount = (amount: number) => {
    if (amount === 0) return null;
    // Convert dollar amount to credits
    const credits = Math.round(amount * 100);
    return `${credits.toLocaleString()} credits`;
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleThreadClick = (threadId: string, projectId: string) => {
    // Navigate to the thread using the correct project_id
    const threadUrl = `/projects/${projectId}/thread/${threadId}`;
    window.open(threadUrl, '_blank');
  };

  // Group usage logs by date
  const groupLogsByDate = (logs: UsageLogEntry[]): DailyUsage[] => {
    const grouped: { [key: string]: DailyUsage } = {};

    logs.forEach((log) => {
      const date = new Date(log.created_at).toDateString();
      
      if (!grouped[date]) {
        grouped[date] = {
          date,
          logs: [],
          totalTokens: 0,
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
          totalCost: 0,
          requestCount: 0,
          models: [],
        };
      }

      grouped[date].logs.push(log);
      grouped[date].totalTokens += log.total_tokens;
      grouped[date].totalCompletionTokens += log.total_completion_tokens;
      grouped[date].totalPromptTokens += log.total_prompt_tokens;
      grouped[date].totalCost += log.total_credits / 100; // Convert credits back to dollars for display
      grouped[date].requestCount += log.request_count;

      if (!grouped[date].models.includes(log.primary_model)) {
        grouped[date].models.push(log.primary_model);
      }
    });

    return Object.values(grouped).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const totalCost = useMemo(
    () =>
      allLogs.reduce(
        (sum, log) => sum + (log.total_credits / 100), // Convert credits back to dollars
        0,
      ),
    [allLogs],
  );

  // Get subscription limit from the first page data
  const subscriptionLimit = currentPageData?.subscription_limit || 0;

  if (isLoading && page === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load usage logs: {error?.message || String(error)}
        </AlertDescription>
      </Alert>
    );
  }

  if (!allLogs.length) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Usage Data</AlertTitle>
        <AlertDescription>
          No usage logs found for this month.
        </AlertDescription>
      </Alert>
    );
  }

  const groupedLogs = groupLogsByDate(allLogs);

  // Show credit usage info if user has gone over limit
  if (subscriptionLimit > 0 && totalCost > subscriptionLimit) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Usage Limit Reached</AlertTitle>
          <AlertDescription>
            Monthly limit of {Math.round(subscriptionLimit * 100)} credits reached and credits are unavailable. Please upgrade your plan or wait until next month.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open('/settings/billing', '_blank')}>
            Upgrade Plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage Logs Accordion */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage Logs</CardTitle>
          <CardDescription>
            <div className='flex justify-between items-center'>
              Your token usage organized by day, sorted by most recent.{" "}
              <Button variant='outline' asChild className='text-sm ml-4'>
                <Link href="/model-pricing">
                  View Model Pricing <OpenInNewWindowIcon className='w-4 h-4' />
                </Link>
              </Button>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupedLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No usage logs found.</p>
            </div>
          ) : (
            <>
              <Accordion type="single" collapsible className="w-full">
                {groupedLogs.map((day) => (
                  <AccordionItem key={day.date} value={day.date}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex justify-between items-center w-full mr-4">
                        <div className="text-left">
                          <div className="font-semibold">
                            {formatDate(day.date)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {day.requestCount} request
                            {day.requestCount !== 1 ? 's' : ''} •{' '}
                            {day.models.join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">
                            {formatCost(day.totalCost)}
                          </div>
                          <div className="text-sm text-muted-foreground font-mono">
                            <div className="text-blue-600 font-semibold">
                              {day.totalCompletionTokens.toLocaleString()} completion
                            </div>
                            <div className="text-xs">
                              {day.totalTokens.toLocaleString()} total tokens
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md border mt-4">
                                            <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Time</TableHead>
                          <TableHead className="text-xs">Project</TableHead>
                          <TableHead className="text-xs">Requests</TableHead>
                          <TableHead className="text-xs">Total Tokens</TableHead>
                          <TableHead className="text-xs">Credits Used</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {day.logs.map((log, logIndex) => (
                          <TableRow key={`${day.date}-${logIndex}`}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {formatTime(log.created_at)}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="max-w-[200px] truncate" title={log.project_name || 'Unknown Project'}>
                                {log.project_name || 'Unknown Project'}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              {formatRequestCount(log.request_count || 1)}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              {formatTokenCount(log.total_tokens || 0)}
                            </TableCell>
                            <TableCell className="text-xs text-center font-medium">
                              {formatCredits(log.total_credits || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {hasMore && (
                <div className="flex justify-center pt-6">
                  <Button
                    onClick={loadMore}
                    disabled={isLoading}
                    variant="outline"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
