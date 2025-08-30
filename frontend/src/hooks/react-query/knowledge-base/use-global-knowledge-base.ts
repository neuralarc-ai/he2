import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { knowledgeBaseKeys } from './keys';
import { KnowledgeBaseEntry, KnowledgeBaseListResponse, CreateKnowledgeBaseEntryRequest } from './types';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

const useAuthHeaders = () => {
  const getHeaders = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No access token available');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  };
  
  return { getHeaders };
};

// Hook for fetching global knowledge base
export function useGlobalKnowledgeBase(includeInactive: boolean = false) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: knowledgeBaseKeys.all,
    queryFn: async () => {
      try {
        const headers = await getHeaders();
        const url = `${API_URL}/knowledge-base/global?include_inactive=${includeInactive}`;
        
        const response = await fetch(url, { 
          headers 
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Failed to fetch global knowledge base');
        }
        
        const data = await response.json();
        
        // Check if response exists and has data
        if (!data) {
          console.warn('API response is empty or undefined');
          return {
            entries: [],
            total_count: 0,
            total_tokens: 0
          } as KnowledgeBaseListResponse;
        }
        
        // Ensure the response has the expected structure
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
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async (entryData: CreateKnowledgeBaseEntryRequest) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/global`, {
        method: 'POST',
        headers,
        body: JSON.stringify(entryData),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create knowledge base entry');
      }
      
      return await response.json() as KnowledgeBaseEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Knowledge base entry created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create knowledge base entry');
    },
  });
}

// Hook for updating global knowledge base entries
export function useUpdateGlobalKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ entryId, entryData }: { entryId: string; entryData: Partial<CreateKnowledgeBaseEntryRequest> }) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/${entryId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(entryData),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update knowledge base entry');
      }
      
      return await response.json() as KnowledgeBaseEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Knowledge base entry updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update knowledge base entry');
    },
  });
}

// Hook for deleting global knowledge base entries
export function useDeleteGlobalKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/${entryId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete knowledge base entry');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Knowledge base entry deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete knowledge base entry');
    },
  });
}

// Hook for querying knowledge base
export function useQueryKnowledgeBase() {
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ query, kbType, threadId, agentId }: { 
      query: string; 
      kbType: string; 
      threadId?: string; 
      agentId?: string; 
    }) => {
      const headers = await getHeaders();
      const formData = new FormData();
      formData.append('query', query);
      formData.append('kb_type', kbType);
      if (threadId) formData.append('thread_id', threadId);
      if (agentId) formData.append('agent_id', agentId);
      
      // Remove Content-Type header for FormData
      const { 'Content-Type': _, ...uploadHeaders } = headers;
      
      const response = await fetch(`${API_URL}/knowledge-base/query`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to query knowledge base');
      }
      
      return await response.json();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to query knowledge base');
    },
  });
}
