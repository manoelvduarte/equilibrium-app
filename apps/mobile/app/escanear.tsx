import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../src/lib/supabase';
import { useHouseholdDataMobile } from '../src/hooks/useHouseholdDataMobile';
import { formatCentsToBRL, parseBRLToCents } from '@equilibrium/ui';
import {
  Camera,
  X,
  Check,
  RotateCcw,
  ImageIcon,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';

const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || 'http://localhost:3000';

type OCRStep = 'camera' | 'processing' | 'review';

export default function EscanearScreen() {
  const router = useRouter();
  const { accounts, categories, userProfile, refetch } = useHouseholdDataMobile();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [step, setStep] = useState<OCRStep>('camera');
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State para revisão do OCR
  const [merchant, setMerchant] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Processar imagem base64 na rota /api/ocr do Web
  const processImageOCR = async (base64: string) => {
    setCapturedImageBase64(base64);
    setStep('processing');
    setErrorMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await fetch(`${WEB_API_URL}/api/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao processar OCR da imagem.');
      }

      const result = await response.json();

      // Preencher campos com extração
      if (result.merchant) setMerchant(result.merchant);
      if (result.date) setDate(result.date);
      if (result.totalCents && result.totalCents > 0) {
        setAmountStr((result.totalCents / 100).toFixed(2).replace('.', ','));
      }

      // Sugestão automática de categoria pelo nome do merchant
      if (result.merchant) {
        const lowerMerchant = result.merchant.toLowerCase();
        const matchedCat = categories.find((c) =>
          lowerMerchant.includes(c.name.toLowerCase())
        );
        if (matchedCat) {
          setSelectedCategoryId(matchedCat.id);
        } else if (categories.length > 0) {
          setSelectedCategoryId(categories[0].id);
        }
      } else if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }

      setStep('review');
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha na leitura do comprovante.');
      setStep('review'); // Permite preenchimento manual caso o OCR falhe
    }
  };

  // 2. Tirar foto pela câmera
  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      if (photo?.base64) {
        processImageOCR(photo.base64);
      }
    } catch (err: any) {
      Alert.alert('Erro na Câmera', err.message || 'Falha ao capturar foto.');
    }
  };

  // 3. Escolher foto da galeria
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        processImageOCR(result.assets[0].base64);
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao abrir galeria.');
    }
  };

  // 4. Salvar transação com source = 'ocr'
  const handleConfirmSave = async () => {
    const cents = parseBRLToCents(amountStr);
    if (cents <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido em reais.');
      return;
    }
    if (!selectedAccountId || !userProfile?.household_id) {
      Alert.alert('Atenção', 'Selecione uma conta válida.');
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from('transactions').insert({
      household_id: userProfile.household_id,
      account_id: selectedAccountId,
      category_id: selectedCategoryId || null,
      created_by_id: userProfile.id,
      description: merchant.trim() || 'Comprovante Escaneado',
      merchant: merchant.trim() || null,
      amount_cents: cents,
      type: 'expense',
      date: date || new Date().toISOString().split('T')[0],
      source: 'ocr',
      version: 1,
    });

    setIsSaving(false);

    if (error) {
      Alert.alert('Erro ao Salvar', error.message || 'Falha ao gravar no banco.');
    } else {
      await refetch();
      router.replace('/(tabs)/transacoes');
    }
  };

  // 5. Permissão de câmera
  if (!permission) {
    return (
      <View className="flex-1 bg-paper items-center justify-center p-6">
        <ActivityIndicator color="#1E5C43" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-paper items-center justify-center p-6 space-y-4">
        <Camera size={40} color="#877F73" />
        <Text className="font-display text-base font-bold text-ink text-center">
          Permissão de Câmera Necessária
        </Text>
        <Text className="font-sans text-xs text-ink-3 text-center">
          O Equilibrium precisa da câmera para escanear recibos e notas fiscais.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="px-6 py-3 bg-brand rounded-[8px] mt-2"
        >
          <Text className="font-sans-bold text-xs text-paper">Permitir Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickFromGallery} className="p-2 mt-2">
          <Text className="font-sans text-xs text-brand underline">
            Ou selecione da galeria de fotos
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper"
    >
      {/* Header */}
      <View className="p-4 bg-surface border-b border-hairline flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2">
          <Camera size={18} color="#1E5C43" />
          <Text className="font-display text-base font-medium text-ink ml-1.5">
            Escanear Comprovante
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <X size={20} color="#877F73" />
        </TouchableOpacity>
      </View>

      {/* STEP 1: CAMERA */}
      {step === 'camera' && (
        <View className="flex-1 bg-ink">
          <CameraView ref={cameraRef} className="flex-1 justify-between p-6">
            <View className="items-center mt-4">
              <View className="px-3 py-1.5 bg-ink/60 rounded-[6px]">
                <Text className="font-sans text-xs text-paper">
                  Aponte para a nota fiscal ou recibo
                </Text>
              </View>
            </View>

            {/* Bottom Controls */}
            <View className="flex-row items-center justify-around pb-6">
              <TouchableOpacity
                onPress={handlePickFromGallery}
                className="w-12 h-12 rounded-full bg-surface/30 items-center justify-center"
                title="Galeria"
              >
                <ImageIcon size={22} color="#FAF8F4" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTakePicture}
                className="w-18 h-18 rounded-full bg-paper border-4 border-brand items-center justify-center shadow-lg"
              >
                <View className="w-14 h-14 rounded-full bg-brand items-center justify-center">
                  <Camera size={24} color="#FAF8F4" />
                </View>
              </TouchableOpacity>

              <View className="w-12 h-12" />
            </View>
          </CameraView>
        </View>
      )}

      {/* STEP 2: PROCESSING LOADER */}
      {step === 'processing' && (
        <View className="flex-1 items-center justify-center p-8 space-y-4">
          <ActivityIndicator size="large" color="#1E5C43" />
          <Text className="font-display text-base font-bold text-ink">
            Lendo Comprovante com IA...
          </Text>
          <Text className="font-sans text-xs text-ink-3 text-center">
            Extraindo estabelecimento, data e valor total da compra.
          </Text>
        </View>
      )}

      {/* STEP 3: REVIEW FORM */}
      {step === 'review' && (
        <ScrollView contentContainerStyle={{ padding: 16 }} className="space-y-4">
          {errorMessage && (
            <View className="p-3 bg-surface-2 border border-hairline rounded-[6px] flex-row items-center space-x-2">
              <AlertCircle size={16} color="#A66A21" />
              <Text className="font-sans text-xs text-ink-2 flex-1 ml-2">
                {errorMessage} (Preencha os dados manualmente abaixo)
              </Text>
            </View>
          )}

          <View className="p-3 bg-surface-2 border border-hairline rounded-[8px] flex-row items-center space-x-2">
            <ShieldCheck size={16} color="#1E5C43" />
            <Text className="font-sans text-xs text-ink ml-1.5 flex-1">
              Confirme os dados extraídos do comprovante antes de salvar:
            </Text>
          </View>

          {/* Merchant / Descrição */}
          <View className="space-y-1">
            <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">
              Estabelecimento / Descrição
            </Text>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Ex: Supermercado Pão de Açúcar"
              placeholderTextColor="#877F73"
              className="w-full px-3.5 py-2.5 bg-surface border border-hairline rounded-[6px] text-ink font-sans text-sm"
            />
          </View>

          {/* Valor e Data */}
          <View className="flex-row space-x-3">
            <View className="flex-1 space-y-1">
              <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">
                Valor Total (R$)
              </Text>
              <TextInput
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor="#877F73"
                className="w-full px-3.5 py-2.5 bg-surface border border-hairline rounded-[6px] text-ink font-mono text-sm font-bold"
              />
            </View>

            <View className="flex-1 space-y-1 ml-3">
              <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">
                Data
              </Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#877F73"
                className="w-full px-3.5 py-2.5 bg-surface border border-hairline rounded-[6px] text-ink font-mono text-sm"
              />
            </View>
          </View>

          {/* Conta */}
          <View className="space-y-1 pt-2">
            <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">
              Conta de Pagamento
            </Text>
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

          {/* Categoria */}
          <View className="space-y-1 pt-2">
            <Text className="font-sans text-[10px] uppercase tracking-wider text-ink-3">
              Categoria
            </Text>
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

          {/* Buttons */}
          <View className="pt-4 flex-row space-x-3">
            <TouchableOpacity
              onPress={() => setStep('camera')}
              className="flex-1 py-3 bg-surface border border-hairline rounded-[8px] items-center justify-center flex-row space-x-1"
            >
              <RotateCcw size={14} color="#877F73" />
              <Text className="font-sans-medium text-xs text-ink ml-1">Escanear Outra</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmSave}
              disabled={isSaving}
              className="flex-1 py-3 bg-brand rounded-[8px] items-center justify-center flex-row space-x-1 shadow-sm ml-2"
            >
              {isSaving ? (
                <ActivityIndicator color="#FAF8F4" />
              ) : (
                <>
                  <Check size={16} color="#FAF8F4" />
                  <Text className="font-sans-bold text-xs text-paper ml-1">Salvar Nota</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

    </KeyboardAvoidingView>
  );
}
