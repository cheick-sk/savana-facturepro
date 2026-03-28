import { useState } from 'react'
import { ChevronRight, ChevronDown, Plus, Edit, Trash2 } from 'lucide-react'
import { Account } from '../../store/accounting'

interface AccountTreeProps {
  accounts: Account[]
  selectedAccount: Account | null
  onSelectAccount: (account: Account) => void
  onEditAccount?: (account: Account) => void
  onDeleteAccount?: (account: Account) => void
  showActions?: boolean
  level?: number
}

export default function AccountTree({
  accounts,
  selectedAccount,
  onSelectAccount,
  onEditAccount,
  onDeleteAccount,
  showActions = true,
  level = 0
}: AccountTreeProps) {
  if (!accounts || accounts.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        Aucun compte trouvé
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {accounts.map(account => (
        <AccountNode
          key={account.id}
          account={account}
          selectedAccount={selectedAccount}
          onSelectAccount={onSelectAccount}
          onEditAccount={onEditAccount}
          onDeleteAccount={onDeleteAccount}
          showActions={showActions}
          level={level}
        />
      ))}
    </div>
  )
}

interface AccountNodeProps {
  account: Account
  selectedAccount: Account | null
  onSelectAccount: (account: Account) => void
  onEditAccount?: (account: Account) => void
  onDeleteAccount?: (account: Account) => void
  showActions: boolean
  level: number
}

function AccountNode({
  account,
  selectedAccount,
  onSelectAccount,
  onEditAccount,
  onDeleteAccount,
  showActions,
  level
}: AccountNodeProps) {
  const [expanded, setExpanded] = useState(level < 2)
  const hasChildren = account.children && account.children.length > 0
  
  const isSelected = selectedAccount?.id === account.id
  
  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'classe_1': '#6366f1', // Indigo - Capital
      'classe_2': '#8b5cf6', // Violet - Fixed assets
      'classe_3': '#d946ef', // Fuchsia - Stocks
      'classe_4': '#ec4899', // Pink - Third parties
      'classe_5': '#f43f5e', // Rose - Cash
      'classe_6': '#f97316', // Orange - Expenses
      'classe_7': '#22c55e', // Green - Income
      'classe_8': '#3b82f6', // Blue - Special
    }
    return colors[category] || '#6b7280'
  }
  
  // Get account type label
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'asset': 'Actif',
      'liability': 'Passif',
      'equity': 'Capitaux',
      'income': 'Produits',
      'expense': 'Charges',
    }
    return labels[type] || type
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      setExpanded(!expanded)
    }
  }

  const handleSelect = () => {
    onSelectAccount(account)
  }

  return (
    <div>
      <div
        onClick={handleSelect}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          paddingLeft: `${12 + level * 20}px`,
          cursor: 'pointer',
          background: isSelected ? 'var(--bg-secondary)' : 'transparent',
          borderBottom: '1px solid var(--border-light)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'var(--bg-hover)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        {/* Expand/collapse button */}
        <div
          onClick={handleToggle}
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
            cursor: hasChildren ? 'pointer' : 'default',
            opacity: hasChildren ? 1 : 0.3,
          }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span style={{ fontSize: 10 }}>•</span>
          )}
        </div>
        
        {/* Account number */}
        <span
          style={{
            width: 60,
            fontWeight: 600,
            color: getCategoryColor(account.category),
            fontSize: 13,
          }}
        >
          {account.number}
        </span>
        
        {/* Account name */}
        <span
          style={{
            flex: 1,
            marginLeft: 8,
            color: account.is_active ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontSize: 13,
          }}
        >
          {account.name}
        </span>
        
        {/* Balance */}
        <span
          style={{
            width: 120,
            textAlign: 'right',
            fontSize: 12,
            color: account.balance >= 0 
              ? (account.account_type === 'asset' || account.account_type === 'expense' ? 'var(--text-primary)' : 'var(--success-600)')
              : 'var(--danger-500)',
          }}
        >
          {account.balance !== 0 ? (
            <>
              {account.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              {' '}
              <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
                {account.account_type === 'asset' || account.account_type === 'expense' ? 'D' : 'C'}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          )}
        </span>
        
        {/* Type badge */}
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 500,
            marginLeft: 8,
            background: `${getCategoryColor(account.category)}15`,
            color: getCategoryColor(account.category),
          }}
        >
          {getTypeLabel(account.account_type)}
        </span>
        
        {/* Actions */}
        {showActions && !account.is_system && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            {account.allow_manual_entry && onEditAccount && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditAccount(account)
                }}
                style={{
                  padding: 4,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  borderRadius: 4,
                }}
                title="Modifier"
              >
                <Edit size={14} />
              </button>
            )}
            {onDeleteAccount && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteAccount(account)
                }}
                style={{
                  padding: 4,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  borderRadius: 4,
                }}
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
        
        {/* System badge */}
        {account.is_system && (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 500,
              marginLeft: 8,
              background: 'var(--bg-secondary)',
              color: 'var(--text-tertiary)',
            }}
          >
            SYSTÈME
          </span>
        )}
      </div>
      
      {/* Children */}
      {expanded && hasChildren && (
        <AccountTree
          accounts={account.children}
          selectedAccount={selectedAccount}
          onSelectAccount={onSelectAccount}
          onEditAccount={onEditAccount}
          onDeleteAccount={onDeleteAccount}
          showActions={showActions}
          level={level + 1}
        />
      )}
    </div>
  )
}
