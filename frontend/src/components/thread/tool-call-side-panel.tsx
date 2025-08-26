'use client';

import { Project } from '@/lib/api';
import { getToolIcon, getUserFriendlyToolName } from '@/components/thread/utils';
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiMessageType } from '@/components/thread/types';
import { CircleDashed, X, Minimize2, SkipForward, SkipBack } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ToolView, extractFilePathFromToolCall } from './tool-views/wrapper';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useMediumScreen } from '@/hooks/react-query/use-medium-screen';
import { useCustomBreakpoint } from '@/hooks/use-custom-breakpoints';

export interface ToolCallInput {
  assistantCall: {
    content?: string;
    name?: string;
    timestamp?: string;
  };
  toolResult?: {
    content?: string;
    isSuccess?: boolean;
    timestamp?: string;
  };
  messages?: ApiMessageType[];
}

interface ToolCallSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  toolCalls: ToolCallInput[];
  currentIndex: number;
  onNavigate: (newIndex: number) => void;
  externalNavigateToIndex?: number;
  messages?: ApiMessageType[];
  agentStatus: string;
  project?: Project;
  renderAssistantMessage?: (
    assistantContent?: string,
    toolContent?: string,
  ) => React.ReactNode;
  renderToolResult?: (
    toolContent?: string,
    isSuccess?: boolean,
  ) => React.ReactNode;
  isLoading?: boolean;
  agentName?: string;
  onFileClick?: (filePath: string) => void;
  disableInitialAnimation?: boolean;
  // When the left sidebar is expanded, slightly reduce the panel width to free up space
  isLeftSidebarExpanded?: boolean;
  // Reset accumulated time when starting a new thread
  resetAccumulatedTime?: boolean;
  // Thread ID for fetching runtime from database
  threadId?: string;
  // Agent run ID for current execution
  agentRunId?: string;
}

interface ToolCallSnapshot {
  id: string;
  toolCall: ToolCallInput;
  index: number;
  timestamp: number;
}

const FLOATING_LAYOUT_ID = 'tool-panel-float';
const CONTENT_LAYOUT_ID = 'tool-panel-content';

