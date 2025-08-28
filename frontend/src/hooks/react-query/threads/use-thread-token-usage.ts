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
        // Use the working usage logs method directly
        const allLogs = await billingApi.getUsageLogs(0, 1000);
        
        if (!allLogs?.logs) return null;
        
        // Filter logs for this specific thread
        const threadLogs = allLogs.logs.filter(log => log.thread_id === threadId);
        
        if (threadLogs.length === 0) return null;
        
        // Calculate totals
        const totalCompletionTokens = threadLogs.reduce((sum, log) => 
          sum + log.content.usage.completion_tokens, 0
        );
        
        const totalPromptTokens = threadLogs.reduce((sum, log) => 
          sum + log.content.usage.prompt_tokens, 0
        );
        
        const totalTokens = threadLogs.reduce((sum, log) => 
          sum + log.total_tokens, 0
        );
        
        const estimatedCost = threadLogs.reduce((sum, log) => 
          sum + (typeof log.estimated_cost === 'number' ? log.estimated_cost : 0), 0
        );
        
        const models = [...new Set(threadLogs.map(log => log.content.model))];
        
        const result = {
          total_completion_tokens: totalCompletionTokens,
          total_prompt_tokens: totalPromptTokens,
          total_tokens: totalTokens,
          estimated_cost: estimatedCost,
          request_count: threadLogs.length,
          models,
        };
        
        console.log('Thread token usage result:', result);
        return result;
        
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
