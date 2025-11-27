// ===== 在 script.js 最上面加入你的 API Key =====
const YOUTUBE_API_KEY = 'AIzaSyBpy0IZXf9kkkPh2FlO-UMTVXUSmNqqyTQ';  // ← 這裡換成你的

// ===== 取代原本的搜尋事件 =====
// 把這整個區塊取代你原本的 searchInput.addEventListener('keyup'...
searchInput.addEventListener('keyup', async e => {
  if (e.key !== 'Enter') return;

  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    searchContainer.classList.remove('active');
    return;
  }

  // 1. 顯示「搜尋中…」
  searchContainer.classList.add('active');
  results.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>搜尋中…</p>
    </div>
  `;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=30&q=${encodeURIComponent(query + ' focus music lofi study ambient -live')}&videoDuration=short&key=${YOUTUBE_API_KEY}`
    );

    // 2. 網路根本連不到（例如沒網路、API Key 錯、被防火牆擋）
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    // 3. 每日額度用完會回傳 error
    if (data.error) {
      if (data.error.code === 403) {
        results.innerHTML = `
          <div class="error-msg">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <p>今日搜尋額度已達上限<br><small>明天自動恢復，或換個 API Key</small></p>
          </div>
        `;
      } else {
        throw new Error(data.error.message);
      }
      return;
    }

    if (!data.items || data.items.length === 0) {
      results.innerHTML = `
        <div class="empty-msg">
          <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <p>找不到相關結果</p>
          <small>試試「lofi」、「rain」、「focus」之類的關鍵字</small>
        </div>
      `;
      return;
    }

    // 正常拿到影片 ID 後，再去拿長度…
    const videoIds = data.items.map(item => item.id.videoId).join(',');
    const detailsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );

    if (!detailsRes.ok) throw new Error('獲取影片長度失敗');

    const detailsData = await detailsRes.json();

    // 組合成 playlist（跟之前一樣）
    const tracks = detailsData.items
      .map((v, i) => {
        const sec = parseDuration(v.contentDetails.duration);
        if (sec > 300) return null;  // 超過 5 分鐘濾掉
        return {
          title: data.items[i].snippet.title,
          artist: data.items[i].snippet.channelTitle,
          duration: sec,
          videoId: v.id,
          thumb: data.items[i].snippet.thumbnails.medium?.url || data.items[i].snippet.thumbnails.default.url,
        };
      })
      .filter(Boolean);

    if (tracks.length === 0) {
      results.innerHTML = `
        <div class="empty-msg">
          <p>沒有 5 分鐘以內的結果</p>
          <small>試著搜尋「lofi 1 hour」以外的關鍵字</small>
        </div>
      `;
      return;
    }

    playlist = tracks;
    renderResults(tracks);

  } catch (err) {
    console.error(err);

    // 最終的「搜尋失敗，請檢查網路」
    results.innerHTML = `
      <div class="error-msg">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <p>搜尋失敗，請檢查網路</p>
        <small style="color:#f33;">${err.message.includes('Failed to fetch') ? '無法連到 YouTube' : 'API 錯誤'}</small>
      </div>
    `;
  }
});

// 幫你把 ISO 8601 時間轉秒數
function parseDuration(pt) {
  const regex = /PT(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = pt.match(regex);
  const minutes = parseInt(matches[1]) || 0;
  const seconds = parseInt(matches[2]) || 0;
  return minutes * 60 + seconds;
}

// 播放時用 youtube-nocookie（比較不會被 iOS 擋）
function playTrack(index) {
  currentIndex = index;
  const track = playlist[index];
  audio.src = `https://www.youtube-nocookie.com/embed/${track.videoId}?autoplay=1&enablejsapi=1`;
  // 因為變成 iframe 播放，要改用 YouTube IFrame API（下面會給完整版）
}