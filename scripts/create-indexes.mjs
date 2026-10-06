import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function createIndexes() {
  try {
    await client.connect();
    console.log("Connected to DB. Creating missing indexes...");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_recipe_components_recipe_id ON recipe_components(recipe_id);
      CREATE INDEX IF NOT EXISTS idx_cutting_orders_recipe_id ON cutting_orders(recipe_id);
      CREATE INDEX IF NOT EXISTS idx_cutting_orders_created_by ON cutting_orders(created_by);
      CREATE INDEX IF NOT EXISTS idx_verification_items_component_id ON verification_items(component_id);
      CREATE INDEX IF NOT EXISTS idx_verification_logs_order_id ON verification_logs(order_id);
    `);
    
    console.log("Missing indexes applied successfully! DB queries will be much faster.");
  } catch (error) {
    console.error("Error creating indexes:", error);
  } finally {
    await client.end();
  }
}

createIndexes();
