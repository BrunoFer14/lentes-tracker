// src/services/dbService.js
import { supabase } from './supabaseClient';

// Lê (ou cria) o estado do utilizador
export async function fetchUserState(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.log('[fetchUserState][select][error]', error);
    throw error;
  }

  if (!data) {
    const defaults = {
      user_id: userId,
      lens_start_date: null,
      lens_custom_value: 30,
      lens_custom_unit: 'days',
      lens_history: [],
    };
    const { data: inserted, error: insErr } = await supabase
      .from('user_state')
      .insert(defaults)
      .select('*')
      .single();

    if (insErr) {
      console.log('[fetchUserState][insert][error]', insErr);
      throw insErr;
    }
    console.log('[fetchUserState][insert][ok]', inserted?.user_id);
    return inserted;
  }

  console.log('[fetchUserState][select][ok]', data?.user_id);
  return data;
}

// Upsert parcial (só sobrescreve o que passares)
export async function saveUserState(userId, partial) {
  if (!userId) return;

  const payload = { user_id: userId, ...partial };

  const { error } = await supabase
    .from('user_state')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.log('[saveUserState][upsert][error]', error);
    throw error;
  }
  console.log('[saveUserState][upsert][ok]', Object.keys(partial));
}
