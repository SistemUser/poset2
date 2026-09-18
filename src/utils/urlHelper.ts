/**
 * Utility helper for dynamic subfolder path resolution & API endpoint formatting.
 * Works seamlessly regardless of whether deployed at domain root (https://poset.com/)
 * or in a subdirectory (https://poset.com/yeni2/).
 */

export function getSubfolderPrefix(): string {
  if (typeof window === "undefined") return "";
  const pathname = window.location.pathname;
  const parts = pathname.split("/").filter(Boolean);
  const knownRoutes = ["teklif", "yonetim", "admin", "katalog", "urunler", "kurumsal", "referanslar", "iletisim"];
  
  if (parts.length > 0 && !knownRoutes.includes(parts[0].toLowerCase())) {
    return `/${parts[0]}`;
  }
  return "";
}

export function getApiEndpoint(apiPath: string): string {
  const cleanPath = apiPath.replace(/^\/+/, "");
  const subfolder = getSubfolderPrefix();
  return `${subfolder}/${cleanPath}`;
}
