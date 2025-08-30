import React, { forwardRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Square, Loader2, ArrowUp, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { UploadedFile } from './chat-input';
import { FileUploadHandler } from './file-upload-handler';
import { VoiceRecorder } from './voice-recorder';
import { UnifiedConfigMenu } from './unified-config-menu';
import { canAccessModel, SubscriptionStatus } from './_use-model-selection';
import { isLocalMode } from '@/lib/config';
import { useFeatureFlag } from '@/lib/feature-flags';
import { TooltipContent } from '@/components/ui/tooltip';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { BillingModal } from '@/components/billing/billing-modal';
import { handleFiles } from './file-upload-handler';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTranscription: (text: string) => void;
  placeholder: string;
  loading: boolean;
  disabled: boolean;
  isAgentRunning: boolean;
  onStopAgent?: () => void;
  isDraggingOver: boolean;
  uploadedFiles: UploadedFile[];

  fileInputRef: React.RefObject<HTMLInputElement>;
  isUploading: boolean;
  sandboxId?: string;
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  hideAttachments?: boolean;
  messages?: any[]; // Add messages prop
  isLoggedIn?: boolean;

  selectedModel: string;
  onModelChange: (model: string) => void;
  modelOptions: any[];
  subscriptionStatus: SubscriptionStatus;
  canAccessModel: (modelId: string) => boolean;
  refreshCustomModels?: () => void;
  selectedAgentId?: string;
  onAgentSelect?: (agentId: string | undefined) => void;
  enableAdvancedConfig?: boolean;
  hideAgentSelection?: boolean;
  isHeliumAgent?: boolean;
  // New props for integrations
  onOpenIntegrations?: () => void;
  onOpenInstructions?: () => void;
  onOpenKnowledge?: () => void;
  onOpenTriggers?: () => void;
  onOpenWorkflows?: () => void;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      onTranscription,
      placeholder,
      loading,
      disabled,
      isAgentRunning,
      onStopAgent,
      isDraggingOver,
      uploadedFiles,

      fileInputRef,
      isUploading,
      sandboxId,
      setPendingFiles,
      setUploadedFiles,
      setIsUploading,
      hideAttachments = false,
      messages = [],
      isLoggedIn = true,

      selectedModel,
      onModelChange,
      modelOptions,
      subscriptionStatus,
      canAccessModel,
      refreshCustomModels,

      selectedAgentId,
      onAgentSelect,
      enableAdvancedConfig = false,
      hideAgentSelection = false,
      isHeliumAgent,
      onOpenIntegrations,
      onOpenInstructions,
      onOpenKnowledge,
      onOpenTriggers,
      onOpenWorkflows,
    },
    ref,
  ) => {
    const [billingModalOpen, setBillingModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { enabled: customAgentsEnabled, loading: flagsLoading } =
      useFeatureFlag('custom_agents');
    const { resolvedTheme } = useTheme();

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      const textarea = ref as React.RefObject<HTMLTextAreaElement>;
      if (!textarea.current) return;

      const adjustHeight = () => {
        const el = textarea.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.maxHeight = '200px';
        el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden';

        const newHeight = Math.min(el.scrollHeight, 200);
        el.style.height = `${newHeight}px`;
      };

      adjustHeight();

      window.addEventListener('resize', adjustHeight);
      return () => window.removeEventListener('resize', adjustHeight);
    }, [value, ref]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (
          (value.trim() || uploadedFiles.length > 0) &&
          !loading &&
          (!disabled || isAgentRunning)
        ) {
          onSubmit(e as unknown as React.FormEvent);
        }
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleFiles(
          imageFiles,
          sandboxId,
          setPendingFiles,
          setUploadedFiles,
          setIsUploading,
          messages,
        );
      }
    };

    const handleFileUpload = () => {
      if (fileInputRef && 'current' in fileInputRef && fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const processFileUpload = async (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      if (!event.target.files || event.target.files.length === 0) return;

      const files = Array.from(event.target.files);
      handleFiles(
        files,
        sandboxId,
        setPendingFiles,
        setUploadedFiles,
        setIsUploading,
        messages,
      );

      event.target.value = '';
    };

    const renderDropdown = () => {
      const showAdvancedFeatures =
        isLoggedIn &&
        (enableAdvancedConfig || (customAgentsEnabled && !flagsLoading));
      // Don't render dropdown components until after hydration to prevent ID mismatches
      if (!mounted) {
        return <div className="flex items-center gap-2 h-8" />; // Placeholder with same height
      }
      // Unified compact menu for both logged and non-logged (non-logged shows only models subset via menu trigger)
      return (
        <div className="flex items-center gap-2">
          <UnifiedConfigMenu
            isLoggedIn={isLoggedIn}
            selectedAgentId={
              showAdvancedFeatures && !hideAgentSelection
                ? selectedAgentId
                : undefined
            }
            onAgentSelect={
              showAdvancedFeatures && !hideAgentSelection
                ? onAgentSelect
                : undefined
            }
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            modelOptions={modelOptions}
            subscriptionStatus={subscriptionStatus}
            canAccessModel={canAccessModel}
            refreshCustomModels={refreshCustomModels}
          />
        </div>
      );
    };

    return (
      <div className="relative flex flex-col w-full h-full gap-2 justify-between">
        <div className="flex flex-col gap-1 px-2">
          <Textarea
            ref={ref}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            className={cn(
              "w-full bg-transparent dark:bg-transparent md:text-base md:placeholder:text-base border-none shadow-none focus-visible:ring-0 px-1 pb-8 pt-5 min-h-[86px] max-h-[240px] overflow-y-auto resize-none font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,sans-serif]",
              isDraggingOver ? 'opacity-40' : '',
            )}
            disabled={loading || (disabled && !isAgentRunning)}
            rows={1}
          />
        </div>

        <div className="flex items-center justify-between mt-0 mb-1 px-2">
          <div className="flex items-center gap-3">
            {!hideAttachments && (
              <>
                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className={cn(
                        "w-8 h-8 flex-shrink-0 bg-transparent dark:border-muted-foreground/30 shadow-none rounded-full transition-all duration-200",
                        isDropdownOpen 
                          ? "bg-background/50!" 
                          : "bg-white dark:bg-sidebar-accent hover:bg-background/50!"
                      )}
                      disabled={
                        !isLoggedIn ||
                        loading ||
                        (disabled && !isAgentRunning) ||
                        isUploading
                      }
                    >
                      <Plus 
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isDropdownOpen && "rotate-45"
                        )} 
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="p-2 rounded-xl bg-background shadow-md"
                  >
                    <DropdownMenuItem
                      onClick={handleFileUpload}
                      className="cursor-pointer px-2.5 rounded-sm hover:bg-white! dark:hover:bg-muted!"
                    >
                      <Image
                        src={
                          resolvedTheme === 'dark'
                            ? '/icons/paperclip-dark.svg'
                            : '/icons/Vector-light.svg'
                        }
                        alt="Paperclip"
                        width={18}
                        height={18}
                        className="mr-1"
                      />
                      Attach files
                    </DropdownMenuItem>
                    {selectedAgentId && onOpenIntegrations && (
                      <DropdownMenuItem
                        onClick={onOpenIntegrations}
                        className="cursor-pointer px-2.5 rounded-sm hover:bg-white! dark:hover:bg-muted!"
                      >
                        <Image
                          src={
                            resolvedTheme === 'dark'
                              ? '/icons/integration-dark.svg'
                              : '/icons/integrations.svg'
                          }
                          alt="Integrations"
                          width={18}
                          height={18}
                          className="mr-1"
                        />
                        Integrations
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={processFileUpload}
                  multiple
                />
              </>
            )}
          </div>

          {/* {subscriptionStatus === 'no_subscription' && !isLocalMode() &&
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <p role='button' className='text-sm text-amber-500 hidden sm:block cursor-pointer' onClick={() => setBillingModalOpen(true)}>Upgrade for more usage</p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>The free tier is severely limited by the amount of usage. Upgrade to experience the full power of Helium.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          } */}

          <div className="flex items-center gap-2">
            {renderDropdown()}
            <BillingModal
              open={billingModalOpen}
              onOpenChange={setBillingModalOpen}
              returnUrl={
                typeof window !== 'undefined' ? window.location.href : '/'
              }
            />

            {isLoggedIn && (
              <VoiceRecorder
                onTranscription={onTranscription}
                disabled={loading || (disabled && !isAgentRunning)}
              />
            )}

            <Button
              type="submit"
              onClick={isAgentRunning && onStopAgent ? onStopAgent : onSubmit}
              size="icon"
              className={cn(
                'w-8 h-8 flex-shrink-0 rounded-full cursor-pointer',
                resolvedTheme === 'dark'
                  ? 'bg-helium-blue hover:bg-helium-blue/80'
                  : 'bg-helium-blue hover:bg-helium-blue/80',
                (!value.trim() &&
                  uploadedFiles.length === 0 &&
                  !isAgentRunning) ||
                  loading ||
                  (disabled && !isAgentRunning)
                  ? 'opacity-50'
                  : '',
              )}
              disabled={
                (!value.trim() &&
                  uploadedFiles.length === 0 &&
                  !isAgentRunning) ||
                loading ||
                (disabled && !isAgentRunning)
              }
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isAgentRunning ? (
                <div className="min-h-[12px] min-w-[12px] w-[12px] h-[12px] rounded-xs bg-white" />
              ) : (
                <div
                  className={
                    mounted && resolvedTheme === 'light' ? 'text-white' : 'text-white'
                  }
                >
                  <ArrowUp className="h-5 w-5 text" />
                </div>
              )}
            </Button>
          </div>
        </div>
        {/* {subscriptionStatus === 'no_subscription' && !isLocalMode() &&
          <div className='sm:hidden absolute -bottom-8 left-0 right-0 flex justify-center'>
            <p className='text-xs text-amber-500 px-2 py-1'>
              Upgrade for better performance
            </p>
          </div>
        } */}
      </div>
    );
  },
);

MessageInput.displayName = 'MessageInput';
