import http from 'k6/http';
import { check } from 'k6';

// ---------- settings (all passed with -e NAME=value) ----------
const url = __ENV.API_URL;
// const url = 'http://localhost:8007/products/getAllProduct';

const rps = Number(__ENV.RPS || 1);
const vus = Number(__ENV.VUS || 50);
const maxVus = Number(__ENV.MAX_VUS || vus * 4);
const p95Limit = Number(__ENV.P95_MS || 1000);

if (!url) {
  throw new Error('API_URL is required');
}
// if (url.startsWith('http://')) {
//   throw new Error('Use the https:// URL. NGINX redirects http with a 301, and redirects are disabled.');
// }

export const options = {
  scenarios: {
    getAllProduct: {
      executor: 'constant-arrival-rate',
      rate: rps,
      timeUnit: '1s',
      duration: __ENV.DURATION || '1m',
      preAllocatedVUs: vus,
      maxVUs: maxVus,          // lets k6 add VUs if responses slow down
      // gracefulStop: '15s',
    },
  },

  thresholds: {
    // 95% of responses within the limit (default 1000 ms)
    http_req_duration: [`p(95)<${p95Limit}`],

    // under 1% failures; stop early if broken after the first 30 s
    http_req_failed: [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' },
    ],

    checks: ['rate>0.99'],

    // every scheduled request must actually be sent
    dropped_iterations: ['count==0'],
  },

  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// only HTTP 200 counts as success
http.setResponseCallback(http.expectedStatuses(200));

// runs once before the test: fail fast on a bad URL or token
export function setup() {
  const res = http.get(url, { headers: buildHeaders(), timeout: '10s', redirects: 0 });
  if (res.status !== 200) {
    throw new Error(`Pre-check failed: HTTP ${res.status}. Check API_URL and TOKEN.`);
  }
  console.log(`Target: ${url} at ${rps} req/s, VUs ${vus}-${maxVus}`);
}

export default function () {
  const response = http.get(url, {
    headers: buildHeaders(),
    timeout: '10s',
    redirects: 0,
    tags: { name: 'getAllProduct' },
  });

  check(response, {
    'HTTP status is 200': (r) => r.status === 200,
    'has products': (r) => {
      try {
        const body = r.json();
        // supports a plain array or { data: [...] }; adjust to your API
        const items = Array.isArray(body) ? body : body.data;
        return Array.isArray(items) && items.length > 0;
      } catch (e) {
        return false;
      }
    },
  });
}

function buildHeaders() {
  const headers = { Accept: 'application/json' };
  if (__ENV.TOKEN) {
    headers.Authorization = `Bearer ${__ENV.TOKEN}`;
  }
  return headers;
}