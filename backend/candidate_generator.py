import os
import json
import requests
import base64

# 👉 直接从你原有的 der_engine.py 中引入基础大模型调用和解析工具
from der_engine import llm_chat, parse_json

# ── 核心逻辑 1：传图给 AutoDL 计算形态 ──────────────────────────
def generate_candidates_with_gemini_vision(source_product: str, image_data: str, n: int = 6) -> list:
    print(f"检测到图片！正在召唤 Gemini 视觉大模型进行【看图联想】...")
    
    # 确保图片是标准的 Base64 格式
    if "base64," in image_data:
        image_base64 = image_data.split("base64,")[1]
    else:
        image_base64 = image_data

    # 1. 构造发给大模型的提示词文本
    text_prompt = f"""
你是一位顶尖的工业设计师，擅长跨领域产品联想。

第一步：形态解构 (提取 design_dna)
请按照以下两个维度进行纯粹的形态扫描，用一段极其精准的话描述你看到的特征：
- A. 整体外轮廓：它整体呈现什么基础形状？
- B. 构件与嵌套：它是单一块面，还是由多个几何体组合/嵌套而成？边缘是否有延伸出的特殊结构?

第二步：发散联想 (生成 candidates)
根据你刚刚在第一步提取的纯粹“形态基因”，生成 {n} 个"远距离相关"的产品。

远距离相关的定义：
1. 【语义距离远】两个产品的行为语义不同——交互方式不同，或最终表达的意图不同。
   - 执行方式：先对「{source_product}」的交互方式做发散（一个产品可能有多种交互方式），只需保证两个产品的某一种交互方式不同即可。
   - 反例：「都是为了减轻负重、延伸人的体力」就代表两种产品语义相同，不符合要求。

2. 【形态高度相似】两个产品在外轮廓或局部的轮廓形状上有相似性。
   - 你需要明确指出联想物是哪一部分与提取出的“形态基因”相似。
   注意：不是运用相同的机械结构（如金属滑轨、阻力转盘）产生的相似，而是形状外观上的相似。

3. 【大众化】产品要是用户日常可以接触到的实体物品，不要太小众。
严格以 JSON 格式返回，包含提取的形态基因和联想物列表，不要有任何多余文字，必须严格遵循以下结构：
{{
  "design_dna": "描述AB两个维度下图片纯粹几何、局部特征",
  "candidates": [
    {{
      "name": "产品名称",
      "reasoning": "思考过程：语义距离远的理由 + 如何契合图中形态的理由",
      "shapeSimilarity": "形态相似性的简短描述（不超过30字）"
    }}
  ]
}}
"""

    # 2. 构造多模态的 Message 格式（文字 + 图片）
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": text_prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        # OpenAI 兼容格式的 Base64 图片传法
                        "url": f"data:image/jpeg;base64,{image_base64}"
                    }
                }
            ]
        }
    ]

    # 调用底层的 llm_chat
    raw = llm_chat(messages, temperature=0.8)
    
    # 1. 先把大模型吐出来的 JSON 字符串解析成 Python 字典
    data = parse_json(raw)
    
    # 2. 把大模型写的“形态基因”剥离出来，高调打印在控制台！
    dna = data.get("design_dna", "未提取出形态描述")
    print(f"\n========== Gemini 眼里的形态基因 ==========\n{dna}\n===========================================\n")
    
    # 3. 核心修复：绝不能直接 return data！必须只返回 candidates 列表！
    return data.get("candidates", [])



# ── 核心逻辑 2：基于真实形态基因生成候选联想物 ───────────────────
def generate_candidates_with_dna(source_product: str, design_dna: str, n: int = 6) -> list:
    print(f"基于提取的形态基因，正在生成联想物...")
    prompt = f"""

现有一个源产品「{source_product}」，我们通过视觉大模型对其卡片图片进行了纯粹的几何与形态特征提取，结果如下：
【源产品形态基因】：{design_dna}

请根据源产品及其真实的「形态基因」，生成 {n} 个"远距离相关"的产品。

远距离相关的定义：
1. 【语义距离远】两个产品的行为语义不同——交互方式不同，或最终表达的意图不同。
   - 执行方式：先对「{source_product}」的交互方式做发散（一个产品可能有多种交互方式），只需保证两个产品的某一种交互方式不同即可。
   - 反例：「都是为了减轻负重、延伸人的体力」就代表两种产品语义相同，不符合要求。

2. 【形态高度相似】两个产品在外轮廓或局部的轮廓形状上有相似性。
   - 你需要明确指出联想物是哪一部分与提取出的“形态基因”相似。
   注意：不是运用相同的机械结构（如金属滑轨、阻力转盘）产生的相似，而是形状外观上的相似。

3. 【大众化】产品要是用户日常可以接触到的实体物品，不要太小众。

请先输出每个产品的思考过程，再给出结论。

严格以 JSON 数组格式返回，不要有任何多余文字：
[
  {{
    "name": "产品名称",
    "reasoning": "思考过程：语义距离远的理由 + 如何契合输入形态基因的理由",
    "shapeSimilarity": "形态相似性的简短描述（不超过30字）"
  }}
]
"""
    # 👉 直接调用从 der_engine.py 导入的函数
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.8)
    return parse_json(raw)



def generate_candidates_text_only(source_product: str, n: int = 6) -> list:
    print(f"未检测到有效图片或形态提取失败，使用纯文本逻辑生成联想物...")
    prompt = f"""
你是一位工业设计师，擅长跨领域产品联想。

请根据源产品「{source_product}」，生成 {n} 个"远距离相关"的产品。

远距离相关的定义：
1. 【语义距离远】两个产品的行为语义不同——交互方式不同，或最终表达的意图不同。
   - 执行方式：先对「{source_product}」的交互方式做发散（一个产品可能有多种交互方式），只需保证两个产品的某一种交互方式不同即可。
   - 反例：「都是为了减轻负重、延伸人的体力」就代表两种产品语义相同，不符合要求。

2. 【形态相似】两个产品在外轮廓或某个功能部件的轮廓形状上有相似性。
   - 整体相似示例：幼儿洗浴盆 和 海上救生艇（整体外轮廓相似）
   - 局部相似示例：滑板车的长柄+底部滑行 和 输液架（局部功能部件相似）
   - 注意：不是运用相同的机械结构（如金属滑轨、阻力转盘）产生的相似，而是形状外观上的相似。

3. 【大众化】产品要是用户日常可以接触到的，不要太小众。

请先输出每个产品的思考过程，再给出结论。

严格以 JSON 数组格式返回，不要有任何多余文字：
[
  {{
    "name": "产品名称",
    "reasoning": "思考过程：语义距离远的理由 + 形态相似的理由",
    "shapeSimilarity": "形态相似性的简短描述（不超过30字）",
  }}
]
"""
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.8)
    return parse_json(raw)

