from flask import Blueprint, request, jsonify
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

bp = Blueprint('calculator', __name__, url_prefix='/api')

BASE_DIR = Path(__file__).resolve().parents[3]
PROGRAM_DIR = BASE_DIR / "calculation_practice_program"
CONFIG_PATH = PROGRAM_DIR / "config.json"
SCRIPT_PATH = PROGRAM_DIR / "create_worksheet.py"

def load_config():
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise FileNotFoundError("config.json が見つかりません。")

def write_config(data: dict):
    CONFIG_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

@bp.get("/calc-config")
def get_calc_config():
    try:
        return jsonify(load_config())
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404

@bp.post("/calc-config")
def update_calc_config():
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "JSON を解析できません"}), 400

    missing = [key for key in ("scheduler", "output", "categories") if key not in payload]
    if missing:
        return jsonify({"error": f"必須セクションが不足しています: {', '.join(missing)}"}), 400

    try:
        write_config(payload)
    except Exception as exc:
        return jsonify({"error": f"設定ファイルを書き込めません: {exc}"}), 500

    return jsonify({"status": "saved"})

@bp.post("/calc-run")
def run_calc_script():
    if not SCRIPT_PATH.exists():
        return jsonify({"error": "create_worksheet.py が見つかりません"}), 404

    def compute_expected_paths():
        try:
            config = load_config()
            edition = int(config.get("scheduler", {}).get("edition", 1))
            start_date = config.get("scheduler", {}).get("start_date", "")
            replaced = start_date.replace("-", "/")
            try:
                start_dt = datetime.strptime(replaced, "%Y/%m/%d")
            except ValueError:
                start_dt = datetime.now()
            dated_suffix = start_dt.strftime("%Y%m%d")
            base_name = f"第{edition}回_{dated_suffix}_計算プリント"
            out_dir = Path(config.get("output", {}).get("directory", PROGRAM_DIR / "output"))
            pdf_path = str((out_dir / f"{base_name}.pdf").resolve())
            tex_path = str((out_dir / f"{base_name}.tex").resolve())
            return pdf_path, tex_path
        except Exception:
            return None, None

    def guess_latest_paths():
        try:
            config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            out_dir = Path(config.get("output", {}).get("directory", PROGRAM_DIR / "output"))
        except Exception:
            out_dir = PROGRAM_DIR / "output"
        out_dir = Path(out_dir)
        pdf_candidates = sorted(out_dir.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)
        tex_candidates = sorted(out_dir.glob("*.tex"), key=lambda p: p.stat().st_mtime, reverse=True)
        pdf_path = str(pdf_candidates[0].resolve()) if pdf_candidates else None
        tex_path = str(tex_candidates[0].resolve()) if tex_candidates else None
        return pdf_path, tex_path

    def parse_output_paths(stdout: str):
        pdf_path = None
        tex_path = None
        for line in stdout.splitlines():
            if line.startswith("OUTPUT::"):
                parts = line.split("::")
                if len(parts) >= 3:
                    pdf_path = parts[1].strip() or None
                    tex_path = parts[2].strip() or None
        return pdf_path, tex_path

    try:
        result = subprocess.run(
            [sys.executable, str(SCRIPT_PATH)],
            capture_output=True,
            text=True,
            cwd=BASE_DIR,
            check=True,
        )
        pdf_path, tex_path = parse_output_paths(result.stdout)
        if not pdf_path and not tex_path:
            pdf_path, tex_path = guess_latest_paths()
        if not pdf_path and not tex_path:
            pdf_path, tex_path = compute_expected_paths()
    except subprocess.CalledProcessError as exc:
        return (
            jsonify(
                {
                    "error": "スクリプトの実行に失敗しました",
                    "stdout": exc.stdout,
                    "stderr": exc.stderr,
                }
            ),
            500,
        )

    return jsonify(
        {
            "status": "completed",
            "stdout": result.stdout,
            "pdf_path": pdf_path,
            "tex_path": tex_path,
        }
    )

@bp.route("/calc-config", methods=["OPTIONS"])
def calc_config_options():
    return ("", 204)

@bp.route("/calc-run", methods=["OPTIONS"])
def calc_run_options():
    return ("", 204)
