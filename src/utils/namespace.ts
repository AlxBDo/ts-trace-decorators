function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  const wildcard = escaped.replaceAll("*", ".*");
  return new RegExp(`^${wildcard}$`);
}

function isMatch(namespace: string, pattern: string): boolean {
  return patternToRegex(pattern).test(namespace);
}

export function resolveNamespace(
  className: string,
  methodName: string,
  explicitNamespace?: string,
): string {
  return explicitNamespace ?? `${className}:${methodName}`;
}

export function shouldLogNamespace(
  namespace: string,
  namespaceMask?: string,
): boolean {
  if (!namespaceMask?.trim()) {
    return true;
  }

  const tokens = namespaceMask
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return true;
  }

  const excludes = tokens
    .filter((token) => token.startsWith("-"))
    .map((token) => token.slice(1));

  if (excludes.some((pattern) => isMatch(namespace, pattern))) {
    return false;
  }

  const includes = tokens.filter((token) => !token.startsWith("-"));
  if (includes.length === 0) {
    return true;
  }

  return includes.some((pattern) => isMatch(namespace, pattern));
}
