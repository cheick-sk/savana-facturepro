import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';

interface InvoiceCardProps {
  invoice: {
    id: string;
    number: string;
    customer: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue' | 'draft';
    date: string;
  };
  onPress: () => void;
}

export function InvoiceCard({ invoice, onPress }: InvoiceCardProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const getStatusVariant = () => {
    switch (invoice.status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.number}>{invoice.number}</Text>
        <Text style={styles.customer}>{invoice.customer}</Text>
        <Text style={styles.date}>{invoice.date}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatAmount(invoice.amount)}</Text>
        <Badge variant={getStatusVariant()}>
          {invoice.status}
        </Badge>
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  left: {
    flex: 1,
  },
  number: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customer: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  right: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
});
