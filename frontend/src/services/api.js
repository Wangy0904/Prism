// frontend/src/services/api.js
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function request(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '请求失败');
  return data.data;
}

// 生成AI联想物
// sourceProduct: "轮船"
// 返回: [{ name, distance, context, interaction, identity, emotion }, ...]
export const generateAssociation = (sourceProduct, topK = 3) =>
  request('/api/generate-association', { source_product: sourceProduct, top_k: topK });

// 第一页：生成属性
export const generateAttributes = (sourceProduct, associatedObject, shapeSimilarity) =>
  request('/api/generate-attributes', { sourceProduct, associatedObject, shapeSimilarity });

// 第二页弹窗：生成想法
export const generateIdea = (prompt) =>
  request('/api/generate-idea', { prompt });

// 第二页对话框：生成图片
export const generateImage = (prompt) =>
  request('/api/generate-image', { prompt });