import { createServer } from "node:http";
import { unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const port = Number(process.env.PORT ?? process.env.PLAYWRIGHT_FIXTURE_API_PORT);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("A positive fixture API PORT is required");
}

// Raster fixture exists before Next starts, so its real optimizer handles srcset.
const sizingImagePath = new URL("../public/__playwright-image-sizing.png", import.meta.url);
await sharp(Buffer.from([
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">',
  '<defs><pattern id="p" width="37" height="41" patternUnits="userSpaceOnUse">',
  '<rect width="37" height="41" fill="#ef4284"/><circle cx="18" cy="20" r="14" fill="#4c3351"/>',
  '<path d="M0 0L37 41M0 41L37 0" stroke="#b9dbdd" stroke-width="2"/>',
  '</pattern></defs><rect width="1200" height="1200" fill="url(#p)"/></svg>',
].join(""))).png().toFile(fileURLToPath(sizingImagePath));

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

const requestCounts = {};
let recoveryStatus = 503;
let recoveryDelay = 0;
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

  if (request.method === "POST" && url.pathname === "/__test/product-recovery") {
    recoveryStatus = url.searchParams.get("status") === "200" ? 200 : 503;
    recoveryDelay = url.searchParams.get("delay") === "500" ? 500 : 0;
    sendJson(response, 200, { status: recoveryStatus });
    return;
  }

  if (request.method === "GET" && url.pathname === "/__test/requests") {
    sendJson(response, 200, requestCounts);
    return;
  }
  requestCounts[url.pathname] = (requestCounts[url.pathname] ?? 0) + 1;

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "GET" && url.pathname === `/product/${product.id}`) {
    sendJson(response, 200, product);
    return;
  }

  if (request.method === "GET" && url.pathname === "/product/924") {
    const status = recoveryStatus;
    setTimeout(() => sendJson(response, status, status === 200
      ? { ...product, id: 924, name: "Восстановленный серверный товар", imageIds: [] }
      : { message: "Fixture recovery failure" }), recoveryDelay);
    return;
  }

  if (request.method === "GET" && url.pathname === "/product/925") {
    sendJson(response, 200, {
      ...product,
      id: 925,
      name: "Товар с полными отзывами",
      imageIds: [],
      reviews: Array.from({ length: 5 }, (_, index) => ({
        id: 7100 + index,
        rating: 5 - index % 3,
        reviewerName: `Покупатель ${index + 1}`,
        comment: Array.from({ length: 18 }, (_, paragraph) =>
          `Отзыв ${index + 1}, абзац ${paragraph + 1}: подробности комплектации, упаковки и качества коллекционной фигурки.`,
        ).join("\n\n") + `\nКонец отзыва ${index + 1}.`,
        imageId: 0,
        createdAt: ["2026-07-28T10:00:00.000Z", "", "invalid-date", "2026-07-29T10:00:00.000Z", "2026-07-30T10:00:00.000Z"][index],
      })),
      totalReviews: 5,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/product/902") {
    sendJson(response, 200, {
      ...product,
      id: 902,
      name: "Внешняя фигурка без ограничения остатка",
      availability: "EXTERNAL_PRODUCT",
      count: null,
      externalUrl: null,
      prepaymentAmount: 0,
    });
    return;
  }

  if (request.method === "GET" && ["/product/920", "/product/921"].includes(url.pathname)) {
    sendJson(response, url.pathname.endsWith("920") ? 404 : 503, { message: "Fixture failure" });
    return;
  }
  if (request.method === "GET" && ["/product/922", "/product/923"].includes(url.pathname)) {
    sendJson(response, 200, { ...product, id: Number(url.pathname.split("/").at(-1)), imageIds: url.pathname.endsWith("922") ? [9991] : [] });
    return;
  }

  const financialProductIndex = Number(url.pathname.match(/^\/product\/(91[0-5])$/)?.[1]) - 910;
  if (request.method === "GET" && Number.isInteger(financialProductIndex)) {
    sendJson(response, 200, {
      ...product,
      id: 910 + financialProductIndex,
      name: `Финансовый товар ${910 + financialProductIndex}`,
      price: 1250.75,
      prepaymentAmount: financialProductIndex % 2 ? 250.25 : 0,
      currency: ["RUB", "USD", "EUR"][Math.floor(financialProductIndex / 2)],
      availability: financialProductIndex % 2 ? "PREORDER" : "PURCHASABLE",
      imageIds: [],
      reviews: [],
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/images/metadata") {
    if (url.searchParams.get("ids") === "9991") {
      sendJson(response, 404, { message: "Metadata missing" });
      return;
    }
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
  server.close(async () => {
    await unlink(sizingImagePath).catch(() => {});
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
