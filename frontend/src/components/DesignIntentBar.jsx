import { useState, useEffect } from "react";
import "./DesignIntentBar.css";

export default function DesignIntentBar({ 
  initialIntent = "", 
  onSearchStart, 
  leftBtnText = "首页", // 动态接收左侧文字
  onLeftBtnClick 
}) {
  const [intent, setIntent] = useState(initialIntent);

  // 当外部跳回来时，自动同步搜索框的内容
  useEffect(() => {
    setIntent(initialIntent);
  }, [initialIntent]);

  const handleSearch = () => {
    if (!intent.trim()) return;
    if (onSearchStart) onSearchStart(intent);
  };

  return (
    <div className="design-intent-bar">
      <div className="design-intent-bar__inner">
        {onLeftBtnClick && (
          <div 
            className="design-intent-bar__left-btn" 
            onClick={onLeftBtnClick}
          >
            {/* 根据是“首页”还是“返回”渲染不同的图标 */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {leftBtnText === "首页" ? (
                <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></>
              ) : (
                <><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></>
              )}
            </svg>
            <span>{leftBtnText}</span>
          </div>
        )}

        <span className="design-intent-bar__title">设计定义</span>
        <div className="design-intent-bar__input-group">
          <input
            type="text"
            className="design-intent-bar__input"
            placeholder="请输入您的设计定义，例如：给露营时候提供光照"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="design-intent-bar__btn" onClick={handleSearch} disabled={!intent.trim()}>
            搜索
          </button>
        </div>
      </div>
    </div>
  );
}