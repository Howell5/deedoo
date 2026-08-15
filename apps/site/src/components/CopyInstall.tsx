import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

export function CopyInstall({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => {
      setCopied(false)
    }, 1800)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [copied])

  return (
    <button
      className="copy-install"
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(command).then(() => {
          setCopied(true)
        })
      }}
      aria-label="Copy install command"
    >
      <code>{command}</code>
      {copied ? (
        <Check aria-hidden="true" size={17} />
      ) : (
        <Copy aria-hidden="true" size={17} />
      )}
    </button>
  )
}
