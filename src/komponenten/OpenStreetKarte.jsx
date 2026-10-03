import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./karte.css";

export const gueltigerStandort = (punkt) =>
  Number.isFinite(punkt?.lat) && Number.isFinite(punkt?.lon) &&
  Math.abs(punkt.lat) <= 85.05112878 && Math.abs(punkt.lon) <= 180;

export default function OpenStreetKarte({ punkte, aktivNr, onAktiv, onUebernehmen, gesperrt }) {
  const container = useRef(null);
  const karte = useRef(null);
  const bibliothek = useRef(null);
  const marker = useRef(null);
  const entwurfMarker = useRef(null);
  const kacheln = useRef(null);
  const callbacks = useRef({});
  const [bereit, setBereit] = useState(false);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [entwurf, setEntwurf] = useState(null);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState("");
  const [kartenFehler, setKartenFehler] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [laedt, setLaedt] = useState(true);
  const startPunkte = useRef(punkte.filter(gueltigerStandort));
  const ausgerichtet = useRef(startPunkte.current.length > 0);
  const startNr = useRef(aktivNr);
  callbacks.current = { bearbeiten, onAktiv };

  useEffect(() => {
    const aktualisieren = () => setOnline(navigator.onLine);
    window.addEventListener("online", aktualisieren);
    window.addEventListener("offline", aktualisieren);
    return () => {
      window.removeEventListener("online", aktualisieren);
      window.removeEventListener("offline", aktualisieren);
    };
  }, []);

  useEffect(() => {
    let beendet = false;
    let resize;
    let timer;
    import("leaflet").then(({ default: leaflet }) => {
      if (beendet) return;
      bibliothek.current = leaflet;
      const map = leaflet.map(container.current, {
        scrollWheelZoom: false, maxZoom: 19,
        maxBounds: [[-85, -180], [85, 180]], maxBoundsViscosity: 1,
      });
      karte.current = map;
      marker.current = leaflet.layerGroup().addTo(map);
      const layer = leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        noWrap: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      });
      kacheln.current = layer;
      layer.on("loading", () => setLaedt(true));
      layer.on("load", () => setLaedt(false));
      layer.on("tileerror", () => {
        setLaedt(false);
        setKartenFehler("Kartenhintergrund nicht verfügbar. Verbindung prüfen oder die Lageskizze unten nutzen.");
      });
      layer.addTo(map);
      leaflet.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
      const standorte = startPunkte.current;
      if (standorte.length > 1) {
        map.fitBounds(standorte.map((punkt) => [punkt.lat, punkt.lon]), { padding: [35, 35], maxZoom: 17 });
      } else {
        const punkt = standorte[0];
        map.setView(punkt ? [punkt.lat, punkt.lon] : [52.1, 13.4], punkt ? 17 : 6);
      }
      map.on("click", ({ latlng }) => {
        if (callbacks.current.bearbeiten) {
          setEntwurf({ lat: latlng.lat, lon: latlng.lng });
          setFehler("");
        }
      });
      resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
      resize.observe(container.current);
      timer = window.setTimeout(() => {
        setLaedt(false);
      }, 12000);
      setBereit(true);
    }).catch(() => {
      if (!beendet) {
        setLaedt(false);
        setKartenFehler("Die Karte konnte nicht geladen werden. Bitte die App erneut öffnen.");
      }
    });
    return () => {
      beendet = true;
      clearTimeout(timer);
      resize?.disconnect();
      karte.current?.remove();
      karte.current = null;
    };
  }, []);

  useEffect(() => {
    if (!bereit) return;
    const leaflet = bibliothek.current;
    const standorte = punkte.filter(gueltigerStandort);
    if (!ausgerichtet.current && standorte.length && !callbacks.current.bearbeiten) {
      karte.current.fitBounds(standorte.map((punkt) => [punkt.lat, punkt.lon]), { padding: [35, 35], maxZoom: 17 });
      ausgerichtet.current = true;
    }
    marker.current.clearLayers();
    standorte.forEach((punkt) => {
      const aktiv = punkt.nr === aktivNr;
      const label = String(Number(punkt.nr));
      if (Number.isFinite(punkt.acc) && punkt.acc > 0) {
        leaflet.circle([punkt.lat, punkt.lon], {
          radius: punkt.acc, color: "#6c8437", weight: 1, fillOpacity: 0.12,
          interactive: false,
        }).addTo(marker.current);
      }
      const pin = leaflet.marker([punkt.lat, punkt.lon], {
        title: `Probekreis ${label}`, alt: `Probekreis ${label}`,
        icon: leaflet.divIcon({
          className: `karten-punkt${aktiv ? " karten-punkt-aktiv" : ""}`,
          html: `<span>${label}</span>`, iconSize: [32, 32], iconAnchor: [16, 16],
        }),
      }).addTo(marker.current);
      pin.on("click", () => {
        if (!callbacks.current.bearbeiten) callbacks.current.onAktiv?.(punkt.nr);
      });
    });
  }, [bereit, punkte, aktivNr]);

  useEffect(() => {
    setBearbeiten(false);
    setEntwurf(null);
    setFehler("");
    if (bereit && aktivNr !== startNr.current) {
      const punkt = punkte.find((eintrag) => eintrag.nr === aktivNr && gueltigerStandort(eintrag));
      if (punkt) karte.current.panTo([punkt.lat, punkt.lon]);
    }
    startNr.current = aktivNr;
  }, [aktivNr, bereit]);

  useEffect(() => {
    entwurfMarker.current?.remove();
    entwurfMarker.current = null;
    if (!bereit || !entwurf) return;
    const leaflet = bibliothek.current;
    const pin = leaflet.marker([entwurf.lat, entwurf.lon], {
      draggable: !speichert,
      title: "Vorgeschlagener Standort – zum Verschieben ziehen",
      icon: leaflet.divIcon({
        className: "karten-entwurf", html: "<span>+</span>",
        iconSize: [34, 34], iconAnchor: [17, 17],
      }),
    }).addTo(karte.current);
    pin.on("dragend", () => {
      const latlng = pin.getLatLng();
      setEntwurf({ lat: latlng.lat, lon: latlng.lng });
    });
    entwurfMarker.current = pin;
  }, [bereit, entwurf, speichert]);

  const uebernehmen = async () => {
    if (!gueltigerStandort(entwurf)) {
      setFehler("Bitte einen gültigen Punkt auf der Karte wählen.");
      return;
    }
    setSpeichert(true);
    setFehler("");
    try {
      await onUebernehmen(aktivNr, entwurf);
      setEntwurf(null);
      setBearbeiten(false);
    } catch (error) {
      setFehler(error.message || "Standort konnte nicht gespeichert werden.");
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <section className="standort-karte" aria-label="OpenStreetMap-Karte der Probekreise">
      <div className="karten-kopf">
        <div><div className="karten-eyebrow">OPENSTREETMAP</div><strong>Probekreise im Gelände</strong></div>
        <span className="karten-status">{online ? "Online-Karte" : "Ohne Empfang"}</span>
      </div>
      <div className="karten-rahmen">
        <div ref={container} className="karten-flaeche" aria-label="Karte, mit Pfeiltasten verschieben und Plus oder Minus zoomen" />
        {laedt && online && <div className="karten-laden" role="status">Kartenhintergrund lädt …</div>}
      </div>
      {(!online || kartenFehler) && <div className="karten-hinweis" role="status">
        {!online ? "Ohne Internet fehlt der Kartenhintergrund. Die Lageskizze unten bleibt verfügbar." : kartenFehler}
        {online && bereit && <button type="button" onClick={() => {
          setKartenFehler("");
          kacheln.current.redraw();
        }}>Erneut laden</button>}
      </div>}
      <div className="karten-werkzeuge">
        <button type="button" disabled={!bereit || bearbeiten} onClick={() => {
          const standorte = punkte.filter(gueltigerStandort);
          if (standorte.length) karte.current.fitBounds(standorte.map((punkt) => [punkt.lat, punkt.lon]), { padding: [35, 35], maxZoom: 17 });
        }}>Alle Punkte</button>
        {onUebernehmen && !bearbeiten && <button type="button" className="karten-primaer" disabled={!bereit || gesperrt || !online || aktivNr == null} onClick={() => {
          setBearbeiten(true);
          setFehler("");
        }}>Standort für Kreis {aktivNr} wählen</button>}
      </div>
      {bearbeiten && <div className="karten-auswahl">
        <strong>Neuer Standort für Probekreis {aktivNr}</strong>
        <p>Auf die Karte tippen oder sie mit den Pfeiltasten verschieben und die Kartenmitte wählen. Erst „Standort übernehmen“ ersetzt die bisherige Position.</p>
        <button type="button" disabled={speichert} onClick={() => {
          const mitte = karte.current.getCenter();
          setEntwurf({ lat: mitte.lat, lon: mitte.lng });
        }}>Kartenmitte wählen</button>
        {entwurf && <div className="karten-koordinate">{entwurf.lat.toFixed(6)}, {entwurf.lon.toFixed(6)} · manuell, keine GPS-Genauigkeit</div>}
        <div className="karten-werkzeuge">
          <button type="button" className="karten-primaer" disabled={!entwurf || speichert || !online} onClick={uebernehmen}>{speichert ? "Speichert …" : "Standort übernehmen"}</button>
          <button type="button" disabled={speichert} onClick={() => { setBearbeiten(false); setEntwurf(null); setFehler(""); }}>Abbrechen</button>
        </div>
      </div>}
      {gesperrt && <p className="karten-hinweis">Zum Speichern eines Kartenpunkts zuerst oben eine Person wählen.</p>}
      {fehler && <p className="karten-fehler" role="alert">{fehler}</p>}
      <p className="karten-fuss">Kartenhintergrund benötigt Internet. Keine Offline-Kartenpakete. Ein manuell gewählter Punkt ersetzt keine GPS-Messung.</p>
    </section>
  );
}
