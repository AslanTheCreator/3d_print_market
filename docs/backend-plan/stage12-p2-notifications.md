# Этап 12, VP P2-1: уведомления при открытом Dialog

27.10.2026. База: `ad9715218e5a894c8e501f3cb1c987ac93826315`, ветка
`feature/backend-integration`. Исправление выделено в отдельный Conventional
Commit P2-1 по разрешению владельца проекта. Нужен адресный независимый VP.

## Причина и исправление

Глобальный `modal - 1` скрывал ошибку DELETE под Dialog. Простое повышение
z-index также недостаточно: ModalManager скрывает внешние узлы от accessibility
tree, FocusTrap не допускает их кнопки; toast поверх короткой auth-формы может
перекрыть критические действия.

`NotificationProvider` находит активный видимый Dialog, исключая `aria-hidden`
поддеревья, и размещает уведомления через MUI Portal внутри него. Блок занимает
место в потоке, имеет ограниченную высоту и собственную прокрутку; поля и действия
диалога не накрываются. Новый Modal/FocusTrap не создаётся. При отсутствии Dialog
сохраняется глобальный Snackbar со штатным `theme.zIndex.snackbar`.

Если пользователь закрывает сфокусированное уведомление, focus перед удалением
кнопки возвращается на доступное действие/поле активного Dialog. Таймер и
click-away не перехватывают focus. Публичный API `useNotification` не изменён.
Контракт refresh и backend не затрагиваются.

## Браузерное подтверждение

Свежий production standalone; `notification-dialogs.spec.ts` проверяет desktop
1280×900 и mobile viewport 393×400:

- Ошибка реального обработчика UI при mock DELETE 500 доступна через `role=alert`
  внутри незакрытого Dialog. Проверены viewport и `elementFromPoint` на тексте
  и кнопке закрытия, а не числовой z-index.
- Уведомление закрывается с клавиатуры; focus остаётся внутри Dialog. Отмена
  доступна и закрывает Dialog; DELETE отправлен один раз, товар остаётся в списке.
- После успешного Reset уведомление и подтверждение email доступны; кнопка
  возврата не перекрыта, работает с клавиатуры, focus возвращается на
  «Забыли пароль?». Проверены оба размера экрана.

Новые четыре сценария и существующие четыре Pixel 5 auth-сценария дали
**8 PASS**, 0 FAIL/skip/flaky, workers=2/retries=0, **18.7 s**.
Существующие проверки verification, cooldown, ошибок, pending, Escape,
visualViewport и возврата focus сохранены. Более широкий повтор notification/
auth/session/open-forms/user-products дал **50 PASS**, 0 FAIL/skip/flaky/errors,
63.884 s, workers=2/retries=0; отдельный существующий mobile overlay/Reset —
**1 PASS**, 5.114 s. Все на свежей сборке VlqBTxnS53OJpmJzON3t2.
Отчёты p2-targeted-regression.json/log и p2-mobile-reset-configured.json/log.

Первый прогон новых сценариев дал 2 PASS / 2 FAIL: обнаружил уход focus на body
после удаления кнопки уведомления. Исправлен обработчик закрытия; assertion
не ослаблялся. Отчёты: `.cache/backend-stage12/p2-notifications.json` и
`p2-notifications-final.json/log`. Это UI-регрессии с mock API; они не доказывают
серверную CORS-совместимость. Проверки P2-2 описаны отдельно.

## Состав отдельного изменения

- `src/shared/ui/notification/NotificationProvider.tsx`
- `tests/e2e/notification-dialogs.spec.ts`
- `docs/architecture.md`
- этот документ

Общие результаты этапа и готовность к адресному VP — в
[stage12-results.md](./stage12-results.md), обновляемом в следующем коммите P2-2.
Push, merge и rebase не выполняются.
