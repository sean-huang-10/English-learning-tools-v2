// ── Speech rate range ──
export const RATE_MIN  = 0.1;
export const RATE_MAX  = 1.5;
export const RATE_STEP = 0.1;

// ── Sample article ──
export const SAMPLE = `The ancient forests of the Pacific Northwest are among the most biodiverse ecosystems on Earth. Towering Douglas firs and Sitka spruces create a dense canopy that filters sunlight, casting the forest floor in a perpetual, emerald twilight. Beneath this canopy, an intricate web of life thrives — from delicate mosses clinging to every surface, to the complex fungal networks that connect the roots of trees across vast distances.

Scientists have discovered that trees communicate through these underground networks, sharing nutrients and even warning signals when pests or disease threaten. This remarkable phenomenon has transformed how we understand forests: not as collections of individual trees competing for resources, but as collaborative communities with a sophisticated, silent language of their own.`;

// ── Topic / Level colours ──
export const TOPIC_COLORS = {
  'World News': ['#fee2e2','#991b1b','🌍'],
  'Business':   ['#fef3c7','#92400e','💹'],
  'Health':     ['#d1fae5','#065f46','🏥'],
  'Lifestyle':  ['#ede9fe','#4c1d95','✨'],
  'Tech News':  ['#dbeafe','#1e40af','📱'],
  Science:      ['#dbeafe','#1e40af','🔬'],
  Culture:      ['#fce7f3','#9d174d','🎭'],
  Travel:       ['#d1fae5','#065f46','✈️'],
  Food:         ['#fef3c7','#92400e','🍜'],
  Technology:   ['#ede9fe','#4c1d95','💻'],
  Nature:       ['#dcfce7','#14532d','🌿'],
  History:      ['#fee2e2','#7f1d1d','🏛️'],
  Sports:       ['#ffedd5','#7c2d12','⚽'],
};

export const LEVEL_COLORS = {
  A1:'#bfdbfe', A2:'#99f6e4', B1:'#fde68a', B2:'#fca5a5', C1:'#e9d5ff',
};

// ── Dictionary POS mapping ──
export const POS_MAP = {
  'noun':        ['noun','名詞','pos-noun'],
  'verb':        ['verb','動詞','pos-verb'],
  'adjective':   ['adj', '形容詞','pos-adj'],
  'adverb':      ['adv', '副詞','pos-adv'],
  'preposition': ['prep','介係詞','pos-prep'],
  'conjunction': ['conj','連接詞','pos-conj'],
  'pronoun':     ['pron','代名詞','pos-pron'],
  'article':     ['art', '冠詞','pos-other'],
  'exclamation': ['excl','感嘆詞','pos-other'],
};

// ── Chat ──
export const LEVEL_PROMPTS = {
  A1: 'Use very simple English, short sentences, basic vocabulary only. Speak slowly and clearly.',
  A2: 'Use simple English with common words. Keep sentences short.',
  B1: 'Use intermediate English. Some complexity is fine.',
  B2: 'Use natural English at upper-intermediate level.',
  C1: 'Use advanced, natural English with varied vocabulary and complex structures.',
};

