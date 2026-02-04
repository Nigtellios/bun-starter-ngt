const parseIpv4 = (ip: string): number | null => {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) {
    return null;
  }

  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null;
    }
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) {
      return null;
    }
    value = (value << 8) + n;
  }

  // Ensure unsigned 32-bit.
  return value >>> 0;
};

const ipv4InCidr = (ip: string, cidr: string): boolean => {
  const [range, prefixStr] = cidr.split("/");
  if (!range || prefixStr === undefined) {
    return false;
  }

  const ipValue = parseIpv4(ip);
  const rangeValue = parseIpv4(range);
  const prefix = Number.parseInt(prefixStr, 10);

  if (ipValue === null || rangeValue === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipValue & mask) === (rangeValue & mask);
};

/**
 * Returns true if `ip` matches any entry in `allowlist`.
 *
 * Supported allowlist entries:
 * - exact IP match (IPv4 or IPv6 string equality)
 * - IPv4 CIDR ranges (e.g. 203.0.113.0/24)
 *
 * Notes:
 * - IPv6 CIDR is intentionally not supported to keep this lightweight.
 */
export const isIpAllowlisted = (ip: string, allowlist: string[]): boolean => {
  const normalizedIp = ip.trim();
  if (!normalizedIp) {
    return false;
  }

  for (const entry of allowlist) {
    const normalizedEntry = entry.trim();
    if (!normalizedEntry) {
      continue;
    }

    if (normalizedEntry.includes("/")) {
      // CIDR (IPv4 only).
      if (ipv4InCidr(normalizedIp, normalizedEntry)) {
        return true;
      }
      continue;
    }

    if (normalizedIp === normalizedEntry) {
      return true;
    }
  }

  return false;
};
