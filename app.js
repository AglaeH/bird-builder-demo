/* Bird Builder AR Demo (single-page, GitHub Pages friendly)
   - Live camera background (AR)
   - Feed -> system assigns a part -> scan QR clue card (collect 5/5)
   - Quiz steps 1-5; each correct shows assembly screen, then continues
   - AI hint is deterministic (no off-topic output)
*/
(() => {
  const $ = (sel) => document.querySelector(sel);

  const cameraVideo = $("#cameraVideo");

  const birdSelect = $("#birdSelect");
  const statusClues = $("#statusClues");
  const statusNeed = $("#statusNeed");
  const statusAi = $("#statusAi");

  const btnStartCamera = $("#btnStartCamera");
  const btnFeed = $("#btnFeed");
  const btnScan = $("#btnScan");
  const btnQuiz = $("#btnQuiz");
  const btnReset = $("#btnReset");

  const scanOverlay = $("#scanOverlay");
  const scanNeedText = $("#scanNeedText");
  const scanHintText = $("#scanHintText");
  const scanToast = $("#scanToast");
  const scanHole = $("#scanHole");
  const btnCloseScan = $("#btnCloseScan");
  const btnCancelScan = $("#btnCancelScan");

  const feedOverlay = $("#feedOverlay");
  const feedSubText = $("#feedSubText");

  const quizModal = $("#quizModal");
  const quizTitle = $("#quizTitle");
  const stepDots = $("#stepDots");
  const quizPromptTitle = $("#quizPromptTitle");
  const quizClueText = $("#quizClueText");
  const quizOptions = $("#quizOptions");
  const btnCloseQuiz = $("#btnCloseQuiz");
  const btnAiHint = $("#btnAiHint");
  const aiBubble = $("#aiBubble");

  const assembleModal = $("#assembleModal");
  const assembleTitle = $("#assembleTitle");
  const assembleText = $("#assembleText");
  const birdStage = $("#birdStage");
  const btnContinue = $("#btnContinue");
  const btnCloseAssemble = $("#btnCloseAssemble");

  const globalToast = $("#globalToast");

  // Offscreen canvas for scanning
  const scanCanvas = document.createElement("canvas");
  const scanCtx = scanCanvas.getContext("2d", { willReadFrequently: true });

  const state = {
    cameraReady: false,
    birdKey: birdSelect.value,
    hintsLeft: 2,

    // collect phase
    needPart: null,              // which part is currently requested
    collected: new Set(),        // parts collected via QR
    isScanning: false,
    lastQrAt: 0,
    lastWrongAt: 0,

    // quiz phase
    quizStepIndex: 0,            // 0..4
    assembled: new Set(),        // parts assembled (correct answers)

    // small
    toastTimer: null
  };

  // ---------- Utilities ----------
  function showToast(msg, ms = 1600){
    globalToast.textContent = msg;
    globalToast.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      globalToast.hidden = true;
    }, ms);
  }

  function partLabel(part){ return PART_LABEL[part] || part; }

  function bird(){ return BIRDS[state.birdKey]; }

  function resetBird(keepCamera = true){
    state.hintsLeft = 2;
    state.needPart = null;
    state.collected = new Set();
    state.quizStepIndex = 0;
    state.assembled = new Set();
    state.isScanning = false;
    scanHole.classList.remove("good");
    scanToast.hidden = true;
    aiBubble.hidden = true;
    render();
    if(!keepCamera){
      stopCamera();
    }
  }

  function allCollected(){ return state.collected.size === PART_ORDER.length; }

  // ---------- Camera (AR) ----------
  async function startCamera(){
    if(state.cameraReady) return true;
    try{
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      cameraVideo.srcObject = stream;
      await cameraVideo.play();
      state.cameraReady = true;
      btnStartCamera.style.display = "none";
      showToast("相機已啟動");
      return true;
    } catch (err){
      console.warn("Camera start failed:", err);
      state.cameraReady = false;
      btnStartCamera.style.display = "inline-flex";
      showToast("需要相機權限才能進行 AR");
      return false;
    }
  }

  function stopCamera(){
    const stream = cameraVideo.srcObject;
    if(stream && stream.getTracks){
      stream.getTracks().forEach(t => t.stop());
    }
    cameraVideo.srcObject = null;
    state.cameraReady = false;
    btnStartCamera.style.display = "inline-flex";
  }

  // On load, attempt to start camera (may require user gesture on iOS; fallback is the button)
  window.addEventListener("load", () => {
    startCamera();
  });

  // ---------- Scan flow ----------
  function pickNextNeedPart(){
    const remaining = PART_ORDER.filter(p => !state.collected.has(p));
    if(remaining.length === 0) return null;
    // random pick among remaining
    return remaining[Math.floor(Math.random() * remaining.length)];
  }

  function openScan(){
    if(!state.cameraReady){
      showToast("請先啟動相機");
      return;
    }
    scanOverlay.classList.add("show");
    scanOverlay.setAttribute("aria-hidden","false");
    state.isScanning = true;
    scanHole.classList.remove("good");
    scanToast.hidden = true;
    scanToast.textContent = "";
    renderScanTexts();
    requestAnimationFrame(scanLoop);
  }

  function closeScan(){
    state.isScanning = false;
    scanOverlay.classList.remove("show");
    scanOverlay.setAttribute("aria-hidden","true");
    scanHole.classList.remove("good");
    scanToast.hidden = true;
  }

  function renderScanTexts(){
    if(!state.needPart){
      scanNeedText.textContent = "—";
      scanHintText.textContent = "請先按「餵鳥」，系統才會指定要掃哪張線索卡。";
      return;
    }
    const b = bird();
    const part = state.needPart;
    const clue = b.parts[part].clue;
    scanNeedText.textContent = `${b.name}｜${partLabel(part)}`;
    scanHintText.textContent = `請找線索卡中符合「${clue}」的小鳥。`;
  }

  function showScanToast(msg, ms = 2400){
    scanToast.textContent = msg;
    scanToast.hidden = false;
    const token = Date.now();
    state.lastWrongAt = token;
    setTimeout(() => {
      // only hide if not replaced by newer message
      if(state.lastWrongAt === token){
        scanToast.hidden = true;
      }
    }, ms);
  }

  function handleQr(payload){
    const now = Date.now();
    if(now - state.lastQrAt < 1200) return; // throttle
    state.lastQrAt = now;

    const text = String(payload || "").trim();
    if(!text) return;

    if(!state.needPart){
      showScanToast("目前沒有指定要掃的線索卡，請先按「餵鳥」。");
      return;
    }

    const b = bird();
    const expected = b.parts[state.needPart].token;

    if(text === expected){
      // success
      scanHole.classList.add("good");
      state.collected.add(state.needPart);
      const gotPart = state.needPart;
      state.needPart = null;

      // haptic feedback if available
      if(navigator.vibrate) navigator.vibrate(40);

      showToast(`獲得線索：${partLabel(gotPart)}（${state.collected.size}/5）`);
      setTimeout(() => {
        closeScan();
        render();
      }, 450);

      return;
    }

    // wrong card: do NOT reveal the scanned bird; just guide back to target bird + trait
    const part = state.needPart;
    const clue = b.parts[part].clue;
    showScanToast(`這不是「${b.name}」的${partLabel(part)}喔，再觀察看看。\n「${b.name}｜${partLabel(part)}」的特徵是：「${clue}」`, 3200);
  }

  function scanLoop(){
    if(!state.isScanning) return;
    if(cameraVideo.readyState >= 2){
      // Downscale to speed up jsQR
      const vw = cameraVideo.videoWidth || 640;
      const vh = cameraVideo.videoHeight || 480;

      const targetW = 480;
      const targetH = Math.round(targetW * (vh / vw));

      scanCanvas.width = targetW;
      scanCanvas.height = targetH;

      scanCtx.drawImage(cameraVideo, 0, 0, targetW, targetH);
      const imageData = scanCtx.getImageData(0, 0, targetW, targetH);

      const code = jsQR(imageData.data, targetW, targetH, { inversionAttempts: "attemptBoth" });
      if(code && code.data){
        handleQr(code.data);
      }
    }
    requestAnimationFrame(scanLoop);
  }

  // ---------- Quiz flow ----------
  function openQuiz(){
    if(!allCollected()){
      showToast("請先收集 5 張線索卡");
      return;
    }
    quizModal.classList.add("show");
    quizModal.setAttribute("aria-hidden","false");
    aiBubble.hidden = true;
    renderQuiz();
  }

  function closeQuiz(){
    quizModal.classList.remove("show");
    quizModal.setAttribute("aria-hidden","true");
    aiBubble.hidden = true;
  }

  function openAssemble(lastPart, isFinal){
    assembleModal.classList.add("show");
    assembleModal.setAttribute("aria-hidden","false");

    assembleTitle.textContent = isFinal ? "完成！" : `拼上：${partLabel(lastPart)}`;
    assembleText.textContent = isFinal
      ? bird().summary
      : `你已經拼上「${partLabel(lastPart)}」。下一步繼續辨認下一個部位。`;

    btnContinue.textContent = isFinal ? "再玩一次" : "下一步";

    renderBirdStage();
  }

  function closeAssemble(){
    assembleModal.classList.remove("show");
    assembleModal.setAttribute("aria-hidden","true");
  }

  function renderQuiz(){
    const b = bird();
    quizTitle.textContent = `辨認鳥類：${b.name}`;
    btnAiHint.disabled = state.hintsLeft <= 0;
    statusAi.textContent = `AI 提示 ${state.hintsLeft}/2`;

    // step dots
    stepDots.innerHTML = "";
    for(let i=0;i<5;i++){
      const dot = document.createElement("div");
      dot.className = "stepDot" + (i === state.quizStepIndex ? " active" : "");
      dot.textContent = String(i+1);
      stepDots.appendChild(dot);
    }

    const part = PART_ORDER[state.quizStepIndex];
    const clue = b.parts[part].clue;

    quizPromptTitle.textContent = `步驟${state.quizStepIndex+1}（${partLabel(part)}）：選最符合敘述的${partLabel(part)}。`;
    quizClueText.textContent = `你收集到的線索：${clue}`;

    // options
    const pool = OPTION_POOLS[part];
    quizOptions.innerHTML = "";
    pool.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "optionBtn";
      btn.type = "button";
      btn.innerHTML = `
        <div class="optionIcon">${iconSvg(opt.icon)}</div>
        <div class="optionText">
          <div class="t1">${opt.title}</div>
          <div class="t2">${opt.sub}</div>
        </div>
      `;
      btn.addEventListener("click", () => onAnswer(idx));
      quizOptions.appendChild(btn);
    });
  }

  function onAnswer(selectedIdx){
    const b = bird();
    const part = PART_ORDER[state.quizStepIndex];
    const correct = b.parts[part].correct;

    if(selectedIdx !== correct){
      closeQuiz();
      showToast("答錯了，請重新收集 5 張線索卡再來一次。", 2200);
      // auto reset after short pause
      setTimeout(() => {
        resetBird(true);
      }, 700);
      return;
    }

    // correct
    state.assembled.add(part);

    closeQuiz();
    const isFinal = state.quizStepIndex === 4;
    openAssemble(part, isFinal);
  }

  function continueAfterAssemble(){
    const isFinal = state.quizStepIndex === 4;
    closeAssemble();

    if(isFinal){
      resetBird(true);
      return;
    }

    state.quizStepIndex += 1;
    openQuiz(); // next step
  }

  // ---------- “AI” Hint ----------
  function showAiHint(){
    if(state.hintsLeft <= 0) return;
    state.hintsLeft -= 1;

    const b = bird();
    const part = PART_ORDER[state.quizStepIndex];
    const clue = b.parts[part].clue;
    const partName = partLabel(part);

    const fn = AI_HINT_TEMPLATES[(2 - state.hintsLeft - 1) % AI_HINT_TEMPLATES.length] || AI_HINT_TEMPLATES[0];
    const msg = fn(b.name, partName, clue);

    aiBubble.textContent = msg;
    aiBubble.hidden = false;

    render(); // update top bar AI counter
    btnAiHint.disabled = state.hintsLeft <= 0;
  }

  // ---------- Bird stage (SVG) ----------
  function renderBirdStage(){
    const b = bird();
    const svg = birdSvg(state.birdKey, b.theme, state.assembled);
    birdStage.innerHTML = svg;

    // animate wing when fully assembled
    if(state.assembled.size === 5){
      const wing = birdStage.querySelector(".wing");
      if(wing) wing.classList.add("flap");
    }
  }

  function birdSvg(key, theme, assembledSet){
    // groups: legs, body, wing, tail, head. show/hide based on assembledSet
    const show = (p) => assembledSet.has(p) ? 1 : 0;

    // Optional eye ring & crest
    const ring = theme.ring ? `
      <circle cx="235" cy="132" r="13" fill="none" stroke="${theme.ring}" stroke-width="6" opacity="${show("head")}"></circle>
    ` : "";

    const crest = theme.crest ? `
      <path d="M220 92 C225 80, 240 76, 248 90" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round" opacity="${show("head")}"></path>
    ` : "";

    // Tail shape: forked for drongo
    const tailPath = (key === "drongo")
      ? `M370 175 L430 155 L405 190 L430 225 L370 205 Z`
      : `M370 175 L430 185 L370 205 Z`;

    // Slightly different beak
    const beak = (key === "drongo")
      ? `<path d="M260 135 L295 128 L262 150 Z" fill="#1a1a1f" opacity="${show("head")}"></path>`
      : `<path d="M260 135 L288 138 L262 150 Z" fill="#6a4a2e" opacity="${show("head")}"></path>`;

    return `
      <svg viewBox="0 0 520 260" width="100%" height="240" role="img" aria-label="拼裝鳥">
        <defs>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="rgba(0,0,0,.25)"/>
          </filter>
        </defs>

        <g filter="url(#softShadow)">
          <!-- legs -->
          <g class="legs" opacity="${show("legs")}">
            <path d="M245 205 L235 238" stroke="${theme.legs}" stroke-width="8" stroke-linecap="round"/>
            <path d="M265 205 L275 238" stroke="${theme.legs}" stroke-width="8" stroke-linecap="round"/>
            <path d="M228 238 L246 238" stroke="${theme.legs}" stroke-width="6" stroke-linecap="round"/>
            <path d="M264 238 L286 238" stroke="${theme.legs}" stroke-width="6" stroke-linecap="round"/>
          </g>

          <!-- body -->
          <g class="body" opacity="${show("body")}">
            <ellipse cx="285" cy="175" rx="125" ry="80" fill="${theme.body}"/>
          </g>

          <!-- wing -->
          <g class="wing" opacity="${show("wing")}" transform-origin="300px 175px">
            <path d="M270 135 C330 140, 370 175, 340 220 C310 235, 260 210, 260 175 C258 160, 262 145, 270 135 Z"
                  fill="${theme.wing}" opacity=".95"/>
            ${state.birdKey === "sparrow" ? `<path d="M292 155 C320 158, 340 170, 330 195" stroke="rgba(255,255,255,.45)" stroke-width="8" stroke-linecap="round"/>` : ""}
          </g>

          <!-- tail -->
          <g class="tail" opacity="${show("tail")}">
            <path d="${tailPath}" fill="${theme.tail}"/>
          </g>

          <!-- head -->
          <g class="head" opacity="${show("head")}">
            <circle cx="235" cy="140" r="40" fill="${theme.head}"></circle>
            ${ring}
            ${crest}
            <circle cx="245" cy="132" r="6" fill="#111" opacity=".9"></circle>
            ${beak}
          </g>
        </g>

        <text x="18" y="34" font-size="14" fill="rgba(0,0,0,.55)">答對後逐步拼出部位</text>
      </svg>
    `;
  }

  function iconSvg(key){
    // small monochrome icons (inline SVG). No external assets.
    const stroke = "rgba(0,0,0,.75)";
    const fill = "rgba(0,0,0,.06)";
    const s = (paths) => `<svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true">
      <rect x="4" y="4" width="40" height="40" rx="12" fill="${fill}" />
      ${paths}
    </svg>`;

    switch(key){
      case "legs_pink": return s(`<path d="M22 18 L18 32" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round"/>
                                 <path d="M28 18 L30 32" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round"/>`);
      case "legs_brown": return s(`<path d="M22 18 L20 32" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round"/>
                                  <path d="M28 18 L26 32" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round"/>`);
      case "legs_black": return s(`<path d="M22 16 L18 34" stroke="${stroke}" stroke-width="3.8" stroke-linecap="round"/>
                                  <path d="M28 16 L30 34" stroke="${stroke}" stroke-width="3.8" stroke-linecap="round"/>`);
      case "legs_long": return s(`<path d="M22 12 L18 36" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round"/>
                                 <path d="M28 12 L30 36" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round"/>`);

      case "body_brown": return s(`<ellipse cx="24" cy="26" rx="14" ry="10" fill="none" stroke="${stroke}" stroke-width="3"/>`);
      case "body_olive": return s(`<path d="M12 28 C12 18, 36 18, 36 28 C36 38, 12 38, 12 28 Z" fill="none" stroke="${stroke}" stroke-width="3"/>`);
      case "body_spotted": return s(`<path d="M14 30 C14 20, 34 18, 34 30 C34 40, 14 40, 14 30 Z" fill="none" stroke="${stroke}" stroke-width="3"/>
                                     <circle cx="20" cy="26" r="1.8" fill="${stroke}"/><circle cx="26" cy="24" r="1.8" fill="${stroke}"/><circle cx="28" cy="30" r="1.8" fill="${stroke}"/>`);
      case "body_black": return s(`<path d="M14 30 C14 18, 36 18, 36 30 C36 40, 14 40, 14 30 Z" fill="${stroke}" opacity=".1" stroke="${stroke}" stroke-width="3"/>`);

      case "wing_band": return s(`<path d="M12 30 C18 18, 34 18, 36 32 C28 36, 18 36, 12 30 Z" fill="none" stroke="${stroke}" stroke-width="3"/>
                                  <path d="M18 28 C24 24, 30 24, 33 30" stroke="${stroke}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`);
      case "wing_dark": return s(`<path d="M12 30 C18 18, 34 18, 36 32 C28 36, 18 36, 12 30 Z" fill="${stroke}" opacity=".1" stroke="${stroke}" stroke-width="3"/>`);
      case "wing_green": return s(`<path d="M14 30 C18 20, 30 20, 34 32 C28 36, 18 36, 14 30 Z" fill="none" stroke="${stroke}" stroke-width="3"/>`);
      case "wing_long": return s(`<path d="M10 30 C18 14, 36 16, 38 32 C28 38, 18 38, 10 30 Z" fill="none" stroke="${stroke}" stroke-width="3"/>`);

      case "tail_short": return s(`<path d="M20 16 L34 24 L20 32 Z" fill="none" stroke="${stroke}" stroke-width="3"/>`);
      case "tail_fork": return s(`<path d="M18 18 L34 24 L28 24 L34 30 L18 34 Z" fill="none" stroke="${stroke}" stroke-width="3"/>`);
      case "tail_round": return s(`<path d="M18 16 C30 20, 34 24, 18 34 Z" fill="none" stroke="${stroke}" stroke-width="3"/>`);
      case "tail_yellow": return s(`<path d="M18 16 C30 20, 34 24, 18 34 Z" fill="none" stroke="${stroke}" stroke-width="3"/>
                                    <path d="M22 20 C28 22, 30 24, 22 30" stroke="${stroke}" stroke-width="3" opacity=".55"/>`);

      case "head_white": return s(`<circle cx="22" cy="24" r="10" fill="none" stroke="${stroke}" stroke-width="3"/>
                                   <path d="M28 24 L38 22 L30 30 Z" fill="none" stroke="${stroke}" stroke-width="3"/>`);
      case "head_ring": return s(`<circle cx="22" cy="24" r="10" fill="none" stroke="${stroke}" stroke-width="3"/>
                                  <circle cx="22" cy="24" r="6" fill="none" stroke="${stroke}" stroke-width="3" opacity=".55"/>`);
      case "head_plain": return s(`<circle cx="22" cy="24" r="10" fill="none" stroke="${stroke}" stroke-width="3"/>
                                   <circle cx="24" cy="22" r="2.2" fill="${stroke}"/>`);
      case "head_beak": return s(`<circle cx="20" cy="24" r="10" fill="none" stroke="${stroke}" stroke-width="3"/>
                                  <path d="M28 24 L40 20 L30 32 Z" fill="none" stroke="${stroke}" stroke-width="3"/>`);

      default: return s(`<circle cx="24" cy="24" r="10" fill="none" stroke="${stroke}" stroke-width="3"/>`);
    }
  }

  // ---------- Render UI ----------
  function render(){
    const b = bird();

    // top bar
    statusClues.textContent = `線索 ${state.collected.size}/5`;
    statusNeed.textContent = `待掃 ${state.needPart ? partLabel(state.needPart) : "—"}`;
    statusAi.textContent = `AI 提示 ${state.hintsLeft}/2`;

    // buttons
    btnQuiz.disabled = !allCollected();
    btnQuiz.textContent = `開始辨認（${state.collected.size}/5）`;

    // scan texts (if overlay open)
    renderScanTexts();
  }

  // ---------- Events ----------
  birdSelect.addEventListener("change", () => {
    state.birdKey = birdSelect.value;
    resetBird(true);
    showToast(`已切換：${bird().name}`);
  });

  btnStartCamera.addEventListener("click", startCamera);

  btnFeed.addEventListener("click", async () => {
    const ok = await startCamera();
    if(!ok) return;

    if(allCollected()){
      showToast("已集滿 5 張線索，請開始辨認");
      return;
    }
    if(state.needPart){
      showToast(`請先掃描：${bird().name}｜${partLabel(state.needPart)}`);
      openScan();
      return;
    }

    // Feed animation
    feedSubText.textContent = "掉落一張線索卡";
    feedOverlay.classList.add("show");
    feedOverlay.setAttribute("aria-hidden","false");

    setTimeout(() => {
      feedOverlay.classList.remove("show");
      feedOverlay.setAttribute("aria-hidden","true");
    }, 950);

    // Assign next part
    state.needPart = pickNextNeedPart();
    render();
    // Open scan immediately so user sees live camera + scan box
    setTimeout(() => openScan(), 520);
  });

  btnScan.addEventListener("click", async () => {
    const ok = await startCamera();
    if(!ok) return;
    openScan();
  });

  btnReset.addEventListener("click", () => {
    resetBird(true);
    showToast("已重置本鳥");
  });

  btnQuiz.addEventListener("click", openQuiz);

  // Scan overlay close
  btnCloseScan.addEventListener("click", closeScan);
  btnCancelScan.addEventListener("click", closeScan);

  // Quiz close
  btnCloseQuiz.addEventListener("click", closeQuiz);

  // AI hint
  btnAiHint.addEventListener("click", showAiHint);

  // Assemble controls
  btnContinue.addEventListener("click", continueAfterAssemble);
  btnCloseAssemble.addEventListener("click", closeAssemble);

  // Safety: close overlays if user taps outside panel
  scanOverlay.addEventListener("click", (e) => {
    if(e.target === scanOverlay) closeScan();
  });
  quizModal.addEventListener("click", (e) => {
    if(e.target === quizModal) closeQuiz();
  });
  assembleModal.addEventListener("click", (e) => {
    if(e.target === assembleModal) closeAssemble();
  });

  // Keyboard escape (desktop)
  window.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){
      closeScan();
      closeQuiz();
      closeAssemble();
    }
  });

  // Init
  render();
})();
