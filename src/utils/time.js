// Accepts an ISO string, a Date, or a Firestore Timestamp and returns an ISO string (or null)
export function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatTimeAgo(value) {
  const iso = toIso(value);
  if (!iso) return null;
  const t = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} hr ago`;
  return new Date(t).toLocaleDateString();
}

// Older reports stored a plain "3:45 PM" string; newer ones store an ISO date
export function formatClock(value) {
  const iso = toIso(value);
  if (!iso) return value || "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(value) {
  const iso = toIso(value);
  return iso ? new Date(iso).toLocaleDateString() : value || "";
}
