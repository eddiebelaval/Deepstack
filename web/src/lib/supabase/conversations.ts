import { supabase, isSupabaseConfigured } from '../supabase';
import type { Conversation, Message } from '../stores/chat-store';

// Database message type (snake_case)
type DbMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any;
  tool_results?: any;
  provider?: string;
  created_at: string;
};

// Helper to check if error is "table doesn't exist"
function isTableMissingError(error: { code?: string; message?: string }): boolean {
  return error.code === '42P01' || error.message?.includes('does not exist') || false;
}

/**
 * Fetch all conversations for the current user
 */
export async function fetchConversations(): Promise<Conversation[]> {
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
    .order('updated_at', { ascending: false });

  if (error) {
    // Silently return empty array if table doesn't exist yet
    if (isTableMissingError(error)) {
      return [];
    }
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
    if (isTableMissingError(error)) {
      return [];
    }
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
    if (error.code === 'PGRST116' || isTableMissingError(error)) {
      return null; // Not found or table missing
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

// ============================================
// MESSAGE FUNCTIONS
// ============================================

/**
 * Convert database message to frontend message
 */
function dbMessageToMessage(dbMsg: DbMessage): Message {
  return {
    id: dbMsg.id,
    role: dbMsg.role === 'tool' ? 'data' : dbMsg.role,
    content: dbMsg.content,
    createdAt: new Date(dbMsg.created_at),
    toolInvocations: dbMsg.tool_calls || dbMsg.tool_results ?
      [...(dbMsg.tool_calls || []), ...(dbMsg.tool_results || [])] : undefined,
  };
}

/**
 * Fetch all messages for a conversation
 */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    console.error('Error fetching messages:', error);
    throw error;
  }

  return (data || []).map(dbMessageToMessage);
}

/**
 * Save a single message to a conversation
 */
export async function saveMessage(
  conversationId: string,
  message: Message,
  provider?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, message not saved');
    return;
  }

  const { error } = await supabase
    .from('messages')
    .insert({
      id: message.id,
      conversation_id: conversationId,
      role: message.role === 'data' ? 'tool' : message.role,
      content: message.content,
      tool_calls: message.toolInvocations?.filter((t: any) => t.type === 'tool-call') || null,
      tool_results: message.toolInvocations?.filter((t: any) => t.type === 'tool-result') || null,
      provider: provider || null,
      created_at: message.createdAt?.toISOString() || new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving message:', error);
    throw error;
  }

  // Update conversation's updated_at timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

/**
 * Save multiple messages to a conversation (batch insert)
 */
export async function saveMessages(
  conversationId: string,
  messages: Message[],
  provider?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || messages.length === 0) {
    return;
  }

  const messagesToInsert = messages.map((message) => ({
    id: message.id,
    conversation_id: conversationId,
    role: message.role === 'data' ? 'tool' : message.role,
    content: message.content,
    tool_calls: message.toolInvocations?.filter((t: any) => t.type === 'tool-call') || null,
    tool_results: message.toolInvocations?.filter((t: any) => t.type === 'tool-result') || null,
    provider: provider || null,
    created_at: message.createdAt?.toISOString() || new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('messages')
    .insert(messagesToInsert);

  if (error) {
    console.error('Error saving messages:', error);
    throw error;
  }

  // Update conversation's updated_at timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

/**
 * Delete all messages for a conversation
 */
export async function deleteMessages(conversationId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);

  if (error) {
    console.error('Error deleting messages:', error);
    throw error;
  }
}
