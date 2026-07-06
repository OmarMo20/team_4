const request = require('supertest');
const app = require('../../src/app');
const db = require('../helpers/testDb');
const { createTeacherWithToken, createStudent } = require('../helpers/factories');
const { Types } = require('mongoose');

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1d';

beforeAll(() => db.connect());
afterEach(() => db.clearAll());
afterAll(() => db.disconnect());

describe('POST /api/students', () => {
  it('should create a student and return 201', async () => {
    const { token } = await createTeacherWithToken();
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Omar Student', grade: 'Grade 10', monthlyFee: 500 });
    expect(res.status).toBe(201);
    expect(res.body.data.fullName).toBe('Omar Student');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).post('/api/students').send({ fullName: 'Test', grade: 'Grade 10' });
    expect(res.status).toBe(401);
  });

  it('should return 400 when fullName is missing', async () => {
    const { token } = await createTeacherWithToken();
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ grade: 'Grade 10' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/students', () => {
  it('should return only my students', async () => {
    const { teacher: t1, token: token1 } = await createTeacherWithToken();
    const { teacher: t2 } = await createTeacherWithToken();
    await createStudent(t1._id, { fullName: 'Student A' });
    await createStudent(t1._id, { fullName: 'Student B' });
    await createStudent(t2._id, { fullName: 'Student C' });
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('should return empty array when no students', async () => {
    const { token } = await createTeacherWithToken();
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/students/:id', () => {
  it('should return a student by ID', async () => {
    const { teacher, token } = await createTeacherWithToken();
    const student = await createStudent(teacher._id);
    const res = await request(app)
      .get(`/api/students/${student._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent ID', async () => {
    const { token } = await createTeacherWithToken();
    const res = await request(app)
      .get(`/api/students/${new Types.ObjectId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('should return 404 for another teacher student (tenant isolation)', async () => {
    const { teacher: t1 } = await createTeacherWithToken();
    const { token: token2 } = await createTeacherWithToken();
    const student = await createStudent(t1._id);
    const res = await request(app)
      .get(`/api/students/${student._id}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/students/:id', () => {
  it('should delete a student successfully', async () => {
    const { teacher, token } = await createTeacherWithToken();
    const student = await createStudent(teacher._id);
    const res = await request(app)
      .delete(`/api/students/${student._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should return 404 for another teacher student', async () => {
    const { teacher: t1 } = await createTeacherWithToken();
    const { token: token2 } = await createTeacherWithToken();
    const student = await createStudent(t1._id);
    const res = await request(app)
      .delete(`/api/students/${student._id}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(404);
  });
});