import React, { useState, useMemo } from "react";
import DesignIntentBar from "./DesignIntentBar";
import "./SearchPage.css";
// 引入身份工具
// 引入身份工具和埋点工具
import { getTesterId, resetTester, trackEvent } from "../track";

export default function SearchPage({ 
  searchMode, 
  currentIntent, 
  onSearchStart, 
  onGoHome, 
  onEnterWorkspace 
}) {
  const isSearched = searchMode === 'searched';
  
  // 获取当前测试员
  const testerName = getTesterId();

  // ── 新增：主菜单的读取存档逻辑 ──
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // 1. 恢复身份
        if (data.tester_name) localStorage.setItem('tester_id', data.tester_name);
        
        // 2. 恢复工作台 (Workspace) 进度
        if (data.workspace_cards || data.cards) {
          localStorage.setItem('cards', JSON.stringify(data.workspace_cards || data.cards));
        }
        if (data.workspace_assocCache || data.assocCache) {
          localStorage.setItem('assocCache', JSON.stringify(data.workspace_assocCache || data.assocCache));
        }
        if (data.workspace_attrCache || data.attrCache) {
          localStorage.setItem('attrCache', JSON.stringify(data.workspace_attrCache || data.attrCache));
        }
        
        // 3. 恢复生成页 (IdeaGeneration) 成果，先存进缓存
        localStorage.setItem('imported_idea_data', JSON.stringify({
          selected_attributes: data.selected_attributes,
          context_data: data.context_data,
          generated_concepts: data.generated_concepts,
          chat_history: data.chat_history
        }));

        alert(`🎉 成功读取【${data.tester_name || '未知用户'}】的存档！请点击任意图片进入工作台查看。`);
        window.location.reload(); 
      } catch (err) {
        console.error("读取 JSON 失败:", err);
        alert("导入失败：文件格式不正确！");
      }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const initialImages = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: `mixed-${i}`,
      url: `/images/50pics/homefeed_img_${i + 1}.jpg`, 
      alt: `混合产品 ${i + 1}`,
    }));
  }, []);

  const searchedImages = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: `humidifier-${i}`,
      url: `/images/100pics/humidifier_${i + 1}.jpg`,
      alt: `加湿器 ${i + 1}`,
    }));
  }, []);

  const handleImageClick = (imgUrl) => {
    if (isSearched) {
      trackEvent('click_search_image', { imageUrl: imgUrl });
      onEnterWorkspace("加湿器", currentIntent, imgUrl);
    }
  };

  const displayImages = isSearched ? searchedImages : initialImages;

  return (
    <div className="search-page">
      <div className="search-page__header-wrapper">
        <DesignIntentBar 
          initialIntent={currentIntent}
          onSearchStart={onSearchStart} 
          leftBtnText="首页"
          onLeftBtnClick={isSearched ? onGoHome : null}
        />
        
        {/* 👇 新增：右上角的控制台大本营 */}
        <div style={{ position: 'absolute', top: '20px', right: '30px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          
          <input type="file" accept=".json" id="import-json-input" style={{ display: 'none' }} onChange={handleImportJSON} />
          
          <button 
            onClick={() => document.getElementById('import-json-input').click()}
            style={{ fontSize: '12px', padding: '4px 8px', background: '#f0f2f5', color: '#333', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer' }}
          >
            📥 导入存档
          </button>

          <span style={{ fontSize: '14px', color: '#333', fontWeight: 'bold', marginLeft: '8px' }}>👤 {testerName}</span>
          
          <button 
            onClick={() => {
              localStorage.clear();
              resetTester();
            }} 
            style={{ fontSize: '12px', padding: '4px 8px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
          >
            强制换人
          </button>
        </div>
      </div>

      <main className="search-page__gallery">
        <div className="waterfall-container">
          {displayImages.map((img) => (
            <div
              key={img.id}
              className={`waterfall-item ${isSearched ? "clickable" : ""}`}
              onClick={() => handleImageClick(img.url)}
            >
              <img src={img.url} alt={img.alt} loading="lazy" />
              <div className="waterfall-item__overlay">
                {isSearched ? "以 [加湿器] 开启设计分析" : "浏览产品"}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}