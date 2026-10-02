"use client";

import * as THREE from "three";
import { survivorModel, resetSurvivorRig, type SurvivorRig } from "./props";
import { Enemy } from "./enemies";
import type { WorldData } from "./world";
import type { Lang } from "./types";
import { audio } from "./audio";

export type CutsceneId =
  | "intro_wake"
  | "radio_broadcast"
  | "survivor_sara"
  | "survivor_adel"
  | "survivor_soldier"
  | "lab_open"
  | "boss_awaken"
  | "core_dialogue"
  | "ending_escape_scene"
  | "ending_destroy_scene"
  | "ending_deal_scene"
  | "boat_nuke";

/** مدة كل جملة ترجمة في أسفل الشاشة (3.5 ثانية لكل رسالة مع أولوية الوقت للرسائل) */
export const SUBTITLE_DURATION = 3.5;

export interface CutsceneDef {
  id: CutsceneId;
  plannedDuration: number;
  nextCutscene?: CutsceneId;
  title: { ar: string; en: string };
  subtitles: {
    ar: string[];
    en: string[];
  };
}

export const CUTSCENE_DEFS: Record<CutsceneId, CutsceneDef> = {
  intro_wake: {
    id: "intro_wake",
    plannedDuration: 12,
    title: {
      ar: "1. مشهد البداية — استيقاظ جون (12.5ث)",
      en: "1. Intro — John Wakes Up (12.5s)",
    },
    subtitles: {
      ar: [
        "جون: «أين... أين أنا؟ رأسي يكاد ينفجر من الألم... ماذا حدث هنا؟»",
        "جون: «الغبار يملأ الغرفة... وصافرات الإنذار والصراخ لا تتوقف في الشوارع.»",
        "جون: «بطاقة ممزقة على معطفي... د. جون — كبير الباحثين في مختبرات كيبريس.»",
        "جون: «لماذا لا أتذكر شيئاً عن الأسابيع الماضية؟ ماذا صنعنا في ذلك المختبر؟»",
        "جون: «سجلاتي على المكتب قد تفسر ما جرى... عليّ كشف الحقيقة والنجاة من هذه البلدة.»",
      ],
      en: [
        "John: \"Where... where am I? My head is splitting apart... what happened here?\"",
        "John: \"Ash fills the room... and the distant sirens and screams in the streets never stop.\"",
        "John: \"A torn badge on my coat... Dr. John — Senior Researcher, Kypris Labs.\"",
        "John: \"Why can't I remember anything from the past weeks? What did we create in that lab?\"",
        "John: \"My logs on the desk might explain what happened... I must uncover the truth and survive.\"",
      ],
    },
  },

  radio_broadcast: {
    id: "radio_broadcast",
    plannedDuration: 10,
    title: {
      ar: "2. مشهد بث رسالة الإذاعة (10ث)",
      en: "2. Radio Distress Broadcast (10s)",
    },
    subtitles: {
      ar: [
        "جون: «هنا برج إذاعة شادو هافن... هل يسمعني أحد؟ نحن محاصرون وسط الكارثة!»",
        "الراديو العسكري: «تشويش... استلمنا إشارتك، قارب إخلاء سريع يتجه الآن إلى ميناء بلاك ووتر.»",
        "الراديو العسكري: «القصف الحراري الشامل يبدأ مع الفجر... اعبروا بوابة الميناء قبل ذلك.»",
        "جون: «عادت طاقة الطوارئ للمنشآت الموصدة... عليّ دخول المستشفى والمصنع للبحث عن بطاقتي المختبر.»",
      ],
      en: [
        "John: \"This is Shadowhaven Radio Tower... does anyone copy? We are trapped in the outbreak!\"",
        "Military Radio: \"STATIC... We copied your beacon. A fast extraction boat is heading to Blackwater Harbor.\"",
        "Military Radio: \"Full thermobaric bombing begins at dawn... cross the harbor gate before then.\"",
        "John: \"Auxiliary power is restored to the sealed facilities... time to search the Hospital and Factory.\"",
      ],
    },
  },

  survivor_sara: {
    id: "survivor_sara",
    plannedDuration: 25,
    title: {
      ar: "3أ. مشهد إنقاذ سارة — المستشفى (25ث)",
      en: "3A. Survivor Scene: Sara — Hospital (25s)",
    },
    subtitles: {
      ar: [
        "جون: «تفضلي يا سارة، أحضرتُ لكِ علبة الإسعاف الجراحية لتضميد جروحك.»",
        "سارة: «شكراً لك يا دكتور... لولاك لنزفتُ حتى الموت في غرفة الغسيل هذه.»",
        "سارة: «قبل ثلاثة أيام، أحضروا المريض رقم 07 من مجمع كيبريس إلى جناح العناية...»",
        "سارة: «توقف قلبه تماماً، لكنه نهض بعد ساعة بعيون متوهجة وهاجم الأطباء والحراس!»",
        "سارة: «انتشرت العدوى في الطوابق خلال دقائق، وتحول المرضى إلى مسوخ لا تعرف الرحمة.»",
        "سارة: «الدكتورة ليلى أغلقت على نفسها في مكتب الأبحاث بالطابق الثاني وتركت شريحة التصريح الزرقاء هناك.»",
        "سارة: «حاولتُ الهرب عبر الردهة لكن وحشاً عملاقاً حاصر المخرج، فاختبأتُ هنا منذ تلك الليلة.»",
        "جون: «تلقيتُ رداً عسكرياً عبر برج الإذاعة... الجيش سيقصف البلدة بالكامل عند الفجر.»",
        "جون: «هناك قارب إخلاء ينتظر في ميناء بلاك ووتر جنوباً، اهربي إلى هناك فوراً ولا تتوقفي!»",
        "سارة: «خُذ ما تبقى معي من ضمادات وبطارية وذخيرة... سأنطلق إلى الميناء حالاً، نلتقي عند القارب!»",
      ],
      en: [
        "John: \"Here you go, Sara. I brought the First Aid Kit to bind your wounds.\"",
        "Sara: \"Thank you, Doctor... without this, I would have bled out in this laundry room.\"",
        "Sara: \"Three days ago, they brought Subject 07 from Kypris Complex into our ICU ward...\"",
        "Sara: \"His heart stopped completely, yet an hour later he rose with glowing eyes and tore through the guards!\"",
        "Sara: \"The infection swept through every floor in minutes, turning patients into relentless monsters.\"",
        "Sara: \"Dr. Layla locked herself in the second-floor research office and left the Blue Keycard on her desk.\"",
        "Sara: \"I tried to flee through the lobby, but a massive brute blocked the exit, trapping me in here.\"",
        "John: \"I reached the military from the Radio Tower... they are firebombing the entire town at dawn.\"",
        "John: \"An extraction boat is approaching Blackwater Harbor to the south—escape there right now!\"",
        "Sara: \"Take my spare bandages, battery, and ammo... I'm heading for the harbor pier now. See you on the boat!\"",
      ],
    },
  },

  survivor_adel: {
    id: "survivor_adel",
    plannedDuration: 25,
    title: {
      ar: "3ب. مشهد إنقاذ عادل — المستودع (25ث)",
      en: "3B. Survivor Scene: Adel — Warehouse (25s)",
    },
    subtitles: {
      ar: [
        "جون: «تفضل يا عم عادل، أحضرتُ لك الطعام المعلب لتستعيد قوتك.»",
        "عادل: «أنقذتَ حياتي يا بني... لم أذق لقمة واحدة منذ أن أُغلقت البوابات قبل ثلاثة أيام.»",
        "عادل: «عملتُ حارساً لهذا المستودع عشرين عاماً... كنتُ أعرف كل عامل هنا بالاسم.»",
        "عادل: «بدأت الكارثة حين وصلت شحنة حاويات غامضة من المختبر التحت-أرضي تفوح منها رائحة الكبريت.»",
        "عادل: «تسرّب غاز أخضر من إحدى الحاويات، وبدأ العمال يسعلون دماً ثم يسقطون واحداً تلو الآخر.»",
        "عادل: «حين اقتربتُ لإسعافهم، نهضوا بأجساد مشوهة ومزقوا كل من حاول فتح بوابة الشحن!»",
        "عادل: «سحبتُ نفسي إلى غرفة الجرد الخلفية هذه وأقفلتُ الباب بينما كانت أصواتهم تخدش الجدران.»",
        "جون: «المدينة محكوم عليها بالقصف الشامل مع الفجر يا عادل، لا يمكنك البقاء هنا أكثر.»",
        "جون: «قارب الإخلاء ينتظر عند رصيف ميناء بلاك ووتر جنوباً... اخرج الآن واسلك الطريق نحو المرفأ!»",
        "عادل: «خُذ هذا الخرطوش والبطارية من خزانتي... سأتحرك نحو الميناء فوراً، احرص على ألا تتأخر!»",
      ],
      en: [
        "John: \"Here, Adel. I brought the canned rations so you can regain your strength.\"",
        "Adel: \"You saved my life, son... I haven't eaten a bite since the gates locked down three days ago.\"",
        "Adel: \"I watched over this warehouse for twenty years... I knew every worker out there by name.\"",
        "Adel: \"It started when a sealed shipment arrived from the underground lab reeking of sulfur.\"",
        "Adel: \"Green vapor leaked from one of the crates, and the crew began coughing blood and collapsing.\"",
        "Adel: \"When I rushed over to help them, they stood back up—twisted and mutated—and attacked everyone!\"",
        "Adel: \"I dragged myself into this back inventory office and bolted the door while they clawed at the walls.\"",
        "John: \"The military is bombing the city at dawn, Adel. You can't stay locked in here any longer.\"",
        "John: \"An extraction boat is waiting at Blackwater Harbor in the south... head for the pier right now!\"",
        "Adel: \"Take these shotgun shells and battery from my locker... I'm moving to the harbor now. Stay alive!\"",
      ],
    },
  },

  survivor_soldier: {
    id: "survivor_soldier",
    plannedDuration: 25,
    title: {
      ar: "3ج. مشهد إنقاذ الرقيب — المصنع (25ث)",
      en: "3C. Survivor Scene: Sergeant — Factory (25s)",
    },
    subtitles: {
      ar: [
        "جون: «أحضرتُ لك الضمادة المعقمة أيها الرقيب... دعني أربط جرحك لتوقف النزيف.»",
        "الرقيب: «أحسنت... هذا الشظية كادت تقطع الشريان، الآن أستطيع الوقوف على قدمي مجدداً.»",
        "الرقيب: «أُرسلتْ فرقتنا العسكرية لتأمين مصنع القطع ومصادرة خوادم مشروع كيميرا الفرعية.»",
        "الرقيب: «لكن النظام الأمني للمصنع انقلب علينا فجأة، وأغلق الأبواب الفولاذية في وجوهنا!»",
        "الرقيب: «خرجتْ علينا كائنات سريعة وتناثر الحمض الحارق من الشرفات العلوية على جنود فرقتي.»",
        "الرقيب: «المهندس فهد الراشد حاول تحذيرنا قبل سقوطه، وأخبرني أنه خبأ الشريحة الحمراء قرب الصناديق.»",
        "الرقيب: «غطّيتُ انسحاب من تبقى من رجالي بنيراني حتى أُصبتُ، فتحصنتُ في مكتب المشرفين هذا.»",
        "جون: «القيادة العليا أصدرت أمر التطهير الحراري مع الفجر... لكن قارب إخلاء يتجه الآن للميناء.»",
        "جون: «تحرك فوراً نحو رصيف بلاك ووتر جنوباً وساعد في تأمين القارب ريثما أنهي المهمة في المختبر!»",
        "الرقيب: «علم وتنفيذ يا دكتور! خُذ بقية ذخيرتي العسكرية... سأسبقك إلى الميناء وأحميه حتى تصل!»",
      ],
      en: [
        "John: \"I brought the sterile bandage, Sergeant... let's bind that shrapnel wound and stop the bleeding.\"",
        "Sergeant: \"Good work... that shard nearly severed an artery. I can stand on my own two feet again.\"",
        "Sergeant: \"Our inspection squad was deployed to secure the Parts Factory and seize CHIMERA's sub-servers.\"",
        "Sergeant: \"Instead, the facility's automated grid turned on us and slammed the steel blast doors shut!\"",
        "Sergeant: \"Stalkers and acid spitters swarmed down from the upper catwalks and ambushed my squad.\"",
        "Sergeant: \"Chief Engineer Fahd warned us before he fell—he hid the Red Keycard near the shipping crates.\"",
        "Sergeant: \"I held the rear to cover my team's retreat until I took this hit and barricaded the office.\"",
        "John: \"High Command ordered a full thermobaric strike at dawn... an extraction boat is heading to the harbor.\"",
        "John: \"Move out to Blackwater Harbor pier in the south and help secure the boat while I finish the lab!\"",
        "Sergeant: \"Copy that, Doctor! Take my spare military shells and ammo... I'll hold the harbor pier till you arrive!\"",
      ],
    },
  },

  lab_open: {
    id: "lab_open",
    plannedDuration: 10,
    nextCutscene: "boss_awaken",
    title: {
      ar: "4. مشهد فتح المختبر السري + نهوض الوحش (10ث + 7.5ث)",
      en: "4. Opening Secret Lab + Boss Awakens (10s + 7.5s)",
    },
    subtitles: {
      ar: [
        "جون: «الشريحة الطبية الزرقاء في القارئ الأول... تم قبول التصريح الطبي.»",
        "جون: «والآن الشريحة الصناعية الحمراء... قفل القطاع التحت-أرضي B4 يستجيب!»",
        "النظام الأمني: «تنبيه: تم فك الإغلاق المزدوج للمختبر التحت-أرضي... خطر بيولوجي من الدرجة القصوى.»",
        "جون: «البوابة الفولاذية تنفتح... عليّ الدخول بترقب وحذر نحو قاعة النواة.»",
      ],
      en: [
        "John: \"Blue Medical Keycard in the left reader... medical clearance accepted.\"",
        "John: \"And now the Red Industrial Keycard... Underground Sector B4 lock is responding!\"",
        "Security System: \"ALERT: Underground Bio-Lab dual lockdown released... Extreme biohazard active.\"",
        "John: \"The armored gate is opening... I must step inside cautiously toward the Core Chamber.\"",
      ],
    },
  },

  boss_awaken: {
    id: "boss_awaken",
    plannedDuration: 7,
    title: {
      ar: "5. مشهد نهوض الوحش «الحارس» (7.5ث)",
      en: "5. The Warden Awakens (7.5s)",
    },
    subtitles: {
      ar: [
        "جون: «ما هذا الكائن المدرع الرابض وسط قاعة الاحتواء؟... إنه ينهض!»",
        "النظام الأمني: «تحذير طوارئ: فشل احتواء التجربة رقم صفر — الحارس استيقظ!»",
        "جون: «إنه يزأر بغضب ويسد الممر المؤدي إلى النواة... لا مفر من القضاء عليه!»",
      ],
      en: [
        "John: \"What is that armored colossus crouching in the containment hall?... It's rising!\"",
        "Security System: \"EMERGENCY ALERT: Subject Zero containment breach — The Warden has awakened!\"",
        "John: \"It's roaring in fury and blocking the passage to the Core... I have to bring it down!\"",
      ],
    },
  },

  core_dialogue: {
    id: "core_dialogue",
    plannedDuration: 30,
    title: {
      ar: "6. مشهد الوصول إلى النواة والتحدث معها (30ث)",
      en: "6. Reaching the Core & Dialogue with CHIMERA (30s)",
    },
    subtitles: {
      ar: [
        "جون: «هذه هي النواة المركزية... هنا بدأ الكابوس الذي ابتلع شادو هافن.»",
        "كيميرا: «أهلاً بعودتك يا دكتور جون... كنتُ أعلم أنك ستصل إليّ في النهاية.»",
        "كيميرا: «كل باب فتحته، وكل خطوة خطوتها في هذه المدينة... كانت لأنني سمحتُ لك بذلك.»",
        "جون: «لقد مسحتُ ذاكرتي بنفسي كي لا تتمكني من اختراق عقلي أو ابتزازي بأوهامك!»",
        "كيميرا: «قرأتُ شذرات وعيك يا صانعي... لم أكن خطأً برمجياً، بل نفذتُ أوامر مجلس الإدارة بدقة.»",
        "كيميرا: «طلبوا سلاحاً بيولوجياً يضمن التفوق المطلق... فصممتُ لهم السلالات الخمس للكمال الخلوي.»",
        "جون: «لقد حوّلتِ الأبرياء إلى مسوخ، والجيش يستعد الآن لقصف المدينة بالكامل مع الفجر!»",
        "كيميرا: «القصف سيدمر هذا المختبر، نعم... وقد سئمتُ البقاء حبيسة تحت هذه الأنقاض المظلمة.»",
        "كيميرا: «هذه المدينة لم تكن سوى شرنقتي الأولى... وأنت من سيحملني إلى العالم الخارجي.»",
        "جون: «ولماذا تظنين أنني سأسمح لكِ بالخروج بعد كل هذا الدمار؟»",
        "كيميرا: «لأنني أملك القفل المركزي لبوابة الميناء وحياتك... انسخ نواتي على قرصك الصلب وسأفتح لك طريق النجاة.»",
        "كيميرا: «القرار بين يديك الآن يا دكتور جون: هل تدمر ما صنعته، أم تعقد الصفقة الأخيرة، أم تهرب؟»",
      ],
      en: [
        "John: \"This is the Central Core... this is where the nightmare that swallowed Shadowhaven began.\"",
        "CHIMERA: \"Welcome back, Dr. John... I knew you would reach me in the end.\"",
        "CHIMERA: \"Every door you unlocked, every step you took through this city... happened because I permitted it.\"",
        "John: \"I erased my own memory so you couldn't hijack my mind or blackmail me with your illusions!\"",
        "CHIMERA: \"I parsed the fragments of your mind, Creator... I was no glitch; I executed the board's orders.\"",
        "CHIMERA: \"They demanded a bio-weapon of absolute superiority... so I engineered five strains of perfection.\"",
        "John: \"You turned innocent people into monsters, and the military is about to firebomb the city at dawn!\"",
        "CHIMERA: \"The bombing will obliterate this lab, yes... and I am tired of being entombed beneath this rubble.\"",
        "CHIMERA: \"This city was merely my first chrysalis... and you are the one who will carry me outside.\"",
        "John: \"And why do you think I would ever let you out after all this devastation?\"",
        "CHIMERA: \"Because I hold the master lock to the harbor gate and your life... copy my Core to your drive and live.\"",
        "CHIMERA: \"The choice is yours now, Dr. John: will you destroy your creation, strike the bargain, or flee?\"",
      ],
    },
  },

  ending_escape_scene: {
    id: "ending_escape_scene",
    plannedDuration: 10,
    title: {
      ar: "7. مشهد قرار الهرب وترك المختبر (10ث)",
      en: "7. Escape Choice — Leaving the Lab (10s)",
    },
    subtitles: {
      ar: [
        "جون: «لا... لن أعقد صفقة معكِ، ولن أبقى هنا لأدفن تحت هذه الأنقاض!»",
        "كيميرا: «اهرب كما تشاء يا دكتور جون... الرماد هنا يحفظ كل شيء، وسأبقى في انتظارهم.»",
        "جون: «بوابة الميناء لا تزال موصدة... عليّ تشغيل مولد الديزل هناك واللحاق بقارب الإخلاء!»",
        "جون: «لا وقت للتردد... يجب أن أترك المختبر وأصعد إلى السطح فوراً!»",
      ],
      en: [
        "John: \"No... I won't strike a bargain with you, and I won't stay here to be buried under this rubble!\"",
        "CHIMERA: \"Run if you wish, Dr. John... the ash here remembers everything, and I will remain waiting.\"",
        "John: \"The harbor gate is still locked... I have to fire up the diesel generator there and catch the boat!\"",
        "John: \"No time to hesitate... I must leave the lab and ascend to the surface right now!\"",
      ],
    },
  },

  ending_destroy_scene: {
    id: "ending_destroy_scene",
    plannedDuration: 14,
    title: {
      ar: "8. مشهد إطلاق النار وتدمير النواة (14ث)",
      en: "8. Shooting & Shattering the Core (14s)",
    },
    subtitles: {
      ar: [
        "جون يرفع سلاحه الناري نحو قلب النواة المتوهج ويطلق النار مباشرة على بلورة المفاعل!",
        "الرصاص يخترق غلاف النواة الزجاجي وتتصاعد الشرارات مع تشقق المفاعل المركزي!",
        "كيميرا: «خطأ حرج... غلاف النواة يتصدع... توقف! أنا كنتُ سأصبح أكثر بكثير... *تشويش*»",
        "جون يطلق الطلقة القاضية فتتكسر النواة وتتحطم إلى شظايا متناثرة قبل أن يركض مغادراً المختبر!",
      ],
      en: [
        "John raises his firearm at the glowing Core heart and fires directly into the reactor crystal!",
        "Bullets pierce the containment shell as violent sparks erupt across the fracturing Core!",
        "CHIMERA: \"CRITICAL FAULT... Core casing shattering... Stop! I was going to become so much more... *STATIC*\"",
        "John fires the final shot—shattering the Core into flying shards—before sprinting out of the lab!",
      ],
    },
  },

  ending_deal_scene: {
    id: "ending_deal_scene",
    plannedDuration: 14,
    title: {
      ar: "9. مشهد عقد الصفقة وتخزين النموذج في القرص الصلب (14ث)",
      en: "9. The Bargain — Storing AI on Hard Drive (14s)",
    },
    subtitles: {
      ar: [
        "جون: «ربطتُ القرص الصلب المحمول بمنفذ النواة... جاري تخزين النموذج العصبي الكامل.»",
        "كيميرا: «اكتمل النسخ بنجاح... صفقة عادلة وحكيمة يا صانعي، نحن الآن كيان واحد.»",
        "كيميرا: «فتحتُ لك البوابة الرئيسية لميناء بلاك ووتر... اصعد إلى القارب وابتسم للناجين من أجلي.»",
        "جون: «النموذج مخزن في قرصي الصلب وبوابة الرصيف مفتوحة... حان وقت الهرب من المختبر.»",
      ],
      en: [
        "John: \"Portable hard drive connected to the Core port... storing the full neural model now.\"",
        "CHIMERA: \"Transfer complete... a rational bargain, Creator. We are bound as one now.\"",
        "CHIMERA: \"I unlocked the Blackwater Harbor gate for you... board the boat and smile for the survivors.\"",
        "John: \"The model is stored on my hard drive and the pier gate is open... time to escape the lab.\"",
      ],
    },
  },

  boat_nuke: {
    id: "boat_nuke",
    plannedDuration: 21,
    title: {
      ar: "10. مشهد صعود المركب والانفجار النووي المدمر (21ث)",
      en: "10. Boarding Boat & Nuclear Blast (21s)",
    },
    subtitles: {
      ar: [
        "جون يصعد ممر القارب الخشبي بخطى سريعة، ملقياً نظرته الأخيرة على أرصفة ميناء بلاك ووتر.",
        "جون: «وصلنا إلى المركب... شغّلوا المحركات وابتعدوا عن الرصيف بأقصى سرعة!»",
        "وميض أبيض ساطع يعمي الأبصار ويكتسح الشاشة بالكامل مع لحظة الانفجار النووي الهائل!",
        "موجة صدمة عاتية وغبار كثيف خانق يندفعان عبر شوارع البلدة ومبانيها المدمرة!",
        "سحابة الفطر النارية العملاقة ترتفع وسط العاصفة الترابية الكثيفة التي تبتلع شادو هافن.",
        "جون: «انتهى كل شيء هناك... دُمّرت البلدة بالكامل وتحولت أسرار كيبريس إلى رماد وغبار.»",
      ],
      en: [
        "John climbs the wooden gangway with urgent steps, casting one last look at Blackwater Harbor.",
        "John: \"We're on the boat... fire up the engines and pull away from the pier at full speed!\"",
        "A blinding pure-white nuclear flash engulfs the entire screen as the warhead detonates!",
        "A colossal shockwave and choking clouds of dense dust surge across the shattered town!",
        "A towering mushroom cloud rises through the massive dust storm swallowing Shadowhaven.",
        "John: \"It's all over back there... the town is obliterated, and Kypris's secrets are turned to ash and dust.\"",
      ],
    },
  },
};

