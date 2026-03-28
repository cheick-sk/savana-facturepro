import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { InvoiceStatusBadge } from '../ui/Badge';
import { formatCurrency, formatDateShort } from '../../utils/formatters';

interface InvoiceCardProps {
  invoice: {
    id: string;
    number: string;
    customer: string;
    amount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    date: string;
    dueDate?: string;
  };
  onPress: () => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={styles.number}>{invoice.number}</Text>
            <Text style={styles.customer}>{invoice.customer}</Text>
          </View>
          <InvoiceStatusBadge status={invoice.status} />
        </View>
        
        <View style={styles.footer}>
          <View style={styles.dates}>
            <Text style={styles.dateLabel}>Date: {formatDateShort(invoice.date)}</Text>
            {invoice.dueDate && (
              <Text style={styles.dateLabel}>Échéance: {formatDateShort(invoice.dueDate)}</Text>
            )}
          </View>
          <Text style={styles.amount}>{formatCurrency(invoice.amount)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
  number: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customer: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dates: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
});

export default InvoiceCard;
