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
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { UserPlus, AlertCircle } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [hasInvite, setHasInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      setErrorMessage('Preencha seu nome, e-mail e senha.');
      return;
    }
    if (!hasInvite && !householdName) {
      setErrorMessage('Informe um nome para o household do casal.');
      return;
    }
    if (hasInvite && !inviteToken) {
      setErrorMessage('Cole o token de convite fornecido pelo seu parceiro.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          household_name: hasInvite ? undefined : householdName.trim(),
          invite_token: hasInvite ? inviteToken.trim() : undefined,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message || 'Falha ao registrar.');
      setLoading(false);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6 justify-center">
        <View className="max-w-md w-full mx-auto space-y-6">
          
          {/* Headline */}
          <View className="items-center space-y-1">
            <Text className="font-display text-2xl text-ink font-bold">Criar Conta</Text>
            <Text className="font-sans text-xs text-ink-3">
              Junte suas finanças com clareza e transparência
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-surface border border-hairline rounded-[12px] p-6 shadow-sm space-y-4">
            {errorMessage && (
              <View className="p-3 bg-surface-2 border border-hairline rounded-[6px] flex-row items-center space-x-2">
                <AlertCircle size={16} color="#B3362B" />
                <Text className="font-sans text-xs text-danger flex-1 ml-2">{errorMessage}</Text>
              </View>
            )}

            <View className="space-y-1">
              <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">Seu Nome Completo</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ex: Maria Silva"
                placeholderTextColor="#877F73"
                className="w-full px-3.5 py-2.5 bg-paper border border-hairline rounded-[6px] text-ink font-sans text-sm"
              />
            </View>

            <View className="space-y-1">
              <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">E-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="seu@email.com"
                placeholderTextColor="#877F73"
                className="w-full px-3.5 py-2.5 bg-paper border border-hairline rounded-[6px] text-ink font-sans text-sm"
              />
            </View>

            <View className="space-y-1">
              <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">Senha</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Pelo menos 6 caracteres"
                placeholderTextColor="#877F73"
                className="w-full px-3.5 py-2.5 bg-paper border border-hairline rounded-[6px] text-ink font-sans text-sm"
              />
            </View>

            {/* Toggle Novo Household vs Convite */}
            <View className="flex-row items-center justify-between pt-1 border-t border-hairline">
              <TouchableOpacity onPress={() => setHasInvite(false)}>
                <Text className={`font-sans text-xs ${!hasInvite ? 'text-brand font-bold' : 'text-ink-3'}`}>
                  Novo Casal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setHasInvite(true)}>
                <Text className={`font-sans text-xs ${hasInvite ? 'text-brand font-bold' : 'text-ink-3'}`}>
                  Tenho um Convite
                </Text>
              </TouchableOpacity>
            </View>

            {!hasInvite ? (
              <View className="space-y-1">
                <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">Nome do Household</Text>
                <TextInput
                  value={householdName}
                  onChangeText={setHouseholdName}
                  placeholder="Ex: Casa Silva"
                  placeholderTextColor="#877F73"
                  className="w-full px-3.5 py-2.5 bg-paper border border-hairline rounded-[6px] text-ink font-sans text-sm"
                />
              </View>
            ) : (
              <View className="space-y-1">
                <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">Token de Convite</Text>
                <TextInput
                  value={inviteToken}
                  onChangeText={setInviteToken}
                  placeholder="Cole o token UUID aqui"
                  placeholderTextColor="#877F73"
                  className="w-full px-3.5 py-2.5 bg-paper border border-hairline rounded-[6px] text-ink font-mono text-xs"
                />
              </View>
            )}

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              className="w-full py-3 bg-brand rounded-[6px] items-center justify-center flex-row space-x-2 shadow-sm"
            >
              {loading ? (
                <ActivityIndicator color="#FAF8F4" />
              ) : (
                <>
                  <UserPlus size={16} color="#FAF8F4" />
                  <Text className="font-sans-bold text-xs text-paper ml-2">Criar Minha Conta</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Login Link */}
          <View className="items-center">
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="font-sans text-xs text-ink-2">
                Já possui conta?{' '}
                <Text className="font-sans-bold text-brand underline">Fazer Login</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
