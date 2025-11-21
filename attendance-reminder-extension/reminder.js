// 授業の実際の開始時刻
const CLASS_START_TIMES = [
    { period: 1, hour: 8, minute: 50, label: '1限' },
    { period: 2, hour: 10, minute: 45, label: '2限' },
    { period: 3, hour: 13, minute: 15, label: '3限' },
    { period: 4, hour: 15, minute: 10, label: '4限' },
    { period: 5, hour: 22, minute: 35, label: '5限' }
];

// URLパラメータから時限情報を取得
function getPeriodFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const periodNum = parseInt(params.get('period'), 10);
    return CLASS_START_TIMES.find(p => p.period === periodNum);
}

// 時限ラベルを表示
const period = getPeriodFromUrl();
if (period) {
    document.getElementById('period-label').textContent = `${period.label}の授業時間です`;
}

// マイページを開くボタンのイベントリスナー
document.getElementById('open-mypage').addEventListener('click', () => {
    // 現在のタブでマイページに遷移
    window.location.href = 'https://service.cloud.teu.ac.jp/portal/mypage/';
});

// 出席登録完了ボタンのイベントリスナー
document.getElementById('mark-completed').addEventListener('click', () => {
    if (!period) return;

    // 今日の日付を取得
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Chrome Storageに保存
    chrome.storage.local.get({ attendanceCompleted: {} }, (result) => {
        const data = result.attendanceCompleted;

        // 古いデータを削除
        for (const date in data) {
            if (date < dateKey) {
                delete data[date];
            }
        }

        // 今日のデータを初期化
        if (!data[dateKey]) {
            data[dateKey] = [];
        }

        // 時限を追加
        if (!data[dateKey].includes(period.period)) {
            data[dateKey].push(period.period);
        }

        // データを保存
        chrome.storage.local.set({ attendanceCompleted: data }, () => {
            // 成功メッセージを表示してタブを閉じる
            alert('出席登録を記録しました！');
            window.close();
        });
    });
});
