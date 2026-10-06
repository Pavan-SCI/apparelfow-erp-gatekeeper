import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing environment variables")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || ''
const usersToCreate = [
  { email: 'supervisor@apparelflow.com', password: demoPassword, role: 'cutting_supervisor', full_name: 'John Supervisor', id: '33333333-3333-3333-3333-333333333333' },
  { email: 'verifier@apparelflow.com', password: demoPassword, role: 'cutting_verifier', full_name: 'Alice Verifier', id: '44444444-4444-4444-4444-444444444444' },
  { email: 'sewing@apparelflow.com', password: demoPassword, role: 'sewing_supervisor', full_name: 'Bob Sewing', id: '55555555-5555-5555-5555-555555555555' }
]

async function setupAuth() {
  console.log("Setting up Supabase Auth users...")
  for (const u of usersToCreate) {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { role: u.role, full_name: u.full_name }
    })
    
    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`User ${u.email} already exists in Auth.`)
      } else {
        console.error(`Error creating user ${u.email}:`, authError)
      }
    } else {
      console.log(`User ${u.email} created in Auth successfully with ID: ${authUser.user.id}`)
      
      // Update the public.users table to match the Auth UUID instead of the hardcoded UUID
      // But wait, the schema has hardcoded UUIDs. It's better to update the public users table 
      // with the newly generated Auth UUID.
      const newId = authUser.user.id
      
      // First, update public users
      const { error: dbError } = await supabase.from('users').insert({
        id: newId,
        email: u.email,
        password_hash: 'managed_by_auth',
        role: u.role,
        full_name: u.full_name
      })
      
      if (dbError && dbError.code !== '23505') {
        console.error(`Error updating public users for ${u.email}:`, dbError)
      }
    }
  }
  console.log("Done.")
}

setupAuth()
