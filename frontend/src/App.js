import React, { useState, useEffect } from 'react';
import './App.css';
import SearchPage from './components/SearchPage'; // ← 新增引入搜索页
import Workspace from './components/Workspace';
import IdeaGenerationPage from './components/page2/IdeaGeneration';


function App() {
  // 1. 控制当前显示哪个页面，默认改为 'search'
  const [currentPage, setCurrentPage] = useState('search');
  
  // 👇 核心新增：全局管理搜索栏的状态
  const [searchMode, setSearchMode] = useState('idle'); // 'idle' = 显示50图, 'searched' = 显示100图
  const [globalSearchIntent, setGlobalSearchIntent] = useState("");


  // 2. 新增：用于记录从搜索页跳过来时，携带的产品信息
  const [pendingProduct, setPendingProduct] = useState(null);
  
  // === 全局状态（跨页面保留的数据） ===
  const [globalSourceItems, setGlobalSourceItems] = useState(() => {
    const saved = localStorage.getItem("globalSourceItems");
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => { localStorage.setItem("globalSourceItems", JSON.stringify(globalSourceItems)); }, [globalSourceItems]);

  const [globalAiItems, setGlobalAiItems] = useState(() => {
    const saved = localStorage.getItem("globalAiItems");
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => { localStorage.setItem("globalAiItems", JSON.stringify(globalAiItems)); }, [globalAiItems]);
  
  const [concepts, setConcepts] = useState(() => {
    const saved = localStorage.getItem("concepts");
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => { localStorage.setItem("concepts", JSON.stringify(concepts)); }, [concepts]);

  const [globalSourceProduct, setGlobalSourceProduct] = useState(() => {
    return localStorage.getItem("globalSourceProduct") ?? "";
  });
  useEffect(() => { localStorage.setItem("globalSourceProduct", globalSourceProduct); }, [globalSourceProduct]);

  const [globalAssociation, setGlobalAssociation] = useState(() => {
    return localStorage.getItem("globalAssociation") ?? "";
  });
  useEffect(() => { localStorage.setItem("globalAssociation", globalAssociation); }, [globalAssociation]);
  
  // === 页面跳转逻辑 ===

  // 1. 发起搜索：无论在哪搜，都记录搜索词，并跳到“100图”的搜索页
  const handleSearchStart = (intent) => {
    setSearchMode('searched');
    setGlobalSearchIntent(intent);
    setCurrentPage('search'); 
  };

  // 3. 从详情页(Workspace)单纯返回：保持搜索出来的100图不变
  const handleBackToSearch = () => {
    setCurrentPage('search');
  };

  // 2. 返回首页：清空搜索词，跳回“50图”的状态
  const handleGoHome = () => {
    setSearchMode('idle');
    setGlobalSearchIntent("");
    setCurrentPage('search');
  };

  // 4. 从搜索页进入详情页
  const handleEnterWorkspace = (productName, intent, imgUrl) => {
    setPendingProduct({ productName, intent, imgUrl });
    setCurrentPage('workspace');
  };

  // 从 Workspace 跳转到 第二页 的函数
  const goToNextPage = (sourceItems, aiItems, sourceProduct, association) => {
    setGlobalSourceItems(sourceItems);
    setGlobalAiItems(aiItems);
    setGlobalSourceProduct(sourceProduct);
    setGlobalAssociation(association);
    setCurrentPage('ideaPage');
  };

  return (
    <div className="App">
      {/* 渲染搜索页 */}
      {currentPage === 'search' && (
        <SearchPage 
          searchMode={searchMode}
          currentIntent={globalSearchIntent}
          onSearchStart={handleSearchStart} 
          onGoHome={handleGoHome}
          onEnterWorkspace={handleEnterWorkspace} 
        />
      )}

      {/* 渲染工作台 */}
      {currentPage === 'workspace' && (
        <Workspace 
          onNext={goToNextPage} 
          initialSourceItems={globalSourceItems} 
          initialAiItems={globalAiItems}
          initialProduct={pendingProduct} // ← 把刚才存的产品信息传进去
          onSearchStart={handleSearchStart}
          onBackToSearch={handleBackToSearch}
        />
      )}

      {/* 渲染第二页 */}
      {currentPage === 'ideaPage' && (
        <IdeaGenerationPage 
          onBack={() => setCurrentPage('workspace')}
          sourceItems={globalSourceItems}
          aiItems={globalAiItems}
          sourceProduct={globalSourceProduct}
          association={globalAssociation} 
          concepts={concepts}
          setConcepts={setConcepts}
        />
      )}
    </div>
  );
}

export default App;