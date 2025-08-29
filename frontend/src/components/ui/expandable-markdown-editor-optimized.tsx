import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";
import { Edit2, Expand, Save, X } from "lucide-react";
import { Response } from '@/components/response';

interface ExpandableMarkdownEditorProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
}

export const ExpandableMarkdownEditor: React.FC<ExpandableMarkdownEditorProps> = ({ 
  value, 
  onSave, 
  className = '', 
  placeholder = 'Click to edit...',
  title = 'Edit Instructions',
  disabled = false
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    }
  };

  const openDialog = () => {
    setIsDialogOpen(true);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const renderMarkdown = (content: string, isPreview = false) => (
    <Response
      components={{
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 text-foreground">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-semibold mb-2 text-foreground">{children}</h4>,
        h5: ({ children }) => <h5 className="text-sm font-semibold mb-2 text-foreground">{children}</h5>,
        h6: ({ children }) => <h6 className="text-sm font-medium mb-2 text-foreground">{children}</h6>,
        p: ({ children }) => <p className="mb-4 last:mb-0 text-foreground leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2 text-foreground">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-foreground">{children}</ol>,
        li: ({ children }) => <li className="text-foreground leading-relaxed">{children}</li>,
        code: ({ children, className }) => {
          const isInline = !className?.includes('language-');
          return isInline ? (
            <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground">{children}</code>
          ) : (
            <code className={cn('block bg-muted p-4 rounded text-sm font-mono overflow-x-auto', className)}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="bg-muted p-4 rounded text-sm font-mono overflow-x-auto mb-4">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-muted-foreground/30 pl-6 italic mb-4 text-muted-foreground">{children}</blockquote>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic text-foreground">{children}</em>,
        hr: () => <hr className="my-6 border-muted-foreground/20" />,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border-collapse border border-muted-foreground/20">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-muted-foreground/20 px-4 py-2 bg-muted font-semibold text-left text-sm text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-muted-foreground/20 px-4 py-2 text-sm text-foreground">
            {children}
          </td>
        ),
        a: ({ children, href }) => (
          <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </Response>
  );

  return (
    <div className={cn("w-full", className)}>
      {/* Inline editing mode */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[100px] resize-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={disabled}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={startEditing} disabled={disabled}>
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={openDialog} disabled={disabled}>
                <Expand className="h-4 w-4 mr-1" />
                Expand
              </Button>
            </div>
          </div>
          
          {/* Preview */}
          <div className="border rounded-md p-4 bg-muted/30 min-h-[100px]">
            {value ? (
              renderMarkdown(value, true)
            ) : (
              <p className="text-muted-foreground italic">{placeholder}</p>
            )}
          </div>
        </div>
      )}

      {/* Expanded dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Editor */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Editor</label>
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={placeholder}
                  className="min-h-[400px] resize-none"
                />
              </div>
              
              {/* Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Preview</label>
                <ScrollArea className="border rounded-md p-4 bg-muted/30 h-[400px]">
                  {editValue ? (
                    renderMarkdown(editValue, true)
                  ) : (
                    <p className="text-muted-foreground italic">{placeholder}</p>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleSave} disabled={disabled}>
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
