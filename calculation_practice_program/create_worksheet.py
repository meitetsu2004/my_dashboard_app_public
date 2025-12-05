import json
import random
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"

PROBLEM_SETS = {
    "limits": {"file": "problems_limit.json", "label": "極限"},
    "differentiation": {"file": "problems_differentiation.json", "label": "微分"},
    "integration": {"file": "problems_integration.json", "label": "積分"},
    "integration_easy": {"file": "problems_integration_easy.json", "label": "積分(基礎)"},
}
SUPPORTED_EXTENSIONS = ["aux", "log", "dvi"]

CAUTION_ITEMS = [
    r"目標：問題を見た瞬間答えがパッと出てくる境地に達すること（1日5分以内で終わったらだいぶ良いのでは）",
    r"時間を測って毎回記録してみましょう。すごい成長が見られるでしょう。",
    r"初めのうちはめっちゃ時間かかると思います。落ち込まないで。",
    r"\sout{今回は微分の問題だけですが、微分だけでは飽きるでしょうから、2週間後くらいには}積分も追加します。ゆくゆくは極限も追加します。",
    r"数IIIは計算が速く正確にできて初めてスタートラインに立てます。逆に言えば、計算さえできれば数IIIは短い時間で確実に点を取れる単元と言えるでしょう。",
    r"いくつか難しい問題があるかもです（もちろんできなきゃダメ）。",
    r"解答一覧にいくつか難しそうなものは解説をつけてみました。分からなかったら次の週に僕に聞くか、学校の先生か、GPT先生か、Gemini先生にどうぞ。",
    r"ちなみに、問題作成にあたってGemini先生に大変お世話になりました。プログラムが組んであってポチッとすれば1週間分の問題が作られるようになっています。情報系の腕の見せ所ですね。",
    r"何か思うことがあればぜひ、フィードバックをください。可能な限り改善します。",
]


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_config():
    try:
        config = load_json(CONFIG_PATH)
    except FileNotFoundError as exc:
        raise SystemExit(f"設定ファイル {CONFIG_PATH} が見つかりません。") from exc
    for section in ["scheduler", "output", "categories"]:
        if section not in config:
            raise SystemExit(f"config.json の '{section}' セクションが不足しています。")
    return config


def load_problems(category_key: str):
    meta = PROBLEM_SETS.get(category_key)
    if not meta:
        raise KeyError(f"未対応のカテゴリです: {category_key}")
    path = BASE_DIR / meta["file"]
    problems = load_json(path)
    for p in problems:
        p.setdefault("difficulty", 1)
    return problems, meta["label"]


def select_problems(config, num_days: int):
    selections = {}
    total_per_day = 0
    for key, settings in config["categories"].items():
        per_day = int(settings.get("per_day", settings.get("count", 0)))
        per_day = max(0, per_day)
        total_per_day += per_day
        min_diff = int(settings.get("min_difficulty", 1))
        max_diff = int(settings.get("max_difficulty", 5))
        if min_diff > max_diff:
            raise SystemExit(f"カテゴリ '{label}' の難易度設定が不正です。最低難易度({min_diff})が最高難易度({max_diff})を上回っています。")
        if per_day == 0:
            continue
        try:
            problems, label = load_problems(key)
        except FileNotFoundError as exc:
            raise SystemExit(f"カテゴリ '{key}' の問題ファイルが見つかりません。") from exc
        except KeyError:
            raise SystemExit(f"カテゴリ '{key}' は未対応です。")

        pool = [
            p
            for p in problems
            if min_diff <= int(p.get("difficulty", 0)) <= max_diff
        ]
        needed = per_day * num_days
        if len(pool) < needed:
            raise SystemExit(
                f"カテゴリ '{label}' で必要な問題数({needed})を確保できませんでした。難易度 {min_diff}〜{max_diff} の問題は {len(pool)}件です。"
            )
        selections[key] = {
            "label": label,
            "per_day": per_day,
            "problems": random.sample(pool, needed),
        }
    if total_per_day == 0:
        raise SystemExit("1日あたりの問題数が0です。config.jsonを確認してください。")
    return selections, total_per_day


