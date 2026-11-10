// Accepts the Project URL with or without a trailing /rest/v1/ or slash.
export function projectUrl(raw) {
  return raw ? raw.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '') : raw;
}
