// ゲームデータ格納用
let masters = {};
let playerStatus = {};
let gameProgress = {};

// 起動時にデータを読み込む
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadAllData();
        initGame();
    } catch (err) {
        console.error("データの読み込みに失敗しました:", err);
        alert("JSONの読み込みに失敗しました。Live Server等で実行してください。");
    }
});

/**
 * データの非同期読み込み
 */
async function loadAllData() {
    const fetchJson = url => fetch(url).then(res => res.json());

    // マスターデータとセーブデータの読み込み
    [
        masters.school, 
        masters.calendar, 
        masters.training, 
        masters.event,
        playerStatus,
        gameProgress
    ] = await Promise.all([
        fetchJson('./masut/school_master.json'),
        fetchJson('./masut/calendar_master.json'),
        fetchJson('./masut/training_master.json'),
        fetchJson('./masut/event_master.json'),
        fetchJson('./player_status.json'),
        fetchJson('./game_progress.json')
    ]);
}

/**
 * 初期化
 */
function initGame() {
    renderSchoolSelection();
    showScreen('screen-start');
}

/**
 * 高校選択画面の生成
 */
function renderSchoolSelection() {
    const list = document.getElementById('school-list');
    list.innerHTML = '';
    masters.school.schools.forEach(school => {
        const btn = document.createElement('button');
        btn.innerHTML = `<strong>${school.name}</strong><br><small>${school.catchphrase}</small>`;
        btn.onclick = () => startSuccess(school);
        list.appendChild(btn);
    });
}

/**
 * ゲーム開始
 */
function startSuccess(school) {
    // 高校データの初期値を反映
    playerStatus.player_status.basic_info.selected_school_id = school.id;
    Object.assign(playerStatus.player_status.visible_stats, school.initial_status);
    
    document.getElementById('status-bar').classList.remove('hidden');
    updateUI();
    showScreen('screen-main');
    renderTrainingMenu();
}

/**
 * 練習メニューの生成
 */
function renderTrainingMenu() {
    const list = document.getElementById('training-list');
    list.innerHTML = '';
    masters.training.trainings.forEach(menu => {
        const btn = document.createElement('button');
        btn.innerHTML = `${menu.name}<br><small>体力-${menu.energy_cost}</small>`;
        btn.onclick = () => executeTraining(menu);
        list.appendChild(btn);
    });
}

/**
 * 練習実行ロジック
 */
function executeTraining(menu) {
    const stats = playerStatus.player_status.visible_stats;
    
    // 失敗判定（体力が低いほど失敗率アップ）
    const failRate = menu.fail_rate_base + (100 - stats.energy_current) / 2;
    const isFail = Math.random() * 100 < failRate;

    if (isFail) {
        alert("練習失敗！");
        stats.energy_current -= Math.floor(menu.energy_cost / 2);
        stats.motivation -= 1;
    } else {
        // パラメータ加算
        for (let key in menu.gains) {
            if (stats[key] !== undefined) stats[key] += menu.gains[key];
        }
        stats.energy_current -= menu.energy_cost;
    }

    // 体力の範囲補正
    stats.energy_current = Math.max(0, stats.energy_current);
    stats.motivation = Math.max(1, Math.min(5, stats.motivation));

    nextTurn();
}

/**
 * ターン進行
 */
function nextTurn() {
    const info = playerStatus.player_status.basic_info;
    info.total_turn++;
    
    // カレンダー更新（簡易版：実際はcalendar_masterを参照）
    info.current_week++;
    if (info.current_week > 4) {
        info.current_week = 1;
        info.current_month++;
    }
    if (info.current_month > 12) {
        info.current_month = 1;
        info.current_year++;
    }

    updateUI();
    checkEvents();
}

/**
 * イベント判定システム
 */
function checkEvents() {
    const availableEvents = masters.event.events.filter(e => {
        // ここに条件判定ロジック（確率やステータス）を実装
        return Math.random() < e.occurrence_probability;
    });

    if (availableEvents.length > 0) {
        displayEvent(availableEvents[0]);
    } else {
        showScreen('screen-main');
    }
}

function displayEvent(eventData) {
    showScreen('screen-event');
    document.getElementById('event-title').innerText = eventData.title;
    document.getElementById('event-text').innerText = eventData.text;
    
    const choiceContainer = document.getElementById('event-choices');
    choiceContainer.innerHTML = '';
    
    eventData.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.innerText = choice.text;
        btn.onclick = () => {
            alert(choice.result_text);
            // 実際はここでステータス反映処理
            showScreen('screen-main');
        };
        choiceContainer.appendChild(btn);
    });
}

/**
 * UIの更新
 */
function updateUI() {
    const info = playerStatus.player_status.basic_info;
    const stats = playerStatus.player_status.visible_stats;

    document.getElementById('calendar-display').innerText = `${info.current_year}年 ${info.current_month}月 ${info.current_week}週`;
    document.getElementById('energy-text').innerText = `${stats.energy_current}/${stats.energy_max}`;
    document.getElementById('energy-gauge').style.width = `${(stats.energy_current / stats.energy_max) * 100}%`;
    
    document.getElementById('p-muscle').innerText = stats.muscle;
    document.getElementById('p-tech').innerText = stats.technique;
    document.getElementById('p-speed').innerText = stats.agility;
}

/**
 * 画面切り替え
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}