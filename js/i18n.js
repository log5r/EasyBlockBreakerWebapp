// Local dictionaries; works offline and with file://, without fetching translations.
window.EasyBlockBreaker.i18n = (() => {
'use strict';
const messages = {
  "ja": {
    "tagline": "ディフレクターで玉をはじいてブロックを砕こう。",
    "rulesSummary": "くわしいルール",
    "modes": "鋼の筐体の中を転がる銀色の玉で、できるだけ多くのブロックを砕こう。<b>タイムアタック</b>は 90 秒の制限時間内でスコアを競い、<b>無限モード</b>は制限時間なしで好きなだけ続けられます（ポーズ画面の「スコアを確定して終了」でリザルトへ）。",
    "deflector": "画面の下は壁になっていて玉は落ちません。下の壁にある<b>青く光るディフレクター</b>を左右に動かし、玉がそこに当たると<b>当たった位置に応じた角度</b>で打ち出されます。狙った方向へ玉を誘導しよう。",
    "items": "ブロックを砕くとたまに<b>アイテム</b>が落ちてきます。ディフレクターで受け止めると <b>SPEED</b>（玉が高速化）／<b>BLAST</b>（砕けたブロックが隣も巻き込む）／<b>x2</b>（玉の数が2倍）／<b>PIERCE</b>（玉がブロックを貫通）の効果が一定時間続きます。ディフレクター以外の壁に落ちたアイテムは消えます。",
    "regrowth": "砕けたブロックは<b>しばらくすると同じ場所に再生</b>します。硬いブロックほど戻るまでに時間がかかります（耐久力 × 6 秒）。",
    "waves": "ディフレクター以外の壁に当たるとコンボが途切れます。ブロック群の総数ぶん砕くと<b>ウェーブクリア</b>（WAVE 欄のバーが進捗）。ボーナス得点と時間延長 (+10秒、タイムアタックのみ)、新しいブロック群が現れ、玉が1個追加されます（最大3個）。",
    "steel": "WAVE 3 からは砕けない<b>剛鉄ブロック</b>が混ざります。玉をはじくだけでクリアの必要数には数えません。",
    "controls": "<span class=\"kbd\">マウス / タッチ</span> <span class=\"kbd\">← →</span> で操作 &nbsp; <span class=\"kbd\">P</span> / <span class=\"kbd\">Esc</span> ポーズ &nbsp; <span class=\"kbd\">M</span> ミュート",
    "modeTimed": "タイムアタック<small>90 秒</small>",
    "modeInfinite": "無限モード<small>制限時間なし</small>",
    "pauseHelp": "<span class=\"kbd\">P</span> / <span class=\"kbd\">Esc</span> / <span class=\"kbd\">Space</span> または下のボタンで再開",
    "start": "スタート",
    "retry": "もう一度",
    "toTitle": "タイトルへ",
    "resume": "再開",
    "finish": "スコアを確定して終了",
    "quit": "やめる",
    "flash": "フラッシュエフェクト（ブロック破壊時の画面の光）",
    "volume": "音量",
    "finishNote": "「スコアを確定して終了」は今のスコアで結果画面へ（ベスト更新あり）。「やめる」はスコアを残さずタイトルに戻ります。",
    "pauseAction": "ポーズ (P)",
    "resumeAction": "再開 (P)",
    "muteAction": "ミュート (M)",
    "unmuteAction": "ミュート解除 (M)",
    "played": "プレイ時間 {time} ／ ",
    "stats": "WAVE {wave} 到達 ／ ブロック {blocks} 個 ／ 最大コンボ {combo}",
    "limitNote": "スコアがプログラムで扱える上限 ({max}) に達しました。{seconds} 秒後にタイトルへ戻ります。"
  },
  "en": {
    "tagline": "Bounce the ball off the deflector and smash the blocks.",
    "rulesSummary": "Full rules",
    "modes": "Smash as many blocks as you can with a silver ball inside a steel cabinet. <b>Time Attack</b> is a 90-second race for score; <b>Infinite mode</b> has no time limit, so play as long as you like (use “Finish & save score” on the pause screen to see your results).",
    "deflector": "The bottom is a wall, so the ball never falls out. Move the <b>blue-lit deflector</b> left and right to aim: the <b>bounce angle depends on where the ball hits</b> it.",
    "items": "Broken blocks sometimes drop <b>items</b>. Catch them with the deflector for temporary power-ups: <b>SPEED</b> (faster balls), <b>BLAST</b> (breaking a block also damages its neighbors), <b>x2</b> (double the balls), or <b>PIERCE</b> (balls pass through blocks). Items that miss the deflector disappear.",
    "regrowth": "Broken blocks <b>regrow in the same place</b>. Tougher blocks take longer to return (toughness × 6 seconds).",
    "waves": "Hitting a wall outside the deflector breaks your combo. Break as many blocks as the layout holds to <b>clear the wave</b> (the WAVE bar tracks progress). Earn bonus points and +10 seconds (Time Attack only), get a new layout, and add a ball (up to 3).",
    "steel": "From WAVE 3, <b>unbreakable steel blocks</b> appear. They bounce the ball and do not count toward clearing the wave.",
    "controls": "Move with <span class=\"kbd\">Mouse / Touch</span> or <span class=\"kbd\">← →</span> &nbsp; Pause: <span class=\"kbd\">P</span> / <span class=\"kbd\">Esc</span> &nbsp; Mute: <span class=\"kbd\">M</span>",
    "modeTimed": "Time Attack<small>90 seconds</small>",
    "modeInfinite": "Infinite<small>no time limit</small>",
    "pauseHelp": "Press <span class=\"kbd\">P</span> / <span class=\"kbd\">Esc</span> / <span class=\"kbd\">Space</span> or use the button below to resume.",
    "start": "Start",
    "retry": "Play again",
    "toTitle": "Title",
    "resume": "Resume",
    "finish": "Finish & save score",
    "quit": "Quit",
    "flash": "Flash effects (screen flashes when blocks break)",
    "volume": "Volume",
    "finishNote": "“Finish & save score” opens the results and updates your best score. “Quit” returns to the title without saving this run.",
    "pauseAction": "Pause (P)",
    "resumeAction": "Resume (P)",
    "muteAction": "Mute (M)",
    "unmuteAction": "Unmute (M)",
    "played": "Played {time} / ",
    "stats": "WAVE {wave} reached / Blocks broken: {blocks} / Max combo: {combo}",
    "limitNote": "The score reached the largest value the program can handle ({max}). Returning to the title in {seconds} seconds."
  }
};
// Honor the first supported language in the browser's preference order.
function selectLanguage(languages) {
  for (const tag of languages) {
    if (typeof tag !== 'string') continue;
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (Object.hasOwn(messages, base)) return base;
  }
  return 'en';
}
const language = selectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
function t(key, values = {}) {
  const message = messages[language][key] ?? messages.en[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}
function labelButton(id, key) {
  const button = document.getElementById(id);
  button.title = t(key);
  button.setAttribute('aria-label', t(key));
}
document.documentElement.lang = language;
for (const element of document.querySelectorAll('[data-i18n]')) {
  // Only bundled, trusted dictionary markup is used here.
  element.innerHTML = t(element.dataset.i18n);
}
labelButton('pauseBtn', 'pauseAction');
labelButton('mute', 'muteAction');
return { language, t, labelButton, selectLanguage };
})();
