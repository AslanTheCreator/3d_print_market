import { createServer } from "node:http";

const port = Number(process.env.PORT ?? process.env.PLAYWRIGHT_FIXTURE_API_PORT);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("A positive fixture API PORT is required");
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const product = {
  id: 901,
  name: "Тестовая коллекционная фигурка",
  description:
    "Товар из локального Playwright fixture для проверки серверного и адаптивного рендеринга. Описание намеренно сделано достаточно длинным, чтобы проверить раскрытое состояние текста при переходе между compact, medium и wide layout без размонтирования компонента. Выбранное пользователем состояние должно сохраняться на каждой границе.",
  price: 12990,
  prepaymentAmount: 2990,
  count: 2,
  currency: "RUB",
  originality: "Оригинал",
  participantId: 77,
  status: "ACTIVE",
  categories: [{ id: 32, name: "Фигурки", childs: [] }],
  availability: "PURCHASABLE",
  externalUrl: "",
  imageIds: [9011, 9012],
  reviews: [
    {
      id: 7001,
      rating: 5,
      comment:
        "Fixture-отзыв для проверки сохранения открытого списка при изменении viewport.",
      reviewerName: "Playwright",
      imageId: 0,
      createdAt: "2026-07-28T10:00:00.000Z",
    },
  ],
  sellerLogin: "fixture-seller",
  sellerRating: 4.8,
  totalReviews: 1,
};

const createSvgDataUrl = (background, label) => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">',
    `<rect width="1200" height="900" fill="${background}"/>`,
    '<circle cx="600" cy="400" r="230" fill="#fff" fill-opacity=".82"/>',
    `<text x="600" y="720" text-anchor="middle" font-family="sans-serif" font-size="72" fill="#212121">${label}</text>`,
    "</svg>",
  ].join("");

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const images = [
  {
    id: 9011,
    originalUrl: createSvgDataUrl("#f9a8d4", "Fixture 1"),
    mediumUrl: createSvgDataUrl("#f9a8d4", "Fixture 1"),
    thumbnailUrl: createSvgDataUrl("#f9a8d4", "1"),
    width: 1200,
    height: 900,
    contentType: "image/svg+xml",
  },
  {
    id: 9012,
    originalUrl: createSvgDataUrl("#7dd3fc", "Fixture 2"),
    mediumUrl: createSvgDataUrl("#7dd3fc", "Fixture 2"),
    thumbnailUrl: createSvgDataUrl("#7dd3fc", "2"),
    width: 1200,
    height: 900,
    contentType: "image/svg+xml",
  },
];

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    ...corsHeaders,
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "Missing request URL" });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  const url = new URL(request.url, `http://127.0.0.1:${port}`);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "GET" && url.pathname === `/product/${product.id}`) {
    sendJson(response, 200, product);
    return;
  }

  if (request.method === "GET" && url.pathname === "/images/metadata") {
    const ids = (url.searchParams.get("ids") ?? "")
      .split(",")
      .map(Number)
      .filter(Number.isFinite);
    sendJson(
      response,
      200,
      images.filter((image) => ids.includes(image.id)),
    );
    return;
  }

  sendJson(response, 404, {
    error: "Fixture route is not implemented",
    method: request.method,
    path: url.pathname,
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `Playwright API fixture listening on http://127.0.0.1:${port}\n`,
  );
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
