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

export const COUNTRY_CITIES = {
  "+91": {
    popular: [
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
    ],
    all: indiaCitiesJson,
  },
  "+1": {
    popular: [
      "New York",
      "Los Angeles",
      "Chicago",
      "Houston",
      "Phoenix",
      "Philadelphia",
      "San Antonio",
      "San Diego",
      "Dallas",
      "San Jose",
    ],
    all: [
      "New York",
      "Los Angeles",
      "Chicago",
      "Houston",
      "Phoenix",
      "Philadelphia",
      "San Antonio",
      "San Diego",
      "Dallas",
      "San Jose",
    ],
  },
  "+44": {
    popular: [
      "London",
      "Birmingham",
      "Manchester",
      "Glasgow",
      "Liverpool",
      "Leeds",
      "Sheffield",
      "Edinburgh",
      "Bristol",
      "Leicester",
    ],
    all: [
      "London",
      "Birmingham",
      "Manchester",
      "Glasgow",
      "Liverpool",
      "Leeds",
      "Sheffield",
      "Edinburgh",
      "Bristol",
      "Leicester",
    ],
  },
  "+971": {
    popular: [
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
      "Al Ain",
      "Ajman",
      "Ras Al Khaimah",
      "Fujairah",
      "Umm Al Quwain",
      "Khor Fakkan",
      "Kalba",
    ],
    all: [
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
      "Al Ain",
      "Ajman",
      "Ras Al Khaimah",
      "Fujairah",
      "Umm Al Quwain",
      "Khor Fakkan",
      "Kalba",
    ],
  },
  "+61": {
    popular: [
      "Sydney",
      "Melbourne",
      "Brisbane",
      "Perth",
      "Adelaide",
      "Gold Coast",
      "Canberra",
      "Newcastle",
      "Wollongong",
      "Logan City",
    ],
    all: [
      "Sydney",
      "Melbourne",
      "Brisbane",
      "Perth",
      "Adelaide",
      "Gold Coast",
      "Canberra",
      "Newcastle",
      "Wollongong",
      "Logan City",
    ],
  },
  "+49": {
    popular: [
      "Berlin",
      "Hamburg",
      "Munich",
      "Cologne",
      "Frankfurt",
      "Stuttgart",
      "Düsseldorf",
      "Dortmund",
      "Essen",
      "Leipzig",
    ],
    all: [
      "Berlin",
      "Hamburg",
      "Munich",
      "Cologne",
      "Frankfurt",
      "Stuttgart",
      "Düsseldorf",
      "Dortmund",
      "Essen",
      "Leipzig",
    ],
  },
  "+33": {
    popular: [
      "Paris",
      "Marseille",
      "Lyon",
      "Toulouse",
      "Nice",
      "Nantes",
      "Strasbourg",
      "Montpellier",
      "Bordeaux",
      "Lille",
    ],
    all: [
      "Paris",
      "Marseille",
      "Lyon",
      "Toulouse",
      "Nice",
      "Nantes",
      "Strasbourg",
      "Montpellier",
      "Bordeaux",
      "Lille",
    ],
  },
  "+65": {
    popular: [
      "Singapore",
      "Bedok",
      "Jurong West",
      "Tampines",
      "Woodlands",
      "Hougang",
      "Yishun",
      "Choa Chu Kang",
      "Bukit Merah",
      "Pasir Ris",
    ],
    all: [
      "Bedok",
      "Jurong West",
      "Tampines",
      "Woodlands",
      "Hougang",
      "Yishun",
      "Choa Chu Kang",
      "Bukit Merah",
      "Pasir Ris",
      "Ang Mo Kio",
    ],
  },
}

// Curated metros + tier-2 hubs surfaced first when no query is typed.
export const POPULAR_CITIES = COUNTRY_CITIES["+91"].popular
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
