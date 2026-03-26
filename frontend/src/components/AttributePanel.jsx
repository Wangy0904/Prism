import { useState } from "react"; // 必须引入状态管理
import "./AttributePanel.css";
import AlgoModal from "./AlgoModal";

const ATTR_COLORS = ["green", "blue", "orange", "purple"];

const DEFAULT_AI_ATTRS = [
  { label: "功能属性" },
  { label: "交互属性" },
  { label: "感知属性" },
  { label: "情感属性" },
];

function AttrTag({ value, color, selected, onClick }) {
  return (
    <span
      className={`attr-tag attr-tag--${color} ${selected ? "attr-tag--selected" : ""}`}
      onClick={onClick}
    >
      {value}
    </span>
  );
}

// 增加 attrIndex 和 onRegenerate 参数
function AttrGroup({ attr, color, selectedValues, onToggleValue, isLoading, attrIndex, onRegenerate, onOpenAlgo }) {
  const hasTags = attr.values && attr.values.length > 0;
  const hasAlgoData = !!attr.algorithm_data;

  return (
    <div className={`attr-group attr-group--${color}`}>
      {/* 新增了 header 容器，用来左右排布标题和按钮 */}
      <div className="attr-group__header">
        <div className={`attr-group__label attr-group__label--${color}`}>
          {attr.label}
        </div>
        
        {/* 只有在已有标签，且父组件传了 onRegenerate 方法时，才显示换一批按钮 */}
        {hasTags && onRegenerate && (
          <button 
            className="attr-group__refresh-btn"
            onClick={() => onRegenerate(attrIndex)}
            disabled={isLoading}
            title="重新生成该维度的属性"
          >
            重新生成
          </button>
        )}
      </div>

      <div className="attr-group__tags">
        {isLoading ? (
          <>
            <span className={`attr-tag attr-tag--${color} attr-tag--skeleton`} />
            <span className={`attr-tag attr-tag--${color} attr-tag--skeleton attr-tag--skeleton-sm`} />
          </>
        ) : hasTags ? (
          attr.values.map((val, i) => (
            <AttrTag
              key={i}
              value={val}
              color={color}
              selected={selectedValues?.includes(val)}
              onClick={() => onToggleValue(val)}
            />
          ))
        ) : (
          <span className={`attr-tag attr-tag--${color} attr-tag--empty`}>—</span>
        )}
      </div>

      {/* 👇👇👇 就是加在这里！在 tags 闭合标签的下面，大盒子闭合标签的上面 👇👇👇 */}
      {hasAlgoData && !isLoading && (
        <div className="attr-group__footer">
          <button 
            className={`attr-group__algo-btn attr-group__algo-btn--${color}`}
            onClick={() => onOpenAlgo(attr.algorithm_data, color)}
            title="查看算法是如何筛选这些词的"
          >
            算法筛选透视
          </button>
        </div>
      )}
      {/* 👆👆👆 ========================================================== 👆👆👆 */}

    </div>
  );
}

export default function AttributePanel({
  selectedCardId,
  cache,
  onGenerate,
  onToggleAI,
  selectedAI,
  isLoading,
  // 👇 新增这个 prop，用来通知父组件局部刷新
  onRegenerateSingle 
}) {
  // 1. 装上开关（状态）
  const [modalData, setModalData] = useState(null);
  const [modalColor, setModalColor] = useState("green");
  
  const data = cache[selectedCardId] ?? null;

  const displayAttrs = DEFAULT_AI_ATTRS.map((def, i) => {
    const generated = data?.aiAttrs && data.aiAttrs[i];
    return generated ? generated : { label: def.label, values: [] };
  });

  // 开关的触发方法
  const handleOpenAlgo = (algoData, themeColor) => {
    setModalData(algoData);
    setModalColor(themeColor);
  };

  return (
    <div className="attribute-panel">
      <div className="attribute-panel__header">
        <span className="attribute-panel__title">AI 联想物属性</span>
        <button
          className={`attribute-panel__generate-btn ${isLoading ? "attribute-panel__generate-btn--loading" : ""}`}
          onClick={() => onGenerate(selectedCardId)}
          disabled={isLoading}
        >
          {isLoading ? "生成中..." : "生成描述"}
        </button>
      </div>

      {/* ================= 2. 四个属性卡片列表 ================= */}
      <div className="attribute-panel__list">
        {displayAttrs.map((attr, i) => {
          const color = ATTR_COLORS[i % ATTR_COLORS.length];
          return (
            <AttrGroup
              key={i}
              attrIndex={i} // 传入当前卡片的索引 (0, 1, 2, 3)
              attr={attr}
              color={color}
              selectedValues={selectedAI}
              onToggleValue={onToggleAI}
              isLoading={isLoading}
              onRegenerate={onRegenerateSingle} // 传入局部刷新方法

              onOpenAlgo={handleOpenAlgo}
            />
          );
        })}
      </div>

      {/*  3. 弹窗（电视机）挂载在这里！放在列表的下面 */}
      <AlgoModal 
        isOpen={!!modalData} 
        onClose={() => setModalData(null)} 
        data={modalData}
        themeColor={modalColor}
      />
    
      {/* ================= 4. 空状态提示 ================= */}
      {!selectedCardId && (
        <div className="attribute-panel__empty">
          选中一个产品，点击「生成描述」开始生成属性
        </div>
      )}
    </div>
  );
}