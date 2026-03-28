import { FileDown, Loader2 } from 'lucide-react'
import { useTimetableStore } from '../../store/timetable'
import toast from 'react-hot-toast'

interface TimetablePDFProps {
  classId: number
  className?: string
}

export default function TimetablePDF({ classId, className }: TimetablePDFProps) {
  const { exportPDF } = useTimetableStore()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportPDF(classId)
      toast.success('PDF exporté')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur lors de l\'export')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        fontSize: 13,
      }}
      className={className}
    >
      {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      {exporting ? 'Export...' : 'Exporter PDF'}
    </button>
  )
}

// Need to import useState
import { useState } from 'react'
