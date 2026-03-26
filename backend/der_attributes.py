import requests

# 引入 der_engine 里的基础函数
from der_engine import llm_chat, parse_json

# 填入你 AutoDL 的实际公网地址和端口（我们在 AutoDL 上即将新增的接口）
AUTODL_EXTRACT_URL = "https://u283245-b1gp-4344a5d0.bjb2.seetacloud.com:8443/extract_farthest_attributes"

# ── 封装一个通用的 AutoDL 筛选函数 ────────────────────────────────────
def filter_farthest_phrases(phrases: list, k: int = 3) -> dict:
    """
    不仅返回挑好的词，还返回全套算法透传数据给前端装X用。
    """
    if len(phrases) <= k:
        return {"values": phrases}
    
    try:
        payload = {"texts": phrases, "k": k}
        resp = requests.post(AUTODL_EXTRACT_URL, json=payload, timeout=20)
        resp_data = resp.json()
        
        if resp_data.get("success"):
            # 返回一个字典，里面包含了前端画图所需的所有物料
            return {
                "values": resp_data["selected_texts"],
                "algorithm_data": {
                    "candidates": resp_data["candidates"],
                    "matrix": resp_data["matrix"],
                    "process_log": resp_data["process_log"]
                }
            }
    except Exception as e:
        print(f"[AutoDL FFT Error] 筛选失败: {e}")
    
    return {"values": phrases[:k]}


# ── 单独生成：功能属性 ────────────────────────────────────────────
def regenerate_function_attr(source_product: str, association: str) -> dict:
    prompt = f"""
你是一位工业设计师。请深度解构【联想物：{association}】，提取其核心特征，仅针对「功能属性」输出结构化的创新设计概念。

功能属性定义：它在日常生活中最基础、最通俗的用途是什么？
思考路径：它是如何工作的？普通人拿它干嘛用？这个产品使用时候会发生什么直接的变化吗？

要求：
- 提供 6 个想法，每个不超过20个字
- 仅描述【{association}】本身！
- 严格以JSON格式返回，不要有任何多余文字

{{
  "label": "联想功能",
  "values": ["想法1", "想法2", "想法3", "想法4", "想法5", "想法6"]
}}
"""
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.6)
    result = parse_json(raw)
    
    phrases = result.get("values", [])
    if len(phrases) > 3:
        fft_result = filter_farthest_phrases(phrases, k=3)
        result["values"] = fft_result.get("values", phrases[:3])
        # 把算法数据挂载到返回结果里发给前端
        if "algorithm_data" in fft_result:
            result["algorithm_data"] = fft_result["algorithm_data"]

    return result


# ── 单独生成：交互属性 ────────────────────────────────────────────
def regenerate_interaction_attr(source_product: str, association: str) -> dict:
    prompt = f"""
你是一位工业设计师。请深度解构【联想物：{association}】，提取其核心特征，仅针对「交互属性」输出结构化的创新设计概念。

交互属性定义：它典型的人机操作方式与反馈机制是什么？
思考路径：人们通常如何操作联想物？身体是如何与它互动的？

要求：
- 提供 6 个想法，每个不超过20个字
- 仅描述【{association}】本身！
- 严格以JSON格式返回，不要有任何多余文字

{{
  "label": "联想交互",
  "values": ["想法1", "想法2", "想法3", "想法4", "想法5", "想法6"]
}}
"""
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.6)
    result = parse_json(raw)

    phrases = result.get("values", [])
    if len(phrases) > 3:
        fft_result = filter_farthest_phrases(phrases, k=3)
        result["values"] = fft_result.get("values", phrases[:3])
        # 把算法数据挂载到返回结果里发给前端
        if "algorithm_data" in fft_result:
            result["algorithm_data"] = fft_result["algorithm_data"]

    return result


# ── 单独生成：感知属性 ────────────────────────────────────────────
def regenerate_perception_attr(source_product: str, association: str) -> dict:
    prompt = f"""
你是一位工业设计师。请深度解构【联想物：{association}】，提取其核心特征，仅针对「感知属性」输出结构化的创新设计概念。

感知属性定义：在使用它时，眼睛能看到什么？耳朵能听到什么声音？
思考路径：它有什么明显的动静或直观的画面？

要求：
- 提供 6 个想法，每个不超过20个字
- 仅描述【{association}】本身！
- 严格以JSON格式返回，不要有任何多余文字

{{
  "label": "联想感知",
  "values": ["想法1", "想法2", "想法3", "想法4", "想法5", "想法6"]
}}
"""
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.6)
    result = parse_json(raw)

    phrases = result.get("values", [])
    if len(phrases) > 3:
        fft_result = filter_farthest_phrases(phrases, k=3)
        result["values"] = fft_result.get("values", phrases[:3])
        # 把算法数据挂载到返回结果里发给前端
        if "algorithm_data" in fft_result:
            result["algorithm_data"] = fft_result["algorithm_data"]

    return result


# ── 单独生成：情感属性 ────────────────────────────────────────────
def regenerate_emotion_attr(source_product: str, association: str) -> dict:
    prompt = f"""
你是一位工业设计师。请深度解构【联想物：{association}】，提取其核心特征，仅针对「情感属性」输出结构化的创新设计概念。

情感属性定义：有什么自带的隐喻、场景代入感，给人什么简单直接的心情感受？
思考路径：能唤起怎样的心理感受？

要求：
- 提供 6 个想法，每个不超过20个字
- 仅描述【{association}】本身！
- 严格以JSON格式返回，不要有任何多余文字

{{
  "label": "联想情感",
  "values": ["想法1", "想法2", "想法3", "想法4", "想法5", "想法6"]
}}
"""
    raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.6)
    result = parse_json(raw)

    phrases = result.get("values", [])
    if len(phrases) > 3:
        fft_result = filter_farthest_phrases(phrases, k=3)
        result["values"] = fft_result.get("values", phrases[:3])
        # 把算法数据挂载到返回结果里发给前端
        if "algorithm_data" in fft_result:
            result["algorithm_data"] = fft_result["algorithm_data"]

    return result