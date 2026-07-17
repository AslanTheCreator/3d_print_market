# Performance-аудит

Первичный замер: 2026-06-23. Статус сверен с кодом: 2026-07-17.

## Ограничения исходного замера

Замер выполнялся в desktop Chromium с fallback API, без реальных изображений, backend latency, mobile throttling и полноценного INP. Поэтому цифры ниже — исторический baseline, а не текущие Core Web Vitals.

- First Load JS ключевых routes: примерно `287–328 kB`.
- Холодная загрузка публичных страниц: примерно `1.0–1.1 MB`.
- В исходный transfer входили `484 kB` старых файлов шрифта; после аудита они заменены одним variable font.

После последующих изменений route metrics не переснимались.

## Выполнено

- Montserrat заменён одним `Montserrat-Variable.woff2`.
- Drawer категорий и popover действий header загружаются lazy.
- Reviews и related products в карточке товара вынесены в lazy/deferred sections.
- Для части protected links отключён prefetch.
- Production-like проверки переведены на standalone runner.
- Крупные checkout, settings, product form и gallery компоненты декомпозированы.

## Открыто

| Приоритет | Пункт | Текущее подтверждение |
| --- | --- | --- |
| высокий | Повторить замеры | baseline устарел после оптимизаций и исправления standalone runner |
| высокий | Оптимизировать logo assets | `logo-desktop.png` около `925 kB`, `logo.svg` около `148 kB` |
| средний | Решить кеширование каталога | `/` и category route используют `force-dynamic` |
| средний | Проверить protected prefetch | после точечных исправлений повторный network trace не выполнен |
| средний | Измерить Метрику | production analytics загружается в root layout |
| низкий | Контролировать icon imports | MUI icons используются во многих client-компонентах; массовая замена без bundle evidence не нужна |
| низкий | Ввести budget | нет CI-порогов для JS, assets и Web Vitals |

## Следующий замер

1. Собрать проект и запустить `npm run test:standalone`.
2. Измерить `/`, поиск, карточку товара, checkout и privacy на mobile и desktop.
3. Зафиксировать JS, fonts, images, failed requests, LCP, CLS и INP/TBT.
4. Только после нового baseline установить performance budget.
