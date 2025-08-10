// src/screens/LoginScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabaseClient';

export default function LoginScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // NÃO navegamos aqui — o App.js já troca o stack quando a sessão muda
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, _session) => {
      // nada a fazer — App.js decide qual stack renderizar
    });
    return () => sub.data?.subscription?.unsubscribe?.();
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert('Campos em falta', 'Preenche email e password.');
    if (password.length < 6) return Alert.alert('Password curta', 'Mínimo 6 caracteres.');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          Alert.alert('Verifica o teu email', 'Enviámos um link de confirmação.');
        }
        // Se "Confirm email" estiver desligado, a sessão fica ativa
        // e o App.js muda para o Home automaticamente.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // App.js fará o redirect para Home.
      }
    } catch (e) {
      Alert.alert('Erro de autenticação', e?.message || 'Tenta novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password (>= 6)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <Button
        title={busy ? 'Aguarda…' : (mode === 'login' ? 'Entrar' : 'Criar conta')}
        onPress={handleSubmit}
        disabled={busy}
      />
      {busy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

      <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        <Text style={styles.switch}>
          {mode === 'login' ? 'Ainda não tens conta? Criar conta' : 'Já tens conta? Entrar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  switch: { textAlign: 'center', marginTop: 16, color: '#4F8EF7', fontWeight: '600' },
});
