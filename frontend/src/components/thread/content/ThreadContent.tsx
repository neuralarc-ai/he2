import React, { useRef, useState, useCallback } from 'react';
import {
  ArrowDown,
  CircleDashed,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Check,
  Pencil,
  X,
} from 'lucide-react';
import {
  ThumbsUp as ThumbsUpFilled,
  ThumbsDown as ThumbsDownFilled,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  UnifiedMessage,
  ParsedContent,
  ParsedMetadata,
} from '@/components/thread/types';
import { ThreadFilesDisplay } from '@/components/thread/file-attachment';
import { useFilePreloader } from '@/hooks/react-query/files';
import { useAuth } from '@/components/AuthProvider';
import { Project } from '@/lib/api';
import {
  extractPrimaryParam,
  getToolIcon,
  getUserFriendlyToolName,
  safeJsonParse,
} from '@/components/thread/utils';
import { AgentLoader } from './loader';
import {
  parseXmlToolCalls,
  isNewXmlFormat,
} from '@/components/thread/tool-views/xml-parser';
import { ShowToolStream } from './ShowToolStream';
import { ComposioUrlDetector } from './composio-url-detector';
import { ThinkingAccordion } from './ThinkingAccordion';
import { ThinkingAnimation } from '@/components/ui/ThinkingAnimation';
import { HeliumLogo } from '@/components/sidebar/helium-logo';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function getNodeText(node: any): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (typeof node === 'object' && node) return getNodeText(node.props.children);
  return '';
}

const customTableComponents = {
  table: function Table({ children, ...props }: any) {
    return (
      <div className="not-prose">
        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed border-collapse my-3 text-sm"
            {...props}
          >
            {children}
          </table>
        </div>
      </div>
    );
  },
  th: function TableHeader({ children, ...props }: any) {
    return (
      <th
        className="border border-slate-300 dark:border-zinc-700 px-3 py-2 sm:px-2 sm:py-1 text-left font-semibold bg-slate-100 dark:bg-zinc-800 text-sm sm:text-xs truncate"
        {...props}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{children}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getNodeText(children)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </th>
    );
  },
  td: function TableCell({ children, ...props }: any) {
    return (
      <td
        className="border border-slate-300 dark:border-zinc-700 px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs truncate max-w-[120px] sm:max-w-[80px]"
        {...props}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{children}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getNodeText(children)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>
    );
  },
};

const HIDE_STREAMING_XML_TAGS = new Set([
  'execute-command',
  'create-file',
  'delete-file',
  'full-file-rewrite',
  'edit-file',
  'str-replace',
  'browser-click-element',
  'browser-close-tab',
  'browser-drag-drop',
  'browser-get-dropdown-options',
  'browser-go-back',
  'browser-input-text',
  'browser-navigate-to',
  'browser-scroll-down',
  'browser-scroll-to-text',
  'browser-scroll-up',
  'browser-select-dropdown-option',
  'browser-send-keys',
  'browser-switch-tab',
  'browser-wait',
  'deploy',
  'ask',
  'complete',
  'crawl-webpage',
  'web-search',
  'see-image',
  'think',
  'execute_data_provider_call',
  'execute_data_provider_endpoint',

  'execute-data-provider-call',
  'execute-data-provider-endpoint',
]);

