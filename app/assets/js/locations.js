/**
 * SOLAR SMART ADVISOR — SUDAN LOCATIONS
 * locations.js
 *
 * Official Sudan states, each with its major cities and an estimated
 * peak-sun-hours (PSH) value used for solar sizing. Every state/city
 * carries both name_ar and name_en — the UI picks whichever matches the
 * active language via I18n.getLang(). Mirrors data/sudan-locations.json
 * (same embedded-data pattern as devices.js — zero build step, offline).
 */

'use strict';

const LocationManager = (() => {

  const STATES = [
    { id: 'khartoum',      name_ar: 'الخرطوم',        name_en: 'Khartoum',        psh: 5.8, cities: [
      { id: 'khartoum-city', name_ar: 'الخرطوم',        name_en: 'Khartoum' },
      { id: 'omdurman',      name_ar: 'أم درمان',       name_en: 'Omdurman' },
      { id: 'bahri',         name_ar: 'الخرطوم بحري',   name_en: 'Khartoum North (Bahri)' },
    ]},
    { id: 'gezira',        name_ar: 'الجزيرة',        name_en: 'Gezira',          psh: 5.7, cities: [
      { id: 'wad-madani', name_ar: 'ود مدني',    name_en: 'Wad Madani' },
      { id: 'hasahisa',   name_ar: 'الحصاحيصا',  name_en: 'Al Hasahisa' },
      { id: 'managil',    name_ar: 'المناقل',    name_en: 'Al Managil' },
    ]},
    { id: 'white-nile',    name_ar: 'النيل الأبيض',   name_en: 'White Nile',      psh: 5.6, cities: [
      { id: 'kosti',    name_ar: 'كوستي', name_en: 'Kosti' },
      { id: 'rabak',    name_ar: 'ربك',   name_en: 'Rabak' },
      { id: 'ed-dueim', name_ar: 'الدويم', name_en: 'Ed Dueim' },
    ]},
    { id: 'blue-nile',     name_ar: 'النيل الأزرق',   name_en: 'Blue Nile',       psh: 5.4, cities: [
      { id: 'damazin',  name_ar: 'الدمازين', name_en: 'Ed Damazin' },
      { id: 'roseires', name_ar: 'الروصيرص', name_en: 'Roseires' },
    ]},
    { id: 'sennar',        name_ar: 'سنار',           name_en: 'Sennar',          psh: 5.5, cities: [
      { id: 'sennar-city', name_ar: 'سنار', name_en: 'Sennar' },
      { id: 'singa',       name_ar: 'سنجة', name_en: 'Singa' },
      { id: 'dinder',      name_ar: 'الدندر', name_en: 'Dinder' },
    ]},
    { id: 'kassala',       name_ar: 'كسلا',           name_en: 'Kassala',         psh: 5.6, cities: [
      { id: 'kassala-city',    name_ar: 'كسلا',        name_en: 'Kassala' },
      { id: 'khashm-elgirba',  name_ar: 'خشم القربة',  name_en: 'Khashm el Girba' },
      { id: 'aroma',           name_ar: 'أروما',       name_en: 'Aroma' },
    ]},
    { id: 'gedaref',       name_ar: 'القضارف',        name_en: 'Gedaref',         psh: 5.6, cities: [
      { id: 'gedaref-city', name_ar: 'القضارف', name_en: 'Gedaref' },
      { id: 'doka',         name_ar: 'دوكة',    name_en: 'Doka' },
      { id: 'fashaga',      name_ar: 'الفشقة',  name_en: 'Al Fashaga' },
    ]},
    { id: 'red-sea',       name_ar: 'البحر الأحمر',   name_en: 'Red Sea',         psh: 6.1, cities: [
      { id: 'port-sudan', name_ar: 'بورتسودان', name_en: 'Port Sudan' },
      { id: 'suakin',     name_ar: 'سواكن',     name_en: 'Suakin' },
      { id: 'tokar',      name_ar: 'طوكر',      name_en: 'Tokar' },
    ]},
    { id: 'river-nile',    name_ar: 'نهر النيل',      name_en: 'River Nile',      psh: 6.0, cities: [
      { id: 'atbara',   name_ar: 'عطبرة', name_en: 'Atbara' },
      { id: 'ed-damer', name_ar: 'الدامر', name_en: 'Ed Damer' },
      { id: 'shendi',   name_ar: 'شندي',  name_en: 'Shendi' },
    ]},
    { id: 'northern',      name_ar: 'الشمالية',       name_en: 'Northern',        psh: 6.2, cities: [
      { id: 'dongola', name_ar: 'دنقلا', name_en: 'Dongola' },
      { id: 'merowe',  name_ar: 'مروي',  name_en: 'Merowe' },
      { id: 'karima',  name_ar: 'كريمة', name_en: 'Karima' },
    ]},
    { id: 'north-kordofan', name_ar: 'شمال كردفان',   name_en: 'North Kordofan',  psh: 5.9, cities: [
      { id: 'el-obeid',    name_ar: 'الأبيض',    name_en: 'El Obeid' },
      { id: 'umm-ruwaba',  name_ar: 'أم روابة',  name_en: 'Umm Ruwaba' },
      { id: 'bara',        name_ar: 'بارا',      name_en: 'Bara' },
    ]},
    { id: 'south-kordofan', name_ar: 'جنوب كردفان',   name_en: 'South Kordofan',  psh: 5.6, cities: [
      { id: 'kadugli',      name_ar: 'كادقلي',     name_en: 'Kadugli' },
      { id: 'dilling',      name_ar: 'الدلنج',     name_en: 'Dilling' },
      { id: 'abu-jibaiha',  name_ar: 'أبو جبيهة',  name_en: 'Abu Jibaiha' },
    ]},
    { id: 'west-kordofan',  name_ar: 'غرب كردفان',   name_en: 'West Kordofan',   psh: 5.8, cities: [
      { id: 'el-fula',  name_ar: 'الفولة', name_en: 'El Fula' },
      { id: 'en-nahud', name_ar: 'النهود', name_en: 'En Nahud' },
    ]},
    { id: 'north-darfur',  name_ar: 'شمال دارفور',    name_en: 'North Darfur',    psh: 6.1, cities: [
      { id: 'el-fasher', name_ar: 'الفاشر', name_en: 'El Fasher' },
      { id: 'kutum',     name_ar: 'كتم',    name_en: 'Kutum' },
      { id: 'mellit',    name_ar: 'مليط',   name_en: 'Mellit' },
    ]},
    { id: 'south-darfur',  name_ar: 'جنوب دارفور',    name_en: 'South Darfur',    psh: 5.7, cities: [
      { id: 'nyala', name_ar: 'نيالا', name_en: 'Nyala' },
      { id: 'kass',  name_ar: 'كاس',   name_en: 'Kass' },
    ]},
    { id: 'east-darfur',   name_ar: 'شرق دارفور',     name_en: 'East Darfur',     psh: 5.8, cities: [
      { id: 'ed-daein', name_ar: 'الضعين', name_en: 'Ed Daein' },
      { id: 'yassin',   name_ar: 'يعسوب',  name_en: 'Yassin' },
    ]},
    { id: 'west-darfur',   name_ar: 'غرب دارفور',     name_en: 'West Darfur',     psh: 5.6, cities: [
      { id: 'el-geneina', name_ar: 'الجنينة', name_en: 'El Geneina' },
      { id: 'kereneik',   name_ar: 'كرينك',   name_en: 'Kereneik' },
    ]},
    { id: 'central-darfur', name_ar: 'وسط دارفور',    name_en: 'Central Darfur',  psh: 5.6, cities: [
      { id: 'zalingei', name_ar: 'زالنجي', name_en: 'Zalingei' },
      { id: 'garsila',  name_ar: 'قرسيلة', name_en: 'Garsila' },
    ]},
  ];

  const _byId = {};
  STATES.forEach(s => { _byId[s.id] = s; });

  /** Current UI language ('ar' | 'en') — falls back to 'ar' if I18n isn't loaded yet. */
  function lang() {
    return (typeof I18n !== 'undefined') ? I18n.getLang() : 'ar';
  }

  return {
    /** All 18 Sudan states, in a stable display order */
    getStates() {
      return STATES;
    },

    /** A single state record by id */
    getState(stateId) {
      return _byId[stateId] || null;
    },

    /** Cities belonging to a state */
    getCities(stateId) {
      const s = _byId[stateId];
      return s ? s.cities : [];
    },

    /** Peak sun hours for a state (falls back to the Khartoum-conservative default) */
    getPSH(stateId) {
      const s = _byId[stateId];
      return s ? s.psh : 5.5;
    },

    /** Language-aware display name for a state id. */
    getStateName(stateId, forceLang) {
      const s = _byId[stateId];
      if (!s) return '';
      const l = forceLang || lang();
      return l === 'en' ? s.name_en : s.name_ar;
    },

    /** Language-aware display name for a city id within a state. */
    getCityName(stateId, cityId, forceLang) {
      const city = this.getCities(stateId).find(c => c.id === cityId);
      if (!city) return '';
      const l = forceLang || lang();
      return l === 'en' ? city.name_en : city.name_ar;
    },
  };

})();

if (typeof window !== 'undefined') window.LocationManager = LocationManager;
if (typeof module !== 'undefined') module.exports = LocationManager;
