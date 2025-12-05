import json
import random
import subprocess
import os
from datetime import datetime, timedelta

# --- 設定項目 ---
# ファイル名を直接指定する方式に変更
DIFF_PROBLEMS_FILE = 'problems_differentiation.json'
INT_EASY_PROBLEMS_FILE = 'problems_integration_easy.json'

PROBLEMS_PER_DAY = 10
NUM_DAYS = 7
OUTPUT_FILENAME_BASE = '週間計算プリント'
NUMBER = 2

def load_problems(filename):
    """問題ファイルを読み込む"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            problems = json.load(f)
        print(f"✅ {len(problems)}問の問題を'{filename}'から読み込みました。")
        return problems
    except FileNotFoundError:
        print(f"❌ エラー: 問題ファイル'{filename}'が見つかりません。")
        return None
    except json.JSONDecodeError:
        print(f"❌ エラー: '{filename}'の形式が正しくありません。")
        return None

def get_start_date_from_user():
    """ユーザーから開始日を取得し、datetimeオブジェクトを返す"""
    while True:
        date_str = input(f"▶️ 週の開始日を入力してください (例: 2025/9/30): ")
        try:
            start_date = datetime.strptime(date_str, '%Y/%m/%d')
            return start_date
        except ValueError:
            print("❌ エラー: 日付の形式が正しくありません。'YYYY/MM/DD'の形式で入力してください。")

def generate_latex_header_footer():
    """LaTeX文書のヘッダーとフッターを生成する"""
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

def generate_cover_page_latex(start_date, end_date):
    """表紙ページのLaTeXソースを生成する (1ページ版)"""
    start_date_str = start_date.strftime('%Y/%m/%d')
    end_date_str = end_date.strftime('%Y/%m/%d')
    
    cover_latex = rf"""
\thispagestyle{{empty}}
\begin{{center}}
    \vspace*{{1cm}}
    \Huge{{\textbf{{数III 毎日計算プリント}}}} \\
    \vspace*{{1cm}}
    \Huge{{第{NUMBER}回}} \\
    \vspace*{{0.5cm}}
    \large{{{start_date_str} \quad 〜 \quad {end_date_str}}}
\end{{center}}

\vspace{{3cm}}

\section*{{注意事項}}
\large
\begin{{enumerate}}
    \item 目標：問題を見た瞬間答えがパッと出てくる境地に達すること（1日5分以内で終わったらだいぶ良いのでは）
    \item 時間を測って毎回記録してみましょう。すごい成長が見られるでしょう。
    \item 初めのうちはめっちゃ時間かかると思います。落ち込まないで。
    \item \sout{{今回は微分の問題だけですが、微分だけでは飽きるでしょうから、2週間後くらいには}}積分も追加します。ゆくゆくは極限も追加します。
    \item 数IIIは計算が速く正確にできて初めてスタートラインに立てます。逆に言えば、計算さえできれば数IIIは短い時間で確実に点を取れる単元と言えるでしょう。
    \item いくつか難しい問題があるかもです（もちろんできなきゃダメ）。
    \item 解答一覧にいくつか難しそうなものは解説をつけてみました。分からなかったら次の週に僕に聞くか、学校の先生か、GPT先生か、Gemini先生にどうぞ。
    \item ちなみに、問題作成にあたってGemini先生に大変お世話になりました。プログラムが組んであってポチッとすれば1週間分の問題が作られるようになっています。情報系の腕の見せ所ですね。
    \item 何か思うことがあればぜひ、フィードバックをください。可能な限り改善します。
\end{{enumerate}}

\vspace{{1.5cm}}

\noindent
\fbox{{
    \begin{{minipage}}{{1.0\linewidth}}
        \small 
        \textbf{{【連絡事項】}}\\[5pt]
        \textbullet \ 積分(部分積分、難しい問題を除く)を追加しました。今週は微分5問、積分5問でいきましょう。\\[3pt]
        \textbullet \ 簡単すぎる微分が出ないようにしました。\\
        \textbullet \ スペースを調整しました。
    \end{{minipage}}
}}