def build_weekly_data(selections, num_days: int):
    weekly = []
    for day in range(num_days):
        daily = []
        for key, info in selections.items():
            per_day = info["per_day"]
            if per_day == 0:
                continue
            offset = day * per_day
            chunk = info["problems"][offset : offset + per_day]
            for problem in chunk:
                daily.append(
                    {
                        "id": problem.get("id", "N/A"),
                        "category": info["label"],
                        "question": problem.get("question", "").replace("$$", "$"),
                        "answer": problem.get("answer", "").replace("$$", "$"),
                        "difficulty": problem.get("difficulty", 1),
                    }
                )
        weekly.append(daily)
    return weekly


def generate_latex_header_footer():
    header = r"""
\documentclass[a4j, 12pt]{jsarticle}
\usepackage{amsmath, amssymb}
\usepackage{geometry}
\geometry{a4paper, top=2.5cm, bottom=2.5cm, left=2.5cm, right=2.5cm}
\usepackage[dvipdfmx]{graphicx}
\usepackage{pxfonts}
\usepackage{ulem}

\begin{document}
"""
    footer = r"\end{document}"
    return header, footer


def parse_date(value: str):
    try:
        return datetime.strptime(value, "%Y/%m/%d")
    except ValueError:
        return None


def generate_cover_page_latex(start_dt: datetime, num_days: int, notes, edition: int):
    end_dt = start_dt + timedelta(days=num_days - 1)
    start_str = start_dt.strftime("%Y/%m/%d")
    end_str = end_dt.strftime("%Y/%m/%d")

    if isinstance(notes, str):
        note_lines = [notes.strip()] if notes.strip() else []
    elif isinstance(notes, list):
        note_lines = [line for line in notes if line]
    else:
        note_lines = []

    if note_lines:
        bullet_parts = []
        for idx, line in enumerate(note_lines):
            suffix = "\\\\[3pt]" if idx < len(note_lines) - 1 else "\\\\"
            bullet_parts.append(f"        \\textbullet\\ {line}{suffix}")
        bullet_lines = "\n".join(bullet_parts)
        notes_block = f"""
\\noindent
\\fbox{{
    \\begin{{minipage}}{{1.0\\linewidth}}
        \\small
        \\textbf{{【連絡事項】}}\\\\[5pt]
{bullet_lines}
    \\end{{minipage}}
}}
"""
    else:
        notes_block = ""

    caution_items = "\n".join(f"    \\item {text}" for text in CAUTION_ITEMS)

    cover = rf"""
\thispagestyle{{empty}}
\begin{{center}}
    \vspace*{{1cm}}
    \Huge{{\textbf{{数III 毎日計算プリント}}}} \\
    \vspace*{{1cm}}
    \Huge{{第{edition}回}} \\
    \vspace*{{0.5cm}}
    \large{{{start_str} \quad 〜 \quad {end_str}}}
\end{{center}}

\vspace{{3cm}}

\section*{{注意事項}}
\large
\begin{{enumerate}}
{caution_items}
\end{{enumerate}}

\vspace{{1.5cm}}
{notes_block}

\clearpage
"""
    return cover


def generate_daily_problems_latex(daily_problems, date_obj: datetime, problems_per_day: int):
    date_str = date_obj.strftime('%Y年%m月%d日')
    section_header = f"\\section*{{{date_str} \\hfill \\Large{{\\underline{{\\hspace{{2.5cm}}}} / {problems_per_day}}}}} \\vspace{{5mm}}\n"
    latex = "\\normalsize\n\\begin{enumerate}\n\\setlength{\\itemsep}{2pt}\n"

    split_index = problems_per_day // 2
    for idx, problem in enumerate(daily_problems):
        if idx == split_index:
            latex += "\\end{enumerate}\n\\newpage\n\\begin{enumerate}\n\\setcounter{enumi}{%d}\n" % split_index

        instruction = ""
        category = problem.get("category", "")
        if "微分" in category:
            instruction = "次の関数の導関数を求めよ。 \\\\ \n"
        elif "積分" in category:
            instruction = "次の積分を計算せよ。 \\\\ \n"
        elif "極限" in category:
            instruction = "次の極限を求めよ。 \\\\ \n"

        latex += (
            f"  \\item {instruction}"
            f"  {problem['question']}"
            f"  \\hfill \\texttt{{\\tiny[{problem.get('id', 'N/A')}]}}\n\n"
            f"  \\vspace{{3.2cm}}\n"
        )
    latex += "\\end{enumerate}\n\\newpage\n"
    return section_header + latex


