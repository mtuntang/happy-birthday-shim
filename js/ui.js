/* ==========================================================================
   PAGE UI — everything outside the canvas
   URL params, title screen + welcome song, toolbar buttons, dialogs,
   rotating hints. Loaded BEFORE party.js, which calls back into HB.ui.
   ========================================================================== */
window.HB = window.HB || {};

(function (HB) {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /* ---------------- URL params: ?name=Sam&age=7&msg=...&from=Alex ---- */
  const qs = new URLSearchParams(window.location.search);
  const clean = (s, n) => (s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
  const ageNum = parseInt(qs.get("age"), 10);
  const params = {
    name: clean(qs.get("name"), 20) || "Shim",
    age: ageNum >= 1 && ageNum <= 120 ? ageNum : null,
    msg: clean(qs.get("msg"), 240),
    from: clean(qs.get("from"), 24),
  };
  HB.params = params;

  const title = params.name ? `Happy Birthday, ${params.name}!` : "Happy Birthday!";
  $("greeting").textContent = title;
  document.title = title;
  $("subtitle").textContent = params.age
    ? `${params.age} looks good on you!`
    : "a tiny pixel party, just for you";
  $("start-name").textContent = params.name ? `for ${params.name}` : "a pixel party";

  /* ---------------- welcome song (the .m4a in the repo) -------------- */
  const song = $("welcome-song");
  const songBtn = $("btn-song");
  const soundBtn = $("btn-sound");

  function setSongBtn(playing) {
    songBtn.setAttribute("aria-pressed", String(playing));
    songBtn.textContent = playing ? "♪ Stop song" : "♪ Replay song";
  }
  song.addEventListener("play", () => setSongBtn(true));
  song.addEventListener("pause", () => setSongBtn(false));
  song.addEventListener("ended", () => setSongBtn(false));
  song.muted = HB.audio.isMuted();

  function playWelcome(fromStart) {
    if (fromStart) song.currentTime = 0;
    const p = song.play();
    // if a phone still blocks it, make the Replay button wiggle so it's obvious
    if (p && p.catch) p.catch(() => { setSongBtn(false); songBtn.classList.add("nudge"); });
  }
  songBtn.addEventListener("click", () => songBtn.classList.remove("nudge"));
  /* Called from inside the password keypress/tap (a user gesture): a silent
     play+pause "unlocks" the <audio> element on iOS so the later, delayed
     playWelcome() is allowed. */
  function primeSong() {
    if (HB.audio.isMuted()) return;
    song.muted = true;
    const p = song.play();
    const done = () => { song.pause(); song.currentTime = 0; song.muted = HB.audio.isMuted(); };
    if (p && p.then) p.then(done, done); else done();
  }
  songBtn.addEventListener("click", () => {
    if (!song.paused) { song.pause(); return; }
    HB.audio.stopSong();
    playWelcome(true);
  });

  function setSoundBtn() {
    const m = HB.audio.isMuted();
    soundBtn.textContent = m ? "Sound: off" : "Sound: on";
    soundBtn.setAttribute("aria-pressed", String(!m));
  }
  soundBtn.addEventListener("click", () => {
    HB.audio.setMuted(!HB.audio.isMuted());
    song.muted = HB.audio.isMuted();
    setSoundBtn();
  });
  setSoundBtn();

  /* Entering the game. Normally this happens when the lock screen finishes
     fading out (js/lock.js fires "hb:unlocked"); the Press Start title screen
     is only a fallback if there's no lock. Order, once the transition is
     FULLY done: welcome song starts -> 3 s later the goals popup opens. */
  const start = $("start");
  const TITLE_FADE_MS = 400; // matches .start transition in style.css
  let started = false;
  const locked = () => HB.lock && HB.lock.isLocked();
  function begin(fadeMs = TITLE_FADE_MS) {
    // never start while the lock screen is still in the page (it fires
    // "hb:unlocked" only after it has fully faded out and removed itself)
    if (started || locked() || document.getElementById("lock")) return;
    started = true;
    HB.audio.ensure();
    if (fadeMs) {
      start.classList.add("is-hidden");
      setTimeout(() => { start.hidden = true; }, fadeMs);
    } else start.hidden = true;
    $("stage").focus({ preventScroll: true });
    setTimeout(() => {
      if (!HB.audio.isMuted()) playWelcome(true);
      // explain the goals + reward. The welcome F-14 flyby waits until that
      // popup is closed so it isn't hidden behind it.
      setTimeout(() => {
        updateGoals(game().GOALS, game().goals());
        openDialog($("goals"));
        $("goals").addEventListener("close", () => game().scheduleFlyby(1.5), { once: true });
      }, 3000);
    }, fadeMs);
  }
  window.addEventListener("hb:unlocked", () => begin(0));
  $("btn-start").addEventListener("click", () => begin());
  window.addEventListener("keydown", (e) => {
    if (started || start.hidden || (e.target.closest && e.target.closest("input, textarea, #lock"))) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); begin(); }
  });
  if (!locked()) $("btn-start").focus();

  /* ---------------- toolbar ----------------------------------------- */
  const game = () => HB.game;
  $("btn-blow").addEventListener("click", () => game().blowAll());
  $("btn-relight").addEventListener("click", () => game().relight());
  $("btn-fw").addEventListener("click", () => game().fireworks());
  $("btn-snap").addEventListener("click", () => game().snapshot());
  $("btn-jet").addEventListener("click", () => game().flyby());

  // Relock: the lock isn't saved anywhere, so reloading brings it back.
  const relockBtn = $("btn-relock");
  relockBtn.hidden = !HB.lock;
  relockBtn.addEventListener("click", () => {
    HB.audio.sfx.clank();
    relockBtn.disabled = true;
    relockBtn.textContent = "Locking...";
    document.body.classList.add("relocking");
    setTimeout(() => location.reload(), 450);
  });

  /* ---------------- dialogs ----------------------------------------- */
  /* One modal at a time: if another is already open (e.g. the wish card and
     the reward collage both fire after the last candle), queue it. */
  const queue = [];
  function openDialog(d) {
    if (d.open || queue.includes(d)) return;
    if (document.querySelector("dialog[open]")) { queue.push(d); return; }
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
  }
  document.querySelectorAll("dialog").forEach((d) =>
    d.addEventListener("close", () => {
      const next = queue.shift();
      if (next) setTimeout(() => openDialog(next), 250);
    }));
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => {
      const d = b.closest("dialog");
      if (d.close) d.close(); else { d.removeAttribute("open"); d.dispatchEvent(new Event("close")); }
    }));

  // wish card, opened after the candles go out
  function openCard() {
    $("card-title").textContent = title;
    $("card-msg").textContent = params.msg ||
      "Another trip around the sun! Wishing you a year full of cake, sunny naps, " +
      "happy zoomies and people (and pups) who think you're the very best.";
    $("card-from").textContent = params.from ? `with love, ${params.from}` : "with love & tail wags";
    openDialog($("card"));
  }

  // goals
  const goalsBtn = $("btn-goals");
  function updateGoals(list, done) {
    goalsBtn.textContent = `★ ${done.size}/${list.length}`;
    $("reward-status").textContent = rewardOpen
      ? "Reward: unlocked!"
      : `Reward: locked (${done.size}/${list.length})`;
    $("reward-row").classList.toggle("unlocked", rewardOpen);
    $("btn-open-reward").hidden = !rewardOpen;
    const ul = $("goal-list");
    ul.textContent = "";
    for (const g of list) {
      const li = document.createElement("li");
      const got = done.has(g.id);
      li.className = got ? "done" : "";
      li.textContent = `${got ? "★" : "☆"} ${g.secret && !got ? "???" : g.name} — ${g.desc}`;
      ul.appendChild(li);
    }
  }
  goalsBtn.addEventListener("click", () => {
    updateGoals(game().GOALS, game().goals());
    openDialog($("goals"));
  });

  /* ---------------- final reward: a birthday letter in a pixel frame -- */
  // Edit the letter here (one string per paragraph). ?msg= in the URL
  // overrides only the candle wish card, not this letter.
  const LETTER = [
    "Happy birthday, Shim!",
    "Another trip around the sun, and you're still my favourite partner in " +
      "(war) crime. Thank you for all the laughs, the chaos, the snacks and " +
      "every scheme we'll never, ever put in writing.",
    "I hope this year brings you everything you want: good food, long naps, " +
      "big wins, and plenty more adventures the Geneva Conventions would " +
      "definitely not approve of.",
    "You deserve the best day. Have the best year.",
  ];
  const LETTER_SIGN = "your accomplice ♥";
  let rewardOpen = false, letterBuilt = false;
  const rewardBtn = $("btn-reward");

  function buildLetter() {
    if (letterBuilt) return;
    letterBuilt = true;
    const box = $("reward-letter");
    LETTER.forEach((text, i) => {
      const p = document.createElement("p");
      p.textContent = text;
      p.style.setProperty("--delay", `${i * 180}ms`);
      box.appendChild(p);
    });
    const sign = document.createElement("p");
    sign.className = "letter-sign";
    sign.textContent = params.from ? `with love, ${params.from}` : LETTER_SIGN;
    sign.style.setProperty("--delay", `${LETTER.length * 180}ms`);
    box.appendChild(sign);
  }
  function openCollage() {
    buildLetter();
    $("collage-title").textContent = `Happy Birthday, ${params.name} ♥`;
    openDialog($("collage"));
  }
  function unlockReward() {
    rewardOpen = true;
    rewardBtn.textContent = "♥ Open reward";
    rewardBtn.setAttribute("aria-disabled", "false");
    rewardBtn.classList.add("is-unlocked");
    updateGoals(game().GOALS, game().goals());
    openCollage();
  }
  rewardBtn.addEventListener("click", () => {
    if (rewardOpen) openCollage();
    else { updateGoals(game().GOALS, game().goals()); openDialog($("goals")); }
  });
  $("btn-open-reward").addEventListener("click", () => { $("goals").close(); openCollage(); });

  /* ---------------- rotating hints + screen-reader announcements ---- */
  const HINTS = [
    "Tap the balloons to pop them",
    "Tap the pup for pets",
    "Tap the grass and the pup trots over",
    "Tap the ball to play fetch!",
    "Open the presents!",
    "Blow out the candles!",
    "Tap the sky for sparkle bursts",
    "Tap the F-14 for a barrel roll!",
    ...(window.matchMedia("(pointer: coarse)").matches
      ? ["Tap high in the sky for sparkles"]
      : ["Arrow keys walk the pup, space jumps, J calls the jet"]),
    "The pup naps if you go quiet...",
    "Psst... the sun is ticklish",
    "Finish every party goal for a special reward",
  ];
  let hintI = 0;
  const hint = $("hint");
  hint.textContent = HINTS[0];
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(() => {
      hintI = (hintI + 1) % HINTS.length;
      hint.classList.add("swap");
      setTimeout(() => { hint.textContent = HINTS[hintI]; hint.classList.remove("swap"); }, 250);
    }, 5000);
  }
  const live = $("live");
  function announce(msg) { live.textContent = msg; }

  HB.ui = {
    openCard, updateGoals, announce, unlockReward, primeSong,
    songPlaying: () => !song.paused,
  };
})(window.HB);
