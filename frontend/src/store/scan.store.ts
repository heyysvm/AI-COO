import { create } from 'zustand'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface ScanState {
  scanning: boolean
  isModalOpen: boolean
  scanType: 'product' | 'customer' | 'order' | 'expense'
  extractedData: any
  setIsModalOpen: (isOpen: boolean) => void
  setScanType: (type: 'product' | 'customer' | 'order' | 'expense') => void
  setExtractedData: (data: any) => void
  uploadAndScan: (file: File) => Promise<void>
}

export const useScanStore = create<ScanState>((set) => ({
  scanning: false,
  isModalOpen: false,
  scanType: 'product',
  extractedData: null,

  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
  setScanType: (type) => set({ scanType: type }),
  setExtractedData: (data) => set({ extractedData: data }),

  uploadAndScan: async (file) => {
    set({ scanning: true })
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/seed/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (res.data && res.data.type && res.data.data) {
        set({
          scanType: res.data.type,
          extractedData: res.data.data,
          isModalOpen: true,
        })
        toast.success(`OCR Scan complete: Detected ${res.data.type}!`)
      } else {
        toast.error('Could not parse data from document.')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.detail || 'Document scan failed.')
    } finally {
      set({ scanning: false })
    }
  },
}))
