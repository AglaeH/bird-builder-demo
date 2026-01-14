// Bird + part data (demo). Keep everything on-topic and deterministic.
// Parts order is fixed for steps 1–5.

const PART_ORDER = ["legs","body","wing","tail","head"];

const PART_LABEL = {
  legs: "腳",
  body: "身體",
  wing: "翅膀",
  tail: "尾巴",
  head: "頭/記號"
};

// Quiz option pools (4 options per part). Each bird maps to a correct option index.
const OPTION_POOLS = {
  legs: [
    { key:"pink_short", title:"粉紅腳", sub:"偏粉紅、短腿", icon:"legs_pink" },
    { key:"brown_short", title:"褐色腳", sub:"偏褐、短而細", icon:"legs_brown" },
    { key:"black_grip", title:"黑色腳", sub:"偏黑、抓枝穩", icon:"legs_black" },
    { key:"long_legs", title:"長腿", sub:"腿明顯較長", icon:"legs_long" },
  ],
  body: [
    { key:"brown_round", title:"褐圓身", sub:"背偏褐、身形圓", icon:"body_brown" },
    { key:"olive_belly", title:"橄欖＋白腹", sub:"背橄欖、腹偏白", icon:"body_olive" },
    { key:"spotted_neck", title:"頸側斑點", sub:"褐灰、頸側有斑", icon:"body_spotted" },
    { key:"black_sleek", title:"黑色俐落", sub:"整體偏黑、線條俐落", icon:"body_black" },
  ],
  wing: [
    { key:"short_band", title:"短圓翼帶", sub:"短圓、常見淡色翼帶", icon:"wing_band" },
    { key:"broad_dark", title:"寬黑翼", sub:"寬大、偏深色", icon:"wing_dark" },
    { key:"small_green", title:"小巧綠翼", sub:"小、偏黃綠", icon:"wing_green" },
    { key:"long_pointed", title:"長尖翼", sub:"較長、翼端較尖", icon:"wing_long" },
  ],
  tail: [
    { key:"short_plain", title:"短尾", sub:"短、顏色較單純", icon:"tail_short" },
    { key:"forked", title:"叉狀尾", sub:"尾端有分叉", icon:"tail_fork" },
    { key:"rounded_long", title:"長圓尾", sub:"較長、尾端圓", icon:"tail_round" },
    { key:"yellow_edge", title:"淡黃尾緣", sub:"尾緣帶淡色", icon:"tail_yellow" },
  ],
  head: [
    { key:"white_head", title:"白頭", sub:"頭部有明顯白色", icon:"head_white" },
    { key:"white_eye_ring", title:"白眼圈", sub:"眼周有白色眼圈", icon:"head_ring" },
    { key:"plain_brown", title:"素色頭", sub:"偏褐、記號不明顯", icon:"head_plain" },
    { key:"sharp_beak", title:"尖喙", sub:"喙較尖、線條俐落", icon:"head_beak" },
  ],
};

