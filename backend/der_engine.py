import os
import json
import requests

from dotenv import load_dotenv


import re

load_dotenv()

# ── 配置 ──────────────────────────────────────────────
LLM_API_KEY  = os.getenv("LLM_API_KEY")

IMAGE_API_KEY = os.getenv("IMAGE_API_KEY")


IMAGE_BASE_URL = "https://api.ourzhishi.top/v1"

LLM_BASE_URL = "https://yinli.one/v1"
LLM_MODEL    = "gemini-3-flash-preview"

SBERT_URL    = "https://u283245-b1gp-4344a5d0.bjb2.seetacloud.com:8443/calculate_distance"

print(f"KEY: {LLM_API_KEY}")


# ── 统一的LLM调用函数（用requests，走系统代理）──────────
def llm_chat(messages, temperature=0.7, retries=3):
    for i in range(retries):
        try:
            resp = requests.post(
                f"{LLM_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {LLM_API_KEY}"},
                json={
                    "model": LLM_MODEL,
                    "messages": messages,
                    "temperature": temperature,
                },
                timeout=60
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[LLM] 第{i+1}次请求失败: {e}")
            if i == retries - 1:
                raise


# ── 解析LLM返回的JSON ────────────────────────────────
def parse_json(raw: str):
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    # 去掉 JSON 中的 trailing comma（如 ,} 或 ,]）
    raw = re.sub(r',\s*([}\]])', r'\1', raw)
    return json.loads(raw)

# 👇 引入全新的 Gemini 视觉直出函数
from candidate_generator import generate_candidates_with_gemini_vision, generate_candidates_text_only

# ── Step 1：描述源产品的四维特征 ─────────────────────────
def describe_source(source_product: str) -> dict:
    prompt = f"""
请从以下四个语义维度对产品「{source_product}」进行简短描述（每个维度不超过20字）：

1. 界面层（个人使用中的意义）：描述该产品的交互行为与可供性，即用户如何与它发生直接的物理或操作互动。

2. 定义层（语言与社会交流中的意义）：描述该产品在社会语境中的隐喻、身份定义及文化象征。

3. 流转层（生命周期与利益相关者中的意义）：描述该产品在流转过程中涉及哪些利益相关者，以及它们之间的交互关系。

4. 环境层（人造物生态系统中的意义）：描述该产品与其他物体、空间或环境的共生关系。

严格以JSON格式返回，不要有任何多余文字：
{{
  "interface": "界面层描述",
  "definition": "定义层描述",
  "circulation": "流转层描述",
  "environment": "环境层描述"
}}
"""
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.3)
    return parse_json(raw)






# ── Step 2：生成候选联想物（含四维描述）─────────────────
def describe_candidates(candidates: list) -> list:
    names = [c["name"] for c in candidates]
    prompt = f"""
请从以下四个语义维度对每个产品进行简短描述（每个维度不超过20字）：

1. 界面层：交互行为与可供性
2. 定义层：社会隐喻、身份定义及文化象征
3. 流转层：生命周期中涉及的利益相关者及其交互
4. 环境层：与其他物体、空间或环境的共生关系

产品列表：{json.dumps(names, ensure_ascii=False)}

严格以JSON数组格式返回，顺序与输入一致，不要有任何多余文字：
[
  {{
    "name": "产品名称",
    "interface": "界面层描述",
    "definition": "定义层描述",
    "circulation": "流转层描述",
    "environment": "环境层描述"
  }}
]
"""
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.3)
    descs = parse_json(raw)
    
    # === 核心修改在这里：去掉双大括号，改回单大括号 ===
    desc_map = {d["name"]: d for d in descs}
    return [{**c, **desc_map.get(c["name"], {})} for c in candidates]



# ── Step 3：调SBERT计算语义距离 ──────────────────────────
def calc_distances(source_desc: dict, candidates: list) -> list:
    results = []
    for cand in candidates:
        payload = {
            "p_a": {
                "interface":   source_desc.get("interface", ""),
                "definition":  source_desc.get("definition", ""),
                "circulation": source_desc.get("circulation", ""),
                "environment": source_desc.get("environment", ""),
            },
            "p_b": {
                "interface":   cand.get("interface", ""),
                "definition":  cand.get("definition", ""),
                "circulation": cand.get("circulation", ""),
                "environment": cand.get("environment", ""),
            },
            "weights": {
                "interface": 0.25,
                "definition": 0.25,
                "circulation": 0.25,
                "environment": 0.25,
            }
        }
        # ... 下面的 try-except 逻辑保持不变 ...
        try:
            r = requests.post(SBERT_URL, json=payload, timeout=15)
            r.raise_for_status()
            distance = r.json().get("distance", 1.0)
        except Exception as e:
            print(f"[SBERT] {cand['name']} 计算失败: {e}")
            distance = 1.0

        results.append({**cand, "distance": distance})

    return results