export const SCENARIOS = {
  roleplay: [
    { id:'cafe',      emoji:'☕', title:'咖啡廳點餐',    en:'Ordering at a Café',   role:'barista' },
    { id:'hotel',     emoji:'🏨', title:'飯店 Check-in', en:'Hotel Check-in',       role:'hotel receptionist' },
    { id:'airport',   emoji:'✈️', title:'機場報到',      en:'Airport Check-in',     role:'airline staff' },
    { id:'interview', emoji:'💼', title:'求職面試',      en:'Job Interview',        role:'interviewer' },
    { id:'doctor',    emoji:'🏥', title:'看診',          en:'Doctor Appointment',   role:'doctor' },
    { id:'shopping',  emoji:'🛍️', title:'購物',          en:'Shopping',             role:'shop assistant' },
  ],
  free: [
    { id:'travel', emoji:'🌏', title:'旅遊',       en:'Travel & Destinations' },
    { id:'food',   emoji:'🍽️', title:'飲食文化',   en:'Food & Culture' },
    { id:'movie',  emoji:'🎬', title:'電影與音樂', en:'Movies & Music' },
    { id:'life',   emoji:'🌱', title:'日常生活',   en:'Daily Life' },
    { id:'tech',   emoji:'💡', title:'科技趨勢',   en:'Technology' },
  ],
  task: [
    { id:'book_hotel',  emoji:'🏨', title:'訂一間飯店',     en:'Book a Hotel Room',   goal:'successfully book a hotel room with specific dates, room type, and breakfast included' },
    { id:'report_lost', emoji:'🔍', title:'報告遺失物品',   en:'Report a Lost Item',  goal:'report a lost wallet to airport lost and found with full details' },
    { id:'complain',    emoji:'😤', title:'客訴處理',       en:'Handle a Complaint',  goal:'get a refund or replacement for a defective product from customer service' },
    { id:'directions',  emoji:'🗺️', title:'問路到達目的地', en:'Ask for Directions',  goal:'get clear directions to a museum and confirm arrival time' },
  ],
};

// ── News ──
export const NEWS_ICONS = {
  world:'🌍', lifeandstyle:'🏥', science:'🔬',
  technology:'💻', business:'💹', culture:'🎭',
};

export const NEWS_PROMPTS = [
  { topic:'World News', style:'news',     titleHint:'international current event' },
  { topic:'Business',   style:'news',     titleHint:'business or economy story' },
  { topic:'Health',     style:'magazine', titleHint:'health or wellness feature' },
  { topic:'Lifestyle',  style:'magazine', titleHint:'lifestyle or trend story' },
  { topic:'Tech News',  style:'news',     titleHint:'technology news' },
];

