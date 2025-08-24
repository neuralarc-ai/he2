import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { knowledgeBaseKeys } from './keys';
import { KnowledgeBaseEntry, KnowledgeBaseListResponse, CreateKnowledgeBaseEntryRequest } from './types';
import { toast } from 'sonner';

// Hook for fetching thread knowledge base
export function useThreadKnowledgeBase(threadId: string, includeInactive: boolean = false) {
  return useQuery({
    queryKey: knowledgeBaseKeys.thread(threadId),
    queryFn: async () => {
      const response = await apiClient.get(`/knowledge-base/threads/${threadId}?include_inactive=${includeInactive}`);
      return response.data as KnowledgeBaseListResponse;
    },
    enabled: !!threadId,
  });
}

// Hook for creating thread knowledge base entries
export function useCreateThreadKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, entryData }: { threadId: string; entryData: CreateKnowledgeBaseEntryRequest }) => {
      const response = await apiClient.post(`/knowledge-base/threads/${threadId}`, entryData);
      return response.data as KnowledgeBaseEntry;
    },
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.thread(threadId) });
      toast.success('Thread knowledge base entry created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create thread knowledge base entry');
    },
  });
}

// Hook for updating thread knowledge base entries
export function useUpdateThreadKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ entryId, entryData }: { entryId: string; entryData: Partial<CreateKnowledgeBaseEntryRequest> }) => {
      const response = await apiClient.put(`/knowledge-base/${entryId}`, entryData);
      return response.data as KnowledgeBaseEntry;
    },
    onSuccess: (updatedEntry) => {
      // Invalidate both global and thread queries since entries can be moved between them
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      if (updatedEntry.thread_id) {
        queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.thread(updatedEntry.thread_id) });
      }
      toast.success('Knowledge base entry updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update knowledge base entry');
    },
  });
}

// Hook for deleting thread knowledge base entries
export function useDeleteThreadKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiClient.delete(`/knowledge-base/${entryId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all knowledge base queries since we don't know which one was deleted
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Knowledge base entry deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete knowledge base entry');
    },
  });
}

// Hook for getting all threads with knowledge bases
export function useThreadsWithKnowledgeBases() {
  return useQuery({
    queryKey: [...knowledgeBaseKeys.all, 'threads-overview'],
    queryFn: async () => {
      // This would need a new endpoint to get threads with knowledge base counts
      const response = await apiClient.get('/knowledge-base/threads-overview');
      return response.data;
    },
  });
}
