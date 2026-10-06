import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: authUsers } = await supabase.auth.admin.listUsers();
for (const user of authUsers.users) {
  const role = user.email.startsWith('verifier') ? 'cutting_verifier' : (user.email.startsWith('supervisor') ? 'cutting_supervisor' : 'sewing_supervisor');
  
  const { data: existing } = await supabase.from('users').select('*').eq('email', user.email).single();
  if (existing) {
      if (existing.id !== user.id) {
        console.log('Fixing ID for', user.email, 'from', existing.id, 'to', user.id);
        await supabase.from('users').delete().eq('email', user.email);
        await supabase.from('users').insert({ id: user.id, email: user.email, password_hash: 'managed_by_auth', role, full_name: user.email.split('@')[0] });
      } else {
        console.log('ID is correct for', user.email);
      }
  } else {
      console.log('Inserting missing user', user.email);
      await supabase.from('users').insert({ id: user.id, email: user.email, password_hash: 'managed_by_auth', role, full_name: user.email.split('@')[0] });
  }
}
console.log('Sync complete');