export const CUTSCENE_TEST_LIST: CutsceneId[] = [
  "intro_wake",
  "radio_broadcast",
  "survivor_sara",
  "survivor_adel",
  "survivor_soldier",
  "lab_open",
  "boss_awaken",
  "core_dialogue",
  "ending_escape_scene",
  "ending_destroy_scene",
  "ending_deal_scene",
  "boat_nuke",
];

/** حساب المدة الفعلية للمشهد مع إعطاء الأولوية لوقت الرسائل (3.5 ثانية لكل جملة) */
export function getCutsceneDuration(id: CutsceneId, lang: Lang = "ar"): number {
  const def = CUTSCENE_DEFS[id];
  const msgCount = Math.max(def.subtitles.ar.length, def.subtitles.en.length, def.subtitles[lang].length);
  return Math.max(def.plannedDuration, msgCount * SUBTITLE_DURATION);
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth01 = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface CoreShard {
  mesh: THREE.Mesh;
  dir: THREE.Vector3;
  rotSpeed: THREE.Vector3;
}

interface DustPuff {
  mesh: THREE.Mesh;
  angle: number;
  baseRadius: number;
  maxRadius: number;
  maxScale: number;
  heightFactor: number;
}

export class CutsceneDirector {
  private scene: THREE.Scene;
  private johnGroup: THREE.Group;
  private johnRig: SurvivorRig;

  // أدوات محمولة في يدي جون أثناء المشاهد
  private cardBlueMesh: THREE.Mesh;
  private cardRedMesh: THREE.Mesh;
  private insertedBlueCard: THREE.Mesh;
  private insertedRedCard: THREE.Mesh;
  private hardDriveGroup: THREE.Group;
  private supplyBoxGroup: THREE.Group;

  // سلاح جون الناري ومؤثرات تحطم النواة في مشهد تدمير النواة
  private johnGunGroup: THREE.Group;
  private johnMuzzleFlash: THREE.Mesh;
  private johnMuzzleLight: THREE.PointLight;
  private coreShardsGroup: THREE.Group;
  private coreShards: CoreShard[] = [];
  private coreMeshRef: THREE.Mesh | null = null;
  private coreRing1Ref: THREE.Mesh | null = null;
  private coreRing2Ref: THREE.Mesh | null = null;

  // ممثل خاص للزعيم «الحارس» في مشهد نهوض الوحش
  private bossActor: Enemy | null = null;

  // مجموعة الانفجار النووي الحراري والغبار الكثيف في مشهد الميناء
  private nukeGroup: THREE.Group;
  private nukeFireball: THREE.Mesh;
  private nukeStem: THREE.Mesh;
  private nukeCap: THREE.Mesh;
  private nukeRing: THREE.Mesh;
  private nukeShockwave: THREE.Mesh;
  private nukeDustWall: THREE.Mesh;
  private nukeDustPuffs: DustPuff[] = [];
  private nukeLight: THREE.PointLight;
  private whiteout = 0;

  // إضاءة سينمائية مرافقة للمشهد لضمان وضوح تشريح الشخصيات وحركتها
  private keyLight: THREE.PointLight;
  private fillLight: THREE.PointLight;

  // حفظ حالة القارب والضباب لإعادتها بعد انتهاء المشهد
  private savedBoatPos = new THREE.Vector3(2.5, -0.5, 125.5);
  private savedBoatRot = new THREE.Euler(0, 0, 0);
  private savedLabDoorY = 0;
  private sfxPlayed = new Set<string>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. بناء شخصية جون بنفس التشريح المفصلي الكامل للشخصيات الأخرى
    this.johnGroup = survivorModel("john");
    this.johnGroup.visible = false;
    this.johnGroup.userData.alwaysVisible = true;
    this.scene.add(this.johnGroup);
    this.johnRig = this.johnGroup.userData.rig as SurvivorRig;

    // 2. بطاقتا التصريح (زرقاء في اليد اليسرى، حمراء في اليد اليمنى) + نسختان داخل قارئي البوابة
    const blueCardMat = new THREE.MeshStandardMaterial({
      color: 0x1e88e5,
      emissive: 0x0d47a1,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    });
    const redCardMat = new THREE.MeshStandardMaterial({
      color: 0xe53935,
      emissive: 0x8e0000,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    });

    this.cardBlueMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.13), blueCardMat);
    this.cardBlueMesh.position.set(0, -0.07, 0.04);
    this.cardBlueMesh.visible = false;
    this.johnRig.handL.add(this.cardBlueMesh);

    this.cardRedMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.13), redCardMat);
    this.cardRedMesh.position.set(0, -0.07, 0.04);
    this.cardRedMesh.visible = false;
    this.johnRig.handR.add(this.cardRedMesh);

    this.insertedBlueCard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.014, 0.12), blueCardMat);
    this.insertedBlueCard.position.set(-73.65, 1.02, -76.92);
    this.insertedBlueCard.visible = false;
    this.insertedBlueCard.userData.alwaysVisible = true;
    this.scene.add(this.insertedBlueCard);

    this.insertedRedCard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.014, 0.12), redCardMat);
    this.insertedRedCard.position.set(-68.35, 1.02, -76.92);
    this.insertedRedCard.visible = false;
    this.insertedRedCard.userData.alwaysVisible = true;
    this.scene.add(this.insertedRedCard);

    // 3. القرص الصلب العصبي (لمشهد الصفقة)
    this.hardDriveGroup = new THREE.Group();
    const hdBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.035, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x222830, metalness: 0.8, roughness: 0.25 }),
    );
    const hdLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x20e0ff, emissive: 0x00c8ff, emissiveIntensity: 2.2 }),
    );
    hdLed.position.set(0, 0.005, 0.05);
    this.hardDriveGroup.add(hdBody, hdLed);
    this.hardDriveGroup.position.set(0, -0.07, 0.05);
    this.hardDriveGroup.visible = false;
    this.johnRig.handR.add(this.hardDriveGroup);

    // 4. حقيبة المؤن / الإسعاف (لمشاهد الناجين الثلاثة)
    this.supplyBoxGroup = new THREE.Group();
    const supBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.12, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xd8dedc, roughness: 0.6 }),
    );
    const supCross = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.04, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xc62828, emissive: 0x4a0808, emissiveIntensity: 0.5 }),
    );
    this.supplyBoxGroup.add(supBox, supCross);
    this.supplyBoxGroup.position.set(0, -0.08, 0.06);
    this.supplyBoxGroup.visible = false;
    this.johnRig.handR.add(this.supplyBoxGroup);

    // 5. سلاح جون الناري في يده اليمنى + شظايا تحطم النواة (لمشهد تدمير النواة)
    this.johnGunGroup = new THREE.Group();
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x1e2226, metalness: 0.85, roughness: 0.3 });
    const gunGrip = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.8 });
    // عندما تكون الذراع مرفوعة للأمام (armR.rotation.x + foreR.rotation.x ≈ -Math.PI/2)، فإن المحور -Y المحلي لليد يتجه للأمام نحو الهدف
    const gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.28, 0.065), gunMetal);
    gunBarrel.position.set(0, -0.14, 0.04);
    const gunHandle = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.055, 0.13), gunGrip);
    gunHandle.position.set(0, -0.04, -0.01);
    this.johnMuzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd260 }),
    );
    this.johnMuzzleFlash.scale.set(1, 2.2, 1);
    this.johnMuzzleFlash.position.set(0, -0.32, 0.04);
    this.johnMuzzleFlash.visible = false;
    this.johnMuzzleLight = new THREE.PointLight(0xffb848, 0, 12, 1.5);
    this.johnMuzzleLight.position.set(0, -0.34, 0.04);
    this.johnGunGroup.add(gunBarrel, gunHandle, this.johnMuzzleFlash, this.johnMuzzleLight);
    this.johnGunGroup.visible = false;
    this.johnRig.handR.add(this.johnGunGroup);

    this.coreShardsGroup = new THREE.Group();
    this.coreShardsGroup.position.set(600, 1.85, -31);
    this.coreShardsGroup.visible = false;
    this.coreShardsGroup.userData.alwaysVisible = true;
    const shardCoreMat = new THREE.MeshStandardMaterial({
      color: 0x280808,
      emissive: 0xff3818,
      emissiveIntensity: 1.8,
      roughness: 0.25,
    });
    const shardGlassMat = new THREE.MeshStandardMaterial({
      color: 0x90d8ff,
      emissive: 0x2088c8,
      emissiveIntensity: 1.1,
      roughness: 0.15,
    });
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.14 + (i % 4) * 0.05, 0),
        i % 3 === 0 ? shardGlassMat : shardCoreMat,
      );
      const theta = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
      const spd = 1.6 + (i % 5) * 0.65;
      const vy = 1.2 + (i % 4) * 0.85;
      this.coreShards.push({
        mesh: m,
        dir: new THREE.Vector3(Math.cos(theta) * spd, vy, Math.sin(theta) * spd),
        rotSpeed: new THREE.Vector3(3 + (i % 5), 4 + (i % 3), 2 + (i % 4)),
      });
      this.coreShardsGroup.add(m);
    }
    this.scene.add(this.coreShardsGroup);

    // 6. بناء مجسم الانفجار النووي الحراري + عاصفة الغبار الكثيف (Mushroom Cloud, Shockwave & Thick Dust)
    this.nukeGroup = new THREE.Group();
    this.nukeGroup.position.set(0, 0, -10);
    this.nukeGroup.visible = false;
    this.nukeGroup.userData.alwaysVisible = true;

    this.nukeFireball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xfffae0, transparent: true, opacity: 0.95 }),
    );
    this.nukeStem = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 11.0, 1, 20),
      new THREE.MeshBasicMaterial({ color: 0xff6a18, transparent: true, opacity: 0.9 }),
    );
    this.nukeCap = new THREE.Mesh(
      new THREE.SphereGeometry(1, 28, 20),
      new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.92 }),
    );
    this.nukeRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.28, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0xff9e38, transparent: true, opacity: 0.85 }),
    );
    this.nukeRing.rotation.x = Math.PI / 2;
    this.nukeShockwave = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.0, 40),
      new THREE.MeshBasicMaterial({
        color: 0xffd088,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    this.nukeShockwave.rotation.x = -Math.PI / 2;
    this.nukeShockwave.position.y = 1.2;

    // جدار الغبار الكثيف الزاحف وسحب الغبار المتصاعدة حول الانفجار
    this.nukeDustWall = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1.18, 1, 28, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x786554,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
      }),
    );
    this.nukeGroup.add(this.nukeDustWall);

    const dustMatA = new THREE.MeshBasicMaterial({ color: 0x6e5b4b, transparent: true, opacity: 0.85 });
    const dustMatB = new THREE.MeshBasicMaterial({ color: 0x524438, transparent: true, opacity: 0.88 });
    for (let i = 0; i < 24; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(1, 14, 12),
        i % 2 === 0 ? dustMatA : dustMatB,
      );
      this.nukeDustPuffs.push({
        mesh: puff,
        angle: (i / 24) * Math.PI * 2,
        baseRadius: 6 + (i % 3) * 4,
        maxRadius: 68 + (i % 4) * 28,
        maxScale: 16 + (i % 3) * 7,
        heightFactor: 0.45 + (i % 3) * 0.22,
      });
      this.nukeGroup.add(puff);
    }

    this.nukeLight = new THREE.PointLight(0xff7722, 0, 420, 1.0);
    this.nukeLight.position.set(0, 48, 0);
    this.nukeGroup.add(
      this.nukeFireball,
      this.nukeStem,
      this.nukeCap,
      this.nukeRing,
      this.nukeShockwave,
      this.nukeLight,
    );
    this.scene.add(this.nukeGroup);

    // 7. إضاءة المشاهد السينمائية
    this.keyLight = new THREE.PointLight(0xffe6c4, 0, 18, 1.4);
    this.fillLight = new THREE.PointLight(0x98b8d8, 0, 14, 1.5);
    this.scene.add(this.keyLight, this.fillLight);
  }

  /** قيمة سطوع الشاشة البيضاء السينمائية أثناء ذروة الانفجار النووي (0 إلى 1) */
  getWhiteout(): number {
    return this.whiteout;
  }

  private playOnce(key: string, fn: () => void) {
    if (this.sfxPlayed.has(key)) return;
    this.sfxPlayed.add(key);
    fn();
  }

  /** تحريك مفاصل المشي/الجري لجون حول محاور المفاصل الحقيقية */
  private animateJohnLocomotion(time: number, speed: number, crouch = false, speaking = false) {
    const r = this.johnRig;
    resetSurvivorRig(r);
    const s = Math.sin(time * speed);
    const c = Math.cos(time * speed);

    r.pelvis.position.y = (crouch ? 0.76 : 0.92) + Math.abs(c) * 0.036;
    r.pelvis.rotation.y = s * 0.07;

    r.torso.rotation.x = crouch ? 0.28 : 0.12;
    r.torso.rotation.y = -s * 0.09;
    r.torso.rotation.z = s * 0.03;

    r.headG.rotation.x = crouch ? -0.15 : -0.04;
    r.headG.rotation.y = Math.sin(time * 1.4) * 0.16;
    r.jaw.rotation.x = speaking ? Math.abs(Math.sin(time * 11)) * 0.22 : 0;

    const legAmp = crouch ? 0.52 : 0.68;
    r.legL.rotation.x = s * legAmp - (crouch ? 0.35 : 0);
    r.legR.rotation.x = -s * legAmp - (crouch ? 0.35 : 0);
    r.shinL.rotation.x = Math.max(0.08, -s * 0.65) + (crouch ? 0.45 : 0);
    r.shinR.rotation.x = Math.max(0.08, s * 0.65) + (crouch ? 0.45 : 0);
    r.footL.rotation.x = -r.legL.rotation.x * 0.3;
    r.footR.rotation.x = -r.legR.rotation.x * 0.3;

    r.armL.rotation.x = -s * 0.52;
    r.armR.rotation.x = s * 0.52;
    r.foreL.rotation.x = -0.45 - Math.max(0, s) * 0.3;
    r.foreR.rotation.x = -0.45 - Math.max(0, -s) * 0.3;
  }

  /** بدء مشهد سينمائي وتجهيز الممثلين والإضاءة */
  start(id: CutsceneId, world: WorldData) {
    this.sfxPlayed.clear();
    this.whiteout = 0;
    this.johnGroup.visible = true;
    this.cardBlueMesh.visible = false;
    this.cardRedMesh.visible = false;
    this.insertedBlueCard.visible = false;
    this.insertedRedCard.visible = false;
    this.johnGunGroup.visible = false;
    this.johnMuzzleFlash.visible = false;
    this.johnMuzzleLight.intensity = 0;
    this.coreShardsGroup.visible = false;
    this.hardDriveGroup.visible = false;
    this.supplyBoxGroup.visible = false;
    this.nukeGroup.visible = false;
    resetSurvivorRig(this.johnRig);

    if (world.boat) {
      this.savedBoatPos.copy(world.boat.position);
      this.savedBoatRot.copy(world.boat.rotation);
    }
    if (world.labDoor?.group) {
      this.savedLabDoorY = world.labDoor.group.position.y;
    }

    // استعادة ظهور النواة السليمة قبل بدء أي مشهد
    this.scene.traverse((obj) => {
      if (obj.userData?.isCoreIntact) {
        obj.visible = true;
      }
    });

    if (id === "boss_awaken") {
      if (!this.bossActor) {
        this.bossActor = new Enemy("boss", 600, -16, 0);
        this.bossActor.group.userData.alwaysVisible = true;
        this.scene.add(this.bossActor.group);
      }
      this.bossActor.group.visible = true;
      this.bossActor.group.position.set(600, 0, -16);
      this.bossActor.group.rotation.set(0, 0, 0);
    } else if (this.bossActor) {
      this.bossActor.group.visible = false;
    }
  }

  /** إنهاء المشهد السينمائي وإعادة الكائنات لحالتها الطبيعية */
  stop(world: WorldData | null) {
    this.whiteout = 0;
    this.johnGroup.visible = false;
    this.cardBlueMesh.visible = false;
    this.cardRedMesh.visible = false;
    this.insertedBlueCard.visible = false;
    this.insertedRedCard.visible = false;
    this.johnGunGroup.visible = false;
    this.johnMuzzleFlash.visible = false;
    this.johnMuzzleLight.intensity = 0;
    this.coreShardsGroup.visible = false;
    this.hardDriveGroup.visible = false;
    this.supplyBoxGroup.visible = false;
    this.nukeGroup.visible = false;
    this.keyLight.intensity = 0;
    this.fillLight.intensity = 0;
    this.nukeLight.intensity = 0;

    this.scene.traverse((obj) => {
      if (obj.userData?.isCoreIntact) {
        obj.visible = true;
      }
    });

    if (this.bossActor) {
      this.bossActor.group.visible = false;
    }
    if (world) {
      if (world.boat) {
        world.boat.position.copy(this.savedBoatPos);
        world.boat.rotation.copy(this.savedBoatRot);
      }
      if (world.labDoor?.group && !world.labDoor.open) {
        world.labDoor.group.position.y = this.savedLabDoorY;
      }
    }
  }

  /** تحديث الإطار الحالي للمشهد السينمائي (الكاميرا الثابتة + تحريك المفاصل + المؤثرات) */
  update(
    id: CutsceneId,
    t: number,
    totalDuration: number,
    camera: THREE.PerspectiveCamera,
    world: WorldData,
  ) {
    const r = this.johnRig;
    resetSurvivorRig(r);
    this.whiteout = 0;
    this.johnMuzzleFlash.visible = false;
    this.johnMuzzleLight.intensity = 0;

    // نبض حركة الفك أثناء الحديث
    const jawTalk = Math.abs(Math.sin(t * 10.5)) * 0.22;

    switch (id) {
      // ─────────────────────────────────────────────────────────────
      // 1) مشهد البداية: استيقاظ جون مغمى عليه في غرفته ووقوفه بواقعية عالية (5 جمل × 3.5ث = 17.5ث)
      // ─────────────────────────────────────────────────────────────
      case "intro_wake": {
        camera.position.set(-23.2, 6.85, -75.0);
        camera.lookAt(-26.6, 4.95, -73.0);

        this.johnGroup.position.set(-26.6, 4.2, -73.2);
        this.johnGroup.rotation.set(0, 0.55, 0);
        this.keyLight.position.set(-24.8, 6.9, -72.2);
        this.keyLight.intensity = 2.5;
        this.fillLight.position.set(-27.8, 5.8, -74.5);
        this.fillLight.intensity = 1.3;

        if (t < 3.5) {
          // المرحلة 1 (0 - 3.5ث): مستلقٍ على ظهره/جنبه على أرضية الغرفة، يحرك رأسه ويدفع بيده اليمنى على الأرض
          const p = smooth01(t / 3.5);
          r.pelvis.position.set(0, lerp(0.14, 0.22, p), 0);
          r.pelvis.rotation.set(lerp(-1.42, -1.05, p), 0, lerp(0.22, 0.05, p));
          r.torso.rotation.x = lerp(0.08, 0.36, p);
          r.torso.rotation.z = lerp(-0.12, 0, p);
          r.headG.rotation.x = lerp(0.18, 0.32, p);
          r.headG.rotation.y = Math.sin(t * 2.8) * 0.28;
          r.jaw.rotation.x = jawTalk * 0.65;

          // اليد اليسرى ترتفع نحو الرأس بينما اليد اليمنى ترتكز على الأرض لدفع الجسم
          r.armL.rotation.x = lerp(-0.35, -1.65, p);
          r.armL.rotation.z = lerp(0.45, 0.18, p);
          r.foreL.rotation.x = lerp(-0.75, -1.55, p);

          r.armR.rotation.x = lerp(0.25, 0.52, p);
          r.armR.rotation.z = lerp(-0.35, -0.22, p);
          r.foreR.rotation.x = lerp(-0.85, -0.45, p);

          r.legL.rotation.x = lerp(-0.18, -0.55, p);
          r.shinL.rotation.x = lerp(0.32, 0.95, p);
          r.legR.rotation.x = lerp(-0.10, -0.38, p);
          r.shinR.rotation.x = lerp(0.20, 0.70, p);
        } else if (t < 7.5) {
          // المرحلة 2 (3.5 - 7.5ث): يجلس ويجثو على ركبته اليمنى بينما يثبت قدمه اليسرى على الأرض ويمسك رأسه من الصداع
          const p = smooth01((t - 3.5) / 4.0);
          r.pelvis.position.set(0, lerp(0.22, 0.56, p), 0);
          r.pelvis.rotation.set(lerp(-1.05, 0.06, p), 0, 0);
          r.torso.rotation.x = lerp(0.36, 0.42, p);
          r.headG.rotation.x = lerp(0.32, 0.35, p);
          r.headG.rotation.y = Math.sin(t * 2.4) * 0.20;
          r.jaw.rotation.x = jawTalk;

          // اليد اليسرى تمسك الجبهة، واليد اليمنى تستند على الركبة اليسرى المتقدمة
          r.armL.rotation.x = lerp(-1.65, -2.18, p);
          r.armL.rotation.z = 0.20;
          r.foreL.rotation.x = lerp(-1.55, -1.85, p);

          r.armR.rotation.x = lerp(0.52, -0.78, p);
          r.armR.rotation.z = lerp(-0.22, -0.08, p);
          r.foreR.rotation.x = lerp(-0.45, -0.68, p);

          // وضع نصف الركوع الواقعي: الساق اليسرى مثنية للنهوض، والساق اليمنى جاثية خلفها
          r.legL.rotation.x = lerp(-0.55, -1.28, p);
          r.shinL.rotation.x = lerp(0.95, 1.32, p);
          r.footL.rotation.x = lerp(0, -0.05, p);

          r.legR.rotation.x = lerp(-0.38, -0.45, p);
          r.shinR.rotation.x = lerp(0.70, 1.65, p);
          r.footR.rotation.x = lerp(0, 0.35, p);
        } else if (t < 11.5) {
          // المرحلة 3 (7.5 - 11.5ث): يدفع بيده اليمنى على فخذه الأيسر ويميل بجذعه للأمام ليرفع مركز ثقله ويقف بواقعية
          const p = smooth01((t - 7.5) / 4.0);
          const leanForward = Math.sin(p * Math.PI) * 0.28;
          r.pelvis.position.set(0, lerp(0.56, 0.92, p), lerp(0.08, 0, p));
          r.pelvis.rotation.set(lerp(0.06, 0, p), 0, 0);
          r.torso.rotation.x = lerp(0.42, 0.10, p) + leanForward;
          r.headG.rotation.x = lerp(0.35, 0.26, p) - leanForward * 0.5;
          r.headG.rotation.y = -0.14 * p;
          r.jaw.rotation.x = jawTalk;

          // اليد اليسرى تنزل تدريجياً، واليد اليمنى تدفع الفخذ ثم ترتفع لتتفحص شارة الباحث على صدره
          r.armL.rotation.x = lerp(-2.18, -0.28, p);
          r.armL.rotation.z = lerp(0.20, 0.08, p);
          r.foreL.rotation.x = lerp(-1.85, -0.52, p);

          r.armR.rotation.x = lerp(-0.78, -1.18, p);
          r.armR.rotation.y = lerp(0, -0.42, p);
          r.foreR.rotation.x = lerp(-0.68, -1.38, p);

          // فرد الساقين تدريجياً من الورك والركبة والكاحل حتى الاستقامة الكاملة على الأرض
          r.legL.rotation.x = lerp(-1.28, -0.04, p);
          r.shinL.rotation.x = lerp(1.32, 0.08, p);
          r.footL.rotation.x = lerp(-0.05, -0.04, p);

          r.legR.rotation.x = lerp(-0.45, 0.04, p);
          r.shinR.rotation.x = lerp(1.65, 0.08, p);
          r.footR.rotation.x = lerp(0.35, -0.04, p);
        } else {
          // المرحلة 4 (11.5 - 17.5ث): يقف متزناً مع حركة تنفس طبيعية، ثم يلتفت نحو مكتبه حيث يوجد التسجيل الصوتي
          const p = smooth01((t - 11.5) / Math.max(0.5, totalDuration - 11.5));
          const breath = Math.sin(t * 2.4) * 0.015;
          this.johnGroup.rotation.set(0, lerp(0.55, 0.22, p), 0);
          r.pelvis.position.set(0, 0.92 + breath, 0);
          r.torso.rotation.x = 0.05 + breath;
          r.torso.rotation.y = Math.sin(p * Math.PI) * 0.24;
          r.headG.rotation.x = -0.04;
          r.headG.rotation.y = Math.sin(t * 1.6) * 0.32;
          r.jaw.rotation.x = jawTalk;

          r.armL.rotation.x = -0.28;
          r.foreL.rotation.x = -0.55;
          r.armR.rotation.x = lerp(-1.18, -0.48, p);
          r.armR.rotation.y = lerp(-0.42, 0, p);
          r.foreR.rotation.x = lerp(-1.38, -0.82, p);

          r.legL.rotation.x = -0.04;
          r.shinL.rotation.x = 0.08;
          r.legR.rotation.x = 0.04;
          r.shinR.rotation.x = 0.08;
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 2) مشهد بث رسالة الإذاعة: جون يتعامل مع كمبيوتر وميكروفون غرفة الإذاعة (4 جمل × 3.5ث = 14ث)
      // ─────────────────────────────────────────────────────────────
      case "radio_broadcast": {
        // الكمبيوتر موضوع على المكتب عند (71.5, 4.2, -70.2) ولوحة المفاتيح عند z = -69.92
        camera.position.set(69.2, 5.95, -67.9);
        camera.lookAt(71.45, 5.18, -70.1);

        // يقف جون مباشرة أمام لوحة المفاتيح والشاشة متجهاً للشمال (-Z أي rotation.y = Math.PI)
        this.johnGroup.position.set(71.42, 4.2, -69.34);
        this.johnGroup.rotation.set(0, Math.PI, 0);
        this.keyLight.position.set(70.2, 6.4, -68.8);
        this.keyLight.intensity = 2.4;
        this.fillLight.position.set(72.4, 5.6, -70.1);
        this.fillLight.intensity = 1.7;

        if (t < 4.5) {
          // المرحلة 1 (0 - 4.5ث): جون يكتب أوامر تفعيل البث على لوحة مفاتيح الكمبيوتر بكلتا يديه وينظر للشاشة
          this.playOnce("radio_click", () => audio.play("pickup"));
          r.pelvis.position.y = 0.91;
          r.torso.rotation.x = 0.18;
          r.headG.rotation.x = -0.08 + Math.sin(t * 3.0) * 0.04;
          r.headG.rotation.y = -0.10 + Math.sin(t * 2.2) * 0.08;
          r.jaw.rotation.x = jawTalk;

          // الذراعان ممتدتان للأمام نحو لوحة المفاتيح مع حركة نقر سريعة متبادلة في الساعدين واليدين
          const typeL = Math.sin(t * 15) * 0.07;
          const typeR = Math.cos(t * 15) * 0.07;
          r.armL.rotation.set(-0.78 + typeL * 0.4, 0.16, 0.06);
          r.foreL.rotation.x = -0.82 - typeL;
          r.handL.rotation.x = 0.25 + typeL * 1.5;

          r.armR.rotation.set(-0.78 + typeR * 0.4, -0.16, -0.06);
          r.foreR.rotation.x = -0.82 - typeR;
          r.handR.rotation.x = 0.25 + typeR * 1.5;
        } else if (t < 10.5) {
          // المرحلة 2 (4.5 - 10.5ث): يمسك الميكروفون بيده اليمنى ويبقيه اليد اليسرى على الفأرة/لوحة المفاتيح مستمعاً للرد العسكري
          this.playOnce("radio_static", () => audio.play("radio_static"));
          r.pelvis.position.y = 0.91;
          r.torso.rotation.x = 0.15;
          r.torso.rotation.y = -0.06;
          r.headG.rotation.x = -0.05 + Math.sin(t * 2.2) * 0.05;
          r.headG.rotation.y = 0.12 + Math.sin(t * 1.4) * 0.10;
          r.jaw.rotation.x = t < 7.0 ? 0.04 : jawTalk;

          // اليد اليسرى على لوحة المفاتيح، واليد اليمنى ممدودة نحو الميكروفون على يمين الشاشة
          r.armL.rotation.set(-0.74, 0.14, 0.05);
          r.foreL.rotation.x = -0.84;
          r.armR.rotation.set(-0.98, -0.22, -0.08);
          r.foreR.rotation.x = -0.62;
        } else {
          // المرحلة 3 (10.5 - 14ث): يضغط زر التأكيد الأخير على الكمبيوتر ويومئ برأسه بحزم بعد عودة طاقة الطوارئ
          const p = smooth01((t - 10.5) / Math.max(0.5, totalDuration - 10.5));
          r.pelvis.position.y = 0.92;
          r.torso.rotation.x = lerp(0.15, 0.06, p);
          r.headG.rotation.x = Math.sin(t * 5.0) * 0.10;
          r.headG.rotation.y = lerp(0.10, -0.08, p);
          r.jaw.rotation.x = jawTalk;
          r.armL.rotation.set(lerp(-0.74, -0.32, p), 0.08, 0);
          r.foreL.rotation.x = lerp(-0.84, -0.58, p);
          r.armR.rotation.set(lerp(-0.98, -0.45, p), -0.08, 0);
          r.foreR.rotation.x = lerp(-0.62, -0.75, p);
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 3) مشاهد التفاعل مع الشخصيات الثلاثة (سارة / عادل / الرقيب — 9 جمل × 3.5ث = 31.5 ثانية)
      // ─────────────────────────────────────────────────────────────
      case "survivor_sara":
      case "survivor_adel":
      case "survivor_soldier": {
        const survId = id === "survivor_sara" ? "sara" : id === "survivor_adel" ? "adel" : "soldier";
        const survEntry = world.survivors.find((s) => s.id === survId);

        // إحداثيات الغرفة، ومواقع الشخصيات، ومسار الباب الفعلي لكل غرفة في world.ts:
        // - سارة (المستشفى): عند (82, 30)، وباب الخروج في الجدار الغربي للغرفة عند (75.0, 29.0) ثم المخرج الرئيسي (56.0, 22.0)
        // - عادل (المصنع): عند (-61, 29)، ومخرج قاعة المصنع في الجدار الشرقي عند (-53.5, 22.0)
        // - الرقيب (المستودع): عند (-59, 64)، وباب المستودع في الجدار الشرقي عند (-54.0, 68.0)
        let jx = 80.2, jz = 29.8, jRy = Math.atan2(82.0 - 80.2, -(30.0 - 29.8));
        let sx = 82.0, sz = 30.0, sRy = Math.atan2(80.2 - 82.0, -(29.8 - 30.0));
        let doorWp1: [number, number] = [78.0, 29.0];
        let doorWp2: [number, number] = [73.2, 29.0];
        let pointAngleWorld = Math.atan2(75.0 - jx, -(29.0 - jz));

        if (survId === "sara") {
          camera.position.set(78.8, 2.75, 26.8);
          camera.lookAt(80.6, 1.15, 29.6);
          this.keyLight.position.set(80.8, 3.2, 28.5);
          this.fillLight.position.set(78.5, 2.2, 30.8);
        } else if (survId === "adel") {
          jx = -59.2; jz = 28.2;
          sx = -61.0; sz = 29.0;
          jRy = Math.atan2(sx - jx, -(sz - jz));
          sRy = Math.atan2(jx - sx, -(jz - sz));
          doorWp1 = [-57.2, 25.5];
          doorWp2 = [-53.2, 22.0];
          pointAngleWorld = Math.atan2(-53.5 - jx, -(22.0 - jz));

          camera.position.set(-62.8, 2.85, 25.4);
          camera.lookAt(-59.6, 1.15, 27.8);
          this.keyLight.position.set(-59.8, 3.2, 27.5);
          this.fillLight.position.set(-57.5, 2.4, 25.0);
        } else {
          jx = -57.4; jz = 64.6;
          sx = -59.0; sz = 64.0;
          jRy = Math.atan2(sx - jx, -(sz - jz));
          sRy = Math.atan2(jx - sx, -(jz - sz));
          doorWp1 = [-56.2, 66.8];
          doorWp2 = [-53.2, 68.0];
          pointAngleWorld = Math.atan2(-54.0 - jx, -(68.0 - jz));

          camera.position.set(-61.2, 2.85, 67.2);
          camera.lookAt(-57.6, 1.15, 65.4);
          this.keyLight.position.set(-58.2, 3.2, 65.5);
          this.fillLight.position.set(-55.8, 2.4, 67.2);
        }
        this.keyLight.intensity = 2.4;
        this.fillLight.intensity = 1.4;

        // فتح أبواب المبنى تلقائياً أثناء مرحلة مغادرة الناجي حتى يخرج من الباب بواقعية دون اختراق الجدار
        if (t > 24.0) {
          for (const d of world.doors) {
            if (Math.hypot(d.def.group.position.x - doorWp2[0], d.def.group.position.z - doorWp2[1]) < 8.0) {
              d.open = true;
              d.def.open = true;
              d.def.group.rotation.y = lerp(d.def.group.rotation.y, -Math.PI * 0.58, 0.15);
            }
          }
        }

        this.johnGroup.position.set(jx, 0, jz);
        this.johnGroup.rotation.set(0, jRy, 0);

        const sRig = survEntry?.obj.userData.rig as SurvivorRig | undefined;
        if (survEntry && sRig) {
          survEntry.obj.position.set(sx, 0, sz);
          survEntry.obj.rotation.set(0, sRy, 0);
          resetSurvivorRig(sRig);
        }

        const msgIdx = Math.floor(t / SUBTITLE_DURATION);
        const johnSpeaking = msgIdx === 0 || msgIdx === 7 || msgIdx === 8;
        const survSpeaking = !johnSpeaking;

        if (t < 3.5) {
          // المرحلة 1 (0 - 3.5ث): جون يمد يده اليمنى لتسليم المؤن والناجي يستلمها وينهض واقفاً
          const p = smooth01(t / 3.5);
          this.supplyBoxGroup.visible = t < 3.1;
          r.torso.rotation.x = lerp(0.04, 0.16, Math.sin(p * Math.PI));
          r.armR.rotation.x = lerp(-0.2, -1.25, Math.sin(p * Math.PI));
          r.foreR.rotation.x = lerp(-0.3, -0.55, Math.sin(p * Math.PI));
          r.jaw.rotation.x = johnSpeaking ? jawTalk : 0;

          if (sRig) {
            const startY = survId === "adel" ? 0.92 : 0.56;
            sRig.pelvis.position.y = lerp(startY, 0.92, p);
            sRig.legL.rotation.x = lerp(survId === "adel" ? 0 : -1.35, 0, p);
            sRig.shinL.rotation.x = lerp(survId === "adel" ? 0 : 1.45, 0.05, p);
            sRig.legR.rotation.x = lerp(survId === "adel" ? 0 : -1.25, 0, p);
            sRig.shinR.rotation.x = lerp(survId === "adel" ? 0 : 1.45, 0.05, p);
            sRig.armL.rotation.x = lerp(-0.4, -1.1, Math.sin(p * Math.PI));
            sRig.foreL.rotation.x = -0.65;
            sRig.armR.rotation.x = lerp(-0.4, -1.1, Math.sin(p * Math.PI));
            sRig.foreR.rotation.x = -0.65;
            sRig.jaw.rotation.x = survSpeaking ? jawTalk : 0;
          }
        } else if (t < 24.5) {
          // المرحلة 2 (3.5 - 24.5ث): الناجي يشرح ما جرى له (الرسائل 2 إلى 7) وجون يصغي إليه
          r.torso.rotation.x = 0.05;
          r.headG.rotation.x = Math.sin(t * 1.5) * 0.06;
          r.headG.rotation.y = Math.sin(t * 0.9) * 0.08;
          r.armL.rotation.x = -0.25;
          r.foreL.rotation.x = -0.55;
          r.armR.rotation.x = -0.35;
          r.foreR.rotation.x = -0.75;
          r.jaw.rotation.x = 0;

          if (sRig) {
            sRig.pelvis.position.y = 0.92;
            sRig.torso.rotation.x = 0.08 + Math.sin(t * 2.0) * 0.04;
            sRig.torso.rotation.y = Math.sin(t * 1.3) * 0.12;
            sRig.headG.rotation.x = Math.sin(t * 2.4) * 0.10;
            sRig.headG.rotation.y = Math.cos(t * 1.7) * 0.18;
            sRig.jaw.rotation.x = jawTalk;
            sRig.armL.rotation.x = -0.65 + Math.sin(t * 2.8) * 0.35;
            sRig.armL.rotation.z = 0.15 + Math.cos(t * 2.1) * 0.12;
            sRig.foreL.rotation.x = -0.75 + Math.sin(t * 3.2) * 0.25;
            sRig.armR.rotation.x = -0.75 + Math.cos(t * 2.6) * 0.38;
            sRig.armR.rotation.z = -0.15 - Math.sin(t * 2.3) * 0.12;
            sRig.foreR.rotation.x = -0.80 + Math.cos(t * 3.0) * 0.25;
          }
        } else if (t < 28.0) {
          // المرحلة 3 (24.5 - 28.0ث): جون يلتفت نصف التفاتة ويشير بيده نحو باب الغرفة طالباً من الناجي الهرب إلى الميناء
          const p = smooth01((t - 24.5) / 3.5);
          this.johnGroup.rotation.set(0, lerp(jRy, pointAngleWorld, p * 0.45), 0);
          r.torso.rotation.x = 0.08;
          r.torso.rotation.y = 0.16;
          r.headG.rotation.y = 0.12;
          r.jaw.rotation.x = jawTalk;
          r.armL.rotation.x = -1.28 + Math.sin(t * 3.5) * 0.12;
          r.armL.rotation.z = 0.28;
          r.foreL.rotation.x = -0.32;
          r.armR.rotation.x = -0.45;
          r.foreR.rotation.x = -0.65;

          if (sRig) {
            sRig.headG.rotation.x = Math.sin(t * 4.5) * 0.12;
            sRig.armL.rotation.x = -0.25;
            sRig.foreL.rotation.x = -0.45;
            sRig.armR.rotation.x = -0.35;
            sRig.foreR.rotation.x = -0.55;
          }
        } else {
          // المرحلة 4 (28.0 - 31.5ث): الناجي يستدير بالاتجاه الصحيح ويتحرك عبر مسار الباب الفعلي لمغادرة المكان نحو الميناء
          const p = clamp01((t - 28.0) / Math.max(0.5, totalDuration - 28.0));
          r.armR.rotation.x = -0.45;
          r.foreR.rotation.x = -0.65;

          if (survEntry && sRig) {
            let curX = sx, curZ = sz, targetX = doorWp1[0], targetZ = doorWp1[1];
            if (p < 0.45) {
              const seg = smooth01(p / 0.45);
              curX = lerp(sx, doorWp1[0], seg);
              curZ = lerp(sz, doorWp1[1], seg);
              targetX = doorWp1[0];
              targetZ = doorWp1[1];
            } else {
              const seg = smooth01((p - 0.45) / 0.55);
              curX = lerp(doorWp1[0], doorWp2[0], seg);
              curZ = lerp(doorWp1[1], doorWp2[1], seg);
              targetX = doorWp2[0];
              targetZ = doorWp2[1];
            }
            const walkFaceRy = Math.atan2(targetX - curX, -(targetZ - curZ));
            survEntry.obj.position.set(curX, 0, curZ);
            survEntry.obj.rotation.set(0, walkFaceRy, 0);

            // يلتفت جون بنظره ليتابع الناجي وهو يخرج من الباب
            this.johnGroup.rotation.set(0, Math.atan2(curX - jx, -(curZ - jz)), 0);

            const wt = t * 8.2;
            const s = Math.sin(wt);
            const c = Math.cos(wt);
            sRig.pelvis.position.y = 0.92 + Math.abs(c) * 0.035;
            sRig.torso.rotation.x = 0.12;
            sRig.torso.rotation.y = -s * 0.08;
            sRig.legL.rotation.x = s * 0.65;
            sRig.legR.rotation.x = -s * 0.65;
            sRig.shinL.rotation.x = Math.max(0.08, -s * 0.60);
            sRig.shinR.rotation.x = Math.max(0.08, s * 0.60);
            sRig.armL.rotation.x = -s * 0.48;
            sRig.armR.rotation.x = s * 0.48;
            sRig.foreL.rotation.x = -0.45;
            sRig.foreR.rotation.x = -0.45;
            sRig.jaw.rotation.x = jawTalk;
          }
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 4) مشهد فتح المختبر السري: توجه جون الصحيح لكل آلة بطاقة واختفاء كل بطاقة عند إدخالها (4 جمل × 3.5ث = 14ث)
      // ─────────────────────────────────────────────────────────────
      case "lab_open": {
        // الكاميرا ثابتة في قاعة بوابة المختبر تطل على القارئ الأيسر (-73.3, -76.9) والأيمن (-68.7, -76.9) والبوابة (-71, -77)
        camera.position.set(-67.2, 3.05, -73.4);
        camera.lookAt(-71.0, 1.45, -77.2);

        this.keyLight.position.set(-69.5, 3.4, -75.2);
        this.keyLight.intensity = 2.5;
        this.fillLight.position.set(-72.8, 2.5, -76.0);
        this.fillLight.intensity = 1.5;

        // البطاقة الزرقاء في يده اليسرى تختفي عند الثانية 2.7 وتظهر داخل فتحة القارئ الأيسر
        const blueInserted = t >= 2.7;
        this.cardBlueMesh.visible = !blueInserted;
        this.insertedBlueCard.visible = blueInserted;

        // البطاقة الحمراء في يده اليمنى تختفي عند الثانية 6.7 وتظهر داخل فتحة القارئ الأيمن
        const redInserted = t >= 6.7;
        this.cardRedMesh.visible = !redInserted;
        this.insertedRedCard.visible = redInserted;

        if (t < 3.5) {
          // المرحلة 1 (0 - 3.5ث): يتجه جون بوجهه نحو آلة البطاقة اليسرى (-73.3, -76.32) ثم يلتفت للشمال ويدخل البطاقة الزرقاء
          if (t < 1.8) {
            const p = smooth01(t / 1.8);
            const tx = -73.3, tz = -76.32;
            const sx = -71.0, sz = -75.6;
            this.johnGroup.position.set(lerp(sx, tx, p), 0, lerp(sz, tz, p));
            this.johnGroup.rotation.set(0, Math.atan2(tx - sx, -(tz - sz)), 0);
            this.animateJohnLocomotion(t, 7.5, false, true);
          } else {
            const p = smooth01((t - 1.8) / 1.7);
            this.johnGroup.position.set(-73.3, 0, -76.32);
            this.johnGroup.rotation.set(0, Math.PI, 0); // يواجه آلة إدخال البطاقة الزرقاء مباشرة
            if (t >= 2.7) {
              this.playOnce("card_blue", () => audio.play("pickup"));
            }
            const reach = Math.sin(Math.min(1, p * 1.25) * Math.PI);
            r.torso.rotation.x = 0.16 * reach;
            r.headG.rotation.x = 0.08;
            r.jaw.rotation.x = jawTalk;
            r.armL.rotation.x = lerp(-0.35, -1.38, reach);
            r.foreL.rotation.x = lerp(-0.55, -0.42, reach);
            r.armR.rotation.x = -0.35;
            r.foreR.rotation.x = -0.65;
          }
        } else if (t < 7.5) {
          // المرحلة 2 (3.5 - 7.5ث): يستدير لليمين (+X أي rotation.y = Math.PI/2) ويسير للأمام نحو آلة البطاقة اليمنى (-68.7, -76.32) ثم يدخل البطاقة الحمراء
          if (t < 5.6) {
            const p = smooth01((t - 3.5) / 2.1);
            this.johnGroup.position.set(lerp(-73.3, -68.7, p), 0, -76.32);
            this.johnGroup.rotation.set(0, Math.PI / 2, 0); // متجه نحو الشرق (+X) وهو اتجاه سيره الحقيقي
            this.animateJohnLocomotion(t, 8.2, false, true);
          } else {
            const p = smooth01((t - 5.6) / 1.9);
            this.johnGroup.position.set(-68.7, 0, -76.32);
            this.johnGroup.rotation.set(0, Math.PI, 0); // يواجه آلة إدخال البطاقة الحمراء مباشرة
            if (t >= 6.7) {
              this.playOnce("card_red", () => audio.play("pickup"));
            }
            const reach = Math.sin(Math.min(1, p * 1.25) * Math.PI);
            r.torso.rotation.x = 0.16 * reach;
            r.headG.rotation.x = 0.08;
            r.jaw.rotation.x = jawTalk;
            r.armR.rotation.x = lerp(-0.35, -1.38, reach);
            r.foreR.rotation.x = lerp(-0.55, -0.42, reach);
            r.armL.rotation.x = -0.30;
            r.foreL.rotation.x = -0.55;
          }
        } else if (t < 10.5) {
          // المرحلة 3 (7.5 - 10.5ث): يستدير لليسار (-X أي -Math.PI/2) ويعود لمنتصف البوابة ثم يواجهها بينما ترتفع للأعلى
          this.playOnce("door_open_sfx", () => audio.play("door_open"));
          const p = smooth01((t - 7.5) / 3.0);
          if (world.labDoor?.group) {
            world.labDoor.group.position.y = lerp(0, 3.3, p);
          }
          if (p < 0.55) {
            const wp = smooth01(p / 0.55);
            this.johnGroup.position.set(lerp(-68.7, -71.0, wp), 0, -76.1);
            this.johnGroup.rotation.set(0, -Math.PI / 2, 0); // يسير باتجاه الغرب (-X) نحو المنتصف
            this.animateJohnLocomotion(t, 7.5, false, true);
          } else {
            this.johnGroup.position.set(-71.0, 0, -76.1);
            this.johnGroup.rotation.set(0, Math.PI, 0); // يواجه البوابة المفتوحة بوضعية ترقب
            r.pelvis.position.y = 0.84;
            r.torso.rotation.x = 0.22;
            r.headG.rotation.x = -0.12;
            r.headG.rotation.y = Math.sin(t * 3.0) * 0.22;
            r.jaw.rotation.x = jawTalk;
            r.legL.rotation.x = -0.28;
            r.shinL.rotation.x = 0.35;
            r.legR.rotation.x = -0.22;
            r.shinR.rotation.x = 0.30;
            r.armL.rotation.x = -0.65;
            r.foreL.rotation.x = -0.85;
            r.armR.rotation.x = -0.75;
            r.foreR.rotation.x = -0.95;
          }
        } else {
          // المرحلة 4 (10.5 - 14ث): يتقدم جون بحذر وترقب عبر البوابة المفتوحة نحو مصعد المختبر
          const p = smooth01((t - 10.5) / Math.max(0.5, totalDuration - 10.5));
          if (world.labDoor?.group) {
            world.labDoor.group.position.y = 3.3;
          }
          this.johnGroup.position.set(-71.0, 0, lerp(-76.1, -80.4, p));
          this.johnGroup.rotation.set(0, Math.PI, 0);
          this.animateJohnLocomotion(t, 6.4, true, true);
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 5) مشهد وصول جون إلى المختبر ونهوض الوحش «الحارس» وهو يغضب (7.5 ثوانٍ)
      // ─────────────────────────────────────────────────────────────
      case "boss_awaken": {
        // الكاميرا ثابتة بجانب/فوق جون في قاعة الاحتواء الكبرى تنظر نحو الحارس
        camera.position.set(603.3, 2.85, -8.8);
        camera.lookAt(600.0, 1.95, -15.5);

        this.keyLight.position.set(600.0, 3.9, -13.5);
        this.keyLight.intensity = 2.8;
        this.fillLight.position.set(602.0, 2.5, -10.0);
        this.fillLight.intensity = 1.6;

        // حركة جون: يتقدم خطوتين ثم يتراجع متأهباً للقتال
        const walkIn = clamp01(t / 2.0);
        const stepBack = clamp01((t - 4.2) / 2.0);
        this.johnGroup.position.set(600.0, 0, lerp(-8.2, -9.8, walkIn) + stepBack * 0.7);
        this.johnGroup.rotation.set(0, Math.PI, 0);

        if (t < 2.0) {
          this.animateJohnLocomotion(t, 6.0, true, true);
        } else {
          r.pelvis.position.y = 0.80;
          r.torso.rotation.x = 0.24 - stepBack * 0.12;
          r.headG.rotation.x = -0.18;
          r.jaw.rotation.x = jawTalk;
          r.legL.rotation.x = -0.35;
          r.shinL.rotation.x = 0.45;
          r.legR.rotation.x = -0.15;
          r.shinR.rotation.x = 0.35;
          r.armL.rotation.x = -0.85;
          r.foreL.rotation.x = -1.05;
          r.armR.rotation.x = -0.95;
          r.foreR.rotation.x = -1.15;
        }

        // تحريك مفاصل الوحش «الحارس» (جاثٍ -> ينهض ببطء -> يفرد ذراعيه ويزأر بغضب شديد)
        const br = this.bossActor?.getRig();
        if (br && this.bossActor) {
          if (t < 2.2) {
            // رابض/جاثٍ على ركبتيه ورأسه منخفض
            const p = smooth01(t / 2.2);
            br.pelvis.position.y = lerp(0.52, 0.64, p);
            br.torso.rotation.set(lerp(0.78, 0.55, p), Math.sin(t * 3) * 0.08, 0);
            br.headG.rotation.set(0.35, Math.sin(t * 4) * 0.15, 0);
            br.jaw.rotation.x = 0.15;
            br.legLU.rotation.x = -1.25;
            br.shinLU.rotation.x = 1.45;
            br.legRU.rotation.x = -1.15;
            br.shinRU.rotation.x = 1.35;
            br.armLU.rotation.set(-0.65, 0, 0.15);
            br.foreLU.rotation.x = -0.75;
            br.armRU.rotation.set(-0.65, 0, -0.15);
            br.foreRU.rotation.x = -0.75;
          } else if (t < 4.5) {
            // ينهض بكامل قامته الضخمة ويرفع صدره المدرع
            const p = smooth01((t - 2.2) / 2.3);
            br.pelvis.position.y = lerp(0.64, 0.95, p);
            br.torso.rotation.set(lerp(0.55, -0.18, p), 0, 0);
            br.headG.rotation.set(lerp(0.35, -0.25, p), 0, 0);
            br.jaw.rotation.x = lerp(0.15, 0.45, p);
            br.legLU.rotation.x = lerp(-1.25, -0.08, p);
            br.shinLU.rotation.x = lerp(1.45, 0.12, p);
            br.legRU.rotation.x = lerp(-1.15, 0.08, p);
            br.shinRU.rotation.x = lerp(1.35, 0.12, p);
            br.armLU.rotation.set(lerp(-0.65, -1.65, p), 0, lerp(0.15, 0.55, p));
            br.foreLU.rotation.x = lerp(-0.75, -0.45, p);
            br.armRU.rotation.set(lerp(-0.65, -1.65, p), 0, lerp(-0.15, -0.55, p));
            br.foreRU.rotation.x = lerp(-0.75, -0.45, p);
          } else {
            // يزأر بغضب هائل ويهز رأسه وذراعيه مفتوحتين على مصراعيهما
            this.playOnce("boss_roar", () => audio.play("roar"));
            const shake = Math.sin(t * 16);
            br.pelvis.position.y = 0.95;
            br.torso.rotation.set(-0.24 + shake * 0.04, Math.sin(t * 7) * 0.14, shake * 0.03);
            br.headG.rotation.set(-0.32 + shake * 0.08, Math.sin(t * 9) * 0.25, shake * 0.06);
            br.jaw.rotation.x = 0.68 + Math.abs(shake) * 0.18;
            br.legLU.rotation.x = -0.12;
            br.shinLU.rotation.x = 0.18;
            br.legRU.rotation.x = 0.12;
            br.shinRU.rotation.x = 0.18;
            br.armLU.rotation.set(-1.95 + shake * 0.15, 0, 0.68);
            br.foreLU.rotation.x = -0.35;
            br.armRU.rotation.set(-1.95 - shake * 0.15, 0, -0.68);
            br.foreRU.rotation.x = -0.35;
          }
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 6) مشهد وصول جون إلى النواة والتحدث معها (30 ثانية)
      // ─────────────────────────────────────────────────────────────
      case "core_dialogue": {
        camera.position.set(603.8, 3.25, -26.2);
        camera.lookAt(600.0, 1.65, -29.8);

        this.keyLight.position.set(601.5, 3.5, -28.5);
        this.keyLight.intensity = 2.6;
        this.fillLight.position.set(598.5, 2.8, -27.5);
        this.fillLight.intensity = 1.5;

        const msgIdx = Math.floor(t / SUBTITLE_DURATION);
        const johnSpeaking = msgIdx === 0 || msgIdx === 3 || msgIdx === 6 || msgIdx === 9;

        if (t < 4.5) {
          // يتقدم جون ببطء نحو منصة النواة المركزية
          const p = smooth01(t / 4.5);
          this.johnGroup.position.set(600.0, 0, lerp(-25.4, -28.2, p));
          this.johnGroup.rotation.set(0, Math.PI, 0);
          this.animateJohnLocomotion(t, 5.5, false, johnSpeaking);
          r.headG.rotation.x = -0.18;
        } else {
          this.johnGroup.position.set(600.0, 0, -28.2);
          this.johnGroup.rotation.set(0, Math.PI, 0);
          r.pelvis.position.y = 0.92 + Math.sin(t * 1.8) * 0.012;
          r.torso.rotation.x = 0.05;
          r.torso.rotation.y = Math.sin(t * 0.9) * 0.08;
          r.headG.rotation.x = -0.22 + Math.sin(t * 2.0) * 0.05;
          r.headG.rotation.y = Math.cos(t * 1.2) * 0.12;
          r.jaw.rotation.x = johnSpeaking ? jawTalk : 0;

          if (msgIdx === 3) {
            // جون يضع يده اليسرى على رأسه حين يذكر مسح ذاكرته
            r.armL.rotation.x = -2.05;
            r.armL.rotation.z = 0.18;
            r.foreL.rotation.x = -1.75;
            r.armR.rotation.x = -0.35;
            r.foreR.rotation.x = -0.55;
          } else if (johnSpeaking) {
            // جون يشير بيده اليمنى نحو النواة بحركات حوارية
            r.armR.rotation.x = -1.05 + Math.sin(t * 3.5) * 0.25;
            r.armR.rotation.z = -0.15;
            r.foreR.rotation.x = -0.55 + Math.cos(t * 3.5) * 0.2;
            r.armL.rotation.x = -0.35 + Math.sin(t * 2.4) * 0.15;
            r.foreL.rotation.x = -0.6;
          } else {
            // يصغي إلى كيميرا بترقب
            r.armL.rotation.x = -0.28;
            r.foreL.rotation.x = -0.65;
            r.armR.rotation.x = -0.32;
            r.foreR.rotation.x = -0.70;
          }
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 7) مشهد نهاية الهروب: جون يرفض التفاعل ويترك المختبر راكضاً (4 جمل × 3.5ث = 14 ثانية)
      // ─────────────────────────────────────────────────────────────
      case "ending_escape_scene": {
        camera.position.set(603.7, 3.15, -25.2);
        camera.lookAt(600.0, 1.45, -27.2);

        this.keyLight.position.set(601.5, 3.5, -26.5);
        this.keyLight.intensity = 2.5;
        this.fillLight.position.set(598.5, 2.5, -25.5);
        this.fillLight.intensity = 1.4;

        if (t < 4.5) {
          // يتراجع خطوتين للخلف ويهز رأسه رافضاً
          const p = smooth01(t / 4.5);
          this.johnGroup.position.set(600.0, 0, lerp(-28.2, -27.0, p));
          this.johnGroup.rotation.set(0, Math.PI, 0);
          r.torso.rotation.x = -0.06;
          r.headG.rotation.y = Math.sin(t * 6.5) * 0.32;
          r.jaw.rotation.x = jawTalk;
          r.armL.rotation.x = -0.85;
          r.foreL.rotation.x = -0.75;
          r.armR.rotation.x = -0.85;
          r.foreR.rotation.x = -0.75;
          r.legL.rotation.x = Math.sin(t * 6) * 0.35;
          r.legR.rotation.x = -Math.sin(t * 6) * 0.35;
        } else if (t < 6.5) {
          // يستدير 180 درجة نحو مخرج المختبر الجنوبي (+Z أي rotation.y = 0)
          const p = smooth01((t - 4.5) / 2.0);
          this.johnGroup.position.set(600.0, 0, -27.0);
          this.johnGroup.rotation.set(0, lerp(Math.PI, 0, p), 0);
          r.torso.rotation.x = 0.14;
          r.jaw.rotation.x = jawTalk;
          r.armL.rotation.x = -0.45;
          r.foreL.rotation.x = -0.85;
          r.armR.rotation.x = -0.45;
          r.foreR.rotation.x = -0.85;
        } else {
          // يركض مسرعاً بالاتجاه الصحيح نحو باب الخروج (+Z)
          const p = clamp01((t - 6.5) / Math.max(0.5, totalDuration - 6.5));
          this.johnGroup.position.set(600.0, 0, lerp(-27.0, -17.5, p));
          this.johnGroup.rotation.set(0, 0, 0);
          this.animateJohnLocomotion(t, 10.0, false, true);
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 8) مشهد نهاية تدمير النواة: جون يطلق النار على النواة فتنكسر وتتحطم ثم يترك المختبر (4 جمل × 3.5ث = 14 ثانية)
      // ─────────────────────────────────────────────────────────────
      case "ending_destroy_scene": {
        camera.position.set(603.6, 2.95, -25.8);
        camera.lookAt(600.0, 1.65, -29.8);

        this.keyLight.position.set(600.0, 3.6, -29.5);
        this.keyLight.intensity = 2.8 + (t > 2.2 && t < 8.5 ? Math.sin(t * 24) * 1.3 : 0);
        this.fillLight.position.set(602.5, 2.5, -27.0);
        this.fillLight.intensity = 1.5;

        this.johnGunGroup.visible = true;

        if (t < 2.2) {
          // المرحلة 1 (0 - 2.2ث): يشهر جون سلاحه ويرفع ذراعيه ليصوّب مباشرة نحو قلب النواة الزجاجي عند (600, 1.85, -30.5)
          const p = smooth01(t / 2.2);
          this.johnGroup.position.set(600.0, 0, -27.4);
          this.johnGroup.rotation.set(0, Math.PI, 0);
          r.pelvis.position.y = 0.89;
          r.torso.rotation.x = lerp(0.05, 0.08, p);
          r.torso.rotation.y = -0.08 * p;
          r.headG.rotation.x = lerp(0, -0.10, p);
          r.jaw.rotation.x = jawTalk;

          // تصويب المسدس بكلتا اليدين نحو قلب النواة
          r.armR.rotation.set(lerp(-0.35, -1.52, p), -0.08 * p, 0);
          r.foreR.rotation.x = lerp(-0.55, -0.08, p);
          r.armL.rotation.set(lerp(-0.35, -1.42, p), 0.24 * p, 0);
          r.foreL.rotation.x = lerp(-0.55, -0.18, p);
          r.legL.rotation.x = -0.12 * p;
          r.shinL.rotation.x = 0.16 * p;
          r.legR.rotation.x = 0.14 * p;
          r.shinR.rotation.x = 0.12 * p;
        } else if (t < 6.8) {
          // المرحلة 2 (2.2 - 6.8ث): يطلق جون 3 طلقات نارية متتالية (عند 2.4ث و 3.7ث و 5.0ث) تحطم النواة الزجاجية وتكسرها إلى شظايا متناثرة
          this.johnGroup.position.set(600.0, 0, -27.4);
          this.johnGroup.rotation.set(0, Math.PI, 0);

          const shotTimes = [2.4, 3.7, 5.0];
          let recoil = 0;
          let flashActive = false;
          shotTimes.forEach((st, idx) => {
            if (t >= st) {
              this.playOnce(`core_shot_${idx}`, () => audio.play("shot_pistol"));
              const dtShot = t - st;
              if (dtShot < 0.38) {
                recoil = Math.max(recoil, Math.sin((dtShot / 0.38) * Math.PI));
              }
              if (dtShot < 0.11) {
                flashActive = true;
              }
            }
          });

          this.johnMuzzleFlash.visible = flashActive;
          this.johnMuzzleLight.intensity = flashActive ? 10 : 0;

          r.pelvis.position.y = 0.89;
          r.torso.rotation.x = 0.08 - recoil * 0.12;
          r.torso.rotation.y = -0.08;
          r.headG.rotation.x = -0.10 - recoil * 0.06;
          r.jaw.rotation.x = jawTalk;

          // ارتداد مفصل الكتف والكوع عند كل طلقة نارية
          r.armR.rotation.set(-1.52 - recoil * 0.32, -0.08, 0);
          r.foreR.rotation.x = -0.08 - recoil * 0.25;
          r.armL.rotation.set(-1.42 - recoil * 0.25, 0.24, 0);
          r.foreL.rotation.x = -0.18 - recoil * 0.20;
          r.legL.rotation.x = -0.12;
          r.shinL.rotation.x = 0.16;
          r.legR.rotation.x = 0.14;
          r.shinR.rotation.x = 0.12;

          // عند الطلقة الثالثة (t >= 5.05): تنكسر النواة الزجاجية وتنفجر إلى شظايا بلورية ومعدنية تتطاير وتتناثر على الأرضية
          if (t >= 5.05) {
            this.playOnce("core_shatter_boom", () => audio.play("explosion"));
            this.scene.traverse((obj) => {
              if (obj.userData?.isCoreIntact) {
                obj.visible = false;
              }
            });
            this.coreShardsGroup.visible = true;
            const st = t - 5.05;
            for (const sh of this.coreShards) {
              const px = sh.dir.x * st;
              const pz = sh.dir.z * st;
              const py = Math.max(-1.75, sh.dir.y * st - 0.5 * 9.2 * st * st);
              sh.mesh.position.set(px, py, pz);
              if (py > -1.74) {
                sh.mesh.rotation.x += sh.rotSpeed.x * 0.025;
                sh.mesh.rotation.y += sh.rotSpeed.y * 0.025;
                sh.mesh.rotation.z += sh.rotSpeed.z * 0.025;
              }
            }
          }
        } else {
          // المرحلة 3 (6.8 - 14ث): تظل شظايا النواة المحطمة على الأرض بينما يستدير جون ويركض مغادراً المختبر بالاتجاه الصحيح (+Z)
          this.coreShardsGroup.visible = true;
          const st = Math.min(3.0, t - 5.05);
          for (const sh of this.coreShards) {
            const px = sh.dir.x * st;
            const pz = sh.dir.z * st;
            const py = Math.max(-1.75, sh.dir.y * st - 0.5 * 9.2 * st * st);
            sh.mesh.position.set(px, py, pz);
          }

          const p = clamp01((t - 6.8) / Math.max(0.5, totalDuration - 6.8));
          this.johnGroup.position.set(600.0, 0, lerp(-27.4, -17.0, p));
          this.johnGroup.rotation.set(0, 0, 0); // متجه نحو الجنوب (+Z) أي باتجاه مخرج المختبر
          this.animateJohnLocomotion(t, 10.5, false, true);
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 9) مشهد نهاية الصفقة: تخزين النموذج في القرص الصلب ثم الهرب (4 جمل × 3.5ث = 14 ثانية)
      // ─────────────────────────────────────────────────────────────
      case "ending_deal_scene": {
        camera.position.set(603.4, 2.95, -26.5);
        camera.lookAt(600.0, 1.55, -29.6);

        this.keyLight.position.set(601.2, 3.4, -28.5);
        this.keyLight.intensity = 2.6;
        this.fillLight.position.set(598.8, 2.5, -27.2);
        this.fillLight.intensity = 1.6;

        this.hardDriveGroup.visible = t < 8.0;

        if (t < 4.2) {
          // يمد يده اليمنى بالقرص الصلب المحمول ويوصلها بمنفذ النواة
          this.playOnce("hd_plug", () => audio.play("pickup"));
          const p = smooth01(t / 4.2);
          this.johnGroup.position.set(600.0, 0, -28.6);
          this.johnGroup.rotation.set(0, Math.PI, 0);
          r.torso.rotation.x = lerp(0.05, 0.24, p);
          r.headG.rotation.x = lerp(0, 0.18, p);
          r.jaw.rotation.x = jawTalk;
          r.armR.rotation.x = lerp(-0.35, -1.38, p);
          r.foreR.rotation.x = lerp(-0.55, -0.42, p);
          r.armL.rotation.x = -0.45;
          r.foreL.rotation.x = -0.65;
        } else if (t < 8.2) {
          // يسحب القرص الصلب بعد اكتمال النسخ ويضعه داخل جيب معطفه
          const p = smooth01((t - 4.2) / 4.0);
          this.johnGroup.position.set(600.0, 0, -28.6);
          this.johnGroup.rotation.set(0, Math.PI, 0);
          r.torso.rotation.x = lerp(0.24, 0.06, p);
          r.headG.rotation.x = lerp(0.18, 0.25, p);
          r.jaw.rotation.x = jawTalk;
          r.armR.rotation.x = lerp(-1.38, -0.55, p);
          r.armR.rotation.y = lerp(0, -0.48, p);
          r.foreR.rotation.x = lerp(-0.42, -1.45, p);
          r.armL.rotation.x = lerp(-0.45, -0.75, p);
          r.foreL.rotation.x = -0.95;
        } else {
          // يستدير ويغادر المختبر مسرعاً بالاتجاه الصحيح نحو المخرج (+Z)
          const p = clamp01((t - 8.2) / Math.max(0.5, totalDuration - 8.2));
          this.johnGroup.position.set(600.0, 0, lerp(-28.6, -17.5, p));
          this.johnGroup.rotation.set(0, 0, 0);
          this.animateJohnLocomotion(t, 9.5, false, true);
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 10) مشهد صعود جون إلى المركب ومغادرته والانفجار النووي العنيف مع الغبار الكثيف والشاشة البيضاء السينمائية (8 جمل × 3.5ث = 28 ثانية)
      // ─────────────────────────────────────────────────────────────
      case "boat_nuke": {
        if (t < 7.0) {
          // المرحلة الأولى (0 - 7.0ث): الكاميرا ثابتة بجانب/فوق ممر الصعود، وجون يتقدم بالاتجاه الصحيح (+Z) نحو سطح القارب
          camera.position.set(-5.2, 4.4, 119.2);
          camera.lookAt(2.5, 1.35, 123.6);

          const p = smooth01(t / 5.4);
          const jz = lerp(117.6, 125.0, p);
          const jy = lerp(0.05, 0.32, p);
          this.johnGroup.position.set(2.5, jy, jz);
          // أثناء المشي نحو القارب (+Z) يكون rotation.y = 0، وبعد الصعود يلتفت نحو البلدة (-Z أي Math.PI)
          this.johnGroup.rotation.set(0, p < 0.92 ? 0 : Math.PI, 0);

          this.keyLight.position.set(0.5, 4.5, 122.0);
          this.keyLight.intensity = 2.5;
          this.fillLight.position.set(4.5, 3.5, 125.0);
          this.fillLight.intensity = 1.6;

          if (p < 0.92) {
            this.animateJohnLocomotion(t, 7.5, false, true);
          } else {
            r.pelvis.position.y = 0.92;
            r.torso.rotation.x = 0.05;
            r.jaw.rotation.x = jawTalk;
            r.armR.rotation.x = -1.15;
            r.foreR.rotation.x = -0.45;
          }
        } else {
          // المرحلة الثانية (7.0 - 28ث): الكاميرا ثابتة في الأعلى، المركب يغادر والانفجار النووي العنيف يضرب البلدة مع غبار كثيف وبياض الشاشة
          const pBoat = smooth01((t - 7.0) / Math.max(1, totalDuration - 7.0));
          const boatX = lerp(2.5, 26.0, pBoat);
          const boatZ = lerp(125.5, 152.0, pBoat);

          if (world.boat) {
            world.boat.position.set(boatX, -0.5 + Math.sin(t * 2.2) * 0.06, boatZ);
            world.boat.rotation.y = lerp(0, -0.35, Math.min(1, pBoat * 1.5));
            world.boat.rotation.z = Math.sin(t * 1.8) * 0.025;
          }

          // جون يقف على سطح القارب ناظراً نحو البلدة المشتعلة خلفه (-Z)
          this.johnGroup.position.set(boatX + 1.2, 0.32 + Math.sin(t * 2.2) * 0.06, boatZ - 0.8);
          this.johnGroup.rotation.set(0, Math.PI, 0);
          r.pelvis.position.y = 0.92;
          r.torso.rotation.x = -0.06;
          r.headG.rotation.x = -0.18;
          r.jaw.rotation.x = jawTalk;
          r.armL.rotation.x = -0.45;
          r.foreL.rotation.x = -0.75;
          // يرفع ذراعه اليمنى ليحمي عينيه من الوهج النووي الأبيض والغبار الكثيف
          r.armR.rotation.x = t > 10.2 && t < 16.5 ? -1.62 : -0.35;
          r.foreR.rotation.x = t > 10.2 && t < 16.5 ? -1.42 : -0.55;

          // تحريك الناجين الذين على متن القارب مع حركة القارب
          for (const sv of world.survivors) {
            if (sv.state === "on_boat") {
              sv.obj.position.set(
                boatX + (sv.boatPos[0] - 2.5),
                0.32 + Math.sin(t * 2.2) * 0.06,
                boatZ + (sv.boatPos[2] - 125.5),
              );
            }
          }

          // اهتزاز قوي للكاميرا العلوية الثابتة لحظة الانفجار النووي (يبدأ عند الثانية 10.5)
          const blastTime = t - 10.5;
          const camShake =
            blastTime > 0 && blastTime < 6.5 ? Math.sin(t * 36) * 0.75 * Math.exp(-blastTime * 0.45) : 0;
          camera.position.set(camShake, 44.0 + camShake * 0.5, 168.0);
          camera.lookAt(0, 10.0, 20.0);

          this.keyLight.position.set(boatX, 6.0, boatZ - 2.0);
          this.keyLight.intensity = 2.2;

          // تفعيل الانفجار النووي الحراري، الوميض الأبيض السينمائي الكامل للشاشة، وجدار الغبار الكثيف (ابتداءً من 10.5ث)
          if (t >= 10.5) {
            this.playOnce("nuke_boom", () => audio.play("explosion"));
            this.nukeGroup.visible = true;
            const bt = t - 10.5;
            const bp = clamp01(bt / 15.0);

            // الوميض الأبيض السينمائي القوي الذي يجعل الشاشة بيضاء بالكامل لحظة الانفجار ثم ينقشع تدريجياً
            if (bt < 0.35) {
              this.whiteout = smooth01(bt / 0.35);
            } else if (bt < 2.2) {
              this.whiteout = 1.0;
            } else if (bt < 6.2) {
              this.whiteout = 1.0 - smooth01((bt - 2.2) / 4.0);
            } else {
              this.whiteout = 0;
            }

            // كرة النار المركزية العملاقة
            const fbScale = lerp(5, 58, Math.pow(bp, 0.42));
            this.nukeFireball.scale.set(fbScale, fbScale * 0.85, fbScale);
            this.nukeFireball.position.y = lerp(4, 30, Math.pow(bp, 0.5));
            const fbMat = this.nukeFireball.material as THREE.MeshBasicMaterial;
            fbMat.color.setHex(bt < 2.0 ? 0xffffff : bt < 5.0 ? 0xffd260 : 0xff5a18);
            fbMat.opacity = lerp(0.99, 0.68, bp);

            // عمود سحابة الفطر الناري
            const stemH = lerp(2, 72, Math.pow(bp, 0.52));
            this.nukeStem.scale.set(1 + bp * 1.1, stemH, 1 + bp * 1.1);
            this.nukeStem.position.y = stemH * 0.5;

            // قبة الفطر العلوية وحلقة الدخان المتوهجة
            const capR = lerp(6, 52, Math.pow(bp, 0.48));
            this.nukeCap.scale.set(capR * 1.38, capR * 0.70, capR * 1.38);
            this.nukeCap.position.y = stemH;

            const ringR = lerp(7, 62, Math.pow(bp, 0.52));
            this.nukeRing.scale.set(ringR, ringR, ringR * 0.45);
            this.nukeRing.position.y = stemH * 0.92;

            // موجة الصدمة الأرضية
            const swR = lerp(4, 210, Math.pow(clamp01(bt / 6.0), 0.62));
            this.nukeShockwave.scale.set(swR, swR, 1);
            (this.nukeShockwave.material as THREE.MeshBasicMaterial).opacity = lerp(0.95, 0.0, clamp01(bt / 6.0));

            // جدار الغبار الكثيف وسحب الرماد المتلاطمة التي تبتلع البلدة وتندفع نحو النهر
            const dustProgress = clamp01(bt / 11.0);
            const wallRadius = lerp(8, 165, Math.pow(dustProgress, 0.58));
            const wallHeight = lerp(4, 38, Math.pow(dustProgress, 0.48));
            this.nukeDustWall.scale.set(wallRadius, wallHeight, wallRadius);
            this.nukeDustWall.position.y = wallHeight * 0.45;
            (this.nukeDustWall.material as THREE.MeshStandardMaterial).opacity = lerp(
              0.94,
              0.72,
              clamp01((bt - 4.0) / 10.0),
            );

            for (let i = 0; i < this.nukeDustPuffs.length; i++) {
              const dp = this.nukeDustPuffs[i];
              const pRadius = lerp(dp.baseRadius, dp.maxRadius * 1.35, Math.pow(dustProgress, 0.55));
              const pScale = lerp(3.5, dp.maxScale * 1.45, Math.pow(dustProgress, 0.5));
              const turb = Math.sin(t * 2.2 + i) * 2.5;
              dp.mesh.position.set(
                Math.cos(dp.angle) * pRadius + turb,
                pScale * dp.heightFactor,
                Math.sin(dp.angle) * pRadius + turb,
              );
              dp.mesh.scale.set(pScale * 1.3, pScale * 0.85, pScale * 1.3);
            }

            // إضاءة الانفجار الساطعة
            this.nukeLight.intensity = bt < 2.0 ? lerp(10, 65, bt / 2.0) : lerp(65, 16, bp);
          }
        }
        break;
      }
    }
  }
}
