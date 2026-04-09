import { useState, useEffect, useRef } from "react";
import { MOCK_CARDS } from "../data/mockData";
import ProductCardStrip from "./Productcardstrip";
import AttributePanel from "./AttributePanel";
// 1. 移除了 MigrationZone 的引入
import DesignIntentBar from "./DesignIntentBar";
import { getTesterId, resetTester, trackEvent } from "../track";

import "./Workspace.css";

export default function Workspace({ onNext, initialAiItems = [], initialProduct, onSearchStart, onBackToSearch }) {
  const hasInitialized = useRef(false);

  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem("cards");
    return saved ? JSON.parse(saved) : MOCK_CARDS;
  });

  const [assocCache, setAssocCache] = useState(() => {
    const saved = localStorage.getItem("assocCache");
    return saved ? JSON.parse(saved) : {};
  });

  const [attrCache, setAttrCache] = useState(() => {
    const saved = localStorage.getItem("attrCache");
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedCardId, setSelectedCardId] = useState(MOCK_CARDS[0]?.id);
  const [selectedAI, setSelectedAI] = useState(initialAiItems);
  const [attrLoadingId, setAttrLoadingId] = useState(null);

  useEffect(() => { localStorage.setItem("cards", JSON.stringify(cards)); }, [cards]);
  useEffect(() => { localStorage.setItem("assocCache", JSON.stringify(assocCache)); }, [assocCache]);
  useEffect(() => { localStorage.setItem("attrCache", JSON.stringify(attrCache)); }, [attrCache]);

  const handleSelectCard = (cardId) => {
    setSelectedCardId(cardId);
    setSelectedAI([]);
  };

  const currentAssocData = assocCache[selectedCardId] ?? null;
  const currentAssocName = currentAssocData
    ? currentAssocData.list[currentAssocData.selectedIndex]?.name
    : null;

  const currentAttrData = currentAssocName
    ? attrCache[selectedCardId]?.[currentAssocName] ?? null
    : null;

  const handleGenerateAssoc = async (cardId, sourceProduct, imageStr) => {
    trackEvent('click_generate_association', { sourceProduct: sourceProduct });
    try {
      let finalImageData = imageStr;

      // 如果传进来的图片不是以 data:image 开头（说明是静态路径或普通URL）
      if (imageStr && !imageStr.startsWith("data:image")) {
        console.log("检测到静态图片路径，正在转为 Base64...");
        try {
          const response = await fetch(imageStr); // 抓取这张本地静态图
          const blob = await response.blob();     // 转成二进制
          
          // 利用 FileReader 转成 Base64
          finalImageData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.warn("图片转 Base64 失败，可能是跨域或路径不对", err);
          // 如果转换失败，就直接传原来的，让后端走纯文本兜底
        }
      }

      // 现在可以放心地发给后端了！
      const res = await fetch("http://localhost:5000/api/generate-association", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          source_product: sourceProduct, 
          image_data: finalImageData, // 👈 传转换后真正的 Base64 数据
          top_k: 4 
        }),
      });
      
      const json = await res.json();
      if (json.success) {
        setAssocCache((prev) => ({
          ...prev,
          [cardId]: { list: json.data, selectedIndex: 0 },
        }));
        setAttrCache((prev) => {
          const next = { ...prev };
          delete next[cardId];
          return next;
        });
      }
    } catch (e) {
      console.error("生成联想物失败", e);
    }
  };

  const handleRecalcDistances = async (cardId) => {
    const card = cards.find((c) => c.id === cardId);
    const assocData = assocCache[cardId];
    if (!card || !assocData) return;

    const candidateNames = assocData.list.map((a) => a.name);
    try {
      const res = await fetch("http://localhost:5000/api/recalc-distances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_product: card.sourceProduct,
          candidate_names: candidateNames,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const newList = assocData.list.map((a) => {
          const updated = json.data.find((d) => d.name === a.name);
          return updated ? { ...a, distance: updated.distance } : a;
        });
        setAssocCache((prev) => ({
          ...prev,
          [cardId]: { ...prev[cardId], list: newList },
        }));
      }
    } catch (e) {
      console.error("重新计算语义距离失败", e);
    }
  };

  const handleSelectAssoc = (cardId, index) => {
    setAssocCache((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], selectedIndex: index },
    }));
    setSelectedAI([]);
  };

  const handleGenerate = async (cardId) => {
    const assocData = assocCache[cardId];
    if (!assocData) { alert("请先生成AI联想物"); return; }
    
    const assocName = assocData.list[assocData.selectedIndex]?.name;
    if (!assocName) return;

    const card = cards.find((c) => c.id === cardId);
    setAttrLoadingId(cardId);
    try {
      const res = await fetch("http://localhost:5000/api/generate-attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_product: card.sourceProduct,
          association: assocName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAttrCache((prev) => ({
          ...prev,
          [cardId]: {
            ...prev[cardId],
            [assocName]: json.data,
          },
        }));
      }
    } catch (e) {
      console.error("生成属性失败", e);
    } finally {
      setAttrLoadingId(null);
    }
  };

  // ── 新增：单独重新生成某一个维度的属性 ──
  const handleRegenerateSingle = async (attrIndex) => {
    trackEvent('click_regenerate_attribute', { attributeIndex: attrIndex });
    const assocData = assocCache[selectedCardId];
    if (!assocData) return;
    
    const assocName = assocData.list[assocData.selectedIndex]?.name;
    if (!assocName) return;

    const card = cards.find((c) => c.id === selectedCardId);

    trackEvent('click_generate_attributes', { 
      sourceProduct: card.sourceProduct, 
      association: assocName 
    });
    // 根据传过来的 index (0,1,2,3) 决定请求哪个后端的接口
    const endpoints = [
      "/api/regenerate-function",
      "/api/regenerate-interaction",
      "/api/regenerate-perception",
      "/api/regenerate-emotion"
    ];
    const endpoint = endpoints[attrIndex];

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_product: card.sourceProduct,
          association: assocName,
        }),
      });
      const json = await res.json();
      
      if (json.success) {
        // 拿到新数据后，只替换 cache 里的那一项
        setAttrCache((prev) => {
          const next = { ...prev };
          const cardData = { ...next[selectedCardId] };
          
          // 获取旧的数组并克隆
          const newAiAttrs = [...cardData[assocName].aiAttrs];
          // 将新生成的数据替换到对应的位置
          newAiAttrs[attrIndex] = json.data;
          
          // 写回缓存
          cardData[assocName] = {
            ...cardData[assocName],
            aiAttrs: newAiAttrs
          };
          next[selectedCardId] = cardData;
          return next;
        });
      }
    } catch (e) {
      console.error("重新生成属性失败", e);
    }
  };

  const toggleValue = (setter, value) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const removeAI = (value) => setSelectedAI((prev) => prev.filter((v) => v !== value));

  const handleAddCard = (newCard) => {
    setCards((prev) => [newCard, ...prev]);
    setSelectedCardId(newCard.id);
  };

  const handleUpdateIntent = (cardId, newIntent) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, intent: newIntent } : c))
    );
  };

  const handleDeleteCard = (cardId) => {
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== cardId);
      if (selectedCardId === cardId && next.length > 0) {
        setSelectedCardId(next[0].id);
      }
      return next;
    });
    setAssocCache((prev) => { const n = { ...prev }; delete n[cardId]; return n; });
    setAttrCache((prev) => { const n = { ...prev }; delete n[cardId]; return n; });
  };



  // 核心逻辑：处理用户点击 AI 推荐的产品
 const handleApplyRecommendedProduct = (productName, intent, customImgUrl) => {
    if (customImgUrl) {
      const existingCard = cards.find((c) => c.image === customImgUrl);
      if (existingCard) {
        // 找到了相同的图片，直接选中这张旧卡片，立刻停止（return），绝不新建！
        setSelectedCardId(existingCard.id);
        return;
      }
    }

    // 1. 自动重命名逻辑：检查是否重名，如果重名就加后缀 1, 2, 3...
    let finalProductName = productName;
    let counter = 1;
    
    // 只要当前的 cards 列表里已经有这个名字了，就给它加上编号继续试
    while (cards.some((c) => c.sourceProduct === finalProductName)) {
      finalProductName = `${productName} ${counter}`;
      counter++;
    }

    // 2. 自动新建一张独立的卡片（每次点击必定新建）
    const newCardId = `user-${Date.now()}`;
    const newCard = {
      id: newCardId,
      sourceProduct: finalProductName, // 👇 这里用的是刚才算出来的带编号的新名字！
      intent: intent,
      // 如果有传过来的 customImgUrl 就用真实的图，否则用占位图
      image: customImgUrl || `https://placehold.co/400x300/E7F1F6/5B8BA7?text=${encodeURIComponent(finalProductName)}`,
      isUserCreated: true,
    };
      
    // 放入列表并选中
    handleAddCard(newCard); 
      
    // 3. 拿着带有编号的新名字，去请求 AI 联想物
    handleGenerateAssoc(newCardId, finalProductName, newCard.image);
  };

  // 👇 2. 将新增的 useEffect 放在这里（紧接着 handleApplyRecommendedProduct 的下面）
  useEffect(() => {
    if (initialProduct && initialProduct.productName && !hasInitialized.current) {
      console.log("【工作台】我接收到了新产品，它的链接是：", initialProduct.imgUrl);

      handleApplyRecommendedProduct(
        initialProduct.productName, 
        initialProduct.intent, 
        initialProduct.imgUrl // 这是我们刚才在 App.js 里存进来的
        
      );
      hasInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只有刚进页面时执行一次

  

  // 2. 新增：处理生成想法点击事件，提取原本在 MigrationZone 里的逻辑
  const handleGenerateIdea = () => {
    if (selectedAI.length === 0) return; // 保底防御
    const card = cards.find((c) => c.id === selectedCardId);
    onNext(selectedAI, selectedAI, card?.sourceProduct ?? "", currentAssocName ?? "");
  };

  return (
    <div className="workspace">
      <div className="workspace__top-section">
        {/* 2. 将设计定义栏放在最顶部 */}
        <DesignIntentBar 
          initialIntent={initialProduct?.intent || ""}
          onSearchStart={onSearchStart}
          leftBtnText="返回"
          onLeftBtnClick={onBackToSearch} // 点击返回，保留100张图的状态
        />

        <ProductCardStrip
          cards={cards}
          selectedId={selectedCardId}
          assocCache={assocCache}
          onSelect={handleSelectCard}
          onAddCard={handleAddCard}
          onDeleteCard={handleDeleteCard}
          onGenerateAssoc={handleGenerateAssoc}
          onSelectAssoc={handleSelectAssoc}
          onRecalcDistances={handleRecalcDistances}
          onUpdateIntent={handleUpdateIntent}
        />
      </div>

      <div className="workspace__middle-section">
        <AttributePanel
          selectedCardId={selectedCardId}
          cache={currentAttrData ? { [selectedCardId]: currentAttrData } : {}}
          onGenerate={handleGenerate}
          selectedAI={selectedAI} 
          onToggleAI={(val) => toggleValue(setSelectedAI, val)}
          isLoading={attrLoadingId === selectedCardId}
          // 👇 加上这一行，把刚才写的方法传进去
          onRegenerateSingle={handleRegenerateSingle}
        />
        
        {/* 3. 新增：在属性面板下方添加操作栏和按钮 */}
        <div className="workspace__action-row">
          <button 
            className="workspace__generate-idea-btn" 
            onClick={handleGenerateIdea}
            disabled={selectedAI.length === 0} // 没选属性时置灰禁用
          >
            生成想法
          </button>
        </div>
      </div>
      
      {/* 4. 完全删除了 workspace__bottom-section 和 MigrationZone 组件 */}
    </div>
  );
}
