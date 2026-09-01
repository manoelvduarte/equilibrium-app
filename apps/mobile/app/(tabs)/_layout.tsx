import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, Receipt, Bot, Camera, LogOut, Plus } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useHouseholdDataMobile } from '../../src/hooks/useHouseholdDataMobile';

export default function TabLayout() {
  const router = useRouter();
  const { householdName, userProfile } = useHouseholdDataMobile();

  const handleLogout = () => {
    Alert.alert('Sair do Equilibrium', 'Deseja encerrar a sessão neste dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'EQ';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FAF8F4',
          borderBottomWidth: 1,
          borderBottomColor: '#E7E2D9',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitle: () => (
          <View className="flex-row items-center space-x-2">
            <View className="w-7 h-7 rounded-[6px] bg-surface border border-hairline items-center justify-center">
              <Text className="font-mono text-[11px] font-bold text-brand">
                {getInitials(userProfile?.full_name)}
              </Text>
            </View>
            <View className="ml-2">
              <Text className="font-display text-sm text-ink font-bold" numberOfLines={1}>
                {householdName || 'Equilibrium'}
              </Text>
              <Text className="font-sans text-[9px] uppercase tracking-wider text-ink-3">
                {userProfile?.full_name || 'Casal'}
              </Text>
            </View>
          </View>
        ),
        headerRight: () => (
          <View className="flex-row items-center mr-4 space-x-3">
            <TouchableOpacity
              onPress={() => router.push('/adicionar')}
              className="p-2 bg-brand rounded-[6px] shadow-sm"
              title="Adicionar Transação"
            >
              <Plus size={16} color="#FAF8F4" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} className="p-2 ml-2" title="Sair">
              <LogOut size={16} color="#877F73" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E7E2D9',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#1C1917',
        tabBarInactiveTintColor: '#877F73',
        tabBarLabelStyle: {
          fontFamily: 'IBMPlexSans_600SemiBold',
          fontSize: 10,
        },
      }}
    >
      {/* 1. Dashboard Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.5} />,
        }}
      />

      {/* 2. Central Scanner FAB */}
      <Tabs.Screen
        name="scanner_tab"
        options={{
          title: '',
          tabBarButton: () => (
            <View className="items-center justify-center -top-3">
              <TouchableOpacity
                onPress={() => router.push('/escanear')}
                activeOpacity={0.85}
                className="w-13 h-13 rounded-[12px] bg-brand items-center justify-center shadow-lg border-2 border-surface"
              >
                <Camera size={24} color="#FAF8F4" strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* 3. Transações Tab */}
      <Tabs.Screen
        name="transacoes"
        options={{
          title: 'Transações',
          tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} strokeWidth={1.5} />,
        }}
      />

      {/* 4. Assistente Tab */}
      <Tabs.Screen
        name="assistente"
        options={{
          title: 'Assistente',
          tabBarIcon: ({ color, size }) => <Bot size={size} color={color} strokeWidth={1.5} />,
        }}
      />
    </Tabs>
  );
}
