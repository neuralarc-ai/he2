import React from 'react';
import {
    FileText, FileImage, FileCode, FileSpreadsheet, FileVideo,
    FileAudio, FileType, Database, Archive, File, ExternalLink,
    Loader2, FolderOpen, Info,
    Eye, X,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttachmentGroup } from './attachment-group';
import { HtmlRenderer } from './preview-renderers/html-renderer';
import { MarkdownRenderer } from './preview-renderers/markdown-renderer';
import { CsvRenderer } from './preview-renderers/csv-renderer';
import { PdfRenderer as PdfPreviewRenderer } from './preview-renderers/pdf-renderer';
import { useFileContent, useImageContent } from '@/hooks/react-query/files';
import { useAuth } from '@/components/AuthProvider';
import { Project } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image'
// Define basic file types
export type FileType =
    | 'image' | 'code' | 'text' | 'pdf'
    | 'audio' | 'video' | 'spreadsheet'
    | 'archive' | 'database' | 'markdown' | 'html'
    | 'csv'
    | 'document'
    | 'other';

// Simple extension-based file type detection
function getFileType(filename: string): FileType {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp'].includes(ext)) return 'code';
    if (['txt', 'log', 'env'].includes(ext)) return 'text';
    if (['md', 'markdown'].includes(ext)) return 'markdown';
    if (ext === 'pdf') return 'pdf';
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'audio';
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
    if (['csv', 'tsv'].includes(ext)) return 'csv';
    if (['xls', 'xlsx'].includes(ext)) return 'spreadsheet';
    if (['zip', 'rar', 'tar', 'gz'].includes(ext)) return 'archive';
    if (['doc', 'docx'].includes(ext)) return 'document';
    if (['db', 'sqlite', 'sql'].includes(ext)) return 'database';

    return 'other';
}

// Get appropriate icon for file type
function getFileIcon(type: FileType): React.ElementType {
    const icons: Record<FileType, React.ElementType> = {
        image: FileImage,
        code: FileCode,
        text: FileText,
        markdown: FileText,
        pdf: FileType,
        document: FileText,
        audio: FileAudio,
        video: FileVideo,
        spreadsheet: FileSpreadsheet,
        csv: FileSpreadsheet,
        archive: Archive,
        database: Database,
        other: File,
        html: FileText
    };

    return icons[type];
}

// Generate a human-readable display name for file type
function getTypeLabel(type: FileType, extension?: string): string {
    if (type === 'code' && extension) {
        return extension.toUpperCase();
    }

    const labels: Record<FileType, string> = {
        image: 'Image',
        code: 'Code',
        text: 'Text',
        markdown: 'Markdown',
        pdf: 'PDF',
        audio: 'Audio',
        video: 'Video',
        spreadsheet: 'Spreadsheet',
        csv: 'CSV',
        archive: 'Archive',
        database: 'Database',
        document: 'Document',
        other: 'File',
        html: 'HTML'
    };

    return labels[type];
}

// Generate realistic file size based on file path and type
function getFileSize(filepath: string, type: FileType): string {
    // Base size calculation
    const base = (filepath.length * 5) % 800 + 200;

    // Type-specific multipliers
    const multipliers: Record<FileType, number> = {
        image: 5.0,
        video: 20.0,
        audio: 10.0,
        code: 0.5,
        text: 0.3,
        markdown: 0.3,
        pdf: 8.0,
        spreadsheet: 3.0,
        csv: 2.0,
        archive: 5.0,
        database: 4.0,
        document: 2.0,
        other: 1.0,
        html: 0
    };

    const size = base * multipliers[type];

    if (size < 1024) return `${Math.round(size)} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// Get the API URL for file content
function getFileUrl(sandboxId: string | undefined, path: string): string {
    if (!sandboxId) return path;

    // Check if the path already starts with /workspace
    if (!path.startsWith('/workspace')) {
        // Prepend /workspace to the path if it doesn't already have it
        path = `/workspace/${path.startsWith('/') ? path.substring(1) : path}`;
    }

    // Handle any potential Unicode escape sequences
    try {
        // Replace escaped Unicode sequences with actual characters
        path = path.replace(/\\u([0-9a-fA-F]{4})/g, (_, hexCode) => {
            return String.fromCharCode(parseInt(hexCode, 16));
        });
    } catch (e) {
        console.error('Error processing Unicode escapes in path:', e);
    }

    const url = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sandboxes/${sandboxId}/files/content`);

    // Properly encode the path parameter for UTF-8 support
    url.searchParams.append('path', path);

    return url.toString();
}

