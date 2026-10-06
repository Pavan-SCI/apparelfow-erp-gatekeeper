import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const sql = `
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Create helper function
CREATE OR REPLACE FUNCTION get_auth_role() RETURNS text AS $$
  SELECT role::text FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Clean up existing policies if any
DROP POLICY IF EXISTS "Allow read users" ON users;
DROP POLICY IF EXISTS "Allow update self" ON users;
DROP POLICY IF EXISTS "Allow read recipes" ON recipes;
DROP POLICY IF EXISTS "Allow read recipe_components" ON recipe_components;
DROP POLICY IF EXISTS "Allow read orders" ON cutting_orders;
DROP POLICY IF EXISTS "Allow insert orders" ON cutting_orders;
DROP POLICY IF EXISTS "Allow update orders" ON cutting_orders;
DROP POLICY IF EXISTS "Allow read items" ON verification_items;
DROP POLICY IF EXISTS "Allow insert items" ON verification_items;
DROP POLICY IF EXISTS "Allow update items" ON verification_items;
DROP POLICY IF EXISTS "Allow read logs" ON verification_logs;
DROP POLICY IF EXISTS "Allow insert logs" ON verification_logs;

-- Apply new strict policies
CREATE POLICY "Allow read users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update self" ON users FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Allow read recipes" ON recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read recipe_components" ON recipe_components FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read orders" ON cutting_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert orders" ON cutting_orders FOR INSERT TO authenticated WITH CHECK (get_auth_role() = 'cutting_supervisor');
CREATE POLICY "Allow update orders" ON cutting_orders FOR UPDATE TO authenticated USING (get_auth_role() IN ('cutting_supervisor', 'cutting_verifier'));

CREATE POLICY "Allow read items" ON verification_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert items" ON verification_items FOR INSERT TO authenticated WITH CHECK (get_auth_role() IN ('cutting_supervisor', 'cutting_verifier'));
CREATE POLICY "Allow update items" ON verification_items FOR UPDATE TO authenticated USING (get_auth_role() = 'cutting_verifier');

CREATE POLICY "Allow read logs" ON verification_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert logs" ON verification_logs FOR INSERT TO authenticated WITH CHECK (get_auth_role() = 'cutting_verifier');
`;

async function applyRLS() {
  try {
    await client.connect();
    console.log('Connected to DB. Applying RLS policies...');
    await client.query(sql);
    console.log('RLS policies applied successfully! Database is now strictly secured.');
  } catch (err) {
    console.error('Error applying RLS:', err);
  } finally {
    await client.end();
  }
}

applyRLS();
