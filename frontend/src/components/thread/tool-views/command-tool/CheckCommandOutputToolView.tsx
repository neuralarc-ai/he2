import React, { useState } from 'react';
import {
    Terminal,
    CheckCircle,
    AlertTriangle,
    CircleDashed,
    Clock,
    TerminalIcon,
    Play,
    Square,
} from 'lucide-react';
import { ToolViewProps } from '../types';
import { formatTimestamp, getToolTitle } from '../utils';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from '../shared/LoadingState';

interface CheckCommandOutputData {
    sessionName: string | null;
    output: string | null;
    status: string | null;
    success: boolean;
    timestamp?: string;
}

function extractCheckCommandOutputData(
    assistantContent: any,
    toolContent: any,
    isSuccess: boolean,
    toolTimestamp?: string,
    assistantTimestamp?: string
): CheckCommandOutputData {
    let sessionName: string | null = null;
    let output: string | null = null;
    let status: string | null = null;
    let actualIsSuccess = isSuccess;
    let actualTimestamp = toolTimestamp || assistantTimestamp;

    // Parse content to extract data
    const parseContent = (content: any): any => {
        if (typeof content === 'string') {
            try {
                return JSON.parse(content);
            } catch (e) {
                return content;
            }
        }
        return content;
    };

    // Try to extract from tool content first (most likely to have the result)
    const toolParsed = parseContent(toolContent);
    console.log('[CHECK COMMAND OUTPUT TOOL VIEW] Tool parsed:', toolParsed);

    if (toolParsed && typeof toolParsed === 'object') {
        // Handle the case where content is a JSON string
        if (toolParsed.content && typeof toolParsed.content === 'string') {
            try {
                const contentParsed = JSON.parse(toolParsed.content);
                if (contentParsed.tool_execution) {
                    const toolExecution = contentParsed.tool_execution;

                    if (toolExecution.result && toolExecution.result.output) {
                        if (typeof toolExecution.result.output === 'object') {
                            // This is the nested format: { output: { output: "...", session_name: "...", status: "..." } }
                            const nestedOutput = toolExecution.result.output;
                            output = nestedOutput.output || null;
                            sessionName = nestedOutput.session_name || null;
                            status = nestedOutput.status || null;
                        } else if (typeof toolExecution.result.output === 'string') {
                            // Direct string output
                            output = toolExecution.result.output;
                        }
                        actualIsSuccess = toolExecution.result.success !== undefined ? toolExecution.result.success : actualIsSuccess;
                    }

                    // Extract session name from arguments if not found in output
                    if (!sessionName && toolExecution.arguments) {
                        sessionName = toolExecution.arguments.session_name || null;
                    }
                }
            } catch (e) {
                console.error('Failed to parse toolContent.content:', e);
            }
        }
        // Check for frontend_content first (this is the actual data structure)
        else if (toolParsed.frontend_content && toolParsed.frontend_content.tool_execution) {
            const toolExecution = toolParsed.frontend_content.tool_execution;

            if (toolExecution.result && toolExecution.result.output) {
                if (typeof toolExecution.result.output === 'object') {
                    // This is the nested format: { output: { output: "...", session_name: "...", status: "..." } }
                    const nestedOutput = toolExecution.result.output;
                    output = nestedOutput.output || null;
                    sessionName = nestedOutput.session_name || null;
                    status = nestedOutput.status || null;
                } else if (typeof toolExecution.result.output === 'string') {
                    // Direct string output
                    output = toolExecution.result.output;
                }
                actualIsSuccess = toolExecution.result.success !== undefined ? toolExecution.result.success : actualIsSuccess;
            }

            // Extract session name from arguments if not found in output
            if (!sessionName && toolExecution.arguments) {
                sessionName = toolExecution.arguments.session_name || null;
            }
        }
        // Fallback to content.content structure
        else if (toolParsed.content && typeof toolParsed.content === 'object') {
            if (toolParsed.content.content && typeof toolParsed.content.content === 'string') {
                try {
                    const contentParsed = JSON.parse(toolParsed.content.content);
                    if (contentParsed.tool_execution) {
                        const toolExecution = contentParsed.tool_execution;

                        if (toolExecution.result && toolExecution.result.output) {
                            if (typeof toolExecution.result.output === 'object') {
                                const nestedOutput = toolExecution.result.output;
                                output = nestedOutput.output || null;
                                sessionName = nestedOutput.session_name || null;
                                status = nestedOutput.status || null;
                            } else if (typeof toolExecution.result.output === 'string') {
                                output = toolExecution.result.output;
                            }
                            actualIsSuccess = toolExecution.result.success !== undefined ? toolExecution.result.success : actualIsSuccess;
                        }

                        if (!sessionName && toolExecution.arguments) {
                            sessionName = toolExecution.arguments.session_name || null;
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse content.content:', e);
                }
            }
        }
    }

    // Fallback to assistant content if no data found in tool content
    if (!output && !sessionName) {
        const assistantParsed = parseContent(assistantContent);

        if (assistantParsed && typeof assistantParsed === 'object') {
            // Check for frontend_content first
            if (assistantParsed.frontend_content && assistantParsed.frontend_content.tool_execution) {
                const toolExecution = assistantParsed.frontend_content.tool_execution;

                if (toolExecution.result && toolExecution.result.output) {
                    if (typeof toolExecution.result.output === 'object') {
                        const nestedOutput = toolExecution.result.output;
                        output = nestedOutput.output || null;
                        sessionName = nestedOutput.session_name || null;
                        status = nestedOutput.status || null;
                    } else if (typeof toolExecution.result.output === 'string') {
                        output = toolExecution.result.output;
                    }
                }

                if (!sessionName && toolExecution.arguments) {
                    sessionName = toolExecution.arguments.session_name || null;
                }
            }
            // Fallback to content.content structure
            else if (assistantParsed.content && typeof assistantParsed.content === 'object') {
                if (assistantParsed.content.content && typeof assistantParsed.content.content === 'string') {
                    try {
                        const contentParsed = JSON.parse(assistantParsed.content.content);
                        if (contentParsed.tool_execution) {
                            const toolExecution = contentParsed.tool_execution;

                            if (toolExecution.result && toolExecution.result.output) {
                                if (typeof toolExecution.result.output === 'object') {
                                    const nestedOutput = toolExecution.result.output;
                                    output = nestedOutput.output || null;
                                    sessionName = nestedOutput.session_name || null;
                                    status = nestedOutput.status || null;
                                } else if (typeof toolExecution.result.output === 'string') {
                                    output = toolExecution.result.output;
                                }
                            }

                            if (!sessionName && toolExecution.arguments) {
                                sessionName = toolExecution.arguments.session_name || null;
                            }
                        }
                    } catch (e) {
                        console.error('Failed to parse assistant content.content:', e);
                    }
                }
            }
        }
    }

    // Debug logging
    console.log('CheckCommandOutputToolView: Final extracted data:', {
        sessionName,
        hasOutput: !!output,
        outputLength: output?.length,
        status,
        success: actualIsSuccess,
        toolContent: typeof toolContent,
        assistantContent: typeof assistantContent
    });

    // Additional debug logging for troubleshooting
    if (!sessionName || !output) {
        console.log('CheckCommandOutputToolView: Debug - Raw toolContent:', toolContent);
        console.log('CheckCommandOutputToolView: Debug - Raw assistantContent:', assistantContent);

        if (toolContent && typeof toolContent === 'object') {
            console.log('CheckCommandOutputToolView: Debug - toolContent keys:', Object.keys(toolContent));
            if (toolContent.frontend_content) {
                console.log('CheckCommandOutputToolView: Debug - frontend_content:', toolContent.frontend_content);
            }
            if (toolContent.content) {
                console.log('CheckCommandOutputToolView: Debug - content:', toolContent.content);
            }
        }
    }

    return {
        sessionName,
        output,
        status,
        success: actualIsSuccess,
        timestamp: actualTimestamp
    };
}

export function CheckCommandOutputToolView({
    name = 'check-command-output',
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
        sessionName,
        output,
        status,
        success: actualIsSuccess,
        timestamp: actualTimestamp
    } = extractCheckCommandOutputData(
        assistantContent,
        toolContent,
        isSuccess,
        toolTimestamp,
        assistantTimestamp
    );

    const toolTitle = getToolTitle(name);

    const formattedOutput = React.useMemo(() => {
        if (!output) return [];

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

        // Clean up escape sequences
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
    }, [output]);

    const hasMoreLines = formattedOutput.length > 10;
    const previewLines = formattedOutput.slice(0, 10);
    const linesToShow = showFullOutput ? formattedOutput : previewLines;

    const isSessionRunning = status?.includes('still running') || status?.includes('running');

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

                    {/* {!isStreaming && (
                        <Badge
                            variant="secondary"
                            className={
                                actualIsSuccess
                                    ? "bg-gradient-to-b from-emerald-200 to-emerald-100 text-emerald-700 dark:from-emerald-800/50 dark:to-emerald-900/60 dark:text-emerald-300"
                                    : "bg-gradient-to-b from-rose-200 to-rose-100 text-rose-700 dark:from-rose-800/50 dark:to-rose-900/60 dark:text-rose-300"
                            }
                        >
                            {actualIsSuccess ? (
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            ) : (
                                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                            )}
                            {actualIsSuccess ? 'Output retrieved successfully' : 'Failed to retrieve output'}
                        </Badge>
                    )} */}
                </div>
            </CardHeader>

            <CardContent className="p-0 h-full flex-1 overflow-hidden relative">
                {isStreaming ? (
                    <LoadingState
                        icon={Terminal}
                        iconColor="text-blue-500 dark:text-blue-400"
                        bgColor="bg-gradient-to-b from-blue-100 to-blue-50 shadow-inner dark:from-blue-800/40 dark:to-blue-900/60 dark:shadow-blue-950/20"
                        title="Checking command output"
                        filePath={sessionName || 'Processing session...'}
                        showProgress={true}
                    />
                ) : sessionName ? (
                    <ScrollArea className="h-full w-full">
                        <div className="p-4">
                            <div className="max-h-96 overflow-auto scrollbar-hide">
                                <pre className="text-xs text-zinc-600 dark:text-zinc-300 font-mono whitespace-pre-wrap break-all overflow-visible">
                                    {linesToShow.map((line, index) => (
                                        <div key={index} className="py-0.5 bg-transparent">
                                            {line}
                                        </div>
                                    ))}

                                    {!showFullOutput && hasMoreLines && (
                                        <div className="text-zinc-500 mt-2 border-t border-zinc-700/30 pt-2">
                                            + {formattedOutput.length - 10} more lines
                                        </div>
                                    )}
                                </pre>
                            </div>


                            {!output && !isStreaming && (
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
                            No Session Found
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-md">
                            No session name was detected. Please provide a valid session name to check.
                        </p>
                    </div>
                )}
            </CardContent>

            <div className="px-4 py-2 h-fit bg-white dark:bg-zinc-900 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4 rounded-b-lg">
                <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {!isStreaming && sessionName && (
                        <Badge variant="outline" className="h-6 py-0.5 bg-zinc-50 dark:bg-zinc-900">
                            <Terminal className="h-3 w-3 mr-1" />
                            Session
                        </Badge>
                    )}
                </div>

                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    {actualTimestamp && !isStreaming
                        ? formatTimestamp(actualTimestamp)
                        : ''}
                </div>
            </div>
        </Card>
    );
} 