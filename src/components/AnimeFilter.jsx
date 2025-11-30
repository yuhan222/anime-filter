import React, { useState, useEffect, useRef } from "react";
import "./AnimeFilter.css";
import animeList from "./animeData";

export default function AnimeFilter({ goToWheel, addToWheel, wheelList }) {
  const [filteredAnime, setFilteredAnime] = useState(animeList);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [selectedFilters, setSelectedFilters] = useState({
    status: [],
    genre: [],
    character: [],
  });

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [message, setMessage] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [trailerId, setTrailerId] = useState(null);

  const animeGridRef = useRef(null);

// 🔹 使用 Jikan API 補充年份 / 集數 / 評分
// 🔹 使用 MAL ID 精準查主作品年份 / 集數 / 評分（只查本體）
const fetchExtraInfo = async (mal_id) => {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${mal_id}`);
    const data = await res.json();

    if (data.data) {
      const info = data.data;
      return {
        year: info.year || (info.aired?.prop?.from?.year ?? null),
        episodes: info.episodes || null,
        score: info.score || null,
      };
    }
  } catch (err) {
    console.error("❌ Jikan API Error:", err);
  }
  return {};
};



  // 🔹 YouTube 預告片搜尋（僅在本地沒有 trailer 時使用）
  const fetchTrailer = async (animeName) => {
  const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
  console.log("🔑 API KEY:", apiKey);  // 確認 API 有抓到

  if (!apiKey) {
    console.log("⚠️ API Key 沒讀到，請檢查 .env 是否正確 & 是否有 npm start");
    return;
  }

  const query = `${animeName} 官方 預告 本予告 先行 PV Trailer`;

  console.log("🔍 搜尋影片關鍵字：", query);

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query
      )}&type=video&key=${apiKey}&maxResults=5`
    );

    const data = await res.json();
    console.log("📩 YouTube API 回傳資料:", data);

    if (data.items && data.items.length > 0) {
      const best = data.items.find((v) =>
        /公式|予告|Trailer|PV|先行|本予告|Official|預告/i.test(
          v.snippet.title
        )
      );

      const videoId = best ? best.id.videoId : data.items[0].id.videoId;
      console.log("📺 使用的影片 ID:", videoId);
      setTrailerId(videoId);
    } else {
      console.log("❌ API 沒找到影片");
      setTrailerId(null);
    }
  } catch (err) {
    console.error("🔥 YouTube API Error:", err);
    setTrailerId(null);
  }
};

