/**
 * SOLAR SMART ADVISOR — I18N
 * i18n.js
 *
 * Complete bilingual (Arabic/English) system — not a text toggle.
 * Mirrors i18n/ar.json and i18n/en.json exactly (same embedded-data
 * pattern as devices.js/devices.json — zero build step, offline). Owns:
 *   - t(key, vars)            dot-path lookup with {var} interpolation
 *   - setLanguage(lang)       switches language, persists it, flips
 *                             dir/lang on <html>, re-renders every
 *                             static [data-i18n] node, and calls every
 *                             registered onChange listener so dynamic
 *                             (JS-built) screens rebuild themselves
 *   - onChange(fn)            register a rebuild callback (app.js uses
 *                             this to re-run the current step's builder)
 *   - renderSwitcher()        the "🇸🇦 العربية | 🇺🇸 English" control
 *
 * Language choice persists in localStorage and is restored on load —
 * refreshing the page keeps whatever the user last picked.
 */

'use strict';

const I18n = (() => {

  const STORAGE_KEY = 'andoria_lang';

  const DICTS = {
  ar: {
    "meta": {
      "title": "أندوريا — المستشار الذكي للطاقة الشمسية",
      "description": "أندوريا — المستشار الذكي للطاقة الشمسية"
    },
    "brand": {
      "tagline": "DIESEL ENGINES & SOLAR SOLUTIONS",
      "poweredBy": "بدعم من",
      "since": "منذ {year}"
    },
    "langSwitcher": {
      "ar": "🇸🇦 العربية",
      "en": "🇺🇸 English"
    },
    "loading": {
      "text": "جاري تحميل المستشار الذكي..."
    },
    "nav": {
      "back": "رجوع"
    },
    "batteryChemistry": {
      "LITHIUM": "ليثيوم (LiFePO4)",
      "LEAD_ACID": "رصاص حمضي",
      "GEL": "جل (GEL)"
    },
    "inverterType": {
      "HYBRID": "محول هايبرد",
      "OFF_GRID": "محول أوف-جريد",
      "ON_GRID": "محول أون-جريد"
    },
    "inverterPhase": {
      "single": "أحادي الطور",
      "three": "ثلاثي الطور"
    },
    "calcBasis": {
      "title": "كيف حسبنا نظامك؟",
      "devices": "أجهزتك المختارة ({count})",
      "hours": "ساعات تشغيلها",
      "daily": "استهلاكها اليومي ({wh})",
      "peak": "أعلى حمل ({peak})",
      "backup": "ساعات الانقطاع التي اخترتها ({hours} ساعة)",
      "solar": "ساعات الشمس المستخدمة في الحساب ({psh}/يوم)"
    },
    "education": {
      "sectionTitle": "اعرف الفرق قبل ما تختار",
      "sectionSubtitle": "شرح بسيط يساعدك تفهم اختيارك.",
      "tapHint": "اضغط لمعرفة الفرق",
      "disclaimer": "معلومات عامة لأغراض التوعية، وليست قائمة منتجات. يتم تحديد المعدات والعلامة التجارية والموديل بدقة مع فريقنا بعد المراجعة الفنية وحسب المتوفر حالياً.",
      "whatLabel": "ما هي؟",
      "proLabel": "الميزة",
      "conLabel": "العيب",
      "whoLabel": "تناسب مين؟",
      "panels": {
        "icon": "☀️",
        "title": "الألواح الشمسية",
        "teaser": "تحول ضوء الشمس إلى كهرباء.",
        "classesLabel": "الفئات ذات الأولوية حالياً:",
        "what": "الجزء الذي يحول ضوء الشمس إلى كهرباء لنظامك.",
        "pro": "القدرة الأعلى للوح الواحد تعني غالباً عدد ألواح أقل لنفس الاحتياج.",
        "con": "اللوح الأعلى قدرة عادةً أكبر حجماً ووزناً لكل وحدة.",
        "who": "أي منزل أو منشأة — الفرق أساساً في عدد الألواح وحجمها، وليس فيمن تناسبه."
      },
      "battery": {
        "icon": "🔋",
        "title": "البطاريات",
        "teaser": "تخزن الكهرباء لاستخدامها عند انقطاع الكهرباء أو عدم توفر الشمس.",
        "chemistries": [
          {
            "name": "ليثيوم (LiFePO4)",
            "what": "تقنية بطارية حديثة لتخزين الكهرباء.",
            "pro": "عادةً عمر تشغيلي أطول وأداء أفضل، وتحتاج سعة أقل غالباً.",
            "con": "عادةً تكلفة معدات أولية أعلى.",
            "who": "الأنسب لمن يريد أفضل أداء على المدى الطويل."
          },
          {
            "name": "جل (GEL)",
            "what": "بطارية رصاص حمضي مغلقة لا تحتاج ماء.",
            "pro": "بدون صيانة يومية للماء، حل متوسط موثوق.",
            "con": "عمق استخدام أقل من الليثيوم عادةً.",
            "who": "تناسب من يفضل خياراً تقليدياً بصيانة أقل."
          },
          {
            "name": "رصاص حمضي (Lead-Acid)",
            "what": "تقنية بطارية تقليدية ومتوفرة على نطاق واسع.",
            "pro": "عادةً أقل تكلفة أولية.",
            "con": "تحتاج سعة أكبر غالباً وعمرها عادة أقصر.",
            "who": "تناسب الميزانيات المحدودة في البداية."
          }
        ]
      },
      "inverter": {
        "icon": "⚡",
        "title": "الإنفرترات",
        "teaser": "يدير الكهرباء بين الألواح والبطاريات وأجهزة المنزل.",
        "types": [
          {
            "name": "هايبرد (Hybrid)",
            "what": "يمكنه دمج الطاقة الشمسية والبطارية والشبكة/المولد حسب الموديل.",
            "pro": "مرونة أكبر في إدارة الطاقة، ويدعم الشحن من الكهرباء عند الحاجة.",
            "con": "قد يكون أعقد قليلاً من الأنواع الأخرى.",
            "who": "مناسب لمعظم المنازل والمنشآت التي تريد مرونة."
          },
          {
            "name": "أوف-جريد (Off-Grid)",
            "what": "مصمم للعمل بشكل مستقل تماماً عن الشبكة العامة.",
            "pro": "استقلالية كاملة عن الكهرباء العامة.",
            "con": "يحتاج بنك بطاريات محسوب بدقة، بدون دعم من الشبكة.",
            "who": "مناسب للمواقع البعيدة عن الشبكة أو من يريد استقلالية كاملة."
          },
          {
            "name": "أون-جريد (On-Grid)",
            "what": "مصمم للعمل مع الشبكة الكهربائية العامة.",
            "pro": "أبسط وغالباً أوفر حين لا يكون الاحتياط مطلوباً.",
            "con": "سلوك البطارية يعتمد على النظام — ليس كل إنفرتر أون-جريد يوفر طاقة احتياطية.",
            "who": "يناسب من يريد تقليل استهلاك الشبكة أساساً، وليس نظام احتياط."
          }
        ]
      }
    },
    "welcome": {
      "eyebrow": "المستشار الذكي للطاقة الشمسية",
      "titleLine1": "احسب نظامك الشمسي",
      "titleLine2": "في دقيقتين",
      "subtitle": "أدخل أجهزتك الكهربائية واحصل على توصية فنية متكاملة للألواح والبطاريات والمحول — والتركيب مجاني",
      "stat1Val": "1978",
      "stat1Label": "تأسست عام",
      "stat2Val": "48",
      "stat2Label": "عام خبرة",
      "stat3Val": "🎁",
      "stat3Label": "تركيب مجاني",
      "ctaPrimary": "ابدأ التقييم المجاني",
      "ctaSecondary": "كيف يعمل النظام؟"
    },
    "trust": {
      "readyTitle": "النظام جاهز لحساب احتياجك الآن",
      "readySubtitle": "حسابات فورية مبنية على استهلاكك الحقيقي"
    },
    "floatingActions": {
      "whatsappLabel": "تواصل معنا عبر واتساب",
      "whatsappMessage": "مرحباً أندوريا 🌞\n\nأرغب في الاستفسار عن حاسبة الطاقة الشمسية.",
      "facebookLabel": "تابع أندوريا على فيسبوك"
    },
    "miniPackage": {
      "specialBadge": "عرض خاص",
      "badge": "باقة التوفير",
      "title": "حل صغير للشحن اليومي",
      "specPanel": "☀️ لوح شمسي 30 واط",
      "specBattery": "🔋 بطارية 12 فولت",
      "specController": "⚡ وحدة تحكم شحن",
      "specUsb": "📱 شحن USB",
      "suitable": "مناسب لشحن الموبايل والباور بانك وأجهزة USB الصغيرة.",
      "unsuitable": "ليس نظاماً لتشغيل الأجهزة المنزلية الكبيرة — لا يشغّل ثلاجة أو مكيف أو تلفزيون أو طلمبة.",
      "cta": "اسأل عنها عبر واتساب",
      "waMessage": "مرحباً أندوريا 🌞\n\nأرغب في الاستفسار عن باقة التوفير بسعر 30$ (لوح 30 واط، بطارية 12 فولت، وحدة تحكم شحن، شحن USB) لشحن الأجهزة الصغيرة."
    },
    "referral": {
      "title": "جربت النظام أكثر من مرة؟",
      "body": "شارك الحاسبة مع 5 أشخاص ثم واصل تجربتك من حيث توقفت.",
      "shareCta": "مشاركة الحاسبة",
      "hint": "اضغط مشاركة لإرسال رابط الحاسبة — بياناتك المدخلة تبقى كما هي تماماً.",
      "shareMessage": "بستخدم حاسبة أندوريا للطاقة الشمسية عشان أحسب النظام المناسب لبيتي — بتاخد دقيقتين وبتديك توصية مجانية بدون أي التزام. جربها:"
    },
    "steps": {
      "profile": {
        "eyebrow": "الخطوة 1 من 11",
        "title": "بياناتك الشخصية",
        "subtitle": "نستخدمها لتجهيز عرضك وتقريرك الفني ومتابعة طلبك",
        "nameLabel": "الاسم الكامل",
        "namePlaceholder": "مثال: أحمد محمد",
        "mobileLabel": "رقم الموبايل",
        "whatsappSameTitle": "رقم الواتساب نفس رقم الموبايل",
        "whatsappSameSub": "ألغِ التفعيل لإدخال رقم واتساب مختلف",
        "whatsappPlaceholder": "رقم الواتساب مع مفتاح الدولة",
        "locationLabel": "أين تقيم حالياً؟",
        "locationPlaceholder": "اختر بلد إقامتك",
        "locationOther": "🌍 أخرى",
        "beneficiaryLabel": "النظام لمن؟",
        "beneficiaryMyself": "لنفسي",
        "beneficiaryFamily": "لعائلتي في السودان",
        "stateLabel": "الولاية",
        "statePlaceholder": "اختر ولايتك",
        "cityLabel": "المدينة",
        "cityPlaceholder": "اختر مدينتك",
        "cityPlaceholderNoState": "اختر ولايتك أولاً",
        "optional": "اختياري",
        "recipientNameLabel": "اسم المستفيد",
        "recipientNamePlaceholder": "اسم من سيستلم النظام في السودان",
        "recipientMobileLabel": "رقم موبايل المستفيد (السودان)",
        "recipientStateLabel": "ولاية المستفيد",
        "recipientStatePlaceholder": "اختر الولاية",
        "recipientCityLabel": "مدينة المستفيد",
        "recipientCityPlaceholderNoState": "اختر الولاية أولاً",
        "customerTypeLabel": "نوع العميل",
        "customerTypes": {
          "home_owner": "صاحب منزل",
          "business_owner": "صاحب عمل",
          "farmer": "مزارع",
          "clinic_owner": "صاحب عيادة",
          "engineer": "مهندس",
          "other": "أخرى"
        },
        "emailLabel": "البريد الإلكتروني",
        "emailPlaceholder": "example@email.com",
        "remainingFields": "متبقي {count} حقل مطلوب",
        "allFieldsComplete": "✓ جميع الحقول مكتملة",
        "next": "التالي"
      },
      "property": {
        "eyebrow": "الخطوة 2 من 11",
        "title": "ما نوع المكان؟",
        "subtitle": "اختر نوع المكان الذي تريد تزويده بالطاقة الشمسية",
        "shopTypeLabel": "ما نوع المحل التجاري؟",
        "next": "التالي",
        "types": {
          "house": "منزل",
          "apartment": "شقة",
          "shop": "محل تجاري",
          "office": "مكتب",
          "farm": "مزرعة",
          "clinic": "عيادة",
          "school": "مدرسة",
          "mosque": "مسجد",
          "workshop": "ورشة"
        },
        "shopTypes": {
          "grocery": "بقالة",
          "pharmacy": "صيدلية",
          "bakery": "مخبز",
          "restaurant": "مطعم",
          "cafe": "كافيه",
          "barber": "صالون حلاقة",
          "salon": "صالون تجميل",
          "mobile": "محل موبايلات"
        }
      },
      "basicInfo": {
        "eyebrow": "الخطوة 3 من 11",
        "title": "معلومات أساسية",
        "subtitle": "نستخدمها لتحديد النظام المثالي لموقعك",
        "outageLabel": "كم ساعة انقطاع كهرباء يومياً؟",
        "outage4": "أقل من 4 ساعات",
        "outage8": "4 – 8 ساعات",
        "outage16": "8 – 16 ساعة",
        "outage24": "لا توجد كهرباء",
        "expansionLabel": "هل تخطط للتوسعة مستقبلاً؟",
        "expansionTitle": "تركيب مكيف أو ضخة مياه مستقبلاً",
        "expansionSub": "سنصمم نظاماً يستوعب التوسعة بدون تغيير المحول",
        "next": "التالي — اختيار الأجهزة"
      },
      "devices": {
        "eyebrow": "الخطوة 4 من 11",
        "title": "أجهزتك الكهربائية",
        "subtitle": "اختر الأجهزة التي تريد تشغيلها بالطاقة الشمسية",
        "loadLabel": "إجمالي استهلاك أجهزتك يومياً",
        "dialHint": "اسحب أو مرر للدوران — اضغط للدخول",
        "peakLabel": "أعلى حمل متوقع",
        "deviceDailyEnergy": "≈ {wh} يومياً",
        "motorWarning": "⚠ الأجهزة ذات المحركات (طلمبات، مكيفات) تحتاج محولاً بقدرة سيرج عالية — سنحسب ذلك تلقائياً.",
        "qtyLabel": "العدد",
        "hoursLabel": "ساعات / يوم",
        "addedBadge": "مضاف ✓",
        "removeBtn": "إزالة",
        "calcButton": "حساب الاستهلاك",
        "calcButtonCount": "حساب {count} جهاز",
        "emptyState": "لا توجد أجهزة متاحة في هذه الفئة حالياً"
      },
      "summary": {
        "eyebrow": "الخطوة 5 من 11",
        "title": "ملخص استهلاكك",
        "subtitle": "بناءً على أجهزتك المختارة",
        "subtitleGreeting": "يا {name}، بناءً على استهلاك {place}",
        "arcUnit": "كيلوواط ساعة / يوم",
        "kpiDaily": "الطاقة اليومية",
        "kpiPeak": "ذروة الحمل",
        "kpiSurge": "حمل التشغيل (سيرج)",
        "kpiMonthly": "الاستهلاك الشهري",
        "breakdownTitle": "توزيع الاستهلاك حسب الجهاز",
        "breakdownEmpty": "لم تختر أي جهاز بعد",
        "next": "عرض التوصية الفنية ←"
      },
      "recommendation": {
        "eyebrow": "الخطوة 6 من 11",
        "title": "نظامك المقترح",
        "subtitle": "هذا النظام مبني على استهلاك أجهزتك واختياراتك.",
        "subtitleGreeting": "يا {name}، هذا هو النظام المناسب ل{place}",
        "batterySimTitle": "🌙 محاكاة البطارية الليلية",
        "next": "عرض توصيتك ←",
        "picker": {
          "panelTitle": "اختار قدرة اللوح التي تفضلها",
          "panelSubtitle": "القدرة الأعلى = ألواح أقل. القدرة الأقل = ألواح أكثر. الحاسبة تحسب العدد الفعلي المطلوب حسب احتياجك الحقيقي.",
          "batteryTitle": "اختار نوع البطارية",
          "batterySubtitle": "اختار تقنية البطارية التي تفضلها. المعدات النهائية دائماً تعتمد على المنتج الفعلي المتوفر.",
          "chargingTitle": "شحن البطارية من الكهرباء",
          "chargingSubtitle": "اختار الطريقة التي تفضلها لشحن البطارية.",
          "panelOptions": {
            "W310": {
              "label": "310 واط",
              "desc": "فئة قديمة واقتصادية — ستحتاج عدد ألواح أكبر لنفس الطاقة."
            },
            "W400": {
              "label": "400 واط",
              "desc": "فئة متوسطة شائعة، توازن معقول بين الحجم والعدد."
            },
            "W550": {
              "label": "550 واط",
              "desc": "حجم متوسط إلى كبير مناسب لمعظم المنازل."
            },
            "W585": {
              "label": "585 واط",
              "desc": "فئة قديمة/متوافقة — لا تزال خياراً حقيقياً وقابلاً للاستخدام."
            },
            "W590": {
              "label": "590 واط",
              "desc": "مناسب إذا كنت تفضل عددًا أكبر من الألواح بحجم أقل."
            },
            "W625": {
              "label": "625 واط",
              "desc": "خيار متوازن بين حجم اللوح وعدده."
            },
            "W715": {
              "label": "715 واط",
              "desc": "قدرة أعلى للوح الواحد، وقد تحتاج عدد ألواح أقل."
            }
          },
          "batteryOptions": {
            "LITHIUM": {
              "label": "ليثيوم / LiFePO4",
              "desc": "عمر أطول، أداء أفضل، يحتاج عدد/سعة أقل غالباً، لكنه أغلى."
            },
            "GEL": {
              "label": "جل (GEL)",
              "desc": "حل متوسط مناسب لبعض الاستخدامات، بدون صيانة يومية للماء."
            },
            "LEAD_ACID": {
              "label": "رصاص حمضي (Lead-Acid)",
              "desc": "خيار اقتصادي في البداية، لكنه يحتاج سعة أكبر وعمره عادة أقل."
            }
          },
          "chargingOptions": {
            "SOLAR_GRID": {
              "label": "شمس + شحن من الكهرباء",
              "desc": "محول هايبرد — الشمس هي المصدر الأساسي، والكهرباء تقدر تساعد في شحن البطارية عند الحاجة، حسب الموديل."
            },
            "SOLAR_ONLY": {
              "label": "شمس فقط",
              "desc": "محول أوف-جريد — البطارية تُشحن من الشمس فقط، بدون أي اتصال بالشبكة العامة."
            },
            "GRID_ONLY": {
              "label": "الشحن من الكهرباء فقط (بدون ألواح)",
              "desc": "بدون ألواح شمسية — البطارية تُشحن من الكهرباء العامة عبر محول هايبرد، للحصول على طاقة احتياطية بدون تركيب ألواح."
            }
          },
          "noSolarNote": "اخترت الشحن من الكهرباء بدون ألواح شمسية — لا حاجة لاختيار قدرة لوح في هذا الوضع.",
          "noSolarShortLabel": "بدون ألواح شمسية",
          "yourChoiceTitle": "اختيارك",
          "yourChoicePanel": "الألواح",
          "yourChoiceBattery": "البطارية",
          "yourChoiceCharging": "الشحن",
          "yourChoiceBackup": "هدف الاحتياط",
          "yourChoiceHours": "{hours} ساعة",
          "changeSelection": "🔄 تغيير الاختيار",
          "calculatedTitle": "احتياجك المحسوب"
        },
        "noSolar": {
          "title": "بدون ألواح شمسية",
          "spec": "طاقة احتياطية بشحن من الكهرباء",
          "why": "اخترت الشحن من الكهرباء بدون ألواح — البطارية تُشحن من الكهرباء العامة عبر المحول، وتوفر طاقة احتياطية بنفس الطريقة أثناء الانقطاع."
        },
        "panels": {
          "title": "الألواح الشمسية",
          "spec": "{count} × {watts}W",
          "why": "عدد الألواح المطلوب حسب احتياجك. (طاقة {arrayW} واط إجمالي، تُشحن خلال {psh} ساعات شمسية يومياً.)"
        },
        "battery": {
          "title": "بنك بطاريات {chemistry}",
          "spec": "{kwh} كيلوواط ساعة / {ah} أمبير ساعة",
          "why": "لتغطية فترة الانقطاع التي اخترتها (≈{backupHrs} ساعة)."
        },
        "inverter": {
          "title": "{type}",
          "spec": "{watts} واط",
          "why": "مناسب للحمل الذي حسبناه من أجهزتك. (ذروة {peakW}W، تشغيل {surgeVA}VA.)"
        },
        "mppt": {
          "title": "وحدة تحكم MPPT",
          "spec": "{amps} أمبير",
          "why": "تضمن أقصى كفاءة للشحن (20-30% أفضل من PWM) مع حماية كاملة للبطاريات."
        },
        "confidence": {
          "highLabel": "ثقة عالية",
          "goodLabel": "ثقة جيدة",
          "fairLabel": "ثقة متوسطة",
          "note": "بناءً على تحليل {count} جهاز، وبهوامش أمان قياسية معتمدة هندسياً (IEC 62548 / IEEE 1562).",
          "fairNote": "بناءً على تحليل {count} جهاز فقط. أضف بقية أجهزتك في الخطوة السابقة للحصول على حجم نظام أكثر دقة."
        },
        "expansion": {
          "activeTitle": "مصمم مع مساحة للتوسع مستقبلاً",
          "activeText": "وحدة تحكم MPPT بقدرة {mppt} أمبير والمحول بقدرة {inverter} واط يحملان هامشاً إضافياً، فتقدر تضيف ألواحاً أو بطاريات لاحقاً دون استبدال النظام الأساسي.",
          "suggestTitle": "تخطط للتوسع لاحقاً؟",
          "suggestText": "هذا النظام مصمم لأجهزتك الحالية. إذا أضفت أجهزة كبيرة مستقبلاً، تقدر أندوريا تعيد حساب حجم الألواح والبطاريات لك."
        },
        "compare": {
          "title": "المولد الديزل مقابل الطاقة الشمسية من أندوريا",
          "genLabel": "المولد الديزل",
          "solarLabel": "الطاقة الشمسية من أندوريا",
          "runningCost": "تكاليف التشغيل",
          "genRunningCostVal": "تكاليف وقود وصيانة مستمرة",
          "solarRunningCostVal": "بدون وقود — يعتمد على الطاقة الشمسية",
          "noise": "الضوضاء",
          "noisy": "عالية ومستمرة",
          "silent": "صامت",
          "fuel": "الاعتماد على الوقود",
          "fuelDependent": "يعتمد على توفر الوقود",
          "fuelFree": "لا يوجد — أشعة الشمس فقط"
        },
        "alternatives": {
          "title": "بدائل ممكنة لنفس احتياجك",
          "panelsExplanation": "يمكن استخدام أكثر من نوع من الألواح للوصول إلى الطاقة المطلوبة.",
          "panelsLabel": "خيارات فئة الألواح (بنفس سعة المصفوفة)",
          "panelItem": "{watts}W ← {count} لوح",
          "inverterNote": "{type} مناسب أيضاً لهذا النظام، حسب طريقة التشغيل التي تفضلها.",
          "batteryNote": "بطاريات الرصاص الحمضي والجل متوافقة أيضاً — تختلف السعة والمساحة المطلوبة. يتم تحديد نوع البطارية النهائي مع فريقنا بعد المراجعة الفنية."
        },
        "economic": {
          "sectionTitle": "ما بنبيعك أكبر نظام — بنحسب احتياجك ونرشح ليك الأنسب",
          "recommendedBadge": "الأنسب لاحتياجك",
          "otherBadge": "خيار آخر مناسب",
          "yourChoiceBadge": "اختيارك",
          "andoriaBadge": "اقتراح أندوريا",
          "economicAltBadge": "بديل اقتصادي",
          "panelsAt": "ألواح {watts}W × {count}",
          "yourChoiceDesc": "هذا هو التكوين بناءً على اختيارك.",
          "fewerPanelsDesc": "هذا الخيار يقلل عدد الألواح المطلوبة.",
          "morePanelsDesc": "هذا الخيار يستخدم ألواحاً أكثر بحجم أصغر لكل لوح."
        }
      },
      "packages": {
        "eyebrow": "الخطوة 7 من 11",
        "title": "احتياجك",
        "subtitle": "بناءً على الأجهزة التي اخترتها — وليس باقة عامة",
        "recommendedBadge": "⭐ موصى بها لك",
        "priceUnit": "شامل التركيب والضمان",
        "componentLine": "{qty}× {spec} {category} — {brand} {model}",
        "componentLineNoSpec": "{qty}× {category} — {brand} {model}",
        "selectBtnRecommended": "اختيار هذه الباقة ←",
        "selectBtnOutline": "تحديد",
        "systemSizeLabel": "نظام {kw} كيلوواط",
        "panelClassLabel": "ألواح شمسية فئة {watts}W",
        "assumptionsNote": "نقطة انطلاق فنية — العلامة التجارية والموديل والتفاصيل النهائية تُحدد معك بعد معاينة الموقع وحسب المتوفر.",
        "reqDailyLabel": "استهلاكك اليومي",
        "reqDailyDesc": "هذا هو استهلاك أجهزتك في اليوم.",
        "reqPeakLabel": "أعلى حمل",
        "reqPeakDesc": "أعلى حمل متوقع عند تشغيل الأجهزة معاً.",
        "reqSolarLabel": "الطاقة الشمسية المطلوبة",
        "reqSolarDesc": "القدرة المطلوبة من الألواح.",
        "reqBatteryLabel": "البطارية المطلوبة",
        "reqBatteryDesc": "السعة المطلوبة لفترة الانقطاع التي اخترتها.",
        "equipmentSectionLabel": "المعدات المقدرة لتلبية احتياجك",
        "featPanels": "{count} × لوح شمسي فئة {watts}W",
        "featBattery": "بنك بطاريات {kwh} كيلوواط ساعة — {chemistry}",
        "featInverter": "محول {w}W — {type}",
        "featBackup": "احتياط ≈{hours} ساعة حسب فترة الانقطاع المختارة",
        "featLoad": "استهلاك يومي {wh}، ذروة حمل {peak}",
        "next": "التالي — التركيب مجاني ←",
        "tiers": {
          "essential": {
            "tier": "أساسية",
            "name": "الباقة الأساسية",
            "desc": "مثالية للمنازل الصغيرة والميزانيات المحدودة. تُشغّل الثلاجة والمراوح والإضاءة لليلة كاملة.",
            "warranty": "شروط الضمان تُؤكد مع فريقنا قبل الطلب",
            "features": [
              "{panelCount} لوح شمسي — نوع البطارية يُؤكد مع فريقنا",
              "{batteryKwh} كيلوواط ساعة — احتياط 6-8 ساعات",
              "محول {inverterW}W — حماية أساسية",
              "موعد التركيب يُحدد معك بعد التأكيد",
              "شروط الضمان تُؤكد مع فريقنا"
            ]
          },
          "standard": {
            "tier": "قياسية",
            "name": "الباقة القياسية",
            "desc": "الأكثر مبيعاً. تدعم مكيف الإنفيرتر مع احتياط ليلة كاملة وقابلية للتوسعة.",
            "warranty": "شروط الضمان تُؤكد مع فريقنا قبل الطلب",
            "features": [
              "{panelCount} لوح شمسي — نوع البطارية يُؤكد مع فريقنا",
              "{batteryKwh} كيلوواط ساعة — احتياط {backupHrs} ساعة",
              "تدعم مكيف إنفيرتر 1.5 طن",
              "شاشة LCD لمراقبة النظام",
              "شروط الضمان تُؤكد مع فريقنا",
              "تركيب + تقرير تشغيل رسمي"
            ]
          },
          "premium": {
            "tier": "ممتازة",
            "name": "الباقة الممتازة",
            "desc": "الحل الأشمل للمنازل الكبيرة والأعمال التجارية. ليلتان احتياط مع مراقبة ذكية.",
            "warranty": "شروط الضمان تُؤكد مع فريقنا قبل الطلب",
            "features": [
              "{panelCount} لوح شمسي — نوع البطارية يُؤكد مع فريقنا",
              "{batteryKwh} كيلوواط ساعة — احتياط ليلتين",
              "مراقبة ذكية عبر التطبيق",
              "لوحة حماية كاملة MCB + SPD",
              "شروط الضمان تُؤكد مع فريقنا",
              "تركيب + تدريب + زيارة متابعة مجانية"
            ]
          }
        }
      },
      "savings": {
        "eyebrow": "الخطوة 8 من 11",
        "title": "التركيب مجاني",
        "subtitle": "خدمة متكاملة ضمن عرض أندوريا",
        "heroLabel": "التركيب مجاني",
        "heroSub": "التركيب الكامل ضمن العرض — بدون تكلفة إضافية",
        "monthly": "توفير شهري",
        "yearly": "توفير سنوي",
        "fiveYear": "توفير 5 سنوات",
        "genCost": "تكلفة مولد شهرياً",
        "paybackLabel": "مدة الاسترداد",
        "paybackNote": "النظام يسترد تكلفته خلال {months} شهراً — ثم التوفير صافي ربح",
        "next": "التالي — تجارب عملائنا ←",
        "items": [
          {
            "icon": "🔧",
            "title": "تركيب احترافي",
            "desc": "فريق مهندسينا يُركّب النظام كاملاً في الموقع — التثبيت والتوصيلات والإعدادات."
          },
          {
            "icon": "🚚",
            "title": "التوصيل ومواد التركيب",
            "desc": "هيكل تثبيت الألواح والكابلات وأجهزة الحماية — كل ذلك ضمن العرض بدون بند إضافي."
          },
          {
            "icon": "✅",
            "title": "التشغيل والاختبار",
            "desc": "يتم اختبار كل نظام وتسليمه مع تقرير تشغيل رسمي."
          },
          {
            "icon": "🎓",
            "title": "تدريب مجاني",
            "desc": "فريقنا يشرح لك تشغيل وصيانة نظامك قبل المغادرة."
          }
        ]
      },
      "trust": {
        "eyebrow": "الخطوة 9 من 11",
        "title": "تجارب عملائنا",
        "subtitle": "ننشر فقط آراء حقيقية من عملائنا — هذا القسم سينمو كلما جمعنا المزيد.",
        "testimonialsTitle": "ماذا قال عملاؤنا",
        "testimonialsPlaceholderTitle": "تجارب عملائنا الحقيقية قريباً",
        "testimonialsPlaceholderDesc": "نجمع آراء حقيقية من عملائنا لعرضها هنا قريباً.",
        "trustSignalsTitle": "ما يمكنك الاعتماد عليه",
        "next": "المتابعة لمراجعة الطلب ←",
        "items": [
          {
            "icon": "✓",
            "title": "نظامك أنت، وليس نظاماً عاماً",
            "desc": "الحساب مبني على احتياجك الفعلي — أجهزتك، ساعات تشغيلها، وفترة الانقطاع التي اخترتها."
          },
          {
            "icon": "✓",
            "title": "لا نفرض عليك ماركة معينة",
            "desc": "لا نلزمك بعلامة تجارية واحدة. المعدات النهائية تُختار حسب المتاح والجودة واحتياجك."
          },
          {
            "icon": "✓",
            "title": "المعدات النهائية تُحدد معك",
            "desc": "العلامة التجارية والموديل والتفاصيل النهائية تُحدد مع مهندس حسب المتاح والجودة واحتياجك."
          },
          {
            "icon": "✓",
            "title": "مساحة للتعديل",
            "desc": "يمكنك مناقشة أي تعديل على التوصية مباشرة مع المهندس."
          },
          {
            "icon": "✓",
            "title": "لا يوجد سعر مخفي داخل الحاسبة",
            "desc": "هذه الأداة لا تعرض سعر النظام أبداً — الأسعار تُناقش مباشرة مع فريقنا."
          }
        ],
        "testimonials": []
      },
      "review": {
        "eyebrow": "الخطوة 10 من 11",
        "title": "مراجعة توصيتك",
        "subtitleGreeting": "يا {name}، راجع توصية {place}",
        "buyerTitle": "👤 بياناتك",
        "recipientTitle": "🏠 بيانات المستفيد (السودان)",
        "packageTitle": "توصيتك الشمسية",
        "productsTitle": "المنتجات والخدمات",
        "totalLabel": "السعر الإجمالي",
        "installTimeLabel": "مدة التركيب المتوقعة",
        "installTimeValue": "تُحدد معك بعد التأكيد",
        "confirmedTitle": "✅ توصيتك جاهزة",
        "next": "التالي — تواصل مع فريقنا ←",
        "rows": {
          "name": "الاسم",
          "phone": "الهاتف",
          "location": "بلد الإقامة",
          "systemFor": "النظام لـ",
          "systemForMyself": "نفسه",
          "systemForFamily": "العائلة في السودان",
          "state": "الولاية",
          "city": "المدينة"
        },
        "installation": "التركيب",
        "delivery": "التوصيل",
        "free": "مجاني",
        "confidence": [
          "✔ نظامك يغطي {backupHrs} ساعة احتياطية ليلاً",
          "✔ المحول يتحمل جميع أحمال التشغيل ({peakW}W)",
          "✔ النظام مصمم لاستيعاب التوسعة المستقبلية (مكيف / طلمبة)",
          "✔ النظام يتضمن هامش 25% للتوسعة المستقبلية",
          "✔ الألواح تُنتج طاقة كافية خلال {psh} ساعات شمسية يومياً",
          "✔ المعدات النهائية تُحدد معك قبل التركيب",
          "✔ التركيب مجاني ضمن عرضك",
          "✔ دعم فني مباشر عبر واتساب"
        ]
      },
      "payment": {
        "eyebrow": "الخطوة 11 من 11",
        "title": "تواصل مع فريق أندوريا",
        "subtitle": "فريقنا جاهز لمناقشة تفاصيل نظامك والأسعار الحالية",
        "placeholderTitle": "التركيب مجاني ضمن عرضك",
        "placeholderDesc": "فريق المبيعات سيناقش معك التفاصيل الفنية والأسعار الحالية في السوق مباشرة عبر واتساب.",
        "waNotConfiguredTitle": "قناة واتساب غير مُفعّلة بعد",
        "waNotConfiguredDesc": "يرجى الاتصال بنا مباشرة حالياً — سيتم تفعيل التواصل عبر واتساب قريباً.",
        "whatsappBtn": "ناقش نظامك مع فريق أندوريا",
        "callBtn": "اتصل بمهندس الآن",
        "facebookCta": "تابع أندوريا على فيسبوك",
        "facebookCtaSub": "شاهد أعمالنا وتابع الجديد",
        "pdfBtn": "تحميل التقرير PDF",
        "shareBtn": "مشاركة النتيجة",
        "restart": "← إعادة الحساب من البداية",
        "successTitle": "✅ تم الدفع بنجاح — شكراً لك",
        "orderNumber": "رقم الطلب: {orderNumber}",
        "contactEta": "سيتواصل معك فريقنا خلال 24 ساعة",
        "failureTitle": "⚠️ تعذر إتمام الدفع",
        "failureDefaultReason": "حدث خطأ أثناء معالجة الدفع. حاول مرة أخرى أو تواصل معنا عبر واتساب.",
        "retryBtn": "إعادة المحاولة",
        "readyTitle": "جاهز نجهز نظامك؟",
        "readyText": "أرسل نتيجتك لمهندس من فريق أندوريا وناقش النظام المناسب لك.",
        "engineerBtn": "تواصل مع المهندس",
        "invoiceBtn": "اطلب فاتورتك الآن عبر واتساب"
      }
    },
    "offer": {
      "badge": "عرض لفترة محدودة",
      "titleRed": "التركيب مجاناً",
      "titleGold": "لأول 100 عميل",
      "remaining": "متبقي {count}",
      "remainingUnavailable": "عرض التركيب المجاني",
      "cta": "احجز تواصلك مع المهندس الآن"
    },
    "savings": {
      "title": "شوف التوفير الحقيقي في الوقود",
      "dailyFuelCostLabel": "تكلفة الوقود اليومية التقريبية",
      "dailySavingsLabel": "التوفير المحتمل يومياً",
      "monthlySavingsLabel": "التوفير المحتمل شهرياً",
      "yearlySavingsLabel": "التوفير المحتمل سنوياً",
      "framing": "توفير تقديري في تكلفة الوقود",
      "disclaimer": "التوفير تقديري بناءً على استهلاكك اليومي المحسوب ({dailyKwh} كيلوواط ساعة/يوم)، وسعر ديزل {gallonPrice}$ / جالون أمريكي (≈{dieselPrice}$ / لتر)، وافتراض استهلاك مولد نموذجي {literPerKwh} لتر/كيلوواط ساعة، ونسبة تغطية شمسية تقديرية {coveragePct}%. هذا تقدير لتوفير تكلفة الوقود، وليس صفر تكلفة تشغيل — الطاقة الشمسية أيضاً لها تكاليف صيانة ومعدات."
    },
    "finalTrust": {
      "sinceLabel": "منذ {year}"
    },
    "validation": {
      "nameRequired": "يرجى إدخال الاسم الكامل",
      "mobileInvalid": "يرجى إدخال رقم موبايل صحيح (مثال: {example})",
      "locationRequired": "يرجى اختيار بلد إقامتك",
      "beneficiaryRequired": "يرجى تحديد المستفيد من النظام",
      "stateRequired": "يرجى اختيار ولايتك",
      "recipientNameRequired": "يرجى إدخال اسم المستفيد",
      "recipientMobileInvalid": "يرجى إدخال رقم موبايل سوداني صحيح للمستفيد (مثال: 9XXXXXXXX)",
      "recipientStateRequired": "يرجى اختيار ولاية المستفيد",
      "propertyRequired": "يرجى اختيار نوع المكان أولاً",
      "shopTypeRequired": "يرجى اختيار نوع المحل التجاري"
    },
    "units": {
      "hour": "ساعة",
      "minute": "دقيقة",
      "allDay": "24 ساعة (طوال اليوم)",
      "am": "ص",
      "pm": "م",
      "sunrise": "شروق"
    },
    "whatsapp": {
      "greetingEngineer": "مرحباً أندوريا 🌞\n\nأرغب في مناقشة نظام الطاقة الشمسية المقترح مع مهندس من أندوريا.",
      "greetingInvoice": "مرحباً أندوريا 🌞\n\nأرغب في طلب الفاتورة/عرض السعر عبر واتساب.",
      "buyerTitle": "👤 بيانات المشتري:",
      "name": "الاسم",
      "phone": "الهاتف",
      "residence": "بلد الإقامة",
      "systemFor": "النظام لـ",
      "systemForFamily": "العائلة في السودان",
      "systemForMyself": "نفسه",
      "recipientTitle": "🏠 بيانات المستفيد (السودان):",
      "state": "الولاية",
      "city": "المدينة",
      "propertyType": "نوع المكان",
      "summaryTitle": "📋 ملخص التقييم:",
      "dailyConsumption": "الاستهلاك اليومي",
      "peakLoad": "ذروة الحمل",
      "appliances": "الأجهزة",
      "systemTitle": "⚡ النظام الموصى به:",
      "package": "الباقة",
      "panels": "الألواح",
      "noSolarPanels": "بدون ألواح شمسية (شحن من الكهرباء)",
      "battery": "البطاريات",
      "chargingMode": "شحن البطارية",
      "inverter": "المحول",
      "backupPeriod": "فترة الاحتياط",
      "hours": "ساعة",
      "assumptionsNote": "نقطة انطلاق فنية — العلامة التجارية والموديل والتفاصيل النهائية تُحدد بعد معاينة الموقع وحسب المتوفر.",
      "expectedPrice": "السعر المتوقع",
      "reportLink": "📄 رابط التقرير",
      "reportLinkPending": "(سيتم إرساله عبر واتساب)",
      "closing": "أرجو التواصل للتفاصيل.",
      "preparedBy": "Prepared by",
      "appName": "Andoria Solar Smart Advisor",
      "poweredBy": "Powered by"
    },
    "share": {
      "title": "نتيجة التقييم الشمسي — أندوريا",
      "resultIntro": "نتيجة تقييمي على مستشار أندوريا الشمسي:",
      "consumption": "الاستهلاك",
      "perDay": "/ يوم",
      "panels": "لوح شمسي × {watts}W",
      "battery": "بطاريات",
      "backup": "احتياط",
      "backupUnit": "ساعة ليلاً",
      "copied": "✅ تم نسخ النتيجة!"
    },
    "pdf": {
      "reportTitle": "تقرير تقييم الطاقة الشمسية",
      "buyerInfoTitle": "بيانات المشتري",
      "name": "الاسم",
      "phone": "رقم الهاتف",
      "residence": "بلد الإقامة",
      "state": "الولاية",
      "city": "المدينة",
      "date": "تاريخ التقييم",
      "propertyType": "نوع المكان",
      "recipientInfoTitle": "بيانات المستفيد (السودان)",
      "consumptionTitle": "ملخص الاستهلاك",
      "dailyConsumption": "الاستهلاك اليومي",
      "peakLoad": "ذروة الحمل",
      "surgeLoad": "حمل التشغيل (سيرج)",
      "monthlyConsumption": "الاستهلاك الشهري",
      "systemTitle": "النظام الموصى به",
      "productsTitle": "المنتجات والمواصفات",
      "package": "الباقة",
      "price": "السعر",
      "noPackage": "لم يتم اختيار باقة بعد",
      "savingsTitle": "التركيب مجاني ضمن العرض",
      "monthlySaving": "توفير شهري",
      "yearlySaving": "توفير سنوي",
      "fiveYearSaving": "توفير 5 سنوات",
      "tenYearSaving": "توفير 10 سنوات",
      "assumptionsNote": "نقطة انطلاق فنية — التفاصيل النهائية تُحدد بعد معاينة الموقع.",
      "freeInstall": "✅ تركيب مجاني",
      "freeDelivery": "🚚 توصيل مجانية",
      "support": "🛠️ دعم فني مستمر",
      "whatsappLabel": "واتساب",
      "poweredBy": "Powered by"
    },
    "crm": {
      "meta": {
        "title": "نظام أندوريا الداخلي"
      },
      "nav": {
        "dashboard": "لوحة التحكم",
        "requests": "الطلبات",
        "inventory": "المخزون",
        "packages": "الباقات",
        "projects": "المشاريع",
        "settings": "الإعدادات"
      },
      "projectStatus": {
        "DRAFT": "مسودة",
        "QUOTATION_SENT": "تم إرسال العرض",
        "APPROVED": "تمت الموافقة",
        "DEPOSIT_PAID": "تم دفع العربون",
        "INSTALLATION_STARTED": "بدأ التركيب",
        "INSTALLATION_COMPLETE": "اكتمل التركيب",
        "FINAL_PAYMENT_PENDING": "بانتظار الدفعة النهائية",
        "COMPLETED": "مكتمل",
        "CANCELLED": "ملغى"
      },
      "categories": {
        "SOLAR_PANEL": "الألواح الشمسية",
        "BATTERY": "البطاريات",
        "INVERTER": "المحولات",
        "MOUNTING_STRUCTURE": "الهياكل التركيبية",
        "CABLE": "الكابلات",
        "ACCESSORY": "الإكسسوارات",
        "ELECTRICAL_COMPONENT": "المكونات الكهربائية"
      },
      "stockMovement": {
        "PURCHASE_IN": "استلام من أمر شراء",
        "MANUAL_IN": "إدخال مخزون",
        "MANUAL_OUT": "إخراج مخزون",
        "RESERVED": "محجوز لمشروع",
        "RELEASED": "تحرير الحجز",
        "DEDUCTED": "خصم للتركيب",
        "RETURNED": "إعادة للمخزون"
      },
      "inventoryDashboard": {
        "title": "المخزون",
        "subtitle": "مستويات المخزون والقيمة والنشاط في كل الفئات",
        "statProducts": "المنتجات النشطة",
        "statUnits": "إجمالي الوحدات",
        "statValue": "قيمة المخزون (التكلفة)",
        "statLowStock": "مخزون منخفض",
        "categoryBreakdown": "حسب الفئة",
        "viewAllProducts": "عرض كل المنتجات ←",
        "pricingGapTitle": "التسعير المباشر يحتاج بيانات إضافية",
        "pricingGapText": "الحاسبة تستخدم حاليًا أسعارًا تقديرية للفئات: {categories}. أضف منتجًا نشطًا وحدد سعته (واط أو كيلوواط/ساعة) في هذه الفئة لتفعيل التسعير المباشر.",
        "lowStockAlerts": "تنبيهات المخزون المنخفض",
        "minStockShort": "الحد الأدنى",
        "recentActivity": "أحدث نشاط المخزون",
        "noActivity": "لا توجد حركات مخزون بعد."
      },
      "inventoryList": {
        "title": "المنتجات",
        "subtitle": "كل عنصر في المخزون، بجميع الفئات",
        "addProduct": "إضافة منتج",
        "searchPlaceholder": "ابحث برقم المنتج أو الماركة أو الموديل",
        "statusActive": "نشط",
        "statusArchived": "مؤرشف",
        "colSku": "رقم المنتج",
        "colProduct": "المنتج",
        "colCategory": "الفئة",
        "colStock": "المخزون",
        "colPrice": "السعر",
        "colStatus": "الحالة",
        "emptyTitle": "لا توجد منتجات",
        "emptyText": "جرّب بحثاً أو فلتراً مختلفاً، أو أضف أول منتج لديك."
      },
      "inventoryDetail": {
        "notFoundTitle": "المنتج غير موجود",
        "backToProducts": "→ العودة للمنتجات",
        "lowStock": "مخزون منخفض",
        "editProduct": "تعديل المنتج",
        "archiveProduct": "أرشفة",
        "restoreProduct": "استعادة",
        "sectionInfo": "بيانات المنتج",
        "category": "الفئة",
        "brand": "الماركة",
        "model": "الموديل",
        "specification": "المواصفات",
        "capacityWatts": "السعة",
        "capacityKwh": "السعة",
        "unit": "الوحدة",
        "warranty": "الضمان",
        "supplier": "المورد",
        "notes": "ملاحظات",
        "sectionPricing": "التسعير",
        "purchasePrice": "سعر الشراء",
        "sellingPrice": "سعر البيع",
        "margin": "الهامش",
        "sectionStock": "المخزون",
        "currentStock": "المخزون الحالي",
        "reserved": "محجوز",
        "available": "متاح",
        "minStock": "الحد الأدنى للمخزون",
        "adjustStock": "تعديل المخزون",
        "stockIn": "إدخال",
        "stockOut": "إخراج",
        "quantity": "الكمية",
        "reasonPlaceholder": "السبب (مثال: تالف، جرد، استلام يدوي)",
        "applyAdjustment": "تطبيق التعديل",
        "sectionHistory": "سجل المخزون",
        "noHistory": "لا توجد حركات مخزون بعد.",
        "manualAdjustment": "تعديل يدوي"
      },
      "inventoryForm": {
        "editTitle": "تعديل المنتج",
        "addTitle": "إضافة منتج",
        "noSupplier": "بدون مورد",
        "sectionInfo": "بيانات المنتج",
        "sku": "رقم المنتج",
        "category": "الفئة",
        "brand": "الماركة",
        "model": "الموديل",
        "specification": "المواصفات",
        "capacityWatts": "القدرة (واط)",
        "capacityKwh": "السعة (كيلوواط/ساعة)",
        "capacityHint": "تُستخدم لتسعير هذا المنتج مباشرة ضمن باقات الحاسبة للعملاء.",
        "unit": "الوحدة",
        "warranty": "الضمان",
        "notes": "ملاحظات",
        "sectionPricing": "التسعير",
        "purchasePrice": "سعر الشراء",
        "sellingPrice": "سعر البيع",
        "sectionStock": "المخزون",
        "currentStock": "المخزون الحالي",
        "stockHint": "ملاحظة",
        "stockHintText": "لا يمكن تغيير الكمية إلا من صفحة المنتج عبر تعديل المخزون — لضمان اكتمال سجل الحركات.",
        "initialQuantity": "الكمية الأولية",
        "minStock": "الحد الأدنى للمخزون",
        "sectionSupplier": "المورد",
        "supplier": "المورد",
        "save": "حفظ",
        "cancel": "إلغاء",
        "skuTaken": "رقم المنتج هذا مستخدم بالفعل."
      },
      "packageList": {
        "title": "الباقات",
        "subtitle": "باقات مبنية من منتجات المخزون، بتسعير مباشر",
        "addPackage": "إضافة باقة",
        "statusDraft": "مسودة",
        "statusActive": "نشطة",
        "statusArchived": "مؤرشفة",
        "colName": "الباقة",
        "colSpecs": "المواصفات",
        "colPrice": "السعر",
        "colStatus": "الحالة",
        "componentsCount": "مكونات",
        "emptyTitle": "لا توجد باقات بعد",
        "emptyText": "أنشئ أول باقة من منتجات المخزون — ستظهر كخيار في حاسبة العملاء بمجرد نشرها كـ«نشطة»."
      },
      "packageForm": {
        "editTitle": "تعديل الباقة",
        "addTitle": "إضافة باقة",
        "notFoundTitle": "الباقة غير موجودة",
        "backToPackages": "→ العودة للباقات",
        "sectionInfo": "بيانات الباقة",
        "nameEn": "الاسم (إنجليزي)",
        "nameAr": "الاسم (عربي)",
        "descEn": "الوصف (إنجليزي)",
        "descAr": "الوصف (عربي)",
        "status": "الحالة",
        "statusDraft": "مسودة — غير ظاهرة للعملاء",
        "statusActive": "نشطة — ظاهرة للعملاء",
        "statusArchived": "مؤرشفة",
        "sectionComponents": "المكونات",
        "addComponent": "إضافة منتج",
        "qty": "الكمية",
        "noComponents": "لم تتم إضافة مكونات بعد.",
        "sectionPricing": "التسعير",
        "componentsSubtotal": "إجمالي المكونات",
        "installationCost": "تكلفة التركيب",
        "defaultMarginPct": "نسبة الهامش الافتراضية %",
        "totalPrice": "السعر الإجمالي (يظهر للعميل)",
        "save": "حفظ",
        "cancel": "إلغاء"
      },
      "projectList": {
        "title": "المشاريع",
        "subtitle": "مشاريع التنفيذ المحوّلة من الطلبات المعتمدة",
        "colRequest": "الطلب",
        "colPackage": "الباقة",
        "colPrice": "السعر",
        "colStatus": "الحالة",
        "colUpdated": "آخر تحديث",
        "emptyTitle": "لا توجد مشاريع بعد",
        "emptyText": "حوّل طلبًا مؤهلاً إلى مشروع من صفحة تفاصيله لبدء متابعته هنا."
      },
      "settings": {
        "title": "الإعدادات",
        "subtitle": "بيانات الشركة، الفروع، وحسابات الموظفين",
        "accessDeniedTitle": "للمدراء فقط",
        "accessDeniedText": "الإعدادات متاحة فقط لحسابات المالك والمدير.",
        "tabCompany": "الشركة",
        "tabBranches": "الفروع",
        "tabUsers": "المستخدمون",
        "companySectionInfo": "بيانات الشركة",
        "companyName": "اسم الشركة",
        "companyAddress": "العنوان",
        "companyEmail": "البريد الإلكتروني",
        "companyPhone": "الهاتف",
        "companyWhatsapp": "واتساب",
        "currency": "العملة",
        "taxPct": "الضريبة %",
        "timezone": "المنطقة الزمنية",
        "logoUrl": "رابط الشعار",
        "readOnlyNotice": "فقط المالك/المدير/المحاسب يمكنهم تعديل بيانات الشركة.",
        "save": "حفظ",
        "cancel": "إلغاء",
        "saved": "تم الحفظ",
        "branchesCount": "{count} فروع",
        "addBranch": "إضافة فرع",
        "editBranch": "تعديل الفرع",
        "colName": "الاسم",
        "colManager": "المدير المسؤول",
        "colPhone": "الهاتف",
        "colStatus": "الحالة",
        "colRole": "الدور",
        "colBranch": "الفرع",
        "active": "نشط",
        "archived": "مؤرشف",
        "deactivated": "معطّل",
        "deactivate": "تعطيل",
        "reactivate": "تفعيل",
        "restore": "استعادة",
        "confirmArchiveUser": "أرشفة هذا الحساب؟ سيتم تعطيله وإخفاؤه من القائمة. يمكن التراجع عن هذا من فلتر المؤرشف.",
        "createUserNotice": "يتم إنشاء حسابات الموظفين الجدد عبر لوحة تحكم Supabase (Authentication ← Add User) — التسجيل الذاتي معطّل بالتصميم. بعد إنشاء الحساب، يمكنك إدارة دوره وفرعه وحالته من هنا مباشرة."
      },
      "projectDetail": {
        "notFoundTitle": "المشروع غير موجود",
        "backToProjects": "→ العودة للمشاريع",
        "viewRequest": "عرض الطلب الأصلي",
        "sectionInfo": "بيانات المشروع",
        "package": "الباقة",
        "sellingPrice": "سعر البيع",
        "sectionStatus": "مراحل التنفيذ",
        "advanceTo": "الانتقال إلى",
        "cancelProject": "إلغاء المشروع",
        "confirmCancel": "إلغاء هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.",
        "pipelineEnded": "وصل هذا المشروع إلى مرحلته النهائية.",
        "sectionTimeline": "السجل الزمني",
        "timelineEmpty": "لا يوجد نشاط بعد.",
        "timelineCreated": "تم إنشاء المشروع"
      },
      "common": {
        "search": "بحث",
        "searchPlaceholder": "ابحث بالاسم أو الهاتف أو رقم الطلب",
        "filterAll": "الكل",
        "back": "رجوع",
        "backToRequests": "→ العودة للطلبات",
        "customer": "العميل",
        "status": "الحالة",
        "package": "الباقة",
        "price": "السعر",
        "property": "نوع العقار",
        "phone": "الهاتف",
        "location": "الموقع",
        "createdAt": "تاريخ الإنشاء",
        "updatedAt": "آخر تحديث",
        "callCustomer": "اتصال بالعميل",
        "whatsappCustomer": "واتساب العميل",
        "viewDetails": "عرض التفاصيل",
        "noResults": "لا توجد طلبات مطابقة لبحثك.",
        "systemForMyself": "لنفسه",
        "systemForFamily": "لعائلته في السودان"
      },
      "dashboard": {
        "title": "لوحة التحكم",
        "subtitle": "نظرة شاملة على أداء العمل — المسار، الإيرادات، وما يحتاج انتباهك",
        "statTotal": "إجمالي الطلبات",
        "statToday": "اليوم",
        "statWeek": "هذا الأسبوع",
        "statMonth": "هذا الشهر",
        "statNew": "جديدة",
        "statInProgress": "قيد المعالجة",
        "statCompleted": "مكتملة",
        "statCancelled": "ملغاة",
        "statRevenue": "الإيرادات",
        "statProfit": "الأرباح",
        "statOutstanding": "المستحق",
        "statProjectsActive": "مشاريع قيد التنفيذ",
        "statProjectsDone": "مشاريع مكتملة",
        "chartTitle": "الطلبات — آخر 7 أيام",
        "chartSub": "المعدل اليومي",
        "recentTitle": "أحدث النشاطات",
        "activityNewRequest": "طلب جديد",
        "activityProjectUpdate": "تحديث مشروع",
        "lowStockTitle": "مخزون منخفض",
        "topPerformersTitle": "الأكثر أداءً",
        "topSalesperson": "الأفضل مبيعاً",
        "topBranch": "الفرع الأفضل",
        "viewAll": "عرض الكل ←",
        "emptyTitle": "لا توجد طلبات بعد",
        "emptyText": "ستظهر هنا تلقائياً جلسات الحاسبة المكتملة بمجرد وصول العميل لخطوة الدفع."
      },
      "requests": {
        "title": "الطلبات",
        "subtitle": "كل عميل محتمل نتج عن حاسبة الطاقة الشمسية الذكية",
        "colId": "الرقم",
        "colCustomer": "العميل",
        "colProperty": "نوع العقار",
        "colPackage": "الباقة",
        "colPrice": "السعر",
        "colStatus": "الحالة",
        "colDate": "تاريخ الإنشاء",
        "emptyTitle": "لا توجد طلبات بعد",
        "emptyText": "بمجرد أن يكمل عميل الحاسبة، سيظهر طلبه هنا."
      },
      "detail": {
        "notFoundTitle": "الطلب غير موجود",
        "notFoundText": "هذا الطلب غير موجود أو ربما تم حذفه.",
        "sectionCustomer": "بيانات العميل",
        "sectionRecipient": "المستفيد (السودان)",
        "sectionSystem": "النظام الموصى به",
        "sectionProject": "مشروع التنفيذ",
        "projectStatus": "حالة المشروع",
        "viewProject": "عرض المشروع ←",
        "convertHint": "هذا الطلب جاهز ليصبح مشروعًا — سيتم متابعة عرض السعر والعربون والتركيب والدفعات من هناك.",
        "convertToProject": "تحويل إلى مشروع",
        "sectionSales": "تعيين المبيعات",
        "sectionSendSales": "الإرسال لفرع المبيعات",
        "sectionPdf": "عرض السعر PDF",
        "sectionStatus": "الحالة",
        "sectionTimeline": "السجل الزمني",
        "changeStatusLabel": "الانتقال للمرحلة التالية",
        "pipelineEnded": "وصل هذا الطلب إلى مرحلته النهائية — لا يمكن تغيير الحالة بعد الآن.",
        "cancelRequest": "إلغاء الطلب",
        "panels": "الألواح الشمسية",
        "battery": "البطارية",
        "inverter": "المحول",
        "backupHours": "ساعات الاحتياط",
        "dailyConsumption": "الاستهلاك اليومي",
        "consumption": "الاستهلاك الشهري",
        "peakLoad": "ذروة الحمل",
        "systemSize": "حجم النظام",
        "whatsapp": "واتساب",
        "city": "المدينة",
        "address": "العنوان",
        "mapsLink": "خرائط جوجل",
        "openMap": "فتح الخريطة ←",
        "branch": "الفرع",
        "assignedSales": "مسؤول المبيعات",
        "priority": "الأولوية",
        "notes": "ملاحظات",
        "notePlaceholder": "أضف ملاحظة حول هذا الطلب…",
        "addNote": "إضافة ملاحظة",
        "timelineEmpty": "لا يوجد نشاط بعد.",
        "quickEdit": "تعديل الطلب",
        "quickCopyReport": "نسخ التقرير",
        "quickSendKober": "إرسال لكوبر",
        "quickSendMadani": "إرسال لمدني",
        "quickChangeStatus": "تغيير الحالة",
        "sendToKober": "إرسال لمبيعات كوبر",
        "sendToMadani": "إرسال لمبيعات مدني",
        "copyReport": "نسخ التقرير",
        "reportCopied": "✓ تم نسخ التقرير",
        "reportCopyFailed": "تعذّر النسخ — حاول مجدداً",
        "viewPdf": "عرض عرض السعر PDF",
        "sharePdf": "مشاركة PDF",
        "pdfNotGenerated": "لم يتم إنشاء عرض السعر بعد."
      },
      "status": {
        "new_lead": "عميل محتمل جديد",
        "contacted": "تم التواصل",
        "qualified": "مؤهّل",
        "quotation_sent": "تم إرسال العرض",
        "negotiation": "قيد التفاوض",
        "deposit_paid": "تم دفع العربون",
        "installation_scheduled": "التركيب مجدول",
        "installed": "تم التركيب",
        "completed": "مكتمل",
        "cancelled": "ملغى"
      },
      "priority": {
        "low": "منخفضة",
        "medium": "متوسطة",
        "high": "عالية",
        "urgent": "عاجلة"
      },
      "branches": {
        "kober": "الخرطوم (كوبر)",
        "madani": "مدني"
      },
      "actor": {
        "promptMessage": "اسمك (يظهر على الطلبات التي تُحدّثها):",
        "unknown": "الموظف",
        "setName": "حدّد اسمك",
        "signOutConfirm": "تسجيل الخروج من نظام أندوريا الداخلي؟",
        "inactiveAccount": "تم إيقاف هذا الحساب. تواصل مع المسؤول."
      },
      "roles": {
        "OWNER": "المالك",
        "ADMIN": "مدير",
        "SALES": "مبيعات",
        "WAREHOUSE": "مخزن",
        "ACCOUNTANT": "محاسب",
        "INSTALLER": "فني تركيب",
        "VIEWER": "مشاهد"
      },
      "edit": {
        "title": "تعديل الطلب",
        "sectionLocation": "الموقع",
        "sectionSystem": "النظام والباقة",
        "sectionSales": "تعيين المبيعات",
        "country": "الدولة",
        "countryCode": "مفتاح الدولة",
        "phone": "الهاتف",
        "whatsapp": "واتساب",
        "city": "المدينة",
        "address": "العنوان",
        "mapsLink": "رابط خرائط جوجل",
        "propertyType": "نوع العقار",
        "consumption": "الاستهلاك الشهري (كيلوواط ساعة)",
        "systemSize": "حجم النظام",
        "branch": "الفرع",
        "branchUnassigned": "غير مُعيَّن",
        "assignedSales": "مسؤول المبيعات",
        "priority": "الأولوية",
        "notes": "ملاحظات",
        "save": "حفظ",
        "cancel": "إلغاء"
      },
      "validation": {
        "required": "هذا الحقل مطلوب",
        "phoneInvalid": "أدخل رقم هاتف صحيح للدولة المختارة",
        "emailInvalid": "أدخل بريداً إلكترونياً صحيحاً",
        "urlInvalid": "أدخل رابطاً صحيحاً يبدأ بـ http:// أو https://",
        "numberInvalid": "أدخل رقماً أكبر من أو يساوي 0"
      },
      "report": {
        "newSolarRequest": "طلب طاقة شمسية جديد",
        "requestId": "رقم الطلب",
        "customer": "العميل",
        "phone": "الهاتف",
        "whatsapp": "واتساب",
        "email": "البريد الإلكتروني",
        "country": "الدولة",
        "city": "المدينة",
        "address": "العنوان",
        "googleMaps": "خرائط جوجل",
        "propertyType": "نوع العقار",
        "monthlyConsumption": "الاستهلاك الشهري",
        "recommendedPackage": "الباقة الموصى بها",
        "systemSize": "حجم النظام",
        "battery": "البطارية",
        "inverter": "المحول",
        "estimatedPrice": "السعر التقديري",
        "customerNotes": "ملاحظات العميل",
        "created": "تاريخ الإنشاء",
        "generatedBy": "تم الإنشاء بواسطة نظام أندوريا الداخلي",
        "locationNotProvided": "الموقع غير متوفر",
        "noNotes": "—"
      },
      "timeline": {
        "created": "تم إنشاء الطلب من حاسبة الطاقة الشمسية الذكية",
        "statusChanged": "تغيّرت الحالة من {from} إلى {to}",
        "note": "{text}",
        "by": "بواسطة {user}",
        "fieldActions": {
          "nameUpdated": "تم تحديث اسم العميل: {before} ← {after}",
          "phoneUpdated": "تم تحديث الهاتف: {before} ← {after}",
          "whatsappUpdated": "تم تحديث واتساب: {before} ← {after}",
          "emailUpdated": "تم تحديث البريد الإلكتروني: {before} ← {after}",
          "countryUpdated": "تم تحديث الدولة: {before} ← {after}",
          "cityUpdated": "تم تحديث المدينة: {before} ← {after}",
          "addressUpdated": "تم تحديث العنوان: {before} ← {after}",
          "mapsUpdated": "تم تحديث رابط خرائط جوجل",
          "propertyUpdated": "تم تحديث نوع العقار: {before} ← {after}",
          "consumptionUpdated": "تم تحديث الاستهلاك: {before} ← {after} كيلوواط ساعة",
          "packageChanged": "تم تغيير الباقة: {before} ← {after}",
          "systemSizeUpdated": "تم تحديث حجم النظام: {before} ← {after}",
          "batteryUpdated": "تم تحديث البطارية: {before} ← {after} كيلوواط ساعة",
          "inverterUpdated": "تم تحديث المحول: {before} ← {after} واط",
          "priceUpdated": "تم تحديث السعر: {before} ← {after}",
          "notesUpdated": "تم تحديث الملاحظات",
          "branchChanged": "تم تغيير الفرع: {before} ← {after}",
          "assignedSalesChanged": "تم تغيير مسؤول المبيعات: {before} ← {after}",
          "priorityChanged": "تم تغيير الأولوية: {before} ← {after}"
        }
      }
    }
  },
  en: {
    "meta": {
      "title": "Andoria — Smart Solar Advisor",
      "description": "Andoria — Smart Solar Advisor"
    },
    "brand": {
      "tagline": "DIESEL ENGINES & SOLAR SOLUTIONS",
      "poweredBy": "Powered by",
      "since": "Since {year}"
    },
    "langSwitcher": {
      "ar": "🇸🇦 العربية",
      "en": "🇺🇸 English"
    },
    "loading": {
      "text": "Loading the Smart Advisor..."
    },
    "nav": {
      "back": "Back"
    },
    "batteryChemistry": {
      "LITHIUM": "Lithium (LiFePO4)",
      "LEAD_ACID": "Lead-Acid",
      "GEL": "GEL"
    },
    "inverterType": {
      "HYBRID": "Hybrid inverter",
      "OFF_GRID": "Off-grid inverter",
      "ON_GRID": "Grid-tied inverter"
    },
    "inverterPhase": {
      "single": "single-phase",
      "three": "three-phase"
    },
    "calcBasis": {
      "title": "How did we calculate your system?",
      "devices": "Your selected appliances ({count})",
      "hours": "Their operating hours",
      "daily": "Their daily consumption ({wh})",
      "peak": "Peak load ({peak})",
      "backup": "Your selected outage hours ({hours} hours)",
      "solar": "Peak sun hours used in the calculation ({psh}/day)"
    },
    "education": {
      "sectionTitle": "Know the Difference Before You Choose",
      "sectionSubtitle": "A simple explanation to help you understand your choice.",
      "tapHint": "Tap to see the difference",
      "disclaimer": "General educational information, not a product listing. Exact equipment, brand, and model are confirmed with our team after technical review, based on current availability.",
      "whatLabel": "What is it?",
      "proLabel": "Advantage",
      "conLabel": "Disadvantage",
      "whoLabel": "Who it suits",
      "panels": {
        "icon": "☀️",
        "title": "Solar Panels",
        "teaser": "Turns sunlight into electricity.",
        "classesLabel": "Current priority classes:",
        "what": "The part that turns sunlight into electricity for your system.",
        "pro": "A higher wattage per panel usually means fewer panels for the same energy need.",
        "con": "A higher-wattage panel is usually physically larger and heavier per unit.",
        "who": "Any home or business — the difference is mainly in panel count and size, not who it suits."
      },
      "battery": {
        "icon": "🔋",
        "title": "Batteries",
        "teaser": "Stores electricity for when the power is out or the sun isn't available.",
        "chemistries": [
          {
            "name": "Lithium (LiFePO4)",
            "what": "A modern battery technology for storing electricity.",
            "pro": "Usually a longer service life, better performance, and often needs less capacity.",
            "con": "Usually a higher upfront equipment cost.",
            "who": "Best for those who want the best long-term performance."
          },
          {
            "name": "GEL",
            "what": "A sealed lead-acid battery that needs no water top-ups.",
            "pro": "No day-to-day water maintenance, a reliable middle-ground option.",
            "con": "Usually a shallower usable depth than lithium.",
            "who": "Suits those who prefer a traditional option with less maintenance."
          },
          {
            "name": "Lead-Acid",
            "what": "A traditional, widely available battery technology.",
            "pro": "Usually the lowest upfront cost.",
            "con": "Usually needs more capacity and typically has a shorter service life.",
            "who": "Suits tighter starting budgets."
          }
        ]
      },
      "inverter": {
        "icon": "⚡",
        "title": "Inverters",
        "teaser": "Manages electricity between the panels, the batteries, and your home's appliances.",
        "types": [
          {
            "name": "Hybrid",
            "what": "Can integrate solar, battery, and grid/generator power, depending on the model.",
            "pro": "More flexible energy management, and can support grid-assisted charging.",
            "con": "Can be slightly more complex than other types.",
            "who": "Suits most homes and businesses that want flexibility."
          },
          {
            "name": "Off-Grid",
            "what": "Designed to run standalone, independent of the public grid.",
            "pro": "Complete independence from the public grid.",
            "con": "Needs a carefully sized battery bank, with no grid to fall back on.",
            "who": "Suits remote sites or anyone who wants full independence."
          },
          {
            "name": "On-Grid",
            "what": "Designed to work together with the electrical grid.",
            "pro": "Simpler and often more affordable where grid backup isn't needed.",
            "con": "Battery behavior depends on the system — not every on-grid inverter provides backup power.",
            "who": "Suits sites primarily aiming to offset grid usage, not backup power."
          }
        ]
      }
    },
    "welcome": {
      "eyebrow": "Smart Solar Energy Advisor",
      "titleLine1": "Size your solar system",
      "titleLine2": "in two minutes",
      "subtitle": "Enter your appliances and get a complete technical recommendation for panels, batteries, and inverter — installation is free",
      "stat1Val": "1978",
      "stat1Label": "Established",
      "stat2Val": "48",
      "stat2Label": "Years of experience",
      "stat3Val": "🎁",
      "stat3Label": "Free installation",
      "ctaPrimary": "Start your free assessment",
      "ctaSecondary": "How does it work?"
    },
    "trust": {
      "readyTitle": "Ready to calculate your requirement now",
      "readySubtitle": "Instant calculations based on your real usage"
    },
    "floatingActions": {
      "whatsappLabel": "Contact us on WhatsApp",
      "whatsappMessage": "Hello Andoria 🌞\n\nI'd like to ask about the solar calculator.",
      "facebookLabel": "Follow ANDORIA on Facebook"
    },
    "miniPackage": {
      "specialBadge": "Special Offer",
      "badge": "Saver Package",
      "title": "A small solution for daily charging",
      "specPanel": "☀️ 30W solar panel",
      "specBattery": "🔋 12V battery",
      "specController": "⚡ Charge controller",
      "specUsb": "📱 USB charging",
      "suitable": "Suits charging your phone, a power bank, and small USB devices.",
      "unsuitable": "Not a system for large household appliances — it will not run a refrigerator, AC unit, TV, or water pump.",
      "cta": "Ask about it on WhatsApp",
      "waMessage": "Hello Andoria 🌞\n\nI'd like to ask about the $30 Saver Package (30W panel, 12V battery, charge controller, USB charging) for charging small devices."
    },
    "referral": {
      "title": "Tried the calculator a few times?",
      "body": "Share the calculator with 5 people, then continue where you left off.",
      "shareCta": "Share the calculator",
      "hint": "Tap Share to send the calculator link — your progress stays exactly as it is.",
      "shareMessage": "I'm using Andoria's solar calculator to size a solar system for my home — it takes about 2 minutes and gives a free, no-obligation recommendation. Try it:"
    },
    "steps": {
      "profile": {
        "eyebrow": "Step 1 of 11",
        "title": "Your details",
        "subtitle": "We use these to prepare your quote, technical report, and follow up on your order",
        "nameLabel": "Full name",
        "namePlaceholder": "e.g. Ahmed Mohammed",
        "mobileLabel": "Mobile number",
        "whatsappSameTitle": "WhatsApp number is the same as mobile",
        "whatsappSameSub": "Turn off to enter a different WhatsApp number",
        "whatsappPlaceholder": "WhatsApp number with country code",
        "locationLabel": "Where do you currently live?",
        "locationPlaceholder": "Choose your country of residence",
        "locationOther": "🌍 Other",
        "beneficiaryLabel": "Who is this system for?",
        "beneficiaryMyself": "Myself",
        "beneficiaryFamily": "My family in Sudan",
        "stateLabel": "State",
        "statePlaceholder": "Choose your state",
        "cityLabel": "City",
        "cityPlaceholder": "Choose your city",
        "cityPlaceholderNoState": "Choose a state first",
        "optional": "optional",
        "recipientNameLabel": "Recipient name",
        "recipientNamePlaceholder": "Name of who will receive the system in Sudan",
        "recipientMobileLabel": "Recipient mobile (Sudan)",
        "recipientStateLabel": "Recipient state",
        "recipientStatePlaceholder": "Choose the state",
        "recipientCityLabel": "Recipient city",
        "recipientCityPlaceholderNoState": "Choose a state first",
        "customerTypeLabel": "Customer type",
        "customerTypes": {
          "home_owner": "Home owner",
          "business_owner": "Business owner",
          "farmer": "Farmer",
          "clinic_owner": "Clinic owner",
          "engineer": "Engineer",
          "other": "Other"
        },
        "emailLabel": "Email address",
        "emailPlaceholder": "example@email.com",
        "remainingFields": "{count} required fields remaining",
        "allFieldsComplete": "✓ All fields complete",
        "next": "Next"
      },
      "property": {
        "eyebrow": "Step 2 of 11",
        "title": "What type of place?",
        "subtitle": "Choose the type of place you want to power with solar energy",
        "shopTypeLabel": "What type of shop?",
        "next": "Next",
        "types": {
          "house": "House",
          "apartment": "Apartment",
          "shop": "Commercial Shop",
          "office": "Office",
          "farm": "Farm",
          "clinic": "Clinic",
          "school": "School",
          "mosque": "Mosque",
          "workshop": "Workshop"
        },
        "shopTypes": {
          "grocery": "Grocery",
          "pharmacy": "Pharmacy",
          "bakery": "Bakery",
          "restaurant": "Restaurant",
          "cafe": "Cafe",
          "barber": "Barber Shop",
          "salon": "Beauty Salon",
          "mobile": "Mobile Phone Shop"
        }
      },
      "basicInfo": {
        "eyebrow": "Step 3 of 11",
        "title": "Basic information",
        "subtitle": "We use this to size the ideal system for your location",
        "outageLabel": "How many hours of power outage per day?",
        "outage4": "Less than 4 hours",
        "outage8": "4 – 8 hours",
        "outage16": "8 – 16 hours",
        "outage24": "No electricity at all",
        "expansionLabel": "Planning to expand in the future?",
        "expansionTitle": "Installing an AC unit or water pump later",
        "expansionSub": "We'll design a system that accommodates expansion without changing the inverter",
        "next": "Next — choose devices"
      },
      "devices": {
        "eyebrow": "Step 4 of 11",
        "title": "Your electrical devices",
        "subtitle": "Choose the devices you want to run on solar power",
        "loadLabel": "Your total daily appliance consumption",
        "dialHint": "Drag or scroll to spin — tap to enter",
        "peakLabel": "Expected peak load",
        "deviceDailyEnergy": "≈ {wh} daily",
        "motorWarning": "⚠ Motor-driven devices (pumps, AC units) need an inverter with high surge capacity — we'll calculate that automatically.",
        "qtyLabel": "Qty",
        "hoursLabel": "Hours / day",
        "addedBadge": "Added ✓",
        "removeBtn": "Remove",
        "calcButton": "Calculate consumption",
        "calcButtonCount": "Calculate {count} devices",
        "emptyState": "No devices available in this category yet"
      },
      "summary": {
        "eyebrow": "Step 5 of 11",
        "title": "Your consumption summary",
        "subtitle": "Based on your selected devices",
        "subtitleGreeting": "{name}, based on your {place}'s consumption",
        "arcUnit": "kilowatt-hours / day",
        "kpiDaily": "Daily energy",
        "kpiPeak": "Peak load",
        "kpiSurge": "Starting load (surge)",
        "kpiMonthly": "Monthly consumption",
        "breakdownTitle": "Consumption breakdown by device",
        "breakdownEmpty": "No devices selected yet",
        "next": "View technical recommendation →"
      },
      "recommendation": {
        "eyebrow": "Step 6 of 11",
        "title": "Your Proposed System",
        "subtitle": "This system is based on your appliances' consumption and your choices.",
        "subtitleGreeting": "{name}, this is the right system for your {place}",
        "batterySimTitle": "🌙 Overnight battery simulation",
        "next": "View your recommendation →",
        "picker": {
          "panelTitle": "Choose the panel size you prefer",
          "panelSubtitle": "Higher wattage means fewer panels; lower wattage means more panels. The calculator works out the actual number required for your real electricity need.",
          "batteryTitle": "Choose the battery type",
          "batterySubtitle": "Choose the battery technology you prefer. Final equipment always depends on the actual product available.",
          "chargingTitle": "Charging the battery from the grid",
          "chargingSubtitle": "Choose how you'd like the battery charged.",
          "panelOptions": {
            "W310": {
              "label": "310W",
              "desc": "An older, budget-friendly class — you'll need more panels for the same energy."
            },
            "W400": {
              "label": "400W",
              "desc": "A common mid-size class, a reasonable balance of size and count."
            },
            "W550": {
              "label": "550W",
              "desc": "A solid mid-to-large size for most homes."
            },
            "W585": {
              "label": "585W",
              "desc": "A legacy/compatibility size — still a real, usable option."
            },
            "W590": {
              "label": "590W",
              "desc": "Good if you prefer more panels at a smaller individual size."
            },
            "W625": {
              "label": "625W",
              "desc": "A balanced option between panel size and panel count."
            },
            "W715": {
              "label": "715W",
              "desc": "Higher power per panel — you may need fewer panels."
            }
          },
          "batteryOptions": {
            "LITHIUM": {
              "label": "Lithium / LiFePO4",
              "desc": "Usually a longer service life and better performance, and often needs less quantity/capacity — but usually costs more upfront."
            },
            "GEL": {
              "label": "GEL",
              "desc": "A middle-ground option suited to certain uses, with no day-to-day water maintenance."
            },
            "LEAD_ACID": {
              "label": "Lead-Acid",
              "desc": "Usually the lowest starting cost, but typically needs more capacity and usually has a shorter service life."
            }
          },
          "chargingOptions": {
            "SOLAR_GRID": {
              "label": "Solar + Grid Charging",
              "desc": "A Hybrid inverter — solar is the main source, with the grid able to help charge the battery when needed, depending on the model."
            },
            "SOLAR_ONLY": {
              "label": "Solar Only",
              "desc": "An Off-Grid inverter — the battery is charged from solar alone, with no connection to the public grid."
            },
            "GRID_ONLY": {
              "label": "Grid Only (No Solar Panels)",
              "desc": "No solar array — the battery is charged from the public grid through a Hybrid inverter, for backup power without an installed panel array."
            }
          },
          "noSolarNote": "You chose grid charging with no solar panels — there's no panel size to choose in this mode.",
          "noSolarShortLabel": "No solar panels",
          "yourChoiceTitle": "Your Choice",
          "yourChoicePanel": "Panel",
          "yourChoiceBattery": "Battery",
          "yourChoiceCharging": "Charging",
          "yourChoiceBackup": "Backup target",
          "yourChoiceHours": "{hours} hours",
          "changeSelection": "🔄 Change selection",
          "calculatedTitle": "Your Calculated Requirement"
        },
        "noSolar": {
          "title": "No Solar Panels",
          "spec": "Grid-charged battery backup",
          "why": "You chose grid charging without solar — the battery is charged from the public grid through the inverter, and delivers backup power the same way during an outage."
        },
        "panels": {
          "title": "Solar Panels",
          "spec": "{count} × {watts}W",
          "why": "The number of panels needed for your requirement. (Total array power {arrayW}W, recharges in {psh} peak sun hours/day.)"
        },
        "battery": {
          "title": "{chemistry} Battery Bank",
          "spec": "{kwh} kWh / {ah} Ah",
          "why": "To cover the backup period you selected (≈{backupHrs} hours)."
        },
        "inverter": {
          "title": "{type}",
          "spec": "{watts} W",
          "why": "Sized for the load we calculated from your appliances. (Peak {peakW}W, starting load {surgeVA}VA.)"
        },
        "mppt": {
          "title": "MPPT Charge Controller",
          "spec": "{amps} A",
          "why": "Ensures maximum charging efficiency (20-30% better than PWM) with full battery protection."
        },
        "confidence": {
          "highLabel": "High confidence",
          "goodLabel": "Good confidence",
          "fairLabel": "Fair confidence",
          "note": "Based on {count} devices analyzed and sized with industry-standard safety margins (IEC 62548 / IEEE 1562).",
          "fairNote": "Based on {count} device(s) analyzed. Add more of your devices in the previous step for a more precise system size."
        },
        "expansion": {
          "activeTitle": "Designed with room to grow",
          "activeText": "Your {mppt}A MPPT controller and {inverter}W inverter carry extra headroom, so you can add panels or battery capacity later without replacing the core system.",
          "suggestTitle": "Planning to expand later?",
          "suggestText": "This system is sized for your current devices. If you add major appliances down the road, Andoria can re-size the panel array and battery bank for you."
        },
        "compare": {
          "title": "Diesel generator vs. Andoria solar",
          "genLabel": "Diesel generator",
          "solarLabel": "Andoria solar",
          "runningCost": "Running costs",
          "genRunningCostVal": "Ongoing fuel and maintenance costs",
          "solarRunningCostVal": "No fuel — uses solar energy",
          "noise": "Noise",
          "noisy": "Loud, constant",
          "silent": "Silent",
          "fuel": "Fuel dependency",
          "fuelDependent": "Depends on fuel supply",
          "fuelFree": "None — sunlight only"
        },
        "alternatives": {
          "title": "Possible alternatives for the same requirement",
          "panelsExplanation": "More than one panel type can reach the same required energy.",
          "panelsLabel": "Panel class options (same array size)",
          "panelItem": "{watts}W → {count} panels",
          "inverterNote": "{type} is also suitable for this system, depending on how you want it to run.",
          "batteryNote": "Lead-Acid and GEL batteries are also compatible — capacity and footprint will differ. Final chemistry is confirmed with our team after technical review."
        },
        "economic": {
          "sectionTitle": "We don't sell you the biggest system — we calculate what you need and recommend what fits",
          "recommendedBadge": "Recommended for your needs",
          "otherBadge": "Another suitable option",
          "yourChoiceBadge": "Your choice",
          "andoriaBadge": "Andoria's suggestion",
          "economicAltBadge": "Economic alternative",
          "panelsAt": "{watts}W panels × {count}",
          "yourChoiceDesc": "This is the configuration based on what you selected.",
          "fewerPanelsDesc": "This option reduces the number of panels required.",
          "morePanelsDesc": "This option uses more panels at a smaller individual size."
        }
      },
      "packages": {
        "eyebrow": "Step 7 of 11",
        "title": "Your Requirement",
        "subtitle": "Based on the appliances you selected — not a generic package",
        "recommendedBadge": "⭐ Recommended for you",
        "priceUnit": "installation and warranty included",
        "componentLine": "{qty}× {spec} {category} — {brand} {model}",
        "componentLineNoSpec": "{qty}× {category} — {brand} {model}",
        "selectBtnRecommended": "Select this package →",
        "selectBtnOutline": "Select",
        "systemSizeLabel": "{kw} kW system",
        "panelClassLabel": "{watts}W-class solar panels",
        "assumptionsNote": "A technical starting point — brand, model, and final configuration are confirmed with you after a site assessment, based on what's available.",
        "reqDailyLabel": "Daily consumption",
        "reqDailyDesc": "This is what your appliances use in a day.",
        "reqPeakLabel": "Estimated peak load",
        "reqPeakDesc": "The expected peak when appliances run together.",
        "reqSolarLabel": "Required solar capacity",
        "reqSolarDesc": "The capacity needed from the panels.",
        "reqBatteryLabel": "Required battery",
        "reqBatteryDesc": "The capacity needed for your selected backup period.",
        "equipmentSectionLabel": "Estimated equipment to meet this",
        "featPanels": "{count} × {watts}W-class solar panels",
        "featBattery": "{kwh} kWh battery bank — {chemistry}",
        "featInverter": "{w}W inverter — {type}",
        "featBackup": "≈{hours} hours of backup for your selected outage period",
        "featLoad": "{wh} daily consumption, {peak} peak load",
        "next": "Next — Free Installation →",
        "tiers": {
          "essential": {
            "tier": "Essential",
            "name": "Essential Package",
            "desc": "Ideal for small homes and limited budgets. Runs the fridge, fans, and lighting through a full night.",
            "warranty": "Warranty terms confirmed with our team before order",
            "features": [
              "{panelCount} solar panels — battery chemistry confirmed with our team",
              "{batteryKwh} kWh — 6-8 hour backup",
              "{inverterW}W inverter — basic protection",
              "Installation scheduled with you after confirmation",
              "Warranty terms confirmed with our team"
            ]
          },
          "standard": {
            "tier": "Standard",
            "name": "Standard Package",
            "desc": "Our best seller. Supports an inverter AC unit with a full night's backup and room to expand.",
            "warranty": "Warranty terms confirmed with our team before order",
            "features": [
              "{panelCount} solar panels — battery chemistry confirmed with our team",
              "{batteryKwh} kWh — {backupHrs} hour backup",
              "Supports a 1.5-ton inverter AC unit",
              "LCD screen for system monitoring",
              "Warranty terms confirmed with our team",
              "Installation + official commissioning report"
            ]
          },
          "premium": {
            "tier": "Premium",
            "name": "Premium Package",
            "desc": "The complete solution for large homes and businesses. Two nights of backup with smart monitoring.",
            "warranty": "Warranty terms confirmed with our team before order",
            "features": [
              "{panelCount} solar panels — battery chemistry confirmed with our team",
              "{batteryKwh} kWh — two nights of backup",
              "Smart monitoring via app",
              "Full protection panel — MCB + SPD",
              "Warranty terms confirmed with our team",
              "Installation + training + free follow-up visit"
            ]
          }
        }
      },
      "savings": {
        "eyebrow": "Step 8 of 11",
        "title": "Free Installation",
        "subtitle": "A complete service included in Andoria's offer",
        "heroLabel": "FREE INSTALLATION",
        "heroSub": "Full installation included in the offer — no additional cost",
        "monthly": "Monthly savings",
        "yearly": "Yearly savings",
        "fiveYear": "5-year savings",
        "genCost": "Generator cost per month",
        "paybackLabel": "Payback period",
        "paybackNote": "The system pays for itself in {months} months — after that, savings are pure profit",
        "next": "Next — Customer experiences →",
        "items": [
          {
            "icon": "🔧",
            "title": "Professional installation",
            "desc": "Our engineering team installs and commissions the full system on-site — mounting, wiring, and configuration."
          },
          {
            "icon": "🚚",
            "title": "Delivery & mounting materials",
            "desc": "Panel mounting structure, cabling, and protection devices included — no separate line item."
          },
          {
            "icon": "✅",
            "title": "Commissioning & testing",
            "desc": "Every system is tested and handed over with an official commissioning report."
          },
          {
            "icon": "🎓",
            "title": "Free training",
            "desc": "Our team walks you through operating and maintaining your system before they leave."
          }
        ]
      },
      "trust": {
        "eyebrow": "Step 9 of 11",
        "title": "Customer Experiences",
        "subtitle": "We only publish real feedback from real customers — this section grows as we collect it.",
        "testimonialsTitle": "What our customers say",
        "testimonialsPlaceholderTitle": "Real testimonials coming soon",
        "testimonialsPlaceholderDesc": "We're collecting real feedback from our installations to share here.",
        "trustSignalsTitle": "What you can count on",
        "next": "Continue to review →",
        "items": [
          {
            "icon": "✓",
            "title": "Your system, not a generic one",
            "desc": "The calculation is based on your actual requirement — your appliances, your hours, your selected backup period."
          },
          {
            "icon": "✓",
            "title": "No forced brand",
            "desc": "We don't lock you into one manufacturer. Final equipment is chosen based on availability, quality, and your needs."
          },
          {
            "icon": "✓",
            "title": "Final equipment, confirmed with you",
            "desc": "Brand, model, and exact configuration are confirmed with an engineer based on availability, quality, and your requirement."
          },
          {
            "icon": "✓",
            "title": "Room to adjust",
            "desc": "You can discuss changes to the recommendation directly with the engineer."
          },
          {
            "icon": "✓",
            "title": "No hidden price in the calculator",
            "desc": "This tool never shows a system price — pricing is discussed directly with our team."
          }
        ],
        "testimonials": []
      },
      "review": {
        "eyebrow": "Step 10 of 11",
        "title": "Review your recommendation",
        "subtitleGreeting": "{name}, review your {place} recommendation",
        "buyerTitle": "👤 Your information",
        "recipientTitle": "🏠 Recipient information (Sudan)",
        "packageTitle": "Your solar recommendation",
        "productsTitle": "Products & services",
        "totalLabel": "Total price",
        "installTimeLabel": "Estimated installation time",
        "installTimeValue": "Scheduled with you after confirmation",
        "confirmedTitle": "✅ Your recommendation is ready",
        "next": "Next — talk to our team →",
        "rows": {
          "name": "Name",
          "phone": "Phone",
          "location": "Country of residence",
          "systemFor": "System for",
          "systemForMyself": "Myself",
          "systemForFamily": "Family in Sudan",
          "state": "State",
          "city": "City"
        },
        "installation": "Installation",
        "delivery": "Delivery",
        "free": "Free",
        "confidence": [
          "✔ Your system covers {backupHrs} backup hours overnight",
          "✔ The inverter handles all starting loads ({peakW}W)",
          "✔ The system is designed to accommodate future expansion (AC unit / pump)",
          "✔ The system includes a 25% margin for future expansion",
          "✔ The panels produce enough energy within {psh} peak sun hours per day",
          "✔ Final equipment is confirmed with you before installation",
          "✔ Free installation is included in your offer",
          "✔ Direct technical support via WhatsApp"
        ]
      },
      "payment": {
        "eyebrow": "Step 11 of 11",
        "title": "Talk to Andoria",
        "subtitle": "Our team is ready to discuss your system and current market pricing",
        "placeholderTitle": "Free installation is part of your offer",
        "placeholderDesc": "Our sales team will discuss technical details and current market pricing with you directly via WhatsApp.",
        "waNotConfiguredTitle": "WhatsApp isn't set up yet",
        "waNotConfiguredDesc": "Please contact us directly for now — WhatsApp handoff will be enabled shortly.",
        "whatsappBtn": "Discuss Your System With ANDORIA",
        "callBtn": "Call an engineer now",
        "facebookCta": "Follow ANDORIA on Facebook",
        "facebookCtaSub": "See our work and follow what's new",
        "pdfBtn": "Download PDF report",
        "shareBtn": "Share result",
        "restart": "→ Restart calculation",
        "successTitle": "✅ Payment successful — thank you",
        "orderNumber": "Order number: {orderNumber}",
        "contactEta": "Our team will contact you within 24 hours",
        "failureTitle": "⚠️ Payment could not be completed",
        "failureDefaultReason": "An error occurred while processing payment. Try again or contact us on WhatsApp.",
        "retryBtn": "Retry payment",
        "readyTitle": "Ready to prepare your system?",
        "readyText": "Send your result to an ANDORIA engineer and discuss the right system for you.",
        "engineerBtn": "Talk to the Engineer",
        "invoiceBtn": "Request Your Invoice on WhatsApp"
      }
    },
    "offer": {
      "badge": "Limited-time offer",
      "titleRed": "Free Installation",
      "titleGold": "for the first 100 customers",
      "remaining": "{count} remaining",
      "remainingUnavailable": "Free installation offer",
      "cta": "Book your engineer conversation now"
    },
    "savings": {
      "title": "See the real fuel savings",
      "dailyFuelCostLabel": "Approximate daily fuel cost",
      "dailySavingsLabel": "Potential daily savings",
      "monthlySavingsLabel": "Potential monthly savings",
      "yearlySavingsLabel": "Potential yearly savings",
      "framing": "Estimated fuel-cost savings",
      "disclaimer": "Estimated based on your calculated daily consumption ({dailyKwh} kWh/day), a diesel price of ${gallonPrice}/US gallon (≈${dieselPrice}/liter), a typical generator fuel use of {literPerKwh} L/kWh, and an estimated {coveragePct}% solar coverage. This is an estimated fuel-cost saving, not zero operating cost — solar still has maintenance and equipment costs."
    },
    "finalTrust": {
      "sinceLabel": "Since {year}"
    },
    "validation": {
      "nameRequired": "Please enter your full name",
      "mobileInvalid": "Please enter a valid mobile number (e.g. {example})",
      "locationRequired": "Please choose your country of residence",
      "beneficiaryRequired": "Please choose who the system is for",
      "stateRequired": "Please choose your state",
      "recipientNameRequired": "Please enter the recipient's name",
      "recipientMobileInvalid": "Please enter a valid Sudan mobile number for the recipient (e.g. 9XXXXXXXX)",
      "recipientStateRequired": "Please choose the recipient's state",
      "propertyRequired": "Please choose a property type first",
      "shopTypeRequired": "Please choose a shop type"
    },
    "units": {
      "hour": "hour",
      "minute": "minute",
      "allDay": "24 hours (all day)",
      "am": "AM",
      "pm": "PM",
      "sunrise": "sunrise"
    },
    "whatsapp": {
      "greetingEngineer": "Hello Andoria 🌞\n\nI'd like to discuss the proposed solar system with an engineer from Andoria.",
      "greetingInvoice": "Hello Andoria 🌞\n\nI'd like to request the invoice/quote via WhatsApp.",
      "buyerTitle": "👤 Buyer information:",
      "name": "Name",
      "phone": "Phone",
      "residence": "Country of residence",
      "systemFor": "System for",
      "systemForFamily": "Family in Sudan",
      "systemForMyself": "Myself",
      "recipientTitle": "🏠 Recipient information (Sudan):",
      "state": "State",
      "city": "City",
      "propertyType": "Property type",
      "summaryTitle": "📋 Assessment summary:",
      "dailyConsumption": "Daily consumption",
      "peakLoad": "Peak load",
      "appliances": "Appliances",
      "systemTitle": "⚡ Recommended system:",
      "package": "Package",
      "panels": "Panels",
      "noSolarPanels": "No solar panels (grid-charged)",
      "battery": "Batteries",
      "chargingMode": "Battery charging",
      "inverter": "Inverter",
      "backupPeriod": "Backup period",
      "hours": "hours",
      "assumptionsNote": "A technical starting point — brand, model, and final configuration are confirmed after a site assessment, based on what's available.",
      "expectedPrice": "Expected price",
      "reportLink": "📄 Report link",
      "reportLinkPending": "(will be sent via WhatsApp)",
      "closing": "Please get in touch for details.",
      "preparedBy": "Prepared by",
      "appName": "Andoria Solar Smart Advisor",
      "poweredBy": "Powered by"
    },
    "share": {
      "title": "Solar Assessment Result — Andoria",
      "resultIntro": "My assessment result from the Andoria Solar Advisor:",
      "consumption": "Consumption",
      "perDay": "/ day",
      "panels": "solar panels × {watts}W",
      "battery": "batteries",
      "backup": "backup",
      "backupUnit": "hours overnight",
      "copied": "✅ Result copied!"
    },
    "pdf": {
      "reportTitle": "Solar Energy Assessment Report",
      "buyerInfoTitle": "Buyer Information",
      "name": "Name",
      "phone": "Phone number",
      "residence": "Country of residence",
      "state": "State",
      "city": "City",
      "date": "Assessment date",
      "propertyType": "Property type",
      "recipientInfoTitle": "Recipient Information (Sudan)",
      "consumptionTitle": "Consumption Summary",
      "dailyConsumption": "Daily consumption",
      "peakLoad": "Peak load",
      "surgeLoad": "Starting load (surge)",
      "monthlyConsumption": "Monthly consumption",
      "systemTitle": "Recommended System",
      "productsTitle": "Products & Specifications",
      "package": "Package",
      "price": "Price",
      "noPackage": "No package selected yet",
      "savingsTitle": "Free Installation Included",
      "monthlySaving": "Monthly savings",
      "yearlySaving": "Yearly savings",
      "fiveYearSaving": "5-year savings",
      "tenYearSaving": "10-year savings",
      "assumptionsNote": "A technical starting point — final equipment is confirmed after a site visit.",
      "freeInstall": "✅ Free installation",
      "freeDelivery": "🚚 Free delivery",
      "support": "🛠️ Ongoing technical support",
      "whatsappLabel": "WhatsApp",
      "poweredBy": "Powered by"
    },
    "crm": {
      "meta": {
        "title": "Andoria CRM"
      },
      "nav": {
        "dashboard": "Dashboard",
        "requests": "Requests",
        "inventory": "Inventory",
        "packages": "Packages",
        "projects": "Projects",
        "settings": "Settings"
      },
      "projectStatus": {
        "DRAFT": "Draft",
        "QUOTATION_SENT": "Quotation Sent",
        "APPROVED": "Approved",
        "DEPOSIT_PAID": "Deposit Paid",
        "INSTALLATION_STARTED": "Installation Started",
        "INSTALLATION_COMPLETE": "Installation Complete",
        "FINAL_PAYMENT_PENDING": "Final Payment Pending",
        "COMPLETED": "Completed",
        "CANCELLED": "Cancelled"
      },
      "categories": {
        "SOLAR_PANEL": "Solar Panels",
        "BATTERY": "Batteries",
        "INVERTER": "Inverters",
        "MOUNTING_STRUCTURE": "Mounting Structures",
        "CABLE": "Cables",
        "ACCESSORY": "Accessories",
        "ELECTRICAL_COMPONENT": "Electrical Components"
      },
      "stockMovement": {
        "PURCHASE_IN": "Received from purchase order",
        "MANUAL_IN": "Stock in",
        "MANUAL_OUT": "Stock out",
        "RESERVED": "Reserved for project",
        "RELEASED": "Reservation released",
        "DEDUCTED": "Deducted for installation",
        "RETURNED": "Returned to stock"
      },
      "inventoryDashboard": {
        "title": "Inventory",
        "subtitle": "Stock levels, value, and activity across every category",
        "statProducts": "Active products",
        "statUnits": "Total units in stock",
        "statValue": "Inventory value (cost)",
        "statLowStock": "Low stock",
        "categoryBreakdown": "By category",
        "viewAllProducts": "View all products →",
        "pricingGapTitle": "Live pricing needs a bit more data",
        "pricingGapText": "The calculator is using estimated prices for: {categories}. Add an active product with a capacity (W or kWh) in that category to switch it to live pricing.",
        "lowStockAlerts": "Low stock alerts",
        "minStockShort": "min",
        "recentActivity": "Recent stock activity",
        "noActivity": "No stock movements yet."
      },
      "inventoryList": {
        "title": "Products",
        "subtitle": "Every item in inventory, across all categories",
        "addProduct": "Add Product",
        "searchPlaceholder": "Search by SKU, brand, or model",
        "statusActive": "Active",
        "statusArchived": "Archived",
        "colSku": "SKU",
        "colProduct": "Product",
        "colCategory": "Category",
        "colStock": "Stock",
        "colPrice": "Price",
        "colStatus": "Status",
        "emptyTitle": "No products found",
        "emptyText": "Try a different search or filter, or add your first product."
      },
      "inventoryDetail": {
        "notFoundTitle": "Product not found",
        "backToProducts": "← Back to products",
        "lowStock": "Low stock",
        "editProduct": "Edit Product",
        "archiveProduct": "Archive",
        "restoreProduct": "Restore",
        "sectionInfo": "Product info",
        "category": "Category",
        "brand": "Brand",
        "model": "Model",
        "specification": "Specification",
        "capacityWatts": "Capacity",
        "capacityKwh": "Capacity",
        "unit": "Unit",
        "warranty": "Warranty",
        "supplier": "Supplier",
        "notes": "Notes",
        "sectionPricing": "Pricing",
        "purchasePrice": "Purchase price",
        "sellingPrice": "Selling price",
        "margin": "Margin",
        "sectionStock": "Stock",
        "currentStock": "Current stock",
        "reserved": "Reserved",
        "available": "Available",
        "minStock": "Minimum stock",
        "adjustStock": "Adjust stock",
        "stockIn": "Stock in",
        "stockOut": "Stock out",
        "quantity": "Qty",
        "reasonPlaceholder": "Reason (e.g. damaged, recount, received manually)",
        "applyAdjustment": "Apply adjustment",
        "sectionHistory": "Stock history",
        "noHistory": "No stock movements yet.",
        "manualAdjustment": "Manual adjustment"
      },
      "inventoryForm": {
        "editTitle": "Edit Product",
        "addTitle": "Add Product",
        "noSupplier": "No supplier",
        "sectionInfo": "Product info",
        "sku": "SKU",
        "category": "Category",
        "brand": "Brand",
        "model": "Model",
        "specification": "Specification",
        "capacityWatts": "Wattage (W)",
        "capacityKwh": "Capacity (kWh)",
        "capacityHint": "Used to price this product live in the customer calculator's packages.",
        "unit": "Unit",
        "warranty": "Warranty",
        "notes": "Notes",
        "sectionPricing": "Pricing",
        "purchasePrice": "Purchase price",
        "sellingPrice": "Selling price",
        "sectionStock": "Stock",
        "currentStock": "Current stock",
        "stockHint": "Note",
        "stockHintText": "Quantity can only be changed from the product page, using Adjust Stock — this keeps the stock history log complete.",
        "initialQuantity": "Initial quantity",
        "minStock": "Minimum stock",
        "sectionSupplier": "Supplier",
        "supplier": "Supplier",
        "save": "Save",
        "cancel": "Cancel",
        "skuTaken": "This SKU is already in use."
      },
      "packageList": {
        "title": "Packages",
        "subtitle": "Bundles built from Inventory products, priced live",
        "addPackage": "Add Package",
        "statusDraft": "Draft",
        "statusActive": "Active",
        "statusArchived": "Archived",
        "colName": "Package",
        "colSpecs": "Specs",
        "colPrice": "Price",
        "colStatus": "Status",
        "componentsCount": "components",
        "emptyTitle": "No packages yet",
        "emptyText": "Build your first package from Inventory products — it will appear as an option in the customer calculator once published as Active."
      },
      "packageForm": {
        "editTitle": "Edit Package",
        "addTitle": "Add Package",
        "notFoundTitle": "Package not found",
        "backToPackages": "← Back to packages",
        "sectionInfo": "Package info",
        "nameEn": "Name (English)",
        "nameAr": "Name (Arabic)",
        "descEn": "Description (English)",
        "descAr": "Description (Arabic)",
        "status": "Status",
        "statusDraft": "Draft — not shown to customers",
        "statusActive": "Active — shown to customers",
        "statusArchived": "Archived",
        "sectionComponents": "Components",
        "addComponent": "Add a product",
        "qty": "Qty",
        "noComponents": "No components added yet.",
        "sectionPricing": "Pricing",
        "componentsSubtotal": "Components subtotal",
        "installationCost": "Installation cost",
        "defaultMarginPct": "Default margin %",
        "totalPrice": "Total price (customer sees this)",
        "save": "Save",
        "cancel": "Cancel"
      },
      "projectList": {
        "title": "Projects",
        "subtitle": "Fulfillment jobs converted from approved requests",
        "colRequest": "Request",
        "colPackage": "Package",
        "colPrice": "Price",
        "colStatus": "Status",
        "colUpdated": "Updated",
        "emptyTitle": "No projects yet",
        "emptyText": "Convert a qualified request into a project from its detail page to start tracking it here."
      },
      "settings": {
        "title": "Settings",
        "subtitle": "Company profile, branches, and staff accounts",
        "accessDeniedTitle": "Admins only",
        "accessDeniedText": "Settings is only available to Owner and Admin accounts.",
        "tabCompany": "Company",
        "tabBranches": "Branches",
        "tabUsers": "Users",
        "companySectionInfo": "Company profile",
        "companyName": "Company name",
        "companyAddress": "Address",
        "companyEmail": "Email",
        "companyPhone": "Phone",
        "companyWhatsapp": "WhatsApp",
        "currency": "Currency",
        "taxPct": "Tax %",
        "timezone": "Timezone",
        "logoUrl": "Logo URL",
        "readOnlyNotice": "Only Owner/Admin/Accountant can edit company settings.",
        "save": "Save",
        "cancel": "Cancel",
        "saved": "Saved",
        "branchesCount": "{count} branches",
        "addBranch": "Add Branch",
        "editBranch": "Edit Branch",
        "colName": "Name",
        "colManager": "Manager",
        "colPhone": "Phone",
        "colStatus": "Status",
        "colRole": "Role",
        "colBranch": "Branch",
        "active": "Active",
        "archived": "Archived",
        "deactivated": "Deactivated",
        "deactivate": "Deactivate",
        "reactivate": "Reactivate",
        "restore": "Restore",
        "confirmArchiveUser": "Archive this account? It will be deactivated and hidden from the directory. This can be undone from the Archived filter.",
        "createUserNotice": "New staff accounts are created via the Supabase Dashboard (Authentication → Add User) — self-service signup is disabled by design. Once an account exists, manage its role, branch, and status right here."
      },
      "projectDetail": {
        "notFoundTitle": "Project not found",
        "backToProjects": "← Back to projects",
        "viewRequest": "View original request",
        "sectionInfo": "Project info",
        "package": "Package",
        "sellingPrice": "Selling price",
        "sectionStatus": "Pipeline",
        "advanceTo": "Advance to",
        "cancelProject": "Cancel project",
        "confirmCancel": "Cancel this project? This cannot be undone.",
        "pipelineEnded": "This project has reached its final stage.",
        "sectionTimeline": "Timeline",
        "timelineEmpty": "No activity yet.",
        "timelineCreated": "Project created"
      },
      "common": {
        "search": "Search",
        "searchPlaceholder": "Search by name, phone, or request ID",
        "filterAll": "All",
        "back": "Back",
        "backToRequests": "← Back to requests",
        "customer": "Customer",
        "status": "Status",
        "package": "Package",
        "price": "Price",
        "property": "Property",
        "phone": "Phone",
        "location": "Location",
        "createdAt": "Created",
        "updatedAt": "Last updated",
        "callCustomer": "Call customer",
        "whatsappCustomer": "WhatsApp customer",
        "viewDetails": "View details",
        "noResults": "No requests match your search.",
        "systemForMyself": "For themselves",
        "systemForFamily": "For family in Sudan"
      },
      "dashboard": {
        "title": "Dashboard",
        "subtitle": "Business health at a glance — pipeline, revenue, and what needs attention",
        "statTotal": "Total requests",
        "statToday": "Today",
        "statWeek": "This week",
        "statMonth": "This month",
        "statNew": "New",
        "statInProgress": "In progress",
        "statCompleted": "Completed",
        "statCancelled": "Cancelled",
        "statRevenue": "Revenue",
        "statProfit": "Profit",
        "statOutstanding": "Outstanding",
        "statProjectsActive": "Projects in progress",
        "statProjectsDone": "Completed projects",
        "chartTitle": "Requests, last 7 days",
        "chartSub": "Daily volume",
        "recentTitle": "Recent activity",
        "activityNewRequest": "New request",
        "activityProjectUpdate": "Project update",
        "lowStockTitle": "Low stock",
        "topPerformersTitle": "Top performers",
        "topSalesperson": "Top salesperson",
        "topBranch": "Top branch",
        "viewAll": "View all →",
        "emptyTitle": "No requests yet",
        "emptyText": "Completed calculator sessions will appear here automatically once a customer reaches checkout."
      },
      "requests": {
        "title": "Requests",
        "subtitle": "Every lead generated by the Solar Smart Advisor calculator",
        "colId": "ID",
        "colCustomer": "Customer",
        "colProperty": "Property",
        "colPackage": "Package",
        "colPrice": "Price",
        "colStatus": "Status",
        "colDate": "Created",
        "emptyTitle": "No requests yet",
        "emptyText": "Once a customer completes the calculator, their request will show up here."
      },
      "detail": {
        "notFoundTitle": "Request not found",
        "notFoundText": "This request doesn't exist or may have been removed.",
        "sectionCustomer": "Customer",
        "sectionRecipient": "Recipient (Sudan)",
        "sectionSystem": "Recommended system",
        "sectionProject": "Fulfillment project",
        "projectStatus": "Project status",
        "viewProject": "View project →",
        "convertHint": "This request is ready to become a project — quotation, deposit, installation, and payments will all be tracked from there.",
        "convertToProject": "Convert to Project",
        "sectionSales": "Sales assignment",
        "sectionSendSales": "Send to sales branch",
        "sectionPdf": "Quotation PDF",
        "sectionStatus": "Status",
        "sectionTimeline": "Timeline",
        "changeStatusLabel": "Move to next stage",
        "pipelineEnded": "This request has reached its final stage — no further status changes.",
        "cancelRequest": "Cancel request",
        "panels": "Solar panels",
        "battery": "Battery",
        "inverter": "Inverter",
        "backupHours": "Backup hours",
        "dailyConsumption": "Daily consumption",
        "consumption": "Monthly consumption",
        "peakLoad": "Peak load",
        "systemSize": "System size",
        "whatsapp": "WhatsApp",
        "city": "City",
        "address": "Address",
        "mapsLink": "Google Maps",
        "openMap": "Open map →",
        "branch": "Branch",
        "assignedSales": "Assigned sales",
        "priority": "Priority",
        "notes": "Notes",
        "notePlaceholder": "Add a note about this request…",
        "addNote": "Add note",
        "timelineEmpty": "No activity yet.",
        "quickEdit": "Edit Request",
        "quickCopyReport": "Copy Report",
        "quickSendKober": "Send to Kober",
        "quickSendMadani": "Send to Madani",
        "quickChangeStatus": "Change Status",
        "sendToKober": "Send to Kober Sales",
        "sendToMadani": "Send to Madani Sales",
        "copyReport": "Copy Report",
        "reportCopied": "✓ Report copied to clipboard",
        "reportCopyFailed": "Couldn't copy — try again",
        "viewPdf": "View Quotation PDF",
        "sharePdf": "Share PDF",
        "pdfNotGenerated": "Quotation not generated yet."
      },
      "status": {
        "new_lead": "New Lead",
        "contacted": "Contacted",
        "qualified": "Qualified",
        "quotation_sent": "Quotation Sent",
        "negotiation": "Negotiation",
        "deposit_paid": "Deposit Paid",
        "installation_scheduled": "Installation Scheduled",
        "installed": "Installed",
        "completed": "Completed",
        "cancelled": "Cancelled"
      },
      "priority": {
        "low": "Low",
        "medium": "Medium",
        "high": "High",
        "urgent": "Urgent"
      },
      "branches": {
        "kober": "Khartoum (Kober)",
        "madani": "Madani"
      },
      "actor": {
        "promptMessage": "Your name (shown on the requests you update):",
        "unknown": "Staff",
        "setName": "Set your name",
        "signOutConfirm": "Sign out of the Andoria CRM?",
        "inactiveAccount": "This account has been deactivated. Contact an admin."
      },
      "roles": {
        "OWNER": "Owner",
        "ADMIN": "Admin",
        "SALES": "Sales",
        "WAREHOUSE": "Warehouse",
        "ACCOUNTANT": "Accountant",
        "INSTALLER": "Installer",
        "VIEWER": "Viewer"
      },
      "edit": {
        "title": "Edit Request",
        "sectionLocation": "Location",
        "sectionSystem": "System & Package",
        "sectionSales": "Sales assignment",
        "country": "Country",
        "countryCode": "country code",
        "phone": "Phone",
        "whatsapp": "WhatsApp",
        "city": "City",
        "address": "Address",
        "mapsLink": "Google Maps link",
        "propertyType": "Property type",
        "consumption": "Monthly consumption (kWh)",
        "systemSize": "System size",
        "branch": "Branch",
        "branchUnassigned": "Unassigned",
        "assignedSales": "Assigned sales",
        "priority": "Priority",
        "notes": "Notes",
        "save": "Save",
        "cancel": "Cancel"
      },
      "validation": {
        "required": "This field is required",
        "phoneInvalid": "Enter a valid phone number for the selected country",
        "emailInvalid": "Enter a valid email address",
        "urlInvalid": "Enter a valid link starting with http:// or https://",
        "numberInvalid": "Enter a number of 0 or more"
      },
      "report": {
        "newSolarRequest": "New Solar Request",
        "requestId": "Request ID",
        "customer": "Customer",
        "phone": "Phone",
        "whatsapp": "WhatsApp",
        "email": "Email",
        "country": "Country",
        "city": "City",
        "address": "Address",
        "googleMaps": "Google Maps",
        "propertyType": "Property Type",
        "monthlyConsumption": "Monthly Consumption",
        "recommendedPackage": "Recommended Package",
        "systemSize": "System Size",
        "battery": "Battery",
        "inverter": "Inverter",
        "estimatedPrice": "Estimated Price",
        "customerNotes": "Customer Notes",
        "created": "Created",
        "generatedBy": "Generated by Solar CRM",
        "locationNotProvided": "Location not provided",
        "noNotes": "—"
      },
      "timeline": {
        "created": "Request created from the Solar Smart Advisor calculator",
        "statusChanged": "Status changed from {from} to {to}",
        "note": "{text}",
        "by": "By {user}",
        "fieldActions": {
          "nameUpdated": "Customer name updated: {before} → {after}",
          "phoneUpdated": "Phone updated: {before} → {after}",
          "whatsappUpdated": "WhatsApp updated: {before} → {after}",
          "emailUpdated": "Email updated: {before} → {after}",
          "countryUpdated": "Country updated: {before} → {after}",
          "cityUpdated": "City updated: {before} → {after}",
          "addressUpdated": "Address updated: {before} → {after}",
          "mapsUpdated": "Google Maps link updated",
          "propertyUpdated": "Property type updated: {before} → {after}",
          "consumptionUpdated": "Consumption updated: {before} → {after} kWh",
          "packageChanged": "Package changed: {before} → {after}",
          "systemSizeUpdated": "System size updated: {before} → {after}",
          "batteryUpdated": "Battery updated: {before} → {after} kWh",
          "inverterUpdated": "Inverter updated: {before} → {after} W",
          "priceUpdated": "Price updated: {before} → {after}",
          "notesUpdated": "Notes updated",
          "branchChanged": "Branch changed: {before} → {after}",
          "assignedSalesChanged": "Assigned sales changed: {before} → {after}",
          "priorityChanged": "Priority changed: {before} → {after}"
        }
      }
    }
  }
};

  let current = null;
  const listeners = [];

  function detectInitialLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'en') return saved;
    } catch (e) { /* localStorage unavailable (private mode, etc.) — fall through */ }
    return 'ar';
  }

  /**
   * Dot-path translation lookup with {placeholder} interpolation.
   * Falls back to the raw key if missing, so a gap is visibly obvious
   * during development rather than silently blank.
   * @param {string} key - e.g. 'steps.profile.nameLabel'
   * @param {Object} [vars] - e.g. { count: 3 }
   * @returns {string}
   */
  function t(key, vars) {
    const dict = DICTS[current] || DICTS.ar;
    const value = key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, dict);
    let result = (value !== undefined) ? value : key;
    if (typeof result === 'string' && vars) {
      Object.keys(vars).forEach(k => {
        result = result.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return result;
  }

  /** Raw translated value at a key — for arrays/objects (e.g. trust items), not just strings. */
  function tRaw(key) {
    const dict = DICTS[current] || DICTS.ar;
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, dict);
  }

  function getLang() {
    return current;
  }

  /** Register a callback to run every time the language changes — used
   *  by app.js to rebuild whichever dynamic content is on screen. */
  function onChange(fn) {
    listeners.push(fn);
  }

  /** Walk every [data-i18n] / [data-i18n-placeholder] node and set its text/placeholder. */
  function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
  }

  function setLanguage(lang) {
    if (!DICTS[lang] || lang === current) {
      if (!DICTS[lang]) return;
    }
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('meta.title');

    applyStaticTranslations();
    renderSwitcher();
    listeners.forEach(fn => { try { fn(lang); } catch (e) { console.error('[I18n] onChange listener failed:', e); } });
  }

  /** The "🇸🇦 العربية | 🇺🇸 English" control markup. */
  function switcherHTML() {
    const arActive = current === 'ar' ? 'active' : '';
    const enActive = current === 'en' ? 'active' : '';
    return `
      <button type="button" class="lang-option ${arActive}" onclick="I18n.setLanguage('ar')">${t('langSwitcher.ar')}</button>
      <span class="lang-divider">|</span>
      <button type="button" class="lang-option ${enActive}" onclick="I18n.setLanguage('en')">${t('langSwitcher.en')}</button>
    `;
  }

  /** Re-render every mounted language-switcher slot (there are two —
   *  one for the welcome screen, one inside the persistent progress bar). */
  function renderSwitcher() {
    document.querySelectorAll('.lang-switcher-slot').forEach(el => {
      el.innerHTML = switcherHTML();
    });
  }

  /** Call once on DOMContentLoaded, before anything else touches the DOM. */
  function init() {
    current = detectInitialLang();
    document.documentElement.lang = current;
    document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
    document.title = t('meta.title');
    applyStaticTranslations();
    renderSwitcher();
  }

  return { t, tRaw, getLang, setLanguage, onChange, applyStaticTranslations, renderSwitcher, init };

})();

if (typeof window !== 'undefined') window.I18n = I18n;
if (typeof module !== 'undefined') module.exports = I18n;