export function renderMarkdownContent(
  content: string,
  handleToolClick: (
    assistantMessageId: string | null,
    toolName: string,
  ) => void,
  messageId: string | null,
  fileViewerHandler?: (filePath?: string, filePathList?: string[]) => void,
  sandboxId?: string,
  project?: Project,
  debugMode?: boolean,
  streamingTextContent?: string,
  streamHookStatus?: string,
) {
  // If in debug mode, just display raw content in a pre tag
  if (debugMode) {
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30 text-foreground xl:text-lg">
        {content}
      </pre>
    );
  }

  if (isNewXmlFormat(content)) {
    const contentParts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Find all function_calls blocks
    const functionCallsRegex = /<function_calls>([\s\S]*?)<\/function_calls>/gi;
    let match: RegExpExecArray | null = null;

    while ((match = functionCallsRegex.exec(content)) !== null) {
      // Add text before the function_calls block
      if (match.index > lastIndex) {
        const textBeforeBlock = content.substring(lastIndex, match.index);
        if (textBeforeBlock.trim()) {
          contentParts.push(
            <ComposioUrlDetector
              key={`md-${lastIndex}`}
              content={textBeforeBlock}
              className="text-sm xl:text-base prose prose-sm dark:prose-invert chat-markdown max-w-none break-words"
            />,
          );
        }
      }

      // Parse the tool calls in this block
      const toolCalls = parseXmlToolCalls(match[0]);

      toolCalls.forEach((toolCall, index) => {
        const toolName = toolCall.functionName.replace(/_/g, '-');

        if (toolName === 'ask') {
          // Handle ask tool specially - extract text and attachments
          const askText = toolCall.parameters.text || '';
          const attachments = toolCall.parameters.attachments || [];

          // Convert single attachment to array for consistent handling
          const attachmentArray = Array.isArray(attachments)
            ? attachments
            : typeof attachments === 'string'
              ? attachments.split(',').map((a) => a.trim())
              : [];

          // Render ask tool content with attachment UI
          contentParts.push(
            <div key={`ask-${match.index}-${index}`} className="space-y-4">
              <ComposioUrlDetector
                content={askText}
                className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none break-words [&>:first-child]:mt-0 prose-headings:mt-3"
              />
              {attachmentArray && attachmentArray.length > 0 && (
                <ThreadFilesDisplay
                  attachments={attachmentArray}
                  onFileClick={fileViewerHandler}
                  sandboxId={sandboxId}
                  project={project}
                  className="mt-3"
                  rightAlignGrid={true}
                />
              )}
            </div>,
          );
        } else if (toolName === 'complete') {
          // Handle complete tool specially - extract text and attachments
          const completeText = toolCall.parameters.text || '';
          const attachments = toolCall.parameters.attachments || '';

          // Convert single attachment to array for consistent handling
          const attachmentArray = Array.isArray(attachments)
            ? attachments
            : typeof attachments === 'string'
              ? attachments.split(',').map((a) => a.trim())
              : [];

          // Render complete tool content with attachment UI
          contentParts.push(
            <div key={`complete-${match.index}-${index}`} className="space-y-4">
              <ComposioUrlDetector
                content={completeText}
                className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none break-words [&>:first-child]:mt-0 prose-headings:mt-3"
              />
              {attachmentArray && attachmentArray.length > 0 && (
                <ThreadFilesDisplay
                  attachments={attachmentArray}
                  onFileClick={fileViewerHandler}
                  sandboxId={sandboxId}
                  project={project}
                  className="mt-3"
                  rightAlignGrid={true}
                />
              )}
            </div>,
          );
        } else if (toolName === 'think') {
          // Handle think tool specially - extract text content
          const thinkText =
            toolCall.parameters.text || toolCall.parameters.content || '';

          // Check if this think tag is currently streaming
          const isCurrentlyStreaming =
            streamingTextContent &&
            streamingTextContent.includes('<think') &&
            !streamingTextContent.includes('</think>');

          // Render think tool content with thinking UI
          contentParts.push(
            <ThinkingAccordion
              key={`think-${match.index}-${index}`}
              content={thinkText}
              isStreaming={isCurrentlyStreaming}
              streamingContent={
                isCurrentlyStreaming ? streamingTextContent : ''
              }
              streamHookStatus={streamHookStatus}
            />,
          );
        } else {
          const IconComponent = getToolIcon(toolName);

          // Extract primary parameter for display
          let paramDisplay = '';
          if (toolCall.parameters.file_path) {
            paramDisplay = toolCall.parameters.file_path;
          } else if (toolCall.parameters.command) {
            paramDisplay = toolCall.parameters.command;
          } else if (toolCall.parameters.query) {
            paramDisplay = toolCall.parameters.query;
          } else if (toolCall.parameters.url) {
            paramDisplay = toolCall.parameters.url;
          }

          contentParts.push(
            <div key={`tool-${match.index}-${index}`} className="my-1">
              <button
                onClick={() => handleToolClick(messageId, toolName)}
                className="inline-flex items-center gap-1.5 py-1.5 px-2.5 text-xs text-muted-foreground bg-muted/50 hover:bg-muted/80 rounded-full transition-colors cursor-pointer border border-neutral-200"
              >
                <div className="border-[1.5px] bg-muted flex items-center justify-center p-0.5 rounded-sm">
                  <IconComponent className="h-3 w-3 text-black/70 flex-shrink-0 stroke-[2.5px]" />
                </div>
                <span className="text-xs text-foreground/80">
                  {getUserFriendlyToolName(toolName)}
                </span>
                {paramDisplay && (
                  <span
                    className="ml-1 font-mono text-muted-foreground truncate max-w-[200px]"
                    title={paramDisplay}
                  >
                    {paramDisplay}
                  </span>
                )}
              </button>
            </div>,
          );
        }
      });

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text after the last function_calls block
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      if (remainingText.trim()) {
        contentParts.push(
          <ComposioUrlDetector
            key={`md-${lastIndex}`}
            content={remainingText}
            className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none break-words"
          />,
        );
      }
    }

    return contentParts.length > 0 ? (
      contentParts
    ) : (
      <ComposioUrlDetector
        content={content}
        className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none break-words"
      />
    );
  }

  // Fall back to old XML format handling
  const xmlRegex =
    /<(?!inform\b)([a-zA-Z\-_]+)(?:\s+[^>]*)?>(?:[\s\S]*?)<\/\1>|<(?!inform\b)([a-zA-Z\-_]+)(?:\s+[^>]*)?\/>/g;
  let lastIndex = 0;
  const contentParts: React.ReactNode[] = [];
  let match: RegExpExecArray | null = null;

  // If no XML tags found, just return the full content as markdown
  if (!content.match(xmlRegex)) {
    return (
      <ComposioUrlDetector
        content={content}
        className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none break-words"
      />
    );
  }

  while ((match = xmlRegex.exec(content)) !== null) {
    // Add text before the tag as markdown
    if (match.index > lastIndex) {
      const textBeforeTag = content.substring(lastIndex, match.index);
      contentParts.push(
        <ComposioUrlDetector
          key={`md-${lastIndex}`}
          content={textBeforeTag}
          className="text-sm xl:text-base prose prose-sm dark:prose-invert chat-markdown max-w-none inline-block mr-1 break-words"
        />,
      );
    }

    const rawXml = match[0];
    const toolName = match[1] || match[2];
    const toolCallKey = `tool-${match.index}`;

    if (toolName === 'ask') {
      // Extract attachments from the XML attributes
      const attachmentsMatch = rawXml.match(/attachments=["']([^"']*)["']/i);
      const attachments = attachmentsMatch
        ? attachmentsMatch[1].split(',').map((a) => a.trim())
        : [];

      // Extract content from the ask tag
      const contentMatch = rawXml.match(/<ask[^>]*>([\s\S]*?)<\/ask>/i);
      const askContent = contentMatch ? contentMatch[1] : '';

      // Render <ask> tag content with attachment UI (using the helper)
      contentParts.push(
        <div key={`ask-${match.index}`} className="space-y-4">
          <ComposioUrlDetector
            content={askContent}
            className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none break-words [&>:first-child]:mt-0 prose-headings:mt-3"
          />
          {attachments && attachments.length > 0 && (
            <ThreadFilesDisplay
              attachments={attachments}
              onFileClick={fileViewerHandler}
              sandboxId={sandboxId}
              project={project}
              className="mt-3"
              rightAlignGrid={true}
            />
          )}
        </div>,
      );
    } else if (toolName === 'complete') {
      // Extract attachments from the XML attributes
      const attachmentsMatch = rawXml.match(/attachments=["']([^"']*)["']/i);
      const attachments = attachmentsMatch
        ? attachmentsMatch[1].split(',').map((a) => a.trim())
        : [];

      // Extract content from the complete tag
      const contentMatch = rawXml.match(
        /<complete[^>]*>([\s\S]*?)<\/complete>/i,
      );
      const completeContent = contentMatch ? contentMatch[1] : '';

      // Render <complete> tag content with attachment UI (using the helper)
      contentParts.push(
        <div key={`complete-${match.index}`} className="space-y-4">
          <ComposioUrlDetector
            content={completeContent}
            className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none break-words [&>:first-child]:mt-0 prose-headings:mt-3"
          />
          {attachments && attachments.length > 0 && (
            <ThreadFilesDisplay
              attachments={attachments}
              onFileClick={fileViewerHandler}
              sandboxId={sandboxId}
              project={project}
              className="mt-3"
              rightAlignGrid={true}
            />
          )}
        </div>,
      );
    } else if (toolName === 'think') {
      // Extract content from the think tag
      const contentMatch = rawXml.match(/<think[^>]*>([\s\S]*?)<\/think>/i);
      const thinkContent = contentMatch ? contentMatch[1] : '';

      // Check if this think tag is currently streaming
      const isCurrentlyStreaming =
        streamingTextContent &&
        streamingTextContent.includes('<think') &&
        !streamingTextContent.includes('</think>');

      // Render <think> tag content with thinking UI
      contentParts.push(
        <ThinkingAccordion
          key={`think-${match.index}`}
          content={thinkContent}
          isStreaming={isCurrentlyStreaming}
          streamingContent={isCurrentlyStreaming ? streamingTextContent : ''}
          streamHookStatus={streamHookStatus}
        />,
      );
    } else {
      const IconComponent = getToolIcon(toolName);
      const paramDisplay = extractPrimaryParam(toolName, rawXml);

      // Render tool button as a clickable element
      contentParts.push(
        <div key={toolCallKey} className="">
          <button
            onClick={() => handleToolClick(messageId, toolName)}
            className="inline-flex items-center gap-1.5 py-1 px-1 pr-1.5 text-xs text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700/50"
          >
            <div className="border-2 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center p-0.5 rounded-sm border-neutral-400/20 dark:border-neutral-600">
              <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            </div>
            <span className="font-mono text-xs text-foreground/80">
              {getUserFriendlyToolName(toolName)}
            </span>
            {paramDisplay && (
              <span
                className="ml-1 text-muted-foreground truncate max-w-[200px]"
                title={paramDisplay}
              >
                {paramDisplay}
              </span>
            )}
          </button>
        </div>,
      );
    }
    lastIndex = xmlRegex.lastIndex;
  }

  // Add text after the last tag
  if (lastIndex < content.length) {
    contentParts.push(
      <ComposioUrlDetector
        key={`md-${lastIndex}`}
        content={content.substring(lastIndex)}
        className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none break-words"
      />,
    );
  }

  return contentParts;
}

export interface ThreadContentProps {
  messages: UnifiedMessage[];
  streamingTextContent?: string;
  streamingToolCall?: any;
  agentStatus: 'idle' | 'running' | 'connecting' | 'error';
  handleToolClick: (
    assistantMessageId: string | null,
    toolName: string,
  ) => void;
  handleOpenFileViewer: (filePath?: string, filePathList?: string[]) => void;
  readOnly?: boolean;
  visibleMessages?: UnifiedMessage[]; // For playback mode
  streamingText?: string; // For playback mode
  isStreamingText?: boolean; // For playback mode
  currentToolCall?: any; // For playback mode
  streamHookStatus?: string; // Add this prop
  sandboxId?: string; // Add sandboxId prop
  project?: Project; // Add project prop
  debugMode?: boolean; // Add debug mode parameter
  isPreviewMode?: boolean;
  agentName?: string;
  agentAvatar?: React.ReactNode;
  emptyStateComponent?: React.ReactNode; // Add custom empty state component prop
  threadMetadata?: any; // Add thread metadata prop
  // Align content to the left edge of the content area (useful when side panel is open)
  isSidePanelOpen?: boolean;
  // Sidebar state for proper positioning
  leftSidebarState?: 'collapsed' | 'expanded';
  isLeftSidebarExpanded?: boolean;
  onSubmit?: (
    message: string,
    options?: { model_name?: string; enable_thinking?: boolean },
  ) => void; // Add onSubmit prop for retry functionality
  setInputValue?: (value: string) => void;
  isFloatingToolPreviewVisible?: boolean;
}