\clearpage
"""
    return cover_latex


def generate_daily_problems_latex(daily_problems, date_obj):
    """1日分の問題ページのLaTeXソースを生成する"""
    date_str_jp = date_obj.strftime('%Y年%m月%d日')
    
    section_header = f"\\section*{{{date_str_jp} \\hfill \\Large{{\\underline{{\\hspace{{2.5cm}}}} / {PROBLEMS_PER_DAY}}}}} \\vspace{{5mm}}\n"
    
    problems_latex = "\\normalsize\n\\begin{enumerate}\n\\setlength{\\itemsep}{2pt}\n"
    for i, p in enumerate(daily_problems):
        if i == 5:
            problems_latex += "\\end{enumerate}\n\\newpage\n\\begin{enumerate}\n\\setcounter{enumi}{5}\n"

        problem_id = p.get('id', 'N/A')
        category = p.get('category', '')
        question_formula = p.get('question', '').replace('$$', '$')
        
        # ★★★ 修正点: カテゴリに応じて問題文を自動生成 ★★★
        instructional_text = ""
        if category == '微分':
            instructional_text = "次の関数の導関数を求めよ。 \\\\ \n"
        elif category == '積分':
            instructional_text = "次の不定積分を計算せよ。 \\\\ \n"
        
        problems_latex += (
            f"  \\item {instructional_text}"
            f"  {question_formula}"
            f"  \\hfill \\texttt{{\\tiny[{problem_id}]}}\n\n"
            f"  \\vspace{{3.2cm}}\n"
        )
    problems_latex += "\\end{enumerate}\n\\newpage\n"
    
    return section_header + problems_latex

def generate_all_answers_latex(weekly_problems_data, start_date):
    """7日分の解答ページのLaTeXソースを生成する"""
    answers_latex = "\\section*{解答}\n"
    
    for i, daily_problems in enumerate(weekly_problems_data):
        current_date = start_date + timedelta(days=i)
        date_str_jp = current_date.strftime('%Y年%m月%d日')
        
        answers_latex += f"\\subsection*{{{date_str_jp}}}\n"
        answers_latex += "\\large\\begin{enumerate}\n"
        for p in daily_problems:
            problem_id = p.get('id', 'N/A')
            answer_inline = p['answer'].replace('$$', '$')
            answers_latex += f"  \\item \\texttt{{\\tiny[{problem_id}]}} {answer_inline}\n"
        answers_latex += "\\end{enumerate}\n\\vspace{5mm}\n"
        
    return answers_latex

def compile_latex_to_pdf(tex_filename):
    """LaTeXファイルをコンパイルしてPDFを生成する"""
    base_name = os.path.splitext(tex_filename)[0]
    commands = [['platex', '-interaction=nonstopmode', tex_filename], ['dvipdfmx', base_name + '.dvi']]
    
    print("⏳ LaTeXファイルをコンパイル中...")
    for i in range(2):
        for cmd in commands:
            try:
                subprocess.run(cmd, check=True, capture_output=True, text=True, encoding='utf-8')
            except (FileNotFoundError, subprocess.CalledProcessError) as e:
                print(f"❌ エラーが発生しました: {e}")
                if hasattr(e, 'stdout'): print(e.stdout)
                return False
    print(f"✅ PDFファイル '{base_name}.pdf' が生成されました。")
    return True

def main():
    """メイン処理"""
    print("--- 週間 計算プリント自動生成スクリプト ---")
    start_date = get_start_date_from_user()
    end_date = start_date + timedelta(days=NUM_DAYS - 1)
    
    # ★★★ 修正点: 2つのファイルから問題を読み込む ★★★
    
    # 1. 微分問題の読み込みと選出
    all_diff_problems = load_problems(DIFF_PROBLEMS_FILE)
    if all_diff_problems is None: return
    
    # 難易度2以上の問題のみをフィルタリング
    diff_problems_filtered = [p for p in all_diff_problems if p.get('difficulty', 0) >= 2]
    print(f"✅ 難易度2以上の微分問題を {len(diff_problems_filtered)} 問抽出しました。")

    diff_problems_needed = NUM_DAYS * (PROBLEMS_PER_DAY // 2) # 35問
    if len(diff_problems_filtered) < diff_problems_needed:
        print(f"❌ エラー: 微分問題の数が足りません。{diff_problems_needed}問必要ですが、{len(diff_problems_filtered)}問しかありません。")
        return
    selected_diff_problems = random.sample(diff_problems_filtered, diff_problems_needed)

    # 2. 積分問題の読み込みと選出
    all_int_problems = load_problems(INT_EASY_PROBLEMS_FILE)
    if all_int_problems is None: return

    int_problems_needed = NUM_DAYS * (PROBLEMS_PER_DAY // 2) # 35問
    if len(all_int_problems) < int_problems_needed:
        print(f"❌ エラー: 積分問題の数が足りません。{int_problems_needed}問必要ですが、{len(all_int_problems)}問しかありません。")
        return
    selected_int_problems = random.sample(all_int_problems, int_problems_needed)

    print(f"✅ {diff_problems_needed}問の微分問題と {int_problems_needed}問の積分問題を選出しました。")

    # --- 以下、生成処理 ---
    header, footer = generate_latex_header_footer()
    cover_page_latex = generate_cover_page_latex(start_date, end_date)
    
    all_problems_latex = ""
    weekly_problems_data = []
    for i in range(NUM_DAYS):
        current_date = start_date + timedelta(days=i)
        
        # ★★★ 修正点: 日ごとに微分5問、積分5問を組み合わせる ★★★
        daily_diff = selected_diff_problems[i*5 : (i+1)*5]
        daily_int = selected_int_problems[i*5 : (i+1)*5]
        daily_problems = daily_diff + daily_int
        
        weekly_problems_data.append(daily_problems)
        all_problems_latex += generate_daily_problems_latex(daily_problems, current_date)

    all_answers_latex = generate_all_answers_latex(weekly_problems_data, start_date)
    
    page_numbering_reset_latex = "\\setcounter{page}{1}\n"
    
    final_latex_source = header + cover_page_latex + page_numbering_reset_latex + all_problems_latex + all_answers_latex + footer
    
    output_filename_suffix = start_date.strftime('%Y%m%d')
    output_tex_filename = f"{OUTPUT_FILENAME_BASE}_{output_filename_suffix}.tex"
    
    try:
        with open(output_tex_filename, 'w', encoding='utf-8') as f:
            f.write(final_latex_source)
        print(f"✅ LaTeXファイル '{output_tex_filename}' を保存しました。")
    except IOError as e:
        print(f"❌ エラー: ファイルの保存に失敗しました。 {e}")
        return

    compile_latex_to_pdf(output_tex_filename)
    
    print("--- 処理完了 ---")

if __name__ == '__main__':
    main()