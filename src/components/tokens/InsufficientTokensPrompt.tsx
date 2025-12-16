import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Coins, Loader2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface InsufficientTokensPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokensNeeded: number
  tokensAvailable: number
  onProceedWithAvailable?: () => void
  itemName?: string
}

const TOKEN_PACKAGES = [
  { tokens: 10, price: 10 },
  { tokens: 50, price: 45 },
  { tokens: 100, price: 90 },
]

export function InsufficientTokensPrompt({
  open,
  onOpenChange,
  tokensNeeded,
  tokensAvailable,
  onProceedWithAvailable,
  itemName = 'project'
}: InsufficientTokensPromptProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const tokenDeficit = tokensNeeded - tokensAvailable

  // Find the smallest package that covers the deficit
  const recommendedPackage = TOKEN_PACKAGES.find(pkg => pkg.tokens >= tokenDeficit) || TOKEN_PACKAGES[TOKEN_PACKAGES.length - 1]

  const handleBuyTokens = () => {
    onOpenChange(false)
    navigate('/settings')
    toast({
      title: 'Token purchase',
      description: 'Select a token package to continue.',
    })
  }

  const handleProceedWithAvailable = () => {
    if (onProceedWithAvailable) {
      onProceedWithAvailable()
    }
    onOpenChange(false)
  }

  const canProceedWithLess = tokensAvailable > 0 && onProceedWithAvailable

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Not Enough Tokens
          </DialogTitle>
          <DialogDescription>
            You need more tokens to process all images in this {itemName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Token status */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tokens needed:</span>
              <span className="font-semibold">{tokensNeeded}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your balance:</span>
              <span className="font-semibold text-amber-600">{tokensAvailable}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Tokens to add:</span>
              <span className="font-bold text-red-600">+{tokenDeficit}</span>
            </div>
          </div>

          {/* Quick purchase option */}
          <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-purple-900">Quick Fix</p>
                <p className="text-sm text-purple-700">
                  Add {recommendedPackage.tokens} tokens for ${recommendedPackage.price}
                </p>
              </div>
              <Button
                onClick={handleBuyTokens}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Buy Now
              </Button>
            </div>
          </div>

          {/* Proceed with available option */}
          {canProceedWithLess && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Process Partially</p>
                  <p className="text-sm text-muted-foreground">
                    Process {tokensAvailable} images now (you have {tokensAvailable} tokens)
                  </p>
                </div>
                <Button variant="outline" onClick={handleProceedWithAvailable}>
                  Process {tokensAvailable}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleBuyTokens}>
            <Coins className="h-4 w-4 mr-2" />
            View All Packages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
