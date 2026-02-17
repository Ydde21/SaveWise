import * as Linking from "expo-linking";

export function redirectSystemPath({
  path,
  initial: _initial,
}: { path: string; initial: boolean }) {
  if (!path) return "/";

  if (path.includes("://")) {
    const parsed = Linking.parse(path);
    const parsedPath = parsed.path ?? "";
    if (!parsedPath) return "/";
    return parsedPath.startsWith("/") ? parsedPath : `/${parsedPath}`;
  }

  return path.startsWith("/") ? path : `/${path}`;
}
