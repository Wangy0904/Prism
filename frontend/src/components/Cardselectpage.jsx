// CardSelectPage.jsx — 展开后的全屏卡片选择页
import Card from "./Card";
import "./Cardselectpage.css";

const COLS = 4; // 全屏模式每行4张

export default function CardSelectPage({ cards, selectedId, onSelect, onDeleteCard, onClose }) {
  return (
    <div className="select-page">
      {/* 顶栏 */}
      <div className="select-page__header">
        <span className="select-page__title">选择产品 · 联想物组</span>
        <button className="select-page__close-btn" onClick={onClose}>
          收起 ↙
        </button>
      </div>

      {/* 卡片网格 */}
      <div className="select-page__grid">
        {cards.map((card) => (
          <div key={card.id} className="select-page__cell">
            <Card
              card={card}
              isSelected={selectedId === card.id}
              onClick={() => onSelect(card.id)}
              onDelete={onDeleteCard}
              compact
            />
          </div>
        ))}
      </div>

      {/* 底部确认 */}
      <div className="select-page__footer">
        <span className="select-page__hint">
          点击卡片选中后，点击「收起」返回
        </span>
        <button className="select-page__confirm-btn" onClick={onClose}>
          确认选择并收起
        </button>
      </div>
    </div>
  );
}