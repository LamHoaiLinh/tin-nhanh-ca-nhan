export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    if (typeof value.message === 'string' && value.message.trim()) return value.message;
    if (typeof value.details === 'string' && value.details.trim()) return value.details;
    if (typeof value.hint === 'string' && value.hint.trim()) return value.hint;
    if (typeof value.code === 'string' && value.code.trim()) return `Lỗi hệ thống: ${value.code}`;
  }
  return 'Đã xảy ra lỗi không xác định.';
}