export const ThreadContent: React.FC<ThreadContentProps> = ({
  messages,
  streamingTextContent = '',
  streamingToolCall,
  agentStatus,
  handleToolClick,
  handleOpenFileViewer,
  readOnly = false,
  visibleMessages,
  streamingText = '',
  isStreamingText = false,
  currentToolCall,
  streamHookStatus = 'idle',
  sandboxId,
  project,
  debugMode = false,
  isPreviewMode = false,
  agentName = 'Helium',
  agentAvatar = <HeliumLogo size={24} />,
  emptyStateComponent,
  threadMetadata,
  isSidePanelOpen = false,
  leftSidebarState = 'collapsed',
  isLeftSidebarExpanded = false,
  onSubmit,
  isFloatingToolPreviewVisible = false,
  setInputValue,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const { session } = useAuth();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const groupContentRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [originalDimensions, setOriginalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [copiedStreamingIdx, setCopiedStreamingIdx] = useState<number | null>(
    null,
  );
  const [streamingFeedback, setStreamingFeedback] = useState<
    'up' | 'down' | null
  >(null);

  // React Query file preloader
  const { preloadFiles } = useFilePreloader();

  const containerClassName = isPreviewMode
    ? 'flex-1 overflow-y-auto scrollbar-thin scrollbar-track-secondary/0 scrollbar-thumb-primary/10 scrollbar-thumb-rounded-full hover:scrollbar-thumb-primary/10 px-6 py-4 pb-86'
    : 'flex-1 overflow-y-auto scrollbar-thin scrollbar-track-secondary/0 scrollbar-thumb-primary/10 scrollbar-thumb-rounded-full hover:scrollbar-thumb-primary/10 px-6 py-4 pb-86 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60';

  // In playback mode, we use visibleMessages instead of messages
  const displayMessages =
    readOnly && visibleMessages ? visibleMessages : messages;

  // Helper function to get agent info robustly
  const getAgentInfo = useCallback(() => {
    // First check thread metadata for is_agent_builder flag
    if (threadMetadata?.is_agent_builder) {
      return {
        name: 'Agent Builder',
        avatar: (
          <div className="h-8 w-8 flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
        ),
      };
    }

    // Then check recent messages for agent info
    const recentAssistantWithAgent = [...displayMessages]
      .reverse()
      .find(
        (msg) =>
          msg.type === 'assistant' &&
          (msg.agents?.avatar || msg.agents?.avatar_color || msg.agents?.name),
      );

    if (recentAssistantWithAgent?.agents?.name === 'Agent Builder') {
      return {
        name: 'Agent Builder',
        avatar: (
          <div className="h-12 w-12 flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
        ),
      };
    }

    if (recentAssistantWithAgent?.agents?.name) {
      const isSunaAgent = recentAssistantWithAgent.agents.name === 'Helium';
      const avatar = recentAssistantWithAgent.agents.avatar ? (
        <>
          {isSunaAgent ? (
            <div className="h-5 w-5 flex items-center justify-center rounded text-xs">
              <HeliumLogo
                size={16}
                animated={
                  agentStatus === 'running' || agentStatus === 'connecting'
                }
              />
            </div>
          ) : (
            <div className="h-8 w-8 flex items-center justify-center">
              <span className="text-lg">
                {recentAssistantWithAgent.agents.avatar}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="h-5 w-5 flex items-center justify-center">
          <HeliumLogo
            size={20}
            animated={agentStatus === 'running' || agentStatus === 'connecting'}
          />
        </div>
      );
      return {
        name: recentAssistantWithAgent.agents.name,
        avatar,
      };
    }
    return {
      name: agentName || 'Helium',
      avatar: (
        <HeliumLogo
          size={20}
          animated={agentStatus === 'running' || agentStatus === 'connecting'}
        />
      ),
    };
  }, [threadMetadata, displayMessages, agentName, agentAvatar, agentStatus]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    const isNearBottom = scrollHeight - scrollTop - clientHeight <= 50;

    setShowScrollButton(isScrolledUp);
    setUserHasScrolled(isScrolledUp);

    // Reset scroll state when user scrolls near bottom
    if (isNearBottom && userHasScrolled) {
      setUserHasScrolled(false);
    }
  };

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior,
        });
        setUserHasScrolled(false);
      }
    }, 100);
  }, []);

  // Check if the last assistant message is in view
  const isLastAssistantMessageInView = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const scrollBottom = scrollTop + clientHeight;
    const threshold = 150; // Allow some buffer
    return scrollHeight - scrollBottom <= threshold;
  }, []);
  
  

  // Auto-scroll to bottom when new messages arrive or agent status changes
  React.useEffect(() => {
    if (agentStatus === 'running' || agentStatus === 'connecting') {
      // Reset scroll state when agent starts working to allow auto-scroll
      setUserHasScrolled(false);
      scrollToBottom('smooth');
    }
  }, [agentStatus, scrollToBottom]);

  React.useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'user') {
        scrollToBottom('smooth');
        // Reset scroll state for new user messages
        setUserHasScrolled(false);
      }
    }
  }, [messages, scrollToBottom]);

  // Auto-scroll behaviors for different streaming scenarios:
  // - Only auto-scroll if user hasn't scrolled up or if last assistant message is in view
  // - Use smooth ease-out animation for better user experience
  // - Allow users to scroll up during streaming
  React.useEffect(() => {
    if (
      streamingTextContent &&
      (agentStatus === 'running' || agentStatus === 'connecting')
    ) {
      // Only auto-scroll if user hasn't scrolled up or if last message is in view
      if (!userHasScrolled || isLastAssistantMessageInView()) {
        scrollToBottom('smooth');
      }
    }
  }, [
    streamingTextContent,
    agentStatus,
    scrollToBottom,
    userHasScrolled,
    isLastAssistantMessageInView,
  ]);

  // Auto-scroll to bottom when streaming text changes in playback mode
  React.useEffect(() => {
    if (streamingText && isStreamingText && readOnly) {
      if (!userHasScrolled || isLastAssistantMessageInView()) {
        scrollToBottom('smooth');
      }
    }
  }, [
    streamingText,
    isStreamingText,
    readOnly,
    scrollToBottom,
    userHasScrolled,
    isLastAssistantMessageInView,
  ]);

  // Auto-scroll to bottom when streaming tool calls change
  React.useEffect(() => {
    if (
      streamingToolCall &&
      (agentStatus === 'running' || agentStatus === 'connecting')
    ) {
      if (!userHasScrolled || isLastAssistantMessageInView()) {
        scrollToBottom('smooth');
      }
    }
  }, [
    streamingToolCall,
    agentStatus,
    scrollToBottom,
    userHasScrolled,
    isLastAssistantMessageInView,
  ]);

  // Auto-scroll to bottom when new tool calls are added
  React.useEffect(() => {
    if (
      currentToolCall &&
      (agentStatus === 'running' || agentStatus === 'connecting')
    ) {
      if (!userHasScrolled || isLastAssistantMessageInView()) {
        scrollToBottom('smooth');
      }
    }
  }, [
    currentToolCall,
    agentStatus,
    scrollToBottom,
    userHasScrolled,
    isLastAssistantMessageInView,
  ]);

  // Auto-scroll to bottom when streaming starts
  React.useEffect(() => {
    if (streamHookStatus === 'streaming') {
      // Reset scroll state when streaming starts to allow auto-scroll
      setUserHasScrolled(false);
      if (!userHasScrolled || isLastAssistantMessageInView()) {
        scrollToBottom('smooth');
      }
    }
  }, [
    streamHookStatus,
    scrollToBottom,
    userHasScrolled,
    isLastAssistantMessageInView,
  ]);

  // Auto-scroll when response generation completes or when chat history loads
  React.useEffect(() => {
    // Scroll when agent status changes from 'running' to 'idle' (completed)
    // or when messages first load and user hasn't scrolled up
    const shouldScroll = 
      (agentStatus === 'idle' && messages.some(m => m.type === 'assistant')) || 
      (messages.length > 0 && 
       (!messagesContainerRef.current?.scrollTop || 
        messagesContainerRef.current.scrollHeight - messagesContainerRef.current.clientHeight < 100));
    
    if (shouldScroll) {
      scrollToBottom('smooth');
    }
  }, [agentStatus, messages, scrollToBottom]);

  // Complete auto-scroll strategy:
  // 1. Smooth scroll for user interactions (new messages, status changes)
  // 2. Conditional auto-scroll during streaming - only if user hasn't scrolled up
  // 3. Allow users to scroll up during streaming for better UX
  // 4. Use smooth ease-out animation for all auto-scrolls

  // Preload all message attachments when messages change or sandboxId is provided
  React.useEffect(() => {
    if (!sandboxId) return;

    // Extract all file attachments from messages
    const allAttachments: string[] = [];

    displayMessages.forEach((message) => {
      if (message.type === 'user') {
        try {
          const content =
            typeof message.content === 'string' ? message.content : '';
          const attachmentsMatch = content.match(/\[Uploaded File: (.*?)\]/g);
          if (attachmentsMatch) {
            attachmentsMatch.forEach((match) => {
              const pathMatch = match.match(/\[Uploaded File: (.*?)\]/);
              if (pathMatch && pathMatch[1]) {
                allAttachments.push(pathMatch[1]);
              }
            });
          }
        } catch (e) {
          console.error('Error parsing message attachments:', e);
        }
      }
    });

    // Use React Query preloading if we have attachments AND a valid token
    if (allAttachments.length > 0 && session?.access_token) {
      // Preload files with React Query in background
      preloadFiles(sandboxId, allAttachments).catch((err) => {
        console.error('React Query preload failed:', err);
      });
    }
  }, [displayMessages, sandboxId, session?.access_token, preloadFiles]);

  return (
    <>
      {displayMessages.length === 0 &&
      !streamingTextContent &&
      !streamingToolCall &&
      !streamingText &&
      !currentToolCall &&
      agentStatus === 'idle' ? (
        // Render empty state outside scrollable container
        <div className="flex-1 min-h-[60vh] flex items-center justify-center">
          {emptyStateComponent || (
            <div className="text-center text-muted-foreground">
              {readOnly
                ? 'No messages to display.'
                : 'Send a message to start.'}
            </div>
          )}
        </div>
      ) : (
        // Render scrollable content container
        <div
          ref={messagesContainerRef}
          className={containerClassName}
          onScroll={handleScroll}
        >
          <div
            className={
              isSidePanelOpen
                ? 'mx-auto max-w-3xl md:px-8 min-w-0'
                : 'mx-auto max-w-3xl md:px-8 min-w-0'
            }
          >
            <div className="space-y-12 min-w-0">
              {(() => {
                type MessageGroup = {
                  type: 'user' | 'assistant_group';
                  messages: UnifiedMessage[];
                  key: string;
                };
                const groupedMessages: MessageGroup[] = [];
                let currentGroup: MessageGroup | null = null;
                let assistantGroupCounter = 0; // Counter for assistant groups

                displayMessages.forEach((message, index) => {
                  const messageType = message.type;
                  const key = message.message_id || `msg-${index}`;

                  if (messageType === 'user') {
                    // Finalize any existing assistant group
                    if (currentGroup) {
                      groupedMessages.push(currentGroup);
                      currentGroup = null;
                    }
                    // Create a new user message group
                    groupedMessages.push({
                      type: 'user',
                      messages: [message],
                      key,
                    });
                  } else if (
                    messageType === 'assistant' ||
                    messageType === 'tool' ||
                    messageType === 'browser_state'
                  ) {
                    // Check if we can add to existing assistant group (same agent)
                    const canAddToExistingGroup =
                      currentGroup &&
                      currentGroup.type === 'assistant_group' &&
                      (() => {
                        // For assistant messages, check if agent matches
                        if (messageType === 'assistant') {
                          const lastAssistantMsg =
                            currentGroup.messages.findLast(
                              (m) => m.type === 'assistant',
                            );
                          if (!lastAssistantMsg) return true; // No assistant message yet, can add

                          // Compare agent info - both null/undefined should be treated as same (default agent)
                          const currentAgentId = message.agent_id;
                          const lastAgentId = lastAssistantMsg.agent_id;
                          return currentAgentId === lastAgentId;
                        }
                        // For tool/browser_state messages, always add to current group
                        return true;
                      })();

                    if (canAddToExistingGroup) {
                      // Add to existing assistant group
                      currentGroup?.messages.push(message);
                    } else {
                      // Finalize any existing group
                      if (currentGroup) {
                        groupedMessages.push(currentGroup);
                      }
                      // Create a new assistant group with a group-level key
                      assistantGroupCounter++;
                      currentGroup = {
                        type: 'assistant_group',
                        messages: [message],
                        key: `assistant-group-${assistantGroupCounter}`,
                      };
                    }
                  } else if (messageType !== 'status') {
                    // For any other message types, finalize current group
                    if (currentGroup) {
                      groupedMessages.push(currentGroup);
                      currentGroup = null;
                    }
                  }
                });

                // Finalize any remaining group
                if (currentGroup) {
                  groupedMessages.push(currentGroup);
                }

                // Merge consecutive assistant groups
                const mergedGroups: MessageGroup[] = [];
                let currentMergedGroup: MessageGroup | null = null;

                groupedMessages.forEach((group) => {
                  if (group.type === 'assistant_group') {
                    if (
                      currentMergedGroup &&
                      currentMergedGroup.type === 'assistant_group'
                    ) {
                      // Merge with the current group
                      currentMergedGroup.messages.push(...group.messages);
                    } else {
                      // Finalize previous group if it exists
                      if (currentMergedGroup) {
                        mergedGroups.push(currentMergedGroup);
                      }
                      // Start new merged group
                      currentMergedGroup = { ...group };
                    }
                  } else {
                    // Finalize current merged group if it exists
                    if (currentMergedGroup) {
                      mergedGroups.push(currentMergedGroup);
                      currentMergedGroup = null;
                    }
                    // Add non-assistant group as-is
                    mergedGroups.push(group);
                  }
                });

                // Finalize any remaining merged group
                if (currentMergedGroup) {
                  mergedGroups.push(currentMergedGroup);
                }

                // Use merged groups instead of original grouped messages
                const finalGroupedMessages = mergedGroups;

                // Handle streaming content - only add to existing group or create new one if needed
                if (streamingTextContent) {
                  const lastGroup = finalGroupedMessages.at(-1);
                  if (!lastGroup || lastGroup.type === 'user') {
                    // Create new assistant group for streaming content
                    assistantGroupCounter++;
                    finalGroupedMessages.push({
                      type: 'assistant_group',
                      messages: [
                        {
                          content: streamingTextContent,
                          type: 'assistant',
                          message_id: 'streamingTextContent',
                          metadata: 'streamingTextContent',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          is_llm_message: true,
                          thread_id: 'streamingTextContent',
                          sequence: Infinity,
                        },
                      ],
                      key: `assistant-group-${assistantGroupCounter}-streaming`,
                    });
                  } else if (lastGroup.type === 'assistant_group') {
                    // Only add streaming content if it's not already represented in the last message
                    const lastMessage =
                      lastGroup.messages[lastGroup.messages.length - 1];
                    if (lastMessage.message_id !== 'streamingTextContent') {
                      lastGroup.messages.push({
                        content: streamingTextContent,
                        type: 'assistant',
                        message_id: 'streamingTextContent',
                        metadata: 'streamingTextContent',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_llm_message: true,
                        thread_id: 'streamingTextContent',
                        sequence: Infinity,
                      });
                    }
                  }
                }

                return finalGroupedMessages.map((group, groupIndex) => {
                  if (group.type === 'user') {
                    const message = group.messages[0];
                    const messageContent = (() => {
                      try {
                        const parsed = safeJsonParse<ParsedContent>(
                          message.content,
                          { content: message.content },
                        );
                        return parsed.content || message.content;
                      } catch {
                        return message.content;
                      }
                    })();

                    // In debug mode, display raw message content
                    if (debugMode) {
                      return (
                        <div key={group.key} className="flex justify-end">
                          <div className="flex max-w-[85%] rounded-2xl bg-card px-4 py-3 break-words overflow-hidden">
                            <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto min-w-0 flex-1">
                              {message.content}
                            </pre>
                          </div>
                        </div>
                      );
                    }

                    // Extract attachments from the message content
                    const attachmentsMatch = messageContent.match(
                      /\[Uploaded File: (.*?)\]/g,
                    );
                    const attachments = attachmentsMatch
                      ? attachmentsMatch
                          .map((match: string) => {
                            const pathMatch = match.match(
                              /\[Uploaded File: (.*?)\]/,
                            );
                            return pathMatch ? pathMatch[1] : null;
                          })
                          .filter(Boolean)
                      : [];

                    // Remove attachment info from the message content
                    const cleanContent = messageContent
                      .replace(/\[Uploaded File: .*?\]/g, '')
                      .trim();

                    return (
                      <div
                        key={group.key}
                        className="flex justify-end group transition-all duration-300 ease-in-out w-full"
                        data-message-id={group.key}
                      >
                        <div className="flex flex-col gap-1 items-end max-w-[85%]">
                          <div className={cn('flex w-fit')}>
                            <div
                              style={{
                                background: '#FFFFFF',
                                color: 'black',
                              }}
                              className="break-words overflow-hidden border border-black/5 rounded-l-2xl rounded-tr-2xl rounded-br-sm px-4 py-2 w-full"
                            >
                              <div className="space-y-4 min-w-0 flex-1">
                                {cleanContent && (
                                  <div
                                    className={cn(
                                      'message-content',
                                      editingMessageId === group.key &&
                                        'outline-none ring-0 border-0 shadow-none',
                                    )}
                                    contentEditable={
                                      editingMessageId === group.key
                                        ? 'true'
                                        : undefined
                                    }
                                    suppressContentEditableWarning
                                    onInput={(e) => {
                                      setEditValue(
                                        (e.target as HTMLElement).textContent ||
                                          '',
                                      );
                                    }}
                                    style={
                                      editingMessageId === group.key &&
                                      originalDimensions
                                        ? {
                                            minWidth: `${originalDimensions.width}px`,
                                            minHeight: `${originalDimensions.height}px`,
                                            maxHeight: '300px',
                                            overflowY: 'auto',
                                          }
                                        : undefined
                                    }
                                  >
                                    <ComposioUrlDetector
                                      content={cleanContent}
                                      className="text-sm prose prose-sm chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere text-black xl:text-base"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Files Display - Below the message content */}
                          {attachments && attachments.length > 0 && (
                            <div className="w-full flex justify-end">
                              <div className="max-w-[85%]">
                                <ThreadFilesDisplay
                                  attachments={attachments as string[]}
                                  onFileClick={handleOpenFileViewer}
                                  sandboxId={sandboxId}
                                  project={project}
                                  className="mt-1"
                                  rightAlignGrid={false}
                                />
                              </div>
                            </div>
                          )}

                          {/* Copy and Edit buttons for user prompt - OUTSIDE the message box */}
                          {!readOnly && (
                            <div className="w-full flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out">
                              <div className="max-w-[85%] flex justify-end">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-accent cursor-pointer text-foreground/80"
                                      onClick={() => {
                                        navigator.clipboard.writeText(
                                          cleanContent,
                                        );
                                        setCopiedPromptIdx(groupIndex);
                                        toast.success('Copied to clipboard');
                                        setTimeout(
                                          () => setCopiedPromptIdx(null),
                                          1500,
                                        );
                                      }}
                                    >
                                      {copiedPromptIdx === groupIndex ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy prompt</p>
                                  </TooltipContent>
                                </Tooltip>
                                {editingMessageId === group.key ? (
                                  // Send and Cancel buttons when editing
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-foreground/80"
                                          onClick={() => {
                                            const messageElement =
                                              document.querySelector(
                                                `[data-message-id="${group.key}"] .message-content`,
                                              ) as HTMLElement;

                                            if (messageElement && onSubmit) {
                                              const newContent =
                                                messageElement.textContent ||
                                                '';
                                              messageElement.contentEditable =
                                                'false';
                                              setEditingMessageId(null);
                                              setOriginalDimensions(null);
                                              onSubmit(newContent);
                                              toast.success('Message sent');
                                            }
                                          }}
                                          disabled={editValue.trim() === ''}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Send edit</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 hover:bg-accent cursor-pointer text-foreground/80"
                                          onClick={() => {
                                            // Cancel editing and restore original content
                                            const messageElement =
                                              document.querySelector(
                                                `[data-message-id="${group.key}"] .message-content`,
                                              ) as HTMLElement;
                                            if (messageElement) {
                                              messageElement.textContent =
                                                cleanContent;
                                              messageElement.contentEditable =
                                                'false';
                                              setEditingMessageId(null);
                                              setOriginalDimensions(null);
                                              toast.info('Edit cancelled');
                                            }
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Cancel edit</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-accent cursor-pointer text-foreground/80"
                                        onClick={() => {
                                          // Start editing mode
                                          setEditingMessageId(group.key);
                                          setEditValue(cleanContent);
                                          const messageElement =
                                            document.querySelector(
                                              `[data-message-id="${group.key}"] .message-content`,
                                            ) as HTMLElement;
                                          if (messageElement) {
                                            // Capture original dimensions before making editable
                                            const rect =
                                              messageElement.getBoundingClientRect();
                                            setOriginalDimensions({
                                              width: rect.width,
                                              height: rect.height,
                                            });

                                            messageElement.contentEditable =
                                              'true';
                                            messageElement.focus();
                                            // Select all text
                                            const range =
                                              document.createRange();
                                            range.selectNodeContents(
                                              messageElement,
                                            );
                                            const selection =
                                              window.getSelection();
                                            selection?.removeAllRanges();
                                            selection?.addRange(range);
                                            toast.info('Edit mode enabled');
                                          }
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit prompt</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else if (group.type === 'assistant_group') {
                    return (
                      <div
                        key={group.key}
                        ref={
                          groupIndex === groupedMessages.length - 1
                            ? latestMessageRef
                            : null
                        }
                      >
                        <div className="flex flex-col gap-3">
                          {/* Message content - ALL messages in the group */}
                          <div className="flex max-w-[90%] text-sm break-words overflow-hidden">
                            <div className="space-y-4 min-w-0 flex-1">
                              {(() => {
                                // In debug mode, just show raw messages content
                                if (debugMode) {
                                  return group.messages.map(
                                    (message, msgIndex) => {
                                      const msgKey =
                                        message.message_id ||
                                        `raw-msg-${msgIndex}`;
                                      return (
                                        <div key={msgKey} className="mb-6">
                                          <div className="text-xs font-medium text-muted-foreground mb-1">
                                            Type: {message.type} | ID:{' '}
                                            {message.message_id || 'no-id'}
                                          </div>
                                          <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                            {JSON.stringify(
                                              message.content,
                                              null,
                                              2,
                                            )}
                                          </pre>
                                          {message.metadata &&
                                            message.metadata !== '{}' && (
                                              <div className="mt-4">
                                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                                  Metadata:
                                                </div>
                                                <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                                  {JSON.stringify(
                                                    message.metadata,
                                                    null,
                                                    2,
                                                  )}
                                                </pre>
                                              </div>
                                            )}
                                        </div>
                                      );
                                    },
                                  );
                                }

                                const toolResultsMap = new Map<
                                  string | null,
                                  UnifiedMessage[]
                                >();
                                group.messages.forEach((msg) => {
                                  if (msg.type === 'tool') {
                                    const meta = safeJsonParse<ParsedMetadata>(
                                      msg.metadata,
                                      {},
                                    );
                                    const assistantId =
                                      meta.assistant_message_id || null;
                                    if (!toolResultsMap.has(assistantId)) {
                                      toolResultsMap.set(assistantId, []);
                                    }
                                    toolResultsMap.get(assistantId)?.push(msg);
                                  }
                                });

                                const elements: React.ReactNode[] = [];
                                let assistantMessageCount = 0; // Move this outside the loop

                                group.messages.forEach((message, msgIndex) => {
                                  if (message.type === 'assistant') {
                                    const parsedContent =
                                      safeJsonParse<ParsedContent>(
                                        message.content,
                                        {},
                                      );
                                    const msgKey =
                                      message.message_id ||
                                      `submsg-assistant-${msgIndex}`;

                                    if (!parsedContent.content) return;

                                    const renderedContent =
                                      renderMarkdownContent(
                                        parsedContent.content,
                                        handleToolClick,
                                        message.message_id,
                                        handleOpenFileViewer,
                                        sandboxId,
                                        project,
                                        debugMode,
                                        streamingTextContent,
                                        streamHookStatus,
                                      );

                                    elements.push(
                                      <div
                                        key={msgKey}
                                        className={
                                          assistantMessageCount > 0
                                            ? 'mt-1'
                                            : ''
                                        }
                                      >
                                        <div
                                          ref={(el) => {
                                            if (el) {
                                              groupContentRefs.current[
                                                groupIndex
                                              ] = el;
                                            }
                                          }}
                                          className="text-sm xl:text-base leading-none prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-hidden"
                                        >
                                          {renderedContent}
                                        </div>
                                      </div>,
                                    );

                                    assistantMessageCount++; // Increment after adding the element
                                  }
                                });

                                return elements;
                              })()}
                              {/* Action Icons */}
                              {!readOnly &&
                                !(
                                  groupIndex ===
                                    finalGroupedMessages.length - 1 &&
                                  (streamHookStatus === 'streaming' ||
                                    streamHookStatus === 'connecting')
                                ) &&
                                group.messages.some(
                                  (msg) => msg.type === 'assistant',
                                ) && (
                                  <div className="flex items-center justify-between pt-2 gap-1 border-t border-border/50 px-3 pb-0">
                                    {/* Left side - Agent info */}
                                    <div className="flex items-center gap-1.5">
                                      <HeliumLogo size={20} />
                                      <span className="text-base font-semibold text-foreground/80">
                                        Helium
                                      </span>
                                    </div>

                                        return (
                                            <div key={group.key} className="space-y-3">
                                                {/* All file attachments rendered outside message bubble */}
                                                {renderStandaloneAttachments(attachments as string[], handleOpenFileViewer, sandboxId, project, true)}
                                                
                                                <div className="flex justify-end">
                                                    <div className="flex max-w-[85%] rounded-3xl rounded-br-lg bg-card border px-4 py-3 break-words overflow-hidden">
                                                        <div className="space-y-3 min-w-0 flex-1">
                                                            {cleanContent && (
                                                                <ComposioUrlDetector content={cleanContent} className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere" />
                                                            )}

                                                            {/* Use the helper function to render regular (non-spreadsheet) attachments */}
                                                            {renderAttachments(attachments as string[], handleOpenFileViewer, sandboxId, project)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (group.type === 'assistant_group') {
                                        // Get agent_id from the first assistant message in this group
                                        const firstAssistantMsg = group.messages.find(m => m.type === 'assistant');
                                        const groupAgentId = firstAssistantMsg?.agent_id;
                                        
                                        return (
                                            <div key={group.key} ref={groupIndex === groupedMessages.length - 1 ? latestMessageRef : null}>
                                                <div className="flex flex-col gap-2">
                                                    {/* <div className="flex items-center">
                                                        <div className="rounded-md flex items-center justify-center relative">
                                                            {groupAgentId ? (
                                                                <AgentAvatar agentId={groupAgentId} size={20} className="h-5 w-5" />
                                                            ) : (
                                                                getAgentInfo().avatar
                                                            )}
                                                        </div>
                                                        <p className='ml-2 text-sm text-muted-foreground'>
                                                            {groupAgentId ? (
                                                                <AgentName agentId={groupAgentId} fallback={getAgentInfo().name} />
                                                            ) : (
                                                                getAgentInfo().name
                                                            )}
                                                        </p>
                                                    </div> */}

                                                    {/* Message content - ALL messages in the group */}
                                                    <div className="flex max-w-[90%] text-sm break-words overflow-hidden">
                                                        <div className="space-y-2 min-w-0 flex-1">
                                                            {(() => {
                                                                // In debug mode, just show raw messages content
                                                                if (debugMode) {
                                                                    return group.messages.map((message, msgIndex) => {
                                                                        const msgKey = message.message_id || `raw-msg-${msgIndex}`;
                                                                        return (
                                                                            <div key={msgKey} className="mb-4">
                                                                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                                                                    Type: {message.type} | ID: {message.message_id || 'no-id'}
                                                                                </div>
                                                                                <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                                                                    {JSON.stringify(message.content, null, 2)}
                                                                                </pre>
                                                                                {message.metadata && message.metadata !== '{}' && (
                                                                                    <div className="mt-2">
                                                                                        <div className="text-xs font-medium text-muted-foreground mb-1">
                                                                                            Metadata:
                                                                                        </div>
                                                                                        <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                                                                            {JSON.stringify(message.metadata, null, 2)}
                                                                                        </pre>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    });
                                                                }

                                                                const toolResultsMap = new Map<string | null, UnifiedMessage[]>();
                                                                group.messages.forEach(msg => {
                                                                    if (msg.type === 'tool') {
                                                                        const meta = safeJsonParse<ParsedMetadata>(msg.metadata, {});
                                                                        const assistantId = meta.assistant_message_id || null;
                                                                        if (!toolResultsMap.has(assistantId)) {
                                                                            toolResultsMap.set(assistantId, []);
                                                                        }
                                                                        toolResultsMap.get(assistantId)?.push(msg);
                                                                    }
                                                                });

                                                                const elements: React.ReactNode[] = [];
                                                                let assistantMessageCount = 0; // Move this outside the loop

                                                                group.messages.forEach((message, msgIndex) => {
                                                                    if (message.type === 'assistant') {
                                                                        const parsedContent = safeJsonParse<ParsedContent>(message.content, {});
                                                                        const msgKey = message.message_id || `submsg-assistant-${msgIndex}`;

                                                                        if (!parsedContent.content) return;

                                                                        const renderedContent = renderMarkdownContent(
                                                                            parsedContent.content,
                                                                            handleToolClick,
                                                                            message.message_id,
                                                                            handleOpenFileViewer,
                                                                            sandboxId,
                                                                            project,
                                                                            debugMode
                                                                        );

                                                                        elements.push(
                                                                            <div key={msgKey} className={assistantMessageCount > 0 ? "mt-4" : ""}>
                                                                                <div className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-hidden">
                                                                                    {renderedContent}
                                                                                </div>
                                                                            </div>
                                                                        );

                                                                        assistantMessageCount++; // Increment after adding the element
                                                                    }
                                                                });

                                                                return elements;
                                                            })()}

                                                            {groupIndex === finalGroupedMessages.length - 1 && !readOnly && (streamHookStatus === 'streaming' || streamHookStatus === 'connecting') && (
                                                                <div className="mt-2">
                                                                    {(() => {
                                                                        // In debug mode, show raw streaming content
                                                                        if (debugMode && streamingTextContent) {
                                                                            return (
                                                                                <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                                                                    {streamingTextContent}
                                                                                </pre>
                                                                            );
                                                                        }

                                                                        let detectedTag: string | null = null;
                                                                        let tagStartIndex = -1;
                                                                        if (streamingTextContent) {
                                                                            // First check for new format
                                                                            const functionCallsIndex = streamingTextContent.indexOf('<function_calls>');
                                                                            if (functionCallsIndex !== -1) {
                                                                                detectedTag = 'function_calls';
                                                                                tagStartIndex = functionCallsIndex;
                                                                            } else {
                                                                                // Fall back to old format detection
                                                                                for (const tag of HIDE_STREAMING_XML_TAGS) {
                                                                                    const openingTagPattern = `<${tag}`;
                                                                                    const index = streamingTextContent.indexOf(openingTagPattern);
                                                                                    if (index !== -1) {
                                                                                        detectedTag = tag;
                                                                                        tagStartIndex = index;
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                        }


                                                                        const textToRender = streamingTextContent || '';
                                                                        const textBeforeTag = detectedTag ? textToRender.substring(0, tagStartIndex) : textToRender;
                                                                        const showCursor =
                                                                          (streamHookStatus ===
                                                                            'streaming' ||
                                                                            streamHookStatus ===
                                                                              'connecting') &&
                                                                          !detectedTag;

                                                                        return (
                                                                            <>
                                                                                {textBeforeTag && (
                                                                                    <ComposioUrlDetector content={textBeforeTag} className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere" />
                                                                                )}
                                                                                {showCursor && (
                                                                                    <span className="inline-block h-4 w-0.5 bg-primary ml-0.5 -mb-1 animate-pulse" />
                                                                                )}

                                                                                {detectedTag && (
                                                                                    <ShowToolStream
                                                                                        content={textToRender.substring(tagStartIndex)}
                                                                                        messageId={visibleMessages && visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1].message_id : "playback-streaming"}
                                                                                        onToolClick={handleToolClick}
                                                                                        showExpanded={true}
                                                                                        startTime={Date.now()}
                                                                                    />
                                                                                )}


                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}

                                                            {/* For playback mode, show streaming text and tool calls */}
                                                            {readOnly && groupIndex === finalGroupedMessages.length - 1 && isStreamingText && (
                                                                <div className="mt-2">
                                                                    {(() => {
                                                                        let detectedTag: string | null = null;
                                                                        let tagStartIndex = -1;
                                                                        if (streamingText) {
                                                                            // First check for new format
                                                                            const functionCallsIndex = streamingText.indexOf('<function_calls>');
                                                                            if (functionCallsIndex !== -1) {
                                                                                detectedTag = 'function_calls';
                                                                                tagStartIndex = functionCallsIndex;
                                                                            } else {
                                                                                // Fall back to old format detection
                                                                                for (const tag of HIDE_STREAMING_XML_TAGS) {
                                                                                    const openingTagPattern = `<${tag}`;
                                                                                    const index = streamingText.indexOf(openingTagPattern);
                                                                                    if (index !== -1) {
                                                                                        detectedTag = tag;
                                                                                        tagStartIndex = index;
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                        }

                                                                        const textToRender = streamingText || '';
                                                                        const textBeforeTag = detectedTag ? textToRender.substring(0, tagStartIndex) : textToRender;
                                                                        const showCursor = isStreamingText && !detectedTag;

                                                                        return (
                                                                            <>
                                                                                {/* In debug mode, show raw streaming content */}
                                                                                {debugMode && streamingText ? (
                                                                                    <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                                                                        {streamingText}
                                                                                    </pre>
                                                                                ) : (
                                                                                    <>
                                                                                        {textBeforeTag && (
                                                                                            <ComposioUrlDetector content={textBeforeTag} className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere" />
                                                                                        )}
                                                                                        {showCursor && (
                                                                                            <span className="inline-block h-4 w-0.5 bg-primary ml-0.5 -mb-1 animate-pulse" />
                                                                                        )}

                                                                                        {detectedTag && (
                                                                                            <ShowToolStream
                                                                                                content={textToRender.substring(tagStartIndex)}
                                                                                                messageId="streamingTextContent"
                                                                                                onToolClick={handleToolClick}
                                                                                                showExpanded={true}
                                                                                                startTime={Date.now()} // Tool just started now
                                                                                            />
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                    </div>
                                                    <div className="flex items-center">
                                                        <div className="rounded-md flex items-center justify-center relative">
                                                            {groupAgentId ? (
                                                                <AgentAvatar agentId={groupAgentId} size={20} className="h-5 w-5" />
                                                            ) : (
                                                                getAgentInfo().avatar
                                                            )}
                                                        </div>
                                                        <p className='ml-2 text-sm text-muted-foreground'>
                                                            {groupAgentId ? (
                                                                <AgentName agentId={groupAgentId} fallback={getAgentInfo().name} />
                                                            ) : (
                                                                getAgentInfo().name
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                });
                            })()}
                            {((agentStatus === 'running' || agentStatus === 'connecting') && !streamingTextContent &&
                                !readOnly &&
                                (messages.length === 0 || messages[messages.length - 1].type === 'user')) && (
                                    <div ref={latestMessageRef} className='w-full h-22 rounded'>
                                        <div className="flex flex-col gap-2">
                                            {/* Logo positioned above the loader */}
                                            <div className="flex items-center">
                                                <div className="rounded-md flex items-center justify-center">
                                                    {getAgentInfo().avatar}
                                                </div>
                                                <p className='ml-2 text-sm text-muted-foreground'>
                                                    {getAgentInfo().name}
                                                </p>
                                            </div>

                                            {/* Loader content */}
                                            <div className="space-y-2 w-full h-12">
                                                <AgentLoader />
                                            </div>
                                        </div>
                                    </div>
                                  </div>
                                )}

                              {groupIndex === finalGroupedMessages.length - 1 &&
                                !readOnly &&
                                (streamHookStatus === 'streaming' ||
                                  streamHookStatus === 'connecting') && (
                                  <div className="mt-4">
                                    {(() => {
                                      // In debug mode, show raw streaming content
                                      if (debugMode && streamingTextContent) {
                                        return (
                                          <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                            {streamingTextContent}
                                          </pre>
                                        );
                                      }

                                      let detectedTag: string | null = null;
                                      let tagStartIndex = -1;
                                      let thinkTagEndIndex = -1;
                                      let hasThinkTag = false;

                                      if (streamingTextContent) {
                                        // First check for new format
                                        const functionCallsIndex =
                                          streamingTextContent.indexOf(
                                            '<function_calls>',
                                          );
                                        if (functionCallsIndex !== -1) {
                                          detectedTag = 'function_calls';
                                          tagStartIndex = functionCallsIndex;
                                        } else {
                                          // Check for think tag specifically
                                          const thinkStartIndex =
                                            streamingTextContent.indexOf(
                                              '<think',
                                            );
                                          if (thinkStartIndex !== -1) {
                                            hasThinkTag = true;
                                            detectedTag = 'think';
                                            tagStartIndex = thinkStartIndex;

                                            // Find the end of think tag
                                            const thinkEndIndex =
                                              streamingTextContent.indexOf(
                                                '</think>',
                                              );
                                            if (thinkEndIndex !== -1) {
                                              thinkTagEndIndex =
                                                thinkEndIndex + 7; // +7 for '</think>'
                                            }
                                          } else {
                                            // Fall back to old format detection for other tags
                                            for (const tag of HIDE_STREAMING_XML_TAGS) {
                                              if (tag === 'think') continue; // Skip think as we already handled it
                                              const openingTagPattern = `<${tag}`;
                                              const index =
                                                streamingTextContent.indexOf(
                                                  openingTagPattern,
                                                );
                                              if (index !== -1) {
                                                detectedTag = tag;
                                                tagStartIndex = index;
                                                break;
                                              }
                                            }
                                          }
                                        }
                                      }

                                      const textToRender =
                                        streamingTextContent || '';
                                      const textBeforeTag = detectedTag
                                        ? textToRender.substring(
                                            0,
                                            tagStartIndex,
                                          )
                                        : textToRender;

                                      // If think tag is complete, show content after it
                                      const textAfterThink =
                                        hasThinkTag && thinkTagEndIndex > 0
                                          ? textToRender.substring(
                                              thinkTagEndIndex,
                                            )
                                          : '';

                                      const showCursor =
                                        (streamHookStatus === 'streaming' ||
                                          streamHookStatus === 'connecting') &&
                                        !detectedTag &&
                                        !textAfterThink;

                                      return (
                                        <>
                                          {textBeforeTag && (
                                            <ComposioUrlDetector
                                              content={textBeforeTag}
                                              className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere"
                                            />
                                          )}
                                          {showCursor && <ThinkingAnimation />}

                                          {detectedTag &&
                                          detectedTag === 'think' ? (
                                            <ThinkingAccordion
                                              content=""
                                              isStreaming={
                                                streamHookStatus ===
                                                  'streaming' &&
                                                !textToRender.includes(
                                                  '</think>',
                                                )
                                              } // Only streaming if actively streaming and no closing tag
                                              streamingContent={textToRender.substring(
                                                tagStartIndex,
                                              )}
                                              streamHookStatus={
                                                streamHookStatus
                                              }
                                            />
                                          ) : (
                                            detectedTag && (
                                              <ShowToolStream
                                                content={textToRender.substring(
                                                  tagStartIndex,
                                                )}
                                                messageId={
                                                  visibleMessages &&
                                                  visibleMessages.length > 0
                                                    ? visibleMessages[
                                                        visibleMessages.length -
                                                          1
                                                      ].message_id
                                                    : 'playback-streaming'
                                                }
                                                onToolClick={handleToolClick}
                                                showExpanded={true}
                                                startTime={Date.now()}
                                              />
                                            )
                                          )}

                                          {/* Show content after think tag if it exists */}
                                          {textAfterThink && (
                                            <ComposioUrlDetector
                                              content={textAfterThink}
                                              className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere"
                                            />
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}

                              {/* For playback mode, show streaming text and tool calls */}
                              {readOnly &&
                                groupIndex ===
                                  finalGroupedMessages.length - 1 &&
                                isStreamingText && (
                                  <div className="mt-4">
                                    {(() => {
                                      let detectedTag: string | null = null;
                                      let tagStartIndex = -1;
                                      let thinkTagEndIndex = -1;
                                      let hasThinkTag = false;

                                      if (streamingText) {
                                        // First check for new format
                                        const functionCallsIndex =
                                          streamingText.indexOf(
                                            '<function_calls>',
                                          );
                                        if (functionCallsIndex !== -1) {
                                          detectedTag = 'function_calls';
                                          tagStartIndex = functionCallsIndex;
                                        } else {
                                          // Check for think tag specifically
                                          const thinkStartIndex =
                                            streamingText.indexOf('<think');
                                          if (thinkStartIndex !== -1) {
                                            hasThinkTag = true;
                                            detectedTag = 'think';
                                            tagStartIndex = thinkStartIndex;

                                            // Find the end of think tag
                                            const thinkEndIndex =
                                              streamingText.indexOf('</think>');
                                            if (thinkEndIndex !== -1) {
                                              thinkTagEndIndex =
                                                thinkEndIndex + 7; // +7 for '</think>'
                                            }
                                          } else {
                                            // Fall back to old format detection for other tags
                                            for (const tag of HIDE_STREAMING_XML_TAGS) {
                                              if (tag === 'think') continue; // Skip think as we already handled it
                                              const openingTagPattern = `<${tag}`;
                                              const index =
                                                streamingText.indexOf(
                                                  openingTagPattern,
                                                );
                                              if (index !== -1) {
                                                detectedTag = tag;
                                                tagStartIndex = index;
                                                break;
                                              }
                                            }
                                          }
                                        }
                                      }

                                      const textToRender = streamingText || '';
                                      const textBeforeTag = detectedTag
                                        ? textToRender.substring(
                                            0,
                                            tagStartIndex,
                                          )
                                        : textToRender;

                                      // If think tag is complete, show content after it
                                      const textAfterThink =
                                        hasThinkTag && thinkTagEndIndex > 0
                                          ? textToRender.substring(
                                              thinkTagEndIndex,
                                            )
                                          : '';

                                      const showCursor =
                                        isStreamingText &&
                                        !detectedTag &&
                                        !textAfterThink;

                                      return (
                                        <>
                                          {/* In debug mode, show raw streaming content */}
                                          {debugMode && streamingText ? (
                                            <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto p-2 border border-border rounded-md bg-muted/30">
                                              {streamingText}
                                            </pre>
                                          ) : (
                                            <>
                                              {textBeforeTag && (
                                                <ComposioUrlDetector
                                                  content={textBeforeTag}
                                                  className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere"
                                                />
                                              )}
                                              {showCursor && (
                                                <ThinkingAnimation />
                                              )}

                                              {detectedTag &&
                                              detectedTag === 'think' ? (
                                                <ThinkingAccordion
                                                  content=""
                                                  isStreaming={
                                                    !textToRender.includes(
                                                      '</think>',
                                                    )
                                                  } // Only streaming if no closing tag
                                                  streamingContent={textToRender.substring(
                                                    tagStartIndex,
                                                  )}
                                                  streamHookStatus="streaming"
                                                />
                                              ) : (
                                                detectedTag && (
                                                  <ShowToolStream
                                                    content={textToRender.substring(
                                                      tagStartIndex,
                                                    )}
                                                    messageId="streamingTextContent"
                                                    onToolClick={
                                                      handleToolClick
                                                    }
                                                    showExpanded={true}
                                                    startTime={Date.now()} // Tool just started now
                                                  />
                                                )
                                              )}

                                              {/* Show content after think tag if it exists */}
                                              {textAfterThink && (
                                                <ComposioUrlDetector
                                                  content={textAfterThink}
                                                  className="text-sm xl:text-base leading-tight prose prose-sm dark:prose-invert chat-markdown max-w-none [&>:first-child]:mt-0 prose-headings:mt-3 break-words overflow-wrap-anywhere"
                                                />
                                              )}
                                            </>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                });
              })()}
              {(agentStatus === 'running' || agentStatus === 'connecting') &&
                !streamingTextContent &&
                !readOnly &&
                (messages.length === 0 ||
                  messages[messages.length - 1].type === 'user') && (
                  <div ref={latestMessageRef} className="w-full h-fit">
                    <div className="flex flex-col gap-4">
                      {/* Helium Logo and text above the loader for initial loading */}
                      <div className="flex items-center gap-2">
                        <HeliumLogo size={20} />
                        <span className="text-lg font-semibold text-black">
                          Helium
                        </span>
                      </div>

                      {/* Loader content */}
                      <div className="space-y-4 w-full h-12">
                        <AgentLoader />
                      </div>
                    </div>
                  </div>
                )}

              {/* Tool call content (without thinking animation) */}
              {readOnly && currentToolCall && (
                <div ref={latestMessageRef}>
                  <div className="flex flex-col gap-2">
                    <div className="space-y-2">
                      <div className="animate-shimmer inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium text-primary bg-primary/10 rounded-md border border-primary/20">
                        <CircleDashed className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-spin animation-duration-2000" />
                        <span className="font-mono text-xs text-primary">
                          {currentToolCall.name || 'Using Tool'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* For playback mode - Show streaming indicator if no messages yet (without thinking animation) */}
              {readOnly &&
                visibleMessages &&
                visibleMessages.length === 0 &&
                isStreamingText && (
                  <div ref={latestMessageRef}>
                    <div className="flex flex-col gap-2">
                      <div className="max-w-[90%] px-4 py-3 text-sm">
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse" />
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse delay-150" />
                          <div className="h-1.5 w-3.5 rounded-full bg-primary/50 animate-pulse delay-300" />

                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
          <div ref={messagesEndRef} className="h-1" />
        </div>
      )}

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          size="icon"
          className={cn(
            'fixed z-50 h-8 w-8 bg-white hover:bg-white/50 backdrop-blur-3xl border border-black/10 cursor-pointer rounded-full shadow-xs transition-all duration-300 ease-in-out',
            // Position above chat input (pt-16 = 4rem, plus some buffer)
            'bottom-50',
            // Right positioning based on all possible sidebar states
            leftSidebarState === 'expanded' && !isSidePanelOpen
              ? 'right-[calc(50vw-156px)] bottom-62' // Left sidebar open, right side panel closed
              : leftSidebarState === 'expanded' && isSidePanelOpen
                ? 'right-[calc(46vw+2rem)] bottom-52' // Left sidebar open, right side panel open
                : leftSidebarState === 'collapsed' && !isSidePanelOpen
                  ? 'right-[calc(50vw-2rem)] bottom-62' // Left sidebar closed, right side panel closed
                  : 'right-[calc(52vw+2rem)] bottom-52', // Left sidebar closed, right side panel open (default)
          )}
          onClick={() => scrollToBottom('smooth')}
        >
          <ArrowDown className="h-4 w-4 text-black" />
        </Button>
      )}
    </>
  );
};

export default ThreadContent;
