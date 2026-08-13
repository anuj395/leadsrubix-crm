import { createContext, useContext, useState, ReactNode } from 'react'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

interface ConfirmOptions {
  title?: string
  message?: string
  onConfirm: () => void
}

interface ConfirmContextType {
  confirmDelete: (options: ConfirmOptions) => void
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

interface ConfirmProviderProps {
  children: ReactNode
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  const confirmDelete = (opts: ConfirmOptions) => {
    setOptions(opts)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setOptions(null)
  }

  const handleConfirm = () => {
    if (options?.onConfirm) {
      options.onConfirm()
    }
    handleClose()
  }

  return (
    <ConfirmContext.Provider value={{ confirmDelete }}>
      {children}
      <DeleteConfirmDialog
        open={open}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={options?.title}
        message={options?.message}
      />
    </ConfirmContext.Provider>
  )
}
