import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';

const OWNER = { name: 'Owner Person', email: 'owner@test.com', password: 'Passw0rd!', role: 'owner' };
const STAFF = { name: 'Staff Person', email: 'staff@test.com', password: 'Passw0rd!', role: 'staff' };

/** supertest's agent persists cookies, so a logged-in agent "is" the session. */
async function registerAndLogin(user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(user);
  expect(res.status).toBe(201);
  return agent;
}

describe('health', () => {
  it('GET /health is public and reports db state', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('POST /api/auth/register', () => {
  it('returns 201, sets an httpOnly cookie and leaks nothing sensitive', async () => {
    const res = await request(app).post('/api/auth/register').send(OWNER);

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(OWNER.email);
    expect(res.body.data.role).toBe('owner');
    // No hash, no plaintext password, anywhere in the payload.
    expect(res.body).not.toHaveProperty('data.password');
    expect(res.body).not.toHaveProperty('data.passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(JSON.stringify(res.body)).not.toContain('$2b$');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => /HttpOnly/i.test(c))).toBe(true);
    expect(cookies.some((c) => /SameSite=Lax/i.test(c))).toBe(true);
    expect(cookies.some((c) => /Path=\//i.test(c))).toBe(true);
    // Not readable from JS: no readable copy in the body.
    expect(res.body.token).toBeUndefined();
  });

  it('rejects a bad email with 400 invalid_input and a populated details array', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad Email', email: 'not-an-email', password: 'Passw0rd!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThan(0);
    expect(res.body.error.details[0]).toMatchObject({
      path: expect.stringContaining('email'),
      message: expect.any(String),
    });
  });

  it('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short Pass', email: 'short@test.com', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_input');
    expect(res.body.error.details.some((d) => d.path === 'password')).toBe(true);
  });

  it('returns 409 conflict on duplicate email', async () => {
    await request(app).post('/api/auth/register').send(OWNER).expect(201);
    const res = await request(app).post('/api/auth/register').send(OWNER);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('conflict');
  });

  it('defaults role to staff when omitted', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Default Role', email: 'default@test.com', password: 'Passw0rd!' });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('staff');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the right password and sets a cookie', async () => {
    await request(app).post('/api/auth/register').send(OWNER).expect(201);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: OWNER.email, password: OWNER.password });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(OWNER.email);
    expect(res.headers['set-cookie'].some((c) => /HttpOnly/i.test(c))).toBe(true);
  });

  it('returns 401 unauthorized with a wrong password', async () => {
    await request(app).post('/api/auth/register').send(OWNER).expect(201);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: OWNER.email, password: 'WrongPassword1!' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
    // Must not reveal which half of the credentials was wrong.
    expect(res.body.error.message).not.toMatch(/password is wrong|unknown email/i);
  });

  it('returns 401 unauthorized for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'Whatever123!' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie and invalidates the session', async () => {
    const agent = await registerAndLogin(OWNER);
    await agent.get('/api/auth/me').expect(200);

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    const cleared = res.headers['set-cookie'].find((c) => /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c));
    expect(cleared).toBeDefined();

    await agent.get('/api/auth/me').expect(401);
  });
});

describe('GET /api/auth/me', () => {
  it('401s without a cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('401s with a garbage cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', ['sevadesk_token=not.a.jwt']);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('401s after the user is deleted, even with a valid token', async () => {
    const agent = await registerAndLogin(OWNER);
    await agent.get('/api/auth/me').expect(200);
    await User.deleteOne({ email: OWNER.email });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('returns the current user for a valid session', async () => {
    const agent = await registerAndLogin(STAFF);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: STAFF.email, role: 'staff', name: STAFF.name });
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });
});

describe('password storage', () => {
  beforeAll(async () => {
    await User.deleteMany({});
  });

  it('stores a bcrypt hash and never the plaintext', async () => {
    await request(app).post('/api/auth/register').send(OWNER).expect(201);
    const stored = await User.findOne({ email: OWNER.email }).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/); // 12 rounds
    expect(stored.passwordHash).not.toContain(OWNER.password);
    expect(await stored.verifyPassword(OWNER.password)).toBe(true);
    expect(await stored.verifyPassword('nope')).toBe(false);
  });
});
