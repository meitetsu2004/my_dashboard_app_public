import json
import subprocess
import os

# --- 設定項目 ---
PROBLEMS_FILE = 'problems_differentiation.json'
OUTPUT_FILENAME_BASE = '微分問題解答一覧'

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

def generate_verification_latex(problems):
    """【難易度表示版】問題ごとに独立した表を生成するLaTeXソースを作成する"""
    
    latex_header = r"""
\documentclass[a4j, 10pt]{jsarticle}
\usepackage{amsmath, amssymb}
\usepackage{geometry}
\geometry{a4paper, margin=1.5cm}
\usepackage[dvipdfmx]{graphicx}
\usepackage{pxfonts}

\begin{document}
\begin{center}
\large{\textbf{数学III 微分問題・解答一覧}}
\end{center}
\vspace{5mm}
% 表のヘッダーを一度だけ表示
\noindent\begin{tabular*}{\linewidth}{@{\extracolsep{\fill}} p{0.48\linewidth} p{0.48\linewidth} @{}}
\hline
\textbf{問題} & \textbf{解答} \\
\hline
\end{tabular*}
"""

    body = ""
    for p in problems:
        problem_id = p.get('id', 'N/A')
        difficulty = p.get('difficulty', '?') # 難易度を取得
        question_formula = p['question'].replace('$$', '$')
        answer_formula = p['answer'].replace('$$', '$')
        
        left_cell = f"\\textbf{{[{problem_id}] (lv. {difficulty})}} \\\\ {question_formula} \\\\ の導関数を求めよ。"
        right_cell = answer_formula
        
        body += (
            f"\n\\vspace{{1mm}}\n"
            f"\\noindent\\begin{{tabular*}}{{\\linewidth}}{{@{{\\extracolsep{{\\fill}}}} p{{0.48\linewidth}} p{{0.48\linewidth}} @{{}}}}\n"
            f"{left_cell} & {right_cell} \\\\\n"
            f"\\hline\n"
            f"\\end{{tabular*}}\n"
        )
        
    latex_footer = r"\end{document}"
    
    return latex_header + body + latex_footer

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
                if hasattr(e, 'stdout'):
                    print(e.stdout)
                return False
    
    print(f"✅ PDFファイル '{base_name}.pdf' が生成されました。")
    return True

def main():
    """メイン処理"""
    print("--- 問題・解答一覧生成スクリプト ---")
    
    all_problems = load_problems(PROBLEMS_FILE)
    if all_problems is None:
        return

    all_problems.sort(key=lambda p: p.get('id', ''))
    print("✅ 問題をID順にソートしました。")
    
    latex_source = generate_verification_latex(all_problems)
    
    output_tex_filename = f"{OUTPUT_FILENAME_BASE}.tex"
    try:
        with open(output_tex_filename, 'w', encoding='utf-8') as f:
            f.write(latex_source)
        print(f"✅ LaTeXファイル '{output_tex_filename}' を保存しました。")
    except IOError as e:
        print(f"❌ エラー: ファイルの保存に失敗しました。 {e}")
        return

    compile_latex_to_pdf(output_tex_filename)
    
    print("--- 処理完了 ---")

if __name__ == '__main__':
    main()