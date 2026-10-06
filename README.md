# ApparelFlow ERP Gatekeeper

🚀 **Live Demo:** [https://apparelfow-erp-gatekeeper.vercel.app/](https://apparelfow-erp-gatekeeper.vercel.app/)

ApparelFlow is a robust, role-based ERP execution module designed to bridge the gap between cutting room production and sewing assembly. It acts as a strict "Gatekeeper," ensuring that only completely verified, accurately counted garment components proceed to the sewing floor, significantly reducing downstream assembly line blockages due to component shortages.

## 1. Architecture Summary

### Tech Stack
- **Frontend/Framework**: Next.js (App Router), React, Tailwind CSS (Glassmorphism & Modern UI), Lucide Icons
- **Backend/Database**: Supabase (PostgreSQL), Supabase Auth, Row-Level Security (RLS)
- **Testing**: Vitest for strict Server-Side integration testing

### Security & State Machine Architecture
The system enforces a strict server-side state machine (`CUTTING_IN_PROGRESS` → `PENDING_VERIFICATION` → `VERIFIED` / `REJECTED`). Security cannot be bypassed via the client:
- **"Supreme Security" Read-Only Database**: To completely eradicate malicious PostgREST client modifications, the database enforces strict Row-Level Security (RLS) that only allows `SELECT`. The database is entirely READ-ONLY to the outside world.
- **Backend Admin Mutations**: All data mutations (`INSERT`, `UPDATE`) are forced through our Next.js API endpoints. These endpoints perform exhaustive role-checking and domain logic validation before executing the transaction using a secure, internal Service Role admin client. 
- **Server-Side Hard Stops**: If a verifier attempts to approve an order with any component shortage, the backend API evaluates the payload independently and rejects the transaction with a `422 Unprocessable Entity`.
- **Zero-Trust API endpoints**: API routes do not trust client cookies blindly for sensitive operations. They extract the `Authorization: Bearer <token>` header to accurately ascertain the user's role before processing.

## 2. Schema Documentation

The PostgreSQL database is heavily normalized and enforced with Foreign Keys and Row Level Security.

1. **`users`**
   - **Purpose**: Stores application users and maps their Supabase Auth identities.
   - **Key Columns**: `id` (UUID), `email`, `role` (enum: `cutting_supervisor`, `cutting_verifier`, `sewing_supervisor`), `full_name`.

2. **`recipes` & `recipe_components`**
   - **Purpose**: Acts as the blueprint for production. `recipes` defines the garment (e.g., Casual Blouse) and its standard fabric yardage. `recipe_components` details exactly how many pieces (e.g., 2 Sleeves, 1 Front Panel) are required to build one unit.
   - **Key Columns**: `std_fabric_yards`, `pieces_per_garment`.

3. **`cutting_orders`**
   - **Purpose**: The core ledger tracking active production batches.
   - **Key Columns**: `order_no`, `recipe_id`, `target_qty`, `actual_fabric_yds`, `status` (enum state machine).

4. **`verification_items`**
   - **Purpose**: Stores the physical counts inputted by the Verifier.
   - **Key Columns**: `expected_qty` (calculated dynamically based on `target_qty * pieces_per_garment`), `actual_qty`, `status` (`GREEN`, `YELLOW`, `RED`).

5. **`verification_logs`**
   - **Purpose**: An immutable audit trail. Tracks every single verification attempt, including rejections.
   - **Key Columns**: `verifier_id`, `decision`, `rejection_note` (mandatory if REJECTED), `wastage_pct` (calculated autonomously on the server).

## 3. Demo Credentials

To evaluate the platform, use the following role-based credentials on the `/login` page. The system is seeded with demo recipes and components.

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Cutting Supervisor** | `supervisor@apparelflow.com` | `supervisor123` | Can create cutting batches and resubmit rejected orders. |
| **Cutting Verifier** | `verifier@apparelflow.com` | `verifier123` | Inspects pending batches, inputs physical counts, and approves/rejects. |
| **Sewing Supervisor** | `sewing@apparelflow.com` | `sewing123` | Read-only view of exclusively `VERIFIED` batches ready for assembly. |

---
*Developed with a focus on strict backend validation, data integrity, and premium modern UI/UX principles.*
