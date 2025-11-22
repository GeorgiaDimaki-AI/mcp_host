/**
 * Server Integration Tests
 * Tests for server configuration, CORS, and overall setup
 */

import express from 'express';
import cors from 'cors';
import request from 'supertest';

describe('Server Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Replicate Phase 3 CORS configuration
    app.use(cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    app.use(express.json());

    // Test routes
    app.get('/test', (req, res) => {
      res.json({ message: 'ok' });
    });

    app.post('/test', (req, res) => {
      res.json({ received: req.body });
    });
  });

  describe('CORS Configuration (Phase 3)', () => {
    test('should allow requests from localhost:5173', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    test('should allow requests from localhost:3000', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    test('should allow requests from localhost:3001', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    });

    test('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    test('should allow credentials', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should allow Content-Type header', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Headers', 'content-type')
        .expect(204);

      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    test('should allow Authorization header', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Headers', 'authorization')
        .expect(204);

      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });
  });

  describe('JSON Body Parsing', () => {
    test('should parse JSON request bodies', async () => {
      const testData = { key: 'value', nested: { data: 123 } };

      const response = await request(app)
        .post('/test')
        .send(testData)
        .expect(200);

      expect(response.body.received).toEqual(testData);
    });

    test('should handle empty JSON body', async () => {
      const response = await request(app)
        .post('/test')
        .send({})
        .expect(200);

      expect(response.body.received).toEqual({});
    });

    test('should reject invalid JSON', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);
    });
  });

  describe('HTTP Methods', () => {
    test('should support GET requests', async () => {
      await request(app)
        .get('/test')
        .expect(200);
    });

    test('should support POST requests', async () => {
      await request(app)
        .post('/test')
        .send({})
        .expect(200);
    });

    test('should support PUT requests via CORS', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'PUT')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toContain('PUT');
    });

    test('should support DELETE requests via CORS', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'DELETE')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toContain('DELETE');
    });
  });
});
