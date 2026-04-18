(function attachHttp(global) {
  const API_PREFIX = "/api";

  function isAbsoluteUrl(value) {
    return /^https?:\/\//i.test(String(value || ""));
  }

  function normalizePath(path) {
    if (!path || isAbsoluteUrl(path)) return path;
    if (!String(path).startsWith("/")) return `${API_PREFIX}/${String(path).replace(/^\/+/, "")}`;
    if (String(path).startsWith(API_PREFIX)) return path;
    return `${API_PREFIX}${path}`;
  }

  async function fetchWithPrefix(path, options) {
    return global.fetch(normalizePath(path), options);
  }

  async function request(path, options = {}) {
    const response = await fetchWithPrefix(path, options);
    if (!response.ok) {
      let detail = response.statusText || "Request failed";
      try {
        const payload = await response.clone().json();
        detail = payload?.detail || detail;
      } catch (_) {}
      const error = new Error(detail);
      error.status = response.status;
      error.response = response;
      throw error;
    }
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response;
  }

  global.http = {
    normalizePath,
    fetch: fetchWithPrefix,
    request,
    get: (path, options = {}) => request(path, { ...options, method: "GET" }),
    post: (path, body, options = {}) =>
      request(path, {
        ...options,
        method: "POST",
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        body: JSON.stringify(body),
      }),
    put: (path, body, options = {}) =>
      request(path, {
        ...options,
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        body: JSON.stringify(body),
      }),
    delete: (path, options = {}) => request(path, { ...options, method: "DELETE" }),
  };
})(window);
