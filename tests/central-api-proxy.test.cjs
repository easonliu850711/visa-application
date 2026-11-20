const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/central-api-proxy.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
function fixture(env = {}, fetch = () => { throw Error('unexpected network'); }, abort = AbortSignal) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, process: { env }, fetch, URL, Headers, Response, AbortSignal: abort });
  return exports;
}

test('missing or invalid origin fails closed without any request', async () => {
  for (const value of [undefined, '', ' ', 'garbage', 'file:///tmp/core', 'http://user:pass@core.test',
    'https://core.test/path', 'https://core.test/?key=private', 'https://core.test/#fragment']) {
    const response = await fixture({ CENTRAL_API_BASE_URL: value }).proxyGet('/api/visa/e-stat');
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
test('explicit STG and PROD origins remain separate, with legacy env alias support', async () => {
  for (const [key, origin] of [['CENTRAL_API_BASE_URL', 'http://127.0.0.1:3005'],
    ['API_CORE_BASE_URL', 'http://127.0.0.1:4005']]) {
    const api = fixture({ [key]: origin + '/' }, async (url, options) => {
      assert.equal(url, origin + '/api/visa/e-stat');
      assert.equal(options.redirect, 'error');
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal);
      return Response.json({ data: { bureaus: [{ code: 'fixture' }] } });
    });
    const response = await api.proxyGet('/api/visa/e-stat');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.bureaus[0].code, 'fixture');
  }
});
test('only server identity is forwarded, with POST payload and content type preserved', async () => {
  const api = fixture({ CENTRAL_API_BASE_URL: 'https://core.test', CENTRAL_API_KEY: 'fixture-service-identity' },
    async (url, options) => {
      assert.equal(options.method, 'POST');
      assert.equal(options.body, '{"visaType":"fixture"}');
      assert.equal(options.headers.get('content-type'), 'application/json');
      assert.equal(options.headers.get('x-imori-api-key'), 'fixture-service-identity');
      assert.equal(options.headers.get('cookie'), null);
      return Response.json({ status: 'fixture' });
    });
  const req = new Request('https://visa.test/api', { method: 'POST',
    headers: { 'content-type': 'application/json', 'cookie': 'private', 'x-imori-api-key': 'forged' },
    body: '{"visaType":"fixture"}' });
  assert.equal((await api.proxyPost(req, '/api/visa/prediction/v5')).status, 200);
});
test('absolute and traversal route inputs never change the service destination', async () => {
  const api = fixture({ CENTRAL_API_BASE_URL: 'https://core.test' });
  for (const route of ['https://other.test/api', '//other.test/api', '/api/../private', '/api/\\other']) {
    assert.equal((await api.proxyGet(route)).status, 500);
  }
});
test('transport and timeout errors are explicit and do not disclose internal details', async () => {
  for (const aborted of [false, true]) {
    const api = fixture({ CENTRAL_API_BASE_URL: 'https://core.test' }, async () => {
      throw Error('private upstream diagnostics');
    }, { timeout(ms) { assert.equal(ms, 10000); return { aborted }; } });
    const response = await api.proxyGet('/api/visa/e-stat');
    assert.equal(response.status, aborted ? 504 : 502);
    assert.doesNotMatch(await response.text(), /private|core\.test/);
  }
});
test('upstream failure status and empty successful responses are preserved', async () => {
  for (const status of [204, 205, 401, 503]) {
    const api = fixture({ CENTRAL_API_BASE_URL: 'https://core.test' }, async () =>
      new Response(status < 300 ? null : '{"error":"fixture"}', { status,
        headers: { 'content-type': 'application/json', 'set-cookie': 'private' } }));
    const response = await api.proxyGet('/api/visa/e-stat');
    assert.equal(response.status, status);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