// 🔹 整部動畫「所有季的總集數」查詢
const fetchTotalEpisodes = async (mal_id, season_ids = []) => {
  try {
    // 如果有手動提供季 ID，就用 season_ids，否則只用 mal_id
    const allIds = season_ids.length ? season_ids : [mal_id];

    let totalEpisodes = 0;
    let allScores = [];

    for (const id of allIds) {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
      const data = await res.json();
      if (data.data) {
        totalEpisodes += data.data.episodes || 0;
        if (data.data.score) allScores.push(data.data.score);
      }
    }

    return {
      totalSeasons: allIds.length,
      totalEpisodes: totalEpisodes || null,
      bestScore: allScores.length ? Math.max(...allScores) : null,
    };
  } catch (err) {
    console.error("🔥 Total Episode API Error:", err);
    return {};
  }
};




  // ⭐ 開啟詳細彈窗時 → 先判斷有沒有本地 trailer，有就直接用，沒有才搜尋 API
  const openDetail = async (item) => {
  const fullItem = animeList.find((a) => a.name === item.name);
  setShowDetail(true);
  setDetailItem(fullItem);

  if (!fullItem.mal_id) return; // 🔥 沒設定 MAL ID 的就跳過

  // ① 使用 MAL ID 查主資料
  const extra = await fetchExtraInfo(fullItem.mal_id);

const seasonData = await fetchTotalEpisodes(
  fullItem.mal_id,
  fullItem.season_ids // ⬅ 手動給的季 ID 陣列
);


  // ③ 更新顯示資料
  setDetailItem({
    ...fullItem,
    year: fullItem.year || extra.year,
    episodes: seasonData.totalEpisodes || extra.episodes,
    score: fullItem.score || seasonData.bestScore || extra.score,
    totalSeasons: seasonData.totalSeasons || null,
  });

  // 🔹 預告片（本地優先）
  if (fullItem.trailer) {
    const id = fullItem.trailer.includes("watch?v=")
      ? fullItem.trailer.split("watch?v=")[1]
      : fullItem.trailer;
    setTrailerId(id);
  } else {
    fetchTrailer(fullItem.name);
  }
};





  useEffect(() => {
    applyFilters();
  }, [selectedFilters]);

  const handleSearch = () => {
    const filtered = animeList.filter((a) =>
      a.name.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredAnime(filtered);
    setCurrentPage(1);
  };

  const toggleFilter = (type, value) => {
    setSelectedFilters((prev) => {
      const updated = prev[type].includes(value)
        ? prev[type].filter((v) => v !== value)
        : [...prev[type], value];
      return { ...prev, [type]: updated };
    });
  };

  const applyFilters = () => {
    setFilteredAnime(
      animeList.filter(
        (a) =>
          (selectedFilters.status.length === 0 ||
            selectedFilters.status.includes(a.status)) &&
          (selectedFilters.genre.length === 0 ||
            selectedFilters.genre.some((g) => a.genre.includes(g))) &&
          (selectedFilters.character.length === 0 ||
            selectedFilters.character.some((c) => a.character.includes(c)))
      )
    );
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSelectedFilters({ status: [], genre: [], character: [] });
    setSearchText("");
    setFilteredAnime(animeList);
  };

  const totalPages = Math.ceil(filteredAnime.length / itemsPerPage);
  const paginatedList = filteredAnime.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const showToast = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div className="anime-container">
      {message && <div className="toast-message">{message}</div>}

      <header className="top-header">
        <h1>動漫篩選器</h1>
        <button className="wheel-btn" onClick={goToWheel}>
          🎡 轉盤抽選
        </button>
      </header>

      {/* 搜尋 + 篩選區 */}
      <div id="searchSection">
        <div className="search-bar-wrapper">
          <input
            type="text"
            placeholder="搜尋動漫名稱..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button id="searchNameBtn" onClick={handleSearch}>
            搜尋
          </button>
        </div>

        <div id="filters">
          {/* 狀態 */}
          <div className="dropdown">
            <div
              className="dropdown-btn"
              onClick={() =>
                setActiveDropdown(activeDropdown === "status" ? null : "status")
              }
            >
              {selectedFilters.status.length
                ? selectedFilters.status.join(", ")
                : "狀態"}
            </div>
            <div
              className={`dropdown-content ${
                activeDropdown === "status" ? "active" : ""
              }`}
            >
              {["完結", "連載"].map((item) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    checked={selectedFilters.status.includes(item)}
                    onChange={() => toggleFilter("status", item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          {/* 類別 */}
          <div className="dropdown">
            <div
              className="dropdown-btn"
              onClick={() =>
                setActiveDropdown(activeDropdown === "genre" ? null : "genre")
              }
            >
              {selectedFilters.genre.length
                ? selectedFilters.genre.join(", ")
                : "風格"}
            </div>
            <div
              className={`dropdown-content ${
                activeDropdown === "genre" ? "active" : ""
              }`}
            >
              {["冒險", "戀愛", "搞笑", "動作","奇幻","戰鬥","血腥暴力","校園","勵志","智鬥","犯罪","心理","科幻","異世界","美食","哲學","歷史","懸疑","感人"].map((item) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    checked={selectedFilters.genre.includes(item)}
                    onChange={() => toggleFilter("genre", item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          {/* 性格 */}
          <div className="dropdown">
            <div
              className="dropdown-btn"
              onClick={() =>
                setActiveDropdown(
                  activeDropdown === "character" ? null : "character"
                )
              }
            >
              {selectedFilters.character.length
                ? selectedFilters.character.join(", ")
                : "主角性格"}
            </div>
            <div
              className={`dropdown-content ${
                activeDropdown === "character" ? "active" : ""
              }`}
            >
              {["熱血","衝動","堅毅","善良","冷靜","高智商","傲嬌","溫柔","幽默","有責任感","內斂","自信","瘋狂","反差","勇敢"].map((item) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    checked={selectedFilters.character.includes(item)}
                    onChange={() => toggleFilter("character", item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <button id="filterBtn" onClick={applyFilters}>
            篩選
          </button>
          <button id="resetBtn" onClick={resetFilters}>
            重置
          </button>
        </div>
      </div>

      {/* 動漫顯示區 */}
      <div id="animeWrapper">
        <div id="animeGrid" ref={animeGridRef}>
          {paginatedList.map((anime, index) => (
            <div
              key={index}
              className="animeCard"
              onClick={() => openDetail(anime)}
            >
              <img src={anime.img} alt={anime.name} />
              <h3>{anime.name}</h3>
            </div>
          ))}
        </div>

        {/* 分頁 */}
        <div id="pagination">
          <button
            onClick={() =>
              setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev))
            }
            disabled={currentPage === 1}
          >
            上一頁
          </button>
          <span id="pageInfo">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) =>
                prev < totalPages ? prev + 1 : prev
              )
            }
            disabled={currentPage === totalPages}
          >
            下一頁
          </button>
        </div>
      </div>

      {/* ⭐詳細彈窗（含 YouTube 預告片） */}
      <div
        id="detailOverlay"
        className={showDetail ? "active" : ""}
        onClick={() => setShowDetail(false)}
      >
        {showDetail && detailItem && (
          <div id="detailCard" onClick={(e) => e.stopPropagation()}>
            <button id="closeDetail" onClick={() => setShowDetail(false)}>
              ✖
            </button>

            <img id="detailImg" src={detailItem.img} alt={detailItem.name} />

            <div id="detailText">
  <div className="detail-row">
    <div className="detail-left">
      <h2>{detailItem.name}</h2>
      <p>{detailItem.desc}</p>

      {detailItem.totalSeasons && <p>📚 共 {detailItem.totalSeasons} 季</p>}
      {detailItem.episodes && <p>🎞️ 總集數：{detailItem.episodes} 集</p>}
      {detailItem.score && <p>⭐ 最高評分：{detailItem.score}</p>}

      <div id="detailTags">
        {detailItem.status && <span className="tag">{detailItem.status}</span>}
        {detailItem.genre?.map((g, i) => (
          <span key={i} className="tag">{g}</span>
        ))}
        {detailItem.character?.map((c, i) => (
          <span key={i} className="tag">{c}</span>
        ))}
      </div>
    </div>

    {/* 🎬 官方預告片在右側，不動原本格式 */}
    {trailerId && (
      <div className="detail-right">
        <h3>🎬 官方預告片</h3>
        <iframe
          src={`https://www.youtube.com/embed/${trailerId}`}
          title="Official Trailer"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    )}
  </div>


              {/* 加入轉盤 */}
              <button
                className="add-wheel-btn"
                onClick={() => {
                  addToWheel(detailItem);
                  showToast(
                    wheelList.some((a) => a.name === detailItem.name)
                      ? `❌ 已從轉盤移除：${detailItem.name}`
                      : `✔ 已加入轉盤：${detailItem.name}`
                  );
                }}
              >
                {wheelList.some((a) => a.name === detailItem.name)
                  ? "✔ 已加入轉盤（點此移除）"
                  : "加入轉盤"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
