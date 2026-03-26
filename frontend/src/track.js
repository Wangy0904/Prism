// 获取或生成一个永久的测试人员 ID
export const getTesterId = () => {
  let testerId = localStorage.getItem('tester_id');
  
  if (!testerId) {
    // 👇 网页一加载，直接弹窗问名字！
    const defaultName = '测试员_' + Math.random().toString(36).substr(2, 4);
    testerId = window.prompt("欢迎参与测试！请输入您的昵称：", defaultName);
    
    // 如果他什么都不填直接点确定，就给他一个默认名
    if (!testerId || testerId.trim() === "") {
      testerId = defaultName;
    }
    
    localStorage.setItem('tester_id', testerId);
  }
  
  return testerId;
};

// 👇 再加一个小函数，用来“强制注销”当前用户
export const resetTester = () => {
  localStorage.removeItem('tester_id');
  window.location.reload(); // 刷新页面，就会重新弹窗问名字了！
};

// 发送埋点数据到后端的通用函数
export const trackEvent = (eventName, details = {}) => {
  const userId = getTesterId();
  
  fetch('http://localhost:5000/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      event_name: eventName,
      details: details
    })
  }).catch(err => console.error("埋点发送失败:", err));
};



// 在 track.js 里加上这个交卷函数
export const saveSessionAndExit = async (ideaData) => {
  const userId = getTesterId(); 
  
  try {
    // 1. 把分布在各处的数据全部抓过来，融合成一个终极 JSON
    const fullSessionData = {
      tester_name: userId,
      
      // 👇 从缓存中抓取 Workspace（工作台）的进度
      workspace_cards: JSON.parse(localStorage.getItem('cards') || '[]'),
      workspace_assocCache: JSON.parse(localStorage.getItem('assocCache') || '{}'),
      workspace_attrCache: JSON.parse(localStorage.getItem('attrCache') || '{}'),
      
      // 👇 接收传进来的 IdeaGeneration（生成页）的成果
      ...ideaData 
    };

    // 2. 发给后端保存
    await fetch('http://localhost:5000/api/save-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullSessionData)
    });
    
    // 3. 交卷后，彻底清空所有的本地缓存，让页面恢复出厂设置！
    localStorage.removeItem('tester_id');
    localStorage.removeItem('cards');
    localStorage.removeItem('assocCache');
    localStorage.removeItem('attrCache');
    localStorage.removeItem('imported_idea_data'); 
    
    alert("✅ 数据已完美保存至本地日志文件夹！");
    return true; // 告诉前端保存成功了
  } catch (err) {
    console.error("保存失败:", err);
    alert("保存数据失败，请检查后端是否运行！");
    return false;
  }
};