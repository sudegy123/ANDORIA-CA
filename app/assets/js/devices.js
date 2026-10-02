/**
 * SOLAR SMART ADVISOR — DEVICE DATA MANAGER
 * devices.js
 *
 * Loads and manages the electrical device library.
 * Provides raw lookup and filtering functions ONLY — no property-type or
 * shop-type awareness lives here. That logic belongs to DecisionEngine
 * (decision-engine.js), which consumes this data.
 * In MVP: loads from embedded data (mirrors data/devices.json exactly).
 * In production: fetches from /data/devices.json API endpoint.
 */

'use strict';

const DeviceManager = (() => {

  // ── Embedded device data (mirrors data/devices.json) ───────────
  const DEVICE_DATA = {
    propertyTypes: ["house", "apartment", "shop", "office", "farm", "clinic", "school", "mosque", "workshop"],
    shopTypes: ["grocery", "pharmacy", "bakery", "restaurant", "cafe", "barber", "salon", "mobile"],

    propertyCategories: {
      house:     ["lighting", "cooling", "kitchen", "entertainment", "pumps", "office"],
      apartment: ["lighting", "cooling", "kitchen", "entertainment"],
      office:    ["lighting", "office", "cooling", "kitchen"],
      farm:      ["pumps", "agriculture", "workshop", "lighting", "cooling", "kitchen", "entertainment"],
      clinic:    ["medical", "emergency", "lighting", "cooling", "pumps", "office"],
      school:    ["lighting", "cooling", "office", "pumps"],
      mosque:    ["cooling", "lighting", "sound", "pumps"],
      workshop:  ["workshop", "cooling", "lighting"],
      shop:      ["commercial", "kitchen", "cooling", "lighting"],
    },

    shopCategories: {
      grocery:    ["kitchen", "cooling", "lighting", "commercial", "office"],
      pharmacy:   ["medical", "cooling", "lighting", "commercial", "office"],
      bakery:     ["kitchen", "commercial", "cooling", "lighting"],
      restaurant: ["kitchen", "cooling", "lighting", "commercial", "entertainment"],
      cafe:       ["kitchen", "commercial", "entertainment", "lighting"],
      barber:     ["commercial", "cooling", "lighting", "entertainment"],
      salon:      ["commercial", "cooling", "lighting"],
      mobile:     ["lighting", "office", "commercial", "cooling"],
    },

    quickSelection: {
      house:      ["led-bulb", "fan-ceil", "cooler-evap-small", "fridge-nf", "tv-32", "pump-surface-0.5hp"],
      apartment:  ["led-bulb", "fan-ceil", "cooler-evap-small", "fridge-single", "tv-32"],
      office:     ["led-tube", "laptop", "fan-ceil", "printer", "cctv"],
      farm:       ["pump-sub-2hp", "poultry-fan", "milking", "flood-light"],
      clinic:     ["vaccine-fridge", "oxygen", "led-tube", "fan-ceil", "pump-surface-0.5hp"],
      school:     ["led-tube", "fan-ceil", "desktop", "pump-surface-0.5hp"],
      mosque:     ["fan-ceil", "led-tube", "amplifier-pa", "pump-surface-0.5hp"],
      workshop:   ["welder-inverter", "air-compressor-1hp", "angle-grinder", "flood-light"],
      grocery:    ["display-fridge", "fan-ceil", "led-bulb", "pos-terminal"],
      pharmacy:   ["medical-fridge-general", "ac-1.5-inv", "led-bulb", "pos-terminal"],
      bakery:     ["dough-mixer", "display-fridge", "exhaust-fan"],
      restaurant: ["fridge-nf", "fan-ceil", "led-bulb"],
      cafe:       ["espresso-machine", "display-fridge", "router"],
      barber:     ["hair-clippers", "fan-ceil", "mirror-light"],
      salon:      ["hair-dryer", "nail-uv-lamp", "led-bulb"],
      mobile:     ["led-bulb", "cctv", "display-screen"],
    },

    categories: [
      { id: 'lighting',      name_ar: 'إضاءة',              name_en: 'Lighting',             emoji: '💡' },
      { id: 'cooling',       name_ar: 'تبريد',               name_en: 'Cooling',              emoji: '❄️' },
      { id: 'kitchen',       name_ar: 'المطبخ والأجهزة',     name_en: 'Kitchen & Appliances', emoji: '🍽️' },
      { id: 'entertainment', name_ar: 'ترفيه',               name_en: 'Entertainment',        emoji: '📺' },
      { id: 'office',        name_ar: 'مكتب وتقنية',         name_en: 'Office & IT',          emoji: '💻' },
      { id: 'pumps',         name_ar: 'مضخات المياه',        name_en: 'Water Pumps',          emoji: '💧' },
      { id: 'medical',       name_ar: 'طبي',                 name_en: 'Medical',              emoji: '🏥' },
      { id: 'emergency',     name_ar: 'أحمال طارئة',         name_en: 'Emergency Loads',      emoji: '🚨', virtual: true },
      { id: 'agriculture',   name_ar: 'زراعة',               name_en: 'Agriculture',          emoji: '🌾' },
      { id: 'workshop',      name_ar: 'أدوات ورشة',          name_en: 'Workshop Tools',       emoji: '🔧' },
      { id: 'sound',         name_ar: 'صوتيات',              name_en: 'Sound & PA',           emoji: '🔊' },
      { id: 'commercial',    name_ar: 'تجهيزات تجارية',      name_en: 'Commercial Fit-out',   emoji: '🛒' },
    ],

    devices: [
      // LIGHTING
      { id: 'led-bulb',          cat: 'lighting', ctx: ['all'], name_ar: 'مصباح LED', name_en: 'LED Bulb', emoji: '💡', watts: 10, surge: 1.0, default_hours: 6, is_motor: false, priority: 2, critical: false },
      { id: 'led-tube',          cat: 'lighting', ctx: ['all'], name_ar: 'أنبوب LED', name_en: 'LED Tube', emoji: '🔦', watts: 18, surge: 1.2, default_hours: 6, is_motor: false, priority: 2, critical: false },
      { id: 'led-strip',         cat: 'lighting', ctx: ['house','apartment','cafe','restaurant','barber','salon'], name_ar: 'شريط LED 5م', name_en: 'LED Strip 5m', emoji: '✨', watts: 25, surge: 1.0, default_hours: 5, is_motor: false, priority: 4, critical: false },
      { id: 'flood-light',       cat: 'lighting', ctx: ['house','farm','school','mosque','workshop','clinic'], name_ar: 'كشاف خارجي', name_en: 'Flood/Security Light', emoji: '🔆', watts: 50, surge: 1.2, default_hours: 8, is_motor: false, priority: 3, critical: false },
      { id: 'emergency-lantern', cat: 'lighting', ctx: ['all'], name_ar: 'كشاف شحن طوارئ', name_en: 'Rechargeable Emergency Lantern', emoji: '🔦', watts: 5, surge: 1.0, default_hours: 1, is_motor: false, priority: 5, critical: false },
      { id: 'pole-light',        cat: 'lighting', ctx: ['farm','school','mosque'], name_ar: 'عمود إنارة الفناء', name_en: 'Compound Pole Light', emoji: '🔆', watts: 25, surge: 1.0, default_hours: 11, is_motor: false, priority: 3, critical: false },
      // COOLING
      { id: 'fan-ceil',          cat: 'cooling', ctx: ['all'], name_ar: 'مروحة سقف', name_en: 'Ceiling Fan', emoji: '🌀', watts: 65, surge: 2.5, default_hours: 10, is_motor: true, priority: 2, critical: false },
      { id: 'fan-stand',         cat: 'cooling', ctx: ['all'], name_ar: 'مروحة أرضية', name_en: 'Standing Fan', emoji: '💨', watts: 50, surge: 2.0, default_hours: 8, is_motor: true, priority: 2, critical: false },
      { id: 'fan-desk',          cat: 'cooling', ctx: ['office','school','clinic'], name_ar: 'مروحة مكتب', name_en: 'Desk Fan', emoji: '🌬️', watts: 30, surge: 1.8, default_hours: 6, is_motor: true, priority: 3, critical: false },
      { id: 'exhaust-fan',       cat: 'cooling', ctx: ['restaurant','bakery','cafe','clinic','workshop'], name_ar: 'شفاط هواء', name_en: 'Exhaust Fan', emoji: '🌀', watts: 60, surge: 1.8, default_hours: 8, is_motor: true, priority: 3, critical: false },
      // Water/Desert (evaporative) cooler — deliberately NOT called "مكيف"
      // bare (that's reserved for real compressor ACs below) or "بردية"
      // alone (too informal/ambiguous) — "مكيف مويه"/"مكيف صحراوي" is the
      // Sudanese colloquial term that both reads naturally AND can't be
      // confused with a compressor AC once qualified this way. Wattages
      // are the pre-existing values from before this relabeling — not
      // independently re-verified against a specific manufacturer.
      { id: 'cooler-evap-small', cat: 'cooling', ctx: ['all'], name_ar: 'مكيف مويه صغير (16 بوصة)', name_en: 'Water Cooler — Small (Evaporative)', emoji: '🌬️', watts: 180, surge: 2.0, default_hours: 9, is_motor: true, priority: 3, critical: false },
      { id: 'cooler-evap-med',   cat: 'cooling', ctx: ['all'], name_ar: 'مكيف مويه متوسط (24-30 بوصة)', name_en: 'Water Cooler — Medium (Evaporative)', emoji: '🌬️', watts: 300, surge: 2.0, default_hours: 9, is_motor: true, priority: 3, critical: false },
      { id: 'cooler-evap-lg',    cat: 'cooling', ctx: ['workshop','mosque','grocery','restaurant'], name_ar: 'مكيف صحراوي صناعي كبير', name_en: 'Desert Cooler — Industrial (Evaporative)', emoji: '🌬️', watts: 550, surge: 2.2, default_hours: 10, is_motor: true, priority: 3, critical: false },
      { id: 'ac-1-inv',         cat: 'cooling', ctx: ['all'], name_ar: 'مكيف 1 طن إنفيرتر', name_en: 'AC 1T Inverter', emoji: '❄️', watts: 650, surge: 3.0, default_hours: 8, is_motor: true, priority: 3, critical: false },
      { id: 'ac-1.5-inv',       cat: 'cooling', ctx: ['all'], name_ar: 'مكيف 1.5 طن إنفيرتر', name_en: 'AC 1.5T Inverter', emoji: '❄️', watts: 850, surge: 3.0, default_hours: 8, is_motor: true, priority: 3, critical: false },
      { id: 'ac-2-inv',         cat: 'cooling', ctx: ['all'], name_ar: 'مكيف 2 طن إنفيرتر', name_en: 'AC 2T Inverter', emoji: '🧊', watts: 1200, surge: 3.5, default_hours: 8, is_motor: true, priority: 3, critical: false },
      { id: 'ac-1.5-conv',      cat: 'cooling', ctx: ['all'], name_ar: 'مكيف 1.5 طن عادي', name_en: 'AC 1.5T Conventional', emoji: '❄️', watts: 1500, surge: 5.0, default_hours: 6, is_motor: true, priority: 3, critical: false },
      { id: 'ac-3-commercial',  cat: 'cooling', ctx: ['clinic','pharmacy','grocery','office'], name_ar: 'مكيف 3 طن تجاري', name_en: 'AC 3T Commercial', emoji: '🧊', watts: 2500, surge: 4.0, default_hours: 9, is_motor: true, priority: 3, critical: false },
      // KITCHEN & APPLIANCES
      { id: 'fridge-inv',       cat: 'kitchen', ctx: ['house','apartment','farm','clinic','office','grocery','bakery','restaurant','cafe','mobile'], name_ar: 'ثلاجة إنفيرتر', name_en: 'Refrigerator — Inverter', emoji: '🧊', watts: 80, surge: 3.0, default_hours: 24, is_motor: true, priority: 1, critical: true },
      { id: 'fridge-nf',        cat: 'kitchen', ctx: ['house','apartment','farm','clinic','office','grocery','bakery','restaurant','cafe','mobile'], name_ar: 'ثلاجة نو فروست', name_en: 'Refrigerator — No-Frost', emoji: '🧊', watts: 180, surge: 4.5, default_hours: 24, is_motor: true, priority: 1, critical: true },
      { id: 'fridge-single',    cat: 'kitchen', ctx: ['house','apartment','grocery','mobile'], name_ar: 'ثلاجة باب واحد', name_en: 'Refrigerator — Single Door', emoji: '🧊', watts: 110, surge: 3.5, default_hours: 24, is_motor: true, priority: 1, critical: true },
      { id: 'freezer',          cat: 'kitchen', ctx: ['house','apartment','farm','grocery','bakery','restaurant','cafe'], name_ar: 'فريزر', name_en: 'Deep Freezer', emoji: '❄️', watts: 150, surge: 4.0, default_hours: 24, is_motor: true, priority: 1, critical: true },
      { id: 'washing-machine',  cat: 'kitchen', ctx: ['house','apartment'], name_ar: 'غسالة ملابس', name_en: 'Washing Machine', emoji: '🧺', watts: 500, surge: 3.0, default_hours: 1, is_motor: true, priority: 3, critical: false },
      { id: 'kettle',           cat: 'kitchen', ctx: ['house','apartment','farm','clinic','office','grocery','bakery','restaurant','cafe'], name_ar: 'غلاية كهربائية', name_en: 'Electric Kettle', emoji: '☕', watts: 1800, surge: 1.0, default_hours: 0.25, is_motor: false, priority: 5, critical: false },
      { id: 'microwave',        cat: 'kitchen', ctx: ['house','apartment','office','clinic','restaurant','cafe'], name_ar: 'مايكرويف', name_en: 'Microwave', emoji: '📡', watts: 1000, surge: 1.0, default_hours: 0.5, is_motor: false, priority: 4, critical: false },
      { id: 'water-heater',     cat: 'kitchen', ctx: ['house','apartment','clinic'], name_ar: 'سخان مياه', name_en: 'Electric Water Heater', emoji: '🚿', watts: 2000, surge: 1.0, default_hours: 1.5, is_motor: false, priority: 4, critical: false },
      { id: 'display-fridge',   cat: 'kitchen', ctx: ['grocery','bakery','restaurant','cafe','pharmacy'], name_ar: 'ثلاجة عرض', name_en: 'Display/Showcase Fridge', emoji: '🧊', watts: 250, surge: 4.0, default_hours: 24, is_motor: true, priority: 1, critical: true },
      { id: 'dough-mixer',      cat: 'kitchen', ctx: ['bakery'], name_ar: 'خلاط عجين تجاري', name_en: 'Commercial Dough Mixer', emoji: '🥖', watts: 900, surge: 1.8, default_hours: 3, is_motor: true, priority: 3, critical: false },
      { id: 'proofing-cabinet', cat: 'kitchen', ctx: ['bakery'], name_ar: 'خزانة تخمير', name_en: 'Proofing Cabinet', emoji: '🥐', watts: 650, surge: 1.0, default_hours: 4, is_motor: false, priority: 4, critical: false },
      { id: 'espresso-machine', cat: 'kitchen', ctx: ['cafe','restaurant'], name_ar: 'ماكينة قهوة إسبريسو', name_en: 'Espresso/Coffee Machine', emoji: '☕', watts: 1200, surge: 1.0, default_hours: 5, is_motor: false, priority: 3, critical: false },
      { id: 'water-dispenser',  cat: 'kitchen', ctx: ['house','apartment','office','clinic','school','grocery','restaurant','cafe'], name_ar: 'برادة مياه', name_en: 'Hot/Cold Water Dispenser', emoji: '🚰', watts: 90, surge: 1.0, default_hours: 24, is_motor: false, priority: 4, critical: false },
      // ENTERTAINMENT
      { id: 'tv-32',            cat: 'entertainment', ctx: ['house','apartment','office','cafe','restaurant','barber','mobile'], name_ar: 'تلفزيون 32 بوصة', name_en: 'TV 32"', emoji: '📺', watts: 40, surge: 1.2, default_hours: 5, is_motor: false, priority: 4, critical: false },
      { id: 'tv-55',            cat: 'entertainment', ctx: ['house','apartment','cafe','restaurant'], name_ar: 'تلفزيون 55 بوصة', name_en: 'TV 55"', emoji: '📺', watts: 85, surge: 1.2, default_hours: 5, is_motor: false, priority: 4, critical: false },
      { id: 'receiver',         cat: 'entertainment', ctx: ['house','apartment','cafe','restaurant','barber'], name_ar: 'رسيفر / دش', name_en: 'Satellite Receiver', emoji: '📡', watts: 18, surge: 1.0, default_hours: 6, is_motor: false, priority: 4, critical: false },
      { id: 'router',           cat: 'entertainment', ctx: ['house','apartment','office','clinic','school','grocery','pharmacy','bakery','restaurant','cafe','mobile'], name_ar: 'راوتر إنترنت', name_en: 'WiFi Router', emoji: '📶', watts: 12, surge: 1.0, default_hours: 24, is_motor: false, priority: 3, critical: false },
      { id: 'speaker-system',   cat: 'entertainment', ctx: ['house','apartment','cafe','restaurant'], name_ar: 'نظام صوت منزلي', name_en: 'Speaker/Sound System', emoji: '🔈', watts: 100, surge: 1.3, default_hours: 3, is_motor: false, priority: 5, critical: false },
      // OFFICE & IT
      { id: 'laptop',           cat: 'office', ctx: ['office','school','clinic','grocery','pharmacy','mobile'], name_ar: 'لابتوب', name_en: 'Laptop', emoji: '💻', watts: 55, surge: 1.2, default_hours: 8, is_motor: false, priority: 3, critical: false },
      { id: 'desktop',          cat: 'office', ctx: ['office','school','clinic'], name_ar: 'كمبيوتر مكتبي', name_en: 'Desktop PC (+monitor)', emoji: '🖥️', watts: 250, surge: 1.5, default_hours: 8, is_motor: false, priority: 3, critical: false },
      { id: 'printer',          cat: 'office', ctx: ['office','school','clinic'], name_ar: 'طابعة ليزر', name_en: 'Laser Printer', emoji: '🖨️', watts: 450, surge: 2.0, default_hours: 1, is_motor: true, priority: 5, critical: false },
      { id: 'photocopier',      cat: 'office', ctx: ['office','school'], name_ar: 'آلة تصوير', name_en: 'Photocopier', emoji: '📠', watts: 1200, surge: 2.0, default_hours: 1.5, is_motor: true, priority: 5, critical: false },
      { id: 'projector',        cat: 'office', ctx: ['office','school'], name_ar: 'بروجكتور', name_en: 'Projector', emoji: '📽️', watts: 300, surge: 1.3, default_hours: 2, is_motor: false, priority: 4, critical: false },
      { id: 'cctv',             cat: 'office', ctx: ['office','clinic','grocery','pharmacy','mobile'], name_ar: 'كاميرات مراقبة x4', name_en: 'CCTV x4', emoji: '📷', watts: 80, surge: 1.0, default_hours: 24, is_motor: false, priority: 3, critical: false },
      // WATER PUMPS
      { id: 'pump-surface-0.5hp', cat: 'pumps', ctx: ['house','apartment','office','clinic','school','mosque','grocery','restaurant','bakery','cafe'], name_ar: 'طلمبة سطحية 0.5 حصان', name_en: 'Surface Pump 0.5HP', emoji: '💧', watts: 370, surge: 5.5, default_hours: 3, is_motor: true, priority: 2, critical: false },
      { id: 'pump-surface-1hp',   cat: 'pumps', ctx: ['house','office','clinic','mosque','grocery','restaurant'], name_ar: 'طلمبة سطحية 1 حصان', name_en: 'Surface Pump 1HP', emoji: '💧', watts: 750, surge: 5.5, default_hours: 3, is_motor: true, priority: 2, critical: false },
      { id: 'pump-sub-1.5hp',     cat: 'pumps', ctx: ['farm'], name_ar: 'طلمبة غاطسة 1.5 حصان', name_en: 'Submersible Borehole Pump 1.5HP', emoji: '💦', watts: 1100, surge: 6.0, default_hours: 5, is_motor: true, priority: 2, critical: false },
      { id: 'pump-sub-2hp',       cat: 'pumps', ctx: ['farm'], name_ar: 'طلمبة غاطسة 2 حصان', name_en: 'Submersible Borehole Pump 2HP', emoji: '💦', watts: 1490, surge: 6.0, default_hours: 6, is_motor: true, priority: 2, critical: false },
      { id: 'pump-sub-3hp',       cat: 'pumps', ctx: ['farm'], name_ar: 'طلمبة غاطسة 3 حصان', name_en: 'Submersible Borehole Pump 3HP', emoji: '🌊', watts: 2240, surge: 5.5, default_hours: 8, is_motor: true, priority: 2, critical: false },
      { id: 'pump-sub-5hp',       cat: 'pumps', ctx: ['farm'], name_ar: 'طلمبة غاطسة 5 حصان', name_en: 'Submersible Borehole Pump 5HP', emoji: '🌊', watts: 3700, surge: 5.5, default_hours: 8, is_motor: true, priority: 3, critical: false },
      { id: 'pump-sub-7.5hp',     cat: 'pumps', ctx: ['farm'], name_ar: 'طلمبة غاطسة 7.5 حصان', name_en: 'Submersible Borehole Pump 7.5HP', emoji: '🌊', watts: 5500, surge: 5.0, default_hours: 8, is_motor: true, priority: 3, critical: false },
      { id: 'pump-solar-dc',      cat: 'pumps', ctx: ['farm'], name_ar: 'طلمبة شمسية مباشرة (DC)', name_en: 'DC Solar Water Pump (direct)', emoji: '☀️', watts: 1100, surge: 1.0, default_hours: 7, is_motor: true, priority: 3, critical: false },
      { id: 'water-tank-control', cat: 'pumps', ctx: ['farm','house','school','mosque'], name_ar: 'متحكم مستوى خزان المياه', name_en: 'Water Tank Level Controller', emoji: '🛢️', watts: 5, surge: 1.0, default_hours: 24, is_motor: false, priority: 4, critical: false },
      // MEDICAL
      { id: 'vaccine-fridge',        cat: 'medical', ctx: ['clinic'], name_ar: 'ثلاجة لقاحات', name_en: 'Vaccine Fridge', emoji: '💉', watts: 80, surge: 3.0, default_hours: 24, is_motor: true, priority: 1, critical: true },
      { id: 'medical-fridge-general',cat: 'medical', ctx: ['clinic','pharmacy'], name_ar: 'ثلاجة أدوية طبية', name_en: 'Medical/Medicine Fridge', emoji: '💊', watts: 120, surge: 3.5, default_hours: 24, is_motor: true, priority: 1, critical: true },
      { id: 'oxygen',                cat: 'medical', ctx: ['clinic'], name_ar: 'جهاز أكسجين', name_en: 'Oxygen Concentrator', emoji: '🫁', watts: 350, surge: 2.0, default_hours: 8, is_motor: true, priority: 1, critical: true },
      { id: 'autoclave',             cat: 'medical', ctx: ['clinic'], name_ar: 'جهاز تعقيم (أوتوكلاف)', name_en: 'Autoclave/Sterilizer', emoji: '⚗️', watts: 1500, surge: 1.5, default_hours: 2, is_motor: false, priority: 2, critical: false },
      { id: 'incubator',             cat: 'medical', ctx: ['clinic'], name_ar: 'حاضنة أطفال', name_en: 'Infant Incubator', emoji: '👶', watts: 350, surge: 1.5, default_hours: 24, is_motor: false, priority: 1, critical: true },
      { id: 'dental-unit',           cat: 'medical', ctx: ['clinic'], name_ar: 'جهاز أسنان وكمبروسر', name_en: 'Dental Unit + Compressor', emoji: '🦷', watts: 650, surge: 3.0, default_hours: 4, is_motor: true, priority: 3, critical: false },
      { id: 'ultrasound',            cat: 'medical', ctx: ['clinic'], name_ar: 'جهاز إيكو (ألتراساوند)', name_en: 'Ultrasound Machine', emoji: '🩻', watts: 250, surge: 1.3, default_hours: 4, is_motor: false, priority: 2, critical: false },
      { id: 'ecg',                   cat: 'medical', ctx: ['clinic'], name_ar: 'جهاز تخطيط قلب (ECG)', name_en: 'ECG Machine', emoji: '❤️', watts: 80, surge: 1.0, default_hours: 2, is_motor: false, priority: 2, critical: false },
      { id: 'lab-centrifuge',        cat: 'medical', ctx: ['clinic'], name_ar: 'جهاز طرد مركزي مخبري', name_en: 'Lab Centrifuge', emoji: '🧪', watts: 250, surge: 1.5, default_hours: 1, is_motor: true, priority: 3, critical: false },
      { id: 'exam-light',            cat: 'medical', ctx: ['clinic'], name_ar: 'كشاف فحص طبي', name_en: 'Examination Light', emoji: '🩺', watts: 30, surge: 1.0, default_hours: 6, is_motor: false, priority: 3, critical: false },
      // AGRICULTURE
      { id: 'poultry-fan',    cat: 'agriculture', ctx: ['farm'], name_ar: 'مراوح دجاج x4', name_en: 'Poultry Ventilation Fans x4', emoji: '🐔', watts: 300, surge: 2.5, default_hours: 12, is_motor: true, priority: 2, critical: true },
      { id: 'brooding-lamp',  cat: 'agriculture', ctx: ['farm'], name_ar: 'لمبة تدفئة كتاكيت', name_en: 'Poultry Brooding Heat Lamp', emoji: '🔥', watts: 250, surge: 1.0, default_hours: 20, is_motor: false, priority: 3, critical: false },
      { id: 'grain-mill',     cat: 'agriculture', ctx: ['farm'], name_ar: 'طاحونة حبوب', name_en: 'Grain/Hammer Mill', emoji: '🌾', watts: 2000, surge: 6.0, default_hours: 4, is_motor: true, priority: 3, critical: false },
      { id: 'feed-mixer',     cat: 'agriculture', ctx: ['farm'], name_ar: 'خلاط أعلاف', name_en: 'Feed Mixer', emoji: '🌽', watts: 2200, surge: 3.0, default_hours: 2, is_motor: true, priority: 3, critical: false },
      { id: 'milking',        cat: 'agriculture', ctx: ['farm'], name_ar: 'ماكينة حلب', name_en: 'Milking Machine', emoji: '🐄', watts: 550, surge: 3.0, default_hours: 2, is_motor: true, priority: 2, critical: false },
      { id: 'milk-tank',      cat: 'agriculture', ctx: ['farm'], name_ar: 'خزان تبريد ألبان', name_en: 'Milk Bulk Cooling Tank', emoji: '🥛', watts: 1200, surge: 4.0, default_hours: 6, is_motor: true, priority: 2, critical: false },
      { id: 'electric-fence', cat: 'agriculture', ctx: ['farm'], name_ar: 'سياج كهربائي', name_en: 'Electric Fence Energizer', emoji: '🔌', watts: 12, surge: 1.0, default_hours: 24, is_motor: false, priority: 4, critical: false },
      // WORKSHOP TOOLS
      { id: 'air-compressor-1hp', cat: 'workshop', ctx: ['workshop','farm'], name_ar: 'كمبروسر هواء 1 حصان', name_en: 'Air Compressor 1HP', emoji: '🛠️', watts: 750, surge: 6.5, default_hours: 3, is_motor: true, priority: 3, critical: false },
      { id: 'air-compressor-2hp', cat: 'workshop', ctx: ['workshop'], name_ar: 'كمبروسر هواء 2 حصان', name_en: 'Air Compressor 2HP', emoji: '🛠️', watts: 1500, surge: 6.5, default_hours: 3, is_motor: true, priority: 3, critical: false },
      { id: 'welder-inverter',    cat: 'workshop', ctx: ['workshop','farm'], name_ar: 'ماكينة لحام إنفيرتر', name_en: 'Welding Machine — Inverter Type', emoji: '⚡', watts: 4200, surge: 2.2, default_hours: 3, is_motor: false, priority: 3, critical: false },
      { id: 'welder-transformer', cat: 'workshop', ctx: ['workshop'], name_ar: 'ماكينة لحام محول', name_en: 'Welding Machine — Transformer Type', emoji: '⚡', watts: 6000, surge: 4.0, default_hours: 3, is_motor: false, priority: 3, critical: false },
      { id: 'angle-grinder',      cat: 'workshop', ctx: ['workshop','farm'], name_ar: 'جلاخ', name_en: 'Angle Grinder', emoji: '🔩', watts: 900, surge: 2.5, default_hours: 1, is_motor: true, priority: 4, critical: false },
      { id: 'drill',              cat: 'workshop', ctx: ['workshop','farm'], name_ar: 'مثقاب', name_en: 'Electric Drill', emoji: '🔧', watts: 550, surge: 2.0, default_hours: 1, is_motor: true, priority: 4, critical: false },
      { id: 'bench-lathe',        cat: 'workshop', ctx: ['workshop'], name_ar: 'مخرطة صغيرة', name_en: 'Bench Lathe (small)', emoji: '⚙️', watts: 1500, surge: 4.5, default_hours: 3, is_motor: true, priority: 3, critical: false },
      { id: 'metal-saw',          cat: 'workshop', ctx: ['workshop'], name_ar: 'منشار قطع معادن', name_en: 'Metal Cutting Saw', emoji: '🪚', watts: 1800, surge: 3.0, default_hours: 1, is_motor: true, priority: 4, critical: false },
      // SOUND & PA (mosque)
      { id: 'amplifier-pa',    cat: 'sound', ctx: ['mosque'], name_ar: 'أمبليفاير ومكسر صوت', name_en: 'PA Amplifier + Mixer', emoji: '🔊', watts: 240, surge: 1.5, default_hours: 6, is_motor: false, priority: 2, critical: false },
      { id: 'microphone',      cat: 'sound', ctx: ['mosque'], name_ar: 'ميكروفون لاسلكي', name_en: 'Wireless Microphone Receiver', emoji: '🎙️', watts: 8, surge: 1.0, default_hours: 6, is_motor: false, priority: 3, critical: false },
      { id: 'minaret-speaker', cat: 'sound', ctx: ['mosque'], name_ar: 'سماعات المئذنة x4', name_en: 'Minaret Horn Speakers x4', emoji: '📢', watts: 60, surge: 1.2, default_hours: 2, is_motor: false, priority: 2, critical: false },
      // COMMERCIAL FIT-OUT
      { id: 'pos-terminal',           cat: 'commercial', ctx: ['grocery','pharmacy','mobile'], name_ar: 'ماكينة كاشير وقارئ باركود', name_en: 'POS Terminal + Barcode Scanner', emoji: '🧾', watts: 45, surge: 1.0, default_hours: 10, is_motor: false, priority: 3, critical: false },
      { id: 'hair-clippers',          cat: 'commercial', ctx: ['barber'], name_ar: 'ماكينة حلاقة (شحن)', name_en: 'Hair Clippers/Trimmers (charging)', emoji: '💈', watts: 10, surge: 1.0, default_hours: 2, is_motor: false, priority: 4, critical: false },
      { id: 'hair-dryer',             cat: 'commercial', ctx: ['salon'], name_ar: 'سيشوار', name_en: 'Hair Dryer', emoji: '💇', watts: 1500, surge: 1.0, default_hours: 1, is_motor: false, priority: 4, critical: false },
      { id: 'facial-steamer',         cat: 'commercial', ctx: ['salon'], name_ar: 'جهاز بخار الوجه', name_en: 'Facial Steamer', emoji: '💆', watts: 750, surge: 1.0, default_hours: 1, is_motor: false, priority: 4, critical: false },
      { id: 'nail-uv-lamp',           cat: 'commercial', ctx: ['salon'], name_ar: 'جهاز تجفيف أظافر UV', name_en: 'Nail UV/LED Lamp', emoji: '💅', watts: 40, surge: 1.0, default_hours: 2, is_motor: false, priority: 4, critical: false },
      { id: 'mirror-light',           cat: 'commercial', ctx: ['barber','salon'], name_ar: 'إضاءة مرآة', name_en: 'Mirror Light Strip', emoji: '💡', watts: 30, surge: 1.0, default_hours: 10, is_motor: false, priority: 4, critical: false },
      { id: 'display-screen',         cat: 'commercial', ctx: ['mobile','cafe'], name_ar: 'شاشة عرض إعلانية', name_en: 'Display Screen/TV', emoji: '🖥️', watts: 70, surge: 1.2, default_hours: 10, is_motor: false, priority: 4, critical: false },
      { id: 'phone-charging-station', cat: 'commercial', ctx: ['mobile'], name_ar: 'محطة شحن هواتف', name_en: 'Multi-port Phone Charging Station', emoji: '🔌', watts: 80, surge: 1.0, default_hours: 10, is_motor: false, priority: 4, critical: false },
    ],
  };

  // ── Internal index for fast lookup ─────────────────────────────
  const _byId  = {};
  const _byCat = {};

  DEVICE_DATA.devices.forEach(d => {
    _byId[d.id] = d;
    if (!_byCat[d.cat]) _byCat[d.cat] = [];
    _byCat[d.cat].push(d);
  });

  return {

    /** Get all categories (including virtual ones like 'emergency') */
    getCategories() {
      return DEVICE_DATA.categories;
    },

    /** Get a single category definition by id */
    getCategoryById(id) {
      return DEVICE_DATA.categories.find(c => c.id === id) || null;
    },

    /** Get all devices in a category, unfiltered by context */
    getByCategory(catId) {
      return _byCat[catId] || [];
    },

    /** Get a single device by id */
    getById(id) {
      return _byId[id] || null;
    },

    /** Get all devices */
    getAll() {
      return DEVICE_DATA.devices;
    },

    /** Ordered category id list for a property type (raw config, unfiltered) */
    getPropertyCategories(propertyType) {
      return DEVICE_DATA.propertyCategories[propertyType] || [];
    },

    /** Ordered category id list for a shop vertical (raw config, unfiltered) */
    getShopCategories(shopType) {
      return DEVICE_DATA.shopCategories[shopType] || [];
    },

    /** Quick-selection device ids for a property type or shop type */
    getQuickSelection(key) {
      return DEVICE_DATA.quickSelection[key] || [];
    },

    /** List of valid property type ids (step-2 grid) */
    getPropertyTypes() {
      return DEVICE_DATA.propertyTypes;
    },

    /** List of valid shop type ids (step-2 sub-grid, shown only for propertyType==='shop') */
    getShopTypes() {
      return DEVICE_DATA.shopTypes;
    },

    /** Check if any selected device has is_motor = true */
    hasMotorLoads(selectedDevices) {
      return Object.values(selectedDevices).some(d => d.is_motor);
    },

    /** Get motor devices from selection */
    getMotorDevices(selectedDevices) {
      return Object.values(selectedDevices).filter(d => d.is_motor);
    },
  };

})();

if (typeof window !== 'undefined') window.DeviceManager = DeviceManager;
if (typeof module !== 'undefined') module.exports = DeviceManager;
