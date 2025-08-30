import React from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/thread/thread-site-header';
import { FileViewerModal } from '@/components/thread/file-viewer-modal';
import { ToolCallSidePanel } from '@/components/thread/tool-call-side-panel';
import { BillingErrorAlert } from '@/components/billing/usage-limit-alert';
import { Project } from '@/lib/api';
import { ApiMessageType, BillingData } from '../_types';
import { ToolCallInput } from '@/components/thread/tool-call-side-panel';
import { useMediumScreen } from '@/hooks/react-query/use-medium-screen';
import { useCustomBreakpoint } from '@/hooks/use-custom-breakpoints';

interface ThreadLayoutProps {
  children: React.ReactNode;
  threadId: string;
  projectName: string;
  projectId: string;
  project: Project | null;
  sandboxId: string | null;
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  onProjectRenamed?: (newName: string) => void;
  onViewFiles: (filePath?: string, filePathList?: string[]) => void;
  fileViewerOpen: boolean;
  setFileViewerOpen: (open: boolean) => void;
  fileToView: string | null;
  filePathList?: string[];
  toolCalls: ToolCallInput[];
  messages: ApiMessageType[];
  externalNavIndex?: number;
  agentStatus: 'idle' | 'running' | 'connecting' | 'error';
  currentToolIndex: number;
  onSidePanelNavigate: (index: number) => void;
  onSidePanelClose: () => void;
  renderAssistantMessage: (
    assistantContent?: string,
    toolContent?: string,
  ) => React.ReactNode;
  renderToolResult: (
    toolContent?: string,
    isSuccess?: boolean,
  ) => React.ReactNode;
  isLoading: boolean;
  showBillingAlert: boolean;
  billingData: BillingData;
  onDismissBilling: () => void;
  debugMode: boolean;
  isMobile: boolean;
  initialLoadCompleted: boolean;
  agentName?: string;
  disableInitialAnimation?: boolean;
  agentRunId?: string;
}

export function ThreadLayout({
  children,
  threadId,
  projectName,
  projectId,
  project,
  sandboxId,
  isSidePanelOpen,
  onToggleSidePanel,
  onProjectRenamed,
  onViewFiles,
  fileViewerOpen,
  setFileViewerOpen,
  fileToView,
  filePathList,
  toolCalls,
  messages,
  externalNavIndex,
  agentStatus,
  currentToolIndex,
  onSidePanelNavigate,
  onSidePanelClose,
  renderAssistantMessage,
  renderToolResult,
  isLoading,
  showBillingAlert,
  billingData,
  onDismissBilling,
  debugMode,
  isMobile,
  initialLoadCompleted,
  agentName,
  disableInitialAnimation = false,
  agentRunId,
}: ThreadLayoutProps) {
  const { state: leftSidebarState } = useSidebar();
  const isLeftSidebarExpanded = leftSidebarState === 'expanded';
  const isMediumScreen = useMediumScreen();
  const isCustomBreakpoint = useCustomBreakpoint();

  // Determine when to apply margin-right
  const shouldApplyMarginRight = React.useMemo(() => {
    // Don't apply margin if:
    // 1. Not initialized yet
    // 2. Panel is closed
    if (!initialLoadCompleted || !isSidePanelOpen) return false;

    // Don't apply margin in these cases:
    // 1. On medium screens (768px-934px)
    // 2. On custom breakpoint (1024px-1227px) when sidebar is expanded
    if (isMediumScreen) return false;
    if (isCustomBreakpoint && isLeftSidebarExpanded) return false;

    // Apply margin in all other cases
    return true;
  }, [
    initialLoadCompleted,
    isSidePanelOpen,
    isMediumScreen,
    isCustomBreakpoint,
    isLeftSidebarExpanded,
  ]);
  return (
    <div className="flex h-screen">
      {debugMode && (
        <div className="fixed top-16 right-4 bg-amber-500 text-black text-xs px-2 py-1 rounded-md shadow-md z-50">
          Debug Mode
        </div>
      )}

      <div
        className={`flex flex-col flex-1 overflow-hidden transition-[margin] duration-200 ease-in-out will-change-[margin] ${
          shouldApplyMarginRight
            ? isLeftSidebarExpanded
              ? 'mr-[40vw]'
              : 'mr-[45vw]'
            : ''
        }`}
      >
        <SiteHeader
          threadId={threadId}
          projectName={projectName}
          projectId={projectId}
          createdAt={project?.created_at}
          onViewFiles={onViewFiles}
          onToggleSidePanel={onToggleSidePanel}
          onProjectRenamed={onProjectRenamed}
          isMobileView={isMobile}
          debugMode={debugMode}
          isSidePanelOpen={isSidePanelOpen}
        />

        {children}
      </div>

      <ToolCallSidePanel
        isOpen={isSidePanelOpen && initialLoadCompleted}
        onClose={onSidePanelClose}
        toolCalls={toolCalls}
        messages={messages}
        externalNavigateToIndex={externalNavIndex}
        agentStatus={agentStatus}
        currentIndex={currentToolIndex}
        onNavigate={onSidePanelNavigate}
        project={project || undefined}
        renderAssistantMessage={renderAssistantMessage}
        renderToolResult={renderToolResult}
        isLoading={!initialLoadCompleted || isLoading}
        onFileClick={onViewFiles}
        agentName={agentName}
        disableInitialAnimation={disableInitialAnimation}
        isLeftSidebarExpanded={isLeftSidebarExpanded}
        threadId={threadId}
        agentRunId={agentRunId}
      />

      {sandboxId && (
        <FileViewerModal
          open={fileViewerOpen}
          onOpenChange={setFileViewerOpen}
          sandboxId={sandboxId}
          initialFilePath={fileToView}
          project={project || undefined}
          filePathList={filePathList}
        />
      )}

      <BillingErrorAlert
        message={billingData.message}
        currentUsage={billingData.currentUsage}
        limit={billingData.limit}
        accountId={billingData.accountId}
        onDismiss={onDismissBilling}
        isOpen={showBillingAlert}
      />
    </div>
  );
}
