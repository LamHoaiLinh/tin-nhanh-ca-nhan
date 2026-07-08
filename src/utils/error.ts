export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'; }
