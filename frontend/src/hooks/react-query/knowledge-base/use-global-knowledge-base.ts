import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { knowledgeBaseKeys } from './keys';
import { KnowledgeBaseEntry, KnowledgeBaseListResponse, CreateKnowledgeBaseEntryRequest } from './types';
import { toast } from 'sonner';

// Hook for fetching global knowledge base
export function useGlobalKnowledgeBase(includeInactive: boolean = false) {
  return useQuery({
    queryKey: knowledgeBaseKeys.all,
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/knowledge-base/global?include_inactive=${includeInactive}`);
        
        // Check if response exists and has data
        if (!response || !response.data) {
          console.warn('API response is empty or undefined');
          return {
            entries: [],
            total_count: 0,
            total_tokens: 0
          } as KnowledgeBaseListResponse;
        }
        
        // Ensure the response has the expected structure
        const data = response.data;
        if (!data.entries || !Array.isArray(data.entries)) {
          console.warn('API response missing entries array:', data);
          return {
            entries: [],
            total_count: data.total_count || 0,
            total_tokens: data.total_tokens || 0
          } as KnowledgeBaseListResponse;
        }
        
        return data as KnowledgeBaseListResponse;
      } catch (error) {
        console.error('Error fetching global knowledge base:', error);
        // Return empty data structure instead of throwing
        return {
          entries: [],
          total_count: 0,
          total_tokens: 0
        } as KnowledgeBaseListResponse;
      }
    },
    // Provide default data to prevent undefined
    initialData: {
      entries: [],
      total_count: 0,
      total_tokens: 0
    } as KnowledgeBaseListResponse,
    // Retry on failure
    retry: 2,
    // Don't refetch on window focus if there was an error
    refetchOnWindowFocus: false,
  });
}

// Hook for creating global knowledge base entries
export function useCreateGlobalKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryData: CreateKnowledgeBaseEntryRequest) => {
      const response = await apiClient.post('/knowledge-base/global', entryData);
      return response.data as KnowledgeBaseEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Knowledge base entry created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create knowledge base entry');
    },
  });
}

// Hook for updating global knowledge base entries
export function useUpdateGlobalKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ entryId, entryData }: { entryId: string; entryData: Partial<CreateKnowledgeBaseEntryRequest> }) => {
      const response = await apiClient.put(`/knowledge-base/${entryId}`, entryData);
      return response.data as KnowledgeBaseEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Knowledge base entry updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update knowledge base entry');
    },
  });
}

// Hook for deleting global knowledge base entries
export function useDeleteGlobalKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiClient.delete(`/knowledge-base/${entryId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Knowledge base entry deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete knowledge base entry');
    },
  });
}

// Hook for querying knowledge base
export function useQueryKnowledgeBase() {
  return useMutation({
    mutationFn: async ({ query, kbType, threadId, agentId }: { 
      query: string; 
      kbType: string; 
      threadId?: string; 
      agentId?: string; 
    }) => {
      const formData = new FormData();
      formData.append('query', query);
      formData.append('kb_type', kbType);
      if (threadId) formData.append('thread_id', threadId);
      if (agentId) formData.append('agent_id', agentId);
      
      const response = await apiClient.post('/knowledge-base/query', formData);
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to query knowledge base');
    },
  });
}
