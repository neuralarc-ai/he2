import React, { useState, useEffect, useRef } from 'react';
import { Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import Image from 'next/image';

interface VoiceRecorderProps {
    onTranscription: (text: string) => void;
    disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
    onTranscription,
    disabled = false,
}) => {
    const [isListening, setIsListening] = useState(false);
    const lastTranscriptRef = useRef<string>('');
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = useSpeechRecognition();

    // Real-time transcription feedback with minimal debouncing
    useEffect(() => {
        if (isListening && transcript.trim()) {
            // Clear any existing timeout
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            
            // Set a new timeout to send the complete transcript
            updateTimeoutRef.current = setTimeout(() => {
                const currentTranscript = transcript.trim();
                if (currentTranscript !== lastTranscriptRef.current) {
                    lastTranscriptRef.current = currentTranscript;
                    onTranscription(currentTranscript);
                }
            }, 150); // Reduced to 150ms for more responsive updates
        }
        
        // Cleanup timeout on unmount or when not listening
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [transcript, isListening, onTranscription]);

    // Check if browser supports speech recognition
    if (!browserSupportsSpeechRecognition) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={true}
                            className="h-8 px-2 py-2 bg-transparent border-0 rounded-xl text-muted-foreground opacity-50 cursor-not-allowed"
                        >
                            <Image
                                src="/icons/mic-light.svg"
                                alt="mic Light Logo"
                                width={20}
                                height={20}
                                className="block dark:hidden mb-0"
                            />
                            <Image
                                src="/icons/mic-dark.svg"
                                alt="mic Dark Logo"
                                width={20}
                                height={20}
                                className="hidden dark:block mb-0"
                            />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                        <p>Speech recognition not supported in this browser</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Check if microphone is available
    if (!isMicrophoneAvailable) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={true}
                            className="h-8 px-2 py-2 bg-transparent border-0 rounded-xl text-muted-foreground opacity-50 cursor-not-allowed"
                        >
                            <Image
                                src="/icons/mic-light.svg"
                                alt="mic Light Logo"
                                width={20}
                                height={20}
                                className="block dark:hidden mb-0"
                            />
                            <Image
                                src="/icons/mic-dark.svg"
                                alt="mic Dark Logo"
                                width={20}
                                height={20}
                                className="hidden dark:block mb-0"
                            />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                        <p>Microphone access required</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    const handleStartListening = () => {
        setIsListening(true);
        lastTranscriptRef.current = '';
        resetTranscript();
        SpeechRecognition.startListening({ 
            continuous: true,
            language: 'en-US'
        });
    };

    const handleStopListening = () => {
        setIsListening(false);
        SpeechRecognition.stopListening();
        
        // Clear any pending timeout
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = null;
        }
        
        // Send final transcript if there's any
        if (transcript.trim() && transcript.trim() !== lastTranscriptRef.current) {
            onTranscription(transcript.trim());
        }
        
        // Reset transcript for next use
        resetTranscript();
        lastTranscriptRef.current = '';
    };

    const handleClick = () => {
        if (isListening) {
            handleStopListening();
        } else {
            handleStartListening();
        }
    };

    const getButtonClass = () => {
        if (isListening) {
            return 'text-red-500 hover:bg-red-50 hover:text-red-600';
        }
        return '';
    };

    const getIcon = () => {
        if (isListening) {
            return <Square className="h-4 w-4" />;
        }
        return (
            <>
                <Image
                    src="/icons/mic-light.svg"
                    alt="mic Light Logo"
                    width={20}
                    height={20}
                    className="block dark:hidden mb-0"
                />
                <Image
                    src="/icons/mic-dark.svg"
                    alt="mic Dark Logo"
                    width={20}
                    height={20}
                    className="hidden dark:block mb-0"
                />
            </>
        );
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
                        disabled={disabled}
                        className={`h-8 px-2 py-2 bg-transparent border-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-2 transition-colors ${getButtonClass()}`}
                    >
                        {getIcon()}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    <p>
                        {isListening 
                            ? 'Click to stop recording' 
                            : 'Record voice message'
                        }
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}; 