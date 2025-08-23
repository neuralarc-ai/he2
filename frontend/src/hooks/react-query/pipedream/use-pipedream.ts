'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createQueryHook } from '@/hooks/use-query';
import { backendApi } from '@/lib/api-client';
import { 
  pipedreamApi, 
  type CreateConnectionTokenRequest,
  type ConnectionTokenResponse,
  type ConnectionResponse,
  type PipedreamAppResponse,
  type PipedreamToolsResponse,
  type AppIconResponse,
  type PipedreamTool,
} from './utils';
import { pipedreamKeys } from './keys';

export const useCreateConnectionToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreateConnectionTokenRequest): Promise<ConnectionTokenResponse> => {
      return await pipedreamApi.createConnectionToken(request);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: pipedreamKeys.connections() });
      queryClient.setQueryData(pipedreamKeys.connectionToken(variables.app), data);
    },
    onError: (error) => {
      console.error('Failed to create connection token:', error);
    },
  });
};

export const useRefreshConnections = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ConnectionResponse> => {
      return await pipedreamApi.getConnections();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(pipedreamKeys.connections(), data);
    },
    onError: (error) => {
      console.error('Failed to refresh connections:', error);
    },
  });
};

export const useInvalidatePipedreamQueries = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: pipedreamKeys.all });
  };
}; 

export const usePipedreamApps = (after?: string, search?: string) => {
  return useQuery({
    queryKey: ['pipedream', 'apps', after, search],
    queryFn: async (): Promise<PipedreamAppResponse> => {
      const result = await pipedreamApi.getApps(after, search);
      console.log('🔍 Apps:', result);
      return result;
    },
    staleTime: 5 * 60 * 1000, 
    retry: 2,
  });
};

export const usePipedreamPopularApps = () => {
  return useQuery({
    queryKey: pipedreamKeys.popularApps(),
    queryFn: async (): Promise<PipedreamAppResponse> => {
      const result = await pipedreamApi.getPopularApps();
      console.log('🔍 Popular apps:', result);
      return result;
    },
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
};

export const usePipedreamAppIcon = (appSlug: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['pipedream', 'app-icon', appSlug],
    queryFn: async (): Promise<AppIconResponse> => {
      const result = await pipedreamApi.getAppIcon(appSlug);
      console.log(`🎨 Icon for ${appSlug}:`, result);
      return result;
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!appSlug,
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
};

export const usePipedreamAppTools = (appSlug: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: pipedreamKeys.appTools(appSlug),
    queryFn: async () => {
      return await pipedreamApi.getAppTools(appSlug);
    },
    enabled: options?.enabled !== false,
  });
};

export const usePipedreamToolkitIcon = (appSlug: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: pipedreamKeys.appIcon(appSlug),
    queryFn: async () => {
      try {
        const response = await pipedreamApi.getAppIcon(appSlug);
        return {
          data: response.success ? response.icon_url : null,
        };
      } catch (error) {
        console.warn(`Failed to load icon for ${appSlug}:`, error);
        // Return null to prevent UI errors
        return { data: null };
      }
    },
    enabled: options?.enabled !== false,
    retry: 1, // Only retry once on failure
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
};
