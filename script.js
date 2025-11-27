// ===== 在 script.js 最上面加入你的 API Key =====
const YOUTUBE_API_KEY = 'AIzaSyBpy0IZXf9kkkPh2FlO-UMTVXUSmNqqyTQ';  // ← 這裡換成你的

// ===== 取代原本的搜尋事件 =====
// 把這整個區塊取代你原本的 searchInput.addEventListener('keyup'...
searchInput.addEventListener('keyup', async e => {
  if (e.key !== 'Enter') return;

  const query = searchInput.value.trim();
  if (!query) {
    searchContainer.classList.remove('active');
    results.innerHTML = '';
    return;
  }

  searchContainer.classList.add('active');
  results.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>搜尋中…</p>
    </div>
  `;

  try {
    // 第一步：搜尋影片
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=30&q=${encodeURIComponent(query + ' focus lofi study ambient -live')}&videoDuration=short&key=${YOUTUBE_API_KEY}`
    );

    // 網路根本連不到（飛航模式、斷網、被牆）
    if (!searchRes.ok) {
      if (searchRes.status >= 500) {
        throw new Error('YouTube 伺服器暫時有問題');
      }
      if (searchRes.status === 403) {
        throw new Error('API Key 無效或今日額度已滿');
      }
      throw new Error('無法連線到 YouTube');
    }

    const searchData = await searchRes.json();

    // Google 官方額度用完的錯誤
    if (searchData.error) {
      if (searchData.error.code === 403) {
        throw new Error('今日搜尋額度已達上限<br><small>明天自動恢復</small>');
      }
      throw new Error('YouTube API 發生錯誤');
    }

    if (!searchData.items || searchData.items.length === 0) {
      throw new Error('找不到相關影片<br><small>試試「lofi」「rain」「focus」等關鍵字</small>');
    }

    // 第二步：取影片長度
    const videoIds = searchData.items.map(v => v.id.videoId).join(',');
    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );

    if (!detailRes.ok) throw new Error('無法取得影片長度資訊');

    const detailData = await detailRes.json();

    // 組合成最終播放清單（過濾 >5 分鐘）
    const tracks = detailData.items
      .map((v, i) => {
        const sec = parseDuration(v.contentDetails.duration);
        if (sec > 300) return null;
        return {
          title: searchData.items[i].snippet.title.replace(/(\|.*|lofi hip hop radio.*)/gi, '').trim(),
          artist: searchData.items[i].snippet.channelTitle,
          duration: sec,
          videoId: v.id,
          thumb: searchData.items[i].snippet.thumbnails.medium?.url || searchData.items[i].snippet.thumbnails.default.url,
        };
      })
      .filter(Boolean);

    if (tracks.length === 0) {
      throw new Error('沒有 5 分鐘以內的結果<br><small>試著搜尋更短的關鍵字</small>');
    }

    // 成功！
    playlist = tracks;
    renderResults(tracks);

  } catch (err) {
    // 所有錯誤統一在這裡顯示，絕對只會出現一行主要訊息
    results.innerHTML = `
      <div class="error-msg">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <p>${err.message.split('<br>')[0]}</p>
        ${err.message.includes('<br>') ? `<small>${err.message.split('<br><small>')[1].replace('</small>','')}</small>` : ''}
        <button onclick="location.reload()" class="retry-btn">重新載入</button>
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