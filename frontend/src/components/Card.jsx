import { useState, useRef, useEffect } from "react";
import "./Card.css";

// 语义分析弹窗
function SemanticModal({ sourceProduct, assocList, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="semantic-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">语义距离分析 · {sourceProduct}</span>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="semantic-modal__body">
          {assocList.length === 0 ? (
            <p className="semantic-modal__empty">暂无数据，请先生成联想物</p>
          ) : (
            assocList.map((assoc, i) => (
              <div key={i} className="semantic-modal__item">
                <div className="semantic-modal__item-header">
                  <span className="semantic-modal__name">{assoc.name}</span>
                  <span className="semantic-modal__distance">
                    语义距离：
                    {assoc.distance != null ? assoc.distance.toFixed(4) : "—"}
                  </span>
                </div>
                <div className="semantic-modal__dims">
                  <div className="semantic-modal__dim">
                    <span className="semantic-modal__dim-label">界面层</span>
                    <span>{assoc.interface ?? "—"}</span>
                  </div>
                  <div className="semantic-modal__dim">
                    <span className="semantic-modal__dim-label">定义层</span>
                    <span>{assoc.definition ?? "—"}</span>
                  </div>
                  <div className="semantic-modal__dim">
                    <span className="semantic-modal__dim-label">流转层</span>
                    <span>{assoc.circulation ?? "—"}</span>
                  </div>
                  <div className="semantic-modal__dim">
                    <span className="semantic-modal__dim-label">环境层</span>
                    <span>{assoc.environment ?? "—"}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function Card({
  card,
  isSelected,
  onClick,
  onDelete,
  assocData, // { list: [...], selectedIndex: 0 } | null
  onGenerateAssoc, // (cardId, sourceProduct) => void
  onSelectAssoc, // (cardId, index) => void
  onRecalcDistances, // 新增
  onUpdateIntent,
  loading = false,
  compact = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);  // 加这行
  const currentAssoc = assocData?.list[assocData.selectedIndex] ?? null;


  // 👇 新增：用于控制“设计定义”编辑状态的逻辑
  const [isEditingIntent, setIsEditingIntent] = useState(false);
  const [intentValue, setIntentValue] = useState(card.intent || "");
  const inputRef = useRef(null);

  // 当进入编辑模式时，自动聚焦输入框
  useEffect(() => {
    if (isEditingIntent && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingIntent]);

  const handleIntentBlur = () => {
    setIsEditingIntent(false);
    if (onUpdateIntent && intentValue !== card.intent) {
      onUpdateIntent(card.id, intentValue);
    }
  };

  const handleIntentKeyDown = (e) => {
    if (e.key === "Enter") {
      inputRef.current?.blur(); // 敲回车直接触发 blur 保存
    }
  };
  

  return (
    <div
      className={`product-card ${isSelected ? "product-card--selected" : ""} ${compact ? "product-card--compact" : ""}`}
      onClick={onClick}
    >
      {card.isUserCreated && (
        <button
          className="product-card__delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
        >
          ×
        </button>
      )}

      <div className="product-card__image-wrap">
        <img
          src={card.image}
          alt={card.sourceProduct}
          className="product-card__image"
        />
      </div>

      <div className="product-card__info">
        {/* 源产品名称 + 语义分析按钮 */}
        <div className="product-card__source-row">
          <div className="product-card__source-name">{card.sourceProduct}</div>
          <button
            className="product-card__semantic-btn"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(true);
            }}
          >
            语义分析
          </button>
        </div>

        {/* 👇 替换成支持编辑的 Wrapper */}
        <div className="product-card__intent-wrapper">
          {isEditingIntent ? (
            <input
              ref={inputRef}
              className="product-card__intent-input"
              value={intentValue}
              onChange={(e) => setIntentValue(e.target.value)}
              onBlur={handleIntentBlur}
              onKeyDown={handleIntentKeyDown}
              placeholder="输入设计定义或场景..."
              onClick={(e) => e.stopPropagation()} // 防止触发选中卡片
            />
          ) : (
            <div
              className={`product-card__intent-box ${!card.intent ? "product-card__intent-box--empty" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingIntent(true);
                setIntentValue(card.intent || "");
              }}
            >
              <span className="product-card__intent-icon">🎯</span>
              <span className="product-card__intent-text">
                {card.intent || "添加设计定义..."}
              </span>
              <span className="product-card__intent-edit-icon">✎</span>
            </div>
          )}
        </div>



        <div className="product-card__assoc-section">
          <span className="product-card__label">AI 联想物</span>
          {loading ? (
            <span className="product-card__loading">生成中...</span>
          ) : assocData?.list.length > 0 ? (
            <div className="product-card__assoc-tags">
              {assocData.list.map((assoc, i) => (
                <button
                  key={i}
                  className={`product-card__assoc-tag ${i === assocData.selectedIndex ? "product-card__assoc-tag--active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAssoc(card.id, i);
                  }}
                >
                  {assoc.name}
                  <span className="product-card__distance">
                    {assoc.distance != null ? assoc.distance.toFixed(2) : "—"}
                  </span>
                </button>
              ))}
              <button
                className="product-card__recalc-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRecalcDistances(card.id);
                }}
              >
                ↻ 重算距离
              </button>
            </div>
          ) : (
            <span className="product-card__placeholder">点击生成联想物</span>
          )}
        </div>

        <div className="product-card__similarity-row">
          <span className="product-card__label">形态相似性</span>
          <span className="product-card__similarity">
            {currentAssoc?.shapeSimilarity ?? "—"}
          </span>
        </div>

        <button
          className="product-card__regen-btn"
          onClick={(e) => {
            e.stopPropagation();
            onGenerateAssoc(card.id, card.sourceProduct, card.image);
          }}
          disabled={loading}
        >
           {assocData?.list.length > 0 ? "重新生成" : "生成联想物"}
        </button>
      </div>

      {modalOpen && (
        <SemanticModal
          sourceProduct={card.sourceProduct}
          assocList={assocData?.list ?? []}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
