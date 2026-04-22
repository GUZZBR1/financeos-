/**
 * services/transactionService.js
 * Centralized CRUD for transactions via Supabase.
 * All UI code goes through this service — no direct Supabase calls outside it.
 */

import { supabase } from '../lib/supabase';

/**
 * Fetch all transactions for a given user, ordered by date descending.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getTransactions(userId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('[transactionService] getTransactions error:', error);
    throw error;
  }

  return data;
}

/**
 * Insert a new transaction for a given user.
 * @param {string} userId
 * @param {{ type: string, amount: number, category: string, description: string, date: string }} data
 * @returns {Promise<Object>} the created row
 */
export async function createTransaction(userId, data) {
  const { data: row, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: data.type,
      amount: parseFloat(data.amount),
      category: data.category || '',
      description: data.description || '',
      date: data.date,
    })
    .select()
    .single();

  if (error) {
    console.error('[transactionService] createTransaction error:', error);
    throw error;
  }

  return row;
}

/**
 * Update an existing transaction owned by the user.
 * @param {string} userId
 * @param {string} id
 * @param {{ type?: string, amount?: number, category?: string, description?: string, date?: string }} data
 * @returns {Promise<Object>} the updated row
 */
export async function updateTransaction(userId, id, data) {
  const { data: row, error } = await supabase
    .from('transactions')
    .update({
      ...(data.type !== undefined && { type: data.type }),
      ...(data.amount !== undefined && { amount: parseFloat(data.amount) }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.date !== undefined && { date: data.date }),
    })
    .eq('id', id)
    .eq('user_id', userId) // extra safety — RLS already enforces this
    .select()
    .single();

  if (error) {
    console.error('[transactionService] updateTransaction error:', error);
    throw error;
  }

  return row;
}

/**
 * Delete a transaction owned by the user.
 * @param {string} userId
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteTransaction(userId, id) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId); // extra safety — RLS already enforces this

  if (error) {
    console.error('[transactionService] deleteTransaction error:', error);
    throw error;
  }
}