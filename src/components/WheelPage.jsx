import React, { useState, useEffect, useRef } from "react";
import "./WheelPage.css";
import "./AnimeFilter.css";


export default function WheelPage({ goBack, wheelList, setWheelList, animeList  }) {
  const [customItems, setCustomItems] = useState([]);
  const [segmentCount, setSegmentCount] = useState(5);
  const [showCustomize, setShowCustomize] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [results, setResults] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [trailerId, setTrailerId] = useState(null); 
  const [showRandomPopup, setShowRandomPopup] = useState(false);
  const [randomCount, setRandomCount] = useState(1);


  const canvasRef = useRef(null);

  // 🔹 所有轉盤內容（主頁 + 自訂）
  const allItems = [
    ...(wheelList || []).map((a) => a.name),
    ...customItems.filter((t) => t && t.trim() !== "")
  ];

  // 🔹 畫轉盤內容 (繪圖邏輯不變)
  useEffect(() => {
    drawWheel();
  }, [allItems, rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    if (!allItems.length) return; 

    const count = allItems.length;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;
    const anglePer = (Math.PI * 2) / count;
    const colors = ["#a5afff", "#909dff"];

    for (let i = 0; i < count; i++) {
      const start = i * anglePer;
      const end = start + anglePer;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[i % 2];
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 🔹 文字
      const text = allItems[i];
      const midAngle = start + anglePer / 2;
      const textRadius = radius * 0.65;
      const tx = centerX + Math.cos(midAngle) * textRadius;
      const ty = centerY + Math.sin(midAngle) * textRadius;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle);
      ctx.fillStyle = "#333";
      ctx.font = "16px Microsoft JhengHei";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text.length > 8 ? text.slice(0, 8) + "…" : text, 0, 0);
      ctx.restore();
    }
  };

  // 🔹 抽選邏輯 (不變)
  const spinWheel = () => {
    if (!allItems.length) {
      alert("請先加入動畫或自訂內容！");
      return;
    }

    const count = allItems.length;
    const anglePerSegment = 360 / count;
    const extraSpin = 360 * 6 + Math.random() * 360;

    let finalRotation = rotation;

    setRotation((prev) => {
      finalRotation = prev + extraSpin;
      return finalRotation;
    });

    setTimeout(() => {
      const theta = ((finalRotation % 360) + 360) % 360;
      const alpha = (270 - theta + 360) % 360;
      let index = Math.floor(alpha / anglePerSegment);
      if (index >= count) index = count - 1;

      const winner = allItems[index];
      setResults((prev) => [...prev, winner]);
      alert(`抽到：${winner}`);
    }, 4000);
  };

  // 🔹 清除全部資料 (不變)
  const clearWheel = () => {
    if (window.confirm("確定要清除所有內容嗎？")) {
      setCustomItems([]);
      setWheelList([]);
      setResults([]);
      setRotation(0);
    }
  };

  //隨機抽取動漫
  const handleRandomAdd = () => {
  const shuffled = [...wheelList]; // 已有的項目保留
  const available = animeList.filter(a => !wheelList.some(w => w.name === a.name)); // 避免重複

  const count = Math.min(randomCount, available.length);

  // 隨機打散 available 再取前 count 個
  const randomPicked = available.sort(() => 0.5 - Math.random()).slice(0, count);

  setWheelList([...wheelList, ...randomPicked]); // 加入轉盤
  setShowRandomPopup(false); // 關閉彈窗
};


  // 🔹 生成自訂欄位 (不變)
  const renderSegmentInputs = () => {
    return Array.from({ length: segmentCount }).map((_, i) => (
      <div className="segment-row" key={i}>
        <label>第 {i + 1} 格：</label>
        <input
          type="text"
          value={customItems[i] || ""}
          onChange={(e) => {
            const newItems = [...customItems];
            newItems[i] = e.target.value;
            setCustomItems(newItems);
          }}
          placeholder="請輸入內容"
        />
      </div>
    ));
  };
  
  // 🔹 YouTube 預告片搜尋 (API 邏輯不變)
  const fetchTrailer = async (animeName) => {
    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;

    if (!apiKey) {
      console.log("⚠️ API Key 未設定或未讀取");
      setTrailerId(null);
      return;
    }

    const query = `${animeName} 官方 預告 本予告 先行 PV Trailer`;

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          query
        )}&type=video&key=${apiKey}&maxResults=5`
      );

      const data = await res.json();

      if (data.items && data.items.length > 0) {
        const best = data.items.find((v) =>
          /公式|予告|Trailer|PV|先行|本予告|Official|預告/i.test(
            v.snippet.title
          )
        );

        const videoId = best ? best.id.videoId : data.items[0].id.videoId;
        setTrailerId(videoId);
      } else {
        setTrailerId(null);
      }
    } catch (err) {
      console.error("🔥 YouTube API Error:", err);
      setTrailerId(null);
    }
  };


  // ⭐ 開啟詳細彈窗的邏輯 (不變)
  const openDetail = async (item) => {
      setSelectedAnime(item);
      setTrailerId(null); 

      // 🔹 預告片（本地優先）
      if (item.trailer) {
        // 從完整的 URL 或 ID 提取 ID
        const id = item.trailer.includes("watch?v=")
          ? item.trailer.split("watch?v=")[1]
          : item.trailer;
        setTrailerId(id);
      } else {
        // 如果本地沒有 URL，則嘗試用 API 搜索
        fetchTrailer(item.name);
      }
  };

  return (
    <div id="wheelPage">
      
      {/* ⭐ 修正後的 Header：只保留返回按鈕和標題 */}
      <div className="wheel-header">

        <div className="left-buttons">
          <button className="back-btn" onClick={goBack}>🏠返回主頁</button>
          {/* ⭐ 移除 🎲 隨機 ⚙️ 自訂 按鈕 */}
        </div>

        <h2 className="wheel-title">隨機抽選轉盤</h2>

      </div>

      <div className="wheel-main">
        
        {/* ⭐ 新增容器：Header 下方功能按鈕的新位置 (在左側清單上方) */}
        <div className="action-buttons-container">
            <button className="random-btn" onClick={() => setShowRandomPopup(true)}>🎲 隨機</button>
            <button className="customize-btn" onClick={() => setShowCustomize(true)}>⚙️ 自訂</button>
        </div>

        {/* ⭐ 左側容器：用於包裹抽選結果和已加入清單，實現垂直堆疊自適應 */}
        <div className="left-panel-container">
            {/* 📝 結果區 (左上) */}
            <div className="result-panel">
              <h3>抽選結果</h3>
              {results.length === 0 ? (
                <p className="no-result">尚未有抽選紀錄</p>
              ) : (
                <ul>
                  {results.map((name, idx) => {
                    const animeData = wheelList.find(a => a.name === name);
                    return (
                      <li key={idx}>
                        {idx + 1}. {name}
                        {animeData && (
                          <button
                            className="detail-btn"
                            onClick={() => openDetail(animeData)}
                            style={{ marginLeft: "10px" }}
                          >
                            詳細內容
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            
            {/* 🎴 已加入的動畫清單 (左下) */}
            <div className="left-list"> 
              <h3>已加入的動畫</h3>
              {wheelList && wheelList.length > 0 ? (
                wheelList.map((anime, idx) => (
                  <div className="right-item" key={idx}>
                    <img src={anime.img} alt={anime.name} />
                    <span>{anime.name}</span>
                    <button onClick={() => setWheelList(prev => prev.filter(a => a.name !== anime.name))}>
                      刪除
                    </button>
                  </div>
                ))
              ) : (
                <p style={{fontSize:"14px", color:"#777"}}>尚未加入項目</p>
              )}
            </div>
        </div>


        {/* 🎯 轉盤 (中央右移) */}
        <div className="wheel-container">
          <div className="pointer" />
          <canvas
            ref={canvasRef}
            className="wheel-canvas"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: "transform 4s ease-out",
            }}
          />
        </div>


      </div>

      <div className="wheel-buttons">
        <button className="spinBtn" onClick={spinWheel}>開始抽選</button>
        <button className="clearWheelBtn" onClick={clearWheel}>清除全部</button>
      </div>

      {/* ⚙️ 自訂彈窗 (不變) */}
      {showCustomize && (
        <div id="customizeOverlay">
          <div id="customizeCard">
            <button id="closeCustomize" onClick={() => setShowCustomize(false)}>✖</button>
            <h2>⚙️ 自訂轉盤內容</h2>
            {/* ... (自訂內容區塊不變) ... */}
            <label>轉盤格數（3 - 10 格）：</label>
            <input
              type="number"
              min="3"
              max="10"
              value={segmentCount}
              onChange={(e) => {
                let value = Math.min(10, Math.max(3, parseInt(e.target.value)));
                setSegmentCount(value);
                setCustomItems((prev) => {
                  const updated = [...prev];
                  updated.length = value;
                  return updated;
                });
              }}
            />

            <div id="segmentInputs">{renderSegmentInputs()}</div>

            <button id="saveWheelContent" onClick={() => setShowCustomize(false)}>
              儲存並使用
            </button>
          </div>
        </div>
      )}
      
      {/* 🟣 詳細資訊彈窗 (不變) */}
      {selectedAnime && (
        <div id="detailOverlay" className="active" onClick={() => setSelectedAnime(null)}>
          <div id="detailCard" onClick={(e) => e.stopPropagation()}> 
            <button id="closeDetail" onClick={() => setSelectedAnime(null)}>✖</button>

            {/* ⭐ 第一層並排：由 #detailCard 的 flex 實現：圖片 vs 文字區塊 */}
            
            {/* 1. 圖片區塊 (直接在 #detailCard 內) */}
            <img id="detailImg" src={selectedAnime.img} alt={selectedAnime.name} />

            {/* 2. 所有文字內容區塊 */}
            <div id="detailText"> 
              <h2>{selectedAnime.name}</h2>
              
              {/* ⭐ 第二層並排：由 .detail-row 實現：簡介/標籤區 vs 預告片區 */}
              <div className="detail-row"> 
                  
                  {/* 2a. 左側內容區 (.detail-left) - 簡介和標籤 */}
                  <div className="detail-left">
                    {/* 簡介 */}
                    <p className="popup-desc">{selectedAnime.desc}</p>
                    
                    {/* 標籤 (在簡介下面) */}
                    <div id="detailTags">
                      {selectedAnime.status && <span className="tag">{selectedAnime.status}</span>}
                      {selectedAnime.genre?.map((tag, i) => (<span key={i} className="tag">{tag}</span>))}
                      {selectedAnime.character?.map((tag, i) => (<span key={i} className="tag">{tag}</span>))}
                    </div>
                  </div>
                  
                  {/* 2b. 右側內容區 (.detail-right) - 預告片 */}
                  {(selectedAnime.trailer || trailerId) && (
                    <div className="detail-right">
                      <div className="trailer-section">
                        <h3>🎬 官方預告片</h3>
                        <iframe
                          // ⭐ 優先使用 API 獲取的 trailerId，如果沒有，再從本地數據解析
                          src={`https://www.youtube.com/embed/${trailerId || selectedAnime.trailer.replace("watch?v=", "embed/")}`}
                          title="Official Trailer"
                          frameBorder="0"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        ></iframe>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎲 隨機加入彈窗 (不變) */}
      {showRandomPopup && (
        <div id="popupOverlay">
          <div id="popupCard">

            <button id="closePopup" onClick={() => setShowRandomPopup(false)}>✖</button>

            <h2>🎲 隨機加入動漫</h2>
            <p>請輸入要隨機加入的數量：</p>

            <input
              type="number"
              min="1"
              max={animeList.length}
              value={randomCount}
              onChange={(e) => setRandomCount(e.target.value)}
              className="random-input"
            />

            <div className="popup-buttons">
              <button onClick={() => setShowRandomPopup(false)}>取消</button>
              <button onClick={handleRandomAdd}>加入</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}