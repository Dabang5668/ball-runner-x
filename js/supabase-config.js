"use strict";

/* ============================================================
   SUPABASE CONNECTION
   ------------------------------------------------------------
   Fill these two values from your Supabase dashboard:

     Project Settings -> API
       url     = "Project URL"        e.g. https://abcdefgh.supabase.co
       anonKey = "anon / public key"  (the long JWT starting with "ey...")

   The anon key is SAFE to ship in front-end code - it only ever
   gets the permissions your Row Level Security policies allow.
   Never put the "service_role" key here.

   While these stay as placeholders the game keeps working exactly
   as before, saving progress to localStorage only.
   ============================================================ */

window.SUPABASE_CONFIG = {
    url: "https://lfzlmpobmfoxoeczqkjg.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmemxtcG9ibWZveG9lY3pxa2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3ODA0ODYsImV4cCI6MjEwMzM1NjQ4Nn0.nOiRYo1i9Nl88Hhvfx7h7l7w6Pu5nosKRLHylfTA6g8"
};
