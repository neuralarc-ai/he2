'use client';

import React, { useState, Suspense, useEffect, useRef, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChatInput,
  ChatInputHandles,
} from '@/components/thread/chat-input/chat-input';
import {
  BillingError,
  AgentRunLimitError,
} from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBillingError } from '@/hooks/useBillingError';
import { BillingErrorAlert } from '@/components/billing/usage-limit-alert';
import { useAccounts } from '@/hooks/use-accounts';
import { config, isLocalMode, isStagingMode } from '@/lib/config';
import { useInitiateAgentWithInvalidation } from '@/hooks/react-query/dashboard/use-initiate-agent';

import { useAgents } from '@/hooks/react-query/agents/use-agents';
import { BillingModal } from '@/components/billing/billing-modal';
import { useAgentSelection } from '@/lib/stores/agent-selection-store';
import { useThreadQuery } from '@/hooks/react-query/threads/use-threads';
import { normalizeFilenameToNFC } from '@/lib/utils/unicode';
import { AgentRunLimitDialog } from '@/components/thread/agent-run-limit-dialog';
import { useFeatureFlag } from '@/lib/feature-flags';
import { CustomAgentsSection } from './custom-agents-section';
import { toast } from 'sonner';
import { ReleaseBadge } from '../auth/release-badge';

const PENDING_PROMPT_KEY = 'pendingAgentPrompt';

