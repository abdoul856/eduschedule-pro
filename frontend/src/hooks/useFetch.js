// src/hooks/useFetch.js
import { useState, useEffect, useCallback } from "react";

/**
 * Hook personnalisé pour les appels API
 * @param {string} url — endpoint à appeler
 * @param {object} options — options fetch (method, body, etc.)
 * @param {boolean} auto — lancer automatiquement au montage
 */
export function useFetch(url, options = {}, auto = true) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState(null);

  const token = localStorage.getItem("edu_token");

  const executer = useCallback(async (bodyOverride = null) => {
    setLoading(true);
    setErreur(null);

    try {
      const config = {
        method:  options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      };

      if (bodyOverride) {
        config.body = JSON.stringify(bodyOverride);
      } else if (options.body) {
        config.body = JSON.stringify(options.body);
      }

      const res  = await fetch(url, config);
      const json = await res.json();

      if (!res.ok) throw new Error(json.erreur || "Erreur serveur");

      setData(json);
      return json;
    } catch (err) {
      setErreur(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, token]);

  useEffect(() => {
    if (auto && url) executer();
  }, [url, auto]);

  return { data, loading, erreur, executer, setData };
}