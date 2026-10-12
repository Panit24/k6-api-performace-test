import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';

// Read load settings from environment (set by the shell runner).
// Falls back to sensible defaults when run directly without env vars.
const RPS = Number(__ENV.RPS) || 10;
const DURATION = __ENV.DURATION || '100s';
const PRE_ALLOCATED_VUS = Number(__ENV.VUS) || RPS * 2;
const MAX_VUS = Number(__ENV.MAX_VUS) || RPS * 4;
const P95_MAX = __ENV.P95_MAX || '500'; // ms

export const options = {
  scenarios: {
    ratings: {
      executor: 'constant-arrival-rate',
      rate: RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
    },
  },
  thresholds: {
    'http_req_failed{scenario:ratings}': ['rate<0.01'],
    'http_req_duration{scenario:ratings}': [`p(95)<${P95_MAX}`],
    checks: ['rate==1'],
    dropped_iterations: ['count==0'],
  },
};

// Runs once before the test
export function setup() {
  const credentials = JSON.stringify({
    username: `k${Math.random().toString(36).slice(2, 10)}@ex.com`,
    password: 'K6-Learning-Example-123!',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  };

  const registration = http.post(`${BASE_URL}/api/users`, credentials, params);

  if (registration.status !== 201) {
    console.log('Registration response:', registration.body);
    fail(`Registration failed: HTTP ${registration.status}`);
  }

  const login = http.post(
    `${BASE_URL}/api/users/token/login`,
    credentials,
    params
  );

  if (login.status !== 200) {
    fail(`Login failed: HTTP ${login.status}`);
  }

  const token = login.json('token');

  if (!token) fail('Login returned no token');

  return { token };
}

// Repeats during the test
export default function (data) {
  const response = http.get(`${BASE_URL}/api/ratings`, {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
    timeout: '10s',
  });

  check(response, {
    'HTTP status is 200': (r) => r.status === 200,
  });
}