export * from './ToolViewWrapper';
export * from './ToolViewRegistry';
export { ToolView } from './ToolViewRegistry';
import { extractToolData, extractFilePath } from '../utils';

export const extractFilePathFromToolCall = (toolCall: any): string | null => {
  const assistantContent = toolCall?.assistantCall?.content;
  const toolContent = toolCall?.toolResult?.content;

  const assistantToolData = extractToolData(assistantContent);
  if (assistantToolData.filePath) {
    return assistantToolData.filePath;
  }

  const toolToolData = extractToolData(toolContent);
  if (toolToolData.filePath) {
    return toolToolData.filePath;
  }

  const filePathFromContent = extractFilePath(assistantContent);
  if (filePathFromContent) {
    return filePathFromContent;
  }

  return null;
};
