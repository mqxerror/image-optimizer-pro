interface ModelSelectorProps {
  model: string
  onChange: (model: string) => void
}

const modelOptions: { value: string; label: string; description: string; speed: string; quality: string }[] = [
  {
    value: 'flux-kontext-pro',
    label: 'Flux Kontext Pro',
    description: 'Fast, balanced results',
    speed: 'Fast',
    quality: 'High',
  },
  {
    value: 'flux-kontext-max',
    label: 'Flux Kontext Max',
    description: 'Best quality, slower',
    speed: 'Slow',
    quality: 'Ultra',
  },
  {
    value: 'nano-banana-pro',
    label: 'Nano Banana Pro',
    description: 'Jewelry-optimized',
    speed: 'Medium',
    quality: 'High',
  },
]

export function ModelSelector({ model, onChange }: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      {modelOptions.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`w-full text-left p-3 rounded-lg border transition-all ${
            model === option.value
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-purple-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-gray-900 text-sm">{option.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
            </div>
            <div className="flex gap-2 text-[10px]">
              <span className={`px-1.5 py-0.5 rounded ${
                option.speed === 'Fast' ? 'bg-green-100 text-green-700' :
                option.speed === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {option.speed}
              </span>
              <span className={`px-1.5 py-0.5 rounded ${
                option.quality === 'Ultra' ? 'bg-purple-100 text-purple-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {option.quality}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
