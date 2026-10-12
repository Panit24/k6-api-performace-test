import http from 'k6/http';
import { check, sleep, fail } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';

// export const options = {
//   vus: 10,           // Ten simulated user
//   duration: '100s',  // Run for 100 seconds
//   thresholds: {
//     http_req_failed: ['rate<0.01'],
//     checks: ['rate==1'],
//   },
// };

export const options = {
  scenarios: {
    ratings_10_rps: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    'http_req_failed{scenario:ratings_10_rps}': ['rate<0.01'],
    'http_req_duration{scenario:ratings_10_rps}': ['p(95)<500'],
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

  const registration = http.post(
    `${BASE_URL}/api/users`,
    credentials,
    params
  );

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

//   sleep(1); // Pause one second between requests
}