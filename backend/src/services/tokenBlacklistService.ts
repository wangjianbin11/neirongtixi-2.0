/**
 * Token黑名单服务
 * 用于存储已登出的token，防止被重复使用
 */

// 内存存储（生产环境应使用Redis）
const blacklist = new Map<string, number>();

/**
 * 将token加入黑名单
 * @param token - JWT token
 * @param expiresIn - 过期时间（秒）
 */
export function addToBlacklist(token: string, expiresIn: number): void {
  const expiryTime = Date.now() + expiresIn * 1000;
  blacklist.set(token, expiryTime);

  // 设置自动清理
  setTimeout(() => {
    blacklist.delete(token);
  }, expiresIn * 1000);
}

/**
 * 检查token是否在黑名单中
 * @param token - JWT token
 * @returns 是否在黑名单中
 */
export function isBlacklisted(token: string): boolean {
  const expiryTime = blacklist.get(token);
  if (!expiryTime) {
    return false;
  }

  // 如果已过期，从黑名单中移除
  if (Date.now() > expiryTime) {
    blacklist.delete(token);
    return false;
  }

  return true;
}

/**
 * 清理过期的黑名单条目
 */
export function cleanupExpired(): void {
  const now = Date.now();
  for (const [token, expiryTime] of blacklist.entries()) {
    if (now > expiryTime) {
      blacklist.delete(token);
    }
  }
}

/**
 * 定期清理过期条目（每5分钟）
 */
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpired, 5 * 60 * 1000);
}

/**
 * 获取黑名单大小（用于监控）
 */
export function getBlacklistSize(): number {
  return blacklist.size;
}
