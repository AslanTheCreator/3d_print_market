export const adminProductReturnTo = (candidate: string | null) => candidate && /^\/admin\/(products|agents)(\/\d+)?(\?[^\\]*)?$/.test(candidate) ? candidate : undefined;
