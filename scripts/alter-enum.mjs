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
    
    await client.query(`ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'SEWING_IN_PROGRESS';`)
    console.log("Enum order_status updated with SEWING_IN_PROGRESS")
    
  } catch(e) {
    console.error(e)
  } finally {
    await client.end()
  }
}

run()
