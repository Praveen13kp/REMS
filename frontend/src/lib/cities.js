// India cities dataset. The full list (~4,100 entries) is generated once
// from `country-state-city` and committed as a static JSON at
// src/lib/data/india-cities.json. Regenerate with:
//   node -e "const fs=require('fs');const csc=require('country-state-city');\
//     const names=[...new Set(csc.City.getCitiesOfCountry('IN').map(c=>c.name))].sort();\
//     fs.writeFileSync('src/lib/data/india-cities.json',JSON.stringify(names))"
//
// The combobox shows POPULAR_CITIES first when the field is empty (so the
// dropdown isn't a sea of obscure tier-3 towns), and searches the full
// ALL_CITIES list once the user starts typing. Custom city names not in
// either list are still accepted — see CityInput.jsx.

import indiaCitiesJson from "./data/india-cities.json"

// Curated metros + tier-2 hubs surfaced first when no query is typed.
// Order matters — Mumbai/Delhi/Bengaluru at the top.
export const POPULAR_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Gurugram",
  "Noida",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Surat",
  "Indore",
  "Kochi",
]

export const ALL_CITIES = indiaCitiesJson

// Normalize free-typed input to Title Case ("pune" / "PUNE" / "pUne" → "Pune").
// Preserves internal whitespace and intentional hyphens (e.g. "Navi-Mumbai").
export function normalizeCityName(raw) {
  if (!raw) return ""
  return String(raw)
    .trim()
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part) => (part.match(/[a-z]/i) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("")
}
