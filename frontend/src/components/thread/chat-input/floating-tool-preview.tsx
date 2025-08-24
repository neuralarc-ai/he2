import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleDashed, Maximize2 } from 'lucide-react';
import { getToolIcon, getUserFriendlyToolName } from '@/components/thread/utils';
import { cn } from '@/lib/utils';
import Image from 'next/image';
export type AgentStatus = 'running' | 'stopped' | 'idle' | 'completed';

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
  messages?: any[];
}

interface FloatingToolPreviewProps {
  toolCalls: ToolCallInput[];
  currentIndex: number;
  onExpand: () => void;
  agentName?: string;
  isVisible: boolean;
  // Indicators for multiple notification types (not tool calls)
  showIndicators?: boolean;
  indicatorIndex?: number;
  indicatorTotal?: number;
  onIndicatorClick?: (index: number) => void;
}

const FLOATING_LAYOUT_ID = 'tool-panel-float';
const CONTENT_LAYOUT_ID = 'tool-panel-content';

const getToolResultStatus = (toolCall: any): boolean => {
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

export const FloatingToolPreview: React.FC<FloatingToolPreviewProps> = ({
  toolCalls,
  currentIndex,
  onExpand,
  agentName,
  isVisible,
  showIndicators = false,
  indicatorIndex = 0,
  indicatorTotal = 1,
  onIndicatorClick,
}) => {
  const [isExpanding, setIsExpanding] = React.useState(false);
  const currentToolCall = toolCalls[currentIndex];
  const totalCalls = toolCalls.length;

  React.useEffect(() => {
    if (isVisible) {
      setIsExpanding(false);
    }
  }, [isVisible]);

  if (!currentToolCall || totalCalls === 0) return null;

  const toolName = currentToolCall.assistantCall?.name || 'Tool Call';
  const CurrentToolIcon = getToolIcon(toolName);
  const isStreaming = currentToolCall.toolResult?.content === 'STREAMING';
  const isSuccess = isStreaming ? true : getToolResultStatus(currentToolCall);

  const handleClick = () => {
    setIsExpanding(true);
    requestAnimationFrame(() => {
      onExpand();
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          layoutId={FLOATING_LAYOUT_ID}
          layout
          transition={{
            layout: {
              type: "spring",
              stiffness: 300,
              damping: 30
            }
          }}
          className="-mb-4 w-full"
          style={{ pointerEvents: 'auto' }}
        >
          <motion.div
            layoutId={CONTENT_LAYOUT_ID}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="bg-card border border-border rounded-3xl p-2 w-full cursor-pointer group"
            onClick={handleClick}
            style={{ opacity: isExpanding ? 0 : 1 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <motion.div
                  layoutId="tool-icon"
                  className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center",
                    isStreaming
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      : isSuccess
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  )}
                  style={{ opacity: isExpanding ? 0 : 1 }}
                >
                  {isStreaming ? (
                    <CircleDashed className="h-5 w-5 text-blue-500 dark:text-blue-400 animate-spin" style={{ opacity: isExpanding ? 0 : 1 }} />
                  ) : (
                    <CurrentToolIcon className="h-5 w-5 text-foreground" style={{ opacity: isExpanding ? 0 : 1 }} />
                  )}
                </motion.div>
              </div>

              <div className="flex-1 min-w-0" style={{ opacity: isExpanding ? 0 : 1 }}>
                <motion.div layoutId="tool-title" className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {getUserFriendlyToolName(toolName)}
                  </h4>
                </motion.div>

                <motion.div layoutId="tool-status" className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isStreaming
                      ? "bg-blue-500 animate-pulse"
                      : isSuccess
                        ? "bg-green-500"
                        : "bg-red-500"
                  )} />
                  <span className="text-xs text-muted-foreground truncate">
                    {isStreaming
                      ? `${agentName || 'Suna'} is working...`
                      : isSuccess
                        ? "Success"
                        : "Failed"
                    }
                  </span>
                </motion.div>
              </div>

              {/* Step count and expand button */}
              <div className="flex items-center gap-3 flex-shrink-0" style={{ opacity: isExpanding ? 0 : 1 }}>
                {/* Step count */}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {currentIndex + 1} / {totalCalls}
                </span>

                {/* Expand button */}
                {/* <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" /> */}
                <Image src="/icons/chevron-up-light.svg" alt="expand" width={20} height={20} className="block dark:hidden mb-0" />  
                <Image src="/icons/chevron-up-dark.svg" alt="expand" width={20} height={20} className="hidden dark:block mb-0" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 