// Bird definitions
const BIRDS = {
  sparrow: {
    name: "麻雀",
    theme: { body:"#C9A47B", wing:"#B98D62", head:"#C9A47B", tail:"#B98D62", legs:"#6E4C2C", ring:null, crest:false },
    summary: "麻雀是常見的小型鳥類，常出現在都市與鄉村。觀察時可留意牠的短圓翅與褐色調，以及活動時走跳靈活。",
    parts: {
      legs: { token:"sparrow_legs", clue:"腳短短、偏褐色，走跳很靈活。", correct: 1 },
      body: { token:"sparrow_body", clue:"背偏褐、身形圓；常見淡色翼帶的整體印象。", correct: 0 },
      wing: { token:"sparrow_wing", clue:"翅膀短圓，常見淡色翼帶。", correct: 0 },
      tail: { token:"sparrow_tail", clue:"尾羽顏色較單純，尾型不誇張。", correct: 0 },
      head: { token:"sparrow_head", clue:"頭部記號不明顯，整體偏褐。", correct: 2 },
    }
  },
  bulbul: {
    name: "白頭翁",
    theme: { body:"#8C8B63", wing:"#6F6E46", head:"#EDEDED", tail:"#4B4A3B", legs:"#2F2F2F", ring:null, crest:true },
    summary: "白頭翁常見於公園與校園。特徵之一是頭部較淺（帶白）、身體多為橄欖褐色，活動時常停棲於樹梢。",
    parts: {
      legs: { token:"bulbul_legs", clue:"腳偏黑，抓枝站立很穩。", correct: 2 },
      body: { token:"bulbul_body", clue:"背橄欖褐、腹偏白，輪廓圓潤。", correct: 1 },
      wing: { token:"bulbul_wing", clue:"翅膀寬一些、偏深色，沒有明顯翼帶。", correct: 1 },
      tail: { token:"bulbul_tail", clue:"尾端較長、尾型偏圓。", correct: 2 },
      head: { token:"bulbul_head", clue:"頭部有明顯淺色（白頭）區域。", correct: 0 },
    }
  },
  dove: {
    name: "珠頸斑鳩",
    theme: { body:"#B6A79A", wing:"#9E8F84", head:"#B6A79A", tail:"#8A7D74", legs:"#D48A86", ring:null, crest:false },
    summary: "珠頸斑鳩體型較大，頸側常見像珠點般的斑紋。觀察時可留意牠的粉紅腿與頸側花紋。",
    parts: {
      legs: { token:"dove_legs", clue:"腳偏粉紅，腿不長。", correct: 0 },
      body: { token:"dove_body", clue:"褐灰身體，頸側有斑點感。", correct: 2 },
      wing: { token:"dove_wing", clue:"翅膀較長、翼端較尖。", correct: 3 },
      tail: { token:"dove_tail", clue:"尾端偏圓、整體較長。", correct: 2 },
      head: { token:"dove_head", clue:"頭部多為素色，喙不特別尖。", correct: 2 },
    }
  },
  drongo: {
    name: "大卷尾",
    theme: { body:"#2B2B30", wing:"#1F1F24", head:"#2B2B30", tail:"#1A1A1F", legs:"#15151A", ring:null, crest:false },
    summary: "大卷尾常見特徵是全身偏黑、尾巴呈叉狀。觀察時可先鎖定尾形，再回到整體身形與翅型。",
    parts: {
      legs: { token:"drongo_legs", clue:"腳偏黑，抓枝穩。", correct: 2 },
      body: { token:"drongo_body", clue:"整體偏黑、線條俐落。", correct: 3 },
      wing: { token:"drongo_wing", clue:"翅膀寬大、偏深色。", correct: 1 },
      tail: { token:"drongo_tail", clue:"尾端有明顯分叉（叉狀尾）。", correct: 1 },
      head: { token:"drongo_head", clue:"喙較尖、線條俐落。", correct: 3 },
    }
  },
  whiteeye: {
    name: "綠繡眼",
    theme: { body:"#B9C86A", wing:"#8EAF48", head:"#B9C86A", tail:"#7B9A3D", legs:"#6E4C2C", ring:"#F3F3F3", crest:false },
    summary: "綠繡眼體型小巧，最大辨識點是眼周白色眼圈與黃綠色調。觀察時先找眼圈，再看身體顏色與翅尾比例。",
    parts: {
      legs: { token:"whiteeye_legs", clue:"腳細、小巧，偏褐或灰褐。", correct: 1 },
      body: { token:"whiteeye_body", clue:"身體小巧，偏黃綠色調。", correct: 1 },
      wing: { token:"whiteeye_wing", clue:"翅膀小巧，偏黃綠。", correct: 2 },
      tail: { token:"whiteeye_tail", clue:"尾緣帶淡色、比例不長。", correct: 3 },
      head: { token:"whiteeye_head", clue:"眼周有明顯白色眼圈。", correct: 1 },
    }
  }
};

// Simple, deterministic “AI” hint templates (no API).
const AI_HINT_TEMPLATES = [
  (birdName, partLabel, clue) => `我會先把注意力集中在「${partLabel}」的關鍵線索：${clue}。\n\n接著在四個選項中，只挑「最符合這句描述」的那個，不要被其他可愛細節分心。`,
  (birdName, partLabel, clue) => `先讀線索，再找對應特徵：\n「${clue}」\n\n你可以先排除與這句話明顯相反的選項（例如：長短、顏色、形狀）。`,
  (birdName, partLabel, clue) => `如果你卡住，建議分兩步：\n1) 先判斷 ${partLabel} 的「形狀/比例」。\n2) 再確認「顏色/記號」。\n\n你的線索是：${clue}`
];