interface FileAttachmentProps {
    filepath: string;
    onClick?: (path: string) => void;
    className?: string;
    sandboxId?: string;
    showPreview?: boolean;
    localPreviewUrl?: string;
    customStyle?: React.CSSProperties;
    /**
     * Controls whether HTML, Markdown, and CSV files show their content preview.
     * - true: files are shown as regular file attachments (default)
     * - false: HTML, MD, and CSV files show rendered content in grid layout
     */
    collapsed?: boolean;
    project?: Project;
    displayMode?: 'inline' | 'grid'; // Explicit display mode
}

// Cache fetched content between mounts to avoid duplicate fetches
// Content caches for file attachment optimization
// const contentCache = new Map<string, string>();
// const errorCache = new Set<string>();

export function FileAttachment({
    filepath,
    onClick,
    className,
    sandboxId,
    showPreview = true,
    localPreviewUrl,
    customStyle,
    collapsed = true,
    project,
    displayMode = 'grid' // Default to inline
}: FileAttachmentProps) {
    // Authentication 
    const { session } = useAuth();

    // Simplified state management
    const [hasError, setHasError] = React.useState(false);

    // Basic file info
    const filename = filepath.split('/').pop() || 'file';
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const fileType = getFileType(filename);
    const fileUrl = localPreviewUrl || (sandboxId ? getFileUrl(sandboxId, filepath) : filepath);
    const typeLabel = getTypeLabel(fileType, extension);
    const fileSize = getFileSize(filepath, fileType);
    const IconComponent = getFileIcon(fileType);
    // Display flags
    const isImage = fileType === 'image';
    const isHtmlOrMd = extension === 'html' || extension === 'htm' || extension === 'md' || extension === 'markdown';
    const isCsv = extension === 'csv' || extension === 'tsv';
    const isPdf = extension === 'pdf';
    const isGridLayout = displayMode === 'grid';
    const isInlineMode = displayMode === 'inline';
    // Only show previews in grid layout, not inline
    const shouldShowPreview = (isHtmlOrMd || isCsv || isPdf) && showPreview && collapsed === false && isGridLayout;

    // Use the React Query hook to fetch file content
    const {
        data: fileContent,
        isLoading: fileContentLoading,
        error: fileContentError
    } = useFileContent(
        (isHtmlOrMd || isCsv) && shouldShowPreview ? sandboxId : undefined,
        (isHtmlOrMd || isCsv) && shouldShowPreview ? filepath : undefined
    );

    // Use the React Query hook to fetch image content with authentication
    const {
        data: imageUrl,
        isLoading: imageLoading,
        error: imageError
    } = useImageContent(
        isImage && showPreview && sandboxId ? sandboxId : undefined,
        isImage && showPreview ? filepath : undefined
    );

    // For PDFs we also fetch blob URL via the same binary hook used for images
    const {
        data: pdfBlobUrl,
        isLoading: pdfLoading,
        error: pdfError
    } = useImageContent(
        isPdf && shouldShowPreview && sandboxId ? sandboxId : undefined,
        isPdf && shouldShowPreview ? filepath : undefined
    );

    // Set error state based on query errors
    React.useEffect(() => {
        if (fileContentError || imageError || pdfError) {
            setHasError(true);
        }
    }, [fileContentError, imageError, pdfError]);

    const handleClick = () => {
        if (onClick) {
            onClick(filepath);
        }
    };

    // Images are displayed with their natural aspect ratio
    if (isImage && showPreview) {
        // Use custom height for images if provided through CSS variable
        const imageHeight = isGridLayout
            ? (customStyle as any)?.['--attachment-height'] as string || '120px'
            : '54px';

        // Show loading state for images
        if (imageLoading && sandboxId) {
            return (
                <button
                    onClick={handleClick}
                    className={cn(
                        "group relative h-[54px] min-w-fit rounded-xl cursor-pointer",
                        "bg-card border border-border",
                        "px-3 py-2 overflow-hidden",
                        "flex items-center gap-3",
                        isGridLayout ? "w-full" : "min-w-[54px]",
                        className
                    )}
                    style={{
                        maxWidth: "100%",
                        ...customStyle
                    }}
                    title={filename}
                >
                    <div className="flex-shrink-0">
                        <FileImage className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                        <div className="text-sm font-medium text-foreground truncate max-w-full" title={filename}>
                            {filename}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <span className="text-foreground/60 truncate">{typeLabel}</span>
                            <span className="text-foreground/40 flex-shrink-0">·</span>
                            <span className="text-foreground/60 flex-shrink-0">{fileSize}</span>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    </div>
                </button>
            );
        }

        // Check for errors
        if (imageError || hasError) {
            return (
                <button
                    onClick={handleClick}
                    className={cn(
                        "group relative h-[54px] min-w-fit rounded-xl cursor-pointer",
                        "bg-card border border-red-200 dark:border-red-800",
                        "px-3 py-2 overflow-hidden",
                        "flex items-center gap-3",
                        isGridLayout ? "w-full" : "inline-block",
                        className
                    )}
                    style={{
                        maxWidth: "100%",
                        ...customStyle
                    }}
                    title={filename}
                >
                    <div className="flex-shrink-0">
                        <FileImage className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0 w-fit flex flex-col justify-start overflow-hidden">
                        <div className="text-sm font-medium text-foreground truncate max-w-full" title={filename}>
                            {filename}
                        </div>
                        <div className="text-xs text-red-500">Failed to load image</div>
                    </div>
                </button>
            );
        }

        return (
            <button
                onClick={handleClick}
                className={cn(
                    "group relative h-[54px] rounded-xl cursor-pointer",
                    "bg-card border border-border hover:border-border/50 transition-colors",
                    "px-3 py-2 overflow-hidden", // Standard padding like other file types
                    "flex items-center gap-3", // Horizontal layout like other file types
                    isGridLayout ? "w-full" : "inline-block", // Full width in grid
                    className
                )}
                style={{
                    maxWidth: "100%", // Ensure doesn't exceed container width
                    ...customStyle
                }}
                title={filename}
            >
                {/* File Icon */}
                <div className="flex-shrink-0">
                    <FileImage className="h-6 w-6 text-gray-500" />
                </div>
                
                {/* File Info - Same layout as other file types */}
                <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                    <div className="text-sm font-medium text-foreground truncate max-w-full" title={filename}>
                        {filename}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <span className="text-foreground/60 truncate">{typeLabel}</span>
                        <span className="text-foreground/40 flex-shrink-0">·</span>
                        <span className="text-foreground/60 flex-shrink-0">{fileSize}</span>
                    </div>
                </div>
            </button>
        );
    }

    const rendererMap = {
        'html': HtmlRenderer,
        'htm': HtmlRenderer,
        'md': MarkdownRenderer,
        'markdown': MarkdownRenderer,
        'csv': CsvRenderer,
        'tsv': CsvRenderer
    };

    // Determine if this is a document type that should show an info icon
    const isDocumentType = [
        'pdf', 'document', 'markdown', 'text', 'csv', 
        'spreadsheet', 'code', 'markdown', 'html'
    ].includes(fileType);

    // HTML/MD/CSV/PDF preview when not collapsed and in grid layout
    if (shouldShowPreview && isGridLayout) {
        // Determine the renderer component
        const Renderer = rendererMap[extension as keyof typeof rendererMap];

        return (
            <div
                className={cn(
                    "group relative rounded-xl w-full",
                    "border",
                    "bg-card",
                    "overflow-hidden",
                    isPdf ? "h-[500px]" : "h-[300px]",
                    "pt-10", // Room for header
                    className
                )}
                style={{
                    gridColumn: "1 / -1", // Make it take full width in grid
                    width: "100%",        // Ensure full width
                    ...customStyle
                }}
                onClick={hasError ? handleClick : undefined} // Make clickable if error
            >
                {/* Content area */}
                <div className="h-full w-full relative group">
                    
                    {/* Render PDF or text-based previews */}
                    {!hasError && (
                        <>
                            {isPdf && (() => {
                                const pdfUrlForRender = localPreviewUrl || (sandboxId ? (pdfBlobUrl ?? null) : fileUrl);
                                return pdfUrlForRender ? (
                                    <PdfPreviewRenderer
                                        url={pdfUrlForRender}
                                        className="h-full w-full"
                                    />
                                ) : null;
                            })()}
                            {!isPdf && fileContent && Renderer && (
                                <Renderer
                                    content={fileContent}
                                    previewUrl={fileUrl}
                                    className="h-full w-full"
                                    project={project}
                                />
                            )}
                        </>
                    )}

                    {/* Error state */}
                    {hasError && (
                        <div className="h-full w-full flex flex-col items-center justify-center p-4">
                            <div className="text-red-500 mb-2">Error loading content</div>
                            <div className="text-muted-foreground text-sm text-center mb-2">
                                {fileUrl && (
                                    <div className="text-xs max-w-full overflow-hidden truncate opacity-70">
                                        Path may need /workspace prefix
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleClick}
                                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-md text-sm"
                            >
                                Open in viewer
                            </button>
                        </div>
                    )}

                    {/* Loading state */}
                    {fileContentLoading && !isPdf && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        </div>
                    )}

                    {isPdf && pdfLoading && !pdfBlobUrl && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        </div>
                    )}

                    {/* Empty content state - show when not loading and no content yet */}
                    {!isPdf && !fileContent && !fileContentLoading && !hasError && (
                        <div className="h-full w-full flex flex-col items-center justify-center p-4 pointer-events-none">
                            <div className="text-muted-foreground text-sm mb-2">
                                Preview available
                            </div>
                            <div className="text-muted-foreground text-xs text-center">
                                Click header to open externally
                            </div>
                        </div>
                    )}
                </div>

                {/* Header with filename */}
                <div className="absolute top-0 left-0 right-0 bg-accent p-2 z-10 flex items-center justify-between">
                    <div className="text-sm font-medium truncate">{filename}</div>
                    {onClick && (
                        <button
                            onClick={handleClick}
                            className="cursor-pointer p-1 rounded-full hover:bg-accent/50"
                        >
                           <Image
                            src="/icons/external-link-light.svg"
                            alt="External Link"
                            width={20}
                            height={20}
                            className="block dark:hidden mb-0"
                        />
                        <Image
                            src="/icons/external-link-dark.svg"
                            alt="External Link"
                            width={20}
                            height={20}
                            className="hidden dark:block mb-0"
                        />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Regular files with details
    const safeStyle = { ...customStyle };
    delete safeStyle.height;
    delete (safeStyle as any)['--attachment-height'];
    
    // Get the appropriate icon path based on file type
    const getIconPath = () => {
        switch (fileType) {
            case 'pdf':
                return '/icons/pdf.svg';
            case 'markdown':
                return '/icons/md.svg';
            case 'csv':
                return '/icons/csv.svg';
            case 'document':
                return '/icons/doc.svg';
            case 'html':
                return '/icons/html.svg';
            case 'spreadsheet':
                return '/icons/csv.svg';
            case 'image':
                return '/icons/image-icon.svg';
            case 'code':
                return '/icons/code-icon.svg';
            default:
                return '/icons/file-icon.svg';
        }
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                "group flex rounded-lg transition-all duration-200 h-[54px] overflow-hidden cursor-pointer ",
                "bg-muted/50",
                "text-left",
                isInlineMode 
                    ? "w-full sm:w-[calc(50%-0.5rem)] h-[54px] min-h-[54px]" // Two items per row with gap, fixed height
                    : "min-w-full max-w-full w-fit h-auto", // Original constraints for grid layout
                className
            )}
            style={safeStyle}
            title={filename}
        >
            <div className="relative min-w-[47px] h-[54px] flex-shrink-0 flex items-center justify-center">
                <img 
                    src={getIconPath()} 
                    alt={fileType} 
                    className={cn(
                        "h-9 w-9 object-contain",
                        isDocumentType ? "opacity-90" : "opacity-70"
                    )} 
                    onError={(e) => {
                        // Fallback to default icon if custom icon fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = '/icons/html.svg';
                    }}
                />
            </div>

           

            <div className="flex-1 min-w-0 flex flex-col justify-center p-2 pr-8 overflow-hidden">
                <div className="text-sm font-medium text-foreground truncate max-w-full">
                    {filename}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <span className="text-foreground/60 truncate">{typeLabel}</span>
                    <span className="text-foreground/40 flex-shrink-0">·</span>
                    <span className="text-foreground/60 flex-shrink-0">{fileSize}</span>
                </div>
            </div>
        </button>
    );
}

interface FileAttachmentGridProps {
    attachments: string[];
    onFileClick?: (path: string, filePathList?: string[]) => void;
    className?: string;
    sandboxId?: string;
    showPreviews?: boolean;
    collapsed?: boolean;
    project?: Project;
    displayMode?: 'inline' | 'grid'; // Pass displayMode through
}

export function FileAttachmentGrid({
    attachments,
    onFileClick,
    className,
    sandboxId,
    showPreviews = true,
    collapsed = false,
    project,
    displayMode = 'grid' // Default to grid for better previews
}: FileAttachmentGridProps) {
    const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);
    
    if (!attachments || attachments.length === 0) return null;

    // For thread content: show max 3 files in 3-column grid, 4th item is "View all files in this task" button
    const maxVisibleFiles = 3;
    const showViewAll = attachments.length > maxVisibleFiles;
    const visibleAttachments = attachments.slice(0, maxVisibleFiles);
    

    if (displayMode === 'inline') {
        return (
            <div className="flex flex-col gap-2">
                {attachments.map((filepath, index) => (
                    <FileAttachment
                        key={`${filepath}-${index}`}
                        filepath={filepath}
                        onClick={() => onFileClick?.(filepath, attachments)}
                        sandboxId={sandboxId}
                        showPreview={showPreviews}
                        project={project}
                        displayMode="inline"
                    />
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="w-full">
                <div className="grid grid-cols-3 gap-2">
                    {visibleAttachments.map((filepath, index) => (
                        <div key={`${filepath}-${index}`} className="w-full">
                            <FileAttachment
                                filepath={filepath}
                                onClick={() => onFileClick?.(filepath, attachments)}
                                sandboxId={sandboxId}
                                showPreview={showPreviews}
                                project={project}
                                displayMode="grid"
                            />
                        </div>
                    ))}
                    
                    {/* View all files in this task button - shown as 4th item when there are more than 3 files */}
                    {showViewAll && (
                        <div className="w-full h-[54px] flex items-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsWorkspaceDialogOpen(true);
                                }}
                                className={cn(
                                    "w-full h-[54px] flex flex-col items-center justify-center gap-1 p-2 rounded-xl",
                                    "bg-sidebar hover:bg-accent/10 transition-colors",
                                    "text-sm font-medium text-foreground"
                                )}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1">
                                        <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    </div>
                                    <span className="text-[10px] leading-tight text-center">View all files in this task</span>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Workspace Files Dialog */}
            <WorkspaceFilesDialog
                isOpen={isWorkspaceDialogOpen}
                onClose={() => setIsWorkspaceDialogOpen(false)}
                files={attachments}
                onFileClick={onFileClick}
                sandboxId={sandboxId}
                project={project}
            />
        </>
    );
}

// Workspace Files Dialog Component
interface WorkspaceFilesDialogProps {
    isOpen: boolean;
    onClose: () => void;
    files: string[];
    onFileClick?: (path: string, filePathList?: string[]) => void;
    sandboxId?: string;
    project?: Project;
}

export function WorkspaceFilesDialog({
    isOpen,
    onClose,
    files,
    onFileClick,
    sandboxId,
    project
}: WorkspaceFilesDialogProps) {
    if (!files || files.length === 0) return null;

    // Group files by type for better organization
    const groupedFiles = files.reduce((acc, filepath) => {
        const fileType = getFileType(filepath);
        
        if (!acc[fileType]) {
            acc[fileType] = [];
        }
        acc[fileType].push(filepath);
        return acc;
    }, {} as Record<FileType, string[]>);

    const fileTypeOrder: FileType[] = ['image', 'code', 'text', 'markdown', 'html', 'pdf', 'spreadsheet', 'csv', 'audio', 'video', 'archive', 'database', 'document', 'other'];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-semibold">
                        <span>All Files in Workspace ({files.length})</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {fileTypeOrder.map(fileType => {
                        const typeFiles = groupedFiles[fileType];
                        if (!typeFiles || typeFiles.length === 0) return null;

                        return (
                            <div key={fileType} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5">
                                        {React.createElement(getFileIcon(fileType), { 
                                            className: "w-5 h-5 text-muted-foreground" 
                                        })}
                                    </div>
                                    <h3 className="text-lg font-medium capitalize text-foreground">
                                        {getTypeLabel(fileType)} Files ({typeFiles.length})
                                    </h3>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-3">
                                    {typeFiles.map((filepath, index) => (
                                        <div key={`${filepath}-${index}`} className="relative group">
                                            <FileAttachment
                                                filepath={filepath}
                                                onClick={() => {
                                                    onFileClick?.(filepath, files);
                                                    onClose();
                                                }}
                                                sandboxId={sandboxId}
                                                showPreview={true}
                                                project={project}
                                                displayMode="grid"
                                                className="w-full h-[80px] rounded-lg"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
} 

// Thread Files Display Component - Shows files below thread content in 2-column grid
interface ThreadFilesDisplayProps {
    attachments: string[];
    onFileClick?: (path: string, filePathList?: string[]) => void;
    className?: string;
    sandboxId?: string;
    showPreviews?: boolean;
    project?: Project;
    showViewAllButton?: boolean; // Control whether to show "View all files in this task" button
    rightAlignGrid?: boolean; // Control whether to right-align the 3rd item in 2-column grid
}

export function ThreadFilesDisplay({
    attachments,
    onFileClick,
    className,
    sandboxId,
    showPreviews = true,
    project,
    showViewAllButton = false, // Default to false for thread content
    rightAlignGrid = false // Default to false for normal left-aligned grid
}: ThreadFilesDisplayProps) {
    const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);
    
    if (!attachments || attachments.length === 0) return null;

    // Deduplicate attachments to prevent duplicates
    const uniqueAttachments = Array.from(new Set(attachments));
    
    // Show max 4 files in 2-column grid, 5th item is "View all files in this task" button (only if showViewAllButton is true)
    const maxVisibleFiles = showViewAllButton ? 4 : uniqueAttachments.length;
    const showViewAll = showViewAllButton && uniqueAttachments.length > maxVisibleFiles;
    const visibleAttachments = uniqueAttachments.slice(0, maxVisibleFiles);

    // Helper function to determine grid positioning based on attachment count and alignment
    const getGridPosition = (index: number, total: number, isRightAligned: boolean) => {
        if (total === 1) {
            // Single file: [][1] for user messages, [1][] for assistant messages
            return isRightAligned ? "col-start-1" : "col-start-2";
        } else if (total === 3) {
            // Three files: [1][2] and [][3] for user messages, [1][2] and [3][] for assistant messages
            if (index === 2) { // Third file
                return isRightAligned ? "col-start-1" : "col-start-2";
            }
        }
        // Default positioning for other cases
        return "";
    };

    return (
        <>
            <div className={cn("w-full mt-4", className)}>
                <div className="grid grid-cols-2 gap-2">
                    {visibleAttachments.map((filepath, index) => (
                        <div 
                            key={`${filepath}-${index}`} 
                            className={cn(
                                "w-full",
                                getGridPosition(index, visibleAttachments.length, rightAlignGrid)
                            )}
                        >
                            <FileAttachment
                                filepath={filepath}
                                onClick={() => onFileClick?.(filepath, uniqueAttachments)}
                                sandboxId={sandboxId}
                                showPreview={showPreviews}
                                project={project}
                                displayMode="grid"
                                className="w-full h-fit bg-card border border-border rounded-lg"
                                customStyle={{ '--attachment-height': '120px' } as React.CSSProperties}
                            />
                        </div>
                    ))}
                    
                    {/* View all files in this task button - shown as 5th item when there are more than 4 files */}
                    {showViewAll && (
                        <div className="w-full h-[80px] flex items-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsWorkspaceDialogOpen(true);
                                }}
                                className={cn(
                                    "w-full h-[80px] flex flex-col items-center justify-center gap-2 p-3 rounded-xl",
                                    "bg-sidebar hover:bg-accent/10 transition-colors",
                                    "text-sm font-medium text-foreground border-2 border-dashed border-muted-foreground/30"
                                )}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1">
                                        <FolderOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    </div>
                                    <span className="text-xs leading-tight text-center">View all files in this task</span>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Workspace Files Dialog */}
            <WorkspaceFilesDialog
                isOpen={isWorkspaceDialogOpen}
                onClose={() => setIsWorkspaceDialogOpen(false)}
                files={uniqueAttachments}
                onFileClick={onFileClick}
                sandboxId={sandboxId}
                project={project}
            />
        </>
    );
} 