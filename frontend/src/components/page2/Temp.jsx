import { useState } from "react";
import "./ConceptCard.css";

export default function ConceptCard({
  concept,
  isActive,
  isEditing,        // 接收新参数
  editingData,      // 接收新参数
  onEditingChange,  // 接收新参数
  onStartEdit,      // 接收新参数
  onFinishEdit,     // 接收新参数
  onClick,
  onDelete,
  onPrefill,
}) {
  const textData = concept.text || {};
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={`concept-card ${isActive ? "concept-card--active" : ""}`}
      onClick={onClick}
    >
      <div className="concept-card__header">
        <span className="concept-card__title">{concept.title}</span>
        <div className="concept-card__actions">
          
          {/* 👇 新增：编辑/保存按钮 */}
          {isEditing ? (
            <button
              className="concept-card__btn"
              title="保存修改"
              onClick={(e) => {
                e.stopPropagation();
                onFinishEdit();
              }}
              style={{ color: "#722ed1", fontWeight: "bold" }} // 保存按钮颜色高亮
            >
              💾 保存
            </button>
          ) : (
            <button
              className="concept-card__btn"
              title="编辑方案内容"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
            >
              ✎ 编辑
            </button>
          )}

          <button
            className="concept-card__btn"
            title={isExpanded ? "收起方案" : "展开方案"}
            onClick={(e) => {
              e.stopPropagation(); 
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? "收起" : "展开"}
          </button>

          <button
            className="concept-card__btn"
            title="将方案发送到右侧对话框，用于生成产品渲染图"
            onClick={(e) => {
              e.stopPropagation();
              onPrefill();
            }}
          >
            生成产品图
          </button>
          
          <button
            className="concept-card__btn concept-card__btn--danger"
            title="删除"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            🗑
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="concept-card__body">
          {/* 第一部分：场景回顾 */}
          <div className="concept-card__section concept-card__section--context">
            <div className="context-text-group">
              <p><strong>场景：</strong>{textData.short_scene || "--"}</p>
              <p><strong>人群：</strong>{textData.short_users || "--"}</p>
              <p><strong>痛点：</strong>{textData.short_pain_points || "--"}</p>
            </div>
            {concept.sceneImage && (
              <img src={concept.sceneImage} alt="场景图" className="context-scene-img" />
            )}
          </div>

          <div className="concept-card__divider"></div>

          {/* 第二部分：初步方案 (👇 修改这部分，加入编辑状态判断) */}
          <div className="concept-card__section concept-card__section--solution">
            {isEditing ? (
              <div className="concept-card__edit-form">
                <input
                  className="edit-input edit-input--title"
                  value={editingData?.summary || ""}
                  onChange={(e) => onEditingChange({ ...editingData, summary: e.target.value })}
                  placeholder="一句话概念总结"
                  onClick={(e) => e.stopPropagation()} // 防止点击输入框触发卡片选中
                />
                <div className="edit-field">
                  <label>功能：</label>
                  <textarea
                    className="edit-textarea"
                    value={editingData?.functions || ""}
                    onChange={(e) => onEditingChange({ ...editingData, functions: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="edit-field">
                  <label>结构：</label>
                  <textarea
                    className="edit-textarea"
                    value={editingData?.form_structure || ""}
                    onChange={(e) => onEditingChange({ ...editingData, form_structure: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="edit-field">
                  <label>反馈：</label>
                  <textarea
                    className="edit-textarea"
                    value={editingData?.feedback || ""}
                    onChange={(e) => onEditingChange({ ...editingData, feedback: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            ) : (
              <>
                <h4 className="solution-summary">{textData.summary}</h4>
                {textData.functions && <p><strong>功能：</strong>{textData.functions}</p>}
                {textData.form_structure && <p><strong>结构：</strong>{textData.form_structure}</p>}
                {textData.feedback && <p><strong>反馈：</strong>{textData.feedback}</p>}
              </>
            )}
          </div>

          {/* 第三部分：静态迁移属性标签 */}
          {concept.tags && (
            <div className="concept-card__section concept-card__section--tags">
              {concept.tags.source && (
                <span className="concept-tag concept-tag--source">源：{concept.tags.source}</span>
              )}
              {concept.tags.association && (
                <span className="concept-tag concept-tag--assoc">联：{concept.tags.association}</span>
              )}
              {concept.tags.migrated &&
                concept.tags.migrated.map((tag, idx) => (
                  <span key={idx} className="concept-tag concept-tag--migrated">{tag}</span>
                ))}
            </div>
          )}

          {/* 第四部分：产品渲染图画廊 */}
          {concept.productImages && concept.productImages.length > 0 && (
            <>
              <div className="concept-card__divider"></div>
              <div className="concept-card__section concept-card__section--gallery">
                <span className="gallery-title">产品渲染图：</span>
                <div className="gallery-grid">
                  {concept.productImages.map((imgUrl, idx) => (
                    <img key={idx} src={imgUrl} alt={`产品图 ${idx + 1}`} className="product-gen-img" />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}