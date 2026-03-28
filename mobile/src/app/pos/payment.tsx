import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingOverlay } from '../../components/ui/Loading';
import { useCartStore } from '../../stores/cartStore';
import { useOffline } from '../../hooks/useOffline';

type PaymentMethod = 'cash' | 'mobile' | 'card';

export default function PaymentScreen() {
  const { items, total, subtotal, tax, clearCart, customer } = useCartStore();
  const { isOffline, queueCount } = useOffline();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const change = amountReceived ? parseFloat(amountReceived) - total : 0;

  const handlePayment = async () => {
    if (paymentMethod === 'cash' && parseFloat(amountReceived) < total) {
      Alert.alert('Erreur', 'Le montant reçu est insuffisant');
      return;
    }

    if (paymentMethod === 'mobile' && !mobileNumber) {
      Alert.alert('Erreur', 'Veuillez entrer le numéro de téléphone');
      return;
    }

    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      
      // Show success message
      Alert.alert(
        'Paiement réussi',
        isOffline 
          ? 'La vente a été sauvegardée et sera synchronisée ultérieurement.'
          : 'La vente a été enregistrée avec succès.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearCart();
              router.replace('/pos');
            },
          },
        ]
      );
    }, 2000);
  };

  const quickAmounts = [
    { label: 'Exact', value: Math.ceil(total) },
    { label: '5,000', value: 5000 },
    { label: '10,000', value: 10000 },
    { label: '20,000', value: 20000 },
    { label: '50,000', value: 50000 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Résumé de la commande</Text>
          
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.name} x{item.quantity}
              </Text>
              <Text style={styles.itemPrice}>
                {(item.price * item.quantity).toLocaleString()} FCFA
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalValue}>{subtotal.toLocaleString()} FCFA</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA (18%)</Text>
            <Text style={styles.totalValue}>{tax.toLocaleString()} FCFA</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{total.toLocaleString()} FCFA</Text>
          </View>
        </Card>

        {/* Payment Methods */}
        <Card style={styles.methodCard}>
          <Text style={styles.sectionTitle}>Mode de paiement</Text>
          
          <View style={styles.methodsRow}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'cash' && styles.methodButtonActive,
              ]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Ionicons
                name="cash"
                size={24}
                color={paymentMethod === 'cash' ? '#ffffff' : '#10b981'}
              />
              <Text style={[
                styles.methodText,
                paymentMethod === 'cash' && styles.methodTextActive,
              ]}>
                Espèces
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'mobile' && styles.methodButtonActive,
              ]}
              onPress={() => setPaymentMethod('mobile')}
            >
              <Ionicons
                name="phone-portrait"
                size={24}
                color={paymentMethod === 'mobile' ? '#ffffff' : '#10b981'}
              />
              <Text style={[
                styles.methodText,
                paymentMethod === 'mobile' && styles.methodTextActive,
              ]}>
                Mobile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'card' && styles.methodButtonActive,
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <Ionicons
                name="card"
                size={24}
                color={paymentMethod === 'card' ? '#ffffff' : '#10b981'}
              />
              <Text style={[
                styles.methodText,
                paymentMethod === 'card' && styles.methodTextActive,
              ]}>
                Carte
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Cash Payment */}
        {paymentMethod === 'cash' && (
          <Card style={styles.cashCard}>
            <Text style={styles.sectionTitle}>Montant reçu</Text>
            
            <TextInput
              style={styles.amountInput}
              value={amountReceived}
              onChangeText={setAmountReceived}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9ca3af"
            />

            <View style={styles.quickAmounts}>
              {quickAmounts.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.quickAmountButton}
                  onPress={() => setAmountReceived(item.value.toString())}
                >
                  <Text style={styles.quickAmountText}>
                    {item.label === 'Exact' ? 'Exact' : item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {change > 0 && (
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Monnaie à rendre</Text>
                <Text style={styles.changeValue}>{change.toLocaleString()} FCFA</Text>
              </View>
            )}
          </Card>
        )}

        {/* Mobile Payment */}
        {paymentMethod === 'mobile' && (
          <Card style={styles.mobileCard}>
            <Text style={styles.sectionTitle}>Paiement Mobile Money</Text>
            
            <View style={styles.mobileProviders}>
              <TouchableOpacity style={styles.providerButton}>
                <Text style={styles.providerName}>Orange Money</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.providerButton}>
                <Text style={styles.providerName}>MTN MoMo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.providerButton}>
                <Text style={styles.providerName}>Wave</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.mobileInput}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
              placeholder="Numéro de téléphone"
              placeholderTextColor="#9ca3af"
            />
          </Card>
        )}

        {/* Offline Warning */}
        {isOffline && (
          <View style={styles.offlineWarning}>
            <Ionicons name="cloud-offline" size={20} color="#f59e0b" />
            <Text style={styles.offlineText}>
              Mode hors ligne - La vente sera synchronisée ultérieurement
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.footer}>
        <Button
          title={`Payer ${total.toLocaleString()} FCFA`}
          onPress={handlePayment}
          fullWidth
          size="lg"
        />
      </View>

      <LoadingOverlay visible={processing} message="Traitement du paiement..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 14,
    color: '#374151',
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  methodCard: {
    marginBottom: 16,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#ffffff',
  },
  methodButtonActive: {
    backgroundColor: '#10b981',
  },
  methodText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 8,
    fontWeight: '500',
  },
  methodTextActive: {
    color: '#ffffff',
  },
  cashCard: {
    marginBottom: 16,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    paddingVertical: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
  },
  changeLabel: {
    fontSize: 16,
    color: '#065f46',
  },
  changeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  mobileCard: {
    marginBottom: 16,
  },
  mobileProviders: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  providerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  providerName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  mobileInput: {
    fontSize: 18,
    color: '#111827',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    textAlign: 'center',
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
  },
  offlineText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
});
