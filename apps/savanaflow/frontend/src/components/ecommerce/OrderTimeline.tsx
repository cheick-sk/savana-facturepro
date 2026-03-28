import { CheckCircle, Clock, XCircle, Truck, Package } from 'lucide-react'

interface TimelineStep {
  status: string
  label: string
  timestamp?: string
  completed?: boolean
}

interface OrderTimelineProps {
  currentStatus: string
  createdAt: string
  confirmedAt?: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
}

const STATUS_ORDER = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

export default function OrderTimeline({
  currentStatus,
  createdAt,
  confirmedAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
}: OrderTimelineProps) {
  const isCancelled = currentStatus === 'cancelled'
  const isDelivered = currentStatus === 'delivered'
  
  const steps: TimelineStep[] = [
    {
      status: 'pending',
      label: 'Commande reçue',
      timestamp: createdAt,
      completed: true,
    },
    {
      status: 'confirmed',
      label: 'Confirmée',
      timestamp: confirmedAt,
      completed: isCancelled || STATUS_ORDER.indexOf(currentStatus) >= STATUS_ORDER.indexOf('confirmed'),
    },
    {
      status: 'processing',
      label: 'En préparation',
      completed: isCancelled || STATUS_ORDER.indexOf(currentStatus) >= STATUS_ORDER.indexOf('processing'),
    },
    {
      status: 'shipped',
      label: 'Expédiée',
      timestamp: shippedAt,
      completed: isCancelled || STATUS_ORDER.indexOf(currentStatus) >= STATUS_ORDER.indexOf('shipped'),
    },
    {
      status: 'delivered',
      label: 'Livrée',
      timestamp: deliveredAt,
      completed: isDelivered,
    },
  ]

  const getStepIcon = (step: TimelineStep, index: number) => {
    if (isCancelled && step.status !== 'pending') {
      return step.completed ? <CheckCircle size={16} /> : <Clock size={16} />
    }
    
    if (step.completed) {
      return <CheckCircle size={16} />
    }
    
    if (currentStatus === step.status) {
      if (step.status === 'pending') return <Clock size={16} />
      if (step.status === 'processing') return <Package size={16} />
      if (step.status === 'shipped') return <Truck size={16} />
      return <Clock size={16} />
    }
    
    return <Clock size={16} />
  }

  const getStepStatus = (step: TimelineStep) => {
    if (isCancelled && step.status !== 'pending') {
      return step.completed ? 'completed' : 'skipped'
    }
    
    if (step.completed) return 'completed'
    if (currentStatus === step.status) return 'current'
    return 'pending'
  }

  return (
    <div className="py-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--border-light)]" />

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(step)
            
            return (
              <div key={step.status} className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                    stepStatus === 'completed'
                      ? 'bg-green-500 text-white'
                      : stepStatus === 'current'
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : stepStatus === 'skipped'
                      ? 'bg-gray-300 text-gray-500'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {getStepIcon(step, index)}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-medium ${
                        stepStatus === 'completed'
                          ? 'text-green-700'
                          : stepStatus === 'current'
                          ? 'text-emerald-700'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {new Date(step.timestamp).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                  
                  {stepStatus === 'current' && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Étape en cours
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cancelled status */}
      {isCancelled && cancelledAt && (
        <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center">
              <XCircle size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-red-700">Commande annulée</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {new Date(cancelledAt).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
