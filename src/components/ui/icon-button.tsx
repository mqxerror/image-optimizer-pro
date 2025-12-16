import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Button, type ButtonProps } from "./button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"
import { cn } from "@/lib/utils"

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  /** The icon to display */
  icon: LucideIcon
  /** Required accessible label for screen readers */
  label: string
  /** Show tooltip on hover (default: true) */
  showTooltip?: boolean
  /** Icon size className (default: h-4 w-4) */
  iconClassName?: string
}

/**
 * Accessible icon-only button with required label and optional tooltip.
 * Always includes aria-label for screen readers.
 *
 * @example
 * <IconButton icon={Trash2} label="Delete item" onClick={handleDelete} />
 * <IconButton icon={Edit} label="Edit" variant="ghost" size="sm" />
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, showTooltip = true, iconClassName, className, ...props }, ref) => {
    const button = (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("shrink-0", className)}
        aria-label={label}
        {...props}
      >
        <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
      </Button>
    )

    if (!showTooltip) {
      return button
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
)
IconButton.displayName = "IconButton"
