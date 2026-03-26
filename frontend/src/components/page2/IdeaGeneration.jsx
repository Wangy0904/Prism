import { useState, useEffect } from "react";
import ChatPanel from "./chatpanal"; // 注意你的文件名大小写
import ConceptList from "./ConceptList";
import "./IdeaGenerationPage.css";

import { saveSessionAndExit } from "../../track"; // 根据你的路径调整
import { getTesterId, resetTester, trackEvent } from "../../track"

export default function IdeaGenerationPage({
  onBack,
  sourceItems,
  aiItems,
  sourceProduct,
  association,
  concepts,
  setConcepts,
}) {
  // ── 状态管理 ───────────────────────────────────────────────

  // 1. 阶段一：场景与人群上下文状态
  const [contextData, setContextData] = useState({
    scene: "",
    users: "",
    pain_points: "",
  });
  const [sceneImage, setSceneImage] = useState(null);

  // 2. 加载状态
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);

  // 3. 右侧对话状态
  const [chatHistory, setChatHistory] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [prefillText, setPrefillText] = useState(null);

  const [editableAttrs, setEditableAttrs] = useState(aiItems.join("、"));

  useEffect(() => {
    if (aiItems && aiItems.length > 0) {
      setEditableAttrs(aiItems.join("、"));
    }
  }, [aiItems]);

  const getSelectedAttrsArray = () => {
    return editableAttrs
      .split(/、|,|，/)
      .map(item => item.trim())
      .filter(item => item !== "");
  };

  const selectedAttrs = [...aiItems];

  // ── 新增：进入页面时，检查有没有从首页导入的存档需要恢复 ──────────────────
  useEffect(() => {
    const savedIdeaData = localStorage.getItem('imported_idea_data');
    if (savedIdeaData) {
      try {
        const parsedData = JSON.parse(savedIdeaData);
        if (parsedData.selected_attributes) setEditableAttrs(parsedData.selected_attributes.join("、"));
        if (parsedData.context_data) setContextData(parsedData.context_data);
        if (parsedData.generated_concepts) setConcepts(parsedData.generated_concepts);
        if (parsedData.chat_history) setChatHistory(parsedData.chat_history);
      } catch (e) {
        console.error("恢复生成页数据失败", e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅挂载时执行一次

  // ── 核心逻辑：阶段一（生成场景与痛点，并连带生图） ─────────────

  const generateContextAndImage = async () => {
    const finalAttrs = getSelectedAttrsArray();
    if (!sourceProduct || finalAttrs.length === 0) {
      alert("请确保【源产品】和【迁移属性】不为空！");
      return;
    }

    trackEvent('click_generate_context', { attributes: finalAttrs.join('、') });


    setIsGeneratingContext(true);
    setContextData({ scene: "", users: "", pain_points: "" });
    setSceneImage(null);

    try {
      // 1. 请求场景和人群文本
      const contextRes = await fetch(
        "http://localhost:5000/api/generate-context",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_product: sourceProduct,
            selected_attrs: getSelectedAttrsArray(),
          }),
        },
      );
      const contextJson = await contextRes.json();

      if (!contextJson.success) throw new Error("场景生成失败");

      const newContext = contextJson.data;
      setContextData(newContext);
      setIsGeneratingContext(false);

      // 2. 紧接着用生成的场景文本去请求图片
      if (newContext.scene) {
        setIsGeneratingImage(true);

        // --- 核心修复位置：先定义变量，再传给 fetch ---
        const refinedPrompt = `Professional photography of an empty environment, ${newContext.scene}, no people, no products, no furniture, cinematic lighting, material study, 8k resolution`;

        const imgRes = await fetch("http://localhost:5000/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: refinedPrompt }), // 这样才合法
        });

        const imgJson = await imgRes.json();
        if (imgJson.success) {
          setSceneImage(imgJson.image_url);
        }
      }
    } catch (e) {
      console.error("生成阶段一失败:", e);
    } finally {
      setIsGeneratingContext(false);
      setIsGeneratingImage(false);
    }
  };

  // 页面首次加载时，自动触发一次场景生成
  useEffect(() => {
    //generateContextAndImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 新增：单独重新生成场景图片 ──────────────────────────────
  const generateSceneImageOnly = async () => {
    if (!contextData.scene) return;
    setIsGeneratingImage(true);
    setSceneImage(null);

    // 同样在这里定义一次
    const refinedPrompt = `Pure environment photography, ${contextData.scene}, empty space, no people, no products, no furniture, cinematic lighting, material study, 8k resolution`;

    try {
      const imgRes = await fetch("http://localhost:5000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: refinedPrompt }), // 使用包装后的变量
      });
      const imgJson = await imgRes.json();
      if (imgJson.success) {
        setSceneImage(imgJson.image_url);
      } else {
        console.error("单独生图失败:", imgJson.error);
      }
    } catch (e) {
      console.error("单独生图出错:", e);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // ── 核心逻辑：阶段二（生成具体方案，放入中间列） ─────────────
  const handleGenerateSolution = async () => {
    trackEvent('click_generate_solution');
    setIsGeneratingSolution(true);
    try {
      const res = await fetch("http://localhost:5000/api/generate-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_product: sourceProduct,
          selected_attrs: getSelectedAttrsArray(),
          scene: contextData.scene,
          users: contextData.users,
          pain_points: contextData.pain_points,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // 利用 Set 对迁移属性进行严格去重，解决标签重复的问题
      const uniqueMigratedAttrs = Array.from(new Set(getSelectedAttrsArray())); // 👈 替换这里

      const newConcept = {
        id: String(Date.now()),
        title: `初步方案 ${concepts.length + 1}`,
        text: json.data, // 现在包含了 short_scene 等精简字段和 summary 等方案字段
        sceneImage: sceneImage, // 把左侧渲染好的场景图直接拷过来
        productImages: [], // 👈 改为数组：用于存放右侧对话框生成的多次产品效果图
        tags: {
          source: sourceProduct,
          association: association,
          migrated: uniqueMigratedAttrs,
        },
      };

      setConcepts([newConcept, ...concepts]);
      setActiveChatId(newConcept.id);
    } catch (e) {
      console.error("生成方案失败", e);
    } finally {
      setIsGeneratingSolution(false);
    }
  };

  // ── 右侧 ChatPanel 的发送逻辑 ─────────────────────────────────
  const handleSend = async (conceptId, prompt) => {
    trackEvent('send_chat_message', { 
      conceptId: conceptId, 
      promptLength: prompt.length, // 记录字数
      promptContent: prompt        // 直接记录他说的原话
    });

    
    setChatHistory((prev) => ({
      ...prev,
      [conceptId]: [
        ...(prev[conceptId] ?? []),
        { role: "user", type: "text", content: prompt },
      ],
    }));

    try {
      const response = await fetch("http://localhost:5000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const imageUrl = result.image_url;
      setChatHistory((prev) => ({
        ...prev,
        [conceptId]: [
          ...(prev[conceptId] ?? []),
          { role: "assistant", type: "image", content: imageUrl },
        ],
      }));

      // 👈 把新生成的图片**追加**到卡片的 productImages 数组中
      setConcepts((prev) =>
        prev.map((c) => {
          if (c.id === conceptId) {
            return {
              ...c,
              productImages: [...(c.productImages || []), imageUrl],
            };
          }
          return c;
        }),
      );
    } catch (error) {
      console.error("生图流程出错:", error);
    }
  };

  const activeConcept = concepts.find((c) => c.id === activeChatId) ?? null;


  return (
    <div className="idea-page">
      <div className="idea-page__header">
        <button className="back-btn" onClick={onBack}>
          ← 返回重选
        </button>

        {/* 👇 新增的交卷按钮，放在右上角 */}
        <button 
          onClick={async () => {
            // 1. 呼叫 track.js 里的保存函数
            const success = await saveSessionAndExit({
              source_product: sourceProduct,
              selected_attributes: getSelectedAttrsArray(),
              context_data: contextData,
              generated_concepts: concepts,
              chat_history: chatHistory
            });
            
            // 2. 如果保存成功，自动退回首页，并刷新页面迎接下一个人
            if (success) {
              onBack(); 
              window.location.reload(); 
            }
          }}
          style={{ padding: '8px 16px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}
        >
          💾 完成测试并交卷
        </button>


      </div>

      <div className="idea-page__content">
        {/* ── 1. 左侧：迁移与映射 (场景定义) ── */}
        <div className="idea-panel idea-panel--left">
          <h3 className="panel-title">迁移与映射</h3>

          {/* 1. 把源产品和迁移属性包在同一个 context-block 里，共享左侧竖线 */}
          <div className="context-block">
            {/* 源产品区块（注意把 sourceProduct 换成你实际存露营灯的变量名） */}
            <div className="context-item">
              <h4>源产品</h4>
              <p className="static-text">{sourceProduct}</p>
            </div>

            {/* 迁移属性区块 */}
            <div className="context-item">
              <h4>迁移属性</h4>
              <div className="static-tags-col">
                <textarea
                  className="editable-attrs-input"
                  value={editableAttrs}
                  onChange={(e) => setEditableAttrs(e.target.value)}
                  placeholder="请输入迁移属性，用顿号（、）分隔"
                  rows={3}
                  style={{
                    width: "100%",
                    minHeight: "60px",
                    padding: "10px",
                    border: "1px solid #d9d9d9",
                    borderRadius: "6px",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    resize: "vertical",
                    backgroundColor: "#f9fafb",
                    color: "#333",
                    fontFamily: "inherit",
                    outline: "none"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4a90e2")}
                  onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
                />
              </div>
            </div>
          </div>

          {/* 2. 按钮被挪到了外面，独立出来，不再受竖线包裹 */}
          <button
            className="btn-confirm-context"
            onClick={generateContextAndImage}
            disabled={isGeneratingContext || isGeneratingImage}
          >
            {isGeneratingContext
              ? "正在分析场景与人群..."
              : isGeneratingImage
                ? "正在渲染场景图..."
                : "共情生成 ↓"}
          </button>

          <div className="context-block">
            <h4>使用场景</h4>
            {isGeneratingContext ? (
              <p className="loading-text">正在推导场景...</p>
            ) : (
              <p className="static-text">
                {contextData.scene || "暂无场景描述"}
              </p>
            )}

            {/* 👇 新增的单独生图按钮：只有当场景文字生成完毕后才显示 */}
            {contextData.scene && !isGeneratingContext && (
              <button
                className="btn-secondary btn-secondary--small"
                onClick={generateSceneImageOnly}
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? "正在渲染场景图..." : "生成场景图 ⟳"}
              </button>
            )}

            {/* 场景效果图 */}
            <div className="scene-image-container">
              {isGeneratingImage ? (
                <div className="image-loading-placeholder">
                  正在渲染场景图...
                </div>
              ) : sceneImage ? (
                <img src={sceneImage} alt="场景图" className="scene-image" />
              ) : null}
            </div>
          </div>

          <div className="context-block">
            <h4>目标人群与痛点</h4>
            {isGeneratingContext ? (
              <p className="loading-text">正在分析人群...</p>
            ) : (
              <>
                <p className="static-text">
                  <strong>人群：</strong>
                  {contextData.users || "--"}
                </p>
                <p className="static-text">
                  <strong>痛点：</strong>
                  {contextData.pain_points || "--"}
                </p>
              </>
            )}
          </div>

          <div className="panel-actions">
            <button
              className="btn-secondary"
              onClick={generateContextAndImage}
              disabled={isGeneratingContext || isGeneratingImage}
            >
              重新推导场景
            </button>
            <button
              className="btn-primary"
              onClick={handleGenerateSolution}
              disabled={isGeneratingSolution || !contextData.scene}
            >
              {isGeneratingSolution ? "正在生成方案..." : "生成初步方案 →"}
            </button>
          </div>
        </div>

        {/* ── 2. 中间：合理化过程 (方案列表) ── */}
        <div className="idea-panel idea-panel--middle">
          <h3 className="panel-title">初步产品方案</h3>
          <ConceptList
            concepts={concepts}
            setConcepts={setConcepts}
            activeChatId={activeChatId}
            onSelectConcept={(id) => setActiveChatId(id)}
            onPrefill={(text) => {
              if (typeof text === "object" && text !== null) {
                const combined = `【功能】${text.functions || ""}\n【结构】${text.form_structure || ""}\n【反馈】${text.feedback || ""}`;
                setPrefillText(combined);
              } else {
                setPrefillText(text);
              }
            }}
          />
        </div>

        {/* ── 3. 右侧：细节探讨 (Chat 生图) ── */}
        <div className="idea-panel idea-panel--right">
          <ChatPanel
            activeConcept={activeConcept}
            chatHistory={chatHistory}
            onSend={handleSend}
            prefillText={prefillText}
            onClearPrefill={() => setPrefillText(null)}
          />
        </div>
      </div>
    </div>
  );
}
