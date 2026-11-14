import React, { useEffect, useRef } from "react";

// Web has no react-native-maps, so render a Leaflet map in an iframe and talk to it with postMessage
const WEB_MAP_HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;background:#1F2A22}
.pin{width:28px;height:28px;border-radius:14px;border:3px solid #FBF8F3;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:12px;color:#FBF8F3}</style>
</head><body><div id="map"></div><script>
var map = L.map("map", { zoomControl: false }).setView([18.1096, -77.2975], 9);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery © Esri" }).addTo(map);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);
var send = function (msg) { parent.postMessage(JSON.stringify(Object.assign({ source: "gridguard-map" }, msg)), "*"); };
var pin = function (bg, glyph) { return L.divIcon({ className: "", iconSize: [28, 28], html: '<div class="pin" style="background:' + bg + '">' + glyph + "</div>" }); };
map.on("contextmenu", function (e) { send({ type: "longpress", latitude: e.latlng.lat, longitude: e.latlng.lng }); });
map.on("locationfound", function (e) { L.circleMarker(e.latlng, { radius: 8, color: "#FBF8F3", weight: 3, fillColor: "#3E2A1B", fillOpacity: 1 }).addTo(map); });
map.locate({ setView: false });
var layer = L.layerGroup().addTo(map);
window.addEventListener("message", function (ev) {
  var msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
  if (msg.type === "data") {
    layer.clearLayers();
    msg.outages.forEach(function (o) {
      L.circle([o.latitude, o.longitude], { radius: o.radius, color: o.color, weight: o.selected ? 4 : 2, fillColor: o.color, fillOpacity: o.selected ? 0.4 : 0.28 })
        .addTo(layer).on("click", function () { send({ type: "outage", id: o.id }); });
    });
    msg.stations.forEach(function (s) {
      L.marker([s.latitude, s.longitude], { icon: pin(s.color, s.glyph) }).addTo(layer)
        .bindTooltip(s.name).on("click", function () { send({ type: "station", id: s.id }); });
    });
  } else if (msg.type === "focus") {
    map.setView([msg.latitude, msg.longitude], msg.zoom || 13);
  } else if (msg.type === "locate") {
    map.locate({ setView: true, maxZoom: 14 });
  }
});
send({ type: "ready" });
</script></body></html>`;

export default function WebMap({ outages, stations, focus, locateAt, onLongPress, onOutagePress, onStationPress }) {
  const frameRef = useRef(null);
  const latest = useRef({});
  latest.current = { outages, stations, focus, onLongPress, onOutagePress, onStationPress };

  const post = (msg) => frameRef.current?.contentWindow?.postMessage(JSON.stringify(msg), "*");
  const pushData = () => post({ type: "data", outages: latest.current.outages, stations: latest.current.stations });

  useEffect(() => {
    const onMessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg?.source !== "gridguard-map") return;
      const h = latest.current;
      if (msg.type === "ready") {
        pushData();
        if (h.focus) post({ type: "focus", ...h.focus });
      } else if (msg.type === "longpress") h.onLongPress({ latitude: msg.latitude, longitude: msg.longitude });
      else if (msg.type === "outage") h.onOutagePress(msg.id);
      else if (msg.type === "station") h.onStationPress(msg.id);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(pushData, [outages, stations]);
  useEffect(() => {
    if (focus) post({ type: "focus", ...focus });
  }, [focus]);
  useEffect(() => {
    if (locateAt) post({ type: "locate" });
  }, [locateAt]);

  return (
    <iframe
      ref={frameRef}
      title="Outage map"
      srcDoc={WEB_MAP_HTML}
      allow="geolocation"
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
    />
  );
}
