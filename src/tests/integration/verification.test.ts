import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { POST } from '@/app/api/orders/[id]/verify/route'
import { GET } from '@/app/api/sewing/queue/route'

// Mock next/headers so createClient inside API routes doesn't crash
vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    setAll: () => {}
  })
}))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminClient = createClient(supabaseUrl, serviceRoleKey)
const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

describe('Verification Domain Rules', () => {
  let verifierToken = ''
  let nonVerifierToken = ''
  let sewingToken = ''
  let testRecipeId = ''
  let testSupervisorId = ''
  
  beforeAll(async () => {
    // 1. Get auth tokens for different roles using individual role-based passwords
    const { data: vData } = await anonClient.auth.signInWithPassword({
      email: 'verifier@apparelflow.com',
      password: 'verifier123'
    })
    verifierToken = vData.session!.access_token

    const { data: nvData } = await anonClient.auth.signInWithPassword({
      email: 'supervisor@apparelflow.com', // Non-verifier role
      password: 'supervisor123'
    })
    nonVerifierToken = nvData.session!.access_token
    testSupervisorId = nvData.user!.id

    const { data: sData } = await anonClient.auth.signInWithPassword({
      email: 'sewing@apparelflow.com', // Sewing role
      password: 'sewing123'
    })
    sewingToken = sData.session!.access_token

    // 2. Fetch an existing recipe that has components to use for dummy orders
    const { data: comps } = await adminClient.from('recipe_components').select('recipe_id').limit(1)
    testRecipeId = comps![0].recipe_id
  })
  
  // Helper to create a fresh order for each test
  async function createTestOrder() {
    const { data: order, error: insertError } = await adminClient.from('cutting_orders').insert({
      order_no: 'TEST-ORD-' + Date.now() + Math.floor(Math.random() * 1000),
      recipe_id: testRecipeId,
      fabric_roll_id: 'TEST-ROLL-123',
      target_qty: 10,
      status: 'PENDING_VERIFICATION',
      created_by: testSupervisorId,
      actual_fabric_yds: 50
    }).select().single()

    if (insertError) {
      console.error('Failed to create order:', insertError)
      throw new Error('Failed to create order: ' + insertError.message)
    }

    const { data: recipeComps } = await adminClient.from('recipe_components').select('*').eq('recipe_id', testRecipeId)
    
    const items = recipeComps!.map((rc: any) => ({
      order_id: order!.id,
      component_id: rc.id,
      expected_qty: rc.pieces_per_garment * 10,
      actual_qty: rc.pieces_per_garment * 10 // default GREEN
    }))

    const { data: insertedItems, error: itemsError } = await adminClient.from('verification_items').insert(items).select()
    if (itemsError) throw new Error("Items insert failed: " + JSON.stringify(itemsError))
    
    return { orderId: order!.id, items: insertedItems }
  }

  it('Test 1: An order with all GREEN components can be approved by an authenticated Verifier', async () => {
    const { orderId, items } = await createTestOrder()
    
    const req = new Request(`http://localhost/api/orders/${orderId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${verifierToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        items: items
      })
    })

    const res = await POST(req, { params: Promise.resolve({ id: orderId }) })
    const data = await res.json()
    console.log("Test 1 Response:", data)
    
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.status).toBe('VERIFIED')
  })

  it('Test 2: An order containing at least one RED (shortage) component blocks approval and returns an error', async () => {
    const { orderId, items } = await createTestOrder()
    
    // Create a RED shortage
    const modifiedItems = [...items!]
    modifiedItems[0].actual_qty -= 1
    
    const req = new Request(`http://localhost/api/orders/${orderId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${verifierToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        items: modifiedItems
      })
    })

    const res = await POST(req, { params: Promise.resolve({ id: orderId }) })
    const data = await res.json()
    
    expect(res.status).toBe(422)
    expect(data.error).toBe('Unprocessable Entity: Cannot approve a batch with component shortages.')
  })

  it('Test 3: Rejecting an order without a reason note is rejected by backend validation', async () => {
    const { orderId, items } = await createTestOrder()
    
    const req = new Request(`http://localhost/api/orders/${orderId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${verifierToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decision: 'REJECTED',
        items: items,
        rejection_note: '' // Empty note violates domain rule
      })
    })

    const res = await POST(req, { params: Promise.resolve({ id: orderId }) })
    const data = await res.json()
    
    expect(res.status).toBe(400)
    expect(data.error).toBe('Rejection note is mandatory when rejecting a batch.')
  })

  it('Test 4: Non-verifier roles receive 403 Forbidden when attempting verification approval', async () => {
    const { orderId, items } = await createTestOrder()
    
    const req = new Request(`http://localhost/api/orders/${orderId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nonVerifierToken}`, // Supervisor token
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        items: items
      })
    })

    const res = await POST(req, { params: Promise.resolve({ id: orderId }) })
    const data = await res.json()
    
    expect(res.status).toBe(403)
    expect(data.error).toBe('Forbidden: Only Cutting Verifier can verify batches')
  })

  it('Test 5: Unapproved orders never appear in the Sewing Queue database query', async () => {
    // Create an unapproved order (PENDING_VERIFICATION)
    const { orderId } = await createTestOrder()
    
    const req = new Request('http://localhost/api/sewing/queue', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sewingToken}` // Must be sewing supervisor
      }
    })

    const res = await GET(req)
    const data = await res.json()
    
    // Assert that the newly created PENDING order is NOT in the queue
    const orderInQueue = data.data.find((o: any) => o.id === orderId)
    expect(orderInQueue).toBeUndefined()
    
    // Also assert that ALL orders in the queue are strictly VERIFIED
    for (const order of data.data) {
      expect(order.status).toBe('VERIFIED')
    }
  })

  // Cleanup: Delete all test orders created during tests
  afterAll(async () => {
    // Delete orders starting with 'TEST-' (cascade deletes items and logs)
    const { error } = await adminClient.from('cutting_orders').delete().like('order_no', 'TEST-%')
    if (error) {
      console.error("Failed to cleanup test data:", error)
    } else {
      console.log("Successfully cleaned up test orders.")
    }
  })
})
