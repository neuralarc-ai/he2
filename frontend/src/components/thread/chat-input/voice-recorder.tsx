import React, { useState, useRef, useEffect } from 'react';
import { Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranscription } from '@/hooks/react-query/transcription/use-transcription';

// Custom Mic Icon component using the mic.svg
const MicIcon = ({ className }: { className?: string }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M15 6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6V10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10V6Z" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M5 12C5 13.8565 5.7375 15.637 7.05025 16.9497C8.36301 18.2625 10.1435 19 12 19C13.8565 19 15.637 18.2625 16.9497 16.9497C18.2625 15.637 19 13.8565 19 12" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 19V22" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M8 22H16" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

interface VoiceRecorderProps {
    onTranscription: (text: string) => void;
    disabled?: boolean;
}

const MAX_RECORDING_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
    onTranscription,
    disabled = false,
}) => {
    const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingStartTimeRef = useRef<number | null>(null);
    const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const transcriptionMutation = useTranscription();

    // Auto-stop recording after 15 minutes
    useEffect(() => {
        if (state === 'recording') {
            recordingStartTimeRef.current = Date.now();
            maxTimeoutRef.current = setTimeout(() => {
                stopRecording();
            }, MAX_RECORDING_TIME);
        } else {
            recordingStartTimeRef.current = null;
            if (maxTimeoutRef.current) {
                clearTimeout(maxTimeoutRef.current);
                maxTimeoutRef.current = null;
            }
        }

        return () => {
            if (maxTimeoutRef.current) {
                clearTimeout(maxTimeoutRef.current);
            }
        };
    }, [state]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const options = { mimeType: 'audio/webm' };
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (chunksRef.current.length === 0) {
                    // Recording was cancelled
                    cleanupStream();
                    setState('idle');
                    return;
                }

                setState('processing');
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

                transcriptionMutation.mutate(audioFile, {
                    onSuccess: (data) => {
                        onTranscription(data.text);
                        setState('idle');
                    },
                    onError: (error) => {
                        console.error('Transcription failed:', error);
                        setState('idle');
                    },
                });

                cleanupStream();
            };

            mediaRecorder.start();
            setState('recording');
        } catch (error) {
            console.error('Error starting recording:', error);
            setState('idle');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && state === 'recording') {
            chunksRef.current = []; // Clear chunks to signal cancellation
            mediaRecorderRef.current.stop();
            cleanupStream();
            setState('idle');
        }
    };

    const cleanupStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const handleClick = () => {
        if (state === 'idle') {
            startRecording();
        } else if (state === 'recording') {
            stopRecording();
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (state === 'recording') {
            cancelRecording();
        }
    };

    const getButtonClass = () => {
        switch (state) {
            case 'recording':
                return 'text-red-500 hover:bg-red-50 hover:text-red-600';
            case 'processing':
                return '';
            default:
                return '';
        }
    };

    const getIcon = () => {
        switch (state) {
            case 'recording':
                return <Square className="h-4 w-4" />;
            case 'processing':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            default:
                return <MicIcon className="h-4 w-4" />;
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClick}
                        onContextMenu={handleRightClick}
                        disabled={disabled || state === 'processing'}
                        className={`h-8 px-2 py-2 bg-transparent border-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-2 transition-colors ${getButtonClass()}`}
                    >
                        {getIcon()}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    <p>
                        {state === 'recording' 
                            ? 'Click to stop recording' 
                            : state === 'processing' 
                                ? 'Processing...' 
                                : 'Record voice message'
                        }
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}; 