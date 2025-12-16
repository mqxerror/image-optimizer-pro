import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  className?: string
}

// Check if Web Speech API is supported
const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

export function VoiceMicButton({ onTranscript, disabled, className }: VoiceMicButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported())
  }, [])

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      toast({
        title: 'Not supported',
        description: 'Voice input is not supported in this browser. Try Chrome or Safari.',
        variant: 'destructive',
      })
      return
    }

    // Create speech recognition instance
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      onTranscript(transcript)
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)

      if (event.error === 'not-allowed') {
        toast({
          title: 'Microphone access denied',
          description: 'Please allow microphone access to use voice input.',
          variant: 'destructive',
        })
      } else if (event.error === 'no-speech') {
        toast({
          title: 'No speech detected',
          description: 'Please try again and speak clearly.',
        })
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [onTranscript, toast])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  const handleClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Don't render if not supported
  if (!isSupported) {
    return null
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled}
      className={`h-8 w-8 ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-slate-400 hover:text-slate-300'} ${className || ''}`}
      title={isListening ? 'Stop recording' : 'Voice input'}
    >
      {isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
