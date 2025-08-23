import { useMutation, useQuery } from '@tanstack/react-query';
import { backendApi } from '@/lib/api-client';
import { pipedreamKeys } from './keys';

export interface MCPDiscoveryRequest {
  app_slug?: string;
  oauth_app_id?: string;
}

export interface MCPConnectionRequest {
  app_slug: string;
  oauth_app_id?: string;
}

export interface MCPServerInfo {
  app_slug: string;
  app_name: string;
  external_user_id: string;
  oauth_app_id?: string;
  server_url: string;
  project_id: string;
  environment: string;
  available_tools: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
  status: 'connected' | 'error';
  error?: string;
}

export interface MCPDiscoveryResponse {
  success: boolean;
  mcp_servers: MCPServerInfo[];
  count: number;
  error?: string;
}

export interface MCPConnectionResponse {
  success: boolean;
  mcp_config?: MCPServerInfo;
  error?: string;
}

export const usePipedreamMCPDiscovery = (
  options: MCPDiscoveryRequest = {},
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: pipedreamKeys.mcpDiscovery(options),
    queryFn: async (): Promise<MCPDiscoveryResponse> => {
      const response = await backendApi.post('/pipedream/mcp/discover', options);
      return response.data;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache time
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Only refetch if data is stale
    retry: 2, // Limit retries
  });
};

export const usePipedreamMCPConnection = () => {
  return useMutation({
    mutationFn: async (request: MCPConnectionRequest): Promise<MCPConnectionResponse> => {
      const response = await backendApi.post('/pipedream/mcp/connect', request);
      return response.data;
    },
  });
};

export const usePipedreamMCPDiscoveryForApp = (
  app_slug: string,
  oauth_app_id?: string,
  enabled: boolean = true
) => {
  return usePipedreamMCPDiscovery(
    { app_slug, oauth_app_id },
    enabled && !!app_slug
  );
};

export const usePipedreamMCPServers = (enabled: boolean = true) => {
  return usePipedreamMCPDiscovery({}, enabled);
};

export const usePipedreamCustomMCPDiscovery = () => {
  return useQuery({
    queryKey: pipedreamKeys.mcpDiscovery({ custom: true }),
    queryFn: async () => {
      const response = await backendApi.post('/pipedream/mcp/discover-custom');
      return response.data;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}; 