# Krust application architecture

```text
app/
├── (storefront)/page.tsx       # Customer storefront and quick order
├── (admin)/admin/page.tsx      # Admin and super-admin workspace
├── api/orders/route.ts         # Zod-validated, server-priced order endpoint
├── invoice/[id]/page.tsx       # Printable GST invoice
├── layout.tsx                  # Brand typography and metadata
└── globals.css                 # Design tokens and print rules
components/
├── storefront.tsx              # Catalog, cart, checkout and confirmation
├── admin-dashboard.tsx         # Orders, products, customers, recovery, settings, audit
└── ui/                         # Shadcn/Radix component foundation
lib/
├── cart-store.ts               # Persisted Zustand cart state
├── catalog.ts                  # Seed catalog and variants
├── gst.ts                      # Inclusive CGST/SGST/IGST calculator
├── authorization.ts            # Role/permission policy
└── types.ts                    # Shared domain types
prisma/
└── schema.prisma               # PostgreSQL production data model
public/brand/
├── krust-mark.png
├── krust-wordmark.png
└── krust-hero.png
```

## Security boundary

Catalog pricing, GST calculation, minimum-order validation, order mutations and admin authorization belong on the server. Client-side controls are experience enhancements, never the authority. Completed order items preserve product name, HSN code, inclusive unit price and GST rate snapshots so historical invoices cannot drift after catalog edits.

## Production wiring

Set `DATABASE_URL`, generate the Prisma client, run the first migration and connect Auth.js sessions to the `User.role` field. Payment gateway and WhatsApp credentials remain runtime secrets; card details are never persisted. Use transactional writes for `Order`, `OrderItem`, `JourneyEvent` and `AuditLog` records.
