// Local backend fixtures. Tokens stay in memory and are never logged.
const args = process.argv.slice(2);
const agentId = Number(args.find(value => value.startsWith('--agent-id='))?.split('=')[1]);
const write = args.includes('--write');
const base = 'http://localhost:8081';

async function request(path, token, body) {
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
  } catch {
    throw new Error(`Нет ответа: ${path}. Результат записи неизвестен; автоматического повтора нет.`);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
  return response.json();
}

async function main() {
  if (!Number.isSafeInteger(agentId) || agentId <= 0) throw new Error('Укажите --agent-id=<ID существующего бота>.');
  if (!process.env.ADMIN_LOGIN || !process.env.ADMIN_PASSWORD) throw new Error('Нужны ADMIN_LOGIN и ADMIN_PASSWORD из .env.local.');
  const auth = await request('/auth/login', undefined, {
    mail: process.env.ADMIN_LOGIN, password: process.env.ADMIN_PASSWORD,
  });
  if (!auth.access_token) throw new Error('Не получен административный токен.');
  const token = auth.access_token;
  const profile = await request('/auth/profile', token);
  if (profile.role !== 'ADMIN') throw new Error('Требуется роль ADMIN.');
  const agents = await request('/admin/actions/agents', token);
  const agent = agents.find(item => item.id === agentId);
  if (!agent || agent.status !== 'ACTIVE') throw new Error('Активный бот не найден.');
  const categories = await request('/categories');
  const category = categories.find(item => item.name === 'Аниме фигурки');
  if (!category) throw new Error('Категория «Аниме фигурки» не найдена.');
  const fixtures = [
    { key: 'figure-01', name: '[ТЕСТ] Фигурка для проверки админки', price: 1500 },
    { key: 'figure-02', name: '[ТЕСТ] Фигурка для проверки заказа', price: 2400 },
  ].map(({ key, ...item }) => ({
    ...item,
    description: 'Локальный тестовый товар. Не является реальным предложением продажи.',
    currency: 'RUB', originality: 'Тестовый образец',
    externalUrl: `https://example.invalid/figurzilla-seed/${agentId}/${key}`,
    categoryIds: [category.id], imageIds: [],
  }));
  const existing = await request(`/admin/actions/agents/${agentId}/products`, token);
  const pending = fixtures.filter(fixture => !existing.some(item => item.externalUrl === fixture.externalUrl));
  console.log(JSON.stringify({ backend: base, agentId, login: agent.login, mode: write ? 'write' : 'preview', existing: fixtures.length - pending.length, create: pending.map(item => item.name) }));
  let agentToken;
  if (write && pending.length) {
    const issued = await request(`/admin/actions/agents/${agentId}/token?accessTokenTtlMinutes=15&refreshTokenTtlDays=30`, token, {});
    if (!issued.accessToken) throw new Error('Не получен токен бота.');
    agentToken = issued.accessToken;
    for (const fixture of pending) {
      const id = await request('/agent/products', agentToken, fixture);
      console.log(JSON.stringify({ createdId: id, name: fixture.name }));
    }
  }
  if (write) {
    const products = await request(`/admin/actions/agents/${agentId}/products`, token);
    for (const fixture of fixtures) {
      const matches = products.filter(item => item.externalUrl === fixture.externalUrl);
      if (matches.length !== 1) throw new Error(`Ожидался один товар: ${fixture.name}; найдено ${matches.length}.`);
      const product = matches[0];
      if (product.participantId !== agentId || product.availability !== 'EXTERNAL_PRODUCT') throw new Error('Не совпали владелец или тип созданного товара.');
      console.log(JSON.stringify({ verifiedId: product.id, name: product.name, status: product.status, count: product.count, prepaymentAmount: product.prepaymentAmount }));
    }
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
