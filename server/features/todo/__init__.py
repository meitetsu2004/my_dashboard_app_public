from .routes import bp
from .models import Todo

def init_app(app):
    Todo.create_table()