# ── 单独算语义距离 ──────────────────────────

def recalc_distances(source_product: str, candidate_names: list) -> list:
    print(f"重新计算「{source_product}」的语义距离...")
    source_desc = describe_source(source_product)
    candidates = describe_candidates([{"name": n} for n in candidate_names])
    ranked = calc_distances(source_desc, candidates)
    return ranked


# ── 主入口 ────────────────────────────────────────────
def generate_associations(source_product: str, top_k: int = 3, image_data: str = None) -> list:
    print(f"[1/4] 生成「{source_product}」的源描述...")
    source_desc = describe_source(source_product)

    print(f"[2/4] 生成候选联想物...")

    candidates = []
    # 如果前端传了真正的图片数据，直接召唤 Gemini 视觉大模型！
    if image_data and len(image_data) > 100:
        candidates = generate_candidates_with_gemini_vision(source_product, image_data, n=6)
    else:
        # 如果没传图，走纯文本保底逻辑
        candidates = generate_candidates_text_only(source_product, n=6)

    # 如果没传图，或者 AutoDL 提取失败（返回了 ERROR），无缝切换到保底的老路线
    if not candidates:
        candidates = generate_candidates_text_only(source_product, n=6)

    print(f"生成了 {len(candidates)} 个候选")


    print(f"[3/4] 生成候选联想物的四维描述...")
    candidates = describe_candidates(candidates)

    print(f"[4/4] SBERT计算语义距离...")
    ranked = calc_distances(source_desc, candidates)
    ranked.sort(key=lambda x: x["distance"])
    return ranked[:top_k]


# ── 生成四个属性 ────────────────────────────────────────────

def generate_attributes(source_product: str, association: str) -> dict:
    prompt = f"""
你是一位工业设计师。请深度解构【联想物：{association}】，提取其核心特征，从以下四个维度输出结构化的创新属性设计概念。

四个维度的定义：

1. 功能属性：它在日常生活中最基础、最通俗的用途是什么？
   思考路径：它是如何工作的？普通人拿它干嘛用？这个产品使用时候会发生什么直接的变化吗？

2. 交互属性：它典型的人机操作方式与反馈机制是什么？
   思考路径：人们通常如何操作联想物？身体是如何与它互动的？

3. 感知属性：在使用它时，眼睛能看到什么？耳朵能听到什么声音？
   思考路径：它有什么明显的动静或直观的画面？

4. 情感属性：有什么自带的隐喻、场景代入感，给人什么简单直接的心情感受？
   思考路径：能唤起怎样的心理感受？

要求：
- 每个维度提供 3 个想法，每个不超过20个字
- 在每个维度提供 3 个大白话描述，仅描述【{association}】本身！
- 严格以JSON格式返回，不要有任何多余文字

{{
  "aiAttrs": [
    {{"label": "联想功能", "values": ["...", "...", "..."]}},
    {{"label": "联想交互", "values": ["...", "...", "..."]}},
    {{"label": "联想感知", "values": ["...", "...", "..."]}},
    {{"label": "联想情感", "values": ["...", "...", "..."]}}
  ]
}}
"""
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.6)
    return parse_json(raw)




# ── 生成想法 ────────────────────────────────────────────
def generate_context(source_product: str, selected_attrs: list) -> dict:
    attrs_str = "、".join(selected_attrs)
    prompt = f"""
# 任务：跨界产品概念推演（第一阶段）
目标：将【{attrs_str}】的核心特性（底层逻辑/技术/交互体验），原生化地迁移到【{source_product}】中。

## 核心推演规则（必须遵循）：
1. **拒绝“物理拼凑”**：严禁直接将两个产品摆放在一起（例如：严禁在A上直接放置B）。
2. **底层特性迁移**：请分析【{attrs_str}】的底层价值，并将这种“能力”赋予【{source_product}】。
3. **寻找“隐形需求”**：思考在用户操作【{source_product}】的原生动线中，哪个瞬间引入【{attrs_str}】的特性可以产生“意料之外、情理之中”的溢价感。

## 任务要求：
请根据上述逻辑，给出具体的场景设定、目标人群及痛点描述。
- **场景描述**：描述用户当时的状态，描述一种用户需求，比如说，刚刚起床需要一杯热饮料，或者是在工作，需要一杯饮品提神。因此描述的是场景或者用户状态，而不涉及到任何产品图片，严禁使用技术词汇,限制在 80 字以内。
- **目标人群**：具体的细分画像，包含他们的生活方式或审美偏好。
- **核心痛点**：由于新特性的加入，解决了原产品在特定情境下的什么顽疾或隐形诉求。

## 请严格按照 JSON 格式返回：
{{
  "step1_migration_logic": "思考过程：分析迁移属性的底层物理或交互价值，说明如何避免物理拼凑，将其转化为加湿器的一种新能力（限50字）。",
  "step2_hidden_need": "思考过程：在这个新能力下，设想用户交互动线中的哪一个具体瞬间，解决了他们未曾察觉的隐性痛点（限50字）。",
  "scene": "描述一个融合了新特性的、极具质感的交互瞬间",
  "users": "具体的人群定义",
  "pain_points": "新产品逻辑下解决的深层痛点"
}}

---
输入数据：
- 源产品：{source_product}
- 迁移特性：{attrs_str}
"""
    # 1. 调用大模型
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.8)

    data = parse_json(raw)
    
    # 👇 新增：在后台把大模型的“完整作答（含草稿）”华丽地打印出来！
    print(f"\n========== 【阶段一】Gemini 的暗箱推演过程 ==========")
    print(json.dumps(data, ensure_ascii=False, indent=2))
    print("====================================================\n")
    
    # 3. 返回给前端
    return data



