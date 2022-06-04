import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hxihcvtdyzbbylcjorra.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aWhjdnRkeXpiYnlsY2pvcnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTM5MjEwNDMsImV4cCI6MTk2OTQ5NzA0M30.XixoEOPUHIwUV8rxA8EPMwINs7lGMWwvK9qCL2o-5iI"
);

export async function get({ params, request }) {
  console.log("backend get", JSON.stringify(params), JSON.stringify(request));
  debugger;
  return new Response(JSON.stringify({ ok: true }), {
    status: 302,
    headers: {
      // "Content-Type": "application/json",
      Location: "/auth",
      // "Set-Cookie": `sid=${session.id}`,
    },
  });
}
