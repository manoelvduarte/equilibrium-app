import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useHouseholdDataMobile } from '../../src/hooks/useHouseholdDataMobile';
import { formatCentsToBRL } from '@equilibrium/ui';
import {
  Wallet,
  CreditCard,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Receipt,
  Plus,
} from 'lucide-react-native';

export default function MobileDashboardScreen() {
  const router = useRouter();
  const {
    netWorthCents,
    monthlyIncomeCents,
    monthlyExpenseCents,
    accounts,
    transactions,
    loading,
    refetch,
  } = useHouseholdDataMobile();

  const recentTransactions = transactions.slice(0, 10);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <CreditCard size={18} color="#B4532A" />;
      case 'savings':
      case 'investment':
        return <TrendingUp size={18} color="#23606B" />;
      default:
        return <Building2 size={18} color="#1E5C43" />;
    }
  };

  if (loading && transactions.length === 0 && accounts.length === 0) {
    return (
      <View className="flex-1 bg-paper items-center justify-center p-6">
        <ActivityIndicator size="large" color="#1E5C43" />
        <Text className="font-sans text-xs text-ink-3 mt-3">Carregando finanças do casal...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#1E5C43" />}
    >
      <View className="space-y-6">
        
        {/* KPI Strip: Patrimônio Líquido */}
        <View className="bg-surface border border-hairline rounded-[12px] p-5 shadow-sm space-y-3">
          <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">
            Patrimônio Líquido Consolidado
          </Text>
          <Text className="font-display text-3xl font-bold text-ink">
            {formatCentsToBRL(netWorthCents)}
          </Text>

          {/* Sub-KPIs de Mês Corrente */}
          <View className="flex-row items-center justify-between pt-3 border-t border-hairline">
            <View className="flex-row items-center space-x-2">
              <View className="w-6 h-6 rounded-full bg-surface-2 items-center justify-center">
                <TrendingUp size={12} color="#1E5C43" />
              </View>
              <View className="ml-1.5">
                <Text className="font-sans text-[9px] uppercase tracking-wider text-ink-3">Entradas (Mês)</Text>
                <Text className="font-mono text-xs font-bold text-brand">
                  +{formatCentsToBRL(monthlyIncomeCents)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-2">
              <View className="w-6 h-6 rounded-full bg-surface-2 items-center justify-center">
                <TrendingDown size={12} color="#B3362B" />
              </View>
              <View className="ml-1.5">
                <Text className="font-sans text-[9px] uppercase tracking-wider text-ink-3">Saídas (Mês)</Text>
                <Text className="font-mono text-xs font-bold text-danger">
                  −{formatCentsToBRL(monthlyExpenseCents)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Seção: Contas do Casal */}
        <View className="space-y-2">
          <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">
            Contas e Cartões ({accounts.length})
          </Text>

          {accounts.length === 0 ? (
            <View className="p-4 bg-surface border border-hairline rounded-[8px] items-center">
              <Text className="font-sans text-xs text-ink-3">Nenhuma conta cadastrada.</Text>
            </View>
          ) : (
            <View className="bg-surface border border-hairline rounded-[12px] overflow-hidden divide-y divide-hairline">
              {accounts.map((acc) => (
                <View key={acc.id} className="p-3.5 flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-3 flex-1">
                    <View className="w-8 h-8 rounded-[6px] bg-surface-2 items-center justify-center">
                      {getAccountIcon(acc.type)}
                    </View>
                    <View className="ml-2.5 flex-1">
                      <Text className="font-sans-medium text-xs text-ink" numberOfLines={1}>
                        {acc.name}
                      </Text>
                      <Text className="font-sans text-[10px] text-ink-3 uppercase">
                        {acc.visibility === 'shared' ? 'Conjunta' : 'Individual'}
                      </Text>
                    </View>
                  </View>
                  <Text className="font-mono text-xs font-bold text-ink">
                    {formatCentsToBRL(acc.balance_cents)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Seção: Últimas Transações */}
        <View className="space-y-2">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">
              Últimas Movimentações
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/transacoes')}
              className="flex-row items-center space-x-1"
            >
              <Text className="font-sans-medium text-xs text-brand">Ver todas</Text>
              <ArrowRight size={12} color="#1E5C43" />
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View className="p-8 bg-surface border border-hairline rounded-[12px] items-center space-y-3">
              <Receipt size={24} color="#877F73" />
              <Text className="font-display text-sm font-medium text-ink">Nenhuma transação ainda</Text>
              <Text className="font-sans text-xs text-ink-3 text-center">
                Adicione um gasto rápido ou escaneie um comprovante.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/adicionar')}
                className="px-4 py-2 bg-brand rounded-[6px] flex-row items-center space-x-1.5 shadow-sm mt-1"
              >
                <Plus size={14} color="#FAF8F4" />
                <Text className="font-sans-bold text-xs text-paper ml-1">Adicionar Gasto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-surface border border-hairline rounded-[12px] overflow-hidden divide-y divide-hairline">
              {recentTransactions.map((tx) => (
                <View key={tx.id} className="p-3.5 flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="font-sans-medium text-xs text-ink" numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <View className="flex-row items-center space-x-2 mt-0.5">
                      <Text className="font-mono text-[10px] text-ink-3">{tx.date}</Text>
                      <Text className="text-[10px] text-ink-3">•</Text>
                      <Text className="font-sans text-[10px] text-ink-3">
                        {tx.category?.name || 'Geral'}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text
                      className={`font-mono text-xs font-bold ${
                        tx.type === 'income' ? 'text-brand' : 'text-danger'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '−'}
                      {formatCentsToBRL(tx.amount_cents)}
                    </Text>
                    <Text className="font-mono text-[9px] uppercase text-ink-3">
                      {tx.source || 'manual'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </View>
    </ScrollView>
  );
}
