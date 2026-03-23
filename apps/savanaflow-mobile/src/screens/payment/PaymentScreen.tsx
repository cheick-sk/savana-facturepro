import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Divider,
  RadioButton,
  useTheme,
  Surface,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCartStore } from '../../store/cart';
import { useNetworkStore } from '../../store/network';

const PAYMENT_METHODS = [
  { key: 'CASH', label: 'Espèces', icon: 'cash' },
  { key: 'ORANGE_MONEY', label: 'Orange Money', icon: 'cellphone' },
  { key: 'MTN_MOMO', label: 'MTN MoMo', icon: 'cellphone' },
  { key: 'WAVE', label: 'Wave', icon: 'wave' },
  { key: 'CARD', label: 'Carte bancaire', icon: 'credit-card' },
];

export default function PaymentScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { isConnected } = useNetworkStore();
  const { clearCart, customer } = useCartStore();

  const { subtotal, tax, total, items } = route.params || {
    subtotal: 0,
    tax: 0,
    total: 0,
    items: [],
  };

  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const change = Math.max(0, (parseFloat(amountTendered) || 0) - total);

  const handlePayment = async () => {
    if (paymentMethod === 'CASH') {
      const tendered = parseFloat(amountTendered);
      if (isNaN(tendered) || tendered < total) {
        Alert.alert(t('common.error'), 'Montant insuffisant');
        return;
      }
    }

    if (['ORANGE_MONEY', 'MTN_MOMO', 'WAVE'].includes(paymentMethod)) {
      if (!phoneNumber || phoneNumber.length < 8) {
        Alert.alert(t('common.error'), 'Numéro de téléphone invalide');
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate sale number
      const saleNumber = `VNT-${Date.now().toString(36).toUpperCase()}`;

      // Clear cart
      clearCart();

      // Show success
      Alert.alert(
        '✅ ' + t('pos.saleCompleted'),
        `Vente ${saleNumber} enregistrée avec succès !\n\nTotal: ${total.toLocaleString()} XOF`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainTabs', { screen: 'POS' }),
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('common.error'), 'Erreur lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Summary */}
      <Surface style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Récapitulatif</Text>
        
        <View style={styles.summaryRow}>
          <Text>{t('common.subtotal')}</Text>
          <Text>{subtotal.toLocaleString()} XOF</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>TVA (18%)</Text>
          <Text>{tax.toLocaleString()} XOF</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>{t('common.total')}</Text>
          <Text style={styles.totalValue}>{total.toLocaleString()} XOF</Text>
        </View>

        {customer && customer.id > 0 && (
          <View style={styles.customerInfo}>
            <Text style={styles.customerLabel}>Client: {customer.name}</Text>
          </View>
        )}
      </Surface>

      {/* Payment Method */}
      <Text style={styles.sectionTitle}>{t('pos.paymentMethod')}</Text>
      <RadioButton.Group
        onValueChange={setPaymentMethod}
        value={paymentMethod}
      >
        {PAYMENT_METHODS.map(method => (
          <Card 
            key={method.key}
            style={[
              styles.methodCard,
              paymentMethod === method.key && styles.methodCardSelected,
            ]}
            onPress={() => setPaymentMethod(method.key)}
          >
            <Card.Content style={styles.methodContent}>
              <RadioButton value={method.key} />
              <Text style={styles.methodLabel}>{method.label}</Text>
            </Card.Content>
          </Card>
        ))}
      </RadioButton.Group>

      {/* Cash Payment */}
      {paymentMethod === 'CASH' && (
        <Surface style={styles.cashSection}>
          <TextInput
            label={t('pos.amountTendered')}
            value={amountTendered}
            onChangeText={setAmountTendered}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            right={<TextInput.Affix text="XOF" />}
          />
          
          {parseFloat(amountTendered) >= total && (
            <View style={styles.changeRow}>
              <Text style={styles.changeLabel}>{t('pos.change')}</Text>
              <Text style={styles.changeValue}>{change.toLocaleString()} XOF</Text>
            </View>
          )}

          {/* Quick amount buttons */}
          <View style={styles.quickAmounts}>
            {[total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000].map((amount, i) => (
              <Button
                key={i}
                mode="outlined"
                onPress={() => setAmountTendered(amount.toString())}
                style={styles.quickButton}
              >
                {amount.toLocaleString()}
              </Button>
            ))}
          </View>
        </Surface>
      )}

      {/* Mobile Money */}
      {['ORANGE_MONEY', 'MTN_MOMO', 'WAVE'].includes(paymentMethod) && (
        <Surface style={styles.mobileSection}>
          <TextInput
            label={t('payment.mobileMoney.phoneNumber')}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
          />
          
          {!isConnected && (
            <Text style={styles.offlineWarning}>
              ⚠️ Vous êtes hors ligne. La transaction sera traitée lors de la reconnexion.
            </Text>
          )}
        </Surface>
      )}

      {/* Validate Button */}
      <Button
        mode="contained"
        onPress={handlePayment}
        loading={isProcessing}
        disabled={isProcessing}
        style={styles.validateButton}
        contentStyle={styles.buttonContent}
      >
        {t('pos.completeSale')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  totalRow: {
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F4E79',
  },
  customerInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  customerLabel: {
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  methodCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  methodCardSelected: {
    borderWidth: 2,
    borderColor: '#1F4E79',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodLabel: {
    marginLeft: 8,
    fontSize: 15,
  },
  cashSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickButton: {
    flex: 1,
    borderRadius: 8,
  },
  mobileSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  offlineWarning: {
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    fontSize: 13,
  },
  validateButton: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    backgroundColor: '#1F4E79',
  },
  buttonContent: {
    paddingVertical: 14,
  },
});
