import { Client } from 'pg'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })
  
  try {
    await client.connect()
    console.log("Connected to DB")
    
    // Check if constraint exists and drop it
    await client.query(`ALTER TABLE cutting_orders DROP CONSTRAINT IF EXISTS cutting_orders_status_check;`)
    console.log("Constraint cutting_orders_status_check dropped (if it existed)")
    
  } catch(e) {
    console.error(e)
  } finally {
    await client.end()
  }
}

run()
