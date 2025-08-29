'use client';

import { useQuery } from '@tanstack/react-query';
import { billingApi, ThreadTokenUsage } from '@/lib/api-enhanced';

export function useThreadTokenUsage(threadId: string) {
  return useQuery({
    queryKey: ['thread-token-usage', threadId],
    queryFn: async (): Promise<ThreadTokenUsage | null> => {
      if (!threadId) return null;
      
      console.log('Fetching thread token usage for:', threadId);
      
      try {
        // First try the dedicated endpoint
        const result = await billingApi.getThreadTokenUsage(threadId);
        console.log('Thread token usage result:', result);
        
        // If we get a result with actual data (not just 0s), use it
        if (result && result.total_completion_tokens > 0) {
          return result;
        }
        
        // If the dedicated endpoint returns 0s (likely local mode), fall back to filtering usage logs
        console.log('Dedicated endpoint returned 0s, falling back to usage logs filtering');
        const allLogs = await billingApi.getUsageLogs(0, 1000);
        
        if (!allLogs?.logs) return null;
        
        // Filter logs for this specific thread
        const threadLogs = allLogs.logs.filter(log => log.thread_id === threadId);
        
        if (threadLogs.length === 0) return null;
        
        // Calculate totals
        const totalCompletionTokens = threadLogs.reduce((sum, log) => 
          sum + log.total_completion_tokens, 0
        );
        
        const totalPromptTokens = threadLogs.reduce((sum, log) => 
          sum + log.total_prompt_tokens, 0
        );
        
        const totalTokens = threadLogs.reduce((sum, log) => 
          sum + log.total_tokens, 0
        );
        
        const totalCost = threadLogs.reduce((sum, log) => 
          sum + (log.total_credits / 100), 0 // Convert credits back to dollars
        );
        
        const models = [...new Set(threadLogs.map(log => log.primary_model))];
        
        const fallbackResult = {
          total_completion_tokens: totalCompletionTokens,
          total_prompt_tokens: totalPromptTokens,
          total_tokens: totalTokens,
          estimated_cost: totalCost, // Assuming estimated_cost is now total_cost
          request_count: threadLogs.length,
          models,
        };
        
        console.log('Fallback result from usage logs:', fallbackResult);
        return fallbackResult;
        
      } catch (error) {
        console.error('Error fetching thread token usage:', error);
        return null;
      }
    },
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
