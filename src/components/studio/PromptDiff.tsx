import { useState, useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface PromptDiffProps {
  prompt: string
  className?: string
  /** Duration to show diff highlighting in ms (default: 2000) */
  highlightDuration?: number
}

/**
 * Component that displays a prompt with diff-style highlighting
 * when the prompt changes. New text additions are highlighted in green.
 */
export function PromptDiff({
  prompt,
  className,
  highlightDuration = 2000
}: PromptDiffProps) {
  const [previousPrompt, setPreviousPrompt] = useState(prompt)
  const [showDiff, setShowDiff] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate the diff between previous and current prompt
  const diffResult = useMemo(() => {
    if (!showDiff || previousPrompt === prompt) {
      return [{ text: prompt, isNew: false }]
    }

    // Simple word-based diff
    const prevWords = previousPrompt.split(/(\s+)/)
    const currWords = prompt.split(/(\s+)/)

    // Find common prefix
    let prefixEnd = 0
    while (
      prefixEnd < prevWords.length &&
      prefixEnd < currWords.length &&
      prevWords[prefixEnd] === currWords[prefixEnd]
    ) {
      prefixEnd++
    }

    // Find common suffix
    let prevSuffixStart = prevWords.length
    let currSuffixStart = currWords.length
    while (
      prevSuffixStart > prefixEnd &&
      currSuffixStart > prefixEnd &&
      prevWords[prevSuffixStart - 1] === currWords[currSuffixStart - 1]
    ) {
      prevSuffixStart--
      currSuffixStart--
    }

    const result: { text: string; isNew: boolean }[] = []

    // Common prefix
    if (prefixEnd > 0) {
      result.push({ text: prevWords.slice(0, prefixEnd).join(''), isNew: false })
    }

    // Changed/added middle section
    if (currSuffixStart > prefixEnd) {
      result.push({ text: currWords.slice(prefixEnd, currSuffixStart).join(''), isNew: true })
    }

    // Common suffix
    if (currSuffixStart < currWords.length) {
      result.push({ text: currWords.slice(currSuffixStart).join(''), isNew: false })
    }

    return result
  }, [prompt, previousPrompt, showDiff])

  // Detect changes and trigger highlighting
  useEffect(() => {
    if (prompt !== previousPrompt) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Show the diff
      setShowDiff(true)

      // Schedule hiding the diff
      timeoutRef.current = setTimeout(() => {
        setShowDiff(false)
        setPreviousPrompt(prompt)
      }, highlightDuration)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [prompt, previousPrompt, highlightDuration])

  // Initial mount - set previous prompt
  useEffect(() => {
    setPreviousPrompt(prompt)
  }, [])

  if (!prompt) {
    return (
      <span className={cn('text-slate-400 italic', className)}>
        Select a preset or adjust settings to generate a prompt
      </span>
    )
  }

  return (
    <span className={className}>
      {diffResult.map((segment, index) => (
        <span
          key={index}
          className={cn(
            'transition-all duration-500',
            segment.isNew && showDiff && 'bg-green-100 text-green-800 rounded px-0.5'
          )}
        >
          {segment.text}
        </span>
      ))}
    </span>
  )
}

export default PromptDiff
