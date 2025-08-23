import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pipedreamApi } from './utils';
import { pipedreamKeys } from './keys';
import type {
  PipedreamProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
} from '@/components/agents/pipedream/pipedream-types';
import { toast } from 'sonner';

export const usePipedreamProfiles = (params?: { app_slug?: string; is_active?: boolean }) => {
  return useQuery({
    queryKey: pipedreamKeys.profiles.list(params),
    queryFn: () => pipedreamApi.getProfiles(params),
    staleTime: 5 * 60 * 1000,
  });
};

// Hook to get a single profile
export const usePipedreamProfile = (profileId: string, enabled = true) => {
  return useQuery({
    queryKey: pipedreamKeys.profiles.detail(profileId),
    queryFn: () => pipedreamApi.getProfile(profileId),
    enabled: enabled && !!profileId,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook to get profile connections
export const usePipedreamProfileConnections = (profileId: string, enabled = true) => {
  return useQuery({
    queryKey: pipedreamKeys.profiles.connections(profileId),
    queryFn: () => pipedreamApi.getProfileConnections(profileId),
    enabled: enabled && !!profileId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Hook to create a profile
export const useCreatePipedreamProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateProfileRequest) => pipedreamApi.createProfile(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.all() });
      toast.success(`Profile "${data.profile_name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create profile');
    },
  });
};

// Hook to update a profile
export const useUpdatePipedreamProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, request }: { profileId: string; request: UpdateProfileRequest }) =>
      pipedreamApi.updateProfile(profileId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.all() });
      queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.detail(data.profile_id) });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
};

export const useDeletePipedreamProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => pipedreamApi.deleteProfile(profileId),
    onSuccess: (_, profileId) => {
      queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.all() });
      queryClient.removeQueries({ queryKey: pipedreamKeys.profiles.detail(profileId) });
      toast.success('Profile deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete profile');
    },
  });
};


export const useConnectPipedreamProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, app, profileName }: { profileId: string; app?: string; profileName?: string }) =>
      pipedreamApi.connectProfile(profileId, app),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.all() });
      queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.detail(data.profile_id) });
      queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.connections(data.profile_id) });
      if (data.link) {
        const connectWindow = window.open(data.link, '_blank', 'width=600,height=700');
        if (connectWindow) {
          const checkClosed = setInterval(() => {
            if (connectWindow.closed) {
              clearInterval(checkClosed);
              queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.all() });
              queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.detail(data.profile_id) });
              queryClient.invalidateQueries({ queryKey: pipedreamKeys.profiles.connections(data.profile_id) });
              
              // Enhanced success message with profile name and icon
              const profileName = variables.profileName || 'Profile';
              toast.success(`${profileName} successfully connected!`, {
                icon: '✅',
                duration: 4000,
              });
              
              // Trigger a custom event for components to listen to
              window.dispatchEvent(new CustomEvent('pipedream-connection-success', {
                detail: { profileId: data.profile_id, profileName }
              }));
            }
          }, 1000);
          setTimeout(() => {
            clearInterval(checkClosed);
          }, 5 * 60 * 1000);
        } else {
          toast.error('Failed to open connection window. Please check your popup blocker.');
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to connect profile');
    },
  });
}; 