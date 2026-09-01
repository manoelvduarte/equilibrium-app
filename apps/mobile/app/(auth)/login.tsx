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
import { LogIn, AlertCircle } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Preencha seu e-mail e senha.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(error.message || 'Falha ao entrar.');
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
          
          {/* Logo & Headline */}
          <View className="items-center space-y-2">
            <View className="w-12 h-12 rounded-[12px] bg-brand items-center justify-center shadow-sm">
              <Text className="text-paper font-display text-2xl font-bold">E</Text>
            </View>
            <Text className="font-display text-2xl text-ink font-bold">Equilibrium</Text>
            <Text className="font-sans text-xs text-ink-3 uppercase tracking-widest">
              Finanças Compartilhadas
            </Text>
          </View>

          {/* Card */}
          <View className="bg-surface border border-hairline rounded-[12px] p-6 shadow-sm space-y-4">
            <Text className="font-display text-lg text-ink font-medium">Entrar na Conta</Text>

            {errorMessage && (
              <View className="p-3 bg-surface-2 border border-hairline rounded-[6px] flex-row items-center space-x-2">
                <AlertCircle size={16} color="#B3362B" />
                <Text className="font-sans text-xs text-danger flex-1 ml-2">{errorMessage}</Text>
              </View>
            )}

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
                placeholder="••••••••"
                placeholderTextColor="#877F73"
                className="w-full px-3.5 py-2.5 bg-paper border border-hairline rounded-[6px] text-ink font-sans text-sm"
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="w-full py-3 bg-brand rounded-[6px] items-center justify-center flex-row space-x-2 shadow-sm"
            >
              {loading ? (
                <ActivityIndicator color="#FAF8F4" />
              ) : (
                <>
                  <LogIn size={16} color="#FAF8F4" />
                  <Text className="font-sans-bold text-xs text-paper ml-2">Entrar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Register Link */}
          <View className="items-center">
            <TouchableOpacity onPress={() => router.push('/(auth)/registro')}>
              <Text className="font-sans text-xs text-ink-2">
                Primeira vez no casal?{' '}
                <Text className="font-sans-bold text-brand underline">Criar conta conjunta</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
