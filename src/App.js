import React, { useState } from "react";
import AnimeFilter from "./components/AnimeFilter";
import WheelPage from "./components/WheelPage";
import animeList from "./components/animeData";

function App() {
  const [page, setPage] = useState("main");
  const [wheelList, setWheelList] = useState([]);

  // 從詳細彈窗加入 / 移除動畫
  const handleAddToWheel = (anime) => {
    setWheelList((prev) => {
      const exists = prev.some((a) => a.name === anime.name);
      if (exists) {
        return prev.filter((a) => a.name !== anime.name);
      } else {
        return [...prev, anime];
      }
    });
  };

  return (
    <>
      {page === "main" && (
        <AnimeFilter
          goToWheel={() => setPage("wheel")}
          addToWheel={handleAddToWheel}
          wheelList={wheelList}
        />
      )}
      {page === "wheel" && (
        <WheelPage
          goBack={() => setPage("main")}
          wheelList={wheelList}
          setWheelList={setWheelList}
          animeList={animeList}
        />
      )}
    </>
  );
}

export default App;
