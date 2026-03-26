from flask import Flask, request, jsonify
from flask_cors import CORS
from der_engine import generate_associations, generate_attributes
# 如果你愿意，也可以提前把新函数导进来，不过我们在路由函数内部已经局部导入了，所以直接删掉旧的就行

import datetime
import json
import os

app = Flask(__name__)
CORS(app)  # 允许前端跨域访问


@app.route("/api/generate-association", methods=["POST"])
def generate_association():
    """
    前端调用：根据源产品生成联想物
    请求体：{ "source_product": "轮船", "image_data": "base64字符串...", "top_k": 3 }
    """
    data = request.get_json()
    source_product = data.get("source_product", "")
    top_k = data.get("top_k", 3)
    
    # 👇 1. 新增：接住前端传来的图片数据
    image_data = data.get("image_data", None) 
    print(f"!!! 后端收到的图片数据长度: {len(image_data) if image_data else 'None'}")

    if not source_product:
        return jsonify({"error": "source_product 不能为空"}), 400

    try:
        # 👇 2. 新增：把 image_data 传给底层的逻辑函数
        results = generate_associations(source_product, top_k=top_k, image_data=image_data)
        return jsonify({"success": True, "data": results})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/api/generate-attributes", methods=["POST"])
def generate_attributes_api():
    """
    请求体：{ "source_product": "拖拉机", "association": "重载辅助动力外骨骼" }
    返回：{ "success": true, "data": { sourceAttrs: [...], aiAttrs: [...] } }
    """
    data = request.get_json()
    source_product = data.get("source_product", "")
    association = data.get("association", "")

    if not source_product or not association:
        return jsonify({"error": "source_product 和 association 不能为空"}), 400

    try:
        result = generate_attributes(source_product, association)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    



# ── 单独重新生成：功能属性 ──────────────────────────
@app.route("/api/regenerate-function", methods=["POST"])
def regenerate_function_api():
    data = request.get_json()
    source_product = data.get("source_product", "")
    association = data.get("association", "")

    if not source_product or not association:
        return jsonify({"error": "source_product 和 association 不能为空"}), 400

    try:
        from der_attributes import regenerate_function_attr
        result = regenerate_function_attr(source_product, association)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── 单独重新生成：交互属性 ──────────────────────────
@app.route("/api/regenerate-interaction", methods=["POST"])
def regenerate_interaction_api():
    data = request.get_json()
    source_product = data.get("source_product", "")
    association = data.get("association", "")

    if not source_product or not association:
        return jsonify({"error": "source_product 和 association 不能为空"}), 400

    try:
        from der_attributes import regenerate_interaction_attr
        result = regenerate_interaction_attr(source_product, association)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── 单独重新生成：感知属性 ──────────────────────────
@app.route("/api/regenerate-perception", methods=["POST"])
def regenerate_perception_api():
    data = request.get_json()
    source_product = data.get("source_product", "")
    association = data.get("association", "")

    if not source_product or not association:
        return jsonify({"error": "source_product 和 association 不能为空"}), 400

    try:
        from der_attributes import regenerate_perception_attr
        result = regenerate_perception_attr(source_product, association)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── 单独重新生成：情感属性 ──────────────────────────
@app.route("/api/regenerate-emotion", methods=["POST"])
def regenerate_emotion_api():
    data = request.get_json()
    source_product = data.get("source_product", "")
    association = data.get("association", "")

    if not source_product or not association:
        return jsonify({"error": "source_product 和 association 不能为空"}), 400

    try:
        from der_attributes import regenerate_emotion_attr
        result = regenerate_emotion_attr(source_product, association)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    




# ── 根据设计定义推荐产品 ──────────────────────────
@app.route("/api/recommend-products", methods=["POST"])
def recommend_products_api():
    """
    前端调用：根据用户的设计定义推荐源产品
    请求体：{ "design_definition": "给露营时候提供光照" }
    返回：{ "success": true, "data": ["料理锅", "营地灯", "便携风扇"] }
    """
    data = request.get_json()
    design_definition = data.get("design_definition", "")

    if not design_definition:
        return jsonify({"error": "design_definition 不能为空"}), 400

    try:
        from der_engine import recommend_products
        result = recommend_products(design_definition)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# @app.route("/api/generate-idea", methods=["POST"])
