import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { Request } from '../src/models/Request.js';
import { RequestEvent } from '../src/models/RequestEvent.js';
import { User } from '../src/models/User.js';

const OWNER = { name: 'Owner Person', email: 'owner@req.test', password: 'Passw0rd!', role: 'owner' };
const STAFF = { name: 'Staff Person', email: 'staff@req.test', password: 'Passw0rd!', role: 'staff' };

const BASE = {
  customerName: 'Amit Sharma',
  phone: '+91 98765 43210',
  service: 'Root canal treatment',
  priority: 'normal',
};

let ownerAgent;
let staffAgent;
let staffUser;

/**
 * Return a supertest agent holding a valid session cookie for `user`.
 *
 * The user row is created straight through the model and the cookie is then
 * obtained by logging in over HTTP, so the session exercises the real
 * sign-in path. The user is seeded here rather than in `beforeAll` because
 * `tests/setup.js` wipes every collection after each test — a user created
 * once in `beforeAll` is gone by the second test, and every later request
 * would 401.
 *
 * The login limiter uses `skipSuccessfulRequests`, so a correct password
 * never consumes the rate-limit budget.
 */
async function agentFor(user) {
  const agent = request.agent(app);
  await User.deleteOne({ email: user.email });
  const doc = new User({ name: user.name, email: user.email, role: user.role });
  doc.password = user.password;
  await doc.save();
  await agent
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  return agent;
}

/** Create a request and return the parsed body. */
async function createRequest(agent, overrides = {}) {
  const res = await agent.post('/api/requests').send({ ...BASE, ...overrides });
  expect(res.status).toBe(201);
  return res.body.data;
}

/** Bulk-insert `n` requests directly, bypassing the API, to test pagination. */
async function seedBulk(n) {
  const createdBy = await User.findOne({ email: OWNER.email });
  await Request.insertMany(
    Array.from({ length: n }, (_, i) => ({
      customerName: `Customer ${String(i).padStart(3, '0')}`,
      phone: `9${String(800000000 + i).padStart(9, '0')}`,
      phoneNormalized: `9${String(800000000 + i).padStart(9, '0')}`,
      service: 'Teeth cleaning',
      status: ['open', 'in-progress', 'done', 'billed'][i % 4],
      priority: ['low', 'normal', 'high'][i % 3],
      createdBy: createdBy._id,
      createdAt: new Date(Date.now() - i * 1000),
    }))
  );
}

// Re-login before every test: the setup file wipes all collections between
// tests, so both the user rows and the sessions must be recreated each time.
beforeEach(async () => {
  ownerAgent = await agentFor(OWNER);
  staffAgent = await agentFor(STAFF);
  staffUser = await User.findOne({ email: STAFF.email });
});

