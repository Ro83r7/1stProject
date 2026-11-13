// Day Lab: liest die geheime iCal-Adresse (Spalte daylab_cal.ical_url, nur serverseitig lesbar), expandiert Serientermine
// für die nächsten Tage und schreibt sie in public.daylab_cal. Aufruf: POST {code}.
import ICAL from "npm:ical.js@2.1.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const pad = (n: number) => String(n).padStart(2, "0");
const dKey = (t: any) => `${t.year}-${pad(t.month)}-${pad(t.day)}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { code } = await req.json().catch(() => ({}));
    if (!code || String(code).length < 24) return json({ error: "code" }, 400);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await sb.from("daylab_cal").select("code, ical_url").eq("code", code).maybeSingle();
    if (!row) return json({ error: "unknown" }, 403);

    const url = row.ical_url || Deno.env.get("ICAL_URL");
    if (!url) return json({ error: "ical_url fehlt" }, 500);
    const res = await fetch(url);
    if (!res.ok) return json({ error: `ical ${res.status}` }, 502);
    const comp = new ICAL.Component(ICAL.parse(await res.text()));
    for (const vtz of comp.getAllSubcomponents("vtimezone")) {
      const tz = new ICAL.Timezone(vtz);
      if (!ICAL.TimezoneService.has(tz.tzid)) ICAL.TimezoneService.register(tz);
    }

    const winA = new Date(); winA.setHours(0, 0, 0, 0); winA.setDate(winA.getDate() - 1);
    const winB = new Date(winA.getTime() + 22 * 864e5);
    const vevents = comp.getAllSubcomponents("vevent");
    const masters = new Map<string, any>();
    const events: any[] = [];
    for (const v of vevents) if (!v.hasProperty("recurrence-id")) masters.set(v.getFirstPropertyValue("uid"), new ICAL.Event(v));
    for (const v of vevents) if (v.hasProperty("recurrence-id")) { const m = masters.get(v.getFirstPropertyValue("uid")); if (m) m.relateException(new ICAL.Event(v)); }

    const push = (id: string, ev: any, st: any, en: any) => {
      if (ev.component.getFirstPropertyValue("status") === "CANCELLED") return;
      const title = ev.summary || "(ohne Titel)";
      const loc = ev.location || "";
      if (st.isDate) {
        const e = en && en.compare(st) > 0 ? en : st.clone();
        if (e.compare(st) === 0) e.day += 1;
        const o: any = { id, t: title, s: dKey(st), e: dKey(e), ad: true };
        if (loc) o.l = loc;
        events.push(o);
      } else {
        const s = st.toJSDate(), e = (en || st).toJSDate();
        if (e < winA || s > winB) return;
        const o: any = { id, t: title, s: s.toISOString(), e: e.toISOString(), ad: false };
        if (loc) o.l = loc;
        events.push(o);
      }
    };
    const inWin = (st: any, en: any) => {
      const s = st.toJSDate(), e = (en || st).toJSDate();
      return e >= winA && s <= winB;
    };

    for (const [uid, ev] of masters) {
      if (ev.isRecurring()) {
        const it = ev.iterator();
        let n = 0, next;
        while ((next = it.next()) && n++ < 800) {
          if (next.toJSDate() > winB) break;
          const d = ev.getOccurrenceDetails(next);
          if (inWin(d.startDate, d.endDate)) push(`${uid}_${next.toString()}`, d.item, d.startDate, d.endDate);
        }
      } else if (inWin(ev.startDate, ev.endDate)) push(uid, ev, ev.startDate, ev.endDate);
    }
    events.sort((a, b) => String(a.s).localeCompare(String(b.s)));
    const { error } = await sb.from("daylab_cal").update({ events, fetched_at: new Date().toISOString() }).eq("code", code);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, count: events.length });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