def generate_all_answers_latex(weekly_problems, start_dt: datetime):
    answers = "\\section*{解答}\n"
    for offset, daily in enumerate(weekly_problems):
        date_str = (start_dt + timedelta(days=offset)).strftime('%Y年%m月%d日')
        answers += f"\\subsection*{{{date_str}}}\n"
        answers += "\\large\\begin{enumerate}\n"
        for problem in daily:
            answers += (
                "  \\item \\texttt{\\tiny[%s]} %s\n"
                % (problem.get("id", "N/A"), problem["answer"])
            )
        answers += "\\end{enumerate}\\vspace{5mm}\n"
    return answers


def write_tex_and_compile(latex_source: str, output_dir: Path, base_name: str):
    output_dir.mkdir(parents=True, exist_ok=True)
    tex_path = output_dir / f"{base_name}.tex"
    tex_path.write_text(latex_source, encoding="utf-8")

    commands = [
        ["platex", "-interaction=nonstopmode", tex_path.name],
        ["dvipdfmx", f"{base_name}.dvi"],
    ]
    for cmd in commands:
        subprocess.run(cmd, check=True, cwd=output_dir)

    cleanup_intermediate(output_dir, base_name)
    print(f"✅ PDF を {output_dir} に出力しました。")


def cleanup_intermediate(output_dir: Path, base_name: str):
    for ext in SUPPORTED_EXTENSIONS:
        file_path = output_dir / f"{base_name}.{ext}"
        if file_path.exists():
            file_path.unlink()


def main():
    config = load_config()
    num_days = int(config["scheduler"].get("num_days", 7))
    selections, problems_per_day = select_problems(config, num_days)
    weekly_data = build_weekly_data(selections, num_days)

    start_date_str = config["scheduler"].get("start_date", "")
    start_dt = parse_date(start_date_str) or datetime.now()
    notes = config["scheduler"].get("notes", [])
    out_dir = Path(config["output"].get("directory", BASE_DIR))

    edition = int(config["scheduler"].get("edition", 1))

    header, footer = generate_latex_header_footer()
    cover = generate_cover_page_latex(start_dt, num_days, notes, edition)

    problems_section = ""
    for offset, daily in enumerate(weekly_data):
        current_date = start_dt + timedelta(days=offset)
        problems_section += generate_daily_problems_latex(daily, current_date, problems_per_day)

    answers_section = generate_all_answers_latex(weekly_data, start_dt)
    page_reset = "\\setcounter{page}{1}\n"
    latex_source = header + cover + page_reset + problems_section + answers_section + footer

    try:
        dated_suffix = start_dt.strftime("%Y%m%d")
    except ValueError:
        dated_suffix = datetime.now().strftime("%Y%m%d")

    final_name = f"第{edition}回_{dated_suffix}_計算プリント" if dated_suffix else f"第{edition}回_計算プリント"

    try:
        write_tex_and_compile(latex_source, out_dir, final_name)
        pdf_path = (out_dir / f"{final_name}.pdf").resolve()
        tex_path = (out_dir / f"{final_name}.tex").resolve()
        print(f"OUTPUT::{pdf_path}::{tex_path}")
    except subprocess.CalledProcessError as exc:
        raise SystemExit("LaTeX のコンパイルに失敗しました。環境を確認してください。") from exc

if __name__ == "__main__":
    main()
