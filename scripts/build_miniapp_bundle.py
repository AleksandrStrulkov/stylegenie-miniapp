#!/usr/bin/env python3
"""Pre-render Mini App routes to HTML + быстрые standalone-страницы."""
from __future__ import annotations

import json
import textwrap
from pathlib import Path

try:
    import markdown
except ImportError as exc:
    raise SystemExit(
        "Install markdown: pip install markdown && python scripts/build_miniapp_bundle.py"
    ) from exc

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs" / "documents"
MINIAPP = ROOT / "docs" / "miniapp"
OUT = MINIAPP / "embedded_html.js"

ROUTE_FILES: dict[str, str] = {
    "legal:terms": "public_offer.md",
    "legal:privacy": "policy_personal.md",
    "legal:consent": "consent_personal.md",
    "models": "models_guide.md",
    "quality": "quality_guide.md",
}

# (md file, title, back href, back_link_max_only)
STANDALONE_PAGES: dict[str, tuple[str, str, str, bool]] = {
    "legal/terms.html": (
        "public_offer.md",
        "Публичная оферта",
        "../dashboard/index.html",
        True,
    ),
    "legal/privacy.html": (
        "policy_personal.md",
        "Политика ПДн",
        "../dashboard/index.html",
        True,
    ),
    "legal/consent.html": (
        "consent_personal.md",
        "Согласие на ПДн",
        "../dashboard/index.html",
        True,
    ),
    "models/index.html": (
        "models_guide.md",
        "Модели генерации",
        "../dashboard/index.html",
        False,
    ),
    "quality/index.html": (
        "quality_guide.md",
        "Качество генерации",
        "../dashboard/index.html",
        False,
    ),
}


def md_to_html(text: str) -> str:
    body = markdown.markdown(
        text,
        extensions=["extra", "sane_lists", "nl2br"],
        output_format="html5",
    )
    return f'<div class="doc-md">{body}</div>'


def extract_title(text: str) -> str:
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return "StyleGenie"


def models_quality_card_html(text: str) -> str:
    """Карточки вместо длинного markdown для models/quality."""
    html = md_to_html(text)
    if "card-grid" in html:
        return html
    return html.replace('<div class="doc-md">', '<div class="doc-md card-grid">')


_LEGAL_TELEGRAM_HEAD = """\
          <style>html.tg-legal .topbar{display:none!important}</style>
          <script>(function(){if(new URLSearchParams(location.search).get('tg')==='1'){document.documentElement.classList.add('tg-legal');}})();</script>"""

_LEGAL_MAX_FOOTER = """\
          <script>
            (function () {
              if (document.documentElement.classList.contains('tg-legal')) return;
              var s = document.createElement('script');
              s.defer = true;
              s.src = 'https://st.max.ru/js/max-web-app.js';
              s.onload = function () {
                try {
                  if (window.WebApp && typeof window.WebApp.ready === 'function') {
                    window.WebApp.ready();
                  }
                } catch (e) {}
              };
              document.body.appendChild(s);
            })();
          </script>"""

_STANDALONE_MAX_FOOTER = """\
          <script defer src="https://st.max.ru/js/max-web-app.js"></script>
          <script>
            (function () {
              function ready() {
                try {
                  if (window.WebApp && typeof window.WebApp.ready === "function") {
                    window.WebApp.ready();
                  }
                } catch (e) {}
              }
              if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", ready);
              } else {
                ready();
              }
            })();
          </script>"""


def standalone_page(
    title: str,
    body_html: str,
    back_href: str,
    *,
    back_link_max_only: bool = False,
) -> str:
    topbar = (
        f'          <div class="topbar">\n'
        f'            <a class="back-link" href="{back_href}">← Дашборд</a>\n'
        f"          </div>"
    )
    if back_link_max_only:
        head_extra = _LEGAL_TELEGRAM_HEAD
        footer = _LEGAL_MAX_FOOTER
    else:
        head_extra = ""
        footer = _STANDALONE_MAX_FOOTER

    return textwrap.dedent(
        f"""\
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
          <meta name="theme-color" content="#0a0a12">
          <title>{title}</title>
          <link rel="stylesheet" href="../miniapp-content.css">
{head_extra}
        </head>
        <body>
{topbar}
          <h1 class="page-title">{title}</h1>
          <div class="content-shell">
            {body_html}
          </div>
{footer}
        </body>
        </html>
        """
    )


def main() -> None:
    routes: dict[str, dict[str, str]] = {}
    for route, filename in ROUTE_FILES.items():
        path = DOCS / filename
        if not path.is_file():
            raise SystemExit(f"Missing {path}")
        raw = path.read_text(encoding="utf-8")
        routes[route] = {
            "title": extract_title(raw),
            "html": md_to_html(raw),
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "// Auto-generated by scripts/build_miniapp_bundle.py\n"
        "(function (g) {\n"
        f"  g.__SG_ROUTES__ = {json.dumps(routes, ensure_ascii=False)};\n"
        "})(window);\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes, {len(routes)} routes)")

    for rel_path, (filename, title, back_href, back_max_only) in STANDALONE_PAGES.items():
        raw = (DOCS / filename).read_text(encoding="utf-8")
        if rel_path.startswith("models/") or rel_path.startswith("quality/"):
            body = models_quality_card_html(raw)
        else:
            body = md_to_html(raw)
        target = MINIAPP / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(
            standalone_page(title, body, back_href, back_link_max_only=back_max_only),
            encoding="utf-8",
        )
        print(f"Wrote standalone {target}")

    mirror_root = ROOT / "miniapp"
    for rel_path in STANDALONE_PAGES:
        src = MINIAPP / rel_path
        dst = mirror_root / rel_path
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")


if __name__ == "__main__":
    main()
