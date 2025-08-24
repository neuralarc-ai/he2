import React, { useState } from 'react';
import {
  Terminal,
  CheckCircle,
  AlertTriangle,
  CircleDashed,
  Code,
  Clock,
  ArrowRight,
  TerminalIcon,
} from 'lucide-react';
import { ToolViewProps } from '../types';
import { formatTimestamp, getToolTitle } from '../utils';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from '../shared/LoadingState';
import { extractCommandData } from './_utils';

export function CommandToolView({
  name = 'execute-command',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
}: ToolViewProps) {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const [showFullOutput, setShowFullOutput] = useState(true);

  const {
    command,
    output,
    exitCode,
    sessionName,
    cwd,
    completed,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp
  } = extractCommandData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  const displayText = name === 'check-command-output' ? sessionName : command;
  const displayLabel = name === 'check-command-output' ? 'Session' : 'Command';
  const displayPrefix = name === 'check-command-output' ? 'tmux:' : '$';

  const toolTitle = getToolTitle(name);

  // Check if this is a non-blocking command with just a status message
  const isNonBlockingCommand = React.useMemo(() => {
    if (!output) return false;

    // Check if output contains typical non-blocking command messages
    const nonBlockingPatterns = [
      'Command sent to tmux session',
      'Use check_command_output to view results',
      'Session still running',
      'completed: false'
    ];

    return nonBlockingPatterns.some(pattern =>
      output.toLowerCase().includes(pattern.toLowerCase())
    );
  }, [output]);

  // Check if there's actual command output to display
  const hasActualOutput = React.useMemo(() => {
    if (!output) return false;

    // If it's a non-blocking command, don't show output section
    if (isNonBlockingCommand) return false;

    // Check if output contains actual command results (not just status messages)
    const actualOutputPatterns = [
      'root@',
      'COMMAND_DONE_',
      'Count:',
      'date:',
      'ls:',
      'pwd:'
    ];

    return actualOutputPatterns.some(pattern =>
      output.includes(pattern)
    ) || output.trim().length > 50; // Arbitrary threshold for "substantial" output
  }, [output, isNonBlockingCommand]);

  const formattedOutput = React.useMemo(() => {
    if (!output || !hasActualOutput) return [];
    let processedOutput = output;

    // Handle case where output is already an object
    if (typeof output === 'object' && output !== null) {
      try {
        processedOutput = JSON.stringify(output, null, 2);
      } catch (e) {
        processedOutput = String(output);
      }
    } else if (typeof output === 'string') {
      // Try to parse as JSON first
      try {
        if (output.trim().startsWith('{') || output.trim().startsWith('[')) {
          const parsed = JSON.parse(output);
          if (parsed && typeof parsed === 'object') {
            // If it's a complex object, stringify it nicely
            processedOutput = JSON.stringify(parsed, null, 2);
          } else {
            processedOutput = String(parsed);
          }
        } else {
          processedOutput = output;
        }
      } catch (e) {
        // If parsing fails, use as plain text
        processedOutput = output;
      }
    } else {
      processedOutput = String(output);
    }

    processedOutput = processedOutput.replace(/\\\\/g, '\\');
    processedOutput = processedOutput
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");

    processedOutput = processedOutput.replace(/\\u([0-9a-fA-F]{4})/g, (_match, group) => {
      return String.fromCharCode(parseInt(group, 16));
    });
    return processedOutput.split('\n');
  }, [output, hasActualOutput]);

  const hasMoreLines = formattedOutput.length > 10;
  const previewLines = formattedOutput.slice(0, 10);
  const linesToShow = showFullOutput ? formattedOutput : previewLines;

  return (
    <Card className="gap-0 flex border shadow-none p-0 rounded-lg flex-col h-full overflow-hidden bg-card">
      <CardHeader className="h-9 bg-gradient-to-t from-zinc-50/80 to-zinc-200/70 dark:from-zinc-900/90 dark:to-zinc-800/90 text-center backdrop-blur-lg border-b p-2 px-4 space-y-2 rounded-t-lg">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center w-full justify-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {toolTitle}
              </CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full flex-1 overflow-hidden relative">
        {isStreaming ? (
          <LoadingState
            icon={Terminal}
            iconColor="text-purple-500 dark:text-purple-400"
            bgColor="bg-gradient-to-b from-purple-100 to-purple-50 shadow-inner dark:from-purple-800/40 dark:to-purple-900/60 dark:shadow-purple-950/20"
            title={name === 'check-command-output' ? 'Checking command output' : 'Executing command'}
            filePath={displayText || 'Processing command...'}
            showProgress={true}
          />
        ) : displayText ? (
          <ScrollArea className="w-full">
            <div className="p-4">
              <div className="max-h-[calc(100vh-290px)] overflow-auto scrollbar-hide">
                <pre className="text-xs text-zinc-600 dark:text-zinc-300 font-mono whitespace-pre-wrap break-all overflow-visible">
                  {/* Show command only */}
                  {command && (
                    <div className="py-0.5 bg-transparent">
                      <span className="text-green-500 dark:text-green-400 font-semibold">{displayPrefix} </span>
                      <span className="text-zinc-700 dark:text-zinc-300">{command}</span>
                    </div>
                  )}

                  {/* Show output only if there's actual command output */}
                  {hasActualOutput && formattedOutput.length > 0 && (
                    <>
                      {formattedOutput.map((line, index) => (
                        <div key={index} className="py-0.5 bg-transparent">
                          <span className="text-zinc-600 dark:text-zinc-300">{line}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {!showFullOutput && hasMoreLines && (
                    <div className="text-zinc-500 mt-2 border-t border-zinc-700/30 pt-2">
                      + {formattedOutput.length - 10} more lines
                    </div>
                  )}
                </pre>
              </div>

              {/* Show status message for non-blocking commands */}
              {isNonBlockingCommand && output && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg mt-2 p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CircleDashed className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Command Status</span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{output}</p>
                </div>
              )}

              {!output && !isStreaming && !isNonBlockingCommand && (
                <div className="bg-black rounded-lg overflow-hidden border border-zinc-700/20 shadow-md p-6 flex items-center justify-center">
                  <div className="text-center">
                    <CircleDashed className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                    <p className="text-zinc-400 text-sm">No output received</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-b from-zinc-100 to-zinc-50 shadow-inner dark:from-zinc-800/40 dark:to-zinc-900/60">
              <Terminal className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              {name === 'check-command-output' ? 'No Session Found' : 'No Command Found'}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-md">
              {name === 'check-command-output'
                ? 'No session name was detected. Please provide a valid session name to check.'
                : 'No command was detected. Please provide a valid command to execute.'
              }
            </p>
          </div>
        )}
      </CardContent>

      <div className="px-4 py-2 h-fit bg-white dark:bg-zinc-900 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4 rounded-b-lg">
        <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          {!isStreaming && displayText && (
            <Badge variant="outline" className="h-6 py-0.5 bg-zinc-50 dark:bg-zinc-900">
              <Terminal className="h-3 w-3 mr-1" />
              {displayLabel}
            </Badge>
          )}
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          {actualToolTimestamp && !isStreaming
            ? formatTimestamp(actualToolTimestamp)
            : actualAssistantTimestamp
              ? formatTimestamp(actualAssistantTimestamp)
              : ''}
        </div>
      </div>
    </Card>
  );
} 