describe('authentication guard', () => {
  it('401s on GET /api/requests without a cookie', async () => {
    const res = await request(app).get('/api/requests');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('401s on POST /api/requests without a cookie', async () => {
    const res = await request(app).post('/api/requests').send(BASE);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });
});

describe('POST /api/requests', () => {
  it('creates a request owned by the caller and normalizes the phone', async () => {
    const data = await createRequest(ownerAgent);
    expect(data.customerName).toBe(BASE.customerName);
    expect(data.status).toBe('open');
    expect(data.phoneNormalized).toBe('919876543210');
    expect(data.createdBy).toMatchObject({ name: OWNER.name, email: OWNER.email });
    // createBy/assignee projections must never carry a hash.
    expect(JSON.stringify(data)).not.toContain('passwordHash');
  });

  it('rejects a body missing required fields with details', async () => {
    const res = await ownerAgent.post('/api/requests').send({ customerName: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
    const paths = res.body.error.details.map((d) => d.path);
    expect(paths).toContain('phone');
    expect(paths).toContain('service');
  });

  it('rejects a too-short phone after normalization', async () => {
    const res = await ownerAgent.post('/api/requests').send({ ...BASE, phone: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
    expect(res.body.error.details[0].path).toBe('phone');
  });

  it('rejects a client-supplied status', async () => {
    const res = await ownerAgent
      .post('/api/requests')
      .send({ ...BASE, status: 'done' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
  });

  it('rejects a non-existent assignee', async () => {
    const res = await ownerAgent
      .post('/api/requests')
      .send({ ...BASE, assignee: '507f1f77bcf86cd799439011' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
  });

  it('accepts a valid assignee and populates only id, name + email', async () => {
    const data = await createRequest(ownerAgent, { assignee: staffUser._id.toString() });
    expect(data.assignee).toMatchObject({ name: STAFF.name, email: STAFF.email });
    // Exactly id/name/email and nothing else. `id` is here deliberately: a
    // client needs a key to PATCH the assignee later, and the projection is an
    // allow-list, so the real assertion of value is that NO other User field
    // (passwordHash, role, __v) is present — checked explicitly below.
    expect(Object.keys(data.assignee).sort()).toEqual(['email', 'id', 'name']);
    expect(data.assignee).not.toHaveProperty('passwordHash');
    expect(data.assignee).not.toHaveProperty('__v');
    expect(data.assignee).not.toHaveProperty('role');
    expect(data.assignee.id).toBe(staffUser._id.toString());
  });
});

describe('RBAC', () => {
  it('403s a staff user trying to edit request fields', async () => {
    const data = await createRequest(ownerAgent);
    const res = await staffAgent.patch(`/api/requests/${data.id}`).send({ priority: 'high' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
  });

  it('403s a staff user trying to delete a request', async () => {
    const data = await createRequest(ownerAgent);
    const res = await staffAgent.delete(`/api/requests/${data.id}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
  });

  it('lets an owner edit request fields', async () => {
    const data = await createRequest(ownerAgent);
    const res = await ownerAgent
      .patch(`/api/requests/${data.id}`)
      .send({ priority: 'high', notes: ['patient prefers morning'] });
    expect(res.status).toBe(200);
    expect(res.body.data.priority).toBe('high');
    expect(res.body.data.notes).toEqual(['patient prefers morning']);
  });

  it('400s an empty field-edit body', async () => {
    const data = await createRequest(ownerAgent);
    const res = await ownerAgent.patch(`/api/requests/${data.id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
  });

  it('allows any authenticated user to read the list and a single request', async () => {
    const data = await createRequest(ownerAgent);
    expect((await staffAgent.get('/api/requests')).status).toBe(200);
    expect((await staffAgent.get(`/api/requests/${data.id}`)).status).toBe(200);
  });
});

describe('status transitions and the audit trail', () => {
  it('lets a staff user transition open -> in-progress and writes a RequestEvent', async () => {
    const data = await createRequest(ownerAgent);
    expect(data.status).toBe('open');

    const res = await staffAgent
      .patch(`/api/requests/${data.id}/status`)
      .send({ toStatus: 'in-progress', note: 'Patient checked in' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in-progress');

    const events = await staffAgent.get(`/api/requests/${data.id}/events`);
    expect(events.status).toBe(200);
    expect(events.body.data).toHaveLength(1);
    expect(events.body.data[0]).toMatchObject({
      fromStatus: 'open',
      toStatus: 'in-progress',
      note: 'Patient checked in',
    });
    expect(events.body.data[0].actor).toMatchObject({ email: STAFF.email, role: 'staff' });
    expect(events.body.data[0].at).toBeTruthy();
  });

  it('rejects a skipped transition open -> billed with 400 invalid_transition', async () => {
    const data = await createRequest(ownerAgent);
    const res = await ownerAgent.patch(`/api/requests/${data.id}/status`).send({ toStatus: 'billed' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_transition');

    // Status must be untouched and no audit event written.
    const after = await ownerAgent.get(`/api/requests/${data.id}`);
    expect(after.body.data.status).toBe('open');
    expect((await RequestEvent.countDocuments({ request: data.id }))).toBe(0);
  });

  it('rejects open -> done (skip) and in-progress -> open (backwards)', async () => {
    const a = await createRequest(ownerAgent);
    const skip = await ownerAgent.patch(`/api/requests/${a.id}/status`).send({ toStatus: 'done' });
    expect(skip.status).toBe(400);
    expect(skip.body.error.code).toBe('invalid_transition');

    await ownerAgent.patch(`/api/requests/${a.id}/status`).send({ toStatus: 'in-progress' }).expect(200);
    const backwards = await ownerAgent
      .patch(`/api/requests/${a.id}/status`)
      .send({ toStatus: 'open' });
    expect(backwards.status).toBe(400);
    expect(backwards.body.error.code).toBe('invalid_transition');
  });

  it('rejects a no-op transition to the current status', async () => {
    const data = await createRequest(ownerAgent);
    const res = await ownerAgent.patch(`/api/requests/${data.id}/status`).send({ toStatus: 'open' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_transition');
  });

  it('records the full legal chain in order', async () => {
    const data = await createRequest(ownerAgent);
    for (const toStatus of ['in-progress', 'done', 'billed']) {
      await ownerAgent.patch(`/api/requests/${data.id}/status`).send({ toStatus }).expect(200);
    }
    const res = await ownerAgent.get(`/api/requests/${data.id}/events`);
    expect(res.body.data.map((e) => e.toStatus)).toEqual(['in-progress', 'done', 'billed']);
    expect(res.body.data.map((e) => e.fromStatus)).toEqual(['open', 'in-progress', 'done']);
  });

  it('returns 404 not_found for an unknown id from a valid staff session', async () => {
    // Proves RBAC is not what is rejecting this call: staff MAY transition,
    // so a 403 here would mean the role gate fired on a well-formed request.
    // 507f1f77bcf86cd799439011 is a VALID ObjectId, so validation passes and
    // the failure is genuinely "no such request" => 404 not_found. (A
    // malformed id such as "nope" is a separate test below: 400 invalid_input.)
    const res = await staffAgent
      .patch('/api/requests/507f1f77bcf86cd799439011/status')
      .send({ toStatus: 'in-progress' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('rolls the status back if the audit event cannot be written', async () => {
    const data = await createRequest(ownerAgent);
    const original = RequestEvent.create.bind(RequestEvent);
    RequestEvent.create = async () => {
      throw new Error('simulated audit failure');
    };
    try {
      const res = await ownerAgent
        .patch(`/api/requests/${data.id}/status`)
        .send({ toStatus: 'in-progress' });
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('internal_error');
    } finally {
      RequestEvent.create = original;
    }
    const after = await ownerAgent.get(`/api/requests/${data.id}`);
    expect(after.body.data.status).toBe('open');
  });

  it('blocks updates and deletes on RequestEvent (append-only)', async () => {
    const data = await createRequest(ownerAgent);
    await ownerAgent.patch(`/api/requests/${data.id}/status`).send({ toStatus: 'in-progress' });
    const event = await RequestEvent.findOne({ request: data.id });

    await expect(RequestEvent.updateOne({ _id: event._id }, { $set: { note: 'tampered' } })).rejects.toThrow(
      /append-only/i
    );
    await expect(RequestEvent.deleteOne({ _id: event._id })).rejects.toThrow(/append-only/i);
    expect(await RequestEvent.countDocuments({ request: data.id })).toBe(1);
  });
});

describe('GET /api/requests list', () => {
  /**
   * The whole list suite reads a 25-document fixture set.
   *
   * It used to be seeded inside the pagination test only, which made every
   * other test in this block order-dependent: setup.js wipes all collections in
   * afterEach, so filter/search tests ran against an empty collection and got
   * a correct-but-empty `{data: [], pagination: {total: 0}}` response. Seeding
   * per-test in beforeEach makes each test self-contained, which is the whole
   * point of a fresh in-memory database per test.
   */
  beforeEach(async () => {
    await Request.deleteMany({});
    await seedBulk(25);
  });

  it('rejects limit=500 with invalid_input', async () => {
    const res = await ownerAgent.get('/api/requests?limit=500');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
    expect(res.body.error.details[0].path).toBe('limit');
  });

  it('rejects limit=0 and page=0', async () => {
    expect((await ownerAgent.get('/api/requests?limit=0')).status).toBe(400);
    expect((await ownerAgent.get('/api/requests?page=0')).status).toBe(400);
  });

  it('paginates with correct totals and hasNext/hasPrev', async () => {
    const page1 = await ownerAgent.get('/api/requests?page=1&limit=10');
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(10);
    expect(page1.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });

    const page2 = await ownerAgent.get('/api/requests?page=2&limit=10');
    expect(page2.body.data).toHaveLength(10);
    expect(page2.body.pagination).toMatchObject({ page: 2, totalPages: 3, hasNext: true, hasPrev: true });

    const page3 = await ownerAgent.get('/api/requests?page=3&limit=10');
    expect(page3.body.data).toHaveLength(5);
    expect(page3.body.pagination).toMatchObject({ page: 3, hasNext: false, hasPrev: true });

    // Pages must not overlap.
    const ids = new Set([...page1.body.data, ...page2.body.data, ...page3.body.data].map((r) => r.id));
    expect(ids.size).toBe(25);
  });

  it('clamps default limit to 20 and reports pagination metadata', async () => {
    const res = await ownerAgent.get('/api/requests');
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
    expect(res.body.pagination.totalPages).toBe(Math.ceil(res.body.pagination.total / 20));
  });

  it('filters by status and by priority', async () => {
    const byStatus = await ownerAgent.get('/api/requests?status=done');
    expect(byStatus.status).toBe(200);
    expect(byStatus.body.data.length).toBeGreaterThan(0);
    expect(byStatus.body.data.every((r) => r.status === 'done')).toBe(true);
    expect(byStatus.body.pagination.total).toBe(byStatus.body.data.length);

    const byPriority = await ownerAgent.get('/api/requests?priority=high');
    expect(byPriority.body.data.every((r) => r.priority === 'high')).toBe(true);

    const both = await ownerAgent.get('/api/requests?status=done&priority=low');
    expect(both.body.data.every((r) => r.status === 'done' && r.priority === 'low')).toBe(true);
  });

  it('searches the text index on customer name', async () => {
    const res = await ownerAgent.get('/api/requests?q=Customer');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((r) => /customer/i.test(r.customerName))).toBe(true);
  });

  it('prefix-searches a numeric query against the normalized phone', async () => {
    const res = await ownerAgent.get('/api/requests?q=9800000001');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].phoneNormalized).toContain('9800000001');
  });

  it('returns an empty page rather than an error when nothing matches', async () => {
    const res = await ownerAgent.get('/api/requests?q=zzzzznotathing');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toMatchObject({ total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  });

  it('sorts ascending and descending by createdAt', async () => {
    const desc = await ownerAgent.get('/api/requests?sort=-createdAt&limit=100');
    const asc = await ownerAgent.get('/api/requests?sort=createdAt&limit=100');
    expect(desc.status).toBe(200);
    expect(asc.status).toBe(200);
    const descTimes = desc.body.data.map((r) => new Date(r.createdAt).getTime());
    const ascTimes = asc.body.data.map((r) => new Date(r.createdAt).getTime());
    expect([...descTimes].sort((a, b) => b - a)).toEqual(descTimes);
    expect([...ascTimes].sort((a, b) => a - b)).toEqual(ascTimes);
    expect(descTimes[0]).toBe(ascTimes[ascTimes.length - 1]);
  });

  it('rejects an invalid sort value', async () => {
    const res = await ownerAgent.get('/api/requests?sort=sideways');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
  });

  it('never leaks password hashes in the list projection', async () => {
    const res = await ownerAgent.get('/api/requests?limit=100');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('$2b$');
  });
});

describe('GET /api/requests/:id', () => {
  it('404s an unknown id with the standard error contract', async () => {
    const res = await ownerAgent.get('/api/requests/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('400s a malformed id', async () => {
    const res = await ownerAgent.get('/api/requests/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
  });
});

describe('DELETE /api/requests/:id', () => {
  it('lets an owner delete a request', async () => {
    const data = await createRequest(ownerAgent);
    const res = await ownerAgent.delete(`/api/requests/${data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    await ownerAgent.get(`/api/requests/${data.id}`).expect(404);
  });
});

describe('unknown routes', () => {
  it('404s with the error contract', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