interface ViewToggleProps {
  currentView: 'tools' | 'browser';
  onViewChange: (view: 'tools' | 'browser') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="relative flex items-center gap-1 bg-muted rounded-3xl px-1 py-1">
      {/* Sliding background */}
      <motion.div
        className="absolute h-7 w-7 bg-white rounded-xl shadow-sm"
        initial={false}
        animate={{
          x: currentView === 'tools' ? 0 : 32, // 28px button width + 4px gap
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      />
      
      {/* Buttons */}
      <Button
        size="sm"
        onClick={() => onViewChange('tools')}
        className={`relative z-10 h-7 w-7 p-0 rounded-xl bg-transparent hover:bg-transparent shadow-none ${
          currentView === 'tools'
            ? 'text-black'
            : 'text-gray-500 dark:text-gray-400'
        }`}
        title="Switch to Tool View"
      >
        <Wrench className="h-3.5 w-3.5" />
      </Button>

      <Button
        size="sm"
        onClick={() => onViewChange('browser')}
        className={`relative z-10 h-7 w-7 p-0 rounded-xl bg-transparent hover:bg-transparent shadow-none ${
          currentView === 'browser'
            ? 'text-black'
            : 'text-gray-500 dark:text-gray-400'
        }`}
        title="Switch to Browser View"
      >
        <Globe className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

// Helper function to generate the computer title
const getComputerTitle = (agentName?: string): string => {
          return agentName ? `${agentName}'s Computer` : "Helium's Computer";
};

// Reusable header component for the tool panel
interface PanelHeaderProps {
  agentName?: string;
  onClose: () => void;
  isStreaming?: boolean;
  variant?: 'drawer' | 'desktop' | 'motion';
  showMinimize?: boolean;
  hasToolResult?: boolean;
  layoutId?: string;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  agentName,
  onClose,
  isStreaming = false,
  variant = 'desktop',
  showMinimize = false,
  hasToolResult = false,
  layoutId,
}) => {
  const title = getComputerTitle(agentName);
  
  if (variant === 'drawer') {
    return (
      <DrawerHeader className="pb-2">
        <div className="flex items-center justify-between">
          <DrawerTitle className="text-lg font-medium">
            {title}
          </DrawerTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            title="Minimize to floating preview"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </DrawerHeader>
    );
  }

  if (variant === 'motion') {
    return (
      <motion.div
        layoutId={layoutId}
        className="p-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div layoutId="tool-icon" className="ml-2">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {title}
              </h2>
            </motion.div>
          </div>

          <div className="flex items-center gap-2">
            {isStreaming && (
              <div className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1.5">
                <CircleDashed className="h-3 w-3 animate-spin" />
                <span>Running</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              title="Minimize to floating preview"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="pt-4 pl-4 pr-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="ml-2">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && (
            <Badge variant="outline" className="gap-1.5 p-2 rounded-3xl">
              <CircleDashed className="h-3 w-3 animate-spin" />
              <span>Running</span>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            title={showMinimize ? "Minimize to floating preview" : "Close"}
          >
            {showMinimize ? <Minimize2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export function ToolCallSidePanel({
  isOpen,
  onClose,
  toolCalls,
  currentIndex,
  onNavigate,
  messages,
  agentStatus,
  project,
  isLoading = false,
  externalNavigateToIndex,
  agentName,
  onFileClick,
  disableInitialAnimation,
  isLeftSidebarExpanded = false,
  resetAccumulatedTime = false,
  threadId,
  agentRunId,
}: ToolCallSidePanelProps) {
  const [dots, setDots] = React.useState('');
  const [internalIndex, setInternalIndex] = React.useState(0);
  const [navigationMode, setNavigationMode] = React.useState<'live' | 'manual'>('live');
  const [toolCallSnapshots, setToolCallSnapshots] = React.useState<ToolCallSnapshot[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [agentStartTime, setAgentStartTime] = React.useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [finalRuntime, setFinalRuntime] = React.useState<number | null>(null);
  const [accumulatedTime, setAccumulatedTime] = React.useState(0);
  const [databaseRuntime, setDatabaseRuntime] = React.useState<number>(0);
  const [isLoadingRuntime, setIsLoadingRuntime] = React.useState(false);
  const [generatedAgentRunId, setGeneratedAgentRunId] = React.useState<string | null>(null);

  const isMobile = useIsMobile();
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const isMediumScreen = useMediumScreen();
  const isCustomBreakpoint = useCustomBreakpoint();
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(max-width: 1023px)');
      const handleChange = (event: MediaQueryListEvent) => {
        setIsFullScreen(event.matches);
      };

      // Initial check
      setIsFullScreen(mediaQuery.matches);

      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, []);

  // Compute responsive width class; shrink a bit when the left sidebar is expanded
  const widthClass = React.useMemo(() => {
    if (isFullScreen) return 'left-2';
    if (isCustomBreakpoint && isLeftSidebarExpanded) return 'left-2';
    if (isMediumScreen) return 'w-[calc(100vw-32px)]';
    const base = isLeftSidebarExpanded ? 'w-[45vw]' : 'w-[50vw]';
    return `${base} sm:${base} md:${base} lg:${base} xl:${base}`;
  }, [isFullScreen, isLeftSidebarExpanded, isMediumScreen, isCustomBreakpoint]);

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    const newSnapshots = toolCalls.map((toolCall, index) => ({
      id: `${index}-${toolCall.assistantCall.timestamp || Date.now()}`,
      toolCall,
      index,
      timestamp: Date.now(),
    }));

    const hadSnapshots = toolCallSnapshots.length > 0;
    const hasNewSnapshots = newSnapshots.length > toolCallSnapshots.length;
    setToolCallSnapshots(newSnapshots);

    if (!isInitialized && newSnapshots.length > 0) {
      const completedCount = newSnapshots.filter(s =>
        s.toolCall.toolResult?.content &&
        s.toolCall.toolResult.content !== 'STREAMING'
      ).length;

      if (completedCount > 0) {
        let lastCompletedIndex = -1;
        for (let i = newSnapshots.length - 1; i >= 0; i--) {
          const snapshot = newSnapshots[i];
          if (snapshot.toolCall.toolResult?.content &&
            snapshot.toolCall.toolResult.content !== 'STREAMING') {
            lastCompletedIndex = i;
            break;
          }
        }
        setInternalIndex(Math.max(0, lastCompletedIndex));
      } else {
        setInternalIndex(Math.max(0, newSnapshots.length - 1));
      }
      setIsInitialized(true);
    } else if (hasNewSnapshots && navigationMode === 'live') {
      const latestSnapshot = newSnapshots[newSnapshots.length - 1];
      const isLatestStreaming = latestSnapshot?.toolCall.toolResult?.content === 'STREAMING';
      if (isLatestStreaming) {
        let lastCompletedIndex = -1;
        for (let i = newSnapshots.length - 1; i >= 0; i--) {
          const snapshot = newSnapshots[i];
          if (snapshot.toolCall.toolResult?.content &&
            snapshot.toolCall.toolResult.content !== 'STREAMING') {
            lastCompletedIndex = i;
            break;
          }
        }
        if (lastCompletedIndex >= 0) {
          setInternalIndex(lastCompletedIndex);
        } else {
          setInternalIndex(newSnapshots.length - 1);
        }
      } else {
        setInternalIndex(newSnapshots.length - 1);
      }
    } else if (hasNewSnapshots && navigationMode === 'manual') {
    }
  }, [toolCalls, navigationMode, toolCallSnapshots.length, isInitialized]);

  React.useEffect(() => {
    if (isOpen && !isInitialized && toolCallSnapshots.length > 0) {
      setInternalIndex(Math.min(currentIndex, toolCallSnapshots.length - 1));
    }
  }, [isOpen, currentIndex, isInitialized, toolCallSnapshots.length]);

  const safeInternalIndex = Math.min(internalIndex, Math.max(0, toolCallSnapshots.length - 1));
  const currentSnapshot = toolCallSnapshots[safeInternalIndex];
  const currentToolCall = currentSnapshot?.toolCall;
  const totalCalls = toolCallSnapshots.length;

  const completedToolCalls = toolCallSnapshots.filter(snapshot =>
    snapshot.toolCall.toolResult?.content &&
    snapshot.toolCall.toolResult.content !== 'STREAMING'
  );
  const totalCompletedCalls = completedToolCalls.length;

  let displayToolCall = currentToolCall;
  let displayIndex = safeInternalIndex;
  let displayTotalCalls = totalCalls;

  const isCurrentToolStreaming = currentToolCall?.toolResult?.content === 'STREAMING';
  if (isCurrentToolStreaming && totalCompletedCalls > 0) {
    const lastCompletedSnapshot = completedToolCalls[completedToolCalls.length - 1];
    displayToolCall = lastCompletedSnapshot.toolCall;
    displayIndex = totalCompletedCalls - 1;
    displayTotalCalls = totalCompletedCalls;
  } else if (!isCurrentToolStreaming) {
    const completedIndex = completedToolCalls.findIndex(snapshot => snapshot.id === currentSnapshot?.id);
    if (completedIndex >= 0) {
      displayIndex = completedIndex;
      displayTotalCalls = totalCompletedCalls;
    }
  }

  const currentToolName = displayToolCall?.assistantCall?.name || 'Tool Call';
  const CurrentToolIcon = getToolIcon(
    currentToolCall?.assistantCall?.name || 'unknown',
  );
  const isStreaming = displayToolCall?.toolResult?.content === 'STREAMING';

  // Extract actual success value from tool content with fallbacks
  const getActualSuccess = (toolCall: any): boolean => {
    const content = toolCall?.toolResult?.content;
    if (!content) return toolCall?.toolResult?.isSuccess ?? true;

    const safeParse = (data: any) => {
      try { return typeof data === 'string' ? JSON.parse(data) : data; }
      catch { return null; }
    };

    const parsed = safeParse(content);
    if (!parsed) return toolCall?.toolResult?.isSuccess ?? true;

    if (parsed.content) {
      const inner = safeParse(parsed.content);
      if (inner?.tool_execution?.result?.success !== undefined) {
        return inner.tool_execution.result.success;
      }
    }
    const success = parsed.tool_execution?.result?.success ??
      parsed.result?.success ??
      parsed.success;

    return success !== undefined ? success : (toolCall?.toolResult?.isSuccess ?? true);
  };

  const isSuccess = isStreaming ? true : getActualSuccess(displayToolCall);

  const isFirstFileOperation = React.useMemo(() => {
    if (!currentToolCall) return false;

    const currentFilePath = extractFilePathFromToolCall(currentToolCall);
    if (!currentFilePath) return false;

    for (let i = 0; i < safeInternalIndex; i++) {
      const previousToolCall = toolCallSnapshots[i]?.toolCall;
      if (previousToolCall) {
        const previousFilePath = extractFilePathFromToolCall(previousToolCall);
        if (previousFilePath === currentFilePath) {
          return false; // Found a previous operation on the same file
        }
      }
    }

    return true; // This is the first operation on this file
  }, [safeInternalIndex, toolCallSnapshots, currentToolCall]);

  const internalNavigate = React.useCallback((newIndex: number, source: string = 'internal') => {
    if (newIndex < 0 || newIndex >= totalCalls) return;

    const isNavigatingToLatest = newIndex === totalCalls - 1;

    console.log(`[INTERNAL_NAV] ${source}: ${internalIndex} -> ${newIndex}, mode will be: ${isNavigatingToLatest ? 'live' : 'manual'}`);

    setInternalIndex(newIndex);

    if (isNavigatingToLatest) {
      setNavigationMode('live');
    } else {
      setNavigationMode('manual');
    }

    if (source === 'user_explicit') {
      onNavigate(newIndex);
    }
  }, [internalIndex, totalCalls, onNavigate]);

  // Helper function to format elapsed time
  const formatElapsedTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const isLiveMode = navigationMode === 'live';
  const showJumpToLive = navigationMode === 'manual' && agentStatus === 'running';
  const showJumpToLatest = navigationMode === 'manual' && agentStatus !== 'running';

  const navigateToPrevious = React.useCallback(() => {
    if (displayIndex > 0) {
      const targetCompletedIndex = displayIndex - 1;
      const targetSnapshot = completedToolCalls[targetCompletedIndex];
      if (targetSnapshot) {
        const actualIndex = toolCallSnapshots.findIndex(s => s.id === targetSnapshot.id);
        if (actualIndex >= 0) {
          setNavigationMode('manual');
          internalNavigate(actualIndex, 'user_explicit');
        }
      }
    }
  }, [displayIndex, completedToolCalls, toolCallSnapshots, internalNavigate]);

  const navigateToNext = React.useCallback(() => {
    if (displayIndex < displayTotalCalls - 1) {
      const targetCompletedIndex = displayIndex + 1;
      const targetSnapshot = completedToolCalls[targetCompletedIndex];
      if (targetSnapshot) {
        const actualIndex = toolCallSnapshots.findIndex(s => s.id === targetSnapshot.id);
        if (actualIndex >= 0) {
          const isLatestCompleted = targetCompletedIndex === completedToolCalls.length - 1;
          if (isLatestCompleted) {
            setNavigationMode('live');
          } else {
            setNavigationMode('manual');
          }
          internalNavigate(actualIndex, 'user_explicit');
        }
      }
    }
  }, [displayIndex, displayTotalCalls, completedToolCalls, toolCallSnapshots, internalNavigate]);

  const jumpToLive = React.useCallback(() => {
    setNavigationMode('live');
    internalNavigate(totalCalls - 1, 'user_explicit');
  }, [totalCalls, internalNavigate]);

  const jumpToLatest = React.useCallback(() => {
    setNavigationMode('manual');
    internalNavigate(totalCalls - 1, 'user_explicit');
  }, [totalCalls, internalNavigate]);

  const resetTimer = React.useCallback(() => {
    setAccumulatedTime(0);
    setFinalRuntime(null);
    setAgentStartTime(null);
    setElapsedTime(0);
    setDatabaseRuntime(0);
    setGeneratedAgentRunId(null);
  }, []);

  const fetchDatabaseRuntime = React.useCallback(async () => {
    if (!threadId) return;
    
    try {
      setIsLoadingRuntime(true);
      const response = await fetch(`/api/runtime/thread/${threadId}`);
      if (response.ok) {
        const data = await response.json();
        setDatabaseRuntime(data.total_runtime_ms || 0);
      }
    } catch (error) {
      console.error('Failed to fetch runtime from database:', error);
    } finally {
      setIsLoadingRuntime(false);
    }
  }, [threadId]);

  const createAgentRun = React.useCallback(async (runId: string, threadId: string) => {
    try {
      console.log('API: Creating agent run:', { runId, threadId });
      const response = await fetch(`/api/runtime/agent-run/${runId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thread_id: threadId }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create agent run:', response.status, response.statusText, errorText);
      } else {
        const result = await response.json();
        console.log('Successfully created agent run:', result);
      }
    } catch (error) {
      console.error('Error creating agent run:', error);
    }
  }, []);

  const completeAgentRun = React.useCallback(async (runId: string, totalRuntime: number) => {
    try {
      console.log('API: Completing agent run:', { runId, totalRuntime });
      const response = await fetch(`/api/runtime/agent-run/${runId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'completed',
          total_runtime_ms: totalRuntime 
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to complete agent run:', response.status, response.statusText, errorText);
      } else {
        const result = await response.json();
        console.log('Successfully completed agent run:', result);
        // Refresh runtime from database after completion
        if (threadId) {
          fetchDatabaseRuntime();
        }
      }
    } catch (error) {
      console.error('Error completing agent run:', error);
    }
  }, [threadId, fetchDatabaseRuntime]);

  const updateHeartbeat = React.useCallback(async (runId: string) => {
    try {
      // Calculate runtime safely
      let totalRuntime = 0;
      if (agentStartTime && agentStartTime > 0) {
        const runtime = Date.now() - agentStartTime;
        // Ensure runtime is not negative and reasonable
        totalRuntime = Math.max(0, Math.min(runtime, 24 * 60 * 60 * 1000)); // Max 24 hours
      }

      console.log('Sending heartbeat update:', { runId, totalRuntime, agentStartTime });

      const response = await fetch(`/api/runtime/agent-run/${runId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'running',
          total_runtime_ms: totalRuntime
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update heartbeat:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          runId,
          totalRuntime
        });
        
        // If it's an authentication error, log it specifically
        if (response.status === 401) {
          console.error('Authentication failed for heartbeat update');
        }
      } else {
        console.log('Heartbeat update successful for runId:', runId);
      }
    } catch (error) {
      console.error('Error updating heartbeat:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        runId,
        agentStartTime
      });
    }
  }, [agentStartTime]);

  const renderStatusButton = React.useCallback(() => {
    const baseClasses = "flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full w-[116px]";
    const dotClasses = "w-1.5 h-1.5 rounded-full";
    const textClasses = "text-xs font-medium";

    if (isLiveMode) {
      if (agentStatus === 'running') {
        return (
          <div className={`${baseClasses} bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800`}>
            <div className={`${dotClasses} bg-helium-teal animate-pulse`} />
            <span className={`${textClasses} text-helium-teal`}>Live Updates</span>
          </div>
        );
      } else {
        return (
          <div className={`${baseClasses} bg-neutral-50 dark:bg-neutral-900/20 border border-neutral-200 dark:border-neutral-800`}>
            <div className={`${dotClasses} bg-neutral-500`} />
            <span className={`${textClasses} text-neutral-700 dark:text-neutral-400`}>Latest Tool</span>
          </div>
        );
      }
    } else {
      if (agentStatus === 'running') {
        return (
          <div
            className={`${baseClasses} bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer`}
            onClick={jumpToLive}
          >
            <div className={`${dotClasses} bg-helium-teal animate-pulse`} />
            <span className={`${textClasses} text-helium-teal`}>Jump to Live</span>
          </div>
        );
      } else {
        return (
          <div
            className={`${baseClasses} bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer`}
            onClick={jumpToLatest}
          >
            <div className={`${dotClasses} bg-helium-blue`} />
            <span className={`${textClasses} text-helium-blue`}>Jump to Latest</span>
          </div>
        );
      }
    }
  }, [isLiveMode, agentStatus, jumpToLive, jumpToLatest]);

  const handleSliderChange = React.useCallback(([newValue]: [number]) => {
    const targetSnapshot = completedToolCalls[newValue];
    if (targetSnapshot) {
      const actualIndex = toolCallSnapshots.findIndex(s => s.id === targetSnapshot.id);
      if (actualIndex >= 0) {
        const isLatestCompleted = newValue === completedToolCalls.length - 1;
        if (isLatestCompleted) {
          setNavigationMode('live');
        } else {
          setNavigationMode('manual');
        }

        internalNavigate(actualIndex, 'user_explicit');
      }
    }
  }, [completedToolCalls, toolCallSnapshots, internalNavigate]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    // Previously, expanding the left sidebar closed the panel.
    // We now keep the panel open and smoothly adjust its width instead.
    // Listener intentionally removed to avoid abrupt close.
  }, [isOpen, handleClose]);

  React.useEffect(() => {
    if (externalNavigateToIndex !== undefined && externalNavigateToIndex >= 0 && externalNavigateToIndex < totalCalls) {
      internalNavigate(externalNavigateToIndex, 'external_click');
    }
  }, [externalNavigateToIndex, totalCalls, internalNavigate]);

  // Reset accumulated time when starting a new thread
  React.useEffect(() => {
    if (resetAccumulatedTime) {
      setAccumulatedTime(0);
      setFinalRuntime(null);
      setAgentStartTime(null);
      setElapsedTime(0);
      setDatabaseRuntime(0);
    }
  }, [resetAccumulatedTime]);

  // Fetch runtime from database when threadId changes or component mounts
  React.useEffect(() => {
    if (threadId) {
      fetchDatabaseRuntime();
    }
  }, [threadId, fetchDatabaseRuntime]);

  // Also fetch runtime when component mounts to load persisted data
  React.useEffect(() => {
    if (threadId && isOpen) {
      fetchDatabaseRuntime();
    }
  }, [threadId, isOpen, fetchDatabaseRuntime]);

  // Timer effect for agent runtime
  React.useEffect(() => {
    if (agentStatus === 'running' && !agentStartTime) {
      // Agent just started running - this is now handled by the other effects
      return;
    } else if (agentStatus !== 'running' && agentStartTime) {
      // Agent stopped running - accumulate the runtime
      const totalRuntime = Date.now() - agentStartTime;
      setAccumulatedTime(prev => prev + totalRuntime);
      // Show total accumulated time including database runtime
      setFinalRuntime(databaseRuntime + accumulatedTime + totalRuntime);
      setAgentStartTime(null);
      setElapsedTime(0);
      
      // Complete agent run in database - use generated agentRunId if prop one is not available
      const runIdToUse = agentRunId || generatedAgentRunId;
      if (runIdToUse) {
        console.log('Completing agent run:', { runIdToUse, totalRuntime });
        completeAgentRun(runIdToUse, totalRuntime);
      } else {
        console.log('Missing agentRunId for completion');
      }
    }
  }, [agentStatus, agentStartTime, accumulatedTime, databaseRuntime, threadId, agentRunId, generatedAgentRunId, createAgentRun, completeAgentRun]);

  // Effect to handle agentRunId changes (when agent starts)
  React.useEffect(() => {
    if (agentRunId && agentStatus === 'running' && !agentStartTime) {
      // We have an agentRunId and agent is running, but we haven't started tracking yet
      console.log('AgentRunId available, starting runtime tracking:', { agentRunId, threadId });
      setAgentStartTime(Date.now());
      setElapsedTime(0);
      setFinalRuntime(null);
      
      // Create the agent run record
      if (threadId) {
        createAgentRun(agentRunId, threadId);
      }
    }
  }, [agentRunId, agentStatus, agentStartTime, threadId, createAgentRun]);

  // Generate agentRunId if not provided when agent starts running
  React.useEffect(() => {
    if (agentStatus === 'running' && !agentRunId && !agentStartTime) {
      // Generate a new agentRunId if we don't have one
      const newAgentRunId = crypto.randomUUID();
      console.log('Generated new agentRunId:', newAgentRunId);
      setGeneratedAgentRunId(newAgentRunId);
      
      // Create the agent run record immediately
      if (threadId) {
        createAgentRun(newAgentRunId, threadId);
        setAgentStartTime(Date.now());
        setElapsedTime(0);
        setFinalRuntime(null);
      }
    }
  }, [agentStatus, agentRunId, agentStartTime, threadId, createAgentRun]);

  // Timer effect for updating elapsed time
  React.useEffect(() => {
    if (!agentStartTime || agentStatus !== 'running') return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - agentStartTime);
      
      // Update heartbeat in database every 5 seconds
      const runIdToUse = agentRunId || generatedAgentRunId;
      if (runIdToUse && Date.now() % 5000 < 1000) {
        updateHeartbeat(runIdToUse);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [agentStartTime, agentStatus, agentRunId, generatedAgentRunId, updateHeartbeat]);

  React.useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  if (!isOpen) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-30 pointer-events-none">
        <div className="p-4 h-full flex items-stretch justify-end pointer-events-auto">
          <div
            className={cn(
              'border rounded-xl flex flex-col bg-white transition-[width] duration-200 ease-in-out will-change-[width]',
              isMobile ? 'w-full' : widthClass,
            )}
          >
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="pt-4 pl-4 pr-4">
                  <div className="flex items-center justify-between">
                    <div className="ml-2 flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 prose prose-sm dark:prose-inver">
                        {/* {agentName ? `${agentName}'s Computer` : 'Suna\'s Computer'} */}
                        Helium's Core
                      </h2>
                                          {(agentStatus === 'running' || finalRuntime !== null || databaseRuntime > 0) && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                        agentStatus === 'running' 
                          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                      )}>
                        {agentStatus === 'running' ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span>
                              {formatElapsedTime(databaseRuntime + accumulatedTime + elapsedTime)}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>Total: {formatElapsedTime(databaseRuntime + (finalRuntime || 0))}</span>
                          </>
                        )}
                      </div>
                    )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="h-8 w-8"
                      title="Minimize to floating preview"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-20 w-full rounded-md" />
                    <Skeleton className="h-40 w-full rounded-md" />
                    <Skeleton className="h-20 w-full rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!displayToolCall && toolCallSnapshots.length === 0) {
      return (
        <div className="flex flex-col h-full">
          <div className="pt-4 pl-4 pr-4">
            <div className="flex items-center justify-between">
              <div className="ml-2 flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {/* {agentName ? `${agentName}'s Computer` : 'Suna\'s Computer'} */}
                  Helium's Core
                </h2>
                {(agentStatus === 'running' || finalRuntime !== null || databaseRuntime > 0) && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                    agentStatus === 'running' 
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
                      : "bg-blue-50 text-blue-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
                  )}>
                    {agentStatus === 'running' ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span>{formatElapsedTime(databaseRuntime + accumulatedTime + elapsedTime)}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>Total: {formatElapsedTime(databaseRuntime + (finalRuntime || 0))}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 p-8">
            <div className="flex flex-col items-center justify-center w-full h-full">
              <div className="relative w-[30%] h-[30%] flex items-center justify-center">
                <Image 
                  src="/helium-brain.png" 
                  alt="Helium Core Initiating" 
                  width={400}
                  height={400}
                  className="w-full h-full object-contain dark:hidden"
                  priority
                />
                <Image 
                  src="/helium-brain(dark).png" 
                  alt="Helium Core Initiating" 
                  width={400}
                  height={400}
                  className="w-full h-full object-contain hidden dark:block"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!displayToolCall && toolCallSnapshots.length > 0) {
      const firstStreamingTool = toolCallSnapshots.find(s => s.toolCall.toolResult?.content === 'STREAMING');
      if (firstStreamingTool && totalCompletedCalls === 0) {
        return (
          <div className="flex flex-col h-full">
            <div className="pt-4 pl-4 pr-4">
              <div className="flex items-center justify-between">
                <div className="ml-2 flex items-center gap-2">
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {/* {agentName ? `${agentName}'s Computer` : 'Suna\'s Computer'} */}
                    Helium's Core
                  </h2>
                  {(agentStatus === 'running' || finalRuntime !== null || databaseRuntime > 0) && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                      agentStatus === 'running' 
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                    )}>
                      {agentStatus === 'running' ? (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span>{formatElapsedTime(databaseRuntime + accumulatedTime + elapsedTime)}</span>
                        </>
                      ) : (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>Total: {formatElapsedTime(databaseRuntime + (finalRuntime || 0))}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1.5">
                    <CircleDashed className="h-3 w-3 animate-spin" />
                    <span>Running</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="h-8 w-8 ml-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center flex-1 p-8">
              <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <CircleDashed className="h-8 w-8 text-blue-500 dark:text-blue-400 animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    Tool is running
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {getUserFriendlyToolName(firstStreamingTool.toolCall.assistantCall.name || 'Tool')} is currently executing. Results will appear here when complete.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col h-full">
          <div className="pt-4 pl-4 pr-4">
            <div className="flex items-center justify-between">
              <div className="ml-2 flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 prose prose-sm dark:prose-invert">
                  {/* {agentName ? `${agentName}'s Computer` : 'Suna\'s Computer'} */}
                  Helium's Core
                </h2>
                {(agentStatus === 'running' || finalRuntime !== null || databaseRuntime > 0) && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                    agentStatus === 'running' 
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  )}>
                    {agentStatus === 'running' ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span>{formatElapsedTime(databaseRuntime + accumulatedTime + elapsedTime)}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>Total: {formatElapsedTime(databaseRuntime + (finalRuntime || 0))}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <div className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          </div>
        </div>
      );
    }

    const toolView = (
      <ToolView
        name={displayToolCall.assistantCall.name}
        assistantContent={displayToolCall.assistantCall.content}
        toolContent={displayToolCall.toolResult?.content}
        assistantTimestamp={displayToolCall.assistantCall.timestamp}
        toolTimestamp={displayToolCall.toolResult?.timestamp}
        isSuccess={isSuccess}
        isStreaming={isStreaming}
        project={project}
        messages={messages}
        agentStatus={agentStatus}
        currentIndex={displayIndex}
        totalCalls={displayTotalCalls}
        onFileClick={onFileClick}
        isFirstFileOperation={isFirstFileOperation}
      />
    );

    return (
      <div className="flex flex-col h-full">
        <motion.div
          layoutId={CONTENT_LAYOUT_ID}
          className="p-3"
        >
          <div className="flex items-center justify-between">
            <motion.div layoutId="tool-icon" className="ml-2 flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-black dark:text-zinc-100 prose prose-sm dark:prose-invert">
                {/* {agentName ? `${agentName}'s Computer` : 'Helium\'s Brain'} */}
                Helium's Core
              </h2>
              {(agentStatus === 'running' || finalRuntime !== null || databaseRuntime > 0) && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                  agentStatus === 'running' 
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                )}>
                  {agentStatus === 'running' ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span>{formatElapsedTime(databaseRuntime + accumulatedTime + elapsedTime)}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>Total: {formatElapsedTime(databaseRuntime + (finalRuntime || 0))}</span>
                    </>
                  )}
                </div>
              )}
            </motion.div>

            {displayToolCall.toolResult?.content && !isStreaming && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8 ml-1"
                  title="Minimize to floating preview"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {isStreaming && (
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1.5">
                  <CircleDashed className="h-3 w-3 animate-spin" />
                  <span>Running</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8 ml-1"
                  title="Minimize to floating preview"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {!displayToolCall.toolResult?.content && !isStreaming && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
                title="Minimize to floating preview"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.div>

        <div className="flex-1 p-4 pt-0 overflow-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {toolView}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="sidepanel"
          layoutId={FLOATING_LAYOUT_ID}
          initial={disableInitialAnimation ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: disableInitialAnimation ? 0 : 0.15 },
            layout: {
              type: "spring",
              stiffness: 400,
              damping: 35
            }
          }}
          className={cn(
            'fixed top-3 right-2 bottom-4 shadow-[0px_12px_32px_0px_rgba(0,0,0,0.02)] border bg-gradient-to-bl from-green-500/10 to-blue-500/10 rounded-[22px] flex flex-col z-30 transition-[width] duration-200 ease-in-out will-change-[width]',
            widthClass,
          )}  
          style={{
            overflow: 'hidden',
          }}
        >
          <div className="flex-1 flex flex-col overflow-hidden bg-card">
            {renderContent()}
          </div>
          {(displayTotalCalls > 1 || (isCurrentToolStreaming && totalCompletedCalls > 0)) && (
            <div
              className={cn(
                'border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900',
                isMobile ? 'p-2' : 'px-4 py-2.5',
              )}
            >
              {isMobile ? (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateToPrevious}
                    disabled={displayIndex <= 0}
                    className="h-8 px-2.5 text-xs"
                  >
                    <SkipBack className="h-3.5 w-3.5 mr-1" />
                    <span>Prev</span>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium tabular-nums min-w-[44px]">
                      {displayIndex + 1}/{displayTotalCalls}
                    </span>
                    {renderStatusButton()}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateToNext}
                    disabled={displayIndex >= displayTotalCalls - 1}
                    className="h-8 px-2.5 text-xs"
                  >
                    <span>Next</span>
                    <SkipForward className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={navigateToPrevious}
                      disabled={displayIndex <= 0}
                      className="h-7 w-7 text-zinc-500 cursor-pointer hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium tabular-nums px-1 min-w-[44px] text-center">
                      {displayIndex + 1}/{displayTotalCalls}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={navigateToNext}
                      disabled={displayIndex >= displayTotalCalls - 1}
                      className="h-7 w-7 text-zinc-500 cursor-pointer hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 relative">
                    <Slider
                      min={0}
                      max={displayTotalCalls - 1}
                      step={1}
                      value={[displayIndex]}
                      onValueChange={handleSliderChange}
                      className="w-full [&>span:first-child]:h-1 [&>span:first-child]:bg-zinc-200 dark:[&>span:first-child]:bg-zinc-800 [&>span:first-child>span]:bg-[#0081F2] [&>span:first-child>span]:h-1.5"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {renderStatusButton()}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}