// Дробь или экспонента могут дать безопасное целое после JSON.parse. Проверяем и исходную запись.
export function exactInteger(value: unknown, source: string | undefined, minimum: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && source === String(value)
    ? value : undefined;
}
