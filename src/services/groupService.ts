import { supabase, isSupabaseConfigured } from './supabase';
import { Group, GroupMember, UserProfile } from '../types/models';
import { INITIAL_GROUPS, INITIAL_GROUP_MEMBERS, INITIAL_PROFILES } from './mockData';

const GROUPS_KEY = 'splitmate_groups';
const GROUP_MEMBERS_KEY = 'splitmate_group_members';
const PROFILES_KEY = 'splitmate_profiles';

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

function getStoredGroups(): Group[] {
  if (isProduction || isSupabaseConfigured) return [];
  const raw = localStorage.getItem(GROUPS_KEY);
  if (!raw) {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(INITIAL_GROUPS));
    return INITIAL_GROUPS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_GROUPS;
  }
}

function getStoredMembers(): GroupMember[] {
  if (isProduction || isSupabaseConfigured) return [];
  const raw = localStorage.getItem(GROUP_MEMBERS_KEY);
  if (!raw) {
    localStorage.setItem(GROUP_MEMBERS_KEY, JSON.stringify(INITIAL_GROUP_MEMBERS));
    return INITIAL_GROUP_MEMBERS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_GROUP_MEMBERS;
  }
}

function getStoredProfiles(): UserProfile[] {
  if (isProduction || isSupabaseConfigured) return [];
  const raw = localStorage.getItem(PROFILES_KEY);
  if (!raw) return INITIAL_PROFILES;
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROFILES;
  }
}

export const groupService = {
  /**
   * Fetch groups for a given user
   */
  async getGroups(userId: string): Promise<Group[]> {
    if (isSupabaseConfigured) {
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberErr) throw memberErr;
      const groupIds = (memberRows || []).map(r => r.group_id);

      if (groupIds.length === 0) return [];

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Group[];
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const members = getStoredMembers();
    const userGroupIds = new Set(members.filter(m => m.user_id === userId).map(m => m.group_id));
    const allGroups = getStoredGroups();
    return allGroups.filter(g => userGroupIds.has(g.id) || g.created_by === userId);
  },

  /**
   * Get single group by ID
   */
  async getGroupById(groupId: string): Promise<Group | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data as Group;
    }

    if (isProduction) return null;

    const groups = getStoredGroups();
    return groups.find(g => g.id === groupId) || null;
  },

  /**
   * Create a new group and automatically enroll creator as admin member
   */
  async createGroup(data: Omit<Group, 'id' | 'created_at'>): Promise<Group> {
    if (isSupabaseConfigured) {
      const { data: groupData, error: groupErr } = await supabase
        .from('groups')
        .insert([{
          name: data.name,
          description: data.description,
          category: data.category,
          currency: data.currency,
          created_by: data.created_by,
        }])
        .select()
        .single();

      if (groupErr) throw groupErr;

      // Add creator as member & group admin
      const { error: memberErr } = await supabase.from('group_members').insert([{
        group_id: groupData.id,
        user_id: data.created_by,
        role: 'admin',
      }]);

      if (memberErr) throw memberErr;

      return groupData as Group;
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const groups = getStoredGroups();
    const newGroup: Group = {
      ...data,
      id: `grp-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    groups.unshift(newGroup);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));

    // Add member
    const members = getStoredMembers();
    members.push({
      id: `gm-${Date.now()}`,
      group_id: newGroup.id,
      user_id: data.created_by,
      role: 'admin',
      joined_at: new Date().toISOString(),
    });
    localStorage.setItem(GROUP_MEMBERS_KEY, JSON.stringify(members));

    return newGroup;
  },

  /**
   * Update an existing group
   */
  async updateGroup(groupId: string, updates: Partial<Group>): Promise<Group> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('groups')
        .update({
          name: updates.name,
          description: updates.description,
          category: updates.category,
          currency: updates.currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId)
        .select()
        .single();
      if (error) throw error;
      return data as Group;
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const groups = getStoredGroups();
    const index = groups.findIndex(g => g.id === groupId);
    if (index === -1) throw new Error('Group not found');
    groups[index] = { ...groups[index], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    return groups[index];
  },

  /**
   * Delete a group
   */
  async deleteGroup(groupId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;
      return;
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const groups = getStoredGroups().filter(g => g.id !== groupId);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));

    const members = getStoredMembers().filter(m => m.group_id !== groupId);
    localStorage.setItem(GROUP_MEMBERS_KEY, JSON.stringify(members));
  },

  /**
   * Get all members for a group with their profiles joined
   */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          user_id,
          role,
          joined_at,
          profile:profiles(id, email, full_name, avatar_url, phone, default_currency, created_at)
        `)
        .eq('group_id', groupId);

      if (error) throw error;
      return (data || []) as unknown as GroupMember[];
    }

    if (isProduction) return [];

    const members = getStoredMembers().filter(m => m.group_id === groupId);
    const profiles = getStoredProfiles();
    return members.map(m => ({
      ...m,
      profile: profiles.find(p => p.id === m.user_id),
    }));
  },

  /**
   * Add a member to a group by email or full name
   */
  async addMember(groupId: string, identifier: string): Promise<GroupMember> {
    const cleanId = identifier.trim().toLowerCase();

    if (isSupabaseConfigured) {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanId)
        .maybeSingle();

      if (pErr || !profile) {
        throw new Error(`No registered user found with email "${identifier}". Ensure they have signed up first.`);
      }

      const { data: member, error: mErr } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: profile.id,
          role: 'member',
        }])
        .select(`
          id,
          group_id,
          user_id,
          role,
          joined_at,
          profile:profiles(*)
        `)
        .single();

      if (mErr) {
        if (mErr.code === '23505') {
          throw new Error('This user is already a member of this group.');
        }
        throw mErr;
      }
      return member as unknown as GroupMember;
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const profiles = getStoredProfiles();
    let profile = profiles.find(p => p.email.toLowerCase() === cleanId || p.full_name.toLowerCase() === cleanId);

    if (!profile) {
      profile = {
        id: `user-${Date.now()}`,
        email: cleanId.includes('@') ? cleanId : `${cleanId.replace(/\s+/g, '').toLowerCase()}@example.com`,
        full_name: identifier.includes('@') ? identifier.split('@')[0] : identifier,
        avatar_url: null,
        phone: null,
        default_currency: 'INR',
        created_at: new Date().toISOString(),
      };
      profiles.push(profile);
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }

    const members = getStoredMembers();
    if (members.some(m => m.group_id === groupId && m.user_id === profile!.id)) {
      throw new Error('This user is already a member of this group.');
    }

    const newMember: GroupMember = {
      id: `gm-${Date.now()}`,
      group_id: groupId,
      user_id: profile.id,
      role: 'member',
      joined_at: new Date().toISOString(),
      profile,
    };

    members.push(newMember);
    localStorage.setItem(GROUP_MEMBERS_KEY, JSON.stringify(members));
    return newMember;
  },

  /**
   * Remove a member from a group
   */
  async removeMember(groupId: string, memberId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId)
        .eq('group_id', groupId);
      if (error) throw error;
      return;
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const members = getStoredMembers().filter(m => m.id !== memberId);
    localStorage.setItem(GROUP_MEMBERS_KEY, JSON.stringify(members));
  }
};
