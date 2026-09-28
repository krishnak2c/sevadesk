import mongoose from 'mongoose';
import { env, isProd } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Request } from '../models/Request.js';
import { RequestEvent } from '../models/RequestEvent.js';
import { REQUEST_PRIORITIES, REQUEST_STATUSES, isAllowedTransition } from '../models/Request.js';

/**
 * Demo seed for a fictional client: "Dr. Sharma Dental, Haldwani".
 *
 * DESTRUCTIVE BY DESIGN. This script deletes every User, Request and
 * RequestEvent in the target database before reseeding, so running it against
 * a real database destroys real data. The guard below is the only thing
 * standing between a typo and a wiped production cluster.
 *
 * Idempotency strategy: wipe-then-reseed (chosen over upsert-on-key because the
 * demo dataset is a *set*, not a singleton — upserting 20 records by email
 * would leave rows from a previous, differently-shaped seed behind forever).
 */

const CLINIC = 'Dr. Sharma Dental, Haldwani';
const DEMO_PASSWORD = 'Staff@123';

/** Indian names + services, chosen to look like real Haldwani clinic traffic. */
const CUSTOMERS = [
  { name: 'Amit Sharma', phone: '+91 98765 43210' },
  { name: 'Priya Rawat', phone: '+91 98123 45678' },
  { name: 'Rajesh Kumar', phone: '098765 43211' },
  { name: 'Sneha Bisht', phone: '+91-97110-22334' },
  { name: 'Vikram Singh', phone: '+91 96321 88776' },
  { name: 'Anjali Mehra', phone: '+91 98111 22334' },
  { name: 'Rohit Pant', phone: '+91 94150 11223' },
  { name: 'Neha Joshi', phone: '+91 90050 44556' },
  { name: 'Manish Tiwari', phone: '+91 99970 12345' },
  { name: 'Kavita Rana', phone: '+91 89550 66778' },
  { name: 'Suresh Chandra', phone: '+91 78090 33445' },
  { name: 'Pooja Negi', phone: '+91 87560 99001' },
];

const SERVICES = [
  'Root canal treatment',
  'Teeth cleaning (scaling)',
  'Tooth extraction',
  'Dental implant consultation',
  'Braces adjustment',
  'Filling and polishing',
  'Wisdom tooth removal',
  'Denture fitting',
  'X-ray and diagnosis',
  'Gum treatment',
  'Child dentistry checkup',
  'Teeth whitening',
];

const NOTES = [
  'Patient reports severe pain on the left side.',
  'Called in the morning, prefers an evening slot.',
  'Previous visit: sensitivity on the upper right molar.',
  'Bring the old X-ray if the patient still has it.',
  'Patient is anxious — allow extra time.',
  'Follow-up scheduled after six weeks.',
];

/**
 * Build a realistic status chain for each request. `upTo` is the final status;
 * the walk always starts at 'open' and only takes legal transitions, so every
 * seeded record is reachable through the same rules the API enforces.
 */
function chainUpTo(finalStatus) {
  const chain = ['open'];
  const order = ['open', 'in-progress', 'done', 'billed'];
  for (let i = 1; i < order.indexOf(finalStatus); i += 1) {
    if (isAllowedTransition(chain[chain.length - 1], order[i])) chain.push(order[i]);
  }
  return chain;
}

function pad(n) {
  return String(n).padEnd(18, ' ');
}

