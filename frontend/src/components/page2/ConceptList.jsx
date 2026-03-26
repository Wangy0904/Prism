import { useState } from "react";
import ConceptCard from "./Temp";
import "./ConceptList.css";

export default function ConceptList({
  concepts, // concept[]
  setConcepts, // (concepts) => void
  activeChatId, // string | null
  onSelectConcept, // (id) => void   点击卡片激活右侧对话框
  onPrefill, // (text) => void 把文字带入右侧输入框
}) {
  // 编辑状态放在这里统一管理，同一时间只能编辑一张卡片
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const handleStartEdit = (concept) => {
    setEditingId(concept.id);
    setEditingText({ ...concept.text });
  };

  const handleFinishEdit = (id) => {
    setConcepts(
      concepts.map((c) => (c.id === id ? { ...c, text: editingText } : c)),
    );
    setEditingId(null);
  };

  const handleDelete = (id) => {
    setConcepts(concepts.filter((c) => c.id !== id));
    // 如果删除的正是当前激活的，父组件会收到 onSelectConcept(null) 来清空右侧
    if (activeChatId === id) onSelectConcept(null);
  };

  if (concepts.length === 0) {
    return <div className="concept-list__empty">点击「生成想法」开始</div>;
  }

  return (
    <div className="concept-list">
      {concepts.map((concept) => {
        const isEditing = editingId === concept.id;
        return (
          <ConceptCard
            key={concept.id}
            concept={concept}
            isActive={activeChatId === concept.id}
            isEditing={editingId === concept.id}
            editingData={editingText}
            onEditingChange={setEditingText}

            onPrefill={() => {
              // 如果正在编辑这写卡片，传编辑中的临时文字；否则传原始文字
              const dataToPrefill = isEditing ? editingText : concept.text;
              onPrefill(dataToPrefill);
            }}

            onClick={() => onSelectConcept(concept.id)}
            onStartEdit={() => handleStartEdit(concept)}
            onFinishEdit={() => handleFinishEdit(concept.id)}
            
            onDelete={() => handleDelete(concept.id)}

          
        />
      );
    })}
  </div>
);
}