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
  // ---- Extended coverage (10 popular cities per country) -----------------
  // Mirrors the country list shipped by PhoneInput so picking ANY country in
  // the phone picker filters the City field to that country's metros.
  // Smaller countries get fewer real metros — users can still type freely
  // because CityInput accepts arbitrary input.
  "+93":  { popular: ["Kabul","Kandahar","Herat","Mazar-i-Sharif","Jalalabad","Kunduz","Ghazni","Balkh","Lashkar Gah","Taloqan"], all: [] },
  "+355": { popular: ["Tirana","Durrës","Vlorë","Shkodër","Elbasan","Fier","Korçë","Berat","Lushnjë","Pogradec"], all: [] },
  "+213": { popular: ["Algiers","Oran","Constantine","Annaba","Blida","Batna","Setif","Sidi Bel Abbès","Biskra","Tlemcen"], all: [] },
  "+376": { popular: ["Andorra la Vella","Escaldes-Engordany","Encamp","Sant Julià de Lòria","La Massana","Ordino","Canillo","Pas de la Casa","Arinsal","Les Escaldes"], all: [] },
  "+244": { popular: ["Luanda","Huambo","Lobito","Benguela","Kuito","Lubango","Malanje","Namibe","Soyo","Cabinda"], all: [] },
  "+54":  { popular: ["Buenos Aires","Córdoba","Rosario","Mendoza","La Plata","Mar del Plata","San Miguel de Tucumán","Salta","Santa Fe","San Juan"], all: [] },
  "+374": { popular: ["Yerevan","Gyumri","Vanadzor","Vagharshapat","Hrazdan","Abovyan","Kapan","Armavir","Gavar","Goris"], all: [] },
  "+43":  { popular: ["Vienna","Graz","Linz","Salzburg","Innsbruck","Klagenfurt","Villach","Wels","Sankt Pölten","Dornbirn"], all: [] },
  "+994": { popular: ["Baku","Ganja","Sumqayit","Mingachevir","Lankaran","Shirvan","Nakhchivan","Shaki","Yevlakh","Quba"], all: [] },
  "+973": { popular: ["Manama","Riffa","Muharraq","Hamad Town","A'ali","Isa Town","Sitra","Budaiya","Jidhafs","Al-Malikiyah"], all: [] },
  "+880": { popular: ["Dhaka","Chittagong","Khulna","Rajshahi","Sylhet","Barisal","Rangpur","Comilla","Narayanganj","Mymensingh"], all: [] },
  "+375": { popular: ["Minsk","Gomel","Mogilev","Vitebsk","Hrodna","Brest","Babruysk","Baranavichy","Barysaw","Pinsk"], all: [] },
  "+32":  { popular: ["Brussels","Antwerp","Ghent","Charleroi","Liège","Bruges","Namur","Leuven","Mons","Mechelen"], all: [] },
  "+501": { popular: ["Belize City","Belmopan","San Ignacio","Orange Walk","Dangriga","Corozal","San Pedro","Punta Gorda","Benque Viejo","Hopkins"], all: [] },
  "+229": { popular: ["Cotonou","Porto-Novo","Parakou","Djougou","Bohicon","Kandi","Lokossa","Ouidah","Abomey","Natitingou"], all: [] },
  "+975": { popular: ["Thimphu","Phuntsholing","Punakha","Samdrup Jongkhar","Wangdue","Jakar","Trongsa","Mongar","Trashigang","Paro"], all: [] },
  "+591": { popular: ["La Paz","Santa Cruz","Cochabamba","Sucre","Oruro","Tarija","Potosí","Sacaba","Quillacollo","Montero"], all: [] },
  "+55":  { popular: ["São Paulo","Rio de Janeiro","Brasília","Salvador","Fortaleza","Belo Horizonte","Manaus","Curitiba","Recife","Porto Alegre"], all: [] },
  "+673": { popular: ["Bandar Seri Begawan","Kuala Belait","Seria","Tutong","Bangar","Muara","Sukang","Telisai","Lumut","Jerudong"], all: [] },
  "+359": { popular: ["Sofia","Plovdiv","Varna","Burgas","Ruse","Stara Zagora","Pleven","Sliven","Dobrich","Shumen"], all: [] },
  "+855": { popular: ["Phnom Penh","Siem Reap","Battambang","Sihanoukville","Poipet","Kampong Cham","Ta Khmau","Pursat","Kampot","Bavet"], all: [] },
  "+237": { popular: ["Douala","Yaoundé","Bamenda","Garoua","Maroua","Bafoussam","Ngaoundéré","Bertoua","Loum","Kumba"], all: [] },
  "+56":  { popular: ["Santiago","Valparaíso","Concepción","La Serena","Antofagasta","Temuco","Rancagua","Talca","Iquique","Puerto Montt"], all: [] },
  "+86":  { popular: ["Shanghai","Beijing","Guangzhou","Shenzhen","Chengdu","Hangzhou","Wuhan","Xi'an","Chongqing","Nanjing"], all: [] },
  "+57":  { popular: ["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Cúcuta","Bucaramanga","Pereira","Santa Marta","Ibagué"], all: [] },
  "+506": { popular: ["San José","Alajuela","Cartago","Heredia","Liberia","Puntarenas","Limón","Pérez Zeledón","Curridabat","San Vicente"], all: [] },
  "+385": { popular: ["Zagreb","Split","Rijeka","Osijek","Zadar","Slavonski Brod","Pula","Karlovac","Sisak","Varaždin"], all: [] },
  "+357": { popular: ["Nicosia","Limassol","Larnaca","Paphos","Famagusta","Kyrenia","Strovolos","Aradippou","Paralimni","Polis"], all: [] },
  "+420": { popular: ["Prague","Brno","Ostrava","Plzeň","Liberec","Olomouc","Ústí nad Labem","Hradec Králové","České Budějovice","Pardubice"], all: [] },
  "+45":  { popular: ["Copenhagen","Aarhus","Odense","Aalborg","Esbjerg","Randers","Kolding","Horsens","Vejle","Roskilde"], all: [] },
  "+593": { popular: ["Quito","Guayaquil","Cuenca","Santo Domingo","Machala","Durán","Manta","Portoviejo","Loja","Ambato"], all: [] },
  "+20":  { popular: ["Cairo","Alexandria","Giza","Shubra El Kheima","Port Said","Suez","Luxor","Mansoura","El-Mahalla El-Kubra","Tanta"], all: [] },
  "+372": { popular: ["Tallinn","Tartu","Narva","Pärnu","Kohtla-Järve","Viljandi","Rakvere","Maardu","Sillamäe","Kuressaare"], all: [] },
  "+251": { popular: ["Addis Ababa","Dire Dawa","Mekelle","Adama","Gondar","Hawassa","Bahir Dar","Dessie","Jimma","Jijiga"], all: [] },
  "+679": { popular: ["Suva","Nadi","Lautoka","Labasa","Ba","Levuka","Sigatoka","Nausori","Tavua","Savusavu"], all: [] },
  "+358": { popular: ["Helsinki","Espoo","Tampere","Vantaa","Oulu","Turku","Jyväskylä","Lahti","Kuopio","Pori"], all: [] },
  "+995": { popular: ["Tbilisi","Kutaisi","Batumi","Rustavi","Zugdidi","Gori","Poti","Samtredia","Khashuri","Senaki"], all: [] },
  "+233": { popular: ["Accra","Kumasi","Tamale","Sekondi-Takoradi","Sunyani","Cape Coast","Obuasi","Teshie","Tema","Madina"], all: [] },
  "+30":  { popular: ["Athens","Thessaloniki","Patras","Piraeus","Larissa","Heraklion","Volos","Rhodes","Ioannina","Chania"], all: [] },
  "+852": { popular: ["Hong Kong","Kowloon","Tsuen Wan","Tuen Mun","Yuen Long","Sha Tin","Tai Po","Tseung Kwan O","Sai Kung","Aberdeen"], all: [] },
  "+36":  { popular: ["Budapest","Debrecen","Szeged","Miskolc","Pécs","Győr","Nyíregyháza","Kecskemét","Székesfehérvár","Szombathely"], all: [] },
  "+354": { popular: ["Reykjavík","Kópavogur","Hafnarfjörður","Akureyri","Reykjanesbær","Garðabær","Mosfellsbær","Akranes","Selfoss","Vestmannaeyjar"], all: [] },
  "+62":  { popular: ["Jakarta","Surabaya","Bandung","Medan","Semarang","Palembang","Makassar","Tangerang","Depok","Bekasi"], all: [] },
  "+98":  { popular: ["Tehran","Mashhad","Isfahan","Karaj","Shiraz","Tabriz","Qom","Ahvaz","Kermanshah","Urmia"], all: [] },
  "+964": { popular: ["Baghdad","Basra","Mosul","Erbil","Sulaymaniyah","Najaf","Karbala","Kirkuk","Nasiriyah","Hillah"], all: [] },
  "+353": { popular: ["Dublin","Cork","Limerick","Galway","Waterford","Drogheda","Swords","Dundalk","Bray","Navan"], all: [] },
  "+972": { popular: ["Jerusalem","Tel Aviv","Haifa","Rishon LeZion","Petah Tikva","Ashdod","Netanya","Beersheba","Holon","Bnei Brak"], all: [] },
  "+39":  { popular: ["Rome","Milan","Naples","Turin","Palermo","Genoa","Bologna","Florence","Bari","Catania"], all: [] },
  "+81":  { popular: ["Tokyo","Yokohama","Osaka","Nagoya","Sapporo","Fukuoka","Kobe","Kyoto","Kawasaki","Saitama"], all: [] },
  "+962": { popular: ["Amman","Zarqa","Irbid","Russeifa","Wadi as-Sir","Aqaba","As-Salt","Madaba","Jerash","Mafraq"], all: [] },
  "+7":   { popular: ["Moscow","Saint Petersburg","Novosibirsk","Yekaterinburg","Kazan","Nizhny Novgorod","Chelyabinsk","Samara","Omsk","Rostov-on-Don"], all: [] },
  "+254": { popular: ["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Ruiru","Kikuyu","Kangundo","Malindi","Naivasha"], all: [] },
  "+965": { popular: ["Kuwait City","Al Ahmadi","Hawalli","As Salimiyah","Sabah as Salim","Al Farwaniyah","Al Fahahil","Ar Riqqah","Janub as Surrah","Bayan"], all: [] },
  "+371": { popular: ["Riga","Daugavpils","Liepāja","Jelgava","Jūrmala","Ventspils","Rēzekne","Valmiera","Jēkabpils","Ogre"], all: [] },
  "+961": { popular: ["Beirut","Tripoli","Sidon","Tyre","Jounieh","Zahlé","Byblos","Baalbek","Aley","Nabatieh"], all: [] },
  "+218": { popular: ["Tripoli","Benghazi","Misrata","Tarhuna","Al Khums","Az Zawiyah","Zawiya","Ajdabiya","Sabha","Tobruk"], all: [] },
  "+370": { popular: ["Vilnius","Kaunas","Klaipėda","Šiauliai","Panevėžys","Alytus","Marijampolė","Mažeikiai","Jonava","Utena"], all: [] },
  "+352": { popular: ["Luxembourg","Esch-sur-Alzette","Differdange","Dudelange","Ettelbruck","Diekirch","Wiltz","Echternach","Rumelange","Grevenmacher"], all: [] },
  "+853": { popular: ["Macao","Taipa","Coloane","Cotai","Sé","São Lourenço","Santo António","Nossa Senhora de Fátima","São Lázaro","Our Lady of Carmel"], all: [] },
  "+60":  { popular: ["Kuala Lumpur","George Town","Ipoh","Shah Alam","Petaling Jaya","Johor Bahru","Malacca","Kota Kinabalu","Kuching","Seremban"], all: [] },
  "+960": { popular: ["Malé","Addu","Fuvahmulah","Kulhudhuffushi","Thinadhoo","Naifaru","Hithadhoo","Eydhafushi","Dhidhdhoo","Mahibadhoo"], all: [] },
  "+356": { popular: ["Valletta","Birkirkara","Sliema","St. Paul's Bay","Mosta","Qormi","Żabbar","Naxxar","San Ġwann","Fgura"], all: [] },
  "+230": { popular: ["Port Louis","Beau Bassin-Rose Hill","Vacoas-Phoenix","Curepipe","Quatre Bornes","Triolet","Goodlands","Centre de Flacq","Mahebourg","Bel Air Rivière Sèche"], all: [] },
  "+52":  { popular: ["Mexico City","Guadalajara","Monterrey","Puebla","Tijuana","León","Juárez","Zapopan","Mérida","Cancún"], all: [] },
  "+377": { popular: ["Monaco","Monte Carlo","La Condamine","Fontvieille","Moneghetti","Larvotto","Saint-Roman","La Rousse","Les Révoires","Jardin Exotique"], all: [] },
  "+976": { popular: ["Ulaanbaatar","Erdenet","Darkhan","Choibalsan","Mörön","Nalaikh","Ölgii","Khovd","Bayankhongor","Arvaikheer"], all: [] },
  "+212": { popular: ["Casablanca","Rabat","Fes","Marrakech","Tangier","Agadir","Meknes","Oujda","Kenitra","Tetouan"], all: [] },
  "+95":  { popular: ["Yangon","Mandalay","Naypyidaw","Mawlamyine","Bago","Pathein","Monywa","Sittwe","Meiktila","Myitkyina"], all: [] },
  "+977": { popular: ["Kathmandu","Pokhara","Lalitpur","Bharatpur","Birgunj","Biratnagar","Janakpur","Hetauda","Dharan","Butwal"], all: [] },
  "+31":  { popular: ["Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven","Tilburg","Groningen","Almere","Breda","Nijmegen"], all: [] },
  "+64":  { popular: ["Auckland","Wellington","Christchurch","Hamilton","Tauranga","Napier","Dunedin","Palmerston North","Nelson","Rotorua"], all: [] },
  "+234": { popular: ["Lagos","Kano","Ibadan","Abuja","Port Harcourt","Benin City","Kaduna","Maiduguri","Jos","Ilorin"], all: [] },
  "+47":  { popular: ["Oslo","Bergen","Stavanger","Trondheim","Drammen","Fredrikstad","Kristiansand","Sandnes","Tromsø","Sarpsborg"], all: [] },
  "+968": { popular: ["Muscat","Seeb","Salalah","Bawshar","Sohar","Suwayq","Ibri","Saham","Barka","Rustaq"], all: [] },
  "+92":  { popular: ["Karachi","Lahore","Faisalabad","Rawalpindi","Multan","Hyderabad","Gujranwala","Peshawar","Quetta","Islamabad"], all: [] },
  "+970": { popular: ["Gaza","Hebron","Nablus","Khan Yunis","Rafah","Jenin","Bethlehem","Ramallah","Tulkarm","Qalqilya"], all: [] },
  "+507": { popular: ["Panama City","San Miguelito","Tocumen","David","Arraiján","Colón","La Chorrera","Pacora","Santiago","Chitré"], all: [] },
  "+51":  { popular: ["Lima","Arequipa","Trujillo","Chiclayo","Piura","Iquitos","Cusco","Chimbote","Huancayo","Tacna"], all: [] },
  "+63":  { popular: ["Manila","Quezon City","Davao","Caloocan","Cebu City","Zamboanga","Antipolo","Pasig","Taguig","Cagayan de Oro"], all: [] },
  "+48":  { popular: ["Warsaw","Kraków","Łódź","Wrocław","Poznań","Gdańsk","Szczecin","Bydgoszcz","Lublin","Białystok"], all: [] },
  "+351": { popular: ["Lisbon","Porto","Vila Nova de Gaia","Amadora","Braga","Funchal","Coimbra","Setúbal","Almada","Aveiro"], all: [] },
  "+974": { popular: ["Doha","Al Rayyan","Umm Salal","Al Wakrah","Al Khor","Lusail","Madinat ash Shamal","Mesaieed","Dukhan","Al Daayen"], all: [] },
  "+40":  { popular: ["Bucharest","Cluj-Napoca","Timișoara","Iași","Constanța","Craiova","Brașov","Galați","Ploiești","Oradea"], all: [] },
  "+966": { popular: ["Riyadh","Jeddah","Mecca","Medina","Dammam","Khobar","Tabuk","Buraidah","Khamis Mushait","Abha"], all: [] },
  "+221": { popular: ["Dakar","Pikine","Touba","Thiès","Kaolack","M'Bour","Ziguinchor","Saint-Louis","Diourbel","Tambacounda"], all: [] },
  "+381": { popular: ["Belgrade","Novi Sad","Niš","Kragujevac","Subotica","Pančevo","Čačak","Kraljevo","Novi Pazar","Smederevo"], all: [] },
  "+421": { popular: ["Bratislava","Košice","Prešov","Žilina","Banská Bystrica","Nitra","Trnava","Trenčín","Martin","Poprad"], all: [] },
  "+386": { popular: ["Ljubljana","Maribor","Celje","Kranj","Velenje","Koper","Novo Mesto","Ptuj","Trbovlje","Murska Sobota"], all: [] },
  "+27":  { popular: ["Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth","Bloemfontein","Soweto","East London","Pietermaritzburg","Nelspruit"], all: [] },
  "+82":  { popular: ["Seoul","Busan","Incheon","Daegu","Daejeon","Gwangju","Ulsan","Suwon","Changwon","Goyang"], all: [] },
  "+34":  { popular: ["Madrid","Barcelona","Valencia","Seville","Zaragoza","Málaga","Murcia","Palma","Las Palmas","Bilbao"], all: [] },
  "+94":  { popular: ["Colombo","Dehiwala-Mount Lavinia","Moratuwa","Negombo","Jaffna","Kandy","Kalmunai","Trincomalee","Galle","Anuradhapura"], all: [] },
  "+46":  { popular: ["Stockholm","Gothenburg","Malmö","Uppsala","Västerås","Örebro","Linköping","Helsingborg","Jönköping","Norrköping"], all: [] },
  "+41":  { popular: ["Zürich","Geneva","Basel","Lausanne","Bern","Winterthur","Lucerne","St. Gallen","Lugano","Biel/Bienne"], all: [] },
  "+963": { popular: ["Damascus","Aleppo","Homs","Latakia","Hama","Raqqa","Deir ez-Zor","Hasakah","Qamishli","Tartus"], all: [] },
  "+886": { popular: ["Taipei","New Taipei","Kaohsiung","Taichung","Tainan","Banqiao","Hsinchu","Keelung","Chiayi","Taoyuan"], all: [] },
  "+66":  { popular: ["Bangkok","Nonthaburi","Pak Kret","Hat Yai","Chiang Mai","Surat Thani","Udon Thani","Pattaya","Khon Kaen","Nakhon Ratchasima"], all: [] },
  "+216": { popular: ["Tunis","Sfax","Sousse","Kairouan","Bizerte","Gabès","Ariana","Gafsa","Monastir","Ben Arous"], all: [] },
  "+90":  { popular: ["Istanbul","Ankara","Izmir","Bursa","Adana","Gaziantep","Konya","Antalya","Kayseri","Mersin"], all: [] },
  "+380": { popular: ["Kyiv","Kharkiv","Odesa","Dnipro","Donetsk","Zaporizhzhia","Lviv","Kryvyi Rih","Mykolaiv","Mariupol"], all: [] },
  "+598": { popular: ["Montevideo","Salto","Ciudad de la Costa","Paysandú","Las Piedras","Rivera","Maldonado","Tacuarembó","Melo","Mercedes"], all: [] },
  "+998": { popular: ["Tashkent","Samarkand","Namangan","Andijan","Nukus","Bukhara","Qarshi","Fergana","Chirchiq","Urgench"], all: [] },
  "+58":  { popular: ["Caracas","Maracaibo","Valencia","Barquisimeto","Maracay","Ciudad Guayana","San Cristóbal","Maturín","Ciudad Bolívar","Cumaná"], all: [] },
  "+84":  { popular: ["Ho Chi Minh City","Hanoi","Haiphong","Da Nang","Biên Hòa","Huế","Nha Trang","Cần Thơ","Vũng Tàu","Buôn Ma Thuột"], all: [] },
  "+967": { popular: ["Sana'a","Aden","Taiz","Hodeidah","Ibb","Dhamar","Mukalla","Sayyan","Bajil","Hajjah"], all: [] },
  "+260": { popular: ["Lusaka","Kitwe","Ndola","Kabwe","Chingola","Mufulira","Luanshya","Livingstone","Kasama","Chipata"], all: [] },
  "+263": { popular: ["Harare","Bulawayo","Chitungwiza","Mutare","Gweru","Epworth","Kwekwe","Kadoma","Masvingo","Chinhoyi"], all: [] },
}

// Mirror every entry's `popular` into its empty `all` so search inside the
// CityInput dropdown also surfaces those metros while the user types.
for (const c of Object.values(COUNTRY_CITIES)) {
  if (!c.all || c.all.length === 0) c.all = c.popular
}

// Resolve the right city dataset for a phone country code. Falls back to
// a permissive empty set so CityInput still accepts free-typed values.
const FALLBACK_CITY_DATA = { popular: [], all: [] }
export function getCityDataForCode(code) {
  if (!code) return COUNTRY_CITIES["+91"]
  return COUNTRY_CITIES[code] || FALLBACK_CITY_DATA
}

// Longest-prefix match for an E.164-ish string ("+91XXXX" → "+91"). Used by
// AddLead / LeadEdit to feed the right city list when the phone country
// changes. Falls back to "+91".
const SORTED_CODES = Object.keys(COUNTRY_CITIES).sort((a, b) => b.length - a.length)
export function detectCountryCode(phone) {
  if (!phone) return "+91"
  const s = String(phone)
  for (const code of SORTED_CODES) {
    if (s.startsWith(code)) return code
  }
  return "+91"
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
