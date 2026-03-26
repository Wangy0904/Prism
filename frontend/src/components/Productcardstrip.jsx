import { useState, useRef } from "react";
import Card from "./Card";
import CardSelectPage from "./Cardselectpage";
import "./Productcardstrip.css";

// ── 新增产品弹窗 ─────────────────────────────────────────────────
function AddProductModal({ onClose, onConfirm }) {
  const [sourceProduct, setSourceProduct] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 👉 修改点 1：把原来纯本地的 URL.createObjectURL 改成 FileReader 转 Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result); // 这里拿到的是 base64 字符串
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!sourceProduct.trim() || !previewUrl) return;
    onConfirm({ sourceProduct: sourceProduct.trim(), image: previewUrl });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">新增产品</span>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="add-modal__section">
          <div className="add-modal__label">产品图片</div>
          <div
            className={`add-modal__upload-area ${previewUrl ? "add-modal__upload-area--filled" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="预览" className="add-modal__preview" />
            ) : (
              <>
                <span className="add-modal__upload-icon">+</span>
                <span className="add-modal__upload-hint">点击上传图片</span>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        <div className="add-modal__section">
          <div className="add-modal__label">源产品名称</div>
          <input
            className="add-modal__input"
            type="text"
            placeholder="请输入产品名称，如：椅子"
            value={sourceProduct}
            onChange={(e) => setSourceProduct(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          />
        </div>

        <div className="add-modal__hint">
          ✦ AI 联想物和形态相似性将在确认后自动生成
        </div>

        <div className="modal__footer">
          <button className="modal__cancel-btn" onClick={onClose}>
            取消
          </button>
          <button
            className="modal__generate-btn"
            onClick={handleConfirm}
            disabled={!sourceProduct.trim() || !previewUrl}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 主卡片区 ─────────────────────────────────────────────────────
export default function ProductCardStrip({
  cards,
  selectedId,
  assocCache,
  onSelect,
  onAddCard,
  onDeleteCard,
  onUpdateCard, // 补上了这个缺失的参数
  onGenerateAssoc,
  onRecalcDistances,
  onSelectAssoc,
  onUpdateIntent,
}) {
  const [rowIndex, setRowIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const totalCards = cards.length;
  const currentCard = cards[rowIndex] ?? null;

  const goLeft = () => {
    const newIndex = Math.max(0, rowIndex - 1);
    setRowIndex(newIndex);
    if (cards[newIndex]) onSelect(cards[newIndex].id);
  };

  const goRight = () => {
    const newIndex = Math.min(totalCards - 1, rowIndex + 1);
    setRowIndex(newIndex);
    if (cards[newIndex]) onSelect(cards[newIndex].id);
  };

  // 修复：把断开的两截函数完整地包在一起
  const handleConfirm = async ({ sourceProduct, image }) => {
    const newCard = {
      id: `user-${Date.now()}`,
      sourceProduct,
      image,
      isUserCreated: true,
    };
    onAddCard(newCard);
    setRowIndex(0);
    setModalOpen(false);

    if (onGenerateAssoc) {
      onGenerateAssoc(newCard.id, sourceProduct, newCard.image);
    }
  };

  const handleExpandSelect = (cardId) => {
    onSelect(cardId);
    setExpanded(false);
  };

  if (expanded) {
    return (
      <CardSelectPage
        cards={cards}
        selectedId={selectedId}
        onSelect={handleExpandSelect}
        onDeleteCard={onDeleteCard}
        onClose={() => setExpanded(false)}
      />
    );
  }

  return (
    <>
      <div className="strip-topbar">
        <button className="add-product-btn" onClick={() => setModalOpen(true)}>
          + 添加产品
        </button>
        <button className="expand-btn" onClick={() => setExpanded(true)}>
          展开全部 ↗
        </button>
      </div>

      <div className="strip-nav-wrapper">
        <button
          className={`strip-nav-btn strip-nav-btn--left ${rowIndex === 0 ? "strip-nav-btn--disabled" : ""}`}
          onClick={goLeft}
          disabled={rowIndex === 0}
        >
          ‹
        </button>

        <div className="strip-row">
          {currentCard ? (
            <div className="strip-row__cell">
              <Card
                card={currentCard}
                isSelected={selectedId === currentCard.id}
                onClick={() => onSelect(currentCard.id)}
                onDelete={onDeleteCard}
                assocData={assocCache ? assocCache[currentCard.id] : null}
                onGenerateAssoc={onGenerateAssoc}
                onSelectAssoc={onSelectAssoc}
                onRecalcDistances={onRecalcDistances} // 新增
                onUpdateIntent={onUpdateIntent}
              />
            </div>
          ) : null}
        </div>

        <button
          className={`strip-nav-btn strip-nav-btn--right ${rowIndex >= totalCards - 1 ? "strip-nav-btn--disabled" : ""}`}
          onClick={goRight}
          disabled={rowIndex >= totalCards - 1}
        >
          ›
        </button>
      </div>

      <div className="strip-pagination">
        {cards.map((_, i) => (
          <span
            key={i}
            className={`strip-pagination__dot ${i === rowIndex ? "strip-pagination__dot--active" : ""}`}
            onClick={() => {
              setRowIndex(i);
              if (cards[i]) onSelect(cards[i].id);
            }}
          />
        ))}
      </div>

      {modalOpen && (
        <AddProductModal
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
