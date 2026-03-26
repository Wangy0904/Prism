import React from "react";
import "./AlgoModal.css"; // 引入刚才拆出来的 CSS

// 颜色映射留在这里，它是弹窗内部使用的私有逻辑
const COLOR_RGB_MAP = {
  green: "91, 139, 167",  // #5B8BA7
  blue: "62, 72, 82",     // #3E4852
  orange: "212, 165, 115",// #D4A573
  purple: "106, 195, 195" // #6AC3C3
};

export default function AlgoModal({ isOpen, onClose, data, themeColor }) {
  if (!isOpen || !data) return null;

  const rgb = COLOR_RGB_MAP[themeColor] || "150, 150, 150";

  // 根据数值计算热力图背景色 (距离越大，颜色越深)
  const getCellBg = (val) => `rgba(${rgb}, ${val})`;
  // 数值大于0.5时字体变白，否则深灰
  const getCellColor = (val) => (val > 0.5 ? "#fff" : "#333");

  return (
    <div className="algo-modal-overlay" onClick={onClose}>
      <div className="algo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="algo-modal__header">
          <div className="algo-modal__title">
            <span style={{ fontSize: "20px" }}>🧠</span> 
            算法筛选透视
          </div>
          <button className="algo-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="algo-modal__body">
          {/* 👇👇👇 新增：顶部的完整候选词展示区 👇👇👇 */}
          <div className="algo-modal__candidates-banner">
            <div className="algo-modal__candidates-title">
              💡 本次参与算法推演的 6 个初始候选想法：
            </div>
            <div className="algo-modal__candidates-list">
              {data.candidates?.map((c, i) => (
                <div key={i} className="algo-modal__candidate-item" style={{ borderColor: `rgba(${rgb}, 0.3)` }}>
                  {/* 左侧简称：带一点淡淡的主题色背景，方便和下方表格对应 */}
                  <div 
                    className="algo-modal__candidate-abbr" 
                    style={{ backgroundColor: `rgba(${rgb}, 0.1)`, color: `rgb(${rgb})` }}
                  >
                    {c.substring(0, 2)}
                  </div>
                  {/* 右侧全称 */}
                  <div className="algo-modal__candidate-full">
                    {c}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="algo-modal__content-grid">
            
            {/* 左侧：推演日志 (时间轴) */}
            <div>
              <div className="algo-section-title">算法推演路径 (Farthest First)</div>
              <div className="algo-timeline">
                {data.process_log?.map((log, idx) => (
                  <div key={idx} className="algo-timeline-item algo-timeline-item--active">
                    <style>{`
                      .algo-timeline-item:nth-child(${idx + 1})::before {
                        background: rgb(${rgb});
                      }
                    `}</style>
                    <div className="algo-timeline-step">Step {log.step}</div>
                    <div className="algo-timeline-action">{log.action}</div>
                    <div className="algo-timeline-detail">{log.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧：语义距离热力图 */}
            <div>
              <div className="algo-section-title">语义距离矩阵 (Cosine Distance)</div>
              <table className="algo-heatmap-table">
                <thead>
                  <tr>
                    <th></th>
                    {data.candidates?.map((c, i) => (
                      <th key={i}>{c.substring(0, 2)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.matrix?.map((row, i) => (
                    <tr key={i}>
                      <th>{data.candidates[i]?.substring(0, 2)}</th>
                      {row.map((val, j) => (
                        <td key={j}>
                          <div 
                            className="algo-heatmap-cell"
                            style={{ 
                              background: getCellBg(val),
                              color: getCellColor(val)
                            }}
                            title={`【${data.candidates[i]}】与【${data.candidates[j]}】的距离：${val.toFixed(3)}`}
                          >
                            {val.toFixed(2)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
                * 数值越趋近 1 (颜色越深) 代表两个词的语义差异越大。
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}