# def generate_idea_api():
#     data = request.get_json()
#     source_product = data.get("source_product", "")
#     association = data.get("association", "")
#     selected_attrs = data.get("selected_attrs", [])
#     extra = data.get("extra", "")

#     if not source_product or not association:
#         return jsonify({"error": "source_product 和 association 不能为空"}), 400

#     try:
#         result = generate_idea(source_product, association, selected_attrs, extra)
#         return jsonify({"success": True, "data": result})
#     except Exception as e:
#         return jsonify({"success": False, "error": str(e)}), 500


# ── 单独算计算语义距离 ──────────────────────────

@app.route("/api/recalc-distances", methods=["POST"])
def recalc_distances_api():
    """
    请求体：{ "source_product": "盲杖", "candidate_names": ["灭火器", "推车", ...] }
    返回：{ "success": true, "data": [{name, distance, ...}, ...] }
    """
    data = request.get_json()
    source_product = data.get("source_product", "")
    candidate_names = data.get("candidate_names", [])
    if not source_product or not candidate_names:
        return jsonify({"error": "参数不能为空"}), 400
    try:
        from der_engine import recalc_distances
        result = recalc_distances(source_product, candidate_names)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    

    # ── 生成迁移与方案生成 ──────────────────────────
@app.route("/api/generate-context", methods=["POST"])
def generate_context_api():
    """阶段一：生成场景与人群"""
    data = request.get_json()
    source_product = data.get("source_product", "")
    selected_attrs = data.get("selected_attrs", [])

    if not source_product or not selected_attrs:
        return jsonify({"error": "缺少必要参数"}), 400

    try:
        from der_engine import generate_context
        result = generate_context(source_product, selected_attrs)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/generate-solution", methods=["POST"])
def generate_solution_api():
    """阶段二：生成具体方案"""
    data = request.get_json()
    source_product = data.get("source_product", "")
    selected_attrs = data.get("selected_attrs", [])
    scene = data.get("scene", "")
    users = data.get("users", "")
    pain_points = data.get("pain_points", "")

    try:
        from der_engine import generate_solution
        result = generate_solution(source_product, selected_attrs, scene, users, pain_points)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    



# ── 生成图片 ──────────────────────────
@app.route("/api/generate-image", methods=["POST"])
def generate_image_api():
    data = request.get_json()
    prompt = data.get("prompt", "")

    if not prompt:
        return jsonify({"error": "请输入提示词"}), 400

    try:
        from der_engine import generate_image_logic
        image_url = generate_image_logic(prompt)
        return jsonify({"success": True, "image_url": image_url})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    


@app.route("/api/track", methods=["POST"])
def track_event():
    """接收前端发来的埋点数据并存入本地文件"""
    data = request.get_json()
    event_name = data.get("event_name", "unknown")
    user_id = data.get("user_id", "anonymous")
    details = data.get("details", {})
    
    # 获取当前时间
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    log_entry = {
        "time": timestamp,
        "user_id": user_id,
        "event_name": event_name,
        "details": details
    }

    # 追加写入到一个本地日志文件（tracking_logs.jsonl）
    # 用 .jsonl 格式（每一行是一个独立的 JSON），最适合做日志，不会破坏文件结构
    with open("tracking_logs.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

    print(f"📊 [埋点记录] 用户:{user_id} | 动作:{event_name}")
    return jsonify({"success": True})
    

    # 把这个加在 app.py 里面
@app.route("/api/save-session", methods=["POST"])
def save_session_api():
    """接收前端发来的整个页面的数据，保存为独立文件"""
    data = request.get_json()
    user_id = data.get("user_id", "anonymous")
    
    # 按照 用户名+时间 生成一个独一无二的文件名
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"测试数据_{user_id}_{timestamp}.json"
    
    # 把张三生成的所有东西保存到这个文件里
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"💾 [数据保存] {user_id} 的测试成果已保存至 {filename}")
    return jsonify({"success": True})



if __name__ == "__main__":
    app.run(debug=True, port=5000)