export function DashboardContent() {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const { 
    selectedAgentId, 
    setSelectedAgent, 
    initializeFromAgents,
    getCurrentAgent
  } = useAgentSelection();
  const [initiatedThreadId, setInitiatedThreadId] = useState<string | null>(null);
  const { billingError, handleBillingError, clearBillingError } =
    useBillingError();
  const [showAgentLimitDialog, setShowAgentLimitDialog] = useState(false);
  const [agentLimitData, setAgentLimitData] = useState<{
    runningCount: number;
    runningThreadIds: string[];
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { data: accounts } = useAccounts();
  const personalAccount = accounts?.find((account) => account.personal_account);
  const chatInputRef = useRef<ChatInputHandles>(null);
  const initiateAgentMutation = useInitiateAgentWithInvalidation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fixed welcome message - use useMemo to prevent regeneration on every render
  const welcomeMessages = [
    "What do we tackle first, {name}?",
    "Let's lock in - what's the focus, {name}?",
    "What's the game plan, {name}?",
    "Time to go higher, {name} — what's the move?",
    "Ready to lift off, {name}?",
    "Let's rise above the noise, {name}."
  ];
  
  const welcomeMessage = useMemo(() => {
    // Get cached message or generate new one
    const cachedMessage = localStorage.getItem('cached_welcome_message');
    if (cachedMessage) {
      return cachedMessage;
    }
    
    // Generate new random message and cache it
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    localStorage.setItem('cached_welcome_message', randomMessage);
    return randomMessage;
  }, []); // Empty dependency array - only runs once

  const [currentWelcomeMessage, setCurrentWelcomeMessage] = useState('');

  // Cache user's name to avoid repeated processing
  const cachedUserName = useMemo(() => {
    // Check localStorage first for cached name
    const cachedName = localStorage.getItem('cached_user_name');
    
    if (cachedName && personalAccount?.name === cachedName) {
      // Return cached capitalized name if it matches current user
      return localStorage.getItem('cached_capitalized_name') || 'there';
    }
    
    // Process and cache new name
    if (personalAccount?.name) {
      const firstName = personalAccount.name.split(' ')[0];
      const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      
      // Cache both original and capitalized names
      localStorage.setItem('cached_user_name', personalAccount.name);
      localStorage.setItem('cached_capitalized_name', capitalizedFirstName);
      
      return capitalizedFirstName;
    }
    
    return 'there';
  }, [personalAccount?.name]);

  // Set welcome message with cached user's name - only when dependencies change
  useEffect(() => {
    // Replace {name} placeholder with cached capitalized name
    const personalizedMessage = welcomeMessage.replace('{name}', cachedUserName);
    setCurrentWelcomeMessage(personalizedMessage);
  }, [welcomeMessage, cachedUserName]);

  // Feature flag for custom agents section
  const { enabled: customAgentsEnabled } = useFeatureFlag('custom_agents');

  // Fetch agents to get the selected agent's name
  const { data: agentsResponse } = useAgents({
    limit: 100,
    sort_by: 'name',
    sort_order: 'asc'
  });

  const agents = agentsResponse?.agents || [];
  const selectedAgent = selectedAgentId
    ? agents.find(agent => agent.agent_id === selectedAgentId)
    : null;
  const displayName = selectedAgent?.name || 'Suna';
  const agentAvatar = undefined;
  const isSunaAgent = selectedAgent?.metadata?.is_suna_default || false;

  const threadQuery = useThreadQuery(initiatedThreadId || '');

  const enabledEnvironment = isStagingMode() || isLocalMode();

  useEffect(() => {
    console.log('🚀 Dashboard effect:', { 
      agentsLength: agents.length, 
      selectedAgentId, 
      agents: agents.map(a => ({ id: a.agent_id, name: a.name, isDefault: a.metadata?.is_suna_default })) 
    });
    
    if (agents.length > 0) {
      console.log('📞 Calling initializeFromAgents');
      initializeFromAgents(agents, undefined, setSelectedAgent);
    }
  }, [agents, initializeFromAgents, setSelectedAgent]);

  useEffect(() => {
    const agentIdFromUrl = searchParams.get('agent_id');
    if (agentIdFromUrl && agentIdFromUrl !== selectedAgentId) {
      setSelectedAgent(agentIdFromUrl);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('agent_id');
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, selectedAgentId, router, setSelectedAgent]);

  useEffect(() => {
    if (threadQuery.data && initiatedThreadId) {
      const thread = threadQuery.data;
      if (thread.project_id) {
        router.push(`/projects/${thread.project_id}/thread/${initiatedThreadId}`);
      } else {
        router.push(`/agents/${initiatedThreadId}`);
      }
      setInitiatedThreadId(null);
    }
  }, [threadQuery.data, initiatedThreadId, router]);

  const handleSubmit = async (
    message: string,
    options?: {
      model_name?: string;
      enable_thinking?: boolean;
      reasoning_effort?: string;
      stream?: boolean;
      enable_context_manager?: boolean;
    },
  ) => {
    if (
      (!message.trim() && !chatInputRef.current?.getPendingFiles().length) ||
      isSubmitting
    )
      return;

    setIsSubmitting(true);

    try {
      const files = chatInputRef.current?.getPendingFiles() || [];
      localStorage.removeItem(PENDING_PROMPT_KEY);

      const formData = new FormData();
      formData.append('prompt', message);

      // Add selected agent if one is chosen
      if (selectedAgentId) {
        formData.append('agent_id', selectedAgentId);
      }

      files.forEach((file, index) => {
        const normalizedName = normalizeFilenameToNFC(file.name);
        formData.append('files', file, normalizedName);
      });

      if (options?.model_name) formData.append('model_name', options.model_name);
      formData.append('enable_thinking', String(options?.enable_thinking ?? false));
      formData.append('reasoning_effort', options?.reasoning_effort ?? 'low');
      formData.append('stream', String(options?.stream ?? true));
      formData.append('enable_context_manager', String(options?.enable_context_manager ?? false));

      const result = await initiateAgentMutation.mutateAsync(formData);

      if (result.thread_id) {
        setInitiatedThreadId(result.thread_id);
      } else {
        throw new Error('Agent initiation did not return a thread_id.');
      }
      chatInputRef.current?.clearPendingFiles();
    } catch (error: any) {
      console.error('Error during submission process:', error);
      if (error instanceof BillingError) {
        setShowPaymentModal(true);
      } else if (error instanceof AgentRunLimitError) {
        const { running_thread_ids, running_count } = error.detail;
        setAgentLimitData({
          runningCount: running_count,
          runningThreadIds: running_thread_ids,
        });
        setShowAgentLimitDialog(true);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Operation failed';
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const pendingPrompt = localStorage.getItem(PENDING_PROMPT_KEY);

      if (pendingPrompt) {
        setInputValue(pendingPrompt);
        setAutoSubmit(true);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (autoSubmit && inputValue && !isSubmitting) {
      const timer = setTimeout(() => {
        handleSubmit(inputValue);
        setAutoSubmit(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [autoSubmit, inputValue, isSubmitting]);

  return (
    <>
      <BillingModal 
        open={showPaymentModal} 
        onOpenChange={setShowPaymentModal}
        showUsageLimitAlert={true}
      />
      <div className="flex flex-col h-screen w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            {/* {customAgentsEnabled && (
              <div className="flex justify-center px-4 pt-4 md:pt-8">
                <ReleaseBadge text="Custom Agents, Playbooks, and more!" link="/agents?tab=my-agents" />
              </div>
            )} */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
              <div className="w-full max-w-[800px] flex flex-col items-center justify-center space-y-1 md:space-y-2">
                <div className="flex flex-col items-center text-center w-full">
                  <div className="tracking-tight text-2xl md:text-3xl font-normal text-foreground/90 libre-baskerville-regular">
                    {currentWelcomeMessage.split('{name}').map((part, index, array) => {
                      if (index === array.length - 1) {
                        return part;
                      }
                      return (
                        <span key={index}>
                          {part}
                          <span className="libre-baskerville-bold">{cachedUserName}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="w-full">
                  <ChatInput
                    ref={chatInputRef}
                    onSubmit={handleSubmit}
                    loading={isSubmitting}
                    placeholder="Assign a task or ask anything..."
                    value={inputValue}
                    onChange={setInputValue}
                    hideAttachments={false}
                    selectedAgentId={selectedAgentId}
                    onAgentSelect={setSelectedAgent}
                    enableAdvancedConfig={true}
                    onConfigureAgent={(agentId) => router.push(`/agents/config/${agentId}`)}
                  />
                </div>
              </div>
            </div>
            {/* {enabledEnvironment && customAgentsEnabled && (
              <div className="w-full px-4 pb-8">
                <div className="max-w-7xl mx-auto">
                  <CustomAgentsSection 
                    onAgentSelect={setSelectedAgent}
                  />
                </div>
              </div>
            )} */}
          </div>
        </div>
        
        <BillingErrorAlert
          message={billingError?.message}
          currentUsage={billingError?.currentUsage}
          limit={billingError?.limit}
          accountId={personalAccount?.account_id}
          onDismiss={clearBillingError}
          isOpen={!!billingError}
        />
      </div>

      {agentLimitData && (
        <AgentRunLimitDialog
          open={showAgentLimitDialog}
          onOpenChange={setShowAgentLimitDialog}
          runningCount={agentLimitData.runningCount}
          runningThreadIds={agentLimitData.runningThreadIds}
          projectId={undefined}
        />
      )}
    </>
  );
}
