import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useHouseholdDataMobile } from '../src/hooks/useHouseholdDataMobile';
import { parseNaturalInput, formatCentsToBRL } from '@equilibrium/ui';
import { Plus, X, ArrowRight, AlertCircle, Check } from 'lucide-react-native';

export default function AdicionarTransacaoModal() {
  const router = useRouter();
  const { accounts, categories, userProfile, refetch } = useHouseholdDataMobile();

  const [inputStr, setInputStr] = useState('');
  const [parsedDesc, setParsedDesc] = useState('');
  const [parsedCents, setParsedCents] = useState(0);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInputChange = (val: string) => {
    setInputStr(val);
    const parsed = parseNaturalInput(val);
    setParsedDesc(parsed.description);
    setParsedCents(parsed.amountCents);
    setType(parsed.type);
  };

  const handleSubmit = async () => {
    if (parsedCents <= 0) {
      setErrorMessage('Informe um valor válido em reais (ex: 45,50).');
      return;
    }
    if (!selectedAccountId || !userProfile?.household_id) {
      setErrorMessage('Selecione uma conta válida.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.from('transactions').insert({
      household_id: userProfile.household_id,
      account_id: selectedAccountId,
      category_id: selectedCategoryId || null,
      created_by_id: userProfile.id,
      description: parsedDesc || inputStr || 'Despesa rápida',
      amount_cents: parsedCents,
      type,
      date: new Date().toISOString().split('T')[0],
      source: 'manual',
      version: 1,
    });

    if (error) {
      setErrorMessage(error.message || 'Falha ao salvar transação.');
      setLoading(false);
    } else {
      await refetch();
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper"
    >
      {/* Header */}
      <View className="p-4 bg-surface border-b border-hairline flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2">
          <Plus size={18} color="#1E5C43" strokeWidth={2.5} />
          <Text className="font-display text-base font-medium text-ink ml-1.5">
            Adicionar Rápido
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <X size={20} color="#877F73" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} className="space-y-4">
        {errorMessage && (
          <View className="p-3 bg-surface-2 border border-hairline rounded-[6px] flex-row items-center space-x-2">
            <AlertCircle size={16} color="#B3362B" />
            <Text className="font-sans text-xs text-danger flex-1 ml-2">{errorMessage}</Text>
          </View>
        )}

        {/* NLP Input */}
        <View className="space-y-1">
          <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">
            Digite em linguagem natural
          </Text>
          <TextInput
            autoFocus
            value={inputStr}
            onChangeText={handleInputChange}
            placeholder="Ex: Almoço 45,50, Mercado 180, Salário 8000"
            placeholderTextColor="#877F73"
            className="w-full px-3.5 py-3 bg-surface border border-hairline rounded-[8px] text-ink font-sans text-sm"
          />
          <Text className="font-sans text-[11px] text-ink-3">
            O sistema extrai automaticamente a descrição e o valor.
          </Text>
        </View>

        {/* Realtime Preview */}
        {parsedCents > 0 && (
          <View className="p-3 bg-surface-2 border border-hairline rounded-[8px] space-y-1">
            <Text className="font-sans text-[9px] uppercase tracking-wider text-ink-3">
              Pré-visualização do Registro
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-medium text-xs text-ink flex-1 mr-2" numberOfLines={1}>
                {parsedDesc || 'Transação'}
              </Text>
              <Text
                className={`font-mono text-sm font-bold ${
                  type === 'income' ? 'text-brand' : 'text-danger'
                }`}
              >
                {type === 'income' ? '+' : '−'}
                {formatCentsToBRL(parsedCents)}
              </Text>
            </View>
          </View>
        )}

        {/* Account Selector */}
        <View className="space-y-1 pt-2">
          <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">Conta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                onPress={() => setSelectedAccountId(acc.id)}
                className={`px-3.5 py-2 rounded-[6px] border ${
                  selectedAccountId === acc.id
                    ? 'bg-brand border-brand'
                    : 'bg-surface border-hairline'
                }`}
              >
                <Text
                  className={`font-sans-medium text-xs ${
                    selectedAccountId === acc.id ? 'text-paper' : 'text-ink'
                  }`}
                >
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category Selector */}
        <View className="space-y-1 pt-2">
          <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">Categoria</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-[6px] border ${
                  selectedCategoryId === cat.id
                    ? 'bg-ink border-ink'
                    : 'bg-surface border-hairline'
                }`}
              >
                <Text
                  className={`font-sans text-xs ${
                    selectedCategoryId === cat.id ? 'text-paper font-bold' : 'text-ink'
                  }`}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <View className="pt-4">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || parsedCents <= 0}
            className="w-full py-3.5 bg-brand rounded-[8px] items-center justify-center flex-row space-x-2 shadow-sm"
          >
            {loading ? (
              <ActivityIndicator color="#FAF8F4" />
            ) : (
              <>
                <Text className="font-sans-bold text-xs text-paper">Salvar Transação</Text>
                <ArrowRight size={16} color="#FAF8F4" />
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
