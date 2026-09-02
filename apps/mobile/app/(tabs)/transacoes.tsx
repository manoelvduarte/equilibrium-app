import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
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
  Download,
} from 'lucide-react-native';

const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || 'http://localhost:3000';

export default function MobileTransactionsScreen() {
  const router = useRouter();
  const { transactions, loading, refetch } = useHouseholdDataMobile();
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [deletedTx, setDeletedTx] = useState<MobileTransaction | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${WEB_API_URL}/api/export`, {
        headers,
      });

      if (!res.ok) {
        throw new Error('Falha ao baixar extrato CSV.');
      }

      const csvText = await res.text();
      await Share.share({
        title: 'equilibrium-transacoes.csv',
        message: csvText,
      });
    } catch (err: any) {
      Alert.alert('Exportar CSV', err.message || 'Erro ao exportar dados.');
    } finally {
      setExporting(false);
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

        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleExportCsv}
            disabled={exporting}
            className="p-1.5 bg-surface-2 border border-hairline rounded-[6px] mr-2"
            title="Exportar CSV"
          >
            <Download size={16} color="#1C1B18" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/adicionar')}
            className="p-1.5 bg-brand rounded-[6px]"
          >
            <Plus size={16} color="#FAF8F4" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Undo Toast Notification */}
      {deletedTx && (
        <View className="m-4 p-3 bg-surface border border-hairline rounded-[8px] shadow-md flex-row items-center justify-between">
          <Text className="font-sans text-xs text-ink flex-1 mr-2" numberOfLines={1}>
            Transação "{deletedTx.description}" excluída.
          </Text>
          <TouchableOpacity
            onPress={handleUndo}
            className="px-2.5 py-1 bg-surface-2 rounded-[4px] flex-row items-center"
          >
            <Undo2 size={12} color="#1C1B18" />
            <Text className="font-sans text-xs font-bold text-brand ml-1">Desfazer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          !loading ? (
            <View className="p-8 items-center justify-center space-y-2">
              <Receipt size={32} color="#85837D" strokeWidth={1.5} />
              <Text className="font-display text-sm font-medium text-ink mt-2">
                Nenhuma transação encontrada
              </Text>
              <Text className="font-sans text-xs text-ink-3 text-center">
                Adicione movimentações pelo botão + ou tire uma foto de um comprovante.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isExpense = item.type === 'expense';
          const amountSign = isExpense ? '-' : '+';
          const formattedAmount = `${amountSign} ${formatCentsToBRL(item.amount_cents)}`;

          return (
            <View className="p-3.5 mb-2 bg-surface border border-hairline rounded-[10px] flex-row items-center justify-between shadow-xs">
              <View className="flex-1 mr-3">
                <Text className="font-sans font-medium text-sm text-ink" numberOfLines={1}>
                  {item.description}
                </Text>
                <View className="flex-row items-center space-x-2 mt-0.5">
                  <Text className="font-mono text-[10px] text-ink-3 mr-2">
                    {item.date}
                  </Text>
                  {item.category && (
                    <Text className="font-sans text-[10px] px-1.5 py-0.2 bg-surface-2 rounded-[4px] text-ink-2">
                      {item.category.name}
                    </Text>
                  )}
                  {item.source && item.source !== 'manual' && (
                    <Text className="font-mono text-[9px] px-1 py-0.2 bg-brand/10 text-brand rounded-[4px] uppercase ml-1">
                      {item.source}
                    </Text>
                  )}
                </View>
              </View>

              <View className="items-end">
                <Text
                  className={`font-mono text-sm font-semibold ${
                    isExpense ? 'text-ink' : 'text-brand'
                  }`}
                >
                  {formattedAmount}
                </Text>

                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  className="p-1 mt-1 text-ink-3 hover:text-danger"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={13} color="#85837D" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

    </View>
  );
}