# ── 新版阶段二：生成具体方案 ────────────────────────────────────────────
def generate_solution(source_product: str, selected_attrs: list, scene: str, users: str, pain_points: str) -> dict:
    attrs_str = "、".join(selected_attrs)
    prompt = f"""
你是一位资深工业设计师。我们在前一阶段已经确定了以下设计背景：
- 源产品：{source_product}
- 迁移特征：{attrs_str}
- 详细使用场景：{scene}
- 详细目标人群：{users}
- 详细人群痛点：{pain_points}

1. 结构合理化：从物理结构、材料或软硬件技术的角度，简单描述该概念如何构成。

2. 反馈方式（选填）：将这个{attrs_str}加入到{source_product}后，设计人机交互闭环中的系统反馈机制。当用户触发操作时，产品如何通过视觉、听觉、触觉等感官维度给予反馈？

请基于以上背景，完成具体的“产品方案推导”，严格以JSON格式返回，不要有多余文字：

要求：
1. 提取短背景：将上面的详细场景、人群、痛点，分别提炼成极简的短句（每句严格控制在20个字以内）。
2. 生成新方案：推导具体的产品功能与形态。
3. 严格遵循以下JSON格式，不要有多余文字：

{{
  "short_scene": "高度概括的场景（不超过20字）",
  "short_users": "高度概括的人群（不超过20字）",
  "short_pain_points": "高度概括的痛点（不超过20字）",
  "summary": "一句话概念总结（新产品名称+核心卖点）",
  "functions": "具体的产品功能（它是如何解决上述痛点的？）",
  "form_structure": "形态与物理结构（外观长什么样？使用了什么材料或结构？）",
  "feedback": "人机交互反馈方式"
}}
"""
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.7)
    return parse_json(raw)


# ── 生成推荐产品（基于设计定义） ──────────────────────────
def recommend_products(design_definition: str) -> list:
    prompt = f"""
你是一位工业设计师。用户给出了一个设计定义或需求：「{design_definition}」。
请推荐 2 到 3 个能够满足该需求，或与该场景高度相关的具体物理产品（源产品）。

要求：
1. 这些产品应该是日常可见的实体物品（例如：营地灯、便携风扇、料理锅等）。
2. 不要推荐过于宽泛的概念（如“照明设备”），必须是具体的具象产品名称。

请严格以 JSON 数组的格式返回产品名称，不要有任何多余的文字、Markdown标记或解释：
[
  "产品A",
  "产品B",
  "产品C"
]
"""
    # 稍微给一点 temperature，让它有一点发散性
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.7)
    return parse_json(raw)

    

# ── 生成图片 ────────────────────────────────────────────
def generate_image_logic(prompt: str) -> str:
    try:
        # 使用生图专用的 Headers (Key 也是新的)
        headers = {"Authorization": f"Bearer {IMAGE_API_KEY}"} 
        
        payload = {
            "model": "gemini-2.5-flash-image-vip", # 确保模型名与新平台一致
            "prompt": prompt,
            "response_format": "url"
        }

        # 重点：这里必须指向 IMAGE_BASE_URL
        resp = requests.post(
            f"{IMAGE_BASE_URL}/images/generations", 
            headers=headers,
            json=payload,
            timeout=120
        )
        
        if resp.status_code != 200:
            print(f"新供应商返回错误: {resp.text}")
            
        resp.raise_for_status()
        return resp.json()["data"][0]["url"]
    except Exception as e:
        print(f"[Image Error] 生图失败: {e}")
        raise e
    


# ── 测试 ──────────────────────────────────────────────
if __name__ == "__main__":
    results = generate_associations("轮船", top_k=3)
    print("\n=== 联想结果 ===")
    for i, r in enumerate(results, 1):
        print(f"{i}. {r['name']}  语义距离: {r['distance']:.4f}")
    print(json.dumps(results, ensure_ascii=False, indent=2))