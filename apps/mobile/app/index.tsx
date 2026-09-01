import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

export default function MobileHomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Brand */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>Equilibrium</Text>
          <Text style={styles.brandSubtitle}>Sistema Financeiro para Casais</Text>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>APLICATIVO MOBILE</Text>
          <Text style={styles.cardText}>
            A fundação web e os serviços Supabase com RLS foram ativados com sucesso. O cliente móvel nativo em Expo SDK 52 será disponibilizado na Fase 3.
          </Text>
        </View>

        {/* Disabled Action Button */}
        <TouchableOpacity disabled style={styles.button}>
          <Text style={styles.buttonText}>Entrar (Fase 3)</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151310',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 20,
  },
  header: {
    gap: 4,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#F2EFE9',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#8A8478',
  },
  card: {
    backgroundColor: '#1C1915',
    borderColor: '#2A261F',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8A8478',
    letterSpacing: 0.8,
  },
  cardText: {
    fontSize: 13,
    color: '#C0BAB0',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#242019',
    borderColor: '#2A261F',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8478',
  },
});
