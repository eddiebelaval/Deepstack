import { supabase, isSupabaseConfigured } from '../supabase';
import type { Conversation } from '../stores/chat-store';

/**
 * Fetch all conversations for the current user
 */
export async function fetchConversations(): Promise<Conversation[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, using local storage');
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('No authenticated user');
    return [];
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }

  return (data || []) as Conversation[];
}

/**
 * Fetch recent conversations (last 10)
 */
export async function fetchRecentConversations(): Promise<Conversation[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recent conversations:', error);
    throw error;
  }

  return (data || []) as Conversation[];
}

/**
 * Fetch a single conversation by ID
 */
export async function fetchConversationById(id: string): Promise<Conversation | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching conversation:', error);
    throw error;
  }

  return data as Conversation;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  title: string,
  provider: string = 'claude'
): Promise<Conversation> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title,
      provider,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }

  return data as Conversation;
}

/**
 * Update a conversation
 */
export async function updateConversation(
  id: string,
  updates: Partial<Pick<Conversation, 'title' | 'provider'>>
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('conversations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}
