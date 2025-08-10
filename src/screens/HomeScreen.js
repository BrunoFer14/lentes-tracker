// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from '../styles/homeStyles';
import GridButton from '../components/GridButton';
import {
  requestPermissions,
  scheduleCycleNotifications,
  cancelAllNotifications,
} from '../services/NotificationService';
import { supabase } from '../services/supabaseClient';
import { fetchUserState, saveUserState } from '../services/dbServices';

export default function HomeScreen() {
  const navigation = useNavigation();

  // Estado principal
  const [startDate, setStartDate] = useState(null);
  const [daysPassed, setDaysPassed] = useState(0);

  // Modais
  const [userVisible, setUserVisible] = useState(false);
  const [customizeVisible, setCustomizeVisible] = useState(false);

  // Definições
  const [customValue, setCustomValue] = useState(30); // dias
  const [reminderHour, setReminderHour] = useState(9); // 0..23

  // Histórico + utilizador
  const [history, setHistory] = useState([]);
  const [userId, setUserId] = useState(null);

  // Novo ciclo retroativo
  const [newCycleModalVisible, setNewCycleModalVisible] = useState(false);
  const [newCycleTempDate, setNewCycleTempDate] = useState(new Date());

  // Time picker
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [tempTime, setTempTime] = useState(() => {
    const d = new Date();
    d.setHours(reminderHour, 0, 0, 0);
    return d;
  });

  // Scroll hint
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [atBottom, setAtBottom] = useState(false);
  const isScrollable = contentH > viewportH + 8;

  // alterações por guardar
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [initialCustomValue, setInitialCustomValue] = useState(30);
  const [initialReminderHour, setInitialReminderHour] = useState(9);

  /* helpers */
  const saveLocalState = async (next = {}) => {
    const pairs = [];
    if ('customValue' in next)   pairs.push(['lensCustomValue', String(next.customValue)]);
    if ('startDate' in next)     pairs.push(['lensStartDate', next.startDate ?? '']);
    if ('history' in next)       pairs.push(['lensHistory', JSON.stringify(next.history ?? [])]);
    if ('reminderHour' in next)  pairs.push(['lensReminderHour', String(next.reminderHour)]);
    if (pairs.length) await AsyncStorage.multiSet(pairs);
  };

  const saveRemoteState = async (partial) => {
    if (!userId || !saveUserState) return;
    await saveUserState(userId, {
      lens_start_date:    partial.startDate ?? startDate,
      lens_custom_value:  partial.customValue ?? customValue,
      lens_custom_unit:   'days',
      lens_reminder_hour: partial.reminderHour ?? reminderHour,
      lens_history:       partial.history ?? history,
    });
  };

  const rescheduleNotification = async (
    nextStart = startDate,
    nextValue = customValue,
    nextHour = reminderHour
  ) => {
    if (!nextStart) return;
    const days = Number(nextValue);
    const hour = Number(nextHour);
    if (!Number.isFinite(days) || days <= 0) return;
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) return;
    await cancelAllNotifications().catch(() => {});
    await scheduleCycleNotifications(nextStart, days, 30, hour);
  };

  const formatHour = (h) => `${String(h).padStart(2, '0')}:00`;

  /* lifecycle */
  useEffect(() => {
    requestPermissions().catch(() => {});
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || null;
      setUserId(uid);

      const [v, d, h, rh] = await Promise.all([
        AsyncStorage.getItem('lensCustomValue'),
        AsyncStorage.getItem('lensStartDate'),
        AsyncStorage.getItem('lensHistory'),
        AsyncStorage.getItem('lensReminderHour'),
      ]);

      let localCustomValue = v ? Number(v) : 30;
      let localStartDate   = d || null;
      let localHistory     = h ? JSON.parse(h) : [];
      let localReminderHr  = rh ? Number(rh) : 9;

      if (uid && fetchUserState) {
        try {
          const remote = await fetchUserState(uid);
          if (remote) {
            if (remote.lens_custom_value != null)  localCustomValue = Number(remote.lens_custom_value);
            if (remote.lens_start_date != null)    localStartDate   = remote.lens_start_date;
            if (Array.isArray(remote.lens_history)) localHistory     = remote.lens_history;
            if (remote.lens_reminder_hour != null) {
              const rhh = Number(remote.lens_reminder_hour);
              if (Number.isFinite(rhh)) localReminderHr = rhh;
            }
          }
        } catch {}
      }

      setCustomValue(localCustomValue);
      setStartDate(localStartDate);
      setHistory(localHistory);
      setReminderHour(localReminderHr);
      setTempTime(() => {
        const d2 = new Date();
        d2.setHours(localReminderHr, 0, 0, 0);
        return d2;
      });

      await saveLocalState({
        customValue: localCustomValue,
        startDate:   localStartDate,
        history:     localHistory,
        reminderHour: localReminderHr,
      });
    })();
  }, []);

  useEffect(() => {
    if (!startDate) return;
    rescheduleNotification(startDate, customValue, reminderHour);
  }, [startDate, customValue, reminderHour]);

  useEffect(() => {
    if (!startDate) return;
    const iv = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(startDate)) / (1000 * 60 * 60 * 24));
      setDaysPassed(diff);
    }, 1000);
    return () => clearInterval(iv);
  }, [startDate]);

  /* ações */
  const promptNewCycle = () => {
    let msg = 'Queres iniciar um novo ciclo de lentes?';
    if (startDate) msg = `Estás a usar este par há ${daysPassed} dias.\nQueres mesmo iniciar um novo ciclo?`;

    Alert.alert('Iniciar novo ciclo', msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Começar agora', onPress: () => startNewPairNow() },
      {
        text: 'Já usava antes',
        onPress: () => {
          const base = new Date(); base.setHours(12, 0, 0, 0);
          setNewCycleTempDate(base);
          setNewCycleModalVisible(true);
        },
      },
    ]);
  };

  const startNewPairNow = async () => {
    const now = new Date(); now.setHours(12, 0, 0, 0);
    await startNewPairWithStartDate(now);
  };

  const startNewPairWithStartDate = async (dateObj) => {
    try {
      await cancelAllNotifications().catch(() => {});
      let updatedHistory = history;

      if (startDate) {
        const prevEntry = { date: startDate, duration: daysPassed };
        updatedHistory = [...history, prevEntry];
      }

      const startISO = new Date(dateObj).toISOString();
      setStartDate(startISO);
      setHistory(updatedHistory);

      await saveLocalState({ startDate: startISO, history: updatedHistory });
      await saveRemoteState({ startDate: startISO, history: updatedHistory });

      await rescheduleNotification(startISO, customValue, reminderHour);
      Alert.alert('Novo ciclo iniciado!', 'A contagem foi atualizada.');
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível iniciar o ciclo.');
    }
  };

  const openSettings = () => {
    setInitialCustomValue(customValue);
    setInitialReminderHour(reminderHour);
    setSettingsDirty(false);
    setCustomizeVisible(true);
  };

  const attemptCloseSettings = () => {
    if (!settingsDirty) {
      setCustomizeVisible(false);
      return;
    }
    Alert.alert(
      'Guardar alterações?',
      'Tens alterações por guardar.',
      [
        { text: 'Continuar a editar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            setCustomValue(initialCustomValue);
            setReminderHour(initialReminderHour);
            setSettingsDirty(false);
            setCustomizeVisible(false);
          },
        },
        { text: 'Guardar', onPress: saveSettings },
      ]
    );
  };

  const saveSettings = async () => {
    const safeValue = Number(customValue) || 0;
    if (safeValue <= 0) return Alert.alert('Valor inválido', 'Define um valor maior que zero.');
    await saveLocalState({ customValue: safeValue, reminderHour });
    await saveRemoteState({ customValue: safeValue, reminderHour });
    setSettingsDirty(false);
    setCustomizeVisible(false);
    await rescheduleNotification(startDate, safeValue, reminderHour);
  };

  const handleResetAccount = () => {
    Alert.alert(
      'Reset Conta',
      'Isto apaga histórico, data de início e definições (local e na cloud). Queres continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAllNotifications().catch(() => {});
              await AsyncStorage.multiRemove([
                'lensCustomValue','lensStartDate','lensHistory','lensReminderHour',
              ]);
              await saveRemoteState({
                startDate: null, history: [], customValue: 30, reminderHour: 9,
              });
              setStartDate(null); setDaysPassed(0); setHistory([]);
              setCustomValue(30); setReminderHour(9);
              const d = new Date(); d.setHours(9,0,0,0); setTempTime(d);
              setSettingsDirty(false);
              setCustomizeVisible(false);
              Alert.alert('Pronto!', 'A tua conta foi limpa.');
            } catch (e) {
              Alert.alert('Erro', e?.message || 'Não foi possível fazer reset.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Terminar sessão',
      'Os teus dados ficam guardados na tua conta. Queres sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: onLogoutConfirm },
      ],
    );
  };

  const onLogoutConfirm = async () => {
    try {
      await saveRemoteState({});
      await cancelAllNotifications().catch(() => {});
      await AsyncStorage.multiRemove([
        'lensCustomValue','lensStartDate','lensHistory','lensReminderHour',
      ]);
      setStartDate(null); setDaysPassed(0); setHistory([]);
      setSettingsDirty(false);
      setCustomizeVisible(false);
      await supabase.auth.signOut();
    } catch (e) {
      Alert.alert('Erro ao terminar sessão', e?.message || 'Tenta novamente.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>Olá 👋{'\n'}Como posso ajudar hoje?</Text>

        <View style={styles.grid2x2}>
          <GridButton icon="👓" label="Novo Ciclo" bgColor="#eaf3ff" onPress={promptNewCycle} />
          <GridButton icon="📅" label="Dia Atual" bgColor="#eaffea" onPress={() => setUserVisible(true)} />
          <GridButton icon="📊" label="Estatísticas" bgColor="#ffeaea" onPress={() => navigation.navigate('Stats')} />
          <GridButton icon="⚙️" label="Definições" bgColor="#fffbe7" onPress={openSettings} />
        </View>
      </View>

      {/* Dia Atual */}
      <Modal visible={userVisible} transparent animationType="slide" onRequestClose={() => setUserVisible(false)}>
        <View style={styles.pageModal}>
          <Text style={styles.title}>Dia Atual</Text>
          <Text style={styles.text}>Iniciado a: {startDate ? new Date(startDate).toLocaleDateString() : '—'}</Text>
          <Text style={styles.text}>Dias passados: {daysPassed}</Text>
          <Text style={styles.text}>Ciclo: {customValue} dias</Text>
          <Button title="Fechar" onPress={() => setUserVisible(false)} color="#4F8EF7" />
        </View>
      </Modal>

      {/* Definições — fecha por X ou tap fora; pergunta se quer guardar ao fechar */}
      <Modal visible={customizeVisible} transparent animationType="slide" onRequestClose={attemptCloseSettings}>
        <View style={localStyles.modalRoot}>
          {/* Backdrop clicável */}
          <Pressable style={localStyles.backdrop} onPress={attemptCloseSettings} />

          {/* Conteúdo */}
          <View style={[styles.pageModal, { zIndex: 2 }]}>
            {/* Botão X */}
            <Pressable style={localStyles.closeBtn} onPress={attemptCloseSettings} hitSlop={8}>
              <Text style={{ fontSize: 18 }}>✕</Text>
            </Pressable>

            <ScrollView
              style={{ maxHeight: '80%', width: '100%' }}
              contentContainerStyle={{ paddingBottom: 24, alignItems: 'center' }}
              showsVerticalScrollIndicator
              onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
              onContentSizeChange={(_, h) => setContentH(h)}
              onScroll={({ nativeEvent }) => {
                const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
                const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
                setAtBottom(nearBottom);
              }}
              scrollEventThrottle={16}
            >
              <Text style={styles.title}>Definições</Text>

              {/* Duração do ciclo */}
              <Text style={[styles.text, { textAlign: 'center' }]}>Duração do ciclo (dias):</Text>
              <TextInput
                style={[styles.input, { alignSelf: 'center', marginTop: 8 }]}
                keyboardType="numeric"
                value={String(customValue)}
                onChangeText={(v) => {
                  setCustomValue(Number(v.replace(/[^0-9]/g, '')) || 0);
                  setSettingsDirty(true);
                }}
              />

              {/* Hora do lembrete */}
              <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 16, width: '100%' }} />
              <Text style={[styles.text, { textAlign: 'center' }]}>
                Hora do lembrete: {formatHour(reminderHour)}
              </Text>
              <View style={{ marginTop: 8, width: 220 }}>
                <Button
                  title="Alterar hora do lembrete"
                  onPress={() => {
                    const d = new Date(); d.setHours(reminderHour, 0, 0, 0);
                    setTempTime(d);
                    setTimePickerVisible(true);
                  }}
                  color="#4F8EF7"
                />
              </View>

              {timePickerVisible && (
                <View style={{ marginTop: 10, alignItems: 'center', width: '100%' }}>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(e, d) => {
                      if (Platform.OS === 'android') {
                        setTimePickerVisible(false);
                        if (e?.type === 'set' && d) {
                          setReminderHour(new Date(d).getHours());
                          setTempTime(d);
                          setSettingsDirty(true);
                        }
                      } else if (d) {
                        setReminderHour(new Date(d).getHours());
                        setTempTime(d);
                        setSettingsDirty(true);
                      }
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <View style={{ width: 160, marginTop: 6 }}>
                      <Button title="Fechar" onPress={() => setTimePickerVisible(false)} color="#aaa" />
                    </View>
                  )}
                </View>
              )}

              {/* Ações restantes */}
              <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 16, width: '100%' }} />
              <View style={{ width: 260 }}>
                <Button title="Reset Conta" onPress={handleResetAccount} color="#d9534f" />
              </View>

              <View style={{ height: 8 }} />
              <View style={{ width: 220 }}>
                <Button title="Terminar sessão" onPress={handleLogout} color="#d9534f" />
              </View>
            </ScrollView>

            {/* Hint de scroll */}
            {isScrollable && !atBottom && (
              <View pointerEvents="none" style={localStyles.scrollHintOverlay}>
                <Text style={localStyles.scrollHintText}>Desliza</Text>
                <Text style={localStyles.scrollHintChevron}>▾</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Novo ciclo retroativo */}
      <Modal
        visible={newCycleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewCycleModalVisible(false)}
      >
        <View style={styles.pageModal}>
          <Text style={styles.title}>Data real de início</Text>
          <Text style={styles.text}>Escolhe a data em que começaste a usar o par atual.</Text>

          <View style={{ marginVertical: 12 }}>
            <DateTimePicker
              value={newCycleTempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(e, d) => {
                if (Platform.OS === 'android') {
                  if (e?.type === 'set' && d) setNewCycleTempDate(d);
                } else if (d) {
                  setNewCycleTempDate(d);
                }
              }}
              maximumDate={new Date()}
            />
          </View>

          <View style={{ width: 220 }}>
            <Button
              title="Confirmar"
              color="#4F8EF7"
              onPress={async () => {
                const d = new Date(newCycleTempDate);
                d.setHours(12, 0, 0, 0);
                await startNewPairWithStartDate(d);
                setNewCycleModalVisible(false);
              }}
            />
          </View>
          <View style={{ marginTop: 8, width: 220 }}>
            <Button title="Cancelar" color="#aaa" onPress={() => setNewCycleModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 3,
    padding: 6,
  },
  scrollHintOverlay: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  scrollHintText: { fontSize: 12, color: '#666' },
  scrollHintChevron: { fontSize: 16, lineHeight: 16, color: '#666', marginTop: 2 },
});
