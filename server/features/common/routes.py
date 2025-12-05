from flask import Blueprint, request, jsonify, send_from_directory
from pathlib import Path
import subprocess

bp = Blueprint('common', __name__)

BASE_DIR = Path(__file__).resolve().parents[3]
FRONTEND_DIR = BASE_DIR
OPEN_CMD = ["open"]  # macOS Finder 用

@bp.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@bp.post("/api/open-path")
def open_path():
    try:
        payload = request.get_json(force=True)
        path = payload.get("path")
        if not path:
            return jsonify({"error": "path がありません"}), 400
        target = Path(path)
        if not target.exists():
            return jsonify({"error": "指定されたパスが存在しません"}), 404
        subprocess.run(OPEN_CMD + [str(target)], check=True)
        return jsonify({"status": "opened"})
    except subprocess.CalledProcessError as exc:
        return jsonify({"error": f"open コマンドの実行に失敗しました: {exc}"}), 500
    except Exception as exc:
        return jsonify({"error": f"処理に失敗しました: {exc}"}), 400
