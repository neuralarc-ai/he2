import React from 'react';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  User,
  Link2,
  Link2Off,
  Calendar,
  Clock,
  Wrench,
  Crown
} from 'lucide-react';
import { ToolViewProps } from '../types';
import { formatTimestamp, getToolTitle } from '../utils';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from '../shared/LoadingState';
import { Separator } from "@/components/ui/separator";
import { extractGetCredentialProfilesData } from './_utils';

export function GetCredentialProfilesToolView({
  name = 'get-credential-profiles',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
}: ToolViewProps) {

  const {
    toolkit_slug,
    message,
    profiles,
    total_count,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp
  } = extractGetCredentialProfilesData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  const toolTitle = getToolTitle(name);

  const getConnectionStatus = (isConnected: boolean) => {
    return {
      icon: isConnected ? Link2 : Link2Off,
      color: isConnected 
        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
        : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      text: isConnected ? 'Connected' : 'Not Connected'
    };
  };



  return (
    <Card className="gap-0 flex border shadow-none p-0 rounded-lg flex-col h-full overflow-hidden bg-card">
      <CardHeader className="h-9 bg-gradient-to-t from-zinc-50/80 to-zinc-200/70 dark:from-zinc-900/90 dark:to-zinc-800/90 text-center backdrop-blur-lg border-b p-2 px-4 space-y-2 rounded-t-lg">
        <div className="flex flex-row items-center justify-between">
          <div className="flex w-full justify-center items-center gap-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {toolTitle}
              </CardTitle>
              {toolkit_slug && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Toolkit: {toolkit_slug}
                </p>
              )}
            </div>
          </div>

          {!isStreaming && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-medium",
                actualIsSuccess
                  ? "bg-gradient-to-b from-emerald-200 to-emerald-100 text-emerald-700 dark:from-emerald-800/50 dark:to-emerald-900/60 dark:text-emerald-300"
                  : "bg-gradient-to-b from-rose-200 to-rose-100 text-rose-700 dark:from-rose-800/50 dark:to-emerald-900/60 dark:text-rose-300"
              )}
            >
              {actualIsSuccess ? (
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              )}
              {total_count} {total_count === 1 ? 'profile' : 'profiles'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full flex-1 overflow-hidden relative">
        {isStreaming ? (
          <LoadingState
            icon={Users}
            iconColor="text-blue-500 dark:text-blue-400"
            bgColor="bg-gradient-to-b from-blue-100 to-blue-50 shadow-inner dark:from-blue-800/40 dark:to-blue-900/60 dark:shadow-blue-950/20"
            title="Loading credential profiles"
            filePath={toolkit_slug ? `"${toolkit_slug}"` : undefined}
            showProgress={true}
          />
        ) : profiles.length > 0 ? (
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                {profiles.map((profile, index) => (
                  <div
                    key={index}
                    className="border rounded-xl p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 flex items-center justify-center relative">
                          <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          {profile.is_default && (
                            <div className="absolute -top-1 -right-1">
                              <div className="bg-yellow-500 rounded-full p-1">
                                <Crown className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {profile.display_name}
                            </h3>
                            {profile.is_default && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs border border-yellow-300 dark:border-yellow-800 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                              >
                                <Crown className="w-2.5 h-2.5" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {profile.toolkit_name}
                          </p>
                          {profile.profile_name !== profile.display_name && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                              {profile.profile_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(() => {
                          const connectionStatus = getConnectionStatus(profile.is_connected);
                          const ConnectionIcon = connectionStatus.icon;
                          
                          return (
                            <>
                              <Badge
                                variant="outline"
                                className={cn("text-xs font-medium", connectionStatus.color)}
                              >
                                <ConnectionIcon className="w-3 h-3" />
                                {connectionStatus.text}
                              </Badge>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8 px-6">
            <div className="text-center w-full max-w-xs">
              <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <Users className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                No profiles found
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {toolkit_slug ? `No credential profiles found for "${toolkit_slug}"` : 'No credential profiles available'}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Footer */}
      <div className="px-4 py-2 h-fit bg-white dark:bg-zinc-900 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4 rounded-b-lg">
        <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Badge className="h-6 py-0.5" variant="outline">
            <Users className="h-3 w-3 mr-1" />
            Credential Profiles
          </Badge>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {actualToolTimestamp
            ? formatTimestamp(actualToolTimestamp)
            : actualAssistantTimestamp
              ? formatTimestamp(actualAssistantTimestamp)
              : ''}
        </div>
      </div>
    </Card>
  );
} 