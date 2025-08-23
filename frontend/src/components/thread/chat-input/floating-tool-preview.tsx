import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Check, ListTodo, Loader, XCircle, CircleDashed } from 'lucide-react';
import { getUserFriendlyToolName } from '@/components/thread/utils';
import { cn } from '@/lib/utils';

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
  agentStatus?: AgentStatus;
}

const FLOATING_LAYOUT_ID = 'tool-panel-float';
const CONTENT_LAYOUT_ID = 'tool-panel-content';

// Function to extract task list data from tool call content
const extractTaskListData = (toolCall: ToolCallInput): any => {
  const content = toolCall.assistantCall?.content || toolCall.toolResult?.content;
  if (!content) return null;

  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Check for tool_execution format
    if (parsed.tool_execution?.result?.output) {
      const output = parsed.tool_execution.result.output;
      const outputData = typeof output === 'string' ? JSON.parse(output) : output;
      
      // Check for sections with tasks
      if (outputData?.sections && Array.isArray(outputData.sections)) {
        return {
          sections: outputData.sections,
          total_tasks: outputData.total_tasks || 0,
          total_sections: outputData.total_sections || 0
        };
      }
    }

    // Check for direct sections array
    if (parsed.sections && Array.isArray(parsed.sections)) {
      return {
        sections: parsed.sections,
        total_tasks: parsed.total_tasks || 0,
        total_sections: parsed.total_sections || 0
      };
    }

    // Check for nested content
    if (parsed.content) {
      return extractTaskListData({ ...toolCall, assistantCall: { content: parsed.content } });
    }

    return null;
  } catch (e) {
    return null;
  }
};

// Function to get current task progress information
const getTaskProgressInfo = (toolCall: ToolCallInput): { currentTask: string | null; progress: number; totalTasks: number } => {
  const taskData = extractTaskListData(toolCall);
  if (!taskData || !taskData.sections) {
    return { currentTask: null, progress: 0, totalTasks: 0 };
  }

  const allTasks = taskData.sections.flatMap((section: any) => section.tasks || []);
  const totalTasks = allTasks.length;
  
  if (totalTasks === 0) {
    return { currentTask: null, progress: 0, totalTasks: 0 };
  }

  // Find the first incomplete task
  const currentTask = allTasks.find((task: any) => task.status !== 'completed');
  
  // Calculate progress based on completed tasks
  const completedTasks = allTasks.filter((task: any) => task.status === 'completed').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    currentTask: currentTask?.content || null,
    progress,
    totalTasks
  };
};

// Function to extract meaningful task description from tool call content
const extractTaskDescription = (toolCall: ToolCallInput): string | null => {
  const content = toolCall.assistantCall?.content;
  if (!content) return null;

  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;

    if (parsed && typeof parsed === 'object' && parsed.tool_calls && Array.isArray(parsed.tool_calls) && parsed.tool_calls.length > 0) {
      const firstToolCall = parsed.tool_calls[0];
      if (firstToolCall.function?.arguments) {
        const args = typeof firstToolCall.function.arguments === 'string'
          ? JSON.parse(firstToolCall.function.arguments)
          : firstToolCall.function.arguments;

        // Look for common task description fields and return the first one found
        if (args.task) return args.task;
        if (args.description) return args.description;
        if (args.prompt) return args.prompt;
        if (args.query) return args.query;
      }
    }
  } catch (e) {
    // If parsing fails, it's not the structured data we're looking for.
    return null;
  }

  return null;
};

// Function to check if task is completed
const isTaskCompleted = (toolCall: ToolCallInput): boolean => {
  return toolCall.toolResult?.content && toolCall.toolResult.content !== 'STREAMING';
};

export const FloatingToolPreview: React.FC<FloatingToolPreviewProps> = ({
  toolCalls,
  currentIndex,
  onExpand,
  agentName,
  isVisible,
  showIndicators = false,
  indicatorIndex = 0,
  indicatorTotal,
  onIndicatorClick,
  agentStatus,
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

  const taskDescription = extractTaskDescription(currentToolCall);
  const isCompleted = isTaskCompleted(currentToolCall);
  const taskProgress = getTaskProgressInfo(currentToolCall);
  const hasTaskList = taskProgress.totalTasks > 0;

  const getStatusInfo = () => {
    switch (agentStatus) {
      case 'stopped':
        return {
          text: 'Task Stopped',
          icon: <XCircle className="h-3 w-3 text-white" />,
          bgColor: 'bg-red-500',
        };
      case 'completed':
        return {
          text: 'Task Completed',
          icon: <Check className="h-3 w-3 text-white" />,
          bgColor: 'bg-helium-teal',
        };
      case 'running':
        if (hasTaskList && taskProgress.currentTask) {
          return {
            text: taskProgress.currentTask,
            icon: <ListTodo className="h-3 w-3 text-white" />,
            bgColor: 'bg-blue-500',
          };
        }
        return {
          text: taskDescription || getUserFriendlyToolName(currentToolCall.assistantCall?.name) || 'Task Running...',
          icon: <Loader className="h-3 w-3 text-white animate-spin" />,
          bgColor: 'bg-blue-500',
        };
      case 'idle':
      default:
        return {
          text: 'Task Starting...',
          icon: <CircleDashed className="h-3 w-3 text-white" />,
          bgColor: 'bg-gray-400',
        };
    }
  };

  const statusInfo = getStatusInfo();
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
          className="-mb-2 w-full"
          style={{ pointerEvents: 'auto' }}
        >
          <motion.div
            layoutId={CONTENT_LAYOUT_ID}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-[0px_12px_32px_0px_rgba(0,0,0,0.05)] p-3 w-full cursor-pointer group transition-colors"
            onClick={handleClick}
            style={{ opacity: isExpanding ? 0 : 1 }}
          >
            <div className="flex items-center justify-between">
              {/* Task description and progress */}
              <div className="flex-1 min-w-0" style={{ opacity: isExpanding ? 0 : 1 }}>
                <motion.div layoutId="tool-title" className="flex items-center gap-2">

                  <div className={`w-5 h-5 rounded-full ${statusInfo.bgColor} flex items-center justify-center flex-shrink-0`}>
                    {statusInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">
                      {statusInfo.text}
                    </h4>
                    {hasTaskList && !isCompleted && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${taskProgress.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {taskProgress.progress}%
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Step count and expand button */}
              <div className="flex items-center gap-3 flex-shrink-0" style={{ opacity: isExpanding ? 0 : 1 }}>
                {/* Step count */}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {currentIndex + 1} / {totalCalls}
                </span>

                {/* Expand button */}
                <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 