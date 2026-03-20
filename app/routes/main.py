"""
Rutas de páginas HTML (render de templates).
"""

from flask import Blueprint, render_template

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def landing():
    """Landing / splash screen."""
    return render_template("landing.html")


@main_bp.route("/calculator")
def calculator():
    """Calculadora principal con las 7 pestañas."""
    return render_template("index.html")
