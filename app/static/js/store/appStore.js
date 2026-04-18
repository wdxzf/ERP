(function attachAppStore(global) {
  const STORAGE_KEY = "erp.basicDataCache.v1";
  const TTL_MS = 30000;
  const SOURCE_MAP = {
    materials: "/materials",
    suppliers: "/suppliers",
    materialCategories: "/material-categories",
    systemOptions: "/system-options",
    companyProfile: "/company-profile",
  };

  function now() {
    return Date.now();
  }

  function readStorage() {
    try {
      return JSON.parse(global.sessionStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function writeStorage(cache) {
    try {
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  const state = {
    memory: {},
    pending: {},
    persisted: readStorage(),
  };

  function isFresh(entry) {
    return Boolean(entry?.updatedAt) && now() - entry.updatedAt < TTL_MS;
  }

  function getCached(key) {
    if (isFresh(state.memory[key])) return state.memory[key].data;
    if (isFresh(state.persisted[key])) {
      state.memory[key] = state.persisted[key];
      return state.persisted[key].data;
    }
    return null;
  }

  function setCached(key, data) {
    const entry = { data, updatedAt: now() };
    state.memory[key] = entry;
    state.persisted[key] = entry;
    writeStorage(state.persisted);
    return data;
  }

  function invalidate(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => {
      delete state.memory[key];
      delete state.pending[key];
      delete state.persisted[key];
    });
    writeStorage(state.persisted);
  }

  async function ensureKey(key, force = false) {
    if (!SOURCE_MAP[key]) {
      throw new Error(`Unknown basic data key: ${key}`);
    }
    if (!force) {
      const cached = getCached(key);
      if (cached !== null) return cached;
    }
    if (!force && state.pending[key]) return state.pending[key];

    state.pending[key] = global.http.get(SOURCE_MAP[key]).then((data) => {
      delete state.pending[key];
      return setCached(key, data);
    }).catch((error) => {
      delete state.pending[key];
      throw error;
    });

    return state.pending[key];
  }

  async function initBasicData(keys = Object.keys(SOURCE_MAP), options = {}) {
    const list = Array.isArray(keys) ? keys : [keys];
    const entries = await Promise.all(
      list.map(async (key) => [key, await ensureKey(key, Boolean(options.force))])
    );
    return Object.fromEntries(entries);
  }

  global.appStore = {
    initBasicData,
    ensureKey,
    invalidate,
    getCached,
    getState() {
      return {
        memory: { ...state.memory },
        persisted: { ...state.persisted },
      };
    },
  };
})(window);
