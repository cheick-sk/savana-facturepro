import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CreditCard, Banknote, Smartphone } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

interface PaymentModalProps {
  visible: boolean;
  total: number;
  onClose: () => void;
  onPayment: (method: string) => void;
}

export function PaymentModal({ visible, total, onClose, onPayment }: PaymentModalProps) {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [processing, setProcessing] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const paymentMethods = [
    { id: 'cash', name: t('pos.cash'), icon: Banknote, color: '#10B981' },
    { id: 'card', name: t('pos.card'), icon: CreditCard, color: '#3B82F6' },
    { id: 'mobile', name: t('pos.mobile'), icon: Smartphone, color: '#8B5CF6' },
  ];

  const change = amountReceived ? parseInt(amountReceived, 10) - total : 0;

  const handlePayment = async () => {
    if (!selectedMethod) return;
    
    setProcessing(true);
    try {
      await onPayment(selectedMethod);
    } finally {
      setProcessing(false);
      setSelectedMethod(null);
      setAmountReceived('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('pos.payment')}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>{t('pos.totalToPay')}</Text>
          <Text style={styles.totalAmount}>{formatAmount(total)}</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.methodsSection}>
          <Text style={styles.sectionTitle}>{t('pos.selectPaymentMethod')}</Text>
          <View style={styles.methodsGrid}>
            {paymentMethods.map((method) => {
              const IconComponent = method.icon;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodCard,
                    selectedMethod === method.id && styles.methodCardSelected,
                    { borderColor: selectedMethod === method.id ? method.color : '#E5E7EB' },
                  ]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <View style={[styles.methodIcon, { backgroundColor: `${method.color}15` }]}>
                    <IconComponent size={24} color={method.color} />
                  </View>
                  <Text style={styles.methodName}>{method.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cash Amount (for cash payments) */}
        {selectedMethod === 'cash' && (
          <View style={styles.cashSection}>
            <Text style={styles.sectionTitle}>{t('pos.amountReceived')}</Text>
            <TextInput
              style={styles.amountInput}
              value={amountReceived}
              onChangeText={setAmountReceived}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
            {change > 0 && (
              <View style={styles.changeSection}>
                <Text style={styles.changeLabel}>{t('pos.change')}</Text>
                <Text style={styles.changeAmount}>{formatAmount(change)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Quick Amounts */}
        {selectedMethod === 'cash' && (
          <View style={styles.quickAmounts}>
            {[1000, 2000, 5000, 10000, 20000].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAmountBtn}
                onPress={() => setAmountReceived(amount.toString())}
              >
                <Text style={styles.quickAmountText}>
                  {new Intl.NumberFormat('fr-FR').format(amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pay Button */}
        <View style={styles.footer}>
          <Button
            title={`${t('pos.confirmPayment')} - ${formatAmount(total)}`}
            onPress={handlePayment}
            disabled={!selectedMethod}
            loading={processing}
            fullWidth
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  totalSection: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  methodsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  methodsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  methodCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  methodCardSelected: {
    backgroundColor: '#F9FAFB',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  cashSection: {
    padding: 16,
  },
  amountInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  changeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
  },
  changeLabel: {
    fontSize: 14,
    color: '#166534',
  },
  changeAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  quickAmountBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  quickAmountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    marginTop: 'auto',
  },
});
