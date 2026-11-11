"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { createClientUuid } from "@/lib/client-id";

const visitKey = "devfolio_visit_session_v1";
const locationChoiceKey = "devfolio_location_choice_v1";

function getVisitToken(): string | null {
  try {
    let token = sessionStorage.getItem(visitKey);
    if (!token) {
      token = createClientUuid();
      sessionStorage.setItem(visitKey, token);
    }
    return token;
  } catch {
    return null;
  }
}

export function VisitTracker() {
  const [showLocationChoice, setShowLocationChoice] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    let locationPromptTimer: number | undefined;
    const token = getVisitToken();
    if (!token) return;
    const sentKey = `${visitKey}:sent`;
    try {
      if (!sessionStorage.getItem(sentKey)) {
        sessionStorage.setItem(sentKey, "1");
        void fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorToken: token, path: window.location.pathname }),
          keepalive: true,
        }).catch(() => sessionStorage.removeItem(sentKey));
      }
      const choice = localStorage.getItem(locationChoiceKey);
      if (!choice && navigator.geolocation && window.isSecureContext) {
        locationPromptTimer = window.setTimeout(() => setShowLocationChoice(true), 0);
      }
    } catch {
      // Visit counting and location sharing are optional and never block the CV.
    }
    return () => { if (locationPromptTimer !== undefined) window.clearTimeout(locationPromptTimer); };
  }, []);

  function declineLocation() {
    try { localStorage.setItem(locationChoiceKey, "declined"); } catch { /* optional preference */ }
    setShowLocationChoice(false);
  }

  function shareLocation() {
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocationMessage("La ubicación solo está disponible en HTTPS o localhost.");
      return;
    }
    const token = getVisitToken();
    if (!token) {
      setLocationMessage("El navegador no permitió crear una sesión de visita.");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      // Round to two decimals (~1 km) before coordinates leave the visitor's device.
      const latitude = Math.round(position.coords.latitude * 100) / 100;
      const longitude = Math.round(position.coords.longitude * 100) / 100;
      try {
        const response = await fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorToken: token, path: window.location.pathname, locationConsent: true, latitude, longitude }),
        });
        if (!response.ok) throw new Error("No se pudo guardar la ubicación aproximada.");
        try { localStorage.setItem(locationChoiceKey, "accepted"); } catch { /* optional preference */ }
        setLocationMessage("Gracias. Se compartió únicamente una ubicación aproximada.");
        window.setTimeout(() => setShowLocationChoice(false), 2200);
      } catch {
        setLocationMessage("No se pudo registrar la ubicación. Puedes continuar sin compartirla.");
      } finally { setLocationBusy(false); }
    }, (error) => {
      setLocationBusy(false);
      setLocationMessage(error.code === error.PERMISSION_DENIED ? "No se concedió permiso. No se registró ubicación." : "No se pudo obtener la ubicación.");
    }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 10 * 60 * 1000 });
  }

  if (!showLocationChoice) return null;
  return <aside className="visit-location-consent" aria-label="Compartir ubicación opcional">
    <button type="button" onClick={declineLocation} className="visit-location-close" aria-label="Cerrar aviso"><X size={14} /></button>
    <strong><MapPin size={15} /> Ubicación aproximada (opcional)</strong>
    <p>Si lo autorizas, el administrador verá una zona aproximada de tu visita (alrededor de 1 km). No se obtiene tu dirección exacta ni tu dirección MAC.</p>
    {locationMessage && <small role="status">{locationMessage}</small>}
    <div>
      <button type="button" className="visit-location-allow" onClick={shareLocation} disabled={locationBusy}>{locationBusy ? "Consultando…" : "Compartir ubicación"}</button>
      <button type="button" className="visit-location-decline" onClick={declineLocation}>Ahora no</button>
    </div>
  </aside>;
}