async function seed() {
  // ---- Production guard -------------------------------------------------
  if (isProd && env.ALLOW_PROD_SEED !== true) {
    console.error(
      '\n[seed] REFUSING TO RUN.\n' +
        'NODE_ENV=production and ALLOW_PROD_SEED is not set to true.\n' +
        'This script DELETES all users, requests and audit events in the target database.\n' +
        'If you truly mean it, run with:  ALLOW_PROD_SEED=true npm run seed\n'
    );
    process.exitCode = 1;
    return;
  }

  await connectDB();
  console.log(`[seed] connected to ${env.MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')}`);

  // ---- Explicit index build --------------------------------------------
  // Mongoose only auto-builds indexes when autoIndex is on, and it is OFF in
  // production. The list endpoint depends on the compound {status, createdAt}
  // index and $text search depends on the text index, so they are built
  // explicitly here rather than being left to chance at deploy time.
  await Promise.all([Request.syncIndexes(), User.syncIndexes(), RequestEvent.syncIndexes()]);
  console.log('[seed] indexes ensured (compound {status,createdAt} + text {customerName,phoneNormalized})');

  // ---- Wipe ------------------------------------------------------------
  // RequestEvent.deleteMany() is *blocked by design* (the model is
  // append-only), so the collection is emptied through the native driver,
  // which bypasses middleware. This is the one and only place in the codebase
  // allowed to do that, and only because it is a full-database reset.
  await Promise.all([
    RequestEvent.collection.deleteMany({}),
    Request.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log('[seed] cleared existing users, requests and events');

  // ---- Users -----------------------------------------------------------
  const owner = await User.create({
    name: 'Dr. Anjali Sharma',
    email: 'owner@demo.com',
    role: 'owner',
    password: DEMO_PASSWORD,
  });
  const staff = await User.create({
    name: 'Ramesh Thapa',
    email: 'staff@demo.com',
    role: 'staff',
    password: DEMO_PASSWORD,
  });
  console.log('[seed] created 2 demo users');

  // ---- Requests + audit trail -----------------------------------------
  const staffPool = [staff];
  let created = 0;

  for (let i = 0; i < 20; i += 1) {
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    // Spread deterministically across all four statuses (5 each) so the
    // filtered list views always have something to show.
    const finalStatus = REQUEST_STATUSES[i % REQUEST_STATUSES.length];
    // Step 2 (not 3) through the priority list: stepping by the array LENGTH
    // is a no-op modulo, which would make every row 'low'.
    const priority = REQUEST_PRIORITIES[(i * 2) % REQUEST_PRIORITIES.length];
    const assigned = i % 3 === 0 ? null : staffPool[i % staffPool.length];

    // Backdate so the createdAt sort order is visibly meaningful.
    const createdAt = new Date(Date.now() - (20 - i) * 36e5 * 9); // ~9h apart

    const request = await Request.create({
      customerName: customer.name,
      phone: customer.phone,
      service: SERVICES[i % SERVICES.length],
      status: 'open',
      priority,
      assignee: assigned,
      notes: i % 4 === 0 ? [NOTES[i % NOTES.length]] : [],
      attachmentUrl: i % 5 === 0 ? 'https://example.com/xrays/patient-' + (i + 1) + '.jpg' : undefined,
      createdBy: i % 2 === 0 ? owner : staff,
      createdAt,
      updatedAt: createdAt,
    });

    // Walk the legal chain, writing one audit event per hop.
    const chain = chainUpTo(finalStatus);
    let at = createdAt.getTime();
    let from = 'open';
    for (const toStatus of chain.slice(1)) {
      at += 6 * 36e5; // each hop ~6h later
      await RequestEvent.create({
        request: request._id,
        actor: i % 2 === 0 ? staff : owner,
        fromStatus: from,
        toStatus,
        note: `Moved to ${toStatus} during front-desk follow-up.`,
        at: new Date(at),
      });
      from = toStatus;
    }

    if (finalStatus !== 'open') {
      request.status = finalStatus;
      request.updatedAt = new Date(at);
      await request.save();
    }

    created += 1;
  }
  console.log(`[seed] created ${created} requests for ${CLINIC}`);

  const eventCount = await RequestEvent.countDocuments();
  const byStatus = await Request.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  const byPriority = await Request.aggregate([{ $group: { _id: '$priority', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);

  // ---- Summary ---------------------------------------------------------
  console.log('\n' + '='.repeat(72));
  console.log(`  SEED COMPLETE — ${CLINIC}`);
  console.log('='.repeat(72));
  console.log(`${pad('ENTITY')}  COUNT`);
  console.log('-'.repeat(72));
  console.log(`${pad('Users')}  ${await User.countDocuments()}`);
  console.log(`${pad('Requests')}  ${created}`);
  console.log(`${pad('RequestEvents')}  ${eventCount}`);
  console.log('-'.repeat(72));
  console.log('  Requests by status');
  for (const row of byStatus) console.log(`${pad('  ' + row._id)}  ${row.n}`);
  console.log('  Requests by priority');
  for (const row of byPriority) console.log(`${pad('  ' + row._id)}  ${row.n}`);
  console.log('-'.repeat(72));
  console.log('  DEMO CREDENTIALS');
  console.log(`${pad('  owner@demo.com')}  ${DEMO_PASSWORD}   (role: owner)`);
  console.log(`${pad('  staff@demo.com')}  ${DEMO_PASSWORD}   (role: staff)`);
  console.log('='.repeat(72) + '\n');
}

seed()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[seed] failed:', err);
    try {
      await mongoose.connection.close();
    } catch {
      /* connection may already be closed */
    }
    process.exit(1);
  });
