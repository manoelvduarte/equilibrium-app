import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { formatCentsToBRL } from '@equilibrium/ui';

export default function MobileHomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Brand */}
        <View style={styles.header}>
          <Text style={styles.title}>Equilibrium Mobile</Text>
          <Text style={styles.subtitle}>Gestão Financeira para Casais</Text>
        </View>

        {/* Net Worth Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PATRIMÔNIO LÍQUIDO</Text>
          <Text style={styles.cardAmount}>{formatCentsToBRL(7843000)}</Text>
          <Text style={styles.cardBadge}>+63.3% YoY • Nosso Casa</Text>
        </View>

        {/* Quick Add Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Módulos Mobile Ativos</Text>
          <Text style={styles.item}>• Quick-Add com Linguagem Natural</Text>
          <Text style={styles.item}>• Leitura de Recibo por Câmera (OCR)</Text>
          <Text style={styles.item}>• Chat de IA Agêntica sob Aprovação Prévia</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
  },
  cardAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
    marginVertical: 4,
    fontFamily: 'Courier',
  },
  cardBadge: {
    fontSize: 12,
    color: '#34d399',
  },
  section: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  item: {
    fontSize: 13,
    color: '#cbd5e1',
  },
});
