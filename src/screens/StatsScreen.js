// src/screens/StatsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { fetchUserState } from '../services/dbServices';
import stylesBase from '../styles/homeStyles';

export default function StatsScreen() {
  const navigation = useNavigation();

  const [startDate, setStartDate] = useState(null); // ISO
  const [customValue, setCustomValue] = useState(30);
  const [customUnit, setCustomUnit] = useState('days'); // 'days' | 'hours'
  const [history, setHistory] = useState([]);

  const [countdown, setCountdown] = useState({ sign: 1, d: 0, h: 0, m: 0 });
  const [nextDate, setNextDate] = useState(null); // ISO

  // carregar estado (Supabase -> fallback local)
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      let localCustomValue = 30;
      let localCustomUnit = 'days';
      let localStartDate = null;
      let localHistory = [];

      const [v, u, d, h] = await Promise.all([
        AsyncStorage.getItem('lensCustomValue'),
        AsyncStorage.getItem('lensCustomUnit'),
        AsyncStorage.getItem('lensStartDate'),
        AsyncStorage.getItem('lensHistory'),
      ]);

      if (v) localCustomValue = Number(v);
      if (u) localCustomUnit = u;
      if (d) localStartDate = d;
      if (h) localHistory = JSON.parse(h);

      if (userId) {
        try {
          const remote = await fetchUserState(userId);
          if (remote) {
            localCustomValue = Number(remote.lens_custom_value ?? localCustomValue);
            localCustomUnit  = remote.lens_custom_unit || localCustomUnit;
            localStartDate   = remote.lens_start_date || localStartDate;
            localHistory     = Array.isArray(remote.lens_history) ? remote.lens_history : localHistory;
          }
        } catch {}
      }

      setCustomValue(localCustomValue);
      setCustomUnit(localCustomUnit);
      setStartDate(localStartDate);
      setHistory(localHistory);
    })();
  }, []);

  // próxima troca + countdown
  useEffect(() => {
    if (!startDate) {
      setNextDate(null);
      return;
    }
    const days = customUnit === 'days' ? customValue : customValue / 24;
    const target = new Date(new Date(startDate).getTime() + days * 24 * 60 * 60 * 1000);
    setNextDate(target.toISOString());

    const tick = () => {
      const diff = target.getTime() - Date.now();
      const sign = diff >= 0 ? 1 : -1;
      const ms = Math.abs(diff);
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setCountdown({ sign, d, h, m });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startDate, customUnit, customValue]);

  // métricas
  const metrics = useMemo(() => {
    const arr = Array.isArray(history) ? history : [];
    const count = arr.length;
    if (count === 0) {
      return { count: 0, avg: 0, min: 0, max: 0 };
    }
    const durations = arr.map(x => Number(x.duration) || 0);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = Number((sum / count).toFixed(1));
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    return { count, avg, min, max };
  }, [history]);

  return (
    <SafeAreaView style={stylesBase.container}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 18, color: '#4F8EF7' }}>← Voltar</Text>
        </TouchableOpacity>
      </View>

      <View style={[stylesBase.content, { alignItems: 'stretch' }]}>
        <Text style={stylesBase.title}>Estatísticas</Text>

        {/* Próxima troca */}
        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Próxima troca</Text>
          <Text style={localStyles.bigText}>
            {nextDate ? new Date(nextDate).toLocaleDateString() : '—'}
          </Text>
          <Text style={localStyles.subText}>
            {nextDate
              ? (countdown.sign > 0
                  ? `Faltam ${countdown.d}d ${countdown.h}h ${countdown.m}m`
                  : `Atraso de ${countdown.d}d ${countdown.h}h ${countdown.m}m`)
              : 'Sem ciclo iniciado'}
          </Text>
        </View>

        {/* Métricas */}
        <View style={localStyles.row}>
          <Metric label="Média" value={metrics.avg ? `${metrics.avg} d` : '—'} />
          <Metric label="Mínimo" value={metrics.min ? `${metrics.min} d` : '—'} />
          <Metric label="Máximo" value={metrics.max ? `${metrics.max} d` : '—'} />
        </View>
        <View style={localStyles.row}>
          <Metric label="Ciclos" value={String(metrics.count)} />
          <Metric label="Ciclo atual" value={`${customValue} ${customUnit === 'days' ? 'dias' : 'horas'}`} />
        </View>

        {/* Histórico */}
        <Text style={[stylesBase.title, { fontSize: 22, marginTop: 12 }]}>Histórico</Text>
        <FlatList
          style={{ marginTop: 8 }}
          data={[...(Array.isArray(history) ? history : [])].reverse()}
          keyExtractor={(_, i) => i.toString()}
          ListEmptyComponent={
            <Text style={[stylesBase.text, { textAlign: 'left' }]}>
              Ainda não tens ciclos concluídos. Inicia um novo ciclo quando trocares de lentes.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={localStyles.historyRow}>
              <Text style={localStyles.historyDate}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
              <Text style={localStyles.historyDur}>
                {item.duration} d
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={localStyles.metric}>
      <Text style={localStyles.metricLabel}>{label}</Text>
      <Text style={localStyles.metricValue}>{value}</Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: { fontSize: 16, color: '#666', marginBottom: 4 },
  bigText: { fontSize: 28, fontWeight: '700', color: '#222' },
  subText: { fontSize: 16, color: '#555', marginTop: 6 },

  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metric: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  metricLabel: { fontSize: 14, color: '#666' },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#222', marginTop: 4 },

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  historyDate: { fontSize: 16, color: '#333' },
  historyDur: { fontSize: 16, fontWeight: '700', color: '#222' },
});
