from flask import Blueprint, request, jsonify
from . import models, services

bp = Blueprint('english', __name__, url_prefix='/api/english')

@bp.before_app_request
def init_db_once():
    # Simple check to ensure table exists
    # In production, use migrations
    models.init_db()

@bp.post("/register")
def register_word():
    try:
        payload = request.get_json(force=True)
        word = payload.get("word")
        if not word:
            return jsonify({"error": "word is required"}), 400
            
        info = services.generate_word_info(word)
        if "error" in info:
            return jsonify(info), 500
            
        # Add to DB
        word_data = {
            "word": info["word"],
            "meaning": info["meaning"],
            "pronunciation": info["pronunciation"],
            "example_en": info["example_en"],
            "example_jp": info["example_jp"],
            "memo": payload.get("memo", "") # Get memo from payload
        }
        word_id = models.add_word(word_data) # Pass the dictionary to add_word
        
        return jsonify({"status": "registered", "id": word_id, "data": info})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.get("/list")
def list_words():
    status = request.args.get("status")
    words = models.get_words(status)
    return jsonify(words)

@bp.get("/test")
def get_test_words():
    limit = int(request.args.get("limit", 10))
    words = models.get_review_words(limit)
    return jsonify(words)

@bp.post("/review")
def review_word():
    try:
        payload = request.get_json(force=True)
        word_id = payload.get("id")
        result = payload.get("result")
        
        if not word_id or not result:
            return jsonify({"error": "id and result are required"}), 400
            
        success = models.update_word_status(word_id, result)
        if not success:
            return jsonify({"error": "Word not found"}), 404
            
        return jsonify({"status": "updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.put("/word/<int:word_id>")
def update_word(word_id):
    try:
        data = request.get_json(force=True)
        models.update_word(word_id, data)
        return jsonify({"status": "updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.delete("/word/<int:word_id>")
def delete_word(word_id):
    try:
        models.delete_word(word_id)
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.post("/word/<int:word_id>/favorite")
def toggle_favorite(word_id):
    try:
        new_status = models.toggle_favorite(word_id)
        if new_status is None:
            return jsonify({"error": "Word not found"}), 404
        return jsonify({"status": "updated", "is_favorite": new_status})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
