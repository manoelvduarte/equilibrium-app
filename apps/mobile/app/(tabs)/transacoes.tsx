import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useHouseholdDataMobile, MobileTransaction } from '../../src/hooks/useHouseholdDataMobile';
import { formatCentsToBRL } from '@equilibrium/ui';
import { supabase } from '../../src/lib/supabase';
import {
  Plus,
  Trash2,
  Undo2,
  Receipt,
  Camera,
} from 'lucide-react-native';

export default function MobileTransactionsScreen() {
  const router = useRouter();
  const { transactions, loading, refetch } = useHouseholdDataMobile();
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [deletedTx, setDeletedTx] = useState<MobileTransaction | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  const filteredTransactions = transactions.filter((t) => {
    if (filter !== 'all' && t.type !== filter) return false;
    return true;
  });

  const handleDelete = async (tx: MobileTransaction) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', tx.id);

      if (error) throw error;

      setDeletedTx(tx);
      await refetch();

      if (undoTimer) clearTimeout(undoTimer);
      const timer = setTimeout(() => {
        setDeletedTx(null);
      }, 5000);
      setUndoTimer(timer);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao excluir transação.');
    }
  };

  const handleUndo = async () => {
    if (!deletedTx) return;
    try {
      await supabase
        .from('transactions')
        .update({ deleted_at: null })
        .eq('id', deletedTx.id);

      setDeletedTx(null);
      if (undoTimer) clearTimeout(undoTimer);
      await refetch();
    } catch (err) {
      console.error('Erro ao restaurar transação:', err);
    }
  };

  return (
    <View className="flex-1 bg-paper">
      
      {/* Filter Chips Bar */}
      <View className="p-4 bg-surface border-b border-hairline flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            onPress={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-[6px] ${
              filter === 'all' ? 'bg-surface-2 border border-hairline' : ''
            }`}
          >
            <Text className={`font-sans text-xs ${filter === 'all' ? 'font-bold text-ink' : 'text-ink-3'}`}>
              Todas ({transactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('expense')}
            className={`px-3 py-1.5 rounded-[6px] ml-1.5 ${
              filter === 'expense' ? 'bg-surface-2 border border-hairline' : ''
            }`}
          >
            <Text className={`font-sans text-xs ${filter === 'expense' ? 'font-bold text-danger' : 'text-ink-3'}`}>
              Despesas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('income')}
            className={`px-3 py-1.5 rounded-[6px] ml-1.5 ${
              filter === 'income' ? 'bg-surface-2 border border-hairline' : ''
            }`}
          >
            <Text className={`font-sans text-xs ${filter === 'income' ? 'font-bold text-brand' : 'text-ink-3'}`}>
              Receitas
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/adicionar')}
          className="p-1.5 bg-brand rounded-[6px]"
        >
          <Plus size={16} color="#FAF8F4" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Undo Toast Notification */}
      {deletedTx && (
        <View className="m-4 p-3 bg-surface border border-hairline rounded-[8px] flex-row items-center justify-between shadow-md">
          <Text className="font-sans text-xs text-ink flex-1" numberOfLines={1}>
            "{deletedTx.description}" excluída.
          </Text>
          <TouchableOpacity
            onPress={handleUndo}
            className="flex-row items-center space-x-1 px-2.5 py-1 bg-surface-2 rounded-[4px] ml-2"
          >
            <Undo2 size={12} color="#1E5C43" />
            <Text className="font-sans-bold text-xs text-brand ml-1">Desfazer (5s)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#1E5C43" />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center p-8 space-y-3 my-auto">
            <Receipt size={32} color="#877F73" />
            <Text className="font-display text-base font-medium text-ink">Nenhuma transação encontrada</Text>
            <Text className="font-sans text-xs text-ink-3 text-center">
              Comece adicionando uma despesa rápida ou escaneando uma nota.
            </Text>
            <View className="flex-row space-x-3 pt-2">
              <TouchableOpacity
                onPress={() => router.push('/escanear')}
                className="px-3.5 py-2 bg-surface border border-hairline rounded-[6px] flex-row items-center space-x-1.5 shadow-sm"
              >
                <Camera size={14} color="#1E5C43" />
                <Text className="font-sans-medium text-xs text-ink ml-1">Escanear Nota</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/adicionar')}
                className="px-3.5 py-2 bg-brand rounded-[6px] flex-row items-center space-x-1.5 shadow-sm ml-2"
              >
                <Plus size={14} color="#FAF8F4" strokeWidth={2} />
                <Text className="font-sans-bold text-xs text-paper ml-1">Adicionar Gasto</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-[1px] bg-hairline" />}
        renderItem={({ item }) => (
          <View className="py-3 px-1 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="font-sans-medium text-sm text-ink" numberOfLines={1}>
                {item.description}
              </Text>
              <View className="flex-row items-center space-x-2 mt-0.5">
                <Text className="font-mono text-[11px] text-ink-3">{item.date}</Text>
                <Text className="text-[10px] text-ink-3">•</Text>
                <Text className="font-sans text-[11px] text-ink-3">
                  {item.category?.name || 'Geral'}
                </Text>
                <Text className="text-[10px] text-ink-3">•</Text>
                <View className="px-1.5 py-0.2 bg-surface-2 border border-hairline rounded-[3px]">
                  <Text className="font-mono text-[9px] uppercase text-ink-3">
                    {item.source || 'manual'}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center space-x-3">
              <View className="items-end">
                <Text
                  className={`font-mono text-sm font-bold ${
                    item.type === 'income' ? 'text-brand' : 'text-danger'
                  }`}
                >
                  {item.type === 'income' ? '+' : '−'}
                  {formatCentsToBRL(item.amount_cents)}
                </Text>
                <Text className="font-sans text-[10px] text-ink-3">
                  {item.account?.name || 'Conta'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDelete(item)}
                className="p-1.5 ml-2"
                title="Excluir"
              >
                <Trash2 size={14} color="#877F73" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

    </View>
  );
}
