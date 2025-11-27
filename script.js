// ===== 在 script.js 最上面加入你的 API Key =====
const YOUTUBE_API_KEY = 'AIzaSyBpy0IZXf9kkkPh2FlO-UMTVXUSmNqqyTQ';  // ← 這裡換成你的

// ===== 取代原本的搜尋事件 =====
searchInput.addEventListener('keyup', async e => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (!query) return;
    
    searchContainer.classList.add('active');
    results.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">搜尋中…</div>';

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=30&q=${encodeURIComponent(query + ' focus music lofi ambient study -live')}&videoDuration=short&key=${YOUTUBE_API_KEY}`
      );
      const data = await res.json();

      const videoIds = data.items.map(item => item.id.videoId).join(',');

      const details = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );
      const detailsData = await details.json();

      const tracks = detailsData.items
        .map((v, i) => {
          const duration = parseDuration(v.contentDetails.duration); // PT4M22S → 262 秒
          if (duration > 300) return null; // 超過 5 分鐘直接濾掉
          return {
            title: data.items[i].snippet.title.replace(' (Lo-fi hip hop / Chillhop / Chillout / Study Beats)', ''),
            artist: data.items[i].snippet.channelTitle,
            duration: duration,
            videoId: v.id,
            thumb: data.items[i].snippet.thumbnails.medium?.url || data.items[i].snippet.thumbnails.default.url,
          };
        })
        .filter(Boolean);

      playlist = tracks;
      renderResults(tracks);

    } catch (err) {
      results.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">搜尋失敗，請檢查網路</div>';
    }
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