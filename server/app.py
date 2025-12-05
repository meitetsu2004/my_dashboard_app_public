from flask import Flask
from pathlib import Path
from dotenv import load_dotenv
from . import extensions

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = BASE_DIR

def create_app():
    app = Flask(
        __name__,
        static_folder=str(FRONTEND_DIR),
        static_url_path="",
    )
    
    # Initialize extensions
    extensions.init_app(app)
    
    # Register Blueprints
    from .features.common import bp as common_bp
    from .features.calculator import bp as calculator_bp
    from .features.english import bp as english_bp
    from .features.todo import bp as todo_bp
    from .features.todo import init_app as init_todo
    from .features.timer import bp as timer_bp
    from .features.timer import init_app as init_timer
    
    app.register_blueprint(common_bp)
    app.register_blueprint(calculator_bp)
    app.register_blueprint(english_bp)
    app.register_blueprint(todo_bp)
    app.register_blueprint(timer_bp)
    
    # Initialize features (create tables, etc.)
    with app.app_context():
        init_todo(app)
        init_timer(app)
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