// ── Seed articles ──
const _now = Date.now();
export const SEED_ARTICLES = JSON.parse(`[{"id":"s1","level":"A1","topic":"Food","titleZh":"每天一個蘋果","title":"An Apple a Day","content":"Apples are one of the most popular fruits in the world. They come in many colors, like red, green, and yellow. People eat apples every day because they are healthy. Apples have vitamins that help your body stay strong. You can eat an apple in the morning for breakfast, or as a snack in the afternoon. Some people like to make apple juice or apple pie. Doctors say that eating fruit every day is good for you. Apples are also easy to carry. You can put one in your bag and eat it later. Try to eat one apple every day and you will feel better!","date":0},{"id":"s2","level":"A2","topic":"Nature","titleZh":"神奇的蜜蜂","title":"The Amazing Honey Bee","content":"Honey bees are small insects, but they do very important work. Bees fly from flower to flower to collect nectar. They use this nectar to make honey in their hive. A single bee visits hundreds of flowers each day. Bees also help plants grow by carrying pollen between flowers. This is called pollination. Without bees, many fruits and vegetables would not exist. A beehive can have up to 60,000 bees! The queen bee lays eggs all day long. Worker bees build the hive, find food, and protect the colony. Next time you see a bee, remember how important it is to our world.","date":0},{"id":"s3","level":"B1","topic":"Science","titleZh":"睡眠的力量","title":"The Power of Sleep","content":"Sleep is one of the most essential activities for human health, yet many people treat it as optional. During sleep, the brain processes memories from the day, consolidating important information and discarding irrelevant details. The body also uses this time to repair tissue, build muscle, and strengthen the immune system. Scientists have discovered that sleep deprivation affects cognitive performance just as severely as alcohol intoxication. A person who has been awake for 17 hours shows impairment similar to someone with a blood alcohol level of 0.05%. Most adults need between seven and nine hours of sleep per night, yet surveys suggest that a significant portion of the population regularly gets less than six. Establishing a consistent sleep schedule is the single most effective strategy for improving sleep quality.","date":0},{"id":"s4","level":"B2","topic":"Technology","titleZh":"社群媒體的兩面","title":"The Double Edge of Social Media","content":"Social media platforms have fundamentally altered the way human beings communicate, share information, and perceive themselves and others. On one hand, these digital networks have democratized information, enabling grassroots movements to organize globally and allowing individuals to build communities around shared interests regardless of geographic boundaries. Yet the same mechanisms that empower activists also amplify misinformation at unprecedented speed. Algorithmic recommendation systems, optimized for engagement rather than accuracy, create echo chambers that reinforce existing beliefs and polarize discourse. Furthermore, research consistently links heavy social media use among adolescents with increased rates of anxiety, depression, and body image dissatisfaction — a correlation that raises urgent questions about platform design and the responsibilities of technology companies toward their youngest users.","date":0},{"id":"s5","level":"C1","topic":"Culture","titleZh":"記憶的可塑性","title":"The Malleability of Memory","content":"The popular conception of memory as a faithful video recording of past experience is, neuroscience reveals, a profound misconception. Memory is not retrieved but reconstructed — an active process in which the brain assembles fragments of sensory impression, emotional context, and subsequent knowledge into a coherent narrative that feels experientially true but may diverge substantially from objective events. Elizabeth Loftus demonstrated that subjects could be induced to incorporate entirely fabricated details into their recollections simply through suggestive questioning. More troublingly, her research showed that false memories — including memories of childhood traumas that never occurred — could be implanted with high rates of conviction, challenging both the reliability of eyewitness testimony in legal proceedings and the therapeutic practice of memory recovery. The malleability of memory, while an evolutionary advantage, simultaneously renders the autobiographical self a continuous act of reconstruction rather than an archive of fixed truth.","date":0},{"id":"s6","level":"A1","topic":"Travel","titleZh":"我最喜歡的城市","title":"My Favourite City","content":"I love visiting cities. My favourite city is Tokyo in Japan. Tokyo is very big and very clean. There are many trains in Tokyo. You can go everywhere by train. The food in Tokyo is delicious. I like to eat sushi and ramen. Sushi is raw fish on rice. Ramen is noodle soup. Tokyo also has many interesting shops and parks. Ueno Park is a beautiful place to walk. In spring, the cherry blossom trees in the park are pink and white. Many people come to see the flowers. I want to visit Tokyo again one day. Maybe you can visit Tokyo too!","date":0},{"id":"s7","level":"B1","topic":"History","titleZh":"絲路的故事","title":"The Story of the Silk Road","content":"For more than a thousand years, a network of trade routes connected the civilizations of China, Central Asia, the Middle East, and Europe. Known as the Silk Road, this network took its name from the lucrative silk trade that originated in China, where the technique of silk production was a closely guarded secret for centuries. Merchants, diplomats, monks, and explorers traveled these routes, exchanging not only goods such as spices, glass, and precious metals, but also ideas, religions, and technologies. Buddhism spread from India to China along the Silk Road, while paper-making and printing techniques traveled westward to the Islamic world and eventually Europe. The Mongol Empire of the 13th century temporarily unified much of Eurasia under a single political authority, creating conditions of relative safety that encouraged unprecedented levels of cultural and commercial exchange.","date":0},{"id":"s8","level":"A2","topic":"Sports","titleZh":"為什麼運動對你有益","title":"Why Exercise is Good for You","content":"Exercise is very important for a healthy life. When you exercise, your heart beats faster and your blood moves quickly around your body. This makes your heart stronger. Regular exercise also helps you maintain a healthy weight. Many people feel happier after they exercise. This is because the body releases chemicals called endorphins during physical activity. These chemicals make you feel good. You do not need to exercise for a long time to feel the benefits. Even a 30-minute walk every day can make a big difference to your health. Try to find an activity that you enjoy, like swimming, cycling, or playing football. When exercise is fun, it is easier to continue doing it regularly.","date":0}]`).map((a, i) => ({ ...a, date: _now - (i + 1) * 86400000